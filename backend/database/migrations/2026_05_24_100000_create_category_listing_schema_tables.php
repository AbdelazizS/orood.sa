<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            if (! Schema::hasColumn('categories', 'image_url')) {
                $table->string('image_url', 500)->nullable()->after('icon');
            }
            if (! Schema::hasColumn('categories', 'sort_order')) {
                $table->unsignedSmallInteger('sort_order')->default(0)->after('is_active');
            }
            if (! Schema::hasColumn('categories', 'offer_enabled')) {
                $table->boolean('offer_enabled')->default(true)->after('sort_order');
            }
            if (! Schema::hasColumn('categories', 'request_enabled')) {
                $table->boolean('request_enabled')->default(true)->after('offer_enabled');
            }
            if (! Schema::hasColumn('categories', 'wholesale_enabled')) {
                $table->boolean('wholesale_enabled')->default(false)->after('request_enabled');
            }
            if (! Schema::hasColumn('categories', 'role_restrictions')) {
                $table->json('role_restrictions')->nullable()->after('wholesale_enabled');
            }
            if (! Schema::hasColumn('categories', 'dynamic_schema_enabled')) {
                $table->boolean('dynamic_schema_enabled')->default(false)->after('role_restrictions');
            }
            if (! Schema::hasColumn('categories', 'parent_id')) {
                $table->foreignId('parent_id')->nullable()->after('id')->constrained('categories')->nullOnDelete();
            }
        });

        Schema::create('category_listing_schemas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subcategory_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('listing_type', 16)->default('offer');
            $table->unsignedInteger('version')->default(1);
            $table->string('status', 16)->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(
                ['category_id', 'subcategory_id', 'listing_type', 'status'],
                'cls_cat_sub_type_status_idx',
            );
        });

        Schema::create('category_schema_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schema_id')->constrained('category_listing_schemas')->cascadeOnDelete();
            $table->string('section_key', 64);
            $table->string('title_ar');
            $table->string('title_en')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->json('visible_when')->nullable();
            $table->timestamps();

            $table->unique(['schema_id', 'section_key']);
        });

        Schema::create('category_schema_fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schema_id')->constrained('category_listing_schemas')->cascadeOnDelete();
            $table->foreignId('section_id')->nullable()->constrained('category_schema_sections')->nullOnDelete();
            $table->string('field_key', 64);
            $table->string('field_type', 32);
            $table->string('label_ar');
            $table->string('label_en')->nullable();
            $table->string('placeholder_ar')->nullable();
            $table->string('placeholder_en')->nullable();
            $table->string('help_ar')->nullable();
            $table->string('help_en')->nullable();
            $table->boolean('required')->default(false);
            $table->json('validation_rules')->nullable();
            $table->json('options')->nullable();
            $table->json('visible_when')->nullable();
            $table->json('config_json')->nullable();
            $table->json('role_restrictions')->nullable();
            $table->boolean('searchable')->default(false);
            $table->boolean('filterable')->default(false);
            $table->boolean('show_on_card')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['schema_id', 'field_key']);
        });

        Schema::create('category_field_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('field_id')->constrained('category_schema_fields')->cascadeOnDelete();
            $table->string('value', 128);
            $table->string('label_ar');
            $table->string('label_en')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('category_listing_policies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schema_id')->unique()->constrained('category_listing_schemas')->cascadeOnDelete();
            $table->json('location_policy')->nullable();
            $table->json('price_policy')->nullable();
            $table->json('media_policy')->nullable();
            $table->json('communication_policy')->nullable();
            $table->timestamps();
        });

        Schema::create('listing_agreements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schema_id')->nullable()->constrained('category_listing_schemas')->cascadeOnDelete();
            $table->foreignId('category_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('listing_type', 16)->nullable();
            $table->string('role', 32)->nullable();
            $table->string('country', 8)->default('SA');
            $table->text('content_ar');
            $table->text('content_en')->nullable();
            $table->boolean('required')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('category_schema_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('schema_id')->constrained('category_listing_schemas')->cascadeOnDelete();
            $table->string('action', 32);
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('diff')->nullable();
            $table->timestamps();
        });

        Schema::create('category_children', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->constrained('categories')->cascadeOnDelete();
            $table->foreignId('child_id')->constrained('categories')->cascadeOnDelete();
            $table->unsignedTinyInteger('depth')->default(1);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['parent_id', 'child_id']);
        });

        if (Schema::hasTable('listing_attribute_values') && ! Schema::hasColumn('listing_attribute_values', 'category_schema_field_id')) {
            Schema::table('listing_attribute_values', function (Blueprint $table) {
                $table->foreignId('category_schema_field_id')
                    ->nullable()
                    ->after('category_field_definition_id')
                    ->constrained('category_schema_fields')
                    ->cascadeOnDelete();
            });
        }

        $this->migrateLegacyFieldDefinitions();
    }

    public function down(): void
    {
        if (Schema::hasColumn('listing_attribute_values', 'category_schema_field_id')) {
            Schema::table('listing_attribute_values', function (Blueprint $table) {
                $table->dropConstrainedForeignId('category_schema_field_id');
            });
        }

        Schema::dropIfExists('category_children');
        Schema::dropIfExists('category_schema_audit_logs');
        Schema::dropIfExists('listing_agreements');
        Schema::dropIfExists('category_listing_policies');
        Schema::dropIfExists('category_field_options');
        Schema::dropIfExists('category_schema_fields');
        Schema::dropIfExists('category_schema_sections');
        Schema::dropIfExists('category_listing_schemas');

        Schema::table('categories', function (Blueprint $table) {
            foreach (['image_url', 'sort_order', 'offer_enabled', 'request_enabled', 'wholesale_enabled', 'role_restrictions', 'dynamic_schema_enabled', 'parent_id'] as $col) {
                if (Schema::hasColumn('categories', $col)) {
                    if ($col === 'parent_id') {
                        $table->dropConstrainedForeignId('parent_id');
                    } else {
                        $table->dropColumn($col);
                    }
                }
            }
        });
    }

    private function migrateLegacyFieldDefinitions(): void
    {
        if (! Schema::hasTable('category_field_definitions')) {
            return;
        }

        $definitions = DB::table('category_field_definitions')->orderBy('category_id')->orderBy('sort_order')->get();
        if ($definitions->isEmpty()) {
            return;
        }

        $grouped = $definitions->groupBy(fn ($row) => $row->category_id.'|'.($row->subcategory_id ?? 'null'));

        foreach ($grouped as $key => $rows) {
            $first = $rows->first();
            $schemaId = DB::table('category_listing_schemas')->insertGetId([
                'category_id' => $first->category_id,
                'subcategory_id' => $first->subcategory_id,
                'listing_type' => 'offer',
                'version' => 1,
                'status' => 'published',
                'published_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $sectionId = DB::table('category_schema_sections')->insertGetId([
                'schema_id' => $schemaId,
                'section_key' => 'details',
                'title_ar' => 'التفاصيل',
                'title_en' => 'Details',
                'sort_order' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            foreach ($rows as $row) {
                DB::table('category_schema_fields')->insert([
                    'schema_id' => $schemaId,
                    'section_id' => $sectionId,
                    'field_key' => $row->field_key,
                    'field_type' => $row->field_type,
                    'label_ar' => $row->label_ar,
                    'label_en' => $row->label_en,
                    'required' => false,
                    'validation_rules' => $row->validation_rules,
                    'options' => $row->options,
                    'filterable' => (bool) $row->filterable,
                    'show_on_card' => (bool) $row->show_on_card,
                    'sort_order' => $row->sort_order,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }
};
