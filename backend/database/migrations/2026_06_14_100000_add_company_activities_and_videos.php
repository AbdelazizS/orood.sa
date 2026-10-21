<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Real-estate company activity: marketer / developer / seller (multi-select).
        Schema::table('companies', function (Blueprint $table) {
            if (! Schema::hasColumn('companies', 'activities')) {
                $table->json('activities')->nullable();
            }
        });

        // Company "channel" videos (YouTube-style): long videos + Shorts.
        if (! Schema::hasTable('company_videos')) {
            Schema::create('company_videos', function (Blueprint $table) {
                $table->id();
                $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
                $table->string('title', 150);
                $table->text('description')->nullable();
                $table->string('video_path', 500)->nullable();   // file on the public disk
                $table->string('video_url', 1000)->nullable();   // external URL (seeds / CDN)
                $table->string('thumbnail_url', 1000)->nullable();
                $table->unsignedInteger('duration_sec')->nullable();
                $table->boolean('is_short')->default(false);
                $table->unsignedInteger('views_count')->default(0);
                $table->unsignedInteger('likes_count')->default(0);
                $table->unsignedInteger('comments_count')->default(0);
                $table->string('status', 16)->default('published'); // published | hidden
                $table->string('hidden_reason', 500)->nullable();
                $table->timestamp('published_at')->nullable();
                $table->timestamps();
                $table->index(['company_id', 'status', 'is_short', 'published_at'], 'company_videos_channel_idx');
            });
        }

        if (! Schema::hasTable('company_video_likes')) {
            Schema::create('company_video_likes', function (Blueprint $table) {
                $table->id();
                $table->foreignId('company_video_id')->constrained('company_videos')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->timestamps();
                $table->unique(['company_video_id', 'user_id'], 'company_video_likes_unique');
            });
        }

        if (! Schema::hasTable('company_video_comments')) {
            Schema::create('company_video_comments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('company_video_id')->constrained('company_videos')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('parent_id')->nullable()->constrained('company_video_comments')->cascadeOnDelete();
                $table->text('body');
                $table->unsignedInteger('timestamp_sec')->nullable(); // "comment at this moment"
                $table->boolean('is_pinned')->default(false);
                $table->boolean('owner_hearted')->default(false);
                $table->boolean('is_hidden')->default(false);
                $table->unsignedInteger('likes_count')->default(0);
                $table->timestamps();
                $table->index(['company_video_id', 'parent_id', 'created_at'], 'company_video_comments_thread_idx');
            });
        }

        if (! Schema::hasTable('company_video_comment_likes')) {
            Schema::create('company_video_comment_likes', function (Blueprint $table) {
                $table->id();
                $table->foreignId('company_video_comment_id')->constrained('company_video_comments')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->timestamps();
                $table->unique(['company_video_comment_id', 'user_id'], 'company_video_comment_likes_unique');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('company_video_comment_likes');
        Schema::dropIfExists('company_video_comments');
        Schema::dropIfExists('company_video_likes');
        Schema::dropIfExists('company_videos');

        Schema::table('companies', function (Blueprint $table) {
            if (Schema::hasColumn('companies', 'activities')) {
                $table->dropColumn('activities');
            }
        });
    }
};
