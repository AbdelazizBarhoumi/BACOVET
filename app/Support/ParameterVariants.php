<?php

namespace App\Support;

/**
 * Expands a single endpoint URL into one variant per declared parameter value.
 *
 * The default variant (params = {}) is always the stored URL itself; every
 * other variant swaps one or more declared query parameter values (e.g.
 * ?chaine=CH01 → ?chaine=CH02). The sync worker fetches + stores each variant
 * as its own snapshot so dashboards can switch a parameter without re-fetching.
 */
class ParameterVariants
{
    /**
     * @param  array<int, array{name: string, values: list<string>}>  $definitions  declared params for the endpoint root
     * @return list<array{params: array<string, string>, url: string, default: bool}>
     */
    public static function expand(string $url, array $definitions, int $cap = 200): array
    {
        $query = [];

        $parsed = parse_url($url);

        if (isset($parsed['query']) && $parsed['query'] !== '') {
            parse_str($parsed['query'], $query);
        }

        $options = [];

        foreach ($definitions as $definition) {
            $name = trim((string) ($definition['name'] ?? ''));
            $values = array_values(array_unique(array_values(array_filter(
                array_map('strval', (array) ($definition['values'] ?? [])),
                static fn (string $v): bool => $v !== '',
            ))));

            if ($name === '' || $values === [] || ! array_key_exists($name, $query)) {
                continue;
            }

            $options[$name] = $values;
        }

        $variants = [[
            'params' => [],
            'url' => $url,
            'default' => true,
        ]];

        if ($options === []) {
            return $variants;
        }

        $combinations = [[]];

        foreach (array_keys($options) as $name) {
            $next = [];

            foreach ($combinations as $combo) {
                foreach ($options[$name] as $value) {
                    $copy = $combo;
                    $copy[$name] = $value;
                    $next[] = $copy;
                }
            }

            $combinations = $next;
        }

        $seen = [$url => true];

        foreach ($combinations as $combo) {
            if (count($variants) >= $cap) {
                break;
            }

            $comboUrl = self::withQuery($url, $combo);

            if (isset($seen[$comboUrl])) {
                continue;
            }

            $seen[$comboUrl] = true;
            $variants[] = ['params' => $combo, 'url' => $comboUrl, 'default' => false];
        }

        return $variants;
    }

    /**
     * Set (or add) query parameters in a URL string, preserving everything
     * else. Works for both absolute and relative (path-only) URLs.
     *
     * @param  array<string, string>  $set
     */
    public static function withQuery(string $url, array $set): string
    {
        $parsed = parse_url($url);

        $query = [];

        if (isset($parsed['query']) && $parsed['query'] !== '') {
            parse_str($parsed['query'], $query);
        }

        foreach ($set as $key => $value) {
            $query[$key] = $value;
        }

        $rebuilt = '';

        if (isset($parsed['scheme'])) {
            $rebuilt .= $parsed['scheme'].'://';
        }

        if (isset($parsed['host'])) {
            $rebuilt .= $parsed['host'];
        }

        if (isset($parsed['port'])) {
            $rebuilt .= ':'.$parsed['port'];
        }

        if (isset($parsed['path'])) {
            $rebuilt .= $parsed['path'];
        }

        $queryString = http_build_query($query, '', '&', PHP_QUERY_RFC3986);

        if ($queryString !== '') {
            $rebuilt .= '?'.$queryString;
        }

        return $rebuilt;
    }
}
