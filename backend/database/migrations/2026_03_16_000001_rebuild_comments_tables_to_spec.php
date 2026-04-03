<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // SQLite-friendly rebuild to match spec.
        // NOTE: SQLite index names can collide after renames, so we copy then drop.
        $legacyLikes = Schema::hasTable('comment_likes') ? DB::table('comment_likes')->get() : collect();
        $legacyComments = Schema::hasTable('comments') ? DB::table('comments')->get() : collect();

        Schema::dropIfExists('comment_likes');
        Schema::dropIfExists('comments');

        Schema::create('comments', function (Blueprint $table) {
            $table->id();
            // Spec calls it listing_id; listings are products in this codebase.
            $table->foreignId('listing_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete(); // guest allowed
            $table->foreignId('parent_id')->nullable()->constrained('comments')->nullOnDelete(); // platform reply only
            $table->enum('type', ['REGULAR', 'BID', 'TEAM_REPLY'])->default('REGULAR');
            $table->text('body');
            $table->decimal('bid_amount', 10, 2)->nullable();
            $table->boolean('is_visible')->default(true);
            $table->unsignedInteger('likes_count')->default(0);
            $table->unsignedInteger('dislikes_count')->default(0);
            $table->timestamps();
            $table->index(['listing_id', 'created_at']);
            $table->index(['parent_id', 'created_at']);
            $table->index(['type', 'created_at']);
        });

        Schema::create('comment_likes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('comment_id')->constrained('comments')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->boolean('is_like'); // true like, false dislike
            $table->timestamps();
            $table->unique(['comment_id', 'user_id']);
        });

        foreach ($legacyComments as $c) {
            DB::table('comments')->insert([
                'id' => $c->id,
                'listing_id' => $c->product_id ?? $c->listing_id ?? null,
                'user_id' => $c->user_id ?? null,
                'parent_id' => $c->parent_id ?? null,
                'type' => in_array(($c->type ?? 'REGULAR'), ['REGULAR', 'BID', 'TEAM_REPLY'], true) ? $c->type : 'REGULAR',
                'body' => $c->body ?? '',
                'bid_amount' => $c->bid_amount ?? null,
                'is_visible' => (int) ($c->is_visible ?? 1) === 1,
                'likes_count' => (int) ($c->likes ?? $c->likes_count ?? 0),
                'dislikes_count' => (int) ($c->dislikes ?? $c->dislikes_count ?? 0),
                'created_at' => $c->created_at ?? now(),
                'updated_at' => $c->updated_at ?? now(),
            ]);
        }

        foreach ($legacyLikes as $l) {
            DB::table('comment_likes')->insert([
                'id' => $l->id,
                'comment_id' => $l->comment_id,
                'user_id' => $l->user_id,
                'is_like' => (int) $l->is_like === 1,
                'created_at' => $l->created_at ?? now(),
                'updated_at' => $l->updated_at ?? now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('comment_likes');
        Schema::dropIfExists('comments');
    }
};

