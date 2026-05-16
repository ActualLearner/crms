# CRMS - Car Rental Management System

> Full-stack car rental management platform with a dependency-free PHP API and vanilla JavaScript frontend.  
> Pure PHP 8.1+ · No Framework Dependencies · MySQL · Docker Containerized

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [Core Features](#core-features)
6. [API Documentation](#api-documentation)
7. [Frontend](#frontend)
8. [Development](#development)

---

## Overview

**CRMS** is a comprehensive car rental management system designed for both customers and administrators. It features:

- **Customer Portal**: Browse cars, make bookings, manage extensions, leave reviews, and report damages
- **Admin Dashboard**: Manage fleet, bookings, customers, damage reports, and promotions
- **AI Integration**: AI-powered car recommendations and customer support
- **Real-time Availability**: Advanced availability checking with date-range filtering
- **Payment Processing**: Promo codes and dynamic pricing
- **Rate Limiting**: Per-IP request limits for API stability

### Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend API | PHP 8.1+ (Miniframe custom framework) |
| Frontend | Vanilla JavaScript (SPA) |
| Database | MySQL 8.0 |
| Containerization | Docker & Docker Compose |
| AI | Google Gemini API |
| HTTP Server | Nginx |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Browser                           │
│                  (Vanilla JS Frontend)                      │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTPS / HTTP
┌─────────────────▼───────────────────────────────────────────┐
│                    Nginx Reverse Proxy                      │
│              (Port 8080 - crms-frontend)                    │
└─────────────────┬───────────────────────────────────────────┘
                  │ Internal Docker Network
┌─────────────────┴───────────────────────────────────────────┐
│                      API Server (PHP)                       │
│            (crms-api - Miniframe Framework)                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Router → Middleware → Controller             │  │
│  │              ↓                                        │  │
│  │         Model → QueryBuilder → PDO ← MySQL          │  │
│  └──────────────────────────────────────────────────────┘  │
│           (Handles all business logic)                      │
└─────────────────┬───────────────────────────────────────────┘
                  │ TCP/IP (Port 3306)
┌─────────────────▼───────────────────────────────────────────┐
│                    MySQL Database                           │
│  (Users, Cars, Bookings, Reviews, Damage Reports, etc.)    │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
crms/
├── docker-compose.yml           ← Orchestrates all services
├── README.md                    ← This file
├── skills-lock.json             ← Agent skills configuration
│
├── crms-api/                    ← Backend API (PHP)
│   ├── index.php                ← Single entry point (router)
│   ├── Dockerfile               ← PHP 8.1 Docker image
│   ├── test.php                 ← Test suite
│   ├── Readme.md                ← Detailed API documentation
│   │
│   ├── core/                    ← Miniframe Framework
│   │   ├── Router.php           ← URL routing engine
│   │   ├── Controller.php       ← Base controller class
│   │   ├── Model.php            ← Base model class
│   │   ├── Database.php         ← PDO singleton + transactions
│   │   ├── QueryBuilder.php     ← Fluent SQL builder
│   │   ├── Validator.php        ← Input validation rules
│   │   └── helpers.php          ← Global utility functions
│   │
│   ├── middleware/              ← Request middleware
│   │   ├── CorsMiddleware.php   ← CORS headers + preflight
│   │   ├── AuthMiddleware.php   ← Session auth + role guards
│   │   └── RateLimitMiddleware.php ← Per-IP rate limits
│   │
│   ├── controllers/             ← Request handlers
│   │   ├── AuthController.php       ← Register, login, logout
│   │   ├── CarController.php        ← Car CRUD + availability
│   │   ├── BookingController.php    ← Bookings lifecycle
│   │   ├── ReviewController.php     ← Car reviews
│   │   ├── FavouriteController.php  ← Favourite cars
│   │   ├── WaitlistController.php   ← Waitlist management
│   │   ├── PromoController.php      ← Promo codes
│   │   ├── DamageReportController.php ← Damage reports
│   │   ├── AdminController.php      ← Admin dashboard data
│   │   └── AiController.php         ← AI recommendations
│   │
│   ├── models/                  ← Data models
│   │   ├── User.php
│   │   ├── Car.php
│   │   ├── Booking.php
│   │   ├── Review.php
│   │   ├── Favourite.php
│   │   ├── Waitlist.php
│   │   ├── Promo.php
│   │   └── DamageReport.php
│   │
│   ├── config/
│   │   └── routes.php           ← API route definitions
│   │
│   ├── database/
│   │   ├── crms.sql             ← Database schema
│   │   └── schema.php           ← Schema definitions
│   │
│   ├── public/
│   │   └── uploads/
│   │       └── cars/            ← Uploaded car images
│   │
│   └── config/
│       └── .env.example         ← Environment template
│
├── crms-frontend/               ← Frontend (Vanilla JS)
│   ├── index.html               ← Entry point (redirects to login)
│   ├── Dockerfile               ← Nginx Docker image
│   ├── nginx.conf               ← Nginx configuration
│   │
│   ├── pages/                   ← HTML pages
│   │   ├── auth/                ← Login & register
│   │   ├── customer/            ← Customer UI
│   │   │   ├── vehicles.html    ← Car browsing
│   │   │   ├── car-detail.html  ← Car details
│   │   │   ├── bookings.html    ← Customer's bookings
│   │   │   ├── booking-confirmed.html
│   │   │   ├── extend-booking.html
│   │   │   ├── favourites.html  ← Saved cars
│   │   │   ├── profile.html     ← User profile
│   │   │   ├── review.html      ← Review submission
│   │   │   └── ...
│   │   └── admin/               ← Admin dashboard
│   │       ├── dashboard.html   ← Stats & overview
│   │       ├── fleet.html       ← Car management
│   │       ├── car-detail.html  ← Car edit
│   │       ├── bookings.html    ← All bookings
│   │       ├── customers.html   ← Customer list
│   │       ├── customer-detail.html
│   │       ├── damage-reports.html
│   │       ├── promos.html      ← Promo management
│   │       └── ...
│   │
│   ├── assets/                  ← Static resources
│   │   ├── css/
│   │   │   ├── variables.css    ← Design system (colors, spacing)
│   │   │   ├── reset.css        ← Normalize styles
│   │   │   ├── layout.css       ← Layout & grid
│   │   │   ├── components.css   ← Component styles
│   │   │   ├── animations.css   ← Transitions & animations
│   │   │   └── components/      ← Component-specific styles
│   │   └── js/                  ← Shared utilities
│   │       ├── (empty - uses js/ folder below)
│   │
│   ├── js/                      ← Application logic
│   │   ├── api.js               ← API client (fetch wrapper)
│   │   ├── router.js            ← Frontend router (SPA navigation)
│   │   ├── auth-guard.js        ← Auth middleware for routes
│   │   ├── state.js             ← Global app state
│   │   ├── utils.js             ← Helper functions
│   │   ├── components/          ← Reusable UI components
│   │   ├── pages/               ← Page-specific logic
│   │   │   ├── auth.js          ← Login/register logic
│   │   │   ├── vehicles.js      ← Car browsing
│   │   │   ├── car-detail.js    ← Car detail page
│   │   │   ├── bookings.js      ← Booking management
│   │   │   ├── booking-confirmed.js
│   │   │   ├── extend-booking.js
│   │   │   ├── favourites.js
│   │   │   ├── profile.js
│   │   │   ├── review.js
│   │   │   ├── admin-*.js       ← Admin pages
│   │   │   └── ...
│   │   ├── charts/              ← Chart components
│   │   └── vendor/              ← Third-party libraries
│   │
│   └── assets/vendor/           ← CDN dependencies (Chart.js, etc.)
│
└── scripts/                     ← Utility scripts
    ├── bulk_upload_images.sh    ← Car image bulk upload
    └── upload_from_zip.sh       ← Image batch upload from ZIP
```

---

## Getting Started

### Prerequisites

- Docker & Docker Compose
- OR: PHP 8.1+, MySQL 8.0, Node.js (for development)

### Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/Ay981/crms
cd crms

# Copy environment template
cp crms-api/.env.example crms-api/.env

# Start all services
docker-compose up -d

# Services will be available at:
# Frontend: http://localhost:8080
# API: http://localhost:3000 (from frontend)
# MySQL: localhost:3306 (internal network only)
```

### Development Setup (Without Docker)

**Backend:**
```bash
cd crms-api

# PHP with built-in server
php -S localhost:3000

# Or use Apache/Nginx with .htaccess
```

**Frontend:**
```bash
cd crms-frontend

# Serve static files with any simple HTTP server
python3 -m http.server 8080
# Or use live-server, VS Code Live Server, etc.
```

**Database:**
```bash
# Create database and import schema
mysql -u root -p
CREATE DATABASE crms;
USE crms;
SOURCE database/crms.sql;
```

---

## Core Features

### Customer Features
- ✅ **Browse Cars** - Filter by category, price, seats, transmission
- ✅ **Advanced Availability** - Date-range availability checking with real-time lock
- ✅ **Make Bookings** - Full booking flow with validation
- ✅ **Extend Bookings** - Extend active rental periods
- ✅ **Rate Cars** - Submit reviews with ratings
- ✅ **Save Favorites** - Add cars to personal favorites list
- ✅ **Damage Reporting** - Report car damages with photos
- ✅ **Waitlist** - Join waitlist for unavailable cars
- ✅ **User Profile** - Manage account and view booking history

### Admin Features
- ✅ **Fleet Management** - Add, edit, delete cars with availability control
- ✅ **Booking Management** - View, approve, reject, extend bookings
- ✅ **Customer Management** - View customer details and booking history
- ✅ **Damage Reports** - Manage and resolve damage reports
- ✅ **Promotions** - Create and manage promo codes
- ✅ **Dashboard** - View revenue, bookings, customers stats
- ✅ **Verification** - Approve user documents and data

### Technical Features
- ✅ **AI Recommendations** - Gemini API integration for car suggestions
- ✅ **Rate Limiting** - 5 requests/minute per IP (configurable)
- ✅ **Database Transactions** - ACID compliance for bookings
- ✅ **CORS Support** - Secure cross-origin requests
- ✅ **Session Auth** - Server-side session management with role-based access
- ✅ **Validation** - Client & server-side input validation
- ✅ **Error Handling** - Consistent JSON error responses

---

## API Documentation

See [crms-api/Readme.md](crms-api/Readme.md) for complete API documentation including:

- Detailed framework architecture
- All endpoint specifications
- Request/response examples
- Authentication & authorization
- Error handling
- Database schema
- Helper functions
- Configuration reference

### API Structure

**Base URL:** `http://localhost:3000` (development) or `http://api.crms.local` (production)

**Authentication:** Session-based (login required for most endpoints)

**Response Format:**
```json
{
  "status": "success|error",
  "message": "Human-readable message",
  "data": {} or [],
  "error": null or "error string"
}
```

**Key Endpoints:**
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /cars` - List cars (filterable)
- `POST /bookings` - Create booking
- `GET /bookings` - User's bookings
- `POST /reviews` - Submit review
- `GET /admin/stats` - Dashboard stats (admin only)

---

## Frontend

### Architecture

**Vanilla JavaScript SPA** with:
- **Router** (`router.js`) - Client-side routing without framework overhead
- **API Client** (`api.js`) - Centralized REST API communication
- **State Management** (`state.js`) - Global app state (user, UI state)
- **Auth Guard** (`auth-guard.js`) - Middleware for protected routes

### Page Organization

```javascript
// Each page has:
// 1. HTML page (pages/category/page.html)
// 2. JS logic file (js/pages/page.js)
// 3. CSS styles (assets/css/components/page.css)

// Navigation example
router.navigate('/cars');  // Goes to pages/customer/vehicles.html
```

### Component System

Reusable UI components in `js/components/`:
- Navigation header
- Booking form
- Review card
- Damage report modal
- Promo code input
- etc.

### Styling

- **Design System** (`assets/css/variables.css`) - Colors, spacing, typography
- **Component Styles** (`assets/css/components.css`) - Reusable component styles
- **Layouts** (`assets/css/layout.css`) - Page layouts and grid
- **Animations** (`assets/css/animations.css`) - Smooth transitions

---

## Development

### Database Schema

Tables:
- `users` - User accounts (customers & admins)
- `cars` - Vehicle inventory
- `bookings` - Car rental bookings
- `reviews` - Car reviews & ratings
- `favourites` - Saved cars per user
- `damage_reports` - Damage reports
- `waitlist` - Waitlist entries
- `promos` - Promotion codes
- Access [crms-api/database/crms.sql](crms-api/database/crms.sql) for full schema

### Environment Variables

**Required (.env):**
```
APP_ENV=production|development
DB_HOST=localhost
DB_NAME=crms
DB_USER=root
DB_PASS=password
ALLOWED_ORIGIN=http://localhost:8080
GEMINI_API_KEY=your-api-key
RATE_LIMIT=5
```

### Testing

```bash
cd crms-api
php test.php
```

Run full integration test suite (35 tests)

---

## Deployment

### Docker Compose

```bash
docker-compose up -d
```

Services:
- **db** - MySQL 8.0
- **api** - PHP 8.1 (crms-api)
- **frontend** - Nginx (crms-frontend)

### Environment Setup for Production

1. Generate strong DB password
2. Set `APP_ENV=production`
3. Configure `ALLOWED_ORIGIN` for your domain
4. Add `GEMINI_API_KEY` for AI features
5. Use HTTPS with valid certificates
6. Configure Nginx SSL in `crms-frontend/nginx.conf`

---

## Key Implementation Details

### Miniframe Framework

**Why custom framework?** School project requirement - proves understanding of routing, MVC, and database abstraction without relying on Laravel/Symfony.

**Features:**
- Router with `:param` pattern matching
- PDO-based QueryBuilder with fluent API
- Model base class with relationships
- Validator with 20+ rule types
- Transaction support for data integrity
- Global helpers for common tasks

### Session-Based Authentication

Routes protected with `AuthMiddleware`:
```php
// Admin-only route
Router::post('/admin/promo', [AdminController::class, 'createPromo'], 'role:admin');

// Authenticated route
Router::post('/bookings', [BookingController::class, 'store'], 'auth');
```

### Database Locking

Prevents race conditions on simultaneous bookings:
│   ├── Car.php
│   ├── Booking.php
│   ├── Review.php
│   ├── Promo.php
│   ├── Favourite.php
│   ├── Waitlist.php
│   └── DamageReport.php
│
├── config/
│   └── routes.php               ← All route definitions
│
└── database/
    ├── schema.php               ← Auto-creates SQLite tables on boot
    └── crms.sql                 ← MySQL schema for production
```

---

## 3. Getting Started

### Requirements

- PHP 8.1 or higher
- Apache with `mod_rewrite` enabled
- PHP extensions: `pdo_sqlite` or `pdo_mysql`, `mbstring`
- SQLite (local dev) or MySQL (production)

### Local Setup on Ubuntu

```bash
# Install Apache and PHP
sudo apt update
sudo apt install apache2 php php-sqlite3 php-mbstring php-xml -y

# Enable mod_rewrite
sudo a2enmod rewrite

# Allow .htaccess overrides
sudo sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf
sudo systemctl restart apache2

# Deploy the project
sudo unzip crms-api.zip -d /var/www/html/
sudo chmod -R 755 /var/www/html/crms-api
sudo chmod -R 777 /var/www/html/crms-api/database

# Seed demo data
cd /var/www/html/crms-api && php test.php
```

### Verify it works

```bash
curl http://localhost/crms-api/cars
# → {"success":true,"data":{...},"message":"OK"}

curl -X POST http://localhost/crms-api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@crms.com","password":"admin123"}'
# → {"success":true,"data":{...},"message":"Logged in successfully"}
```

---

## 4. Configuration

All configuration lives in the `.env` file in the project root.

```env
APP_ENV=development
ALLOWED_ORIGIN=http://localhost:5500

# SQLite (local development)
DB_DRIVER=sqlite
DB_PATH=database/crms.sqlite

# MySQL (production — swap the lines above for these)
# DB_DRIVER=mysql
# DB_HOST=localhost
# DB_NAME=crms
# DB_USER=crms_user
# DB_PASS=your_password_here

RATE_LIMIT=5
GEMINI_API_KEY=your_key_here
```

### Reading config in code

```php
$env    = env('APP_ENV');                   // 'development'
$origin = env('ALLOWED_ORIGIN', 'http://localhost:5500'); // with fallback
```

### Switching to MySQL for production

1. Comment out the SQLite lines
2. Uncomment the MySQL lines
3. Fill in your credentials
4. Run `mysql -u root -p crms < database/crms.sql`
5. Done — no code changes needed

> **Never commit `.env` to Git.** It contains credentials.  
> Commit `.env.example` instead and let teammates fill in their own values.

---

## 5. Routing

All routes are defined in `config/routes.php`.

### Registering Routes

```php
// Public route
Router::get('/cars', 'CarController@index');

// With URL parameter
Router::get('/cars/:id', 'CarController@show');

// POST route
Router::post('/auth/login', 'AuthController@login');

// Protected route (logged in)
Router::post('/bookings', 'BookingController@store', 'auth');

// Admin only route
Router::post('/cars', 'CarController@store', 'admin');

// PUT and DELETE
Router::put('/cars/:id', 'CarController@update', 'admin');
Router::delete('/cars/:id', 'CarController@destroy', 'admin');
```

### URL Parameters

URL parameters use `:name` syntax and are passed as arguments to the controller method in order:

```php
// Route definition
Router::get('/cars/:id', 'CarController@show');
Router::get('/admin/customers/:id', 'AdminController@showCustomer');

// Controller method receives them as arguments
public function show(string $id): void { ... }
public function showCustomer(string $id): void { ... }
```

### How the Router Works

1. Strips the subfolder prefix (if app lives at `/crms-api/`)
2. Loops all registered routes matching the HTTP method
3. Converts `:param` into named regex capture groups
4. On match — runs middleware if assigned, then calls `Controller@method`
5. On no match — returns `404` JSON response

### Middleware Assignment

The third argument to any route method assigns middleware:

| Value | Behaviour |
|---|---|
| `''` (empty) | Public — no auth check |
| `'auth'` | Must be logged in (any role) |
| `'admin'` | Must be logged in AND have `role = admin` |

---

## 6. Controllers

All controllers extend the base `Controller` class which provides response helpers and session access.

### Creating a Controller

```php
<?php
// controllers/ExampleController.php

require_once ROOT . '/models/Car.php'; // require models you need

class ExampleController extends Controller
{
    public function index(): void
    {
        $cars = Car::all();
        $this->success($cars);
    }

    public function show(string $id): void
    {
        $car = Car::find((int) $id);

        if (!$car) {
            $this->error('Car not found', 404);
        }

        $this->success($car);
    }

    public function store(): void
    {
        $data   = $this->body();
        $errors = Validator::make($data, [
            'brand' => 'required',
            'model' => 'required',
        ]);

        if ($errors) {
            $this->error('Validation failed', 422, $errors);
        }

        $car = Car::create($data);
        $this->success($car, 'Car created', 201);
    }
}
```

### Base Controller Methods

| Method | Description |
|---|---|
| `$this->success($data, $message, $status)` | Send a success JSON response and exit |
| `$this->error($message, $status, $errors)` | Send an error JSON response and exit |
| `$this->body()` | Get the parsed JSON request body |
| `$this->user()` | Get the logged-in user array from session |
| `$this->userId()` | Get the logged-in user's ID |
| `$this->userRole()` | Get the logged-in user's role |

### Reading Request Data

```php
// JSON body (from fetch with Content-Type: application/json)
$data = $this->body();
$name = $data['name'] ?? null;

// Query string (?page=2&category=SUV)
$page     = $_GET['page'] ?? 1;
$category = $_GET['category'] ?? null;

// URL parameter (from route :id)
public function show(string $id): void {
    $car = Car::find((int) $id);
}
```

---

## 7. Models

Models are thin classes that extend `Model` and declare their database table name. All query methods are inherited automatically.

### Creating a Model

```php
<?php
// models/Car.php

class Car extends Model
{
    protected static string $table = 'cars';
}
```

That is literally the whole file. Everything else is inherited.

### Built-in Model Methods

```php
// Get all records
Car::all();

// Find by primary key
Car::find(5);              // returns array or null

// Where clause — returns QueryBuilder for chaining
Car::where('status', 'available')->get();
Car::where('daily_rate', '<=', 100)->orderBy('daily_rate')->get();

// Create a record
Car::create([
    'brand'      => 'Toyota',
    'model'      => 'Corolla',
    'daily_rate' => 50,
    'status'     => 'available',
]);

// Count records
Car::count();

// Paginate
Car::paginate(12, $page); // returns pagination envelope
```

### Adding Custom Methods

You can add custom query methods directly to the model:

```php
class Car extends Model
{
    protected static string $table = 'cars';

    // Custom method for cars with ratings
    public static function withRatings(): array
    {
        return DB::table('cars')
            ->select([
                'cars.*',
                'COALESCE(AVG(reviews.rating), 0) as average_rating',
                'COUNT(reviews.id) as review_count',
            ])
            ->leftJoin('reviews', 'cars.id', 'reviews.car_id')
            ->groupBy('cars.id')
            ->get();
    }
}
```

---

## 8. Query Builder

The `QueryBuilder` is the core of Miniframe's database layer. It builds SQL strings fluently and executes them through PDO with prepared statements.

### Basic Usage

```php
// Always start with DB::table()
$results = DB::table('cars')->get();

// Or through a model
$results = Car::table()->get();
```

### SELECT

```php
// All columns (default)
DB::table('cars')->get();

// Specific columns
DB::table('cars')
    ->select(['id', 'brand', 'model', 'daily_rate'])
    ->get();

// With expressions
DB::table('cars')
    ->select([
        'cars.*',
        'COUNT(bookings.id) as booking_count',
        'COALESCE(AVG(reviews.rating), 0) as average_rating',
    ])
    ->get();
```

### WHERE

```php
// Simple equality
->where('status', 'available')

// With operator
->where('daily_rate', '<=', 100)
->where('seats', '>=', 5)
->where('year', '>', 2020)

// Chain multiple (AND)
->where('status', 'available')
->where('category', 'SUV')
->where('seats', 5)

// OR condition
->orWhere('status', 'confirmed')

// IN list
->whereIn('status', ['pending', 'confirmed', 'active'])

// NOT IN list
->whereNotIn('status', ['cancelled', 'completed'])
```

### JOINs

```php
// INNER JOIN — only rows with matches on both sides
->join('cars', 'bookings.car_id', 'cars.id')

// LEFT JOIN — all rows from left, nulls from right if no match
->leftJoin('reviews', 'cars.id', 'reviews.car_id')

// Multiple joins
DB::table('bookings')
    ->join('cars',  'bookings.car_id',  'cars.id')
    ->join('users', 'bookings.user_id', 'users.id')
    ->leftJoin('reviews', 'bookings.id', 'reviews.booking_id')
    ->get();
```

### ORDER, GROUP, LIMIT, OFFSET

```php
->orderBy('created_at', 'DESC')
->orderBy('daily_rate', 'ASC')
->groupBy('car_id')
->limit(10)
->offset(20)
```

### Terminal Methods

```php
->get()           // array of all matching rows
->first()         // first matching row or null
->count()         // integer count
->paginate(12, 2) // pagination envelope (page 2, 12 per page)
->insert($data)   // insert and return new ID
->update($data)   // update matching rows, return affected count
->delete()        // delete matching rows, return affected count
```

### Pagination Response

```php
$result = Car::table()->paginate(12, $page);

// Returns:
[
    'data'         => [...],  // array of records
    'total'        => 47,     // total records
    'per_page'     => 12,     // records per page
    'current_page' => 2,      // current page
    'last_page'    => 4,      // total pages
]
```

### Lock For Update (Race Condition Prevention)

```php
// Locks the row until transaction completes
// Prevents two requests from reading the same "available" status simultaneously
DB::table('cars')
    ->where('id', $carId)
    ->lockForUpdate()
    ->first();
```

> **Note:** `lockForUpdate()` only applies in MySQL. In SQLite it is silently ignored — SQLite handles concurrency differently at the file level.

### Real-World Example

```php
// Get all bookings with car and customer info — no N+1 problem
$bookings = DB::table('bookings')
    ->select([
        'bookings.*',
        'cars.brand', 'cars.model', 'cars.image_url',
        'users.name as customer_name',
        'users.email as customer_email',
    ])
    ->join('cars',  'bookings.car_id',  'cars.id')
    ->join('users', 'bookings.user_id', 'users.id')
    ->where('bookings.status', 'confirmed')
    ->orderBy('bookings.created_at', 'DESC')
    ->paginate(15, $page);
```

---

## 9. Validation

The `Validator` class validates request data against a set of rules. It returns an array of field-level errors — empty array means everything is valid.

### Basic Usage

```php
$data   = $this->body();
$errors = Validator::make($data, [
    'name'     => 'required|max:100',
    'email'    => 'required|email',
    'password' => 'required|min:8',
    'seats'    => 'required|integer',
    'rate'     => 'required|numeric|min_val:1',
    'category' => 'required|in:Sedan,SUV,Van,Luxury',
    'date'     => 'required|date',
]);

if ($errors) {
    $this->error('Validation failed', 422, $errors);
}
```

### Available Rules

| Rule | Description | Example |
|---|---|---|
| `required` | Field must be present and non-empty | `'name' => 'required'` |
| `email` | Must be a valid email address | `'email' => 'required\|email'` |
| `numeric` | Must be a number (int or float) | `'rate' => 'numeric'` |
| `integer` | Must be a whole number | `'seats' => 'integer'` |
| `min:n` | String length must be at least n | `'password' => 'min:8'` |
| `max:n` | String length must not exceed n | `'name' => 'max:100'` |
| `min_val:n` | Numeric value must be at least n | `'rate' => 'min_val:1'` |
| `date` | Must be a valid date string | `'start' => 'date'` |
| `in:a,b,c` | Value must be one of the listed options | `'role' => 'in:admin,customer'` |

### Error Response Format

```json
{
    "success": false,
    "message": "Validation failed",
    "errors": {
        "email": "Email must be a valid email address",
        "password": "Password must be at least 8 characters"
    }
}
```

### Combining Rules

Rules are separated by `|` pipe character. They are checked in order and the first failure stops checking that field:

```php
'password' => 'required|min:8|max:255'
'rate'     => 'required|numeric|min_val:0'
'status'   => 'required|in:available,rented,maintenance'
```

---

## 10. Middleware

Middleware runs before the controller and can terminate the request early by sending a response and calling `exit`.

### Auth Middleware

Protects routes by checking `$_SESSION['user']`.

```php
// Assigned in routes.php as third argument
Router::post('/bookings', 'BookingController@store', 'auth');
Router::post('/cars',     'CarController@store',     'admin');
```

**`auth`** — checks user is logged in:
- Returns `401 Unauthenticated` if no session exists

**`admin`** — checks user is logged in AND has admin role:
- Returns `401` if not logged in
- Returns `403 Forbidden` if logged in but not admin

### CORS Middleware

Runs on every single request before anything else in `index.php`.

```php
// index.php
CorsMiddleware::handle(); // must be first
```

Sets the following headers automatically:

```
Access-Control-Allow-Origin: http://localhost:5500  (from .env)
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
```

Kills `OPTIONS` preflight requests immediately with `204 No Content` — they never reach the router.

### Rate Limit Middleware

Applied manually inside controllers on sensitive endpoints:

```php
public function login(): void
{
    RateLimitMiddleware::handle(); // 5 attempts per minute per IP (from .env)
    // ...
}

// Custom limit
RateLimitMiddleware::handle(3); // override to 3 attempts
```

Returns `429 Too Many Requests` when the limit is exceeded.

### Writing Custom Middleware

```php
<?php
// middleware/MyMiddleware.php

class MyMiddleware
{
    public static function handle(): void
    {
        // Your check here
        if (something_wrong()) {
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Denied']);
            exit; // always exit to stop further execution
        }
        // If we reach here, the request continues normally
    }
}
```

---

## 11. Database & Transactions

### Database Singleton

`Database` (aliased as `DB`) maintains a single PDO connection for the entire request lifecycle. It is created on first use and reused on every subsequent call — no reconnecting on every query.

```php
// Get the raw PDO connection (rarely needed)
$pdo = DB::connection();

// Start a QueryBuilder
$qb = DB::table('cars');

// Run raw SQL (schema migrations, complex queries)
DB::raw('CREATE INDEX idx_status ON cars(status)');
```

### Transactions

Transactions are essential for operations that touch multiple tables. If any step fails, everything rolls back — the database is never left in a broken state.

```php
DB::beginTransaction();

try {
    // Step 1 — lock the car to prevent race conditions
    $car = DB::table('cars')
        ->where('id', $carId)
        ->lockForUpdate()
        ->first();

    // Step 2 — check availability
    if ($car['status'] !== 'available') {
        DB::rollback();
        $this->error('Car not available', 422);
    }

    // Step 3 — create booking
    $booking = Booking::create([...]);

    // Step 4 — update car status
    DB::table('cars')
        ->where('id', $carId)
        ->update(['status' => 'rented']);

    // All good — commit everything
    DB::commit();
    $this->success($booking, 'Booking created', 201);

} catch (Throwable $e) {
    DB::rollback(); // undo everything if anything threw
    throw $e;       // let the global handler return a clean JSON 500
}
```

### The N+1 Problem

Miniframe solves N+1 at the query level using JOINs. Never fetch related data inside a loop:

```php
// ❌ BAD — N+1 queries
$bookings = Booking::all(); // 1 query
foreach ($bookings as $booking) {
    $car = Car::find($booking['car_id']); // 1 query per booking = N queries
}

// ✅ GOOD — 1 query total
$bookings = DB::table('bookings')
    ->select(['bookings.*', 'cars.brand', 'cars.model'])
    ->join('cars', 'bookings.car_id', 'cars.id')
    ->get();
```

---

## 12. Response Envelope

Every single response from the API follows the same shape. The JS frontend always knows exactly what to expect.

### Success Response

```json
{
    "success": true,
    "data": { ... },
    "message": "OK"
}
```

### Error Response

```json
{
    "success": false,
    "data": null,
    "message": "Validation failed",
    "errors": {
        "email": "Email must be a valid email address"
    }
}
```

### HTTP Status Codes Used

| Code | Meaning | When |
|---|---|---|
| `200` | OK | Successful GET, PUT, DELETE |
| `201` | Created | Successful POST that creates a resource |
| `204` | No Content | OPTIONS preflight response |
| `400` | Bad Request | Malformed request |
| `401` | Unauthorized | Not logged in |
| `403` | Forbidden | Logged in but wrong role |
| `404` | Not Found | Resource doesn't exist |
| `422` | Unprocessable | Validation failed or business rule violation |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Server Error | Unhandled exception |

### Sending Responses in Controllers

```php
// Success
$this->success($data);                          // 200
$this->success($data, 'Car created', 201);      // 201 with message
$this->success(null, 'Deleted');                // 200, no data

// Error
$this->error('Not found', 404);                 // 404
$this->error('Validation failed', 422, $errors); // 422 with field errors
$this->error('Forbidden', 403);                 // 403
```

---

## 13. Helper Functions

Global functions available everywhere in the application.

### `env(string $key, mixed $default = null)`

Read a value from the `.env` file. Caches on first call so the file is only read once per request.

```php
$driver  = env('DB_DRIVER', 'sqlite');
$apiKey  = env('ANTHROPIC_API_KEY');
$appEnv  = env('APP_ENV', 'production');
```

### `dd(mixed ...$vars)`

Dump variables as pretty-printed JSON and terminate. Development debugging only — remove before shipping.

```php
dd($car, $booking, $user);
// Outputs JSON and exits
```

### `generateRef(): string`

Generate a unique booking reference number. Loops until it finds one not already in the database.

```php
$ref = generateRef();
// e.g. "CRMS-20240601-A3F9"
```

Format: `CRMS-YYYYMMDD-XXXX` where XXXX is 4 random uppercase hex characters.

### `daysBetween(string $start, string $end): int`

Calculate the number of days between two date strings.

```php
$days = daysBetween('2024-06-01', '2024-06-06'); // 5
$days = daysBetween('2024-06-01', '2024-06-02'); // 1
```

### `jsonResponse(bool $success, mixed $data, string $message, int $status)`

Send a JSON response from outside a controller (e.g. middleware).

```php
jsonResponse(false, null, 'Unauthenticated', 401);
```

---

## 14. Error Handling

A global exception handler is registered in `index.php`. Any uncaught exception anywhere in the application is caught and returned as a clean JSON response — no PHP white screens, no HTML error pages.

```php
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
```

In **development** mode the actual error message and file/line are returned — useful for debugging.

In **production** mode only a generic `"Internal server error"` is returned — never leaking implementation details.

---

## 15. CORS & Sessions

### Why This Matters

When the JS frontend (running on `localhost:5500`) calls the PHP API (running on `localhost/crms-api`), the browser treats them as different origins. Without CORS headers the browser blocks the request entirely.

When session cookies are involved, `Access-Control-Allow-Origin: *` (wildcard) is **not allowed** by the browser. You must specify the exact origin.

### Configuration

Set `ALLOWED_ORIGIN` in `.env` to your frontend's exact origin:

```env
# Local development
ALLOWED_ORIGIN=http://localhost:5500

# Production
ALLOWED_ORIGIN=https://yourcarrental.com
```

### JS Side — Always Include Credentials

Every fetch call on the frontend must include `credentials: 'include'` to send the session cookie:

```javascript
// Central API wrapper
async function api(endpoint, options = {}) {
    const res = await fetch(`http://localhost/crms-api${endpoint}`, {
        credentials: 'include',            // always send session cookie
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });

    if (res.status === 401) {
        window.location.href = '/login.html';
        return;
    }

    return res.json();
}

// Usage
const cars = await api('/cars');
const booking = await api('/bookings', {
    method: 'POST',
    body: JSON.stringify({ car_id: 5, start_date: '2024-06-01', end_date: '2024-06-05' }),
});
```

---

## 16. Rate Limiting

Rate limiting uses PHP sessions to track request counts per IP per route. The window resets every 60 seconds.

### Configuration

```env
RATE_LIMIT=5   # max requests per minute per IP
```

### Usage

Applied manually in controller methods:

```php
public function login(): void
{
    RateLimitMiddleware::handle();    // uses RATE_LIMIT from .env
    RateLimitMiddleware::handle(3);   // override: max 3 attempts
    // ...
}
```

### Response when limit exceeded

```json
{
    "success": false,
    "message": "Too many requests. Please wait a minute and try again."
}
```

HTTP Status: `429 Too Many Requests`

---

## 17. AI Integration

Miniframe includes a built-in AI controller powered by the Gemini API. It uses PHP's native `cURL` — no SDK or Composer package needed.

### Configuration

```env
GEMINI_API_KEY=your_key_here
```

### Available Endpoints

#### `POST /ai/recommend` — Smart Car Recommender

Reads the live car catalog from the database and asks Gemini to recommend the best matches for the customer's natural language request.

```javascript
const res = await api('/ai/recommend', {
    method: 'POST',
    body: JSON.stringify({
        prompt: "I need a car for a family road trip, 5 people, budget $60/day"
    })
});
console.log(res.data.reply); // AI recommendation with reasoning
```

#### `POST /ai/chat` — General Booking Assistant

A conversational assistant that maintains history across turns.

```javascript
const history = []; // store conversation turns here

const res = await api('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({
        message: "What's your cheapest automatic car?",
        history: history,
    })
});

// Add the exchange to history for context
history.push({ role: 'user',      content: message });
history.push({ role: 'assistant', content: res.data.reply });
```

#### `GET /ai/reviews/:carId/summary` — Review Summariser

Fetches all reviews for a car and returns a 2-3 sentence AI summary.

```javascript
const res = await api('/ai/reviews/5/summary');
console.log(res.data.summary);
// "Customers consistently praise the Toyota Corolla for its fuel efficiency
//  and smooth ride. A few reviewers noted the AC could be stronger on hot days."
```

### How Gemini is Called

```php
// Inside AiController
private function callGemini(string $system, array $messages): string
{
    $payload = json_encode([
        'systemInstruction' => [
            'parts' => [[ 'text' => $system ]],
        ],
        'contents' => $messages,
        'generationConfig' => [
            'temperature' => 0.5,
            'maxOutputTokens' => 512,
        ],
    ]);

    $ch = curl_init('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'x-goog-api-key: ' . env('GEMINI_API_KEY'),
        ],
    ]);

    $response = curl_exec($ch);
    curl_close($ch);

    $data = json_decode($response, true);
    return $data['candidates'][0]['content']['parts'][0]['text'];
}
```

---

## 18. Security

### Password Hashing

Passwords are hashed using `bcrypt` with a cost factor of 12 via PHP's built-in `password_hash()`. Plain text passwords are never stored.

```php
// Storing
password_hash($password, PASSWORD_BCRYPT, ['cost' => 12])

// Verifying
password_verify($plaintext, $storedHash)
```

### SQL Injection Prevention

All queries use PDO prepared statements. User input is **never** interpolated directly into SQL strings.

```php
// ✅ Safe — value is bound as a parameter
DB::table('users')->where('email', $email)->first();

// The QueryBuilder generates:
// SELECT * FROM users WHERE email = ?
// And binds $email separately via PDO
```

### CORS + Credentials

Origin is locked to the exact value in `.env` — wildcards are not permitted when credentials are involved.

### Security Headers

Set automatically by `CorsMiddleware` on every response:

```
X-Content-Type-Options: nosniff   — prevents MIME sniffing attacks
X-Frame-Options: DENY             — prevents clickjacking
```

### Input Sanitisation

All string input from users passes through the Validator. Numeric values are cast explicitly:

```php
$id    = (int)   $data['id'];
$rate  = (float) $data['daily_rate'];
$seats = (int)   $data['seats'];
$email = strtolower(trim($data['email']));
```

### Role-Based Access Control

Every sensitive route has a middleware guard. Controllers never trust `$_GET` or `$_POST` for role information — only `$_SESSION['user']['role']` set at login time is trusted.

---

## 19. Deployment

### Local (Ubuntu + Apache)

```bash
sudo apt install apache2 php php-sqlite3 php-mbstring -y
sudo a2enmod rewrite
sudo sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf
sudo systemctl restart apache2
sudo cp -r crms-api /var/www/html/
sudo chmod -R 777 /var/www/html/crms-api/database
```

### VPS (Ubuntu + MySQL)

```bash
# Install stack
sudo apt install apache2 php php-mysql php-mbstring -y
sudo a2enmod rewrite

# Set up MySQL
sudo mysql -e "CREATE DATABASE crms;"
sudo mysql -e "CREATE USER 'crms_user'@'localhost' IDENTIFIED BY 'strongpassword';"
sudo mysql -e "GRANT ALL ON crms.* TO 'crms_user'@'localhost';"
sudo mysql crms < /var/www/html/crms-api/database/crms.sql

# Update .env
nano /var/www/html/crms-api/.env
# Set DB_DRIVER=mysql, fill in credentials
# Set ALLOWED_ORIGIN=https://yourfrontenddomain.com
# Set APP_ENV=production
```

### Split Deployment (Recommended)

The cleanest production setup separates frontend and backend:

```
VPS                  → crms-api (PHP API)
GitHub Pages / CDN   → crms-frontend (static HTML/CSS/JS)
```

The frontend is just static files — it can be hosted anywhere for free.

---

## 20. API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register new customer |
| POST | `/auth/login` | Public | Login |
| POST | `/auth/logout` | auth | Logout |
| GET | `/auth/me` | auth | Current user + notifications |

### Cars

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/cars` | Public | List cars (filterable, paginated) |
| GET | `/cars/:id` | Public | Car details + reviews |
| GET | `/cars/:id/availability` | Public | Booked date ranges |
| GET | `/cars/:id/reviews` | Public | Paginated reviews |
| POST | `/cars` | admin | Add car |
| PUT | `/cars/:id` | admin | Update car |
| DELETE | `/cars/:id` | admin | Delete car |

#### Car Filters (Query String)

```
GET /cars?category=SUV&seats=5&max_price=100&transmission=auto&status=available
GET /cars?available_from=2024-06-01&available_to=2024-06-07
GET /cars?page=2
```

### Bookings

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/bookings` | auth | Create booking |
| GET | `/bookings/mine` | auth | My bookings |
| DELETE | `/bookings/:id` | auth | Cancel booking |
| PUT | `/bookings/:id/extend` | auth | Extend booking |
| POST | `/bookings/:id/review` | auth | Submit review |
| GET | `/bookings` | admin | All bookings |
| PUT | `/bookings/:id/confirm` | admin | Confirm booking |
| PUT | `/bookings/:id/return` | admin | Log return + penalties |

### Favourites & Waitlist

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/favourites` | auth | My favourite cars |
| POST | `/favourites/:carId` | auth | Add to favourites |
| DELETE | `/favourites/:carId` | auth | Remove from favourites |
| POST | `/waitlist/:carId` | auth | Join waitlist |
| DELETE | `/waitlist/:carId` | auth | Leave waitlist |

### Promos

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/promos/validate` | auth | Validate a promo code |
| GET | `/promos` | admin | List all promos |
| POST | `/promos` | admin | Create promo |
| PUT | `/promos/:id` | admin | Update promo |

### Admin

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/admin/stats` | admin | Dashboard analytics |
| GET | `/admin/customers` | admin | All customers |
| GET | `/admin/customers/:id` | admin | Customer + history |
| PUT | `/admin/customers/:id/verify` | admin | Verify/unverify license |
| GET | `/damage-reports` | admin | All damage reports |
| POST | `/damage-reports` | admin | Create damage report |
| PUT | `/damage-reports/:id/resolve` | admin | Resolve damage report |

### AI

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/ai/recommend` | Public | Smart car recommendation |
| POST | `/ai/chat` | Public | Booking assistant chat |
| GET | `/ai/reviews/:carId/summary` | Public | AI review summary |

---

## 21. Default Accounts

After running `php test.php` the following accounts are seeded:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@crms.com` | `admin123` |
| Customer | `customer@crms.com` | `customer123` |

### Default Promo Code

| Code | Discount | Valid Until |
|---|---|---|
| `WELCOME20` | 20% off | 2030-12-31 |

> **Change all default passwords before deploying to production.**

---

## Running Tests

```bash
cd /var/www/html/crms-api
php test.php
```

Expected output:

```
CRMS API Test Suite
──────────────────────────────────────────────────

[1] Core Framework
  ✓ env() reads .env file
  ✓ daysBetween() calculates correctly
  ✓ Validator::make() required rule
  ✓ Validator::make() email rule
  ✓ Validator::make() min rule
  ✓ Validator::make() in rule

[2] Database & QueryBuilder
  ✓ Database connection works
  ✓ DB::table() returns QueryBuilder
  ✓ QueryBuilder insert & find
  ... (35 tests total)

──────────────────────────────────────────────────
Results: 35 passed
```

---

*Miniframe — built from scratch, zero dependencies, fully yours.*