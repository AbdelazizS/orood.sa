<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ServiceCategory extends Model
{
    protected $fillable = [
        'slug',
        'name_ar',
        'name_en',
        'icon',
        'sort_order',
    ];

    public function providers(): HasMany
    {
        return $this->hasMany(ServiceProvider::class);
    }

    public function localizedName(?string $locale = null): string
    {
        $locale = $locale ?? app()->getLocale();

        return str_starts_with((string) $locale, 'ar')
            ? (string) $this->name_ar
            : (string) $this->name_en;
    }
}
