<?php

namespace App\Services;

use App\Models\AppSetting;
use App\Models\CodPolicy;
use App\Models\FinancialRequest;
use App\Models\OrderPaymentRequest;
use App\Models\PaymentMethod;
use App\Models\SellerPayoutProfile;

class AdminSettingsService
{
    public const KEY_CONTACT_PAGE = 'content.contact_page';
    public const KEY_ALLOW_COMPANY_REGISTRATION = 'account.allow_company_registration';

    public const KEY_DEFAULT_USER_ROLE = 'account.default_user_role';

    public const KEY_EMAIL_VERIFICATION_REQUIRED = 'auth.email_verification_required';

    public const KEY_LISTINGS_AUTO_PUBLISH = 'content.listings_auto_publish_on_create';

    public const KEY_DEFAULT_BIDS_VISIBLE = 'content.default_bids_visible';

    public const KEY_DEFAULT_COMMENTS_VISIBLE = 'content.default_comments_visible';

    public const KEY_WHOLESALE_MARKET_PAGE = 'content.wholesale_market_page';

    public const KEY_MAIL_SETTINGS = 'system.mail';

    /** @return list<string> */
    public static function wholesaleCopyFieldKeys(): array
    {
        return [
            'hero_kicker', 'hero_title', 'hero_subtitle', 'hero_cta_browse', 'hero_cta_how',
            'quick_filters_label', 'quick_filters_all', 'quick_filters_open', 'quick_filters_almost_full',
            'how_title', 'how_lead',
            'how_step1_label', 'how_step1_title', 'how_step1_body',
            'how_step2_label', 'how_step2_title', 'how_step2_body',
            'how_step3_label', 'how_step3_title', 'how_step3_body',
            'trust_title',
            'trust_verified_title', 'trust_verified_body',
            'trust_delivery_title', 'trust_delivery_body',
            'trust_payment_title', 'trust_payment_body',
        ];
    }

    public function all(): array
    {
        return [
            'security' => [
                ...PasswordPolicyService::responsePayload(),
                'hint' => PasswordPolicyService::rulesDescription(app()->getLocale()),
            ],
            'account' => [
                'allow_company_registration' => $this->getBool(self::KEY_ALLOW_COMPANY_REGISTRATION, true),
                'default_user_role' => $this->getString(self::KEY_DEFAULT_USER_ROLE, 'buyer'),
            ],
            'auth' => [
                'email_verification_required' => $this->getBool(self::KEY_EMAIL_VERIFICATION_REQUIRED, false),
            ],
            'content' => [
                'listings_auto_publish_on_create' => $this->getBool(
                    self::KEY_LISTINGS_AUTO_PUBLISH,
                    (bool) config('listings.auto_publish_on_create', true)
                ),
                'default_bids_visible' => $this->getBool(self::KEY_DEFAULT_BIDS_VISIBLE, true),
                'default_comments_visible' => $this->getBool(self::KEY_DEFAULT_COMMENTS_VISIBLE, true),
            ],
            'wholesale_market_page' => $this->wholesaleMarketPage(),
            'payments' => $this->paymentsSummary(),
            'contact' => $this->contactPage(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function paymentsSummary(): array
    {
        $methods = PaymentMethod::query()
            ->orderBy('sort_order')
            ->with(['fields' => fn ($q) => $q->orderBy('sort_order')])
            ->get();

        $globalCod = CodPolicy::query()
            ->where('scope', CodPolicy::SCOPE_GLOBAL)
            ->whereNull('scope_id')
            ->orderByDesc('priority')
            ->first();

        $bankTransfer = $methods->firstWhere('code', PaymentMethod::CODE_BANK_TRANSFER);

        return [
            'payment_methods' => $methods,
            'cod_global' => [
                'enabled' => (bool) ($globalCod?->enabled ?? false),
                'buyer_must_accept' => (bool) ($globalCod?->buyer_must_accept ?? true),
                'seller_can_toggle' => (bool) ($globalCod?->seller_can_toggle ?? true),
            ],
            'platform_bank_instructions' => $bankTransfer?->instructions ?? [
                'ar' => [
                    'account_name' => config('finance.bank_transfer.account_name'),
                    'bank_name' => config('finance.bank_transfer.bank_name'),
                    'iban' => config('finance.bank_transfer.iban'),
                ],
            ],
            'queue_counts' => [
                'financial_requests_pending' => FinancialRequest::where('status', 'pending')->count(),
                'order_payments_pending' => OrderPaymentRequest::where('status', 'pending')->count(),
                'payout_profiles_pending' => SellerPayoutProfile::where('status', SellerPayoutProfile::STATUS_PENDING_REVIEW)->count(),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function updatePayments(array $data, ?int $updatedBy = null): array
    {
        if (isset($data['payment_methods']) && is_array($data['payment_methods'])) {
            foreach ($data['payment_methods'] as $row) {
                if (! isset($row['id'])) {
                    continue;
                }
                $method = PaymentMethod::find($row['id']);
                if (! $method) {
                    continue;
                }
                $updates = [];
                if (array_key_exists('enabled', $row)) {
                    $updates['enabled'] = (bool) $row['enabled'];
                }
                if (array_key_exists('sort_order', $row)) {
                    $updates['sort_order'] = (int) $row['sort_order'];
                }
                if (array_key_exists('instructions', $row)) {
                    $updates['instructions'] = $row['instructions'];
                }
                if (array_key_exists('name_ar', $row)) {
                    $updates['name_ar'] = $row['name_ar'];
                }
                if (array_key_exists('name_en', $row)) {
                    $updates['name_en'] = $row['name_en'];
                }
                if ($updates !== []) {
                    $method->update($updates);
                }
            }
        }

        if (isset($data['cod_global']) && is_array($data['cod_global'])) {
            $cod = $data['cod_global'];
            CodPolicy::updateOrCreate(
                ['scope' => CodPolicy::SCOPE_GLOBAL, 'scope_id' => null],
                [
                    'enabled' => (bool) ($cod['enabled'] ?? false),
                    'buyer_must_accept' => (bool) ($cod['buyer_must_accept'] ?? true),
                    'seller_can_toggle' => (bool) ($cod['seller_can_toggle'] ?? true),
                    'priority' => 100,
                ]
            );
        }

        return $this->paymentsSummary();
    }

    /**
     * Support email for contact page (never uses placeholder example.com addresses).
     */
    public static function resolveContactSupportEmail(): string
    {
        $candidates = [
            env('CONTACT_SUPPORT_EMAIL'),
            config('mail.from.address'),
        ];

        foreach ($candidates as $email) {
            if (! is_string($email) || $email === '') {
                continue;
            }
            $email = trim($email);
            if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                continue;
            }
            if (str_contains(strtolower($email), 'example.com')) {
                continue;
            }

            return $email;
        }

        return '';
    }

    /**
     * @return list<string>
     */
    public static function resolveContactNotifyEmails(): array
    {
        $raw = env('CONTACT_NOTIFY_EMAILS');
        if (is_string($raw) && trim($raw) !== '') {
            return array_values(array_filter(array_map(
                static fn (string $e) => trim($e),
                explode(',', $raw),
            ), static fn (string $e) => filter_var($e, FILTER_VALIDATE_EMAIL) && ! str_contains(strtolower($e), 'example.com')));
        }

        $support = self::resolveContactSupportEmail();

        return $support !== '' ? [$support] : [];
    }

    /**
     * @return array<string, mixed>
     */
    public function defaultContactPage(): array
    {
        $supportEmail = self::resolveContactSupportEmail();

        return [
            'hero_kicker_ar' => 'مركز الدعم',
            'hero_kicker_en' => 'Support center',
            'hero_title_ar' => 'تواصل مع فريق عروض',
            'hero_title_en' => 'Contact the Arood team',
            'hero_subtitle_ar' => 'نحن هنا لمساعدتك — نسعد بالإجابة على استفساراتك ومساعدتك في كل ما يتعلق بالمنصة.',
            'hero_subtitle_en' => 'We are here to help with your account, orders, wallet, and listings.',
            'response_time_ar' => 'متوسط وقت الرد: خلال 24 ساعة',
            'response_time_en' => 'Average response time: within 24 hours',
            'trust_indicators' => [
                ['key' => 'trusted', 'icon' => 'shield', 'label_ar' => 'دعم موثوق', 'label_en' => 'Trusted support', 'visible' => true, 'sort_order' => 1],
                ['key' => 'care', 'icon' => 'headset', 'label_ar' => 'خدمة عملاء', 'label_en' => 'Customer care', 'visible' => true, 'sort_order' => 2],
                ['key' => 'sla', 'icon' => 'clock', 'label_ar' => 'متابعة سريعة', 'label_en' => 'Timely follow-up', 'visible' => true, 'sort_order' => 3],
            ],
            'channels' => [
                [
                    'id' => 'email-primary',
                    'type' => 'email',
                    'label_ar' => 'البريد الإلكتروني',
                    'label_en' => 'Email',
                    'description_ar' => 'للاستفسارات العامة والدعم',
                    'description_en' => 'For general inquiries and support',
                    'cta_label_ar' => 'راسلنا',
                    'cta_label_en' => 'Email us',
                    'value' => $supportEmail,
                    'visible' => $supportEmail !== '',
                    'sort_order' => 1,
                ],
                [
                    'id' => 'whatsapp',
                    'type' => 'whatsapp',
                    'label_ar' => 'واتساب',
                    'label_en' => 'WhatsApp',
                    'description_ar' => 'تواصل سريع مع فريق الدعم',
                    'description_en' => 'Quick chat with support',
                    'cta_label_ar' => 'فتح واتساب',
                    'cta_label_en' => 'Open WhatsApp',
                    'value' => '',
                    'visible' => false,
                    'sort_order' => 2,
                ],
            ],
            'hours_ar' => 'أوقات العمل: الأحد – الخميس، 9 ص – 6 م',
            'hours_en' => 'Hours: Sun – Thu, 9 AM – 6 PM',
            'form_enabled' => true,
            'inquiry_types' => [
                ['key' => 'technical', 'label_ar' => 'دعم فني', 'label_en' => 'Technical support', 'visible' => true, 'sort_order' => 1],
                ['key' => 'order', 'label_ar' => 'استفسار عن طلب', 'label_en' => 'Order inquiry', 'visible' => true, 'sort_order' => 2],
                ['key' => 'report', 'label_ar' => 'بلاغ', 'label_en' => 'Report', 'visible' => true, 'sort_order' => 3],
                ['key' => 'wallet', 'label_ar' => 'الدفع والمحفظة', 'label_en' => 'Payments & wallet', 'visible' => true, 'sort_order' => 4],
                ['key' => 'guarantee', 'label_ar' => 'الضمان المالي', 'label_en' => 'Financial guarantee', 'visible' => true, 'sort_order' => 5],
                ['key' => 'wholesale', 'label_ar' => 'سوق الجملة', 'label_en' => 'Wholesale market', 'visible' => true, 'sort_order' => 6],
                ['key' => 'suggestion', 'label_ar' => 'اقتراح', 'label_en' => 'Suggestion', 'visible' => true, 'sort_order' => 7],
                ['key' => 'bug', 'label_ar' => 'مشكلة تقنية', 'label_en' => 'Technical issue', 'visible' => true, 'sort_order' => 8],
            ],
            'form_fields' => [
                ['field_key' => 'name', 'field_type' => 'text', 'label_ar' => 'الاسم الكامل', 'label_en' => 'Full name', 'required' => true, 'sort_order' => 1],
                ['field_key' => 'phone', 'field_type' => 'phone', 'label_ar' => 'رقم الجوال', 'label_en' => 'Mobile number', 'required' => false, 'sort_order' => 2],
                ['field_key' => 'email', 'field_type' => 'email', 'label_ar' => 'البريد الإلكتروني', 'label_en' => 'Email', 'required' => true, 'sort_order' => 3],
                ['field_key' => 'inquiry_type', 'field_type' => 'select', 'label_ar' => 'نوع الاستفسار', 'label_en' => 'Inquiry type', 'required' => true, 'sort_order' => 4, 'options_source' => 'inquiry_types'],
                ['field_key' => 'subject', 'field_type' => 'text', 'label_ar' => 'الموضوع', 'label_en' => 'Subject', 'required' => false, 'sort_order' => 5],
                ['field_key' => 'message', 'field_type' => 'textarea', 'label_ar' => 'الرسالة', 'label_en' => 'Message', 'required' => true, 'sort_order' => 6],
                ['field_key' => 'attachments', 'field_type' => 'file', 'label_ar' => 'مرفقات (اختياري)', 'label_en' => 'Attachments (optional)', 'required' => false, 'sort_order' => 7],
            ],
            'faq' => [
                'title_ar' => 'مساعدة سريعة',
                'title_en' => 'Quick help',
                'items' => [
                    [
                        'question_ar' => 'كيف أتتبع طلباتي؟',
                        'question_en' => 'How do I track my orders?',
                        'answer_ar' => 'من لوحة التحكم اذهب إلى تتبع الطلبات لمتابعة حالة مشترياتك ومبيعاتك.',
                        'answer_en' => 'From your dashboard, open order tracking to see purchase and sale status.',
                        'visible' => true,
                        'sort_order' => 1,
                    ],
                    [
                        'question_ar' => 'كيف أشحن المحفظة؟',
                        'question_en' => 'How do I top up my wallet?',
                        'answer_ar' => 'من المحفظة اختر شحن الرصيد واتبع تعليمات التحويل البنكي المعروضة.',
                        'answer_en' => 'Open Wallet, choose top-up, and follow the bank transfer instructions shown.',
                        'visible' => true,
                        'sort_order' => 2,
                    ],
                    [
                        'question_ar' => 'كيف يعمل الضمان المالي؟',
                        'question_en' => 'How does the financial guarantee work?',
                        'answer_ar' => 'يُحجز المبلغ حتى تأكيد الاستلام عند الدفع عبر المنصة، وفق سياسة الضمان.',
                        'answer_en' => 'Funds are held until delivery is confirmed when paying through the platform.',
                        'visible' => true,
                        'sort_order' => 3,
                    ],
                ],
            ],
            'trust_blocks' => [
                [
                    'icon' => 'shield-check',
                    'title_ar' => 'معاملات موثوقة',
                    'title_en' => 'Trusted transactions',
                    'body_ar' => 'نوفر آليات دفع وضمان تساعد على حماية الطرفين.',
                    'body_en' => 'Payment and guarantee flows help protect buyers and sellers.',
                    'visible' => true,
                    'sort_order' => 1,
                ],
                [
                    'icon' => 'users',
                    'title_ar' => 'حماية للمستخدمين',
                    'title_en' => 'User protection',
                    'body_ar' => 'نراجع البلاغات ونتابع الحالات المفتوحة.',
                    'body_en' => 'We review reports and follow up on open cases.',
                    'visible' => true,
                    'sort_order' => 2,
                ],
                [
                    'icon' => 'headset',
                    'title_ar' => 'فريق دعم متخصص',
                    'title_en' => 'Dedicated support',
                    'body_ar' => 'فريقنا يساعدك في الطلبات والمحفظة والإعلانات.',
                    'body_en' => 'Our team assists with orders, wallet, and listings.',
                    'visible' => true,
                    'sort_order' => 3,
                ],
            ],
            'success_message_ar' => 'شكراً لتواصلك. استلمنا رسالتك وسنرد عليك في أقرب وقت.',
            'success_message_en' => 'Thank you. We received your message and will reply soon.',
            'notify_emails' => self::resolveContactNotifyEmails(),
        ];
    }

    public function contactPage(): array
    {
        $raw = AppSetting::getValue(self::KEY_CONTACT_PAGE, []);
        if (! is_array($raw) || $raw === []) {
            return $this->defaultContactPage();
        }

        return array_replace_recursive($this->defaultContactPage(), $raw);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateContactPage(array $data, ?int $updatedBy = null): array
    {
        $merged = array_replace_recursive($this->contactPage(), $data);
        AppSetting::putValue(self::KEY_CONTACT_PAGE, $merged, $updatedBy);

        return $merged;
    }

    public function contactPagePublic(?string $locale = null): array
    {
        $page = $this->contactPage();
        $locale = $locale === 'en' ? 'en' : 'ar';
        $other = $locale === 'ar' ? 'en' : 'ar';
        $presenter = app(ContactChannelPresenter::class);

        $inquiryOptions = collect($page['inquiry_types'] ?? [])
            ->filter(fn ($t) => ($t['visible'] ?? true) && ! empty($t['key']))
            ->sortBy('sort_order')
            ->map(fn ($t) => [
                'value' => $t['key'],
                'label' => $t["label_{$locale}"] ?? $t['label_ar'] ?? $t['key'],
            ])
            ->values()
            ->all();

        return [
            'hero_kicker' => $page["hero_kicker_{$locale}"] ?? $page["hero_kicker_{$other}"] ?? '',
            'hero_title' => $page["hero_title_{$locale}"] ?: $page["hero_title_{$other}"],
            'hero_subtitle' => $page["hero_subtitle_{$locale}"] ?: $page["hero_subtitle_{$other}"],
            'hours' => $page["hours_{$locale}"] ?? $page["hours_{$other}"] ?? '',
            'response_time' => $page["response_time_{$locale}"] ?? $page["response_time_{$other}"] ?? '',
            'trust_indicators' => collect($page['trust_indicators'] ?? [])
                ->filter(fn ($i) => $i['visible'] ?? true)
                ->sortBy('sort_order')
                ->map(fn ($i) => [
                    'key' => $i['key'] ?? '',
                    'icon' => $i['icon'] ?? 'shield',
                    'label' => $i["label_{$locale}"] ?? $i['label_ar'] ?? '',
                ])
                ->values()
                ->all(),
            'channels' => collect($page['channels'] ?? [])
                ->filter(fn ($c) => ($c['visible'] ?? true) && trim((string) ($c['value'] ?? '')) !== '')
                ->sortBy('sort_order')
                ->map(fn ($c) => $presenter->present($c, $locale))
                ->values()
                ->all(),
            'form_enabled' => (bool) ($page['form_enabled'] ?? true),
            'inquiry_types' => $inquiryOptions,
            'form_fields' => collect($page['form_fields'] ?? [])
                ->sortBy('sort_order')
                ->map(function ($f) use ($locale, $inquiryOptions) {
                    $field = [
                        'field_key' => $f['field_key'],
                        'field_type' => $f['field_type'],
                        'label' => $f["label_{$locale}"] ?? $f['label_ar'] ?? $f['field_key'],
                        'required' => (bool) ($f['required'] ?? false),
                        'sort_order' => (int) ($f['sort_order'] ?? 0),
                    ];
                    if (($f['field_type'] ?? '') === 'select' || ($f['options_source'] ?? '') === 'inquiry_types') {
                        $field['options'] = $f['options'] ?? $inquiryOptions;
                    }

                    return $field;
                })
                ->values()
                ->all(),
            'faq' => [
                'title' => $page['faq']["title_{$locale}"] ?? $page['faq']['title_ar'] ?? '',
                'items' => collect($page['faq']['items'] ?? [])
                    ->filter(fn ($item) => $item['visible'] ?? true)
                    ->sortBy('sort_order')
                    ->map(fn ($item) => [
                        'question' => $item["question_{$locale}"] ?? $item['question_ar'] ?? '',
                        'answer' => $item["answer_{$locale}"] ?? $item['answer_ar'] ?? '',
                    ])
                    ->values()
                    ->all(),
            ],
            'trust_blocks' => collect($page['trust_blocks'] ?? [])
                ->filter(fn ($b) => $b['visible'] ?? true)
                ->sortBy('sort_order')
                ->map(fn ($b) => [
                    'icon' => $b['icon'] ?? 'shield-check',
                    'title' => $b["title_{$locale}"] ?? $b['title_ar'] ?? '',
                    'body' => $b["body_{$locale}"] ?? $b['body_ar'] ?? '',
                ])
                ->values()
                ->all(),
            'success_message' => $page["success_message_{$locale}"] ?: $page['success_message_ar'],
        ];
    }

    public function updateAccount(array $data, ?int $updatedBy = null): array
    {
        if (array_key_exists('allow_company_registration', $data)) {
            AppSetting::putValue(self::KEY_ALLOW_COMPANY_REGISTRATION, (bool) $data['allow_company_registration'], $updatedBy);
        }
        if (array_key_exists('default_user_role', $data)) {
            AppSetting::putValue(self::KEY_DEFAULT_USER_ROLE, (string) $data['default_user_role'], $updatedBy);
        }

        return $this->all()['account'];
    }

    public function updateAuth(array $data, ?int $updatedBy = null): array
    {
        if (array_key_exists('email_verification_required', $data)) {
            AppSetting::putValue(self::KEY_EMAIL_VERIFICATION_REQUIRED, (bool) $data['email_verification_required'], $updatedBy);
        }

        return $this->all()['auth'];
    }

    public function updateContent(array $data, ?int $updatedBy = null): array
    {
        if (array_key_exists('listings_auto_publish_on_create', $data)) {
            AppSetting::putValue(self::KEY_LISTINGS_AUTO_PUBLISH, (bool) $data['listings_auto_publish_on_create'], $updatedBy);
        }
        if (array_key_exists('default_bids_visible', $data)) {
            AppSetting::putValue(self::KEY_DEFAULT_BIDS_VISIBLE, (bool) $data['default_bids_visible'], $updatedBy);
        }
        if (array_key_exists('default_comments_visible', $data)) {
            AppSetting::putValue(self::KEY_DEFAULT_COMMENTS_VISIBLE, (bool) $data['default_comments_visible'], $updatedBy);
        }

        return $this->all()['content'];
    }

    /**
     * @return array{
     *   show_hero: bool,
     *   show_quick_filters: bool,
     *   show_how_it_works: bool,
     *   show_trust: bool,
     *   copy: array{ar: array<string, string>, en: array<string, string>}
     * }
     */
    public function defaultWholesaleMarketPage(): array
    {
        $blank = array_fill_keys(self::wholesaleCopyFieldKeys(), '');

        return [
            'show_hero' => false,
            'show_quick_filters' => false,
            'show_how_it_works' => false,
            'show_trust' => false,
            'copy' => [
                'ar' => $blank,
                'en' => $blank,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function wholesaleMarketPage(): array
    {
        $defaults = $this->defaultWholesaleMarketPage();
        $raw = AppSetting::getValue(self::KEY_WHOLESALE_MARKET_PAGE, []);
        if (! is_array($raw)) {
            return $defaults;
        }
        $out = $defaults;
        foreach (['show_hero', 'show_quick_filters', 'show_how_it_works', 'show_trust'] as $boolKey) {
            if (array_key_exists($boolKey, $raw)) {
                $out[$boolKey] = (bool) $raw[$boolKey];
            }
        }
        foreach (['ar', 'en'] as $lang) {
            if (! isset($raw['copy'][$lang]) || ! is_array($raw['copy'][$lang])) {
                continue;
            }
            foreach (self::wholesaleCopyFieldKeys() as $field) {
                if (! array_key_exists($field, $raw['copy'][$lang])) {
                    continue;
                }
                $v = $raw['copy'][$lang][$field];
                $out['copy'][$lang][$field] = is_string($v) ? $v : '';
            }
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function updateWholesaleMarketPage(array $data, ?int $updatedBy = null): array
    {
        $merged = $this->wholesaleMarketPage();
        foreach (['show_hero', 'show_quick_filters', 'show_how_it_works', 'show_trust'] as $boolKey) {
            if (array_key_exists($boolKey, $data)) {
                $merged[$boolKey] = (bool) $data[$boolKey];
            }
        }
        if (isset($data['copy']) && is_array($data['copy'])) {
            foreach (['ar', 'en'] as $lang) {
                if (! isset($data['copy'][$lang]) || ! is_array($data['copy'][$lang])) {
                    continue;
                }
                foreach (self::wholesaleCopyFieldKeys() as $field) {
                    if (! array_key_exists($field, $data['copy'][$lang])) {
                        continue;
                    }
                    $v = $data['copy'][$lang][$field];
                    $merged['copy'][$lang][$field] = is_string($v) ? mb_substr($v, 0, 2000) : '';
                }
            }
        }
        AppSetting::putValue(self::KEY_WHOLESALE_MARKET_PAGE, $merged, $updatedBy);

        return $merged;
    }

    public function getBool(string $key, bool $default): bool
    {
        return (bool) AppSetting::getValue($key, $default);
    }

    public function getString(string $key, string $default): string
    {
        return (string) AppSetting::getValue($key, $default);
    }

    /**
     * @return array<string, mixed>
     */
    public function getMailSettings(): array
    {
        $stored = AppSetting::getValue(self::KEY_MAIL_SETTINGS, []);
        if (! is_array($stored)) {
            $stored = [];
        }

        return array_merge([
            'mailer' => config('mail.default'),
            'host' => config('mail.mailers.smtp.host'),
            'port' => config('mail.mailers.smtp.port'),
            'username' => config('mail.mailers.smtp.username'),
            'encryption' => config('mail.mailers.smtp.scheme') === 'smtps' ? 'tls' : null,
            'from_address' => config('mail.from.address'),
            'from_name' => config('mail.from.name'),
            'password_set' => ! empty(config('mail.mailers.smtp.password')),
        ], $stored);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateMailSettings(array $data, ?int $updatedBy = null): array
    {
        $current = $this->getMailSettings();
        if (array_key_exists('password', $data) && ($data['password'] === null || $data['password'] === '')) {
            unset($data['password']);
        }
        $merged = array_merge($current, $data);
        if (isset($merged['password'])) {
            $merged['password_set'] = true;
        }
        unset($merged['password']);
        AppSetting::putValue(self::KEY_MAIL_SETTINGS, $merged, $updatedBy);

        return $merged;
    }
}
