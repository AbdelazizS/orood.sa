<?php

use App\Models\CategoryListingPolicy;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        CategoryListingPolicy::query()->each(function (CategoryListingPolicy $policy) {
            $media = is_array($policy->media_policy) ? $policy->media_policy : [];
            if ((int) ($media['min_images'] ?? 0) === 0) {
                return;
            }
            $media['min_images'] = 0;
            $policy->update(['media_policy' => $media]);
        });
    }

    public function down(): void
    {
        // No rollback — images optional is the intended default.
    }
};
