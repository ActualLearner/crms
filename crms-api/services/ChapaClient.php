<?php

declare(strict_types=1);

class ChapaClient
{
    private string $secretKey;
    private string $baseUrl;

    public function __construct(?string $secretKey = null, ?string $baseUrl = null)
    {
        $this->secretKey = trim((string) ($secretKey ?? env('CHAPA_SECRET_KEY', '')));
        $this->baseUrl   = rtrim((string) ($baseUrl ?? env('CHAPA_BASE_URL', 'https://api.chapa.co')), '/');
    }

    public function initialize(array $payload): array
    {
        return $this->request('POST', '/v1/transaction/initialize', $payload);
    }

    public function verify(string $txRef): array
    {
        if (trim($txRef) === '') {
            throw new InvalidArgumentException('Transaction reference is required');
        }

        return $this->request('GET', '/v1/transaction/verify/' . rawurlencode($txRef));
    }

    private function request(string $method, string $path, ?array $payload = null): array
    {
        if ($this->secretKey === '' || $this->secretKey === 'your_chapa_secret_key_here') {
            throw new RuntimeException('CHAPA_SECRET_KEY is not configured');
        }

        $ch = curl_init($this->baseUrl . $path);
        $headers = [
            'Authorization: Bearer ' . $this->secretKey,
            'Accept: application/json',
        ];

        $options = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_TIMEOUT        => 30,
        ];

        if ($method === 'POST') {
            $body = json_encode($payload ?? []);
            if ($body === false) {
                throw new RuntimeException('Unable to encode Chapa request payload');
            }
            $options[CURLOPT_POST]       = true;
            $options[CURLOPT_POSTFIELDS] = $body;
            $headers[] = 'Content-Type: application/json';
            $options[CURLOPT_HTTPHEADER] = $headers;
        } else {
            $options[CURLOPT_HTTPGET] = true;
        }

        curl_setopt_array($ch, $options);

        $raw = curl_exec($ch);
        if ($raw === false) {
            $error = curl_error($ch);
            curl_close($ch);
            throw new RuntimeException('Chapa request failed: ' . $error);
        }

        $httpStatus = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        $decoded = json_decode((string) $raw, true);
        if (!is_array($decoded)) {
            throw new RuntimeException('Chapa returned an invalid JSON response');
        }

        $decoded['_http_status'] = $httpStatus;
        return $decoded;
    }
}
