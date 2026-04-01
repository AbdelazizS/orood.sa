<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CompanyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'category' => $this->category?->name,
            'region' => $this->region?->name,
            'city' => $this->city?->name,
            'verification_status' => $this->verification_status,
            'rating' => $this->rating,
        ];
    }
}
