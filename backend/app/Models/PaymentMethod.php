<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PaymentMethod extends Model
{
    public const CODE_WALLET_ESCROW = 'wallet_escrow';

    public const CODE_COD = 'cod';

    public const CODE_DIRECT_TRANSFER = 'direct_transfer';

    public const CODE_BANK_TRANSFER = 'bank_transfer';

    protected $fillable = [
        'code',
        'name_ar',
        'name_en',
        'description_ar',
        'description_en',
        'audience',
        'enabled',
        'sort_order',
        'requires_admin_review',
        'requires_seller_payout_profile',
        'requires_buyer_acknowledgement',
        'min_amount',
        'max_amount',
        'instructions',
        'config',
        'processing_time_ar',
        'processing_time_en',
        'audience_roles',
    ];

    protected $casts = [
        'enabled' => 'boolean',
        'requires_admin_review' => 'boolean',
        'requires_seller_payout_profile' => 'boolean',
        'requires_buyer_acknowledgement' => 'boolean',
        'min_amount' => 'decimal:2',
        'max_amount' => 'decimal:2',
        'instructions' => 'array',
        'config' => 'array',
        'audience_roles' => 'array',
    ];

    public function fields(): HasMany
    {
        return $this->hasMany(PaymentMethodField::class)->orderBy('sort_order');
    }

    public function localizedName(?string $locale = null): string
    {
        $locale = $locale ?? app()->getLocale();

        return $locale === 'en' && $this->name_en
            ? $this->name_en
            : $this->name_ar;
    }
}
