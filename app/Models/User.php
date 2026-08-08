<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'matricule',
        'email',
        'password',
        'role_id',
        'is_active',
        'must_change_password',
        'last_login_ip',
        'last_login_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function hasRole(string|array $slugs): bool
    {
        $slugs = (array) $slugs;

        return in_array($this->role->slug, $slugs);
    }

    public function canAccess(string $page): bool
    {
        return in_array($this->role->slug, self::PAGE_ROLES[$page] ?? []);
    }

    public const PAGE_ROLES = [
        'admin' => ['it'],
        'quality' => ['it', 'direction', 'resp_production', 'resp_qualite', 'methodes'],
        'production' => ['it', 'direction', 'resp_production', 'chef_atelier', 'methodes', 'planning_coupe'],
        'logistics' => ['it', 'direction', 'methodes', 'planning_coupe'],
        'methods' => ['it', 'direction', 'methodes'],
        'development' => ['it', 'direction', 'methodes'],
    ];

    public const DEFAULT_REDIRECT = [
        'it' => '/',
        'direction' => '/',
        'resp_production' => '/',
        'chef_atelier' => '/',
        'resp_qualite' => '/',
        'methodes' => '/',
        'planning_coupe' => '/',
    ];
}
