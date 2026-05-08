<?php

declare(strict_types=1);

class QueryBuilder
{
    private string  $table;
    private array   $selects   = ['*'];
    private array   $joins     = [];
    private array   $wheres    = [];
    private array   $bindings  = [];
    private ?string $order     = null;
    private ?string $group     = null;
    private ?int    $limitVal  = null;
    private ?int    $offsetVal = null;
    private bool    $lock      = false;

    public function __construct(string $table)
    {
        $this->table = $table;
    }

    // ── SELECT ────────────────────────────────────────────────────────────

    public function select(array $cols): static
    {
        $this->selects = $cols;
        return $this;
    }

    // ── JOINs ─────────────────────────────────────────────────────────────

    public function join(string $table, string $left, string $right): static
    {
        $this->joins[] = "INNER JOIN {$table} ON {$left} = {$right}";
        return $this;
    }

    public function leftJoin(string $table, string $left, string $right): static
    {
        $this->joins[] = "LEFT JOIN {$table} ON {$left} = {$right}";
        return $this;
    }

    // ── WHERE ─────────────────────────────────────────────────────────────

    public function where(string $col, mixed $opOrVal, mixed $val = null): static
    {
        $op  = $val !== null ? $opOrVal : '=';
        $val = $val !== null ? $val     : $opOrVal;

        $prefix           = $this->wheres ? 'AND' : '';
        $this->wheres[]   = ltrim("{$prefix} {$col} {$op} ?");
        $this->bindings[] = $val;
        return $this;
    }

    public function orWhere(string $col, mixed $val): static
    {
        $prefix           = $this->wheres ? 'OR' : '';
        $this->wheres[]   = ltrim("{$prefix} {$col} = ?");
        $this->bindings[] = $val;
        return $this;
    }

    public function whereIn(string $col, array $vals): static
    {
        if (empty($vals)) {
            $prefix         = $this->wheres ? 'AND' : '';
            $this->wheres[] = ltrim("{$prefix} 1 = 0");
            return $this;
        }
        $ph              = implode(', ', array_fill(0, count($vals), '?'));
        $prefix          = $this->wheres ? 'AND' : '';
        $this->wheres[]  = ltrim("{$prefix} {$col} IN ({$ph})");
        $this->bindings  = array_merge($this->bindings, $vals);
        return $this;
    }

    public function whereNotIn(string $col, array $vals): static
    {
        if (empty($vals)) {
            return $this;
        }
        $ph              = implode(', ', array_fill(0, count($vals), '?'));
        $prefix          = $this->wheres ? 'AND' : '';
        $this->wheres[]  = ltrim("{$prefix} {$col} NOT IN ({$ph})");
        $this->bindings  = array_merge($this->bindings, $vals);
        return $this;
    }

    // ── ORDER / GROUP / LIMIT / OFFSET ────────────────────────────────────

    public function orderBy(string $col, string $dir = 'ASC'): static
    {
        $dir         = strtoupper($dir) === 'DESC' ? 'DESC' : 'ASC';
        $this->order = "{$col} {$dir}";
        return $this;
    }

    public function groupBy(string $col): static
    {
        $this->group = $col;
        return $this;
    }

    public function limit(int $n): static
    {
        $this->limitVal = $n;
        return $this;
    }

    public function offset(int $n): static
    {
        $this->offsetVal = $n;
        return $this;
    }

    // ── LOCKING ───────────────────────────────────────────────────────────

    public function lockForUpdate(): static
    {
        $this->lock = true;
        return $this;
    }

    // ── TERMINAL METHODS ──────────────────────────────────────────────────

    public function get(): array
    {
        return $this->run($this->buildSelect())->fetchAll();
    }

    public function first(): ?array
    {
        $clone            = clone $this;
        $clone->limitVal  = 1;
        $row              = $clone->run($clone->buildSelect())->fetch();
        return $row ?: null;
    }

    public function count(): int
    {
        $clone            = clone $this;
        $clone->selects   = ['COUNT(*) as total'];
        $clone->order     = null;
        $clone->limitVal  = null;
        $clone->offsetVal = null;
        $row              = $clone->run($clone->buildSelect())->fetch();
        return (int) ($row['total'] ?? 0);
    }

    public function paginate(int $perPage = 15, int $page = 1): array
    {
        $page  = max(1, $page);
        $total = $this->count();
        $data  = (clone $this)
            ->limit($perPage)
            ->offset(($page - 1) * $perPage)
            ->get();

        return [
            'data'         => $data,
            'total'        => $total,
            'per_page'     => $perPage,
            'current_page' => $page,
            'last_page'    => (int) ceil($total / max(1, $perPage)),
        ];
    }

    public function insert(array $data): string|false
    {
        if (empty($data)) {
            throw new InvalidArgumentException('Insert data cannot be empty');
        }
        $cols = implode(', ', array_keys($data));
        $ph   = implode(', ', array_fill(0, count($data), '?'));
        $this->run(
            "INSERT INTO {$this->table} ({$cols}) VALUES ({$ph})",
            array_values($data)
        );
        return Database::lastId();
    }

    public function update(array $data): int
    {
        if (empty($data)) {
            return 0;
        }
        $set  = implode(', ', array_map(fn($k) => "{$k} = ?", array_keys($data)));
        $sql  = "UPDATE {$this->table} SET {$set}" . $this->buildWhere();
        return $this->run($sql, [...array_values($data), ...$this->bindings])->rowCount();
    }

    public function delete(): int
    {
        return $this->run("DELETE FROM {$this->table}" . $this->buildWhere())->rowCount();
    }

    // ── PRIVATE ───────────────────────────────────────────────────────────

    private function buildSelect(): string
    {
        $sql  = 'SELECT ' . implode(', ', $this->selects);
        $sql .= " FROM {$this->table}";
        $sql .= $this->joins     ? ' ' . implode(' ', $this->joins)    : '';
        $sql .= $this->buildWhere();
        $sql .= $this->group     ? " GROUP BY {$this->group}"          : '';
        $sql .= $this->order     ? " ORDER BY {$this->order}"          : '';
        $sql .= $this->limitVal  ? " LIMIT {$this->limitVal}"          : '';
        $sql .= $this->offsetVal ? " OFFSET {$this->offsetVal}"        : '';
        if ($this->lock && env('DB_DRIVER', 'mysql') === 'mysql') {
            $sql .= ' FOR UPDATE';
        }
        return $sql;
    }

    private function buildWhere(): string
    {
        return $this->wheres ? ' WHERE ' . implode(' ', $this->wheres) : '';
    }

    private function run(string $sql, array $bindings = []): \PDOStatement
    {
        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($bindings ?: $this->bindings);
        return $stmt;
    }
}
