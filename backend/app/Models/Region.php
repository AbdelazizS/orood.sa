<?php

namespace App\Models;

use App\Traits\HasLocalizedName;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Region extends Model
{
    use HasFactory, HasLocalizedName;

    protected $fillable = [
        'name',
        'name_ar',
        'name_en',
        'slug',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function cities()
    {
        return $this->hasMany(City::class);
    }

    public function categories()
    {
        return $this->belongsToMany(Category::class, 'category_region')
            ->withPivot('is_visible')
            ->withTimestamps();
    }
}
