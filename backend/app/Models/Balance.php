<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Balance extends Model
{
    protected $fillable = [
        'user_id',
        'available',
        'escrow',
        'withdrawable',
    ];

    protected $casts = [
        'available' => 'decimal:2',
        'escrow' => 'decimal:2',
        'withdrawable' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function getOrCreateForUser(int $userId): self
    {
        $balance = self::firstOrCreate(
            ['user_id' => $userId],
            ['available' => 0, 'escrow' => 0, 'withdrawable' => 0]
        );
        return $balance;
    }
}
