<?php

declare(strict_types=1);

class AuthMiddleware
{
    // Just logged in
    public static function auth(): void
    {
        if (empty($_SESSION['user'])) {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Unauthenticated. Please log in.']);
            exit;
        }
    }

    // Logged in AND admin role
    public static function admin(): void
    {
        self::auth();

        if (($_SESSION['user']['role'] ?? '') !== 'admin') {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Forbidden. Admin access required.']);
            exit;
        }
    }
}
