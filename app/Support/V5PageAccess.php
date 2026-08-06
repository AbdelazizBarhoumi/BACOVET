<?php

namespace App\Support;

use App\Models\BuilderPageV5;
use App\Models\V5User;

class V5PageAccess
{
    public const ADMIN_ROLES = ['it', 'direction'];

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
