<?php

namespace App\Console\Commands;

use App\Models\CompanyVideo;
use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * Keeps the platform light (client note): listings older than LISTINGS_EXPIRE_DAYS are hidden as
 * «منتهي» — the owner can renew them from «إعلاناتي». Their uploaded videos (the heavy files) are
 * deleted LISTINGS_EXPIRED_VIDEO_DAYS later if the listing wasn't renewed. Off until the days are set.
 */
class ExpireOldListings extends Command
{
    protected $signature = 'listings:expire-old {--dry-run : Only report what would happen}';

    protected $description = 'Expire old listings and free the video files of long-expired ones';

    public function handle(): int
    {
        $days = (int) config('listings.expire_after_days');
        if ($days < 1) {
            $this->line('Listing expiry is off (set LISTINGS_EXPIRE_DAYS, e.g. 90).');

            return self::SUCCESS;
        }
        $dry = (bool) $this->option('dry-run');
        $cutoff = now()->subDays($days);

        $old = Product::query()
            ->where('status', 'published')
            ->where('is_wholesale', false)
            ->whereRaw('COALESCE(bumped_at, published_at, created_at) < ?', [$cutoff]);
        $count = (clone $old)->count();
        if (! $dry && $count) {
            $old->update(['status' => 'expired', 'expired_at' => now()]);
        }
        $this->info(($dry ? '[dry-run] ' : '')."{$count} listing(s) older than {$days} days expired.");

        $videoDays = (int) config('listings.expired_video_cleanup_days', 30);
        $videos = CompanyVideo::query()
            ->whereNotNull('video_path')
            ->where('video_path', 'like', 'listing-videos/%')
            ->whereHas('product', fn ($q) => $q->where('status', 'expired')->where('expired_at', '<', now()->subDays($videoDays)))
            ->get();
        if (! $dry) {
            $disk = Storage::disk(config('videos.disk', 'public'));
            foreach ($videos as $video) {
                $disk->delete($video->video_path);
                $video->delete();
            }
        }
        $this->info(($dry ? '[dry-run] ' : '').$videos->count()." video file(s) of listings expired over {$videoDays} days removed.");

        return self::SUCCESS;
    }
}
