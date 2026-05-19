<?php

namespace Database\Seeders;

use App\Models\AppSetting;
use App\Services\AdminSettingsService;
use Illuminate\Database\Seeder;

/**
 * Seeds public contact page CMS (app_settings.content.contact_page).
 *
 * Idempotent: skips if settings already exist (e.g. after admin saved once).
 * On first production deploy: php artisan db:seed --class=ContactPageSeeder
 *
 * Set in .env before seeding:
 *   CONTACT_SUPPORT_EMAIL=support@yourdomain.sa
 *   CONTACT_NOTIFY_EMAILS=support@yourdomain.sa,ops@yourdomain.sa
 */
class ContactPageSeeder extends Seeder
{
    public function run(): void
    {
        $key = AdminSettingsService::KEY_CONTACT_PAGE;
        $existing = AppSetting::getValue($key, null);

        if (is_array($existing) && $existing !== []) {
            $this->command?->info('Contact page settings already exist in app_settings; skipping ContactPageSeeder.');

            return;
        }

        $payload = app(AdminSettingsService::class)->defaultContactPage();

        AppSetting::putValue($key, $payload);

        $email = AdminSettingsService::resolveContactSupportEmail();
        $this->command?->info('Contact page settings seeded.');
        if ($email === '') {
            $this->command?->warn('No CONTACT_SUPPORT_EMAIL set — add support email in Admin → Settings → Contact before go-live.');
        } else {
            $this->command?->info("Support email channel: {$email}");
        }
    }
}
