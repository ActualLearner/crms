<?php
declare(strict_types=1);
class Booking extends Model
{
    protected static string $table = 'bookings';

    /**
     * Minutes an unpaid booking keeps its dates reserved before the hold is
     * released. A pending booking blocks its dates via the overlap check in
     * BookingController::store(); with no admin-approval step, this timeout is
     * how an abandoned reservation frees the car again.
     */
    public const HOLD_MINUTES = 10;

    /**
     * Delete unpaid holds that have outlived the reservation window so they stop
     * blocking the car. Called before availability/overlap checks. Abandoned holds
     * carry no payment, reviews, or damage reports, so a hard delete is safe and
     * keeps cancelled bookings out of the customer's view.
     */
    public static function releaseExpiredHolds(): void
    {
        $cutoff = date('Y-m-d H:i:s', time() - self::HOLD_MINUTES * 60);

        $stale = DB::table('bookings')
            ->select(['id', 'promo_id'])
            ->where('status', 'pending')
            ->where('payment_status', '!=', 'paid')
            ->where('created_at', '<', $cutoff)
            ->get();

        foreach ($stale as $hold) {
            self::deleteHold((int) $hold['id'], $hold['promo_id'] !== null ? (int) $hold['promo_id'] : null);
        }
    }

    /**
     * Remove an unpaid hold and give back any promo use it had reserved.
     */
    public static function deleteHold(int $id, ?int $promoId): void
    {
        if ($promoId !== null) {
            $promo = DB::table('promos')->where('id', $promoId)->first();
            if ($promo && (int) $promo['times_used'] > 0) {
                DB::table('promos')->where('id', $promoId)->update([
                    'times_used' => (int) $promo['times_used'] - 1,
                ]);
            }
        }

        DB::table('bookings')->where('id', $id)->delete();
    }
}
