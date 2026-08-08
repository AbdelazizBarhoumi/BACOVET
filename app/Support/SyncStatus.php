<?php

namespace App\Support;

use App\Models\EndpointDataset;
use Illuminate\Support\Facades\Cache;

/**
 * Single source of truth for the sync state shown by the LIVE SYNC pill and
 * the admin health panel.
 *
 * The worker has two phases that write different stores:
 *  - the <b>registry</b> refresh (once/day) writes data.json + endpoints-refresh.json
 *  - the <b>datasets</b> sync (on the configured interval) writes endpoint_datasets
 *
 * Everything here returns one canonical payload so the badge and the panel
 * can never disagree about "last run" / "last success" anymore.
 */
class SyncStatus
{
    /**
     * Canonical, merged sync status.
     *
     * @return array<string, mixed>
     */
    public static function payload(): array
    {
        return [
            'last_success_at' => self::lastSuccessAt(),
            'last_run_at' => self::lastRunAt(),
            'registry_last_run_at' => self::registryMeta('last_run_at'),
            'datasets_last_run_at' => self::datasetsLastRunAt(),
            'ok_count' => self::countBy('ok'),
            'error_count' => self::countBy('error'),
            'retry_pending' => (bool) Cache::get('endpoints:refresh:retry_pending', false),
            'server_now' => now()->toIso8601String(),
        ];
    }

    /**
     * Most recent moment at which the system actually succeeded somewhere
     * (a datasets row with an ok status, or a registry refresh with >0 ok).
     */
    private static function lastSuccessAt(): ?string
    {
        $datasetsOk = EndpointDataset::query()
            ->where('last_status', 'ok')
            ->orderByDesc('last_synced_at')
            ->value('last_synced_at');

        $registryMeta = self::registryMeta();
        $registryOk = is_array($registryMeta) && (int) ($registryMeta['ok'] ?? 0) > 0
            ? ($registryMeta['last_run_at'] ?? null)
            : null;

        $best = self::latestTimestamp([
            $datasetsOk,
            $registryOk,
        ]);

        return $best !== null ? (new \DateTimeImmutable('@'.$best))->format(\DateTimeInterface::ATOM) : null;
    }

    /**
     * Most recent moment at which any phase ran (success or failure).
     */
    private static function lastRunAt(): ?string
    {
        $best = self::latestTimestamp([
            EndpointDataset::query()->orderByDesc('last_synced_at')->value('last_synced_at'),
            self::registryMeta('last_run_at'),
        ]);

        return $best !== null ? (new \DateTimeImmutable('@'.$best))->format(\DateTimeInterface::ATOM) : null;
    }

    /**
     * @return array<string, mixed>|mixed
     */
    private static function registryMeta(?string $key = null): mixed
    {
        $path = storage_path((string) config('novacity.refresh_meta', 'app/private/endpoints-refresh.json'));

        if (! file_exists($path)) {
            return null;
        }

        $raw = file_get_contents($path);

        if ($raw === false) {
            return null;
        }

        $decoded = json_decode($raw, true);

        if (! is_array($decoded)) {
            return null;
        }

        return $key === null ? $decoded : ($decoded[$key] ?? null);
    }

    private static function datasetsLastRunAt(): string
    {
        $value = EndpointDataset::query()->orderByDesc('last_synced_at')->value('last_synced_at');

        return $value ? $value->toIso8601String() : '';
    }

    private static function countBy(string $status): int
    {
        return EndpointDataset::query()->where('last_status', $status)->count();
    }

    /**
     * Return the newest timestamp (as int) from the given list. Mixed values
     * are tolerated: Carbon, numeric timestamps or ISO strings.
     */
    private static function latestTimestamp(array $values): ?int
    {
        $latest = null;

        foreach ($values as $value) {
            $ts = self::toTimestamp($value);

            if ($ts === null) {
                continue;
            }

            if ($latest === null || $ts > $latest) {
                $latest = $ts;
            }
        }

        return $latest;
    }

    private static function toTimestamp(mixed $value): ?int
    {
        if ($value === null || $value === '' || $value === false) {
            return null;
        }

        if ($value instanceof \DateTimeInterface) {
            return $value->getTimestamp();
        }

        if (is_numeric($value)) {
            return (int) $value;
        }

        if (is_string($value)) {
            $ts = strtotime($value);

            return $ts === false ? null : $ts;
        }

        return null;
    }
}