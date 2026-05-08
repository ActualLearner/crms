<?php

declare(strict_types=1);

class CorsMiddleware
{
    public static function handle(): void
    {
        $requestedOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $allowedOrigins  = array_values(array_filter(array_map(
            'trim',
            explode(',', (string) env('ALLOWED_ORIGIN', 'http://localhost:5500,http://127.0.0.1:5500'))
        )));

        $origin = in_array($requestedOrigin, $allowedOrigins, true)
            ? $requestedOrigin
            : ($allowedOrigins[0] ?? 'http://localhost:5500');

        // Exact origin required when credentials are involved — no wildcard
        header("Access-Control-Allow-Origin: {$origin}");
        header('Vary: Origin');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

        // Security headers while we're at it
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');

        // Preflight request — kill it here, never reaches router
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}
