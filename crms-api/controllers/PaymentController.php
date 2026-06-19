<?php

declare(strict_types=1);

require_once ROOT . '/models/Booking.php';
require_once ROOT . '/services/PaymentService.php';

class PaymentController extends Controller
{
    // POST /payments/chapa/initialize
    public function initialize(): void
    {
        $data = $this->body();

        $bookingId = (int) ($data['booking_id'] ?? 0);
        if ($bookingId <= 0) {
            $this->error('booking_id is required', 422);
        }

        $booking = Booking::find($bookingId);
        if (!$booking) {
            $this->error('Booking not found', 404);
        }
        if ($this->userRole() !== 'admin' && (int) $booking['user_id'] !== $this->userId()) {
            $this->error('You can only initialize payment for your own booking', 403);
        }

        try {
            $result = (new PaymentService())->initializeBookingPayment($bookingId, 'checkout');
            $this->success($this->publicCheckoutResult($result), 'Chapa checkout initialized');
        } catch (RuntimeException $e) {
            $code = $e->getCode();
            $this->error($e->getMessage(), $code >= 400 && $code < 600 ? $code : 502);
        }
    }

    // POST /payments/chapa/verify
    public function verify(): void
    {
        $data = $this->body();

        $bookingId = (int) ($data['booking_id'] ?? 0);
        $txRef     = trim((string) ($data['tx_ref'] ?? ''));

        if ($bookingId <= 0 && $txRef === '') {
            $this->error('booking_id or tx_ref is required', 422);
        }

        try {
            $service = new PaymentService();
            if ($bookingId > 0) {
                $booking = Booking::find($bookingId);
                if (!$booking) {
                    $this->error('Booking not found', 404);
                }
                if ($this->userRole() !== 'admin' && (int) $booking['user_id'] !== $this->userId()) {
                    $this->error('You can only verify your own booking payment', 403);
                }
                $result = $service->verifyBookingPayment($bookingId, $txRef ?: null, 'verify');
            } else {
                $booking = DB::table('bookings')->where('payment_tx_ref', $txRef)->first()
                    ?: DB::table('bookings')->where('reference_number', $txRef)->first();
                if (!$booking) {
                    $this->error('Booking not found for transaction reference', 404);
                }
                if ($this->userRole() !== 'admin' && (int) $booking['user_id'] !== $this->userId()) {
                    $this->error('You can only verify your own booking payment', 403);
                }
                $result = $service->verifyTransaction($txRef, $booking, 'verify');
            }

            $this->success($this->publicResult($result), 'Chapa payment verification completed');
        } catch (RuntimeException $e) {
            $code = $e->getCode();
            $this->error($e->getMessage(), $code >= 400 && $code < 600 ? $code : 502);
        }
    }

    // GET /payments/chapa/callback
    public function callback(): void
    {
        $txRef = trim((string) ($_GET['tx_ref'] ?? $_GET['trx_ref'] ?? ''));

        if ($txRef === '') {
            $this->error('Transaction reference is required', 422);
        }

        try {
            $result = (new PaymentService())->verifyTransaction($txRef, null, 'callback');
            $this->success($this->publicResult($result), 'Chapa callback verified');
        } catch (RuntimeException $e) {
            $code = $e->getCode();
            $this->error($e->getMessage(), $code >= 400 && $code < 600 ? $code : 502);
        }
    }

    // POST /payments/chapa/webhook
    public function webhook(): void
    {
        $rawBody = file_get_contents('php://input') ?: '';
        $data    = json_decode($rawBody, true);

        if (!is_array($data)) {
            $this->error('Invalid webhook payload', 400);
        }

        if (!$this->hasValidSignature($rawBody, $data)) {
            $this->error('Invalid Chapa webhook signature', 401);
        }

        $txRef = trim((string) ($data['tx_ref'] ?? $data['trx_ref'] ?? $data['data']['tx_ref'] ?? $data['data']['trx_ref'] ?? ''));
        if ($txRef === '') {
            $this->error('Transaction reference is required', 422);
        }

        try {
            $result = (new PaymentService())->verifyTransaction($txRef, null, 'webhook');
            $this->success([
                'received'       => true,
                'tx_ref'         => $txRef,
                'payment_status' => $result['payment_status'],
            ], 'Webhook processed');
        } catch (RuntimeException $e) {
            $code = $e->getCode();
            $this->error($e->getMessage(), $code >= 400 && $code < 600 ? $code : 502);
        }
    }

    private function publicResult(array $result): array
    {
        $booking = $result['booking'] ?? [];

        return [
            'booking_id'     => isset($booking['id']) ? (int) $booking['id'] : null,
            'tx_ref'         => $booking['payment_tx_ref'] ?? null,
            'payment_status' => $result['payment_status'] ?? null,
            'verified'       => (bool) ($result['verified'] ?? false),
        ];
    }

    private function publicCheckoutResult(array $result): array
    {
        $booking = $result['booking'] ?? [];

        return [
            'booking_id'     => isset($booking['id']) ? (int) $booking['id'] : null,
            'tx_ref'         => $result['tx_ref'] ?? ($booking['payment_tx_ref'] ?? null),
            'checkout_url'   => $result['checkout_url'] ?? null,
            'payment_status' => $result['payment_status'] ?? ($booking['payment_status'] ?? null),
            'amount'         => isset($result['amount']) ? (float) $result['amount'] : null,
            'currency'       => $result['currency'] ?? null,
            'reused'         => (bool) ($result['reused'] ?? false),
        ];
    }

    private function hasValidSignature(string $rawBody, array $data): bool
    {
        $secret = trim((string) env('CHAPA_WEBHOOK_SECRET', ''));
        if ($secret === '' || $secret === 'your_chapa_webhook_secret_here') {
            return false;
        }

        $headers = array_filter([
            trim((string) ($_SERVER['HTTP_CHAPA_SIGNATURE'] ?? '')),
            trim((string) ($_SERVER['HTTP_X_CHAPA_SIGNATURE'] ?? '')),
        ]);
        if (!$headers) {
            return false;
        }

        $expectedHashes = [hash_hmac('sha256', $secret, $secret)];
        $signablePayloads = [$rawBody];
        $encoded = json_encode($data);
        if (is_string($encoded) && $encoded !== $rawBody) {
            $signablePayloads[] = $encoded;
        }

        foreach (array_unique($signablePayloads) as $payload) {
            $expectedHashes[] = hash_hmac('sha256', $payload, $secret);
        }

        foreach (array_unique($headers) as $header) {
            foreach (array_unique($expectedHashes) as $expectedHash) {
                if (hash_equals($expectedHash, $header)) {
                    return true;
                }
            }
        }

        return false;
    }
}
