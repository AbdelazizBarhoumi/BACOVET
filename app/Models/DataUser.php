<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;

class DataUser extends Authenticatable
{
    protected $table = 'data_users';
    protected $fillable = ['email', 'name', 'role', 'password', 'has_password'];
    protected $hidden = ['password'];
    protected $casts = ['has_password' => 'boolean'];

    // role is a plain string, but code does ->load('role') and ->role->slug
    public function role(): HasOne
    {
        $instance = new DataUser;
        return new FakeRoleRelation($instance->newQuery(), $this, 'id', 'id', 'role');
    }
}

/**
 * Fake HasOne that resolves 'role' string column as {slug, name}.
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
