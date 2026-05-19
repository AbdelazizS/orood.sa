<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assistants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('job_role', 40);
            $table->string('status', 20)->default('active');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('deactivated_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'job_role']);
        });

        Schema::create('assistant_user_type', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assistant_id')->constrained()->cascadeOnDelete();
            $table->string('user_type', 30);
            $table->timestamps();

            $table->unique(['assistant_id', 'user_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assistant_user_type');
        Schema::dropIfExists('assistants');
    }
};
