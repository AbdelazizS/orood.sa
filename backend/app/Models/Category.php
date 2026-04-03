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
        'is_active',
        'show_company_directory',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'show_company_directory' => 'boolean',
    ];


    public function subcategories()
    {
        return $this->hasMany(Subcategory::class);
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
