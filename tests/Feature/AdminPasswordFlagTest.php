<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminPasswordFlagTest extends TestCase
{
    use RefreshDatabase;

    private function itUser(): User
    {
        $it = Role::updateOrCreate(['slug' => 'it'], ['name' => 'IT', 'slug' => 'it']);
        Role::updateOrCreate(['slug' => 'resp_production'], ['name' => 'Resp Prod', 'slug' => 'resp_production']);

        return User::factory()->create(['role_id' => $it->id, 'is_active' => true]);
    }

    public function test_admin_resetting_other_user_password_sets_flag(): void
    {
        $admin = $this->itUser();
        $target = User::factory()->create([
            'role_id' => $admin->role_id,
            'is_active' => true,
            'must_change_password' => false,
        ]);

        $res = $this->actingAs($admin)->putJson("/admin/users/{$target->id}", [
            'password' => 'new-secret-123',
        ]);

        $res->assertOk();
        $target->refresh();
        $this->assertTrue($target->must_change_password);
        $this->assertTrue(Hash::check('new-secret-123', $target->password));
    }

    public function test_admin_update_without_password_leaves_flag_alone(): void
    {
        $admin = $this->itUser();
        $target = User::factory()->create([
            'role_id' => $admin->role_id,
            'is_active' => true,
            'must_change_password' => false,
        ]);

        $res = $this->actingAs($admin)->putJson("/admin/users/{$target->id}", [
            'name' => 'Renamed User',
        ]);

        $res->assertOk();
        $this->assertFalse($target->refresh()->must_change_password);
    }

    public function test_admin_changing_own_password_does_not_set_flag(): void
    {
        $admin = $this->itUser();

        $res = $this->actingAs($admin)->putJson("/admin/users/{$admin->id}", [
            'password' => 'my-own-new-pw',
        ]);

        $res->assertOk();
        $this->assertFalse($admin->refresh()->must_change_password);
    }
}
