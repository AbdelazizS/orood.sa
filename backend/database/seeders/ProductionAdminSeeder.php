<?php

namespace Database\Seeders;

use App\Models\User;
use App\Rules\AroothComEmail;
use App\Services\PasswordPolicyService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class ProductionAdminSeeder extends Seeder
{
    public function run(): void
    {
        $email = strtolower(trim((string) env('ADMIN_EMAIL', '')));
        $password = (string) env('ADMIN_PASSWORD', '');

        if ($email === '' || $password === '') {
            $this->command?->warn(
                'ProductionAdminSeeder skipped: set ADMIN_EMAIL and ADMIN_PASSWORD in .env, or run php artisan admin:create'
            );

            return;
        }

        if (User::query()->where('email', $email)->exists()) {
            $this->command?->info("Production admin already exists: {$email}");

            return;
        }

        $validator = Validator::make(
            [
                'email' => $email,
                'password' => $password,
                'password_confirmation' => $password,
                'name' => env('ADMIN_NAME', 'Platform Admin'),
            ],
            [
                'email' => ['required', 'email', 'max:255', new AroothComEmail],
                'password' => PasswordPolicyService::rulesForField('password'),
                'name' => ['required', 'string', 'max:255'],
            ]
        );

        if ($validator->fails()) {
            throw ValidationException::withMessages($validator->errors()->toArray());
        }

        User::query()->create([
            'name' => $validator->validated()['name'],
            'email' => $email,
            'password' => bcrypt($password),
            'role' => 'super_admin',
            'phone' => env('ADMIN_PHONE'),
            'email_verified_at' => now(),
        ]);

        $this->command?->info("Production super_admin created: {$email}");
    }
}
