<?php

namespace App\Models;

use App\Traits\HasLocalizedName;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subcategory extends Model
{
    use HasFactory, HasLocalizedName;

    protected $fillable = [
        'category_id',
        'parent_id',
        'name',
        'name_ar',
        'name_en',
        'slug',
        'listing_property_type',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Subcategory::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Subcategory::class, 'parent_id')
            ->orderBy('sort_order')
            ->orderBy('id');
    }

    public function activeChildren(): HasMany
    {
        return $this->children()->where('is_active', true);
    }

    public function childrenRecursive(): HasMany
    {
        return $this->activeChildren()->with('childrenRecursive');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function scopeRoots(Builder $query): Builder
    {
        return $query->whereNull('parent_id');
    }

    public function hasActiveChildren(): bool
    {
        if ($this->relationLoaded('children')) {
            return $this->children->where('is_active', true)->isNotEmpty();
        }

        return $this->activeChildren()->exists();
    }

    public function isLeaf(): bool
    {
        return ! $this->hasActiveChildren();
    }

    /**
     * @return list<Subcategory>
     */
    public function ancestorChainIncludingSelf(): array
    {
        $chain = [];
        $current = $this;

        while ($current) {
            array_unshift($chain, $current);
            if (! $current->parent_id) {
                break;
            }
            $current = $current->relationLoaded('parent')
                ? $current->parent
                : $current->parent()->first();
        }

        return $chain;
    }

    public function wouldCreateCycle(?int $newParentId): bool
    {
        if (! $newParentId) {
            return false;
        }

        if ((int) $newParentId === (int) $this->id) {
            return true;
        }

        $cursor = static::query()->find($newParentId);
        while ($cursor) {
            if ((int) $cursor->id === (int) $this->id) {
                return true;
            }
            $cursor = $cursor->parent_id ? static::query()->find($cursor->parent_id) : null;
        }

        return false;
    }
}
