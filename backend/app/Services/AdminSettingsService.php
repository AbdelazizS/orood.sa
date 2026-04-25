<?php

namespace App\Services;

use App\Models\AppSetting;

class AdminSettingsService
{
    public const KEY_ALLOW_COMPANY_REGISTRATION = 'account.allow_company_registration';
    public const KEY_DEFAULT_USER_ROLE = 'account.default_user_role';
    public const KEY_EMAIL_VERIFICATION_REQUIRED = 'auth.email_verification_required';
    public const KEY_LISTINGS_AUTO_PUBLISH = 'content.listings_auto_publish_on_create';
    public const KEY_DEFAULT_BIDS_VISIBLE = 'content.default_bids_visible';
    public const KEY_DEFAULT_COMMENTS_VISIBLE = 'content.default_comments_visible';

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

    public function getBool(string $key, bool $default): bool
    {
        return (bool) AppSetting::getValue($key, $default);
    }

    public function getString(string $key, string $default): string
    {
        return (string) AppSetting::getValue($key, $default);
    }
}

