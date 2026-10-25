<?php

namespace App\Models;

use App\Traits\HasLocalizedName;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class City extends Model
{
    use HasFactory, HasLocalizedName;

    protected $fillable = [
        'region_id',
        'name',
        'name_ar',
        'name_en',
        'slug',
        'is_active',
        'lat',
        'lng',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'lat' => 'float',
        'lng' => 'float',
    ];

    public function region()
    {
        return $this->belongsTo(Region::class);
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function districts()
    {
        return $this->hasMany(District::class)->orderBy('sort_order')->orderBy('name');
    }
}
