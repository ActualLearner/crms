<?php

declare(strict_types=1);

class RateLimitMiddleware
{
    /**
     * Limit requests per IP per minute
     * Used on sensitive routes like POST /auth/login
     */
    public static function handle(int $maxAttempts = 0): void
    {
        if ($maxAttempts === 0) {
            $maxAttempts = (int) env('RATE_LIMIT', 5);
        }

        $ip      = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $key     = 'rate_limit_' . md5($ip . $_SERVER['REQUEST_URI']);
        $window  = 60; // seconds

        if (!isset($_SESSION[$key])) {
            $_SESSION[$key] = ['count' => 0, 'starts' => time()];
        }

        // Reset window if a minute has passed
        if (time() - $_SESSION[$key]['starts'] > $window) {
            $_SESSION[$key] = ['count' => 0, 'starts' => time()];
        }

        $_SESSION[$key]['count']++;

        if ($_SESSION[$key]['count'] > $maxAttempts) {
            http_response_code(429);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Too many requests. Please wait a minute and try again.',
            ]);
            exit;
        }
    }
}
