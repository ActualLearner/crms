<?php

declare(strict_types=1);

require_once ROOT . '/models/Promo.php';

class PromoController extends Controller
{
    // GET /promos  (admin)
    public function index(): void
    {
        $promos = Promo::table()->orderBy('id', 'DESC')->get();
        $this->success($promos);
    }

    // POST /promos  (admin)
    public function store(): void
    {
        $data   = $this->body();
        $errors = Validator::make($data, [
            'code'                => 'required|max:30',
            'discount_percentage' => 'required|integer',
            'valid_from'          => 'required|date',
            'valid_until'         => 'required|date',
            'max_uses'            => 'required|integer',
        ]);
        if ($errors) {
            $this->error('Validation failed', 422, $errors);
        }

        if (DB::table('promos')->where('code', strtoupper(trim($data['code'])))->first()) {
            $this->error('Promo code already exists', 422);
        }

        $promo = Promo::create([
            'code'                => strtoupper(trim($data['code'])),
            'discount_percentage' => min(100, max(1, (int) $data['discount_percentage'])),
            'valid_from'          => $data['valid_from'],
            'valid_until'         => $data['valid_until'],
            'max_uses'            => max(1, (int) $data['max_uses']),
            'active'              => 1,
        ]);

        $this->success($promo, 'Promo code created', 201);
    }

    // PUT /promos/:id  (admin)
    public function update(string $id): void
    {
        if (!Promo::find((int) $id)) {
            $this->error('Promo not found', 404);
        }

        $data    = $this->body();
        $allowed = ['discount_percentage', 'valid_from', 'valid_until', 'max_uses', 'active'];
        $update  = array_intersect_key($data, array_flip($allowed));

        if (empty($update)) {
            $this->error('No valid fields to update', 422);
        }

        DB::table('promos')->where('id', (int) $id)->update($update);
        $this->success(Promo::find((int) $id), 'Promo updated');
    }

    // POST /promos/validate  (auth — called during booking)
    public function validate(): void
    {
        $data = $this->body();
        if (empty($data['code'])) {
            $this->error('Promo code is required', 422);
        }

        $promo = DB::table('promos')
            ->where('code', strtoupper(trim($data['code'])))
            ->where('active', 1)
            ->first();

        if (!$promo) {
            $this->error('Invalid promo code', 422);
        }
        if (strtotime($promo['valid_from']) > time() || strtotime($promo['valid_until']) < time()) {
            $this->error('Promo code has expired', 422);
        }
        if ($promo['times_used'] >= $promo['max_uses']) {
            $this->error('Promo code has reached its usage limit', 422);
        }

        $this->success([
            'code'                => $promo['code'],
            'discount_percentage' => $promo['discount_percentage'],
        ], "Promo code valid — {$promo['discount_percentage']}% off!");
    }
}
