<?php

namespace App\Services\Videos;

use App\Models\CompanyVideo;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\ExecutableFinder;
use Symfony\Component\Process\Process;

/**
 * Moves the MP4 index ("moov atom") to the start of the file with ffmpeg (-c copy, no re-encode),
 * so browsers can start playing after the first bytes instead of downloading the whole video.
 * Safe: writes to a temp file and replaces the original only after ffmpeg succeeds. Idempotent
 * (optimized_at). Does nothing when ffmpeg isn't installed.
 */
class VideoFastStart
{
    public function ffmpegBinary(): ?string
    {
        $configured = trim((string) config('videos.ffmpeg_path'));
        if ($configured === 'off') {
            return null;
        }
        if ($configured !== '') {
            return is_executable($configured) ? $configured : null;
        }

        return (new ExecutableFinder)->find('ffmpeg');
    }

    /** Record the file size and, when possible, apply fast start. Never throws. */
    public function process(CompanyVideo $video): void
    {
        if (! $video->video_path) {
            return;
        }
        $disk = Storage::disk(config('videos.disk', 'public'));
        if (! $disk->exists($video->video_path)) {
            return;
        }
        $path = $disk->path($video->video_path);
        $updates = ['file_size_kb' => (int) ceil(filesize($path) / 1024)];

        $ffmpeg = $this->ffmpegBinary();
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        if ($ffmpeg && ! $video->optimized_at && in_array($ext, ['mp4', 'm4v', 'mov'], true)) {
            $tmp = $path.'.faststart.mp4';
            try {
                $process = new Process([$ffmpeg, '-y', '-v', 'error', '-i', $path, '-c', 'copy', '-movflags', '+faststart', $tmp]);
                $process->setTimeout(300);
                $process->run();
                if ($process->isSuccessful() && is_file($tmp) && filesize($tmp) > 0) {
                    rename($tmp, $path);
                    $updates['file_size_kb'] = (int) ceil(filesize($path) / 1024);
                    $updates['optimized_at'] = now();
                } else {
                    Log::warning('video fast-start failed', ['video' => $video->id, 'error' => $process->getErrorOutput()]);
                }
            } catch (\Throwable $e) {
                Log::warning('video fast-start error', ['video' => $video->id, 'error' => $e->getMessage()]);
            } finally {
                if (is_file($tmp)) {
                    @unlink($tmp);
                }
            }
        }

        $video->forceFill($updates)->saveQuietly();
    }
}
