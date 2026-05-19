<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CompanyWholesaleProductsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_company_can_paginate_wholesale_products(): void
    {
        $user = User::factory()->create([
            'role' => 'company',
            'company_verification_status' => 'approved',
        ]);
        Company::factory()->create([
            'user_id' => $user->id,
            'verification_status' => 'approved',
        ]);

        foreach (range(1, 15) as $i) {
            Product::factory()->create([
                'user_id' => $user->id,
                'is_wholesale' => true,
                'wholesale_price' => 100 + $i,
                'min_quantity' => 3,
                'status' => 'published',
                'title' => "Wholesale Product {$i}",
            ]);
        }

        $token = $this->issueApiToken($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/company/wholesale/products?page=2&per_page=10')
            ->assertOk()
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonPath('meta.total', 15)
            ->assertJsonCount(5, 'data');
    }

    public function test_company_wholesale_products_include_reservation_progress(): void
    {
        $user = User::factory()->create([
            'role' => 'company',
            'company_verification_status' => 'approved',
        ]);
        Company::factory()->create([
            'user_id' => $user->id,
            'verification_status' => 'approved',
        ]);

        Product::factory()->create([
            'user_id' => $user->id,
            'is_wholesale' => true,
            'wholesale_price' => 50,
            'min_quantity' => 5,
            'status' => 'published',
        ]);

        $token = $this->issueApiToken($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/company/wholesale/products')
            ->assertOk()
            ->assertJsonPath('data.0.reserved_seats', 0)
            ->assertJsonPath('data.0.remaining_seats', 5)
            ->assertJsonPath('data.0.progress_percentage', 0);
    }

    public function test_company_can_filter_wholesale_products_by_search_and_status(): void
    {
        $user = User::factory()->create([
            'role' => 'company',
            'company_verification_status' => 'approved',
        ]);
        Company::factory()->create([
            'user_id' => $user->id,
            'verification_status' => 'approved',
        ]);

        Product::factory()->create([
            'user_id' => $user->id,
            'is_wholesale' => true,
            'title' => 'Unique Alpha Deal',
            'status' => 'published',
        ]);
        Product::factory()->create([
            'user_id' => $user->id,
            'is_wholesale' => true,
            'title' => 'Draft Beta Item',
            'status' => 'pending_review',
        ]);

        $token = $this->issueApiToken($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/company/wholesale/products?search=Alpha&status=published')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.title', 'Unique Alpha Deal');
    }

    private function issueApiToken(User $user): string
    {
        $plainTextToken = 'company-wholesale-test-token-'.$user->id;
        $user->forceFill([
            'api_token' => hash('sha256', $plainTextToken),
            'api_token_expires_at' => now()->addHour(),
        ])->save();

        return $plainTextToken;
    }
}
