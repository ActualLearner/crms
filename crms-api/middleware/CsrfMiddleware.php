<?php

declare(strict_types=1);

class CsrfMiddleware
{
    public static function handle(): void
    {
        $method = $_SERVER['REQUEST_METHOD'];
        if (in_array($method, ['POST', 'PUT', 'DELETE', 'PATCH'])) {
            $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
            $scriptDir = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/');
            if ($scriptDir && str_starts_with($path, $scriptDir)) {
                $path = substr($path, strlen($scriptDir)) ?: '/';
            }

            if (in_array(rtrim($path, '/') ?: '/', ['/payments/chapa/webhook'], true)) {
                return;
            }

            $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
            $sessionToken = $_SESSION['csrf_token'] ?? '';
            
            if (empty($token) || empty($sessionToken) || !hash_equals($sessionToken, $token)) {
                http_response_code(403);
                header('Content-Type: application/json');
                echo json_encode(['success' => false, 'message' => 'Invalid CSRF token']);
                exit;
            }
        }
    }
}
