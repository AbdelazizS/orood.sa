<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'company_verification_status')) {
                $table->string('company_verification_status', 30)
                    ->default('none')
                    ->after('role');
            }

            if (! Schema::hasColumn('users', 'company_verification_note')) {
                $table->text('company_verification_note')
                    ->nullable()
                    ->after('company_verification_status');
            }
        });

        Schema::table('companies', function (Blueprint $table) {
            if (! Schema::hasColumn('companies', 'license_public_id')) {
                $table->string('license_public_id')->nullable()->after('license_url');
            }

            if (! Schema::hasColumn('companies', 'rejection_reason')) {
                $table->text('rejection_reason')->nullable()->after('verification_status');
            }

            if (! Schema::hasColumn('companies', 'reviewed_by')) {
                $table->foreignId('reviewed_by')->nullable()->after('rejection_reason')->constrained('users')->nullOnDelete();
            }

            if (! Schema::hasColumn('companies', 'reviewed_at')) {
                $table->timestamp('reviewed_at')->nullable()->after('reviewed_by');
            }
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            if (Schema::hasColumn('companies', 'reviewed_by')) {
                $table->dropConstrainedForeignId('reviewed_by');
            }
            if (Schema::hasColumn('companies', 'reviewed_at')) {
                $table->dropColumn('reviewed_at');
            }
            if (Schema::hasColumn('companies', 'rejection_reason')) {
                $table->dropColumn('rejection_reason');
            }
            if (Schema::hasColumn('companies', 'license_public_id')) {
                $table->dropColumn('license_public_id');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'company_verification_note')) {
                $table->dropColumn('company_verification_note');
            }
            if (Schema::hasColumn('users', 'company_verification_status')) {
                $table->dropColumn('company_verification_status');
            }
        });
    }
};
