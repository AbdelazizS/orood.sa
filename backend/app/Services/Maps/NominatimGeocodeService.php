<?php

namespace App\Services\Maps;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class NominatimGeocodeService
{
    /**
     * @return list<array{label: string, lat: float, lng: float}>
     */
    public function search(string $query, string $language = 'ar'): array
    {
        $q = trim($query);
        if (mb_strlen($q) < 2) {
            return [];
        }

        $cacheKey = 'geocode:search:' . md5(mb_strtolower($q) . ':' . $language);

        return Cache::remember(
            $cacheKey,
            config('maps.geocode_cache_ttl', 3600),
            fn () => $this->fetchSearch($q, $language)
        );
    }

    /**
     * @return array{placeName: ?string, cityName: ?string, regionName: ?string}|null
     */
    public function reverse(float $lat, float $lng, string $language = 'ar'): ?array
    {
        if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
            return null;
        }

        $cacheKey = 'geocode:reverse:' . md5(round($lat, 5) . ':' . round($lng, 5) . ':' . $language);

        return Cache::remember(
            $cacheKey,
            config('maps.geocode_cache_ttl', 3600),
            fn () => $this->fetchReverse($lat, $lng, $language)
        );
    }

    /**
     * @return list<array{label: string, lat: float, lng: float}>
     */
    protected function fetchSearch(string $q, string $language): array
    {
        $base = config('maps.nominatim_base_url');
        $viewbox = config('maps.nominatim_viewbox');

        $params = [
            'format' => 'json',
            'q' => $q,
            'limit' => 5,
            'countrycodes' => 'sa',
            'accept-language' => $this->acceptLanguage($language),
        ];

        if (is_string($viewbox) && $viewbox !== '') {
            $params['viewbox'] = $viewbox;
            $params['bounded'] = 0;
        }

        $response = $this->http()->get("{$base}/search", $params);

        if (! $response->successful()) {
            return [];
        }

        $data = $response->json();
        if (! is_array($data)) {
            return [];
        }

        $results = [];
        foreach ($data as $item) {
            if (! is_array($item)) {
                continue;
            }
            $lat = isset($item['lat']) ? (float) $item['lat'] : null;
            $lng = isset($item['lon']) ? (float) $item['lon'] : null;
            $label = isset($item['display_name']) ? trim((string) $item['display_name']) : '';
            if ($lat === null || $lng === null || ! is_finite($lat) || ! is_finite($lng) || $label === '') {
                continue;
            }
            $results[] = [
                'label' => $label,
                'lat' => $lat,
                'lng' => $lng,
            ];
        }

        return $results;
    }

    /**
     * @return array{placeName: ?string, cityName: ?string, regionName: ?string}|null
     */
    protected function fetchReverse(float $lat, float $lng, string $language): ?array
    {
        $base = config('maps.nominatim_base_url');

        $response = $this->http()->get("{$base}/reverse", [
            'format' => 'json',
            'lat' => $lat,
            'lon' => $lng,
            'addressdetails' => 1,
            'accept-language' => $this->acceptLanguage($language),
        ]);

        if (! $response->successful()) {
            return null;
        }

        $data = $response->json();
        if (! is_array($data)) {
            return null;
        }

        $placeName = isset($data['display_name']) ? trim((string) $data['display_name']) : null;
        if ($placeName === '') {
            $placeName = null;
        }

        $addr = is_array($data['address'] ?? null) ? $data['address'] : [];
        $cityName = $addr['city'] ?? $addr['town'] ?? $addr['village'] ?? $addr['municipality'] ?? $addr['county'] ?? null;
        $regionName = $addr['state'] ?? $addr['region'] ?? null;

        if ($placeName === null && $cityName === null) {
            return null;
        }

        return [
            'placeName' => $placeName,
            'cityName' => $cityName !== null ? (string) $cityName : null,
            'regionName' => $regionName !== null ? (string) $regionName : null,
        ];
    }

    protected function http(): \Illuminate\Http\Client\PendingRequest
    {
        return Http::withHeaders([
            'Accept' => 'application/json',
            'User-Agent' => config('maps.nominatim_user_agent'),
        ])->timeout(12);
    }

    protected function acceptLanguage(string $language): string
    {
        return Str::startsWith(mb_strtolower($language), 'ar') ? 'ar,en' : 'en,ar';
    }
}
