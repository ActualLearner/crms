<?php

declare(strict_types=1);

class Model
{
    protected static string $table = '';

    public static function table(): QueryBuilder
    {
        return DB::table(static::$table);
    }

    public static function all(): array
    {
        return static::table()->get();
    }

    public static function find(int $id): ?array
    {
        return static::table()->where('id', $id)->first();
    }

    public static function where(string $col, mixed $opOrVal, mixed $val = null): QueryBuilder
    {
        return static::table()->where($col, $opOrVal, $val);
    }

    public static function create(array $data): ?array
    {
        $id = static::table()->insert($data);
        return $id ? static::find((int) $id) : null;
    }

    public static function paginate(int $perPage = 15, int $page = 1): array
    {
        return static::table()->paginate($perPage, $page);
    }

    public static function count(): int
    {
        return static::table()->count();
    }
}
