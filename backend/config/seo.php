<?php

return [
    'site_url' => env('SEO_SITE_URL', env('APP_URL', 'https://www.arooth.com')),

    'defaults' => [
        'site_name' => 'عروض Arooth',
        'title_suffix' => ' | عروض Arooth',
        'meta_description' => 'أكبر حراج سعودي للمستعمل والجديد والجملة. بيع واشتري عقارات، سيارات، أثاث، إلكترونيات. اكتشف عروض سوق الجملة بخصومات تصل إلى 35% - انشر إعلانك مجاناً',
        'meta_keywords' => 'عروض، حراج، مستعمل، سوق الجملة، سيارات، عقارات، أثاث، إلكترونيات',
        'og_image' => '/logo.png',
        'twitter_site' => '@AroothPlatform',
        'robots' => 'index,follow',
        'geo_region' => 'SA',
        'geo_placename' => 'Saudi Arabia',
        'author' => 'Arooth Platform',
        'hreflang_default' => 'ar',
    ],

    'homepage' => [
        'page_key' => 'home',
        'seo_title' => 'عروض | سوق المستعمل والجديد وسعر الجملة في السعودية',
        'meta_description' => 'أكبر حراج سعودي للمستعمل والجديد والجملة. بيع واشتري عقارات، سيارات، أثاث، إلكترونيات. اكتشف عروض سوق الجملة بخصومات تصل إلى 35% - انشر إعلانك مجاناً',
        'priority' => 1.0,
        'changefreq' => 'daily',
    ],

    'main_pages' => [
        [
            'page_key' => 'wholesale',
            'path' => '/wholesale',
            'priority' => '0.95',
            'changefreq' => 'daily',
            'seo_title' => 'سوق الجملة | عروض',
            'meta_description' => 'اكتشف المنتجات بأسعار الجملة وخصومات تصل حتى 35%',
        ],
        [
            'page_key' => 'add',
            'path' => '/add',
            'priority' => '0.9',
            'changefreq' => 'daily',
            'seo_title' => 'أضف عرض أو طلب | عروض',
            'meta_description' => 'انشر عرضك أو طلبك بسهولة ووصل إلى آلاف العملاء',
        ],
        [
            'page_key' => 'requests',
            'path' => '/requests',
            'priority' => '0.85',
            'changefreq' => 'daily',
            'seo_title' => 'طلبات الشراء | عروض',
            'meta_description' => 'تصفح طلبات الشراء أو انشر طلبك مجاناً',
        ],
        ['page_key' => 'services', 'path' => '/services', 'priority' => '0.8', 'changefreq' => 'daily'],
        ['page_key' => 'listings_map', 'path' => '/listings/map', 'priority' => '0.75', 'changefreq' => 'weekly'],
        [
            'page_key' => 'contact',
            'path' => '/contact',
            'priority' => '0.7',
            'changefreq' => 'monthly',
            'seo_title' => 'تواصل معنا | عروض',
            'meta_description' => 'تواصل مع فريق عروض — استفسارات، دعم، ومساعدة خلال 24 ساعة',
        ],
        [
            'page_key' => 'help',
            'path' => '/help',
            'priority' => '0.7',
            'changefreq' => 'weekly',
            'seo_title' => 'مركز المساعدة | عروض',
            'meta_description' => 'أسئلة شائعة ودليل الشراء والبيع والجملة على منصة عروض',
        ],
        [
            'page_key' => 'login',
            'path' => '/login',
            'priority' => '0.55',
            'changefreq' => 'monthly',
            'robots' => 'index,follow',
            'seo_title' => 'تسجيل الدخول | عروض',
            'meta_description' => 'سجل دخولك للوصول إلى حسابك وإدارة عروضك وطلباتك',
        ],
        ['page_key' => 'register', 'path' => '/register', 'priority' => '0.5', 'changefreq' => 'monthly', 'robots' => 'noindex,follow'],
        ['page_key' => 'terms', 'path' => '/terms', 'priority' => '0.6', 'changefreq' => 'yearly'],
        ['page_key' => 'privacy', 'path' => '/privacy-policy', 'priority' => '0.6', 'changefreq' => 'yearly'],
        ['page_key' => 'refund', 'path' => '/refund-policy', 'priority' => '0.6', 'changefreq' => 'yearly'],
        ['page_key' => 'payment_policy', 'path' => '/payment-policy', 'priority' => '0.6', 'changefreq' => 'yearly'],
        ['page_key' => 'listing_policy', 'path' => '/listing-policy', 'priority' => '0.6', 'changefreq' => 'yearly'],
        ['page_key' => 'safety', 'path' => '/safety', 'priority' => '0.6', 'changefreq' => 'yearly'],
        ['page_key' => 'fees', 'path' => '/fees', 'priority' => '0.5', 'changefreq' => 'yearly'],
        ['page_key' => 'about', 'path' => '/about', 'priority' => '0.6', 'changefreq' => 'yearly'],
    ],

    'category_priority' => [
        'real-estate' => '0.95',
        'cars' => '0.95',
        'electronics' => '0.90',
        'furniture' => '0.90',
        'default_parent' => '0.85',
        'default_child' => '0.75',
    ],

    'schema_toggles' => [
        'website' => true,
        'organization' => true,
        'search_action' => true,
        'breadcrumbs' => true,
        'product' => true,
        'collection_page' => true,
        'faq' => true,
    ],

    'staff_roles' => ['super_admin', 'admin', 'manager', 'employee', 'moderator', 'assistant'],

    'marketplace_roles' => ['user', 'buyer', 'seller', 'company', 'marketer'],
];
