<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\File;
use Symfony\Component\HttpFoundation\Response;

class SitemapController extends Controller
{
    public function index(): Response
    {
        return $this->file('sitemap.xml');
    }

    public function indexAlt(): Response
    {
        return $this->file('sitemap_index.xml');
    }

    public function main(): Response
    {
        return $this->file('sitemap_main.xml');
    }

    public function categories(): Response
    {
        return $this->file('sitemap_categories.xml');
    }

    public function wholesale(): Response
    {
        return $this->file('sitemap_wholesale.xml');
    }

    public function companies(): Response
    {
        return $this->file('sitemap_companies.xml');
    }

    public function profiles(): Response
    {
        return $this->file('sitemap_profiles.xml');
    }

    /** @deprecated */
    public function staticMap(): Response
    {
        return $this->file('sitemap-static.xml');
    }

    public function listingsChunk(string $chunk): Response
    {
        if (File::exists(public_path("sitemap_listings_{$chunk}.xml"))) {
            return $this->file("sitemap_listings_{$chunk}.xml");
        }

        return $this->file("sitemap-listings-{$chunk}.xml");
    }

    public function robots(): Response
    {
        return $this->file('robots.txt', 'text/plain; charset=UTF-8');
    }

    private function file(string $name, string $contentType = 'application/xml; charset=UTF-8'): Response
    {
        $path = public_path($name);
        if (! File::exists($path)) {
            abort(404);
        }

        return response(File::get($path), 200, [
            'Content-Type' => $contentType,
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }
}
