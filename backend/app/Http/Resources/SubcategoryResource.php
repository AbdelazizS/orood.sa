<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubcategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $children = $this->relationLoaded('childrenRecursive')
            ? $this->childrenRecursive
            : ($this->relationLoaded('children') ? $this->children : null);

        return [
            'id' => $this->id,
            'parent_id' => $this->parent_id,
            'name' => $this->getLocalizedName($request->header('Accept-Language')),
            'listing_property_type' => $this->listing_property_type,
            'has_children' => $this->resolveHasChildren($children),
            'children' => $children
                ? SubcategoryResource::collection($children)
                : [],
        ];
    }

    private function resolveHasChildren($children): bool
    {
        if (isset($this->children_count)) {
            return (bool) $this->children_count;
        }

        if ($children !== null) {
            return $children->isNotEmpty();
        }

        return false;
    }
}
