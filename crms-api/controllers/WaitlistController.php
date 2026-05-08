<?php

declare(strict_types=1);

require_once ROOT . '/models/Waitlist.php';
require_once ROOT . '/models/Car.php';

class WaitlistController extends Controller
{
    // POST /waitlist/:carId
    public function store(string $carId): void
    {
        $car = Car::find((int) $carId);
        if (!$car) {
            $this->error('Car not found', 404);
        }
        if ($car['status'] === 'available') {
            $this->error('This car is already available — you can book it now!', 422);
        }

        $exists = DB::table('waitlist')
            ->where('user_id', $this->userId())
            ->where('car_id', (int) $carId)
            ->first();

        if ($exists) {
            $this->error('You are already on the waitlist for this car', 422);
        }

        $entry = Waitlist::create([
            'user_id' => $this->userId(),
            'car_id'  => (int) $carId,
        ]);

        $this->success($entry, 'Added to waitlist. We will notify you when it becomes available.', 201);
    }

    // DELETE /waitlist/:carId
    public function destroy(string $carId): void
    {
        $deleted = DB::table('waitlist')
            ->where('user_id', $this->userId())
            ->where('car_id', (int) $carId)
            ->delete();

        if (!$deleted) {
            $this->error('Waitlist entry not found', 404);
        }

        $this->success(null, 'Removed from waitlist');
    }
}
