<?php

declare(strict_types=1);

require_once ROOT . '/models/Favourite.php';
require_once ROOT . '/models/Car.php';

class FavouriteController extends Controller
{
    // GET /favourites
    public function index(): void
    {
        $favs = DB::table('favourites')
            ->select(['cars.*', 'favourites.id as fav_id'])
            ->join('cars', 'favourites.car_id', 'cars.id')
            ->where('favourites.user_id', $this->userId())
            ->orderBy('favourites.id', 'DESC')
            ->get();

        $this->success($favs);
    }

    // POST /favourites/:carId
    public function store(string $carId): void
    {
        if (!Car::find((int) $carId)) {
            $this->error('Car not found', 404);
        }

        $exists = DB::table('favourites')
            ->where('user_id', $this->userId())
            ->where('car_id', (int) $carId)
            ->first();

        if ($exists) {
            $this->error('Car already in favourites', 422);
        }

        $fav = Favourite::create([
            'user_id' => $this->userId(),
            'car_id'  => (int) $carId,
        ]);

        $this->success($fav, 'Added to favourites', 201);
    }

    // DELETE /favourites/:carId
    public function destroy(string $carId): void
    {
        $deleted = DB::table('favourites')
            ->where('user_id', $this->userId())
            ->where('car_id', (int) $carId)
            ->delete();

        if (!$deleted) {
            $this->error('Favourite not found', 404);
        }

        $this->success(null, 'Removed from favourites');
    }
}
