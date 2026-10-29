<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** رقم الحساب: every account has a unique 6-digit number; admins find the owner by it. */
class AccountNumberTest extends TestCase
{
    use RefreshDatabase;

    private function as(User $user)
    {
        $this->app['auth']->forgetGuards();
        $plain = 'test-token-'.$user->id.'-'.uniqid();
        $user->forceFill(['api_token' => hash('sha256', $plain), 'api_token_expires_at' => now()->addHour()])->save();

        return $this->withHeader('Authorization', 'Bearer '.$plain);
    }

    public function test_every_new_account_gets_a_unique_six_digit_number(): void
    {
        $users = User::factory()->count(30)->create();

        $numbers = $users->pluck('account_number');
        $this->assertTrue($numbers->every(fn ($n) => preg_match('/^[1-9]\d{5}$/', (string) $n) === 1));
        $this->assertCount(30, $numbers->unique());
    }

    public function test_admin_finds_the_owner_by_account_number(): void
    {
        $admin = User::factory()->create(['role' => 'super_admin']);
        $owner = User::factory()->create(['name' => 'سامي الزهراني']);
        User::factory()->count(5)->create();

        foreach ([$owner->account_number, '#'.$owner->account_number] as $search) {
            $rows = $this->as($admin)->getJson('/api/v1/admin/users?search='.urlencode($search))->assertOk()->json('data');
            $this->assertSame([$owner->id], array_column($rows, 'id'));
            $this->assertSame($owner->account_number, $rows[0]['account_number']);
        }

        $this->as($admin)->getJson('/api/v1/admin/users/'.$owner->id)
            ->assertOk()->assertJsonPath('data.account_number', $owner->account_number);
    }

    public function test_account_number_shows_on_my_account_and_public_profile(): void
    {
        $user = User::factory()->create(['role' => 'seller', 'username' => 'sami-z']);

        $this->as($user)->getJson('/api/v1/auth/user')->assertOk()->assertJsonPath('user.account_number', $user->account_number);
        $this->app['auth']->forgetGuards();
        $this->withoutHeader('Authorization')->getJson('/api/v1/profile/sami-z')
            ->assertOk()->assertJsonPath('user.account_number', $user->account_number);
    }
}
