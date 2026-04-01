<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'how_did_you_hear',
        'last_login_at',
        'role',
        'bio',
        'avatar_url',
        'cover_photo_url',
        'logo_url',
        'city_id',
        'is_verified',
        'verification_type',
        'verification_level',
        'financial_guarantee',
        'is_online',
        'last_seen',
        'rating',
        'total_ratings',
        'completed_orders',
        'my_referral_code',
        'referred_by_code',
        'username',
        'avatar_public_id',
        'cover_public_id',
        'verification_method',
        'verification_status',
    ];

    protected $casts = [
        'is_verified' => 'boolean',
        'financial_guarantee' => 'decimal:2',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'api_token',
    ];

    public function favorites()
    {
        return $this->belongsToMany(Product::class, 'favorites')->withTimestamps();
    }

    public function savedSearches()
    {
        return $this->hasMany(SavedSearch::class);
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function reviewsReceived()
    {
        return $this->hasMany(Review::class, 'reviewee_id');
    }

    public function reviews()
    {
        return $this->hasMany(Review::class, 'reviewee_id');
    }

    public function reviewsGiven()
    {
        return $this->hasMany(Review::class, 'reviewer_id');
    }

    public function profileVisits()
    {
        return $this->hasMany(PageVisit::class, 'profile_id');
    }

    public function recalculateRating(): void
    {
        $avg = $this->reviews()
            ->where('is_visible', true)
            ->avg('rating') ?? 0;
        $count = $this->reviews()
            ->where('is_visible', true)
            ->count();

        $this->update([
            'rating' => round((float) $avg, 2),
            'total_ratings' => $count,
        ]);
    }

    public function getRatingDistribution(): array
    {
        $dist = $this->reviews()
            ->where('is_visible', true)
            ->selectRaw('rating, COUNT(*) as count')
            ->groupBy('rating')
            ->pluck('count', 'rating')
            ->toArray();

        return [
            5 => (int) ($dist[5] ?? 0),
            4 => (int) ($dist[4] ?? 0),
            3 => (int) ($dist[3] ?? 0),
            2 => (int) ($dist[2] ?? 0),
            1 => (int) ($dist[1] ?? 0),
        ];
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    public function city()
    {
        return $this->belongsTo(City::class);
    }

    public function documentVerifications()
    {
        return $this->hasMany(DocumentVerification::class, 'user_id');
    }

    public function guarantees()
    {
        return $this->hasMany(Guarantee::class, 'user_id');
    }

    public function balance()
    {
        return $this->hasOne(Balance::class, 'user_id');
    }

    public function company()
    {
        return $this->hasOne(Company::class, 'user_id');
    }

    public function purchasesAsBuyer()
    {
        return $this->hasMany(Purchase::class, 'buyer_id');
    }

    public function purchasesAsSeller()
    {
        return $this->hasMany(Purchase::class, 'seller_id');
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    public function isBanned(): bool
    {
        return (bool) $this->banned_at;
    }

    public function canCreateListings(): bool
    {
        $role = UserRole::tryFrom($this->role);
        return $role ? $role->canCreateListings() : false;
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'last_seen' => 'datetime',
            'password' => 'hashed',
            'banned_at' => 'datetime',
            'suspended_at' => 'datetime',
            'is_verified' => 'boolean',
        ];
    }
}
