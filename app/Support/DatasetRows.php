<?php

namespace App\Support;

class DatasetRows
{
    /**
     * Extract tabular rows from a decoded response payload.
     */
    public static function extractRows(mixed $decoded): array
    {
        if (! is_array($decoded)) {
            return [];
        }

        $data = isset($decoded['data']) && is_array($decoded['data'])
            ? $decoded['data']
            : $decoded;

        return array_values(array_filter($data, 'is_array'));
    }

    /**
     * Build columns (name + type) for the given rows.
     *
     * @param  list<string>  $names
     * @return list<array{name: string, type: string}>
     */
    public static function buildColumns(array $names, array $rows): array
    {
        return array_map(
            fn (string $name): array => [
                'name' => $name,
                'type' => self::inferColumnType($rows, $name),
            ],
            $names
        );
    }

    public static function inferColumnType(array $rows, string $column): string
    {
        $types = [];

        foreach (array_slice($rows, 0, 50) as $row) {
            if (! array_key_exists($column, $row)) {
                continue;
            }
            $value = $row[$column];
            if ($value === null) {
                continue;
            }

            if (is_bool($value)) {
                $types['boolean'] = true;
            } elseif (is_int($value) || is_float($value)) {
                $types['number'] = true;
            } elseif (is_string($value)) {
                $types[self::isDateString($value) ? 'date' : 'text'] = true;
            } else {
                $types['text'] = true;
            }
        }

        if (count($types) === 0) {
            return 'text';
        }

        // Mixed -> most useful for the builder is text.
        if (count($types) > 1) {
            return 'text';
        }

        return (string) array_key_first($types);
    }

    public static function isDateString(string $value): bool
    {
        $trimmed = trim($value);

        return (bool) preg_match('/^\d{4}-\d{2}-\d{2}([T ].*)?$/', $trimmed)
            && strtotime(substr($trimmed, 0, 10)) !== false;
    }
}
