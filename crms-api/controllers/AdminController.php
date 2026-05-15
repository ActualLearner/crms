<?php

declare(strict_types=1);

require_once ROOT . '/models/User.php';
require_once ROOT . '/models/Car.php';
require_once ROOT . '/models/Booking.php';

class AdminController extends Controller
{
    // GET /admin/stats
    public function stats(): void
    {
        // Revenue
        $revenueAll = DB::table(table: 'bookings')
            ->select(['COALESCE(SUM(final_total), 0) as total'])
            ->where('status', opOrVal: 'completed')
            ->first();

        $revenueMonth = DB::table('bookings')
            ->select(['COALESCE(SUM(final_total), 0) as total'])
            ->where('status', 'completed')
            ->where('created_at', '>=', date('Y-m-01'))
            ->first();

        // Booking counts by status
        $pendingCount   = DB::table('bookings')->where('status', 'pending')->count();
        $confirmedCount = DB::table('bookings')->where('status', 'confirmed')->count();
        $activeCount    = DB::table('bookings')->where('status', 'active')->count();
        $totalBookings  = DB::table('bookings')->count();

        // Fleet status
        $availableCars    = DB::table('cars')->where('status', 'available')->count();
        $rentedCars       = DB::table('cars')->where('status', 'rented')->count();
        $maintenanceCars  = DB::table('cars')->where('status', 'maintenance')->count();
        $totalCars        = DB::table('cars')->count();

        // Total customers
        $totalCustomers = DB::table('users')->where('role', 'customer')->count();

        // Most rented cars (top 5)
        $topCars = DB::table('bookings')
            ->select(['cars.brand', 'cars.model', 'cars.id', 'COUNT(bookings.id) as rental_count'])
            ->join('cars', 'bookings.car_id', 'cars.id')
            ->whereIn('bookings.status', ['completed', 'active'])
            ->groupBy('bookings.car_id')
            ->orderBy('rental_count', 'DESC')
            ->limit(5)
            ->get();

        // Recent bookings (last 5)
        $recentBookings = DB::table('bookings')
            ->select([
                'bookings.reference_number',
                'bookings.status',
                'bookings.final_total',
                'bookings.created_at',
                'users.name as customer_name',
                'cars.brand',
                'cars.model',
            ])
            ->join('users', 'bookings.user_id', 'users.id')
            ->join('cars', 'bookings.car_id', 'cars.id')
            ->orderBy('bookings.created_at', 'DESC')
            ->limit(5)
            ->get();

        $this->success([
            'revenue' => [
                'all_time'     => (float) $revenueAll['total'],
                'this_month'   => (float) $revenueMonth['total'],
            ],
            'bookings' => [
                'total'     => $totalBookings,
                'pending'   => $pendingCount,
                'confirmed' => $confirmedCount,
                'active'    => $activeCount,
            ],
            'fleet' => [
                'total'       => $totalCars,
                'available'   => $availableCars,
                'rented'      => $rentedCars,
                'maintenance' => $maintenanceCars,
            ],
            'customers'       => $totalCustomers,
            'top_cars'        => $topCars,
            'recent_bookings' => $recentBookings,
        ]);
    }

    // GET /admin/customers
    public function customers(): void
    {
        $page = max(1, (int) ($_GET['page'] ?? 1));

        $query = DB::table('users')
            ->select([
                'id',
                'name',
                'email',
                'phone',
                'license_number',
                'license_verified',
                'role',
                'created_at'
            ])
            ->where('role', 'customer')
            ->orderBy('created_at', 'DESC');

        if (!empty($_GET['search'])) {
            $search = trim((string) $_GET['search']);
            $query = $query
                ->where('name', 'LIKE', '%' . $search . '%')
                ->orWhere('email', 'LIKE', '%' . $search . '%');
        }

        $payload = $query->paginate(15, $page);
        $customerIds = array_values(array_filter(array_map(
            fn(array $customer) => (int) ($customer['id'] ?? 0),
            $payload['data']
        )));

        $customerStats = [];
        if (!empty($customerIds)) {
            $customerStatsRows = DB::table('bookings')
                ->select([
                    'user_id',
                    'COUNT(*) as booking_count',
                    'COALESCE(SUM(CASE WHEN status = "completed" THEN final_total ELSE 0 END), 0) as total_spent',
                    'MAX(CASE WHEN status IN ("active", "confirmed") THEN 1 ELSE 0 END) as currently_renting',
                ])
                ->whereIn('user_id', $customerIds)
                ->groupBy('user_id')
                ->get();

            foreach ($customerStatsRows as $row) {
                $customerStats[(int) $row['user_id']] = [
                    'booking_count' => (int) ($row['booking_count'] ?? 0),
                    'total_spent' => (float) ($row['total_spent'] ?? 0),
                    'currently_renting' => (int) ($row['currently_renting'] ?? 0) === 1,
                ];
            }
        }

        $payload['data'] = array_map(
            function (array $customer) use ($customerStats): array {
                $stats = $customerStats[(int) $customer['id']] ?? [
                    'booking_count' => 0,
                    'total_spent' => 0,
                    'currently_renting' => false,
                ];

                return array_merge($customer, $stats);
            },
            $payload['data']
        );

        $verifiedCustomers = DB::table('users')
            ->where('role', 'customer')
            ->where('license_verified', 1)
            ->count();

        $pendingCustomers = DB::table('users')
            ->where('role', 'customer')
            ->where('license_verified', 0)
            ->count();

        $currentlyRenting = DB::table('bookings')
            ->select(['COUNT(DISTINCT bookings.user_id) as total'])
            ->join('users', 'bookings.user_id', 'users.id')
            ->where('users.role', 'customer')
            ->whereIn('bookings.status', ['active', 'confirmed'])
            ->first();

        $payload['stats'] = [
            'verified' => $verifiedCustomers,
            'pending' => $pendingCustomers,
            'renting' => (int) ($currentlyRenting['total'] ?? 0),
        ];

        $this->success($payload);
    }

    // GET /admin/customers/:id
    public function showCustomer(string $id): void
    {
        $user = DB::table('users')
            ->select([
                'id',
                'name',
                'email',
                'phone',
                'license_number',
                'license_verified',
                'role',
                'created_at'
            ])
            ->where('id', (int) $id)
            ->where('role', 'customer')
            ->first();

        if (!$user) {
            $this->error('Customer not found', 404);
        }

        // Full booking history
        $bookings = DB::table('bookings')
            ->select(['bookings.*', 'cars.brand', 'cars.model'])
            ->join('cars', 'bookings.car_id', 'cars.id')
            ->where('bookings.user_id', (int) $id)
            ->orderBy('bookings.created_at', 'DESC')
            ->get();

        $user['bookings']       = $bookings;
        $user['total_spent']    = array_sum(array_column(
            array_filter($bookings, fn($b) => $b['status'] === 'completed'),
            'final_total'
        ));
        $user['booking_count']  = count($bookings);

        $this->success($user);
    }

    // PUT /admin/customers/:id/verify
    public function verify(string $id): void
    {
        $user = User::find((int) $id);
        if (!$user || $user['role'] !== 'customer') {
            $this->error('Customer not found', 404);
        }

        $newStatus = $user['license_verified'] ? 0 : 1;
        DB::table('users')->where('id', (int) $id)->update(['license_verified' => $newStatus]);

        $msg = $newStatus ? 'License verified successfully' : 'License verification removed';
        $this->success(['license_verified' => $newStatus], $msg);
    }
}
