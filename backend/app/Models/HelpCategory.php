<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HelpCategory extends Model
{
    protected $fillable = ['slug', 'title_ar', 'title_en', 'sort_order', 'visible', 'audience'];

    protected $casts = ['visible' => 'boolean'];

    public function articles(): HasMany
    {
        return $this->hasMany(HelpArticle::class, 'category_id');
    }
}
