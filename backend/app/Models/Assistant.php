<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;

class Assistant extends Model
{
    public const STATUS_ACTIVE = 'active';

    public const STATUS_INACTIVE = 'inactive';

    protected $fillable = [
        'user_id',
        'job_role',
        'status',
        'created_by',
        'deactivated_at',
    ];

    protected $casts = [
        'deactivated_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    /** @return list<string> */
    public function assignedUserTypes(): array
    {
        return DB::table('assistant_user_type')
            ->where('assistant_id', $this->id)
            ->pluck('user_type')
            ->all();
    }

    /** @param list<string> $types */
    public function syncUserTypes(array $types): void
    {
        DB::table('assistant_user_type')->where('assistant_id', $this->id)->delete();
        $unique = array_values(array_unique(array_filter($types)));
        foreach ($unique as $type) {
            DB::table('assistant_user_type')->insert([
                'assistant_id' => $this->id,
                'user_type' => $type,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
