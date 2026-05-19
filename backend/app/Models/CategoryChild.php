<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CategoryChild extends Model
{
    protected $fillable = [
        'parent_id',
        'child_id',
        'depth',
        'sort_order',
    ];

    protected $casts = [
        'depth' => 'integer',
        'sort_order' => 'integer',
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    public function child(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'child_id');
    }
}
