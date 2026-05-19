<?php

namespace Tests\Feature;

use App\Models\ContactInquiry;
use App\Services\AdminSettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ContactPageApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_contact_page_returns_localized_settings(): void
    {
        $settings = app(AdminSettingsService::class);
        $settings->updateContactPage([
            'hero_title_en' => 'Reach us',
            'hero_subtitle_en' => 'We reply within 24h',
        ]);

        $this->getJson('/api/v1/contact/page', ['Accept-Language' => 'en'])
            ->assertOk()
            ->assertJsonPath('data.hero_title', 'Reach us')
            ->assertJsonPath('data.form_enabled', true)
            ->assertJsonStructure([
                'data' => [
                    'hero_kicker',
                    'hero_title',
                    'hero_subtitle',
                    'hours',
                    'response_time',
                    'trust_indicators',
                    'channels',
                    'form_fields',
                    'inquiry_types',
                    'faq',
                    'trust_blocks',
                    'success_message',
                ],
            ]);
    }

    public function test_channels_include_href_for_email(): void
    {
        $settings = app(AdminSettingsService::class);
        $settings->updateContactPage([
            'channels' => [
                [
                    'id' => 'email-test',
                    'type' => 'email',
                    'label_ar' => 'بريد',
                    'label_en' => 'Email',
                    'value' => 'support@orood.sa',
                    'visible' => true,
                    'sort_order' => 1,
                ],
            ],
        ]);

        $this->getJson('/api/v1/contact/page', ['Accept-Language' => 'en'])
            ->assertOk()
            ->assertJsonPath('data.channels.0.href', 'mailto:support@orood.sa');
    }

    public function test_contact_form_submission_creates_inquiry(): void
    {
        $this->postJson('/api/v1/contact', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'message' => 'Hello support team',
            'inquiry_type' => 'technical',
        ])
            ->assertCreated()
            ->assertJsonPath('data.id', fn ($id) => $id > 0);

        $this->assertDatabaseHas('contact_inquiries', [
            'email' => 'test@example.com',
            'inquiry_type' => 'technical',
            'status' => ContactInquiry::STATUS_NEW,
        ]);
    }

    public function test_contact_form_rejects_invalid_phone(): void
    {
        $this->postJson('/api/v1/contact', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'phone' => '123',
            'message' => 'Hello support team',
            'inquiry_type' => 'technical',
        ])->assertStatus(422);
    }

    public function test_contact_form_accepts_attachment(): void
    {
        Storage::fake('public');

        $file = UploadedFile::fake()->create('proof.pdf', 100, 'application/pdf');

        $this->post('/api/v1/contact', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'message' => 'Hello with attachment',
            'inquiry_type' => 'order',
            'attachments' => $file,
        ], ['Accept' => 'application/json'])
            ->assertCreated();

        $inquiry = ContactInquiry::query()->latest('id')->first();
        $this->assertNotNull($inquiry);
        $this->assertIsArray($inquiry->form_data['attachments'] ?? null);
    }

    public function test_contact_form_rejects_missing_required_fields(): void
    {
        $this->postJson('/api/v1/contact', [
            'name' => 'Test User',
        ])->assertStatus(422);
    }
}
