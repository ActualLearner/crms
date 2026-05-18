<?php

declare(strict_types=1);

require_once ROOT . '/models/User.php';

class AuthController extends Controller
{
    private function ensureGuest(): void
    {
        if (!empty($_SESSION['user'])) {
            $this->error('Already authenticated. Please logout first.', 403);
        }
    }

    // POST /auth/register
    public function register(): void
    {
        $this->ensureGuest();

        $data   = $this->body();
        $errors = Validator::make($data, [
            'name'           => 'required|max:100',
            'email'          => 'required|email',
            'password'       => 'required|min:8',
            'phone'          => 'required',
            'license_number' => 'required',
        ]);

        if ($errors) {
            $this->error('Validation failed', 422, $errors);
        }

        if (User::where('email', $data['email'])->first()) {
            $this->error('Email already registered', 422);
        }

        $user = User::create([
            'name'           => trim($data['name']),
            'email'          => strtolower(trim($data['email'])),
            'password'       => password_hash($data['password'], PASSWORD_BCRYPT, ['cost' => 12]),
            'phone'          => trim($data['phone']),
            'license_number' => trim($data['license_number']),
            'role'           => 'customer',
        ]);

        unset($user['password']);
        $_SESSION['user'] = $user;

        $this->success($user, 'Registered successfully', 201);
    }

    // POST /auth/login
    // POST /auth/login
    public function login(): void
    {
        $this->ensureGuest();

        RateLimitMiddleware::handle();

        $data   = $this->body();
        $errors = Validator::make($data, [
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        if ($errors) {
            $this->error('Validation failed', 422, $errors);
        }

        $user = User::where('email', strtolower(trim($data['email'])))->first();

        if (!$user || !password_verify($data['password'], $user['password'])) {
            $this->error('Invalid email or password', 401);
        }

        $rememberMe   = $data['remember_me'] ?? false;
        $isProduction = (env('APP_ENV') === 'production');

        session_regenerate_id(true);

        if ($rememberMe) {
            setcookie('crms_remember', '1', [
                'expires'  => time() + 60 * 60 * 24 * 30,
                'path'     => '/',
                'secure'   => $isProduction,
                'httponly' => true,
                'samesite' => $isProduction ? 'Strict' : 'Lax',
            ]);

            setcookie(session_name(), session_id(), [
                'expires'  => time() + 60 * 60 * 24 * 30,
                'path'     => '/',
                'secure'   => $isProduction,
                'httponly' => true,
                'samesite' => $isProduction ? 'Strict' : 'Lax',
            ]);
        }

        unset($user['password']);
        $_SESSION['user'] = $user;

        $this->success($user, 'Logged in successfully');
    }
    // POST /auth/logout
    public function logout(): void
    {
        setcookie('crms_remember', '', [
    'expires'  => time() - 3600,
    'path'     => '/',
    'secure'   => env('APP_ENV') === 'production',
    'httponly' => true,
    'samesite' => env('APP_ENV') === 'production' ? 'Strict' : 'Lax',
]);
        session_destroy();
        $this->success(null, 'Logged out successfully');
    }

    // GET /auth/me
    public function me(): void
    {
        $user = User::find($this->userId());
        if (!$user) {
            $this->error('User not found', 404);
        }
        unset($user['password']);

        // Check for waitlist notifications
        $notification = DB::table('waitlist')
            ->where('user_id', $user['id'])
            ->where('notified', 1)
            ->first();

        $user['has_notification'] = (bool) $notification;
        if ($notification) {
            $car = DB::table('cars')
                ->where('id', $notification['car_id'])
                ->first();
            $user['notification_car'] = $car
                ? "{$car['brand']} {$car['model']} is now available!"
                : 'A car on your waitlist is now available!';
        }

        $this->success($user);
    }
}
