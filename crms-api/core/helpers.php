<?php

declare(strict_types=1);

/**
 * Read a value from .env
 * Caches on first call — only reads the file once per request
 */
function env(string $key, mixed $default = null): mixed
{
    static $cache = [];

    if (empty($cache)) {
        $file = ROOT . '/.env';
        if (!file_exists($file)) {
            return $default;
        }
        foreach (file($file) as $line) {
            $line = trim($line);
            if (!$line || str_starts_with($line, '#') || !str_contains($line, '=')) {
                continue;
            }
            [$k, $v]         = explode('=', $line, 2);
            $cache[trim($k)] = trim($v);
        }
    }

    return $cache[$key] ?? $default;
}

/**
 * Dump as JSON and die — dev debugging only
 */
function dd(mixed ...$vars): never
{
    header('Content-Type: application/json');
    echo json_encode($vars, JSON_PRETTY_PRINT);
    exit;
}

/**
 * Generate a unique booking reference e.g. CRMS-20240601-A3F9
 * Loops until it finds one not already in the DB
 */
function generateRef(): string
{
    do {
        $ref    = 'CRMS-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(2)));
        $exists = DB::table('bookings')->where('reference_number', $ref)->first();
    } while ($exists);

    return $ref;
}

/**
 * Number of days between two date strings (inclusive start, exclusive end)
 */
function daysBetween(string $start, string $end): int
{
    return (int) (new DateTime($start))->diff(new DateTime($end))->days;
}

/**
 * Send a JSON response and exit — used outside controllers
 */
function jsonResponse(bool $success, mixed $data, string $message, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode(compact('success', 'data', 'message'));
    exit;
}
