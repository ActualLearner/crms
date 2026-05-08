<?php

declare(strict_types=1);

class Controller
{
    // Send success JSON response and exit
    protected function success(mixed $data = null, string $message = 'OK', int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => true,
            'data'    => $data,
            'message' => $message,
        ]);
        exit;
    }

    // Send error JSON response and exit
    protected function error(string $message, int $status = 400, array $errors = []): never
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'data'    => null,
            'message' => $message,
            'errors'  => $errors,
        ]);
        exit;
    }

    // Get parsed JSON body from fetch()
    protected function body(): array
    {
        $raw = file_get_contents('php://input');
        return $raw ? (json_decode($raw, true) ?? []) : [];
    }

    // Get logged-in user from session
    protected function user(): ?array
    {
        return $_SESSION['user'] ?? null;
    }

    protected function userId(): ?int
    {
        return isset($_SESSION['user']['id']) ? (int) $_SESSION['user']['id'] : null;
    }

    protected function userRole(): ?string
    {
        return $_SESSION['user']['role'] ?? null;
    }
}
