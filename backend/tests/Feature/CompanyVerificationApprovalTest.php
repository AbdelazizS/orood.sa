<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Company;
use App\Models\DocumentVerification;
use App\Models\Region;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CompanyVerificationApprovalTest extends TestCase
{
    use RefreshDatabase;

    public function test_company_license_document_approval_sets_approved_status_for_wholesale(): void
    {
        Storage::fake('public');
        $region = Region::factory()->create();
        $city = City::factory()->create(['region_id' => $region->id]);
        $member = User::factory()->create(['role' => 'seller']);
        $admin = User::factory()->create(['role' => 'admin']);

        $file = UploadedFile::fake()->create('license.pdf', 120, 'application/pdf');
        $memberToken = $this->issueApiToken($member);

        $this->withHeader('Authorization', "Bearer {$memberToken}")
            ->post('/api/v1/account/verify-document', [
                'type' => DocumentVerification::TYPE_COMPANY_LICENSE,
                'document' => $file,
                'company_name' => 'AQ limited',
                'company_city' => (string) $city->id,
                'company_product_type' => 'electronics',
            ])
            ->assertCreated();

        $adminToken = $this->issueApiToken($admin);
        $dvId = DocumentVerification::query()->where('user_id', $member->id)->value('id');

        $this->withHeader('Authorization', "Bearer {$adminToken}")
            ->postJson("/api/v1/admin/verifications/{$dvId}/approve")
            ->assertOk();

        $member->refresh();
        $company = Company::query()->where('user_id', $member->id)->first();

        $this->assertNotNull($company);
        $this->assertSame('approved', $company->verification_status);
        $this->assertSame('approved', $member->company_verification_status);
        $this->assertSame('company', $member->role);
        $this->assertSame('company_verified', $member->verification_level);
    }

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'company-verification-test-'.$user->id;
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }
}
