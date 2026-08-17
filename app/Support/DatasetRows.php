<?php

namespace App\Support;

class DatasetRows
{
    private const MAX_ROWS = 2000;

    /**
     * Extract tabular rows from a decoded response payload.
     *
     * Rows always come from `response.data`. A list-of-rows is used as-is; a
     * single object is denormalized (one row per nested object-list element,
     * merged with the parent scalar values) so nested fields — e.g.
     * `data: { chaine, total, defauts: [...] }` — stay reachable. When the
     * object carries more than one object-list, a cartesian expansion would
     * explode, so the object is served as a single row instead. Responses
     * without a `data` key (e.g. api/data/q/kpi_* KPI snapshots) are not
     * tabular and yield no rows, unless the response itself is a bare list.
     */
    public static function extractRows(mixed $decoded): array
    {
        if (! is_array($decoded)) {
            return [];
        }

        if (! array_key_exists('data', $decoded)) {
            return array_is_list($decoded)
                ? array_values(array_filter($decoded, 'is_array'))
                : [];
        }

        $data = $decoded['data'];

        if (! is_array($data)) {
            return [];
        }

        if (array_is_list($data)) {
            return array_slice(
                array_values(array_filter($data, 'is_array')),
                0,
                self::MAX_ROWS,
            );
        }

        return self::objectRows($data);
    }

    /**
     * Column names from a decoded response payload.
     *
     * Prefers `response.columns`, else derives them from `response.data`: the
     * first list row, or for a single object the scalar keys plus the keys of
     * every nested object-list (so `defauts`' `category`/`count`/... become
     * columns alongside `chaine`/`total`).
     *
     * @return list<string>
     */
    public static function columnsFrom(mixed $decoded): array
    {
        $response = is_array($decoded) ? $decoded : [];
        $columns = $response['columns'] ?? [];

        if (empty($columns)) {
            $data = $response['data'] ?? null;

            if (is_array($data)) {
                if (array_is_list($data)) {
                    $columns = array_keys($data[0] ?? []);
                } elseif ($data !== []) {
                    $columns = self::objectKeys($data);
                }
            }
        }

        return array_values(array_unique(array_filter(
            array_map('strval', (array) $columns),
            static fn (string $c): bool => $c !== ''
        )));
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

    /**
     * Keys of a single-object `data`: scalar keys plus the union of element
     * keys of every nested object-list value.
     *
     * @return list<string>
     */
    private static function objectKeys(array $data): array
    {
        $keys = [];

        foreach ($data as $key => $value) {
            if (self::isObjectList($value)) {
                foreach ($value as $element) {
                    if (is_array($element)) {
                        foreach (array_keys($element) as $k) {
                            $keys[] = (string) $k;
                        }
                    }
                }
            } else {
                $keys[] = (string) $key;
            }
        }

        return $keys;
    }

    /**
     * Rows from a single-object `data`: when the object has exactly one
     * nested object-list, denormalize it into one row per element merged with
     * the parent scalar values; otherwise the object itself is a single row
     * (multiple lists would make a cartesian expansion explode, e.g. the
     * chaine-complet KPI object which carries gpro/tags/top_operators/...).
     *
     * @return list<array<string, mixed>>
     */
    private static function objectRows(array $data): array
    {
        $scalars = [];
        $nestedLists = [];

        foreach ($data as $key => $value) {
            if (self::isObjectList($value)) {
                $nestedLists[$key] = $value;
            } else {
                $scalars[$key] = $value;
            }
        }

        if (count($nestedLists) !== 1) {
            return [$data];
        }

        $rows = [[]];

        foreach ($nestedLists as $items) {
            $next = [];

            foreach ($rows as $row) {
                foreach (array_slice($items, 0, self::MAX_ROWS) as $item) {
                    if (is_array($item)) {
                        $next[] = array_merge($row, $item);
                    }
                }
            }

            $rows = $next !== [] ? $next : $rows;
        }

        return array_slice(
            array_map(
                static fn (array $row): array => array_merge($scalars, $row),
                $rows
            ),
            0,
            self::MAX_ROWS,
        );
    }

    /**
     * Whether a value is a non-empty list of arrays (objects).
     */
    private static function isObjectList(mixed $value): bool
    {
        return is_array($value)
            && $value !== []
            && array_is_list($value)
            && is_array($value[0]);
    }
}
