<?php

namespace App\Services;

use App\Services\Finance\PhoneNormalizationService;

class ContactChannelPresenter
{
    public function __construct(private readonly PhoneNormalizationService $phones) {}

    /**
     * @param  array<string, mixed>  $channel
     * @return array<string, mixed>
     */
    public function present(array $channel, string $locale): array
    {
        $type = (string) ($channel['type'] ?? 'url');
        $value = trim((string) ($channel['value'] ?? ''));
        $label = $channel["label_{$locale}"] ?? $channel['label_ar'] ?? $type;
        $description = $channel["description_{$locale}"] ?? $channel['description_ar'] ?? '';
        $cta = $channel["cta_label_{$locale}"] ?? $channel['cta_label_ar'] ?? null;

        return [
            'id' => $channel['id'] ?? $type.'-'.md5($value),
            'type' => $type,
            'label' => $label,
            'description' => $description,
            'value' => $value,
            'href' => $this->buildHref($type, $value),
            'cta_label' => $cta ?: $label,
        ];
    }

    public function buildHref(string $type, string $value): ?string
    {
        if ($value === '') {
            return null;
        }

        return match ($type) {
            'email' => str_contains($value, '@') ? 'mailto:'.$value : null,
            'phone' => $this->phoneHref($value),
            'whatsapp' => $this->whatsappHref($value),
            'telegram' => $this->telegramHref($value),
            'url', 'ticket', 'business' => $this->urlHref($value),
            default => $this->urlHref($value),
        };
    }

    private function phoneHref(string $value): ?string
    {
        $normalized = $this->phones->normalize($value);

        return $normalized ? 'tel:'.$normalized : null;
    }

    private function whatsappHref(string $value): ?string
    {
        $digits = preg_replace('/\D+/', '', $value);
        if ($digits === null || $digits === '') {
            return null;
        }
        if (str_starts_with($digits, '0')) {
            $digits = '966'.substr($digits, 1);
        } elseif (! str_starts_with($digits, '966')) {
            $digits = '966'.$digits;
        }

        return 'https://wa.me/'.$digits;
    }

    private function telegramHref(string $value): ?string
    {
        $value = ltrim($value, '@');
        if (str_starts_with($value, 'http')) {
            return $value;
        }

        return 'https://t.me/'.$value;
    }

    private function urlHref(string $value): ?string
    {
        if (str_starts_with($value, 'http://') || str_starts_with($value, 'https://')) {
            return $value;
        }
        if (str_starts_with($value, '/')) {
            return $value;
        }

        return 'https://'.$value;
    }
}
