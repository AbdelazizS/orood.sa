<?php

namespace App\Services\Videos;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Large videos arrive in small pieces (1 MB) so the server's PHP / nginx body limits never reject
 * the upload ("The POST data is too large"). The pieces are joined when the listing / channel
 * video is saved with its upload_id.
 */
class ChunkedVideoUploads
{
    public const ALLOWED_MIME = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];

    /** Local working folder for one user's upload. */
    private function dir(int $userId, string $uploadId): string
    {
        return storage_path('app/video-chunks/'.$userId.'/'.$uploadId);
    }

    public function storeChunk(int $userId, string $uploadId, int $index, int $total, UploadedFile $chunk): void
    {
        $this->assertUploadId($uploadId);
        $maxChunks = (int) ceil((config('videos.max_kb') * 1024) / (512 * 1024)) + 1;
        if ($total < 1 || $total > $maxChunks || $index < 0 || $index >= $total) {
            throw ValidationException::withMessages(['chunk' => 'أجزاء الفيديو غير صحيحة.']);
        }

        $dir = $this->dir($userId, $uploadId);
        File::ensureDirectoryExists($dir);
        $chunk->move($dir, sprintf('%05d.part', $index));
        File::put($dir.'/total', (string) $total);
    }

    /**
     * Join the pieces and move the video to the public disk.
     *
     * @return array{path: string, mime: string, size_kb: int}
     */
    public function assemble(int $userId, string $uploadId, string $folder, ?string $originalName = null): array
    {
        $this->assertUploadId($uploadId);
        $dir = $this->dir($userId, $uploadId);
        $total = File::exists($dir.'/total') ? (int) File::get($dir.'/total') : 0;
        if ($total < 1) {
            throw ValidationException::withMessages(['video' => 'لم يكتمل رفع الفيديو، حاول مرة أخرى.']);
        }
        for ($i = 0; $i < $total; $i++) {
            if (! File::exists(sprintf('%s/%05d.part', $dir, $i))) {
                File::deleteDirectory($dir);
                throw ValidationException::withMessages(['video' => 'لم يكتمل رفع الفيديو، حاول مرة أخرى.']);
            }
        }

        $joined = $dir.'/video.bin';
        $out = fopen($joined, 'wb');
        for ($i = 0; $i < $total; $i++) {
            $in = fopen(sprintf('%s/%05d.part', $dir, $i), 'rb');
            stream_copy_to_stream($in, $out);
            fclose($in);
        }
        fclose($out);

        $sizeKb = (int) ceil(filesize($joined) / 1024);
        $mime = (string) (new \finfo(FILEINFO_MIME_TYPE))->file($joined);
        if ($sizeKb > (int) config('videos.max_kb')) {
            File::deleteDirectory($dir);
            throw ValidationException::withMessages(['video' => 'حجم الفيديو أكبر من الحد المسموح ('.(int) floor(config('videos.max_kb') / 1024).' ميجابايت).']);
        }
        if (! in_array($mime, self::ALLOWED_MIME, true)) {
            File::deleteDirectory($dir);
            throw ValidationException::withMessages(['video' => 'صيغة الفيديو غير مدعومة. استخدم MP4 أو WebM أو MOV.']);
        }

        $ext = match ($mime) {
            'video/webm' => 'webm',
            'video/quicktime' => 'mov',
            default => strtolower(pathinfo((string) $originalName, PATHINFO_EXTENSION)) === 'm4v' ? 'm4v' : 'mp4',
        };
        $path = trim($folder, '/').'/'.Str::uuid().'.'.$ext;
        $stream = fopen($joined, 'rb');
        Storage::disk(config('videos.disk', 'public'))->put($path, $stream);
        if (is_resource($stream)) {
            fclose($stream);
        }
        File::deleteDirectory($dir);

        return ['path' => $path, 'mime' => $mime, 'size_kb' => $sizeKb];
    }

    /** Remove pieces of uploads that were never finished. */
    public function pruneOlderThan(int $hours = 24): int
    {
        $root = storage_path('app/video-chunks');
        if (! File::isDirectory($root)) {
            return 0;
        }
        $removed = 0;
        foreach (File::directories($root) as $userDir) {
            foreach (File::directories($userDir) as $uploadDir) {
                if (File::lastModified($uploadDir) < now()->subHours($hours)->getTimestamp()) {
                    File::deleteDirectory($uploadDir);
                    $removed++;
                }
            }
        }

        return $removed;
    }

    private function assertUploadId(string $uploadId): void
    {
        if (! Str::isUuid($uploadId)) {
            throw ValidationException::withMessages(['upload_id' => 'معرّف الرفع غير صحيح.']);
        }
    }
}
