<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Hash;

class Verification extends Model
{
    protected $fillable = [
        'user_id',
        'type',
        'status',
        'otp_code',
        'verified_at',
        'expires_at',
        'attempts',
    ];

    protected $casts = [
        'verified_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    public function verify(string $code): bool
    {
        if ($this->status === 'verified') {
            return true;
        }
        if ($this->isExpired()) {
            return false;
        }
        if (!Hash::check($code, $this->otp_code)) {
            $this->increment('attempts');
            return false;
        }
        $this->update([
            'status' => 'verified',
            'verified_at' => now(),
            'otp_code' => null,
        ]);
        return true;
    }

    /**
     * Create or refresh OTP for user. Returns [Verification, plainCode].
     */
    public static function createForUser(User $user, string $type = 'email', int $ttlMinutes = 15): array
    {
        $code = (string) random_int(100000, 999999);
        $expiresAt = now()->addMinutes($ttlMinutes);

        $verification = self::updateOrCreate(
            [
                'user_id' => $user->id,
                'type' => $type,
            ],
            [
                'status' => 'pending',
                'otp_code' => Hash::make($code),
                'expires_at' => $expiresAt,
                'attempts' => 0,
            ]
        );

        return [$verification, $code];
    }
}
