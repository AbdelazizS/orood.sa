<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CategorySchemaAuditLog extends Model
{
    protected $fillable = [
        'schema_id',
        'action',
        'actor_id',
        'diff',
    ];

    protected $casts = [
        'diff' => 'array',
    ];

    public function schema(): BelongsTo
    {
        return $this->belongsTo(CategoryListingSchema::class, 'schema_id');
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
