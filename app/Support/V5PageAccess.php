<?php

namespace App\Support;

use App\Models\BuilderPageV5;
use App\Models\V5User;
use Illuminate\Support\Facades\Auth;

class V5PageAccess
{
    public const ADMIN_ROLES = ['it', 'direction'];

    /**
     * Resolve the V5 identity of the currently authenticated main user.
     *
     * V5 pages/groups still reference v5_users rows, so the current web-guard
     * user is bridged to its v5_users record by email.
     */
    public static function resolveV5User(): ?V5User
    {
        $user = Auth::user();

        if (! $user) {
            return null;
        }

        $email = $user->email ?? $user->getAttribute('email');

        if (! $email) {
            return null;
        }

        $role = $user->role?->slug;

        return V5User::firstOrCreate(
            ['email' => $email],
            [
                'name' => $user->name ?? $email,
                'role' => in_array($role, self::ADMIN_ROLES, true) ? $role : 'viewer',
                'password' => '',
                'has_password' => false,
            ],
        );
    }

    /**
     * Resolve the access level for a user on a page.
     *
     * @return 'view'|'edit'|null null means no access at all.
     */
    public static function level(?BuilderPageV5 $page, ?V5User $user): ?string
    {
        if (! $page || ! $user) {
            return null;
        }

        if (in_array($user->role, self::ADMIN_ROLES, true)) {
            return 'edit';
        }

        if ($page->owner_user_id === $user->id) {
            return 'edit';
        }

        $row = $page->accessRows->firstWhere('user_id', $user->id);

        return $row?->mode;
    }

    public static function canView(?BuilderPageV5 $page, ?V5User $user): bool
    {
        return self::level($page, $user) !== null;
    }

    public static function canEdit(?BuilderPageV5 $page, ?V5User $user): bool
    {
        return self::level($page, $user) === 'edit';
    }

    public static function isAdmin(?V5User $user): bool
    {
        return $user !== null && in_array($user->role, self::ADMIN_ROLES, true);
    }

    public static function canManage(?BuilderPageV5 $page, ?V5User $user): bool
    {
        if (! $page || ! $user) {
            return false;
        }

        return self::isAdmin($user) || $page->owner_user_id === $user->id;
    }
}
