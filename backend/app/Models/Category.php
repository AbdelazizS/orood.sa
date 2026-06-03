<?php

namespace App\Models;

use App\Traits\HasLocalizedName;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use HasFactory, HasLocalizedName;

    protected $fillable = [
        'name',
        'name_ar',
        'name_en',
        'slug',
        'icon',
        'image_url',
        'is_active',
        'show_company_directory',
        'sort_order',
        'offer_enabled',
        'request_enabled',
        'wholesale_enabled',
        'role_restrictions',
        'dynamic_schema_enabled',
        'parent_id',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'show_company_directory' => 'boolean',
        'offer_enabled' => 'boolean',
        'request_enabled' => 'boolean',
        'wholesale_enabled' => 'boolean',
        'dynamic_schema_enabled' => 'boolean',
        'role_restrictions' => 'array',
    ];

    public function parent()
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(Category::class, 'parent_id');
    }

    public function listingSchemas()
    {
        return $this->hasMany(CategoryListingSchema::class);
    }

    public function subcategories()
    {
        return $this->hasMany(Subcategory::class);
    }

    public function rootSubcategories()
    {
        return $this->hasMany(Subcategory::class)->whereNull('parent_id');
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function regions()
    {
        return $this->belongsToMany(Region::class, 'category_region')
            ->withPivot('is_visible', 'wholesale_visible')
            ->withTimestamps();
    }
}
