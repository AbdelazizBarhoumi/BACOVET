<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Fake HasOne that resolves a 'role' string column as {slug, name}.
 * Handles ->load('role'), ->role->slug, and ->role?->slug without DB queries.
 */
class FakeRoleRelation extends HasOne
{
    public function addEagerConstraints(array $models): void
    {
        // No DB query needed
    }

    public function initRelation(array $models, $relation): array
    {
        return $models;
    }

    public function match(array $models, $results, $relation): array
    {
        foreach ($models as $model) {
            $model->setRelation($relation, (object) ['slug' => $model->role, 'name' => $model->role]);
        }

        return $models;
    }

    public function getResults()
    {
        return (object) ['slug' => $this->parent->role, 'name' => $this->parent->role];
    }

    public function getForeignKey(): string
    {
        return 'id';
    }

    public function getQualifiedForeignKeyName(): string
    {
        return 'id';
    }
}
