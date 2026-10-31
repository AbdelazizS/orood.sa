<?php

namespace App\Services\Videos;

use App\Models\CompanyVideo;
use App\Models\Product;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Storage;

/**
 * Admin bulk deletion of uploaded videos (file + thumbnail + record) by age and scope.
 *
 * Scopes:
 *  - inactive_listings: videos of listings that are no longer live (sold, expired, archived, deleted, suspended)
 *    or whose listing no longer exists, plus hidden videos — the safe default;
 *  - hidden: only videos hidden by moderation / the owner;
 *  - all: every video in the period (live listings included).
 */
class VideoCleanup
{
    public const SCOPES = ['inactive_listings', 'hidden', 'all'];

    public const INACTIVE_PRODUCT_STATUSES = ['deleted', 'sold', 'archived', 'suspended', 'expired'];

    private const BATCH = 200;

    public function query(string $scope, ?CarbonImmutable $from, CarbonImmutable $to): Builder
    {
        $q = CompanyVideo::query()->where('created_at', '<', $to);
        if ($from) {
            $q->where('created_at', '>=', $from);
        }

        return match ($scope) {
            'hidden' => $q->where('status', CompanyVideo::STATUS_HIDDEN),
            'all' => $q,
            default => $q->where(fn ($w) => $w
                ->where('status', CompanyVideo::STATUS_HIDDEN)
                ->orWhereHas('product', fn ($p) => $p->whereIn('status', self::INACTIVE_PRODUCT_STATUSES))
                ->orWhere(fn ($o) => $o->whereNotNull('product_id')->whereDoesntHave('product'))),
        };
    }

    /** @return array{count: int, size_kb: int, unknown_size: int, published: int} */
    public function preview(string $scope, ?CarbonImmutable $from, CarbonImmutable $to): array
    {
        $q = $this->query($scope, $from, $to);

        return [
            'count' => (clone $q)->count(),
            'size_kb' => (int) (clone $q)->sum('file_size_kb'),
            'unknown_size' => (clone $q)->whereNull('file_size_kb')->whereNotNull('video_path')->count(),
            'published' => (clone $q)->where('status', CompanyVideo::STATUS_PUBLISHED)->count(),
        ];
    }

    /** @return array{deleted: int, files_deleted: int, size_kb: int, listings_reverted_to_price: int} */
    public function execute(string $scope, ?CarbonImmutable $from, CarbonImmutable $to): array
    {
        $disk = Storage::disk(config('videos.disk', 'public'));
        $deleted = 0;
        $files = 0;
        $sizeKb = 0;
        $productIds = [];

        do {
            $videos = $this->query($scope, $from, $to)->orderBy('id')->limit(self::BATCH)->get();
            foreach ($videos as $video) {
                $sizeKb += (int) $video->file_size_kb;
                foreach ([$video->video_path, $this->storagePath($video->thumbnail_url)] as $path) {
                    if ($path && $disk->exists($path)) {
                        $disk->delete($path);
                        $files++;
                    }
                }
                if ($video->product_id) {
                    $productIds[$video->product_id] = true;
                }
                $video->delete();
                $deleted++;
            }
        } while ($videos->count() === self::BATCH);

        // A listing without a video can only show its price on the map.
        $reverted = 0;
        foreach (array_chunk(array_keys($productIds), 500) as $ids) {
            $reverted += Product::query()->whereIn('id', $ids)->where('map_display', 'video')
                ->whereDoesntHave('videos', fn ($v) => $v->published())
                ->update(['map_display' => 'price']);
        }

        return ['deleted' => $deleted, 'files_deleted' => $files, 'size_kb' => $sizeKb, 'listings_reverted_to_price' => $reverted];
    }

    /** "/storage/videos/thumbs/x.jpg" → "videos/thumbs/x.jpg" (only our own uploads). */
    private function storagePath(?string $url): ?string
    {
        if (! $url || ! str_starts_with($url, '/storage/')) {
            return null;
        }

        return substr($url, strlen('/storage/'));
    }
}
