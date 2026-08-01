<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;

class V6User extends Authenticatable
{
    protected $table = 'v6_users';

    protected $fillable = ['email', 'name', 'role', 'password', 'has_password'];

    protected $hidden = ['password'];

    protected $casts = ['has_password' => 'boolean'];

    protected $attributes = ['remember_token' => null];
}
