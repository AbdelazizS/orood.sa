<?php

namespace App\Traits;

use Illuminate\Http\Request;

trait HasLocalizedName
{
    /**
     * Get localized name. AR is base; EN is optional.
     * When EN requested but name_en empty → fallback to name_ar.
     */
    public function getLocalizedName(?string $locale = null): string
    {
        $locale = $locale ?? request()->header('Accept-Language', 'ar');
        $locale = str_starts_with($locale, 'ar') ? 'ar' : 'en';

        if ($locale === 'ar') {
            return $this->name_ar ?? $this->name ?? $this->name_en ?? '';
        }

        return $this->name_en ?? $this->name_ar ?? $this->name ?? '';
    }
}
