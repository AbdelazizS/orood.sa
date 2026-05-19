<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\CategoryListingPolicy;
use App\Models\CategoryListingSchema;
use App\Models\CategorySchemaField;
use App\Models\CategorySchemaSection;
use App\Models\ListingAgreement;
use App\Services\Listings\ListingSchemaService;
use Illuminate\Database\Seeder;

class CategoryListingSchemaSeeder extends Seeder
{
    private const BUILT_TYPES = ['apartment', 'villa', 'building', 'floor', 'shop'];

    private const LAND_TYPES = ['land', 'farm'];

    private const FLOOR_TYPES = ['apartment', 'floor'];

    public function run(): void
    {
        $this->seedRealEstate();
        $this->seedVehicles();
        $this->seedElectronics();
    }

    private function seedRealEstate(): void
    {
        $category = Category::query()->where('slug', 'real-estate')->first();
        if (! $category) {
            return;
        }

        $category->update(['dynamic_schema_enabled' => true]);

        $schema = $this->syncPublishedSchema($category->id, null, 'offer');

        $specsSection = $this->upsertSection($schema->id, 'property_specs', 'مواصفات العقار', 'Property specifications', 0);
        $featuresSection = $this->upsertSection($schema->id, 'features', 'المميزات', 'Features', 1);

        $this->pruneOrphanSections($schema->id, ['property_specs', 'features']);

        $builtWhen = ['property_type' => self::BUILT_TYPES];
        $landWhen = ['property_type' => self::LAND_TYPES];
        $floorWhen = ['property_type' => self::FLOOR_TYPES];
        $furnishedWhen = ['purpose' => 'rent', 'property_type' => self::BUILT_TYPES];

        $this->syncFields($schema->id, $specsSection->id, [
            [
                'purpose',
                'select',
                'الغرض',
                'Purpose',
                true,
                [
                    ['value' => 'sale', 'label_ar' => 'للبيع', 'label_en' => 'For sale'],
                    ['value' => 'rent', 'label_ar' => 'للإيجار', 'label_en' => 'For rent'],
                ],
                null,
                0,
            ],
            [
                'property_type',
                'select',
                'نوع العقار',
                'Property type',
                true,
                [
                    ['value' => 'apartment', 'label_ar' => 'شقة', 'label_en' => 'Apartment'],
                    ['value' => 'villa', 'label_ar' => 'فيلا', 'label_en' => 'Villa'],
                    ['value' => 'land', 'label_ar' => 'أرض', 'label_en' => 'Land'],
                    ['value' => 'building', 'label_ar' => 'عمارة', 'label_en' => 'Building'],
                    ['value' => 'floor', 'label_ar' => 'دور', 'label_en' => 'Floor'],
                    ['value' => 'shop', 'label_ar' => 'محل', 'label_en' => 'Shop'],
                    ['value' => 'farm', 'label_ar' => 'مزرعة', 'label_en' => 'Farm'],
                ],
                null,
                1,
            ],
            ['area_sqm', 'number', 'المساحة (م²)', 'Area (sqm)', true, [], $builtWhen, 2],
            ['land_width_m', 'number', 'عرض الأرض (م)', 'Land width (m)', true, [], $landWhen, 3],
            ['land_length_m', 'number', 'طول الأرض (م)', 'Land length (m)', true, [], $landWhen, 4],
            ['street_width_m', 'number', 'عرض الشارع (م)', 'Street width (m)', false, [], $landWhen, 5],
            ['bedrooms', 'number', 'غرف النوم', 'Bedrooms', false, [], $builtWhen, 6],
            ['bathrooms', 'number', 'دورات المياه', 'Bathrooms', false, [], $builtWhen, 7],
            ['property_age_years', 'number', 'عمر العقار (سنة)', 'Property age (years)', false, [], null, 8],
            ['furnished', 'switch', 'مفروش', 'Furnished', false, [], $furnishedWhen, 9],
            ['floor_number', 'number', 'رقم الطابق', 'Floor number', false, [], $floorWhen, 10],
            ['total_floors', 'number', 'عدد الطوابق', 'Total floors', false, [], $floorWhen, 11],
            [
                'property_direction',
                'select',
                'اتجاه العقار',
                'Property direction',
                false,
                [
                    ['value' => 'north', 'label_ar' => 'شمال', 'label_en' => 'North'],
                    ['value' => 'south', 'label_ar' => 'جنوب', 'label_en' => 'South'],
                    ['value' => 'east', 'label_ar' => 'شرق', 'label_en' => 'East'],
                    ['value' => 'west', 'label_ar' => 'غرب', 'label_en' => 'West'],
                ],
                null,
                12,
            ],
        ]);

        $amenityFields = [
            ['parking', 'موقف سيارة', 'Parking'],
            ['elevator', 'مصعد', 'Elevator'],
            ['pool', 'مسبح', 'Pool'],
            ['garden', 'حديقة', 'Garden'],
            ['internet', 'إنترنت', 'Internet'],
            ['electricity', 'كهرباء', 'Electricity'],
            ['water', 'ماء', 'Water'],
            ['kitchen', 'مطبخ راكب', 'Built-in kitchen'],
            ['air_conditioning', 'تكييف', 'Air conditioning'],
            ['security', 'أمن', 'Security'],
        ];

        $featureRows = [];
        foreach ($amenityFields as $i => [$key, $labelAr, $labelEn]) {
            $featureRows[] = [$key, 'switch', $labelAr, $labelEn, false, [], null, $i];
        }

        $this->syncFields($schema->id, $featuresSection->id, $featureRows);

        $this->upsertPolicy($schema->id, [
            'location_policy' => ['mode' => 'exact_map', 'required' => true],
            'price_policy' => ['modes' => ['fixed', 'negotiable', 'bid'], 'default' => 'fixed'],
            'media_policy' => ['max_images' => 15, 'min_images' => 1, 'video' => false],
            'communication_policy' => ['methods' => ['phone', 'messages', 'whatsapp']],
        ]);

        $this->upsertAgreement($schema->id, $category->id);
    }

    private function seedVehicles(): void
    {
        $category = Category::query()->where('slug', 'cars')->first();
        if (! $category) {
            return;
        }

        $category->update(['dynamic_schema_enabled' => true]);
        $schema = $this->syncPublishedSchema($category->id, null, 'offer');
        $section = $this->upsertSection($schema->id, 'vehicle_details', 'تفاصيل المركبة', 'Vehicle details', 0);
        $this->pruneOrphanSections($schema->id, ['vehicle_details']);

        $this->syncFields($schema->id, $section->id, [
            ['brand', 'text', 'الماركة', 'Brand', true, [], null, 0],
            ['model', 'text', 'الموديل', 'Model', true, [], null, 1],
            ['year', 'number', 'سنة الصنع', 'Year', true, [], null, 2],
            ['mileage', 'number', 'الممشى (كم)', 'Mileage', false, [], null, 3],
            [
                'transmission',
                'select',
                'ناقل الحركة',
                'Transmission',
                false,
                [
                    ['value' => 'automatic', 'label_ar' => 'أوتوماتيك', 'label_en' => 'Automatic'],
                    ['value' => 'manual', 'label_ar' => 'يدوي', 'label_en' => 'Manual'],
                ],
                null,
                4,
            ],
        ]);

        $this->upsertPolicy($schema->id, [
            'location_policy' => ['mode' => 'city_only', 'required' => true],
        ]);
    }

    private function seedElectronics(): void
    {
        $category = Category::query()->where('slug', 'electronics')->first();
        if (! $category) {
            return;
        }

        $category->update(['dynamic_schema_enabled' => true]);
        $schema = $this->syncPublishedSchema($category->id, null, 'offer');
        $section = $this->upsertSection($schema->id, 'device_details', 'تفاصيل الجهاز', 'Device details', 0);
        $this->pruneOrphanSections($schema->id, ['device_details']);

        $conditionOptions = [
            ['value' => 'new', 'label_ar' => 'جديد', 'label_en' => 'New'],
            ['value' => 'like_new', 'label_ar' => 'كالجديد', 'label_en' => 'Like new'],
            ['value' => 'good', 'label_ar' => 'جيد', 'label_en' => 'Good'],
            ['value' => 'fair', 'label_ar' => 'مقبول', 'label_en' => 'Fair'],
            ['value' => 'for_parts', 'label_ar' => 'للقطع', 'label_en' => 'For parts'],
        ];

        $this->syncFields($schema->id, $section->id, [
            ['brand', 'text', 'الماركة', 'Brand', true, [], null, 0],
            [
                'condition',
                'select',
                'الحالة',
                'Condition',
                true,
                $conditionOptions,
                null,
                1,
            ],
            ['warranty', 'switch', 'ضمان', 'Warranty', false, [], null, 2],
            ['storage', 'text', 'السعة/التخزين', 'Storage', false, [], null, 3],
        ]);

        $this->upsertPolicy($schema->id, [
            'location_policy' => ['mode' => 'region_only', 'required' => true],
        ]);
    }

    private function syncPublishedSchema(int $categoryId, ?int $subcategoryId, string $type): CategoryListingSchema
    {
        $schema = CategoryListingSchema::query()->firstOrCreate(
            [
                'category_id' => $categoryId,
                'subcategory_id' => $subcategoryId,
                'listing_type' => $type,
                'status' => CategoryListingSchema::STATUS_PUBLISHED,
            ],
            [
                'version' => 1,
                'published_at' => now(),
            ]
        );

        if (! $schema->published_at) {
            $schema->update(['published_at' => now(), 'version' => max(1, (int) $schema->version)]);
        }

        $defaults = app(ListingSchemaService::class)->defaultPolicies();
        CategoryListingPolicy::query()->firstOrCreate(
            ['schema_id' => $schema->id],
            [
                'location_policy' => $defaults['location'],
                'price_policy' => $defaults['price'],
                'media_policy' => $defaults['media'],
                'communication_policy' => $defaults['communication'],
            ]
        );

        return $schema->fresh();
    }

    private function upsertSection(int $schemaId, string $key, string $titleAr, string $titleEn, int $sortOrder): CategorySchemaSection
    {
        return CategorySchemaSection::query()->updateOrCreate(
            ['schema_id' => $schemaId, 'section_key' => $key],
            ['title_ar' => $titleAr, 'title_en' => $titleEn, 'sort_order' => $sortOrder]
        );
    }

    /**
     * @param  list<string>  $keepKeys
     */
    private function pruneOrphanSections(int $schemaId, array $keepKeys): void
    {
        CategorySchemaSection::query()
            ->where('schema_id', $schemaId)
            ->whereNotIn('section_key', $keepKeys)
            ->each(function (CategorySchemaSection $section) {
                CategorySchemaField::query()->where('section_id', $section->id)->delete();
                $section->delete();
            });
    }

    /**
     * @param  array<int, array{0: string, 1: string, 2: string, 3: string, 4: bool, 5: array, 6: ?array, 7: int}>  $fields
     */
    private function syncFields(int $schemaId, int $sectionId, array $fields): void
    {
        $keys = [];
        foreach ($fields as $row) {
            [$key, $type, $labelAr, $labelEn, $required, $options, $visibleWhen, $sortOrder] = $row;
            $keys[] = $key;
            CategorySchemaField::query()->updateOrCreate(
                ['schema_id' => $schemaId, 'field_key' => $key],
                [
                    'section_id' => $sectionId,
                    'field_type' => $type,
                    'label_ar' => $labelAr,
                    'label_en' => $labelEn,
                    'required' => $required,
                    'options' => $options,
                    'visible_when' => $visibleWhen,
                    'sort_order' => $sortOrder,
                ]
            );
        }

        CategorySchemaField::query()
            ->where('schema_id', $schemaId)
            ->where('section_id', $sectionId)
            ->whereNotIn('field_key', $keys)
            ->delete();
    }

    /**
     * @param  array<string, mixed>  $policies
     */
    private function upsertPolicy(int $schemaId, array $policies): void
    {
        $policy = CategoryListingPolicy::query()->firstOrCreate(['schema_id' => $schemaId]);
        $policy->update($policies);
    }

    private function upsertAgreement(int $schemaId, int $categoryId): void
    {
        ListingAgreement::query()->updateOrCreate(
            [
                'schema_id' => $schemaId,
                'category_id' => $categoryId,
                'sort_order' => 0,
            ],
            [
                'content_ar' => 'أقر بصحة بيانات العقار المعروضة وأنني مخول بنشر هذا الإعلان.',
                'content_en' => 'I confirm the listing details are accurate and I am authorized to publish.',
                'required' => true,
            ]
        );
    }
}
