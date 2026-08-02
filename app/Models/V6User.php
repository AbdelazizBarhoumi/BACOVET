<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;

class V6User extends Authenticatable
{
    protected $table = 'v6_users';

    protected $fillable = ['email', 'name', 'role', 'password', 'has_password'];

    protected $hidden = ['password'];

    protected $casts = ['has_password' => 'boolean'];

    protected $attributes = ['remember_token' => null];

    // role is a plain string, but code does ->load('role') and ->role->slug
    public function role(): HasOne
    {
        $instance = new V6User;

        return new FakeRoleRelation($instance->newQuery(), $this, 'id', 'id', 'role');
    }
}
