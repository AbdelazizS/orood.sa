<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->getLocalizedName($request->header('Accept-Language')),
            'icon' => $this->icon,
            'show_company_directory' => (bool) ($this->show_company_directory ?? false),
            'subcategories' => SubcategoryResource::collection($this->whenLoaded('subcategories')),
        ];
    }
}
