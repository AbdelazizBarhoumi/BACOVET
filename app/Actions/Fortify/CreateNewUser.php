<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            ...$this->profileRules(),
            'password' => $this->passwordRules(),
        ])->validate();

        return User::create([
            'name' => $input['name'],
            'matricule' => $input['matricule'] ?? 'REG-'.strtoupper(bin2hex(random_bytes(3))),
            'email' => $input['email'],
            'password' => $input['password'],
            'role_id' => $input['role_id'] ?? \App\Models\Role::where('slug', 'direction')->first()?->id ?? 2,
            'is_active' => true,
        ]);
    }
}
