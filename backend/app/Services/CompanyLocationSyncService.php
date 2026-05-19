<?php

namespace App\Services;

use App\Models\City;
use App\Models\Company;

class CompanyLocationSyncService
{
    /**
     * When a company owner's profile city differs from the company record, align company to the user.
     */
    public function ensureCompanyMatchesUser(Company $company): Company
    {
        $company->loadMissing(['user.city.region', 'city', 'region']);

        $userCityId = $company->user?->city_id;
        if ($userCityId === null || (int) $userCityId <= 0) {
            return $company;
        }

        if ((int) $company->city_id === (int) $userCityId) {
            return $company;
        }

        $this->syncFromCityId($company, (int) $userCityId);

        return $company->fresh(['category', 'city', 'region', 'user', 'user.city', 'user.city.region']);
    }

    public function syncFromCityId(Company $company, ?int $cityId): void
    {
        if ($cityId === null || $cityId <= 0) {
            $company->forceFill([
                'city_id' => null,
                'region_id' => null,
            ])->save();

            return;
        }

        $city = City::query()->find($cityId);
        if (! $city) {
            return;
        }

        $company->forceFill([
            'city_id' => $city->id,
            'region_id' => $city->region_id,
        ])->save();
    }
}
