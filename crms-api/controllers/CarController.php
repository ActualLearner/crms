<?php

declare(strict_types=1);

require_once ROOT . '/models/Car.php';
require_once ROOT . '/models/Booking.php';

class CarController extends Controller
{
    // GET /cars
    public function index(): void
    {
        $page = max(1, (int) ($_GET['page'] ?? 1));

        $query = DB::table('cars')
            ->select([
                'cars.*',
                'COALESCE(AVG(reviews.rating), 0) as average_rating',
                'COUNT(reviews.id) as review_count',
            ])
            ->leftJoin('reviews', 'cars.id', 'reviews.car_id')
            ->groupBy('cars.id');

        // Filters
        if (!empty($_GET['category'])) {
            $query = $query->where('cars.category', $_GET['category']);
        }
        if (!empty($_GET['seats'])) {
            $query = $query->where('cars.seats', (int) $_GET['seats']);
        }
        if (!empty($_GET['transmission'])) {
            $query = $query->where('cars.transmission', $_GET['transmission']);
        }
        if (!empty($_GET['max_price'])) {
            $query = $query->where('cars.daily_rate', '<=', (float) $_GET['max_price']);
        }
        if (!empty($_GET['min_price'])) {
            $query = $query->where('cars.daily_rate', '>=', (float) $_GET['min_price']);
        }
        if (!empty($_GET['status']) && $_GET['status'] !== 'all') {
            $query = $query->where('cars.status', $_GET['status']);
        } elseif (($_GET['status'] ?? '') !== 'all') {
            // Default: only show available cars to guests
            if (empty($_SESSION['user']) || $_SESSION['user']['role'] !== 'admin') {
                $query = $query->where('cars.status', 'available');
            }
        }

        // Date availability filter
        if (!empty($_GET['available_from']) && !empty($_GET['available_to'])) {
            $from = $_GET['available_from'];
            $to   = $_GET['available_to'];
            // Exclude cars that have a conflicting booking
            $bookedCarIds = DB::table('bookings')
                ->select(['car_id'])
                ->whereIn('status', ['pending', 'confirmed', 'active'])
                ->where('start_date', '<', $to)
                ->where('end_date', '>', $from)
                ->get();
            $ids = array_column($bookedCarIds, 'car_id');
            if (!empty($ids)) {
                $query = $query->whereNotIn('cars.id', $ids);
            }
        }

        $query = $query->orderBy('cars.created_at', 'DESC');

        $this->success($query->paginate(12, $page));
    }

    // GET /cars/:id
    public function show(string $id): void
    {
        $car = DB::table('cars')
            ->select([
                'cars.*',
                'COALESCE(AVG(reviews.rating), 0) as average_rating',
                'COUNT(reviews.id) as review_count',
            ])
            ->leftJoin('reviews', 'cars.id', 'reviews.car_id')
            ->where('cars.id', (int) $id)
            ->groupBy('cars.id')
            ->first();

        if (!$car) {
            $this->error('Car not found', 404);
        }

        // Attach latest reviews
        $car['reviews'] = DB::table('reviews')
            ->select(['reviews.*', 'users.name as reviewer_name'])
            ->join('users', 'reviews.user_id', 'users.id')
            ->where('reviews.car_id', (int) $id)
            ->orderBy('reviews.created_at', 'DESC')
            ->limit(5)
            ->get();

        $this->success($car);
    }

    // GET /cars/:id/availability
    public function availability(string $id): void
    {
        $booked = DB::table('bookings')
            ->select(['start_date', 'end_date', 'status'])
            ->where('car_id', (int) $id)
            ->whereIn('status', ['pending', 'confirmed', 'active'])
            ->get();

        $this->success($booked);
    }

    // GET /cars/:id/reviews
    public function reviews(string $id): void
    {
        if (!Car::find((int) $id)) {
            $this->error('Car not found', 404);
        }

        $page    = max(1, (int) ($_GET['page'] ?? 1));
        $reviews = DB::table('reviews')
            ->select(['reviews.*', 'users.name as reviewer_name'])
            ->join('users', 'reviews.user_id', 'users.id')
            ->where('reviews.car_id', (int) $id)
            ->orderBy('reviews.created_at', 'DESC')
            ->paginate(10, $page);

        $this->success($reviews);
    }

    // POST /cars  (admin)
    public function store(): void
    {
        $data   = $this->body();
        $errors = Validator::make($data, [
            'brand'        => 'required|max:50',
            'model'        => 'required|max:50',
            'year'         => 'required|integer',
            'category'     => 'required',
            'seats'        => 'required|integer',
            'transmission' => 'required|in:auto,manual',
            'daily_rate'   => 'required|numeric|min_val:1',
            'penalty_rate' => 'required|numeric',
        ]);

        if ($errors) {
            $this->error('Validation failed', 422, $errors);
        }

        $car = Car::create([
            'brand'        => trim($data['brand']),
            'model'        => trim($data['model']),
            'year'         => (int) $data['year'],
            'category'     => trim($data['category']),
            'seats'        => (int) $data['seats'],
            'transmission' => $data['transmission'],
            'daily_rate'   => (float) $data['daily_rate'],
            'penalty_rate' => (float) ($data['penalty_rate'] ?? 0),
            'status'       => 'available',
            'image_url'    => $data['image_url'] ?? null,
            'description'  => $data['description'] ?? null,
        ]);

        $this->success($car, 'Car added successfully', 201);
    }

    // PUT /cars/:id  (admin)
    public function update(string $id): void
    {
        if (!Car::find((int) $id)) {
            $this->error('Car not found', 404);
        }

        $data    = $this->body();
        $allowed = ['brand', 'model', 'year', 'category', 'seats', 'transmission',
                    'daily_rate', 'penalty_rate', 'status', 'image_url', 'description'];
        $update  = array_intersect_key($data, array_flip($allowed));

        if (empty($update)) {
            $this->error('No valid fields to update', 422);
        }

        DB::table('cars')->where('id', (int) $id)->update($update);
        $this->success(Car::find((int) $id), 'Car updated successfully');
    }

    // DELETE /cars/:id  (admin)

public function destroy(string $id): void
{
    if (!Car::find((int) $id)) {
        $this->error('Car not found', 404);
    }

    $active = DB::table('bookings')
        ->where('car_id', (int) $id)
        ->whereIn('status', ['active', 'confirmed'])
        ->first();

    if ($active) {
        $this->error('Cannot delete a car with active or confirmed bookings', 422);
    }

    $bookingIds = array_column(
        DB::table('bookings')->select(['id'])->where('car_id', (int) $id)->get(),
        'id'
    );

    if (!empty($bookingIds)) {
        DB::table('reviews')->whereIn('booking_id', $bookingIds)->delete();
        DB::table('damage_reports')->whereIn('booking_id', $bookingIds)->delete();
    }

    DB::table('favourites')->where('car_id', (int) $id)->delete();
    DB::table('waitlist')->where('car_id', (int) $id)->delete();
    DB::table('bookings')->where('car_id', (int) $id)->delete();
    DB::table('cars')->where('id', (int) $id)->delete();

    $this->success(null, 'Car deleted successfully');
}
}
