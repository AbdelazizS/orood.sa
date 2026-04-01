<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'username')) {
                $table->string('username')->nullable()->after('name');
            }
            if (!Schema::hasColumn('users', 'avatar_public_id')) {
                $table->string('avatar_public_id')->nullable()->after('avatar_url');
            }
            if (!Schema::hasColumn('users', 'cover_public_id')) {
                $table->string('cover_public_id')->nullable()->after('cover_photo_url');
            }
            if (!Schema::hasColumn('users', 'verification_method')) {
                $table->string('verification_method')->nullable()->after('verification_type'); // ABSHER | DOCUMENT | COMPANY
            }
            if (!Schema::hasColumn('users', 'verification_status')) {
                $table->string('verification_status')->nullable()->after('verification_method'); // PENDING | APPROVED | REJECTED
            }
        });

        // Populate username from name for existing users
        if (Schema::hasColumn('users', 'username')) {
            $users = DB::table('users')->whereNull('username')->get();
            foreach ($users as $u) {
                $base = Str::slug($u->name) ?: 'user';
                $username = $base;
                $i = 1;
                while (DB::table('users')->where('username', $username)->exists()) {
                    $username = $base . $i;
                    $i++;
                }
                DB::table('users')->where('id', $u->id)->update(['username' => $username]);
            }
            Schema::table('users', function (Blueprint $table) {
                $table->unique('username');
            });
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $cols = [];
            if (Schema::hasColumn('users', 'username')) $cols[] = 'username';
            if (Schema::hasColumn('users', 'avatar_public_id')) $cols[] = 'avatar_public_id';
            if (Schema::hasColumn('users', 'cover_public_id')) $cols[] = 'cover_public_id';
            if (Schema::hasColumn('users', 'verification_method')) $cols[] = 'verification_method';
            if (Schema::hasColumn('users', 'verification_status')) $cols[] = 'verification_status';
            if (!empty($cols)) $table->dropColumn($cols);
        });
    }
};
