<?php

/**
 * CRMS API Test Runner
 * Simulates HTTP requests directly against the framework
 * Run: php test.php
 */

define('ROOT', __DIR__);

// Minimal server env for CLI testing
$_SERVER['REQUEST_METHOD']  = 'GET';
$_SERVER['REQUEST_URI']     = '/';
$_SERVER['REMOTE_ADDR']     = '127.0.0.1';
$_SERVER['SCRIPT_NAME']     = '/index.php';

session_start();

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
require ROOT . '/database/schema.php';

// ── Test helpers ──────────────────────────────────────────────────────────

$passed = 0;
$failed = 0;

function test(string $name, callable $fn): void {
    global $passed, $failed;
    try {
        $fn();
        echo "\033[32m  ✓ {$name}\033[0m\n";
        $passed++;
    } catch (Throwable $e) {
        echo "\033[31m  ✗ {$name}\033[0m\n";
        echo "    → " . $e->getMessage() . "\n";
        $failed++;
    }
}

function assert_equals(mixed $expected, mixed $actual, string $msg = ''): void {
    if ($expected !== $actual) {
        throw new Exception($msg ?: "Expected " . json_encode($expected) . " got " . json_encode($actual));
    }
}

function assert_not_null(mixed $val, string $msg = ''): void {
    if ($val === null) throw new Exception($msg ?: "Expected non-null value");
}

function assert_true(bool $val, string $msg = ''): void {
    if (!$val) throw new Exception($msg ?: "Expected true");
}

function assert_count(int $expected, array $arr, string $msg = ''): void {
    if (count($arr) !== $expected) {
        throw new Exception($msg ?: "Expected count {$expected}, got " . count($arr));
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────

echo "\n\033[1mCRMS API Test Suite\033[0m\n";
echo str_repeat('─', 50) . "\n\n";

// ── 1. Core Framework ─────────────────────────────────────────────────────
echo "\033[1m[1] Core Framework\033[0m\n";

test('env() reads .env file', function() {
    assert_equals('development', env('APP_ENV'));
    assert_equals('fallback', env('NONEXISTENT_KEY', 'fallback'));
});

test('daysBetween() calculates correctly', function() {
    assert_equals(5, daysBetween('2024-06-01', '2024-06-06'));
    assert_equals(1, daysBetween('2024-06-01', '2024-06-02'));
});

test('Validator::make() required rule', function() {
    $errors = Validator::make([], ['name' => 'required']);
    assert_true(!empty($errors['name']));

    $errors = Validator::make(['name' => 'John'], ['name' => 'required']);
    assert_true(empty($errors));
});

test('Validator::make() email rule', function() {
    $errors = Validator::make(['email' => 'notanemail'], ['email' => 'required|email']);
    assert_true(!empty($errors['email']));

    $errors = Validator::make(['email' => 'john@example.com'], ['email' => 'required|email']);
    assert_true(empty($errors));
});

test('Validator::make() min rule', function() {
    $errors = Validator::make(['pass' => 'short'], ['pass' => 'min:8']);
    assert_true(!empty($errors['pass']));
});

test('Validator::make() in rule', function() {
    $errors = Validator::make(['role' => 'superadmin'], ['role' => 'in:admin,customer']);
    assert_true(!empty($errors['role']));

    $errors = Validator::make(['role' => 'admin'], ['role' => 'in:admin,customer']);
    assert_true(empty($errors));
});

// ── 2. Database & QueryBuilder ────────────────────────────────────────────
echo "\n\033[1m[2] Database & QueryBuilder\033[0m\n";

test('Database connection works', function() {
    $pdo = Database::connection();
    assert_not_null($pdo);
});

test('DB::table() returns QueryBuilder', function() {
    $qb = DB::table('users');
    assert_true($qb instanceof QueryBuilder);
});

test('QueryBuilder insert & find', function() {
    $id = DB::table('users')->insert([
        'name'           => 'Test User',
        'email'          => 'testuser_qb@crms.com',
        'password'       => 'hashed',
        'phone'          => '1234567890',
        'license_number' => 'TST001',
        'role'           => 'customer',
    ]);
    assert_true((int) $id > 0);

    $user = DB::table('users')->where('id', (int) $id)->first();
    assert_equals('Test User', $user['name']);

    // Cleanup
    DB::table('users')->where('id', (int) $id)->delete();
});

test('QueryBuilder where chaining', function() {
    $results = DB::table('users')
        ->where('role', 'admin')
        ->where('email', 'admin@crms.com')
        ->get();
    assert_true(count($results) >= 1);
});

test('QueryBuilder whereIn', function() {
    $results = DB::table('users')
        ->whereIn('role', ['admin', 'customer'])
        ->get();
    assert_true(count($results) >= 1);
});

test('QueryBuilder update', function() {
    $id = DB::table('users')->insert([
        'name'           => 'Update Test',
        'email'          => 'updatetest@crms.com',
        'password'       => 'hashed',
        'phone'          => '0000',
        'license_number' => 'UPD001',
        'role'           => 'customer',
    ]);
    DB::table('users')->where('id', (int) $id)->update(['name' => 'Updated Name']);
    $user = DB::table('users')->where('id', (int) $id)->first();
    assert_equals('Updated Name', $user['name']);
    DB::table('users')->where('id', (int) $id)->delete();
});

test('QueryBuilder delete', function() {
    $id = DB::table('users')->insert([
        'name'           => 'Delete Test',
        'email'          => 'deletetest@crms.com',
        'password'       => 'hashed',
        'phone'          => '0000',
        'license_number' => 'DEL001',
        'role'           => 'customer',
    ]);
    DB::table('users')->where('id', (int) $id)->delete();
    $user = DB::table('users')->where('id', (int) $id)->first();
    assert_equals(null, $user);
});

test('QueryBuilder count', function() {
    $count = DB::table('users')->where('role', 'admin')->count();
    assert_true($count >= 1);
});

test('QueryBuilder paginate', function() {
    $result = DB::table('users')->paginate(5, 1);
    assert_true(isset($result['data'], $result['total'], $result['per_page'], $result['current_page'], $result['last_page']));
    assert_equals(5, $result['per_page']);
    assert_equals(1, $result['current_page']);
});

test('QueryBuilder leftJoin', function() {
    // Insert test car
    $carId = DB::table('cars')->insert([
        'brand'        => 'Test', 'model' => 'Join', 'year' => 2020,
        'category'     => 'Sedan', 'seats' => 4, 'transmission' => 'auto',
        'daily_rate'   => 50, 'penalty_rate' => 10, 'status' => 'available',
    ]);
    $result = DB::table('cars')
        ->select(['cars.*', 'COALESCE(AVG(reviews.rating), 0) as avg_rating'])
        ->leftJoin('reviews', 'cars.id', 'reviews.car_id')
        ->where('cars.id', (int) $carId)
        ->groupBy('cars.id')
        ->first();
    assert_not_null($result);
    assert_equals('Test', $result['brand']);
    DB::table('cars')->where('id', (int) $carId)->delete();
});

test('QueryBuilder orderBy and limit', function() {
    $result = DB::table('users')->orderBy('id', 'ASC')->limit(1)->get();
    assert_true(count($result) === 1);
});

// ── 3. Model Layer ────────────────────────────────────────────────────────
echo "\n\033[1m[3] Model Layer\033[0m\n";

require_once ROOT . '/models/User.php';
require_once ROOT . '/models/Car.php';
require_once ROOT . '/models/Booking.php';
require_once ROOT . '/models/Review.php';
require_once ROOT . '/models/Promo.php';

test('Model::create() and find()', function() {
    $user = User::create([
        'name'           => 'Model Test',
        'email'          => 'modeltest@crms.com',
        'password'       => 'hashed',
        'phone'          => '9999',
        'license_number' => 'MDL001',
        'role'           => 'customer',
    ]);
    assert_not_null($user);
    assert_equals('Model Test', $user['name']);

    $found = User::find((int) $user['id']);
    assert_equals($user['id'], $found['id']);

    DB::table('users')->where('id', (int) $user['id'])->delete();
});

test('Model::where() returns QueryBuilder', function() {
    $qb = User::where('role', 'admin');
    assert_true($qb instanceof QueryBuilder);
    $results = $qb->get();
    assert_true(count($results) >= 1);
});

test('Model::all() returns array', function() {
    $users = User::all();
    assert_true(is_array($users));
    assert_true(count($users) >= 1);
});

test('Model::count()', function() {
    $count = User::count();
    assert_true($count >= 1);
});

// ── 4. Business Logic ─────────────────────────────────────────────────────
echo "\n\033[1m[4] Business Logic\033[0m\n";

test('Password hashing and verification', function() {
    $hash = password_hash('secret123', PASSWORD_BCRYPT, ['cost' => 12]);
    assert_true(password_verify('secret123', $hash));
    assert_true(!password_verify('wrongpass', $hash));
});

test('generateRef() produces unique CRMS reference', function() {
    $ref = generateRef();
    assert_true(str_starts_with($ref, 'CRMS-'));
    assert_equals(18, strlen($ref)); // CRMS-YYYYMMDD-XXXX = 18 chars
});

test('generateRef() uniqueness across calls', function() {
    $refs = [];
    for ($i = 0; $i < 10; $i++) {
        $refs[] = generateRef();
    }
    assert_equals(10, count(array_unique($refs)), 'All refs should be unique');
});

test('daysBetween() handles same month', function() {
    assert_equals(7, daysBetween('2024-06-01', '2024-06-08'));
});

test('Date conflict detection logic', function() {
    // Insert a test car
    $carId = (int) DB::table('cars')->insert([
        'brand' => 'Conflict', 'model' => 'Test', 'year' => 2022,
        'category' => 'SUV', 'seats' => 5, 'transmission' => 'auto',
        'daily_rate' => 80, 'penalty_rate' => 15, 'status' => 'available',
    ]);

    // Insert a test user
    $userId = (int) DB::table('users')->insert([
        'name' => 'Conflict User', 'email' => 'conflict@crms.com',
        'password' => 'hashed', 'phone' => '1111', 'license_number' => 'CFT001',
        'role' => 'customer',
    ]);

    // Create existing booking Jun 5–10
    DB::table('bookings')->insert([
        'user_id' => $userId, 'car_id' => $carId,
        'reference_number' => 'CRMS-TEST-0001',
        'start_date' => '2024-06-05', 'end_date' => '2024-06-10',
        'expected_return_date' => '2024-06-10',
        'status' => 'confirmed',
        'base_total' => 400, 'final_total' => 400,
    ]);

    // Test overlap: Jun 8–12 (overlaps with Jun 5–10)
    $conflict = DB::table('bookings')
        ->where('car_id', $carId)
        ->whereIn('status', ['pending', 'confirmed', 'active'])
        ->where('start_date', '<', '2024-06-12')
        ->where('end_date', '>', '2024-06-08')
        ->first();
    assert_not_null($conflict);

    // Test no overlap: Jun 11–15 (no overlap)
    $noConflict = DB::table('bookings')
        ->where('car_id', $carId)
        ->whereIn('status', ['pending', 'confirmed', 'active'])
        ->where('start_date', '<', '2024-06-15')
        ->where('end_date', '>', '2024-06-11')
        ->first();
    assert_equals(null, $noConflict);

    // Cleanup
    DB::table('bookings')->where('car_id', $carId)->delete();
    DB::table('cars')->where('id', $carId)->delete();
    DB::table('users')->where('id', $userId)->delete();
});

test('Late fee calculation', function() {
    $penaltyRate  = 20.00;
    $lateDays     = 3;
    $baseTotal    = 300.00;
    $penalty      = round($lateDays * $penaltyRate, 2);
    $finalTotal   = round($baseTotal + $penalty, 2);
    assert_equals(60.00, $penalty);
    assert_equals(360.00, $finalTotal);
});

test('Promo discount calculation', function() {
    $baseTotal   = 200.00;
    $discount    = 25; // 25%
    $discountAmt = round($baseTotal * $discount / 100, 2);
    $finalTotal  = round($baseTotal - $discountAmt, 2);
    assert_equals(50.00, $discountAmt);
    assert_equals(150.00, $finalTotal);
});

// ── 5. Transactions ───────────────────────────────────────────────────────
echo "\n\033[1m[5] Transactions\033[0m\n";

test('Transaction commit works', function() {
    $userId = null;
    DB::beginTransaction();
    $userId = (int) DB::table('users')->insert([
        'name' => 'Tx Test', 'email' => 'txtest@crms.com',
        'password' => 'h', 'phone' => '0', 'license_number' => 'TX001', 'role' => 'customer',
    ]);
    DB::commit();

    $user = DB::table('users')->where('id', $userId)->first();
    assert_not_null($user);
    DB::table('users')->where('id', $userId)->delete();
});

test('Transaction rollback works', function() {
    DB::beginTransaction();
    $id = (int) DB::table('users')->insert([
        'name' => 'Rollback Test', 'email' => 'rollback@crms.com',
        'password' => 'h', 'phone' => '0', 'license_number' => 'RB001', 'role' => 'customer',
    ]);
    DB::rollback();

    $user = DB::table('users')->where('id', $id)->first();
    assert_equals(null, $user, 'Rolled-back record should not exist');
});

// ── 6. Seed data ──────────────────────────────────────────────────────────
echo "\n\033[1m[6] Seed Demo Data\033[0m\n";

test('Admin account exists', function() {
    $admin = DB::table('users')->where('email', 'admin@crms.com')->first();
    assert_not_null($admin);
    assert_equals('admin', $admin['role']);
});

test('Seed demo cars', function() {
    $existing = DB::table('cars')->count();
    if ($existing < 3) {
        $cars = [
            ['brand'=>'Toyota','model'=>'Corolla','year'=>2022,'category'=>'Sedan',
             'seats'=>5,'transmission'=>'auto','daily_rate'=>45,'penalty_rate'=>10,
             'status'=>'available','description'=>'Reliable and fuel efficient sedan'],
            ['brand'=>'Toyota','model'=>'Land Cruiser','year'=>2023,'category'=>'SUV',
             'seats'=>7,'transmission'=>'auto','daily_rate'=>120,'penalty_rate'=>25,
             'status'=>'available','description'=>'Powerful SUV for any terrain'],
            ['brand'=>'Honda','model'=>'Civic','year'=>2021,'category'=>'Sedan',
             'seats'=>5,'transmission'=>'manual','daily_rate'=>38,'penalty_rate'=>8,
             'status'=>'available','description'=>'Sporty and efficient'],
            ['brand'=>'Mercedes','model'=>'E-Class','year'=>2023,'category'=>'Luxury',
             'seats'=>5,'transmission'=>'auto','daily_rate'=>200,'penalty_rate'=>50,
             'status'=>'available','description'=>'Premium executive sedan'],
            ['brand'=>'Ford','model'=>'Transit','year'=>2022,'category'=>'Van',
             'seats'=>12,'transmission'=>'manual','daily_rate'=>90,'penalty_rate'=>20,
             'status'=>'available','description'=>'Large passenger van'],
        ];
        foreach ($cars as $car) {
            DB::table('cars')->insert($car);
        }
    }
    $count = DB::table('cars')->count();
    assert_true($count >= 3, "Expected at least 3 cars, got {$count}");
});

test('Seed demo customer', function() {
    $existing = DB::table('users')->where('email', 'customer@crms.com')->first();
    if (!$existing) {
        DB::table('users')->insert([
            'name'             => 'John Customer',
            'email'            => 'customer@crms.com',
            'password'         => password_hash('customer123', PASSWORD_BCRYPT),
            'phone'            => '+251911000001',
            'license_number'   => 'ETH-DL-12345',
            'license_verified' => 1,
            'role'             => 'customer',
        ]);
    }
    $user = DB::table('users')->where('email', 'customer@crms.com')->first();
    assert_not_null($user);
});

test('Seed demo promo code', function() {
    $existing = DB::table('promos')->where('code', 'WELCOME20')->first();
    if (!$existing) {
        DB::table('promos')->insert([
            'code'                => 'WELCOME20',
            'discount_percentage' => 20,
            'valid_from'          => '2024-01-01',
            'valid_until'         => '2030-12-31',
            'max_uses'            => 100,
            'times_used'          => 0,
            'active'              => 1,
        ]);
    }
    $promo = DB::table('promos')->where('code', 'WELCOME20')->first();
    assert_not_null($promo);
    assert_equals(20, (int) $promo['discount_percentage']);
});

// ── 7. Router ─────────────────────────────────────────────────────────────
echo "\n\033[1m[7] Router\033[0m\n";

test('Router registers routes correctly', function() {
    // Just verify no exceptions loading routes
    require_once ROOT . '/config/routes.php';
    assert_true(true);
});

// ── Summary ───────────────────────────────────────────────────────────────
echo "\n" . str_repeat('─', 50) . "\n";
echo "\033[1mResults: \033[0m";
echo "\033[32m{$passed} passed\033[0m";
if ($failed > 0) {
    echo ", \033[31m{$failed} failed\033[0m";
}
echo "\n\n";

if ($failed > 0) {
    exit(1);
}
