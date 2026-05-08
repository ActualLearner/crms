<?php

declare(strict_types=1);

define('ROOT', __DIR__);

// 1. Start session before any output
session_start();

// 2. Load core framework files
require ROOT . '/core/helpers.php';
require ROOT . '/core/Database.php';
require ROOT . '/core/QueryBuilder.php';
require ROOT . '/core/Model.php';
require ROOT . '/core/Controller.php';
require ROOT . '/core/Validator.php';
require ROOT . '/core/Router.php';
require ROOT . '/middleware/CorsMiddleware.php';
require ROOT . '/middleware/AuthMiddleware.php';
require ROOT . '/middleware/RateLimitMiddleware.php';

// 3. Global exception handler — always return JSON, never a white screen
set_exception_handler(function (Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => env('APP_ENV') === 'development'
            ? $e->getMessage() . ' in ' . basename($e->getFile()) . ':' . $e->getLine()
            : 'Internal server error',
    ]);
    exit;
});

// 4. CORS must run before anything else touches the response
CorsMiddleware::handle();

// 5. Boot database (creates MySQL tables if they don't exist)
require ROOT . '/database/schema.php';

// 6. Load routes and dispatch
require ROOT . '/config/routes.php';
Router::dispatch();
