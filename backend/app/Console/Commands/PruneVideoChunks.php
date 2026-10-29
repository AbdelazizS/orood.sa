<?php

namespace App\Console\Commands;

use App\Services\Videos\ChunkedVideoUploads;
use Illuminate\Console\Command;

class PruneVideoChunks extends Command
{
    protected $signature = 'uploads:prune-video-chunks {--hours=24}';

    protected $description = 'Delete pieces of video uploads that were never finished';

    public function handle(ChunkedVideoUploads $uploads): int
    {
        $this->info($uploads->pruneOlderThan((int) $this->option('hours')).' unfinished upload(s) removed.');

        return self::SUCCESS;
    }
}
