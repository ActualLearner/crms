<?php

declare(strict_types=1);

class Validator
{
    /**
     * Validate $data against $rules.
     * Returns an array of field => error message.
     * Empty array means all valid.
     *
     * Rules: required | email | numeric | min:8 | max:255 | date | in:a,b,c
     */
    public static function make(array $data, array $rules): array
    {
        $errors = [];

        foreach ($rules as $field => $ruleStr) {
            $value      = $data[$field] ?? null;
            $fieldRules = explode('|', $ruleStr);

            foreach ($fieldRules as $rule) {
                $error = self::check($field, $value, $rule);
                if ($error !== null) {
                    $errors[$field] = $error;
                    break; // one error per field at a time
                }
            }
        }

        return $errors;
    }

    private static function check(string $field, mixed $value, string $rule): ?string
    {
        // Split rules that have a parameter e.g. min:8
        $param = null;
        if (str_contains($rule, ':')) {
            [$rule, $param] = explode(':', $rule, 2);
        }

        $label = ucfirst(str_replace('_', ' ', $field));

        return match ($rule) {
            'required' => (empty($value) && $value !== '0' && $value !== 0)
                ? "{$label} is required"
                : null,

            'email' => (!empty($value) && !filter_var($value, FILTER_VALIDATE_EMAIL))
                ? "{$label} must be a valid email address"
                : null,

            'numeric' => (!empty($value) && !is_numeric($value))
                ? "{$label} must be a number"
                : null,

            'integer' => (!empty($value) && filter_var($value, FILTER_VALIDATE_INT) === false)
                ? "{$label} must be a whole number"
                : null,

            'min' => (!empty($value) && strlen((string) $value) < (int) $param)
                ? "{$label} must be at least {$param} characters"
                : null,

            'max' => (!empty($value) && strlen((string) $value) > (int) $param)
                ? "{$label} must not exceed {$param} characters"
                : null,

            'min_val' => (!empty($value) && (float) $value < (float) $param)
                ? "{$label} must be at least {$param}"
                : null,

            'date' => (!empty($value) && strtotime($value) === false)
                ? "{$label} must be a valid date (YYYY-MM-DD)"
                : null,

            'in' => (!empty($value) && !in_array((string) $value, array_map(static fn ($item) => trim((string) $item), explode(',', $param ?? '')), true))
                ? "{$label} must be one of: {$param}"
                : null,

            'confirmed' => null, // handled separately if needed

            default => null,
        };
    }
}
