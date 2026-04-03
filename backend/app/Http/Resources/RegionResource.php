<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RegionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->getLocalizedName($request->header('Accept-Language')),
            'cities' => CityResource::collection($this->whenLoaded('cities')),
        ];
    }
}
