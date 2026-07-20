<?php

namespace App\Services;

use App\Models\DataMapping;
use App\Models\DataMappingAuditLog;

class DataMappingAuditor
{
    public const AUDITABLE_FIELDS = [
        'kpi', 'name', 'variable', 'endpoint', 'variable_type', 'variable_key',
        'is_filtered', 'filter_key', 'filter_value', 'has_function', 'fn',
        'modules', 'formula', 'highlight_color', 'cible_operator', 'cible_value',
        'cible_is_percentage', 'refresh_frequency', 'chart_config', 'extra_filters',
        'user_id',
    ];

    private ?int $userId;

    public function __construct(?int $userId)
    {
        $this->userId = $userId;
    }

    public function recordCreated(DataMapping $mapping): void
    {
        $fields = $mapping->only(self::AUDITABLE_FIELDS);

        foreach ($fields as $field => $value) {
            if ($value === null || $value === '' || $value === false) {
                continue;
            }

            DataMappingAuditLog::create([
                'user_id' => $this->userId,
                'data_mapping_id' => $mapping->id,
                'kpi' => $mapping->kpi,
                'action' => 'created',
                'field' => $field,
                'old_value' => null,
                'new_value' => $this->encodeValue($value),
            ]);
        }
    }

    public function recordDeleted(DataMapping $mapping): void
    {
        $fields = $mapping->only(self::AUDITABLE_FIELDS);

        foreach ($fields as $field => $value) {
            if ($value === null || $value === '' || $value === false) {
                continue;
            }

            DataMappingAuditLog::create([
                'user_id' => $this->userId,
                'data_mapping_id' => null,
                'kpi' => $mapping->kpi,
                'action' => 'deleted',
                'field' => $field,
                'old_value' => $this->encodeValue($value),
                'new_value' => null,
            ]);
        }
    }

    public function recordUpdated(DataMapping $mapping, array $oldValues, array $newValues): void
    {
        foreach ($newValues as $field => $newValue) {
            $oldValue = $oldValues[$field] ?? null;

            if ($oldValue == $newValue) {
                continue;
            }

            DataMappingAuditLog::create([
                'user_id' => $this->userId,
                'data_mapping_id' => $mapping->id,
                'kpi' => $mapping->kpi,
                'action' => 'updated',
                'field' => $field,
                'old_value' => $this->encodeValue($oldValue),
                'new_value' => $this->encodeValue($newValue),
            ]);
        }
    }

    private function encodeValue(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if (is_array($value)) {
            return json_encode($value);
        }

        return (string) $value;
    }
}
