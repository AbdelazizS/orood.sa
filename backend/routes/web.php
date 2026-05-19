<?php

use App\Http\Controllers\SitemapController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/sitemap.xml', [SitemapController::class, 'index']);
Route::get('/sitemap_index.xml', [SitemapController::class, 'indexAlt']);
Route::get('/sitemap_main.xml', [SitemapController::class, 'main']);
Route::get('/sitemap_categories.xml', [SitemapController::class, 'categories']);
Route::get('/sitemap_wholesale.xml', [SitemapController::class, 'wholesale']);
Route::get('/sitemap_companies.xml', [SitemapController::class, 'companies']);
Route::get('/sitemap_profiles.xml', [SitemapController::class, 'profiles']);
Route::get('/sitemap-static.xml', [SitemapController::class, 'staticMap']);
Route::get('/sitemap-listings-{chunk}.xml', [SitemapController::class, 'listingsChunk'])->where('chunk', '[0-9]+');
Route::get('/sitemap_listings_{chunk}.xml', [SitemapController::class, 'listingsChunk'])->where('chunk', '[0-9]+');
Route::get('/robots.txt', [SitemapController::class, 'robots']);
