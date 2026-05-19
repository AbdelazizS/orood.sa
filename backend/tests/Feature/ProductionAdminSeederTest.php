<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\ProductionAdminSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class ProductionAdminSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_skips_when_env_not_set(): void
    {
        putenv('ADMIN_EMAIL');
        putenv('ADMIN_PASSWORD');
        unset($_ENV['ADMIN_EMAIL'], $_ENV['ADMIN_PASSWORD']);

        $this->seed(ProductionAdminSeeder::class);

        $this->assertSame(0, User::query()->count());
    }

    public function test_creates_super_admin_when_env_set(): void
    {
        $this->app['config']->set('app.env', 'testing');

        putenv('ADMIN_EMAIL=deploy@arooth.com');
        putenv('ADMIN_PASSWORD=SecurePass1!');
        $_ENV['ADMIN_EMAIL'] = 'deploy@arooth.com';
        $_ENV['ADMIN_PASSWORD'] = 'SecurePass1!';

        $this->seed(ProductionAdminSeeder::class);

        $user = User::query()->where('email', 'deploy@arooth.com')->first();
        $this->assertNotNull($user);
        $this->assertSame('super_admin', $user->role);

        putenv('ADMIN_EMAIL');
        putenv('ADMIN_PASSWORD');
        unset($_ENV['ADMIN_EMAIL'], $_ENV['ADMIN_PASSWORD']);
    }

    public function test_admin_create_command_accepts_arooth_com(): void
    {
        $exit = Artisan::call('admin:create', [
            '--email' => 'cmd@arooth.com',
            '--password' => 'SecurePass1!',
            '--name' => 'Cmd Admin',
        ]);

        $this->assertSame(0, $exit);
        $this->assertDatabaseHas('users', ['email' => 'cmd@arooth.com', 'role' => 'super_admin']);
    }
}
