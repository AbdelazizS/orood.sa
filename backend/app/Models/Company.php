<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Company extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'slug',
        'category_id',
        'region_id',
        'city_id',
        'email',
        'phone',
        'product_types',
        'verification_status',
        'license_url',
        'license_public_id',
        'rejection_reason',
        'reviewed_by',
        'reviewed_at',
        'rating',
        'description',
        'lat',
        'lng',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    protected $casts = [
        'rating' => 'decimal:1',
        'reviewed_at' => 'datetime',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function region()
    {
        return $this->belongsTo(Region::class);
    }

    public function city()
    {
        return $this->belongsTo(City::class);
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function isApproved(): bool
    {
        return $this->verification_status === 'approved';
    }

    public function wholesaleBulkOffers()
    {
        return $this->hasMany(WholesaleBulkOffer::class);
    }

    public function products()
    {
        return $this->hasMany(Product::class, 'user_id', 'user_id');
    }

    public function isPending(): bool
    {
        return $this->verification_status === 'pending';
    }

    public function getStatusTextAttribute(): string
    {
        return match ((string) $this->verification_status) {
            'pending' => 'قيد المراجعة',
            'approved' => 'موثق',
            'rejected' => 'مرفوض',
            default => 'غير معروف',
        };
    }
}
