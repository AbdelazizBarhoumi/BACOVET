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
