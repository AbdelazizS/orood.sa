<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CompanyVideoComment extends Model
{
    protected $fillable = [
        'company_video_id',
        'user_id',
        'parent_id',
        'body',
        'timestamp_sec',
        'is_pinned',
        'owner_hearted',
        'is_hidden',
        'likes_count',
    ];

    protected $casts = [
        'timestamp_sec' => 'integer',
        'is_pinned' => 'boolean',
        'owner_hearted' => 'boolean',
        'is_hidden' => 'boolean',
        'likes_count' => 'integer',
    ];

    public function video(): BelongsTo
    {
        return $this->belongsTo(CompanyVideo::class, 'company_video_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }
}
