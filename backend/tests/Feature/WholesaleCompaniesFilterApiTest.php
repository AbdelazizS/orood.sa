<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Company;
use App\Models\Product;
use App\Models\Region;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WholesaleCompaniesFilterApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_wholesale_companies_filter_by_city_id(): void
    {
        $regionA = Region::factory()->create(['name' => 'Region A', 'name_ar' => 'منطقة أ']);
        $regionB = Region::factory()->create(['name' => 'Region B', 'name_ar' => 'منطقة ب']);
        $cityA = City::factory()->create(['region_id' => $regionA->id, 'name' => 'City A', 'name_ar' => 'مدينة أ']);
        $cityB = City::factory()->create(['region_id' => $regionB->id, 'name' => 'City B', 'name_ar' => 'مدينة ب']);

        [$userA, $companyA] = $this->createApprovedWholesaleCompany($cityA->id, $regionA->id, 'Company A');
        $this->createApprovedWholesaleCompany($cityB->id, $regionB->id, 'Company B');

        $this->getJson('/api/v1/wholesale/companies?city_id='.$cityA->id)
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $companyA->id);

        $this->getJson('/api/v1/wholesale/companies?city_id='.$cityB->id)
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.name', 'Company B');

        unset($userA);
    }

    public function test_wholesale_companies_auto_heal_company_city_from_user_profile(): void
    {
        $regionA = Region::factory()->create(['name' => 'Makkah Region', 'name_ar' => 'منطقة مكة']);
        $regionB = Region::factory()->create(['name' => 'Riyadh Region', 'name_ar' => 'منطقة الرياض']);
        $cityMakkah = City::factory()->create(['region_id' => $regionA->id, 'name' => 'Makkah City', 'name_ar' => 'مكة المكرمة']);
        $cityRiyadh = City::factory()->create(['region_id' => $regionB->id, 'name' => 'Riyadh', 'name_ar' => 'الرياض']);

        $user = User::factory()->create([
            'role' => 'company',
            'company_verification_status' => 'approved',
            'city_id' => $cityRiyadh->id,
        ]);
        $company = Company::factory()->create([
            'user_id' => $user->id,
            'name' => 'TpLimited',
            'city_id' => $cityMakkah->id,
            'region_id' => $regionA->id,
            'verification_status' => 'approved',
        ]);
        $this->seedWholesaleProduct($user->id);

        $this->getJson('/api/v1/wholesale/companies')
            ->assertOk()
            ->assertJsonPath('data.0.city', 'الرياض');

        $company->refresh();
        $this->assertSame($cityRiyadh->id, $company->city_id);
        $this->assertSame($regionB->id, $company->region_id);
    }

    public function test_profile_city_update_syncs_company_location(): void
    {
        $regionA = Region::factory()->create();
        $regionB = Region::factory()->create();
        $cityA = City::factory()->create(['region_id' => $regionA->id]);
        $cityB = City::factory()->create(['region_id' => $regionB->id]);

        $user = User::factory()->create([
            'role' => 'company',
            'company_verification_status' => 'approved',
            'city_id' => $cityA->id,
        ]);
        $company = Company::factory()->create([
            'user_id' => $user->id,
            'city_id' => $cityA->id,
            'region_id' => $regionA->id,
            'verification_status' => 'approved',
        ]);
        $this->seedWholesaleProduct($user->id);

        $token = $this->issueApiToken($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson('/api/v1/profile', ['city_id' => $cityB->id])
            ->assertOk();

        $company->refresh();
        $this->assertSame($cityB->id, $company->city_id);
        $this->assertSame($regionB->id, $company->region_id);

        $this->getJson('/api/v1/wholesale/companies?city_id='.$cityB->id)
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $company->id);

        $this->getJson('/api/v1/wholesale/companies?city_id='.$cityA->id)
            ->assertOk()
            ->assertJsonPath('meta.total', 0);
    }

    /**
     * @return array{0: User, 1: Company}
     */
    private function createApprovedWholesaleCompany(int $cityId, int $regionId, string $companyName): array
    {
        $user = User::factory()->create([
            'role' => 'company',
            'company_verification_status' => 'approved',
            'city_id' => $cityId,
        ]);
        $company = Company::factory()->create([
            'user_id' => $user->id,
            'name' => $companyName,
            'city_id' => $cityId,
            'region_id' => $regionId,
            'verification_status' => 'approved',
        ]);
        $this->seedWholesaleProduct($user->id);

        return [$user, $company];
    }

    private function seedWholesaleProduct(int $userId): void
    {
        Product::factory()->create([
            'user_id' => $userId,
            'is_wholesale' => true,
            'wholesale_price' => 120,
            'min_quantity' => 3,
            'status' => 'published',
            'moderation_status' => 'approved',
        ]);
    }

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'wholesale-companies-test-'.$user->id;
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }
}
