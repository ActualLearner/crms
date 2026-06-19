<?php
declare(strict_types=1);

DB::raw("CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    license_number VARCHAR(50) NOT NULL,
    license_verified TINYINT(1) NOT NULL DEFAULT 0,
    role ENUM('customer','admin') NOT NULL DEFAULT 'customer',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

DB::raw("CREATE TABLE IF NOT EXISTS cars (
    id INT PRIMARY KEY AUTO_INCREMENT,
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year YEAR NOT NULL,
    category VARCHAR(30) NOT NULL,
    seats TINYINT NOT NULL,
    transmission ENUM('auto','manual') NOT NULL DEFAULT 'auto',
    daily_rate DECIMAL(10,2) NOT NULL,
    penalty_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
    status ENUM('available','rented','maintenance') NOT NULL DEFAULT 'available',
    image_url VARCHAR(255),
    description TEXT,
    average_rating DECIMAL(3,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

DB::raw("CREATE TABLE IF NOT EXISTS promos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(30) NOT NULL UNIQUE,
    discount_percentage TINYINT NOT NULL,
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    max_uses INT NOT NULL DEFAULT 1,
    times_used INT NOT NULL DEFAULT 0,
    active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

DB::raw("CREATE TABLE IF NOT EXISTS bookings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    car_id INT NOT NULL,
    promo_id INT,
    reference_number VARCHAR(20) NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    expected_return_date DATE NOT NULL,
    actual_return_date DATE,
    status ENUM('pending','confirmed','active','completed','cancelled') NOT NULL DEFAULT 'pending',
    `condition` ENUM('good','excellent','damaged'),
    base_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    penalty_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    final_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_provider VARCHAR(30) NOT NULL DEFAULT 'chapa',
    payment_status ENUM('unpaid','pending','paid','failed') NOT NULL DEFAULT 'unpaid',
    payment_tx_ref VARCHAR(100) NULL UNIQUE,
    payment_ref_id VARCHAR(100) NULL,
    payment_amount DECIMAL(10,2) NULL,
    payment_last_checked DATETIME NULL,
    payment_meta JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (car_id) REFERENCES cars(id),
    FOREIGN KEY (promo_id) REFERENCES promos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$bookingColumns = array_column(DB::table('INFORMATION_SCHEMA.COLUMNS')
    ->select(['COLUMN_NAME'])
    ->where('TABLE_SCHEMA', env('DB_NAME', 'crms'))
    ->where('TABLE_NAME', 'bookings')
    ->get(), 'COLUMN_NAME');

if (!in_array('payment_provider', $bookingColumns, true)) {
    DB::raw("ALTER TABLE bookings ADD payment_provider VARCHAR(30) NOT NULL DEFAULT 'chapa' AFTER final_total");
}
if (!in_array('payment_status', $bookingColumns, true)) {
    DB::raw("ALTER TABLE bookings ADD payment_status ENUM('unpaid','pending','paid','failed') NOT NULL DEFAULT 'unpaid' AFTER payment_provider");
}
if (!in_array('payment_tx_ref', $bookingColumns, true)) {
    DB::raw("ALTER TABLE bookings ADD payment_tx_ref VARCHAR(100) NULL UNIQUE AFTER payment_status");
}
if (!in_array('payment_ref_id', $bookingColumns, true)) {
    DB::raw("ALTER TABLE bookings ADD payment_ref_id VARCHAR(100) NULL AFTER payment_tx_ref");
}
if (!in_array('payment_amount', $bookingColumns, true)) {
    DB::raw("ALTER TABLE bookings ADD payment_amount DECIMAL(10,2) NULL AFTER payment_ref_id");
}
if (!in_array('payment_last_checked', $bookingColumns, true)) {
    DB::raw("ALTER TABLE bookings ADD payment_last_checked DATETIME NULL AFTER payment_amount");
}
if (!in_array('payment_meta', $bookingColumns, true)) {
    DB::raw("ALTER TABLE bookings ADD payment_meta JSON NULL AFTER payment_last_checked");
}

DB::raw("CREATE TABLE IF NOT EXISTS reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    car_id INT NOT NULL,
    booking_id INT NOT NULL UNIQUE,
    rating TINYINT NOT NULL,
    comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (car_id) REFERENCES cars(id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

DB::raw("CREATE TABLE IF NOT EXISTS favourites (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    car_id INT NOT NULL,
    UNIQUE KEY unique_fav (user_id, car_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (car_id) REFERENCES cars(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

DB::raw("CREATE TABLE IF NOT EXISTS waitlist (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    car_id INT NOT NULL,
    notified TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (car_id) REFERENCES cars(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

DB::raw("CREATE TABLE IF NOT EXISTS damage_reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    booking_id INT NOT NULL,
    car_id INT NOT NULL,
    description TEXT NOT NULL,
    repair_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    image_url VARCHAR(255) NULL,
    resolved TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (car_id) REFERENCES cars(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$admin = DB::table('users')->where('role', 'admin')->first();
if (!$admin) {
    DB::table('users')->insert([
        'name' => 'Admin',
        'email' => 'admin@crms.com',
        'password' => password_hash('admin123', PASSWORD_BCRYPT),
        'phone' => '0000000000',
        'license_number' => 'ADMIN-001',
        'license_verified' => 1,
        'role' => 'admin',
    ]);
}
