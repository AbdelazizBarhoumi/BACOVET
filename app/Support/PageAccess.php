<?php

namespace App\Support;

use App\Models\BuilderPage;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class PageAccess
{
    public const ADMIN_ROLES = ['it', 'direction'];

    /**
     * Resolve the currently authenticated main user.
     *
     * Pages/groups now reference the main users table directly, so no
     * separate identity bridge is needed anymore.
     */
    public static function resolveUser(): ?User
    {
        return Auth::user();
    }

    /**
     * Resolve the access level for a user on a page.
     *
     * @return 'view'|'edit'|null null means no access at all.
     */
    public static function level(?BuilderPage $page, ?User $user): ?string
    {
        if (! $page || ! $user) {
            return null;
        }

        if (self::isAdmin($user)) {
            return 'edit';
        }

        if ($page->owner_user_id === $user->id) {
            return 'edit';
        }

        $row = $page->accessRows->firstWhere('user_id', $user->id);

        return $row?->mode;
    }

    public static function canView(?BuilderPage $page, ?User $user): bool
    {
        return self::level($page, $user) !== null;
    }

    public static function canEdit(?BuilderPage $page, ?User $user): bool
    {
        return self::level($page, $user) === 'edit';
    }

    public static function isAdmin(?User $user): bool
    {
        return $user !== null && in_array($user->role?->slug, self::ADMIN_ROLES, true);
    }

    public static function canManage(?BuilderPage $page, ?User $user): bool
    {
        if (! $page || ! $user) {
            return false;
        }

        return self::isAdmin($user) || $page->owner_user_id === $user->id;
    }
}