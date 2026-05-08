<?php

declare(strict_types=1);

class Router
{
    private static array $routes = [];

    // ── Route registration ────────────────────────────────────────────────

    public static function get(string $path, string $handler, string $middleware = ''): void
    {
        self::add('GET', $path, $handler, $middleware);
    }

    public static function post(string $path, string $handler, string $middleware = ''): void
    {
        self::add('POST', $path, $handler, $middleware);
    }

    public static function put(string $path, string $handler, string $middleware = ''): void
    {
        self::add('PUT', $path, $handler, $middleware);
    }

    public static function delete(string $path, string $handler, string $middleware = ''): void
    {
        self::add('DELETE', $path, $handler, $middleware);
    }

    private static function add(string $method, string $path, string $handler, string $middleware): void
    {
        self::$routes[] = compact('method', 'path', 'handler', 'middleware');
    }

    // ── Dispatch ──────────────────────────────────────────────────────────

    public static function dispatch(): void
    {
        $method = $_SERVER['REQUEST_METHOD'];
        $uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $uri    = rtrim($uri, '/') ?: '/';

        // Strip subfolder prefix if app lives inside /crms-api/
        $scriptDir = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
        if ($scriptDir && str_starts_with($uri, $scriptDir)) {
            $uri = substr($uri, strlen($scriptDir)) ?: '/';
        }

        foreach (self::$routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }

            $params = self::match($route['path'], $uri);
            if ($params === false) {
                continue;
            }

            // Run middleware guard
            match ($route['middleware']) {
                'auth'  => AuthMiddleware::auth(),
                'admin' => AuthMiddleware::admin(),
                default => null,
            };

            self::call($route['handler'], $params);
            return;
        }

        // Nothing matched — 404
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Route not found']);
    }

    // ── Match URI against a route pattern ─────────────────────────────────

    private static function match(string $pattern, string $uri): array|false
    {
        $regex = preg_replace('/:([a-zA-Z_]+)/', '(?P<$1>[^/]+)', $pattern);
        $regex = '#^' . $regex . '$#';

        if (!preg_match($regex, $uri, $matches)) {
            return false;
        }

        // Return only named captures (drop numeric keys)
        return array_filter($matches, fn($k) => !is_int($k), ARRAY_FILTER_USE_KEY);
    }

    // ── Resolve Controller@method and call it ─────────────────────────────

    private static function call(string $handler, array $params): void
    {
        [$class, $method] = explode('@', $handler);

        $file = ROOT . "/controllers/{$class}.php";
        if (!file_exists($file)) {
            throw new RuntimeException("Controller not found: {$file}");
        }
        require_once $file;

        if (!class_exists($class)) {
            throw new RuntimeException("Class {$class} not found");
        }
        if (!method_exists($class, $method)) {
            throw new RuntimeException("{$class}::{$method}() not found");
        }

        (new $class())->$method(...array_values($params));
    }
}
