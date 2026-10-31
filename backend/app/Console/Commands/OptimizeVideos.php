<?php

namespace App\Console\Commands;

use App\Models\CompanyVideo;
use App\Services\Videos\VideoFastStart;
use Illuminate\Console\Command;

/** Apply fast start / record sizes for videos uploaded before this existed (safe to re-run). */
class OptimizeVideos extends Command
{
    protected $signature = 'videos:optimize {--limit=200}';

    protected $description = 'Record file sizes and apply MP4 fast start (if ffmpeg is installed) to existing videos';

    public function handle(VideoFastStart $fastStart): int
    {
        $this->line($fastStart->ffmpegBinary() ? 'ffmpeg found: fast start will be applied.' : 'ffmpeg not found: only file sizes are recorded.');
        $videos = CompanyVideo::query()->whereNotNull('video_path')->whereNull('optimized_at')->orderBy('id')->limit((int) $this->option('limit'))->get();
        foreach ($videos as $video) {
            $fastStart->process($video);
        }
        $this->info($videos->count().' video(s) processed.');

        return self::SUCCESS;
    }
}
