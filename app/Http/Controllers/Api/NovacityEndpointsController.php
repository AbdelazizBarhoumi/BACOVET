<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class NovacityEndpointsController extends Controller
{
    /**
     * Parse the Postman collection from storage/app/public/data.json
     * using regex-based extraction anchored to each "request" block.
     */
    public function __invoke(): JsonResponse
    {
        $path = storage_path('app/public/data.json');

        if (! file_exists($path)) {
            return response()->json(['endpoints' => [], 'error' => 'data.json not found'], 404);
        }

        $raw = file_get_contents($path);

        if ($raw === false) {
            return response()->json(['endpoints' => [], 'error' => 'Could not read data.json'], 500);
        }

        $endpoints = $this->extract($raw);

        return response()->json(['endpoints' => $endpoints]);
    }

    private function extract(string $raw): array
    {
        // 1. Find every "request" object start position
        $requestPositions = [];
        if (preg_match_all('/"request":\s*\{/', $raw, $matches, PREG_OFFSET_CAPTURE)) {
            $requestPositions = array_column($matches[0], 1);
        }

        $endpoints = [];

        // 2. For each request block, extract path, method, description, name
        for ($i = 0; $i < count($requestPositions); $i++) {
            $start = $requestPositions[$i];
            // Scope to ~8000 chars (enough for the request block)
            $end = $i + 1 < count($requestPositions)
                ? $requestPositions[$i + 1]
                : $start + 8000;
            $block = substr($raw, $start, min($end - $start, 8000));

            // Extract slug from "path" array
            $slug = $this->extractPath($block);
            if ($slug === '' || ! str_starts_with($slug, 'api/')) {
                continue;
            }

            // Extract method
            $method = 'GET';
            if (preg_match('/"method":\s*"(\w+)"/', $block, $mMethod)) {
                $method = strtoupper($mMethod[1]);
            }

            // Extract name from nearest preceding "name" field
            $name = $this->findNameBefore($raw, $start);

            // Extract description content — the one inside this request block
            $content = $this->extractDescription($block);

            // Extract fields from the description
            $fields = $this->extractFields($content);

            $endpoints[$slug] = [
                'name' => $name,
                'method' => $method,
                'fields' => $fields,
            ];
        }

        return $endpoints;
    }

    /**
     * Extract the endpoint slug from a "path" array within a request block.
     */
    private function extractPath(string $block): string
    {
        if (! preg_match('/"path":\s*\[\s*([^\]]+?)\]/s', $block, $m)) {
            return '';
        }

        $segments = [];
        preg_match_all('/"([^"]+)"/', $m[1], $segMatches);
        $segments = $segMatches[1];

        // Filter out variable segments like ":id"
        $segments = array_values(array_filter($segments, fn ($s) => ! str_starts_with($s, ':')));

        return implode('/', $segments);
    }

    /**
     * Find the nearest "name" field before a given position.
     */
    private function findNameBefore(string $raw, int $pos): string
    {
        $best = '';
        if (preg_match_all('/"name":\s*"([^"]+)"/', $raw, $m, PREG_OFFSET_CAPTURE)) {
            foreach ($m[1] as $match) {
                if ($match[1] < $pos) {
                    $best = $match[0];
                } else {
                    break;
                }
            }
        }

        return $best;
    }

    /**
     * Extract the description content string from a request block.
     * Only matches the description inside the request object, not nested query params.
     */
    private function extractDescription(string $block): string
    {
        // Match the first "description": {"content": "..."} inside this request block
        if (! preg_match('/"description":\s*\{\s*"content":\s*"((?:[^"\\\\]|\\\\.)*)"/s', $block, $m)) {
            return '';
        }

        return $this->decodeJsonString($m[1]);
    }

    /**
     * Decode a JSON-escaped string value.
     */
    private function decodeJsonString(string $raw): string
    {
        $decoded = json_decode('"'.$raw.'"');

        return is_string($decoded) ? $decoded : '';
    }

    /**
     * Extract field names from a description text block.
     * Priority: PDF-confirmed > Champs retournés > Champs > Champs attendus
     */
    private function extractFields(string $text): array
    {
        // Priority 1: PDF-confirmed fields (the real API response fields)
        $pdfFields = $this->extractPdfConfirmedFields($text);
        if (! empty($pdfFields)) {
            return $pdfFields;
        }

        // Priority 2: "Champs retournés: A, B, C"
        if (preg_match('/[Cc]hamps?\s+retournés?\s*:\s*([^\n]+)/', $text, $m)) {
            return $this->parseFieldList($m[1]);
        }

        // Priority 3: "Champs: A, B, C" (SQL query style)
        if (preg_match('/[Cc]hamps?\s*:\s*([^\n]+)/', $text, $m)) {
            return $this->parseFieldList($m[1]);
        }

        // Priority 4: "Champs attendus: A, B, C" (inactive endpoints)
        if (preg_match('/[Cc]hamps?\s+attends?\s*:\s*([^\n]+)/', $text, $m)) {
            return $this->parseFieldList($m[1]);
        }

        return [];
    }

    /**
     * Extract PDF-confirmed field lists from description text.
     * These appear after "---" separator as:
     *   "📄 COLONNES COMPLÈTES CONFIRMÉES ...: A, B, C"
     *   "📄 CHAMPS RÉELS CONFIRMÉS ...: A, B, C"
     */
    private function extractPdfConfirmedFields(string $text): array
    {
        $fields = [];

        // Pattern: "📄 COLONNES COMPLÈTES CONFIRMÉES ... : Field1, Field2, ..."
        if (preg_match_all('/COLONNES?\s+COMPL[ÈE]TES?\s+CONFIRM[ÉE]ES?[^:]*:\s*([^\.\n]+)/', $text, $m)) {
            foreach ($m[1] as $line) {
                $fields = array_merge($fields, $this->parseFieldList($line));
            }
        }

        // Pattern: "📄 CHAMPS RÉELS CONFIRMÉS ... : Field1, Field2, ..."
        if (preg_match_all('/CHAMPS\s+R[ÉE]ELS?\s+CONFIRM[ÉE]S?[^:]*:\s*([^\.\n]+)/', $text, $m)) {
            foreach ($m[1] as $line) {
                $fields = array_merge($fields, $this->parseFieldList($line));
            }
        }

        return array_values(array_unique($fields));
    }

    /**
     * Parse a comma-separated field list, keeping only valid identifiers.
     */
    private function parseFieldList(string $raw): array
    {
        $parts = preg_split('/[,\s]+/', $raw);
        $fields = [];

        foreach ($parts as $part) {
            $f = trim($part, ". '\"\n\r\t");
            $f = rtrim($f, ')');
            $f = ltrim($f, '(');

            if ($f === '' || strlen($f) < 2) {
                continue;
            }

            // Must be a valid identifier: starts with letter/underscore, contains only alphanum/underscore
            if (preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $f)) {
                $fields[] = $f;
            }
        }

        return $fields;
    }
}
