<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Rules\AroothComEmail;
use App\Services\PasswordPolicyService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

class AdminCreateCommand extends Command
{
    protected $signature = 'admin:create
                            {--email= : Admin email (@arooth.com only)}
                            {--name= : Display name}
                            {--role=super_admin : super_admin, admin, manager, or employee}
                            {--password= : Password (prompted if omitted)}';

    protected $description = 'Create a platform staff account (@arooth.com, strong password)';

    public function handle(): int
    {
        $email = strtolower(trim((string) ($this->option('email') ?: $this->ask('Email (@arooth.com)'))));
        $name = (string) ($this->option('name') ?: $this->ask('Full name', 'Platform Admin'));
        $role = (string) $this->option('role');
        $allowedRoles = ['super_admin', 'admin', 'manager', 'employee'];

        if (! in_array($role, $allowedRoles, true)) {
            $this->error('Invalid role. Use: '.implode(', ', $allowedRoles));

            return self::FAILURE;
        }

        if (User::query()->where('email', $email)->exists()) {
            $this->error("User already exists: {$email}");

            return self::FAILURE;
        }

        $password = (string) ($this->option('password') ?: $this->secret('Password'));
        $confirm = $this->option('password') ? $password : $this->secret('Confirm password');

        $validator = Validator::make(
            [
                'email' => $email,
                'password' => $password,
                'password_confirmation' => $confirm,
                'name' => $name,
            ],
            [
                'email' => ['required', 'email', 'max:255', new AroothComEmail],
                'password' => PasswordPolicyService::rulesForField('password'),
                'name' => ['required', 'string', 'max:255'],
            ]
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $this->error($message);
            }

            return self::FAILURE;
        }

        User::query()->create([
            'name' => $name,
            'email' => $email,
            'password' => bcrypt($password),
            'role' => $role,
            'email_verified_at' => now(),
        ]);

        $this->info("Created {$role}: {$email}");

        return self::SUCCESS;
    }
}
