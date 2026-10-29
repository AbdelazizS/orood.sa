<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Every account gets a unique 6-digit number (رقم الحساب) — shown on the profile and searchable by admins.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'account_number')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('account_number', 6)->nullable()->unique('users_account_number_unique');
            });
        }

        DB::table('users')->whereNull('account_number')->orderBy('id')->select('id')
            ->chunkById(500, function ($rows) {
                foreach ($rows as $row) {
                    DB::table('users')->where('id', $row->id)->update(['account_number' => User::generateAccountNumber()]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique('users_account_number_unique');
            $table->dropColumn('account_number');
        });
    }
};
