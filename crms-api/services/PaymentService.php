<?php

declare(strict_types=1);

require_once ROOT . '/models/Booking.php';
require_once ROOT . '/models/User.php';
require_once ROOT . '/services/ChapaClient.php';

class PaymentService
{
    private ChapaClient $client;

    public function __construct(?ChapaClient $client = null)
    {
        $this->client = $client ?? new ChapaClient();
    }

    public function initializeBookingPayment(int $bookingId, string $source = 'initialize'): array
    {
        $booking = Booking::find($bookingId);
        if (!$booking) {
            throw new RuntimeException('Booking not found', 404);
        }

        if (in_array($booking['status'], ['cancelled', 'completed'], true)) {
            throw new RuntimeException('Cannot initialize payment for this booking status', 422);
        }

        if (($booking['payment_status'] ?? 'unpaid') === 'paid') {
            throw new RuntimeException('Booking is already paid', 422);
        }

        $existingCheckoutUrl = $this->existingCheckoutUrl($booking);
        if ($existingCheckoutUrl !== null && in_array(($booking['payment_status'] ?? ''), ['pending', 'failed'], true)) {
            return [
                'booking'        => $booking,
                'checkout_url'   => $existingCheckoutUrl,
                'tx_ref'         => $booking['payment_tx_ref'] ?: $booking['reference_number'],
                'payment_status' => $booking['payment_status'],
                'amount'         => (float) ($booking['payment_amount'] ?? $booking['final_total']),
                'currency'       => strtoupper((string) env('CHAPA_CURRENCY', 'USD')),
                'reused'         => true,
            ];
        }

        $amount = round((float) $booking['final_total'], 2);
        if ($amount <= 0) {
            throw new RuntimeException('Booking total must be greater than zero before payment', 422);
        }

        $user = User::find((int) $booking['user_id']);
        if (!$user) {
            throw new RuntimeException('Booking customer not found', 404);
        }

        $car = DB::table('cars')->where('id', (int) $booking['car_id'])->first();
        $txRef = trim((string) ($booking['payment_tx_ref'] ?: $booking['reference_number']));
        if ($txRef === '') {
            throw new RuntimeException('Booking reference is missing', 422);
        }

        [$firstName, $lastName] = $this->splitName((string) ($user['name'] ?? 'Customer'));
        $payload = [
            'amount'       => number_format($amount, 2, '.', ''),
            'currency'     => strtoupper((string) env('CHAPA_CURRENCY', 'USD')),
            'email'        => (string) $user['email'],
            'first_name'   => $firstName,
            'last_name'    => $lastName,
            'tx_ref'       => $txRef,
            'callback_url' => $this->callbackUrl($booking),
            'return_url'   => $this->returnUrl($booking),
            'customization' => [
                'title'       => 'Auto Ultimate car rental',
                'description' => 'Payment for booking ' . $booking['reference_number'],
            ],
            'meta' => [
                'booking_id'     => (string) $booking['id'],
                'reference'      => (string) $booking['reference_number'],
                'payment_reason' => 'Car rental booking payment',
                'invoices'       => [[
                    'key'   => 'Vehicle',
                    'value' => $car ? trim($car['brand'] . ' ' . $car['model']) : 'Car rental',
                ]],
            ],
        ];

        $phone = $this->normalizePhone((string) ($user['phone'] ?? ''));
        if ($phone !== null) {
            $payload['phone_number'] = $phone;
        }

        $response = $this->client->initialize($payload);
        if (($response['_http_status'] ?? 500) >= 400 || empty($response['data']['checkout_url'])) {
            $message = (string) ($response['message'] ?? 'Chapa checkout initialization failed');
            throw new RuntimeException($message, 502);
        }

        $checkoutUrl = (string) $response['data']['checkout_url'];
        DB::table('bookings')->where('id', (int) $booking['id'])->update([
            'payment_provider'     => 'chapa',
            'payment_status'       => 'pending',
            'payment_tx_ref'       => $txRef,
            'payment_amount'       => $amount,
            'payment_last_checked' => date('Y-m-d H:i:s'),
            'payment_meta'         => json_encode([
                'source'              => $source,
                'checkout_url'        => $checkoutUrl,
                'initialize_response' => $response,
                'initialized_at'      => date(DATE_ATOM),
            ]),
        ]);

        $booking = Booking::find((int) $booking['id']);

        return [
            'booking'        => $booking,
            'checkout_url'   => $checkoutUrl,
            'tx_ref'         => $txRef,
            'payment_status' => 'pending',
            'amount'         => $amount,
            'currency'       => strtoupper((string) env('CHAPA_CURRENCY', 'USD')),
            'reused'         => false,
        ];
    }

    public function verifyBookingPayment(int $bookingId, ?string $txRef = null, string $source = 'manual'): array
    {
        $booking = Booking::find($bookingId);
        if (!$booking) {
            throw new RuntimeException('Booking not found', 404);
        }

        $expectedTxRef = (string) ($booking['payment_tx_ref'] ?? '');
        $txRef = trim((string) ($txRef ?: $expectedTxRef ?: $booking['reference_number']));

        if ($expectedTxRef !== '' && $txRef !== $expectedTxRef) {
            throw new RuntimeException('Transaction reference does not match this booking', 422);
        }

        return $this->verifyTransaction($txRef, $booking, $source);
    }

    public function verifyTransaction(string $txRef, ?array $booking = null, string $source = 'manual'): array
    {
        $txRef = trim($txRef);
        if ($txRef === '') {
            throw new RuntimeException('Transaction reference is required', 422);
        }

        $booking ??= DB::table('bookings')->where('payment_tx_ref', $txRef)->first()
            ?: DB::table('bookings')->where('reference_number', $txRef)->first();

        if (!$booking) {
            throw new RuntimeException('Booking not found for transaction reference', 404);
        }

        $response = $this->client->verify($txRef);
        $data     = is_array($response['data'] ?? null) ? $response['data'] : [];
        if (($response['_http_status'] ?? 500) >= 400) {
            throw new RuntimeException('Chapa verification failed', 502);
        }

        $status = strtolower((string) ($data['status'] ?? $response['status'] ?? ''));

        $this->assertVerifiedTransactionMatchesBooking($booking, $data, $txRef);

        $paymentStatus = match ($status) {
            'success', 'successful' => 'paid',
            'failed', 'cancelled', 'canceled' => 'failed',
            default => 'pending',
        };

        $meta = $this->existingPaymentMeta($booking);
        $meta['source'] = $source;
        $meta['verify_response'] = $response;
        $meta['verified_at'] = date(DATE_ATOM);

        $update = [
            'payment_tx_ref'       => $txRef,
            'payment_status'       => $paymentStatus,
            'payment_provider'     => 'chapa',
            'payment_last_checked' => date('Y-m-d H:i:s'),
            'payment_meta'         => json_encode($meta),
        ];

        $refId = $data['ref_id'] ?? $data['reference'] ?? $data['chapa_reference'] ?? null;
        if ($refId !== null && trim((string) $refId) !== '') {
            $update['payment_ref_id'] = (string) $refId;
        }

        if (isset($data['amount']) && $paymentStatus === 'paid') {
            $update['payment_amount'] = round((float) $data['amount'], 2);
        }

        // A confirmed payment is what books the car — there is no separate admin
        // approval step. Confirm the booking and take the car off the lot, but only
        // from 'pending' so repeated verifications (callback + webhook + return) stay
        // idempotent.
        DB::beginTransaction();
        try {
            DB::table('bookings')->where('id', (int) $booking['id'])->update($update);

            if ($paymentStatus === 'paid' && $booking['status'] === 'pending') {
                DB::table('bookings')
                    ->where('id', (int) $booking['id'])
                    ->where('status', 'pending')
                    ->update(['status' => 'confirmed']);
                DB::table('cars')
                    ->where('id', (int) $booking['car_id'])
                    ->update(['status' => 'rented']);
            }

            DB::commit();
        } catch (Throwable $e) {
            DB::rollback();
            throw $e;
        }

        $booking = Booking::find((int) $booking['id']);

        return [
            'booking'        => $booking,
            'payment_status' => $paymentStatus,
            'chapa_status'   => $status,
            'verified'       => $paymentStatus === 'paid',
            'raw'            => $response,
        ];
    }

    private function existingCheckoutUrl(array $booking): ?string
    {
        $meta = $this->existingPaymentMeta($booking);
        if (!empty($meta['checkout_url'])) {
            return (string) $meta['checkout_url'];
        }

        return null;
    }

    private function existingPaymentMeta(array $booking): array
    {
        $meta = json_decode((string) ($booking['payment_meta'] ?? ''), true);
        return is_array($meta) ? $meta : [];
    }

    private function assertVerifiedTransactionMatchesBooking(array $booking, array $data, string $txRef): void
    {
        $responseTxRef = $data['tx_ref'] ?? $data['trx_ref'] ?? null;
        if ($responseTxRef !== null && (string) $responseTxRef !== $txRef) {
            throw new RuntimeException('Verified transaction reference mismatch', 422);
        }

        if (isset($data['amount'])) {
            $verifiedAmount = round((float) $data['amount'], 2);
            $expectedAmount = isset($booking['payment_amount']) && $booking['payment_amount'] !== null
                ? round((float) $booking['payment_amount'], 2)
                : round((float) $booking['final_total'], 2);
            if ($verifiedAmount !== $expectedAmount) {
                throw new RuntimeException('Verified payment amount does not match booking total', 422);
            }
        }

        $expectedCurrency = strtoupper((string) env('CHAPA_CURRENCY', 'USD'));
        $verifiedCurrency = strtoupper((string) ($data['currency'] ?? $expectedCurrency));
        if ($verifiedCurrency !== $expectedCurrency) {
            throw new RuntimeException('Verified payment currency does not match configured currency', 422);
        }
    }

    private function splitName(string $name): array
    {
        $parts = preg_split('/\s+/', trim($name)) ?: [];
        $first = $parts[0] ?? 'Customer';
        $last = count($parts) > 1 ? implode(' ', array_slice($parts, 1)) : $first;
        return [$first, $last];
    }

    private function normalizePhone(string $phone): ?string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';
        if (strlen($digits) === 12 && str_starts_with($digits, '251')) {
            $digits = '0' . substr($digits, 3);
        }
        if (strlen($digits) === 9 && in_array($digits[0] ?? '', ['7', '9'], true)) {
            $digits = '0' . $digits;
        }
        return preg_match('/^0[79]\d{8}$/', $digits) ? $digits : null;
    }

    private function callbackUrl(array $booking): string
    {
        $template = trim((string) env('CHAPA_CALLBACK_URL', ''));
        if ($template !== '') {
            return $this->formatUrl($template, $booking);
        }

        return rtrim($this->apiPublicUrl(), '/') . '/payments/chapa/callback';
    }

    private function returnUrl(array $booking): string
    {
        $template = trim((string) env('CHAPA_RETURN_URL', ''));
        if ($template !== '') {
            return $this->formatUrl($template, $booking);
        }

        return rtrim($this->frontendUrl(), '/') . '/pages/customer/booking-confirmed.html?id=' . (int) $booking['id'] . '&payment=returned';
    }

    private function formatUrl(string $template, array $booking): string
    {
        return str_replace(
            ['{booking_id}', '{tx_ref}', '{reference_number}'],
            [(string) $booking['id'], (string) ($booking['payment_tx_ref'] ?: $booking['reference_number']), (string) $booking['reference_number']],
            $template
        );
    }

    private function apiPublicUrl(): string
    {
        $configured = trim((string) env('API_PUBLIC_URL', ''));
        if ($configured !== '') {
            return $configured;
        }

        $scheme = $_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http');
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $scriptDir = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/');
        return rtrim($scheme . '://' . $host . ($scriptDir === '/' ? '' : $scriptDir), '/');
    }

    private function frontendUrl(): string
    {
        $configured = trim((string) env('FRONTEND_URL', ''));
        if ($configured !== '') {
            return $configured;
        }

        $allowed = trim(explode(',', (string) env('ALLOWED_ORIGIN', ''))[0] ?? '');
        if ($allowed !== '') {
            return $allowed;
        }

        return 'http://localhost:8080';
    }
}
