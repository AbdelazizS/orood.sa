<?php

namespace App\Services\Support;

use App\Models\HelpBlock;
use App\Services\AdminSettingsService;
use App\Models\HelpCategory;
use App\Models\SupportContact;
use App\Models\SupportSetting;
use Illuminate\Support\Collection;

class SupportCmsService
{
    public function settings(): SupportSetting
    {
        return SupportSetting::query()->firstOrCreate([], []);
    }

    public function updateSettings(array $data, ?int $userId = null): SupportSetting
    {
        $row = $this->settings();
        $row->fill($data);
        $row->updated_by = $userId;
        $row->save();

        return $row;
    }

    /**
     * @return array<string, mixed>
     */
    public function publicHelpPage(string $pageKey = 'dashboard_help', ?string $locale = null): array
    {
        $locale = $locale === 'en' ? 'en' : 'ar';

        $blocks = HelpBlock::query()
            ->where('page_key', $pageKey)
            ->where('visible', true)
            ->orderBy('sort_order')
            ->get()
            ->map(fn (HelpBlock $b) => $this->serializeBlock($b, $locale));

        $settings = $this->settings();
        $supportEmail = $this->sanitizeEmail($settings->support_email)
            ?: AdminSettingsService::resolveContactSupportEmail();

        $contacts = SupportContact::query()
            ->where('visible', true)
            ->orderBy('sort_order')
            ->get()
            ->filter(fn (SupportContact $c) => $c->value && ! $this->isPlaceholderEmail($c->value))
            ->map(fn (SupportContact $c) => [
                'type' => $c->type,
                'label' => $locale === 'en' && $c->label_en ? $c->label_en : $c->label_ar,
                'value' => $c->value,
            ])
            ->values();

        $categories = HelpCategory::query()
            ->where('visible', true)
            ->orderBy('sort_order')
            ->with(['articles' => fn ($q) => $q->where('published', true)->orderBy('sort_order')])
            ->get()
            ->map(fn (HelpCategory $cat) => [
                'slug' => $cat->slug,
                'title' => $locale === 'en' && $cat->title_en ? $cat->title_en : $cat->title_ar,
                'articles' => $cat->articles->map(fn ($a) => [
                    'slug' => $a->slug,
                    'title' => $locale === 'en' && $a->title_en ? $a->title_en : $a->title_ar,
                    'summary' => $locale === 'en' && $a->summary_en ? $a->summary_en : $a->summary_ar,
                ]),
            ]);

        return [
            'blocks' => $blocks,
            'categories' => $categories,
            'support' => [
                'email' => $supportEmail !== '' ? $supportEmail : null,
                'whatsapp' => $settings->whatsapp,
                'telegram' => $settings->telegram,
                'phone' => $settings->phone,
                'hours' => $locale === 'en' ? $settings->hours_en : $settings->hours_ar,
                'emergency_notice' => $locale === 'en' ? $settings->emergency_notice_en : $settings->emergency_notice_ar,
            ],
            'contacts' => $contacts,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function isPlaceholderEmail(?string $email): bool
    {
        if (! is_string($email) || trim($email) === '') {
            return true;
        }

        return str_contains(strtolower($email), 'example.com');
    }

    protected function sanitizeEmail(?string $email): ?string
    {
        if ($this->isPlaceholderEmail($email)) {
            return null;
        }

        return $email;
    }

    protected function serializeBlock(HelpBlock $block, string $locale): array
    {
        $config = $block->config_json ?? [];
        if (isset($config[$locale])) {
            $config = array_merge($config, $config[$locale]);
        }

        return [
            'id' => $block->id,
            'block_type' => $block->block_type,
            'config' => $config,
            'sort_order' => $block->sort_order,
        ];
    }
}
