<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GoogleDriveService
{
    private bool $mockMode;

    private string $mockUrl;

    private int $timeout;

    private const SHEET_MAP = [
        'br_print' => 'br_print',
        'br_care_label' => 'br_care_label',
        'br_accessoires' => 'br_accessoires',
        'br_compo' => 'br_compo',
        'inspection_commande' => 'inspection_commande',
        'dot_hot' => 'dot_hot',
        'development' => 'development',
        'gammes' => 'gammes',
        'cotation' => 'cotation',
    ];

    public function __construct()
    {
        $this->mockMode = (bool) config('google_drive.mock_mode', true);
        $this->mockUrl = (string) config('google_drive.mock_url', 'http://127.0.0.1:3002');
        $this->timeout = (int) config('google_drive.timeout', 15);
    }

    /**
     * Fetch sheet data by key.
     * In mock mode: calls mock server (Google Sheets API v4 format).
     * In real mode: uses google/apiclient with service account.
     * Returns array of associative arrays (rows converted to objects).
     */
    public function fetchSheet(string $key): array
    {
        $key = self::SHEET_MAP[$key] ?? throw new \InvalidArgumentException("Unknown sheet: {$key}");

        if ($this->mockMode) {
            return $this->fetchFromMock($key);
        }

        return $this->fetchFromGoogleSheets($key);
    }

    private function fetchFromMock(string $key): array
    {
        $response = Http::timeout($this->timeout)
            ->get("{$this->mockUrl}/api/sheets/{$key}");

        if ($response->failed()) {
            throw new \RuntimeException("Google Drive mock error [{$key}]: HTTP {$response->status()}");
        }

        $body = $response->json();

        return $this->convertSheetValues($body['values'] ?? []);
    }

    private function fetchFromGoogleSheets(string $key): array
    {
        $sheetId = config("google_drive.sheets.{$key}");

        if (! $sheetId) {
            Log::warning("GoogleDriveService: No sheet ID configured for '{$key}', skipping.");

            return [];
        }

        // google/apiclient usage (production mode)
        $client = new \Google\Client();
        $client->setAuthConfig(config('google_drive.service_account_json'));
        $client->addScope(\Google\Service\Sheets::SPREADSHEETS_READONLY);

        $service = new \Google\Service\Sheets($client);
        $range = 'Sheet1!A:Z';

        try {
            $response = $service->spreadsheets_values->get($sheetId, $range);
            $values = $response->getValues();

            return $this->convertSheetValues($values);
        } catch (\Throwable $e) {
            throw new \RuntimeException("Google Sheets API error [{$key}]: {$e->getMessage()}");
        }
    }

    /**
     * Convert Google Sheets values array (header row + data rows) to array of associative arrays.
     * Input: [["date","nb_inspections","nb_rejets"], ["2026-01-01","150","8"]]
     * Output: [["date" => "2026-01-01", "nb_inspections" => "150", "nb_rejets" => "8"]]
     */
    private function convertSheetValues(array $values): array
    {
        if (count($values) < 2) {
            return [];
        }

        $headers = array_map(fn ($h) => trim(strtolower(str_replace(' ', '_', $h))), $values[0]);
        $rows = [];

        for ($i = 1; $i < count($values); $i++) {
            $row = [];
            foreach ($headers as $j => $header) {
                $row[$header] = $values[$i][$j] ?? null;
            }
            $rows[] = $row;
        }

        return $rows;
    }
}
