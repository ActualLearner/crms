<?php

declare(strict_types=1);

require_once ROOT . '/models/DamageReport.php';
require_once ROOT . '/models/Car.php';

class DamageReportController extends Controller
{
    // GET /damage-reports  (admin)
    public function index(): void
    {
        $reports = DB::table('damage_reports')
            ->select([
                'damage_reports.*',
                'cars.brand', 'cars.model',
                'users.name as customer_name',
            ])
            ->join('cars', 'damage_reports.car_id', 'cars.id')
            ->join('bookings', 'damage_reports.booking_id', 'bookings.id')
            ->join('users', 'bookings.user_id', 'users.id')
            ->orderBy('damage_reports.created_at', 'DESC')
            ->get();

        $this->success($reports);
    }

    // POST /damage-reports  (admin)
    public function store(): void
    {
        $data   = $this->body();
        $errors = Validator::make($data, [
            'booking_id'  => 'required|integer',
            'car_id'      => 'required|integer',
            'description' => 'required',
            'repair_cost' => 'required|numeric',
        ]);
        if ($errors) {
            $this->error('Validation failed', 422, $errors);
        }

        $report = DamageReport::create([
            'booking_id'  => (int) $data['booking_id'],
            'car_id'      => (int) $data['car_id'],
            'description' => trim($data['description']),
            'repair_cost' => (float) $data['repair_cost'],
            'image_url'   => $data['image_url'] ?? null,
            'resolved'    => 0,
        ]);

        // Make sure car is in maintenance
        DB::table('cars')
            ->where('id', (int) $data['car_id'])
            ->update(['status' => 'maintenance']);

        $this->success($report, 'Damage report created', 201);
    }

    // PUT /damage-reports/:id/resolve  (admin)
    public function resolve(string $id): void
    {
        $report = DamageReport::find((int) $id);
        if (!$report) {
            $this->error('Damage report not found', 404);
        }
        if ($report['resolved']) {
            $this->error('This damage report is already resolved', 422);
        }

        DB::table('damage_reports')->where('id', (int) $id)->update(['resolved' => 1]);

        // Return car to available
        DB::table('cars')
            ->where('id', (int) $report['car_id'])
            ->update(['status' => 'available']);

        // Notify first person on waitlist
        $waiting = DB::table('waitlist')
            ->where('car_id', (int) $report['car_id'])
            ->where('notified', 0)
            ->orderBy('id', 'ASC')
            ->first();

        if ($waiting) {
            DB::table('waitlist')
                ->where('id', (int) $waiting['id'])
                ->update(['notified' => 1]);
        }

        $this->success(DamageReport::find((int) $id), 'Damage resolved. Car is now available.');
    }
}
