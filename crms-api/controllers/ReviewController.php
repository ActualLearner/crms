<?php

declare(strict_types=1);

require_once ROOT . '/models/Review.php';
require_once ROOT . '/models/Car.php';
require_once ROOT . '/models/Booking.php';

class ReviewController extends Controller
{
    // POST /bookings/:id/review
    public function store(string $bookingId): void
    {
        $data   = $this->body();
        $errors = Validator::make($data, [
            'rating' => 'required|integer|in:1,2,3,4,5',
        ]);
        if ($errors) {
            $this->error('Validation failed', 422, $errors);
        }

        $booking = Booking::find((int) $bookingId);
        if (!$booking) {
            $this->error('Booking not found', 404);
        }
        if ((int) $booking['user_id'] !== $this->userId()) {
            $this->error('You can only review your own bookings', 403);
        }
        if ($booking['status'] !== 'completed') {
            $this->error('You can only review completed bookings', 422);
        }

        // One review per booking
        if (DB::table('reviews')->where('booking_id', (int) $bookingId)->first()) {
            $this->error('You have already reviewed this booking', 422);
        }

        $review = Review::create([
            'user_id'    => $this->userId(),
            'car_id'     => (int) $booking['car_id'],
            'booking_id' => (int) $bookingId,
            'rating'     => (int) $data['rating'],
            'comment'    => trim($data['comment'] ?? ''),
        ]);

        // Recalculate car average rating
        $avg = DB::table('reviews')
            ->select(['COALESCE(AVG(rating), 0) as avg_rating'])
            ->where('car_id', (int) $booking['car_id'])
            ->first();

        DB::table('cars')
            ->where('id', (int) $booking['car_id'])
            ->update(['average_rating' => round((float) $avg['avg_rating'], 2)]);

        $this->success($review, 'Review submitted successfully', 201);
    }
}
