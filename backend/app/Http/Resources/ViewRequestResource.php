<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Schema;

class ViewRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'requester_id' => $this->requester_id,
            'status' => $this->status,
            'scheduled_date' => $this->scheduled_date?->toIso8601String(),
            'location_lat' => $this->location_lat,
            'location_lng' => $this->location_lng,
            'location_address' => $this->location_address,
            ...(Schema::hasColumn('view_requests', 'location_place_id')
                ? ['location_place_id' => $this->location_place_id]
                : []),
            'seller_note' => $this->seller_note,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
            'product' => $this->whenLoaded('product', function () {
                return [
                    'id' => $this->product->id,
                    'title' => $this->product->title,
                    'status' => $this->product->status,
                ];
            }),
            'requester' => $this->whenLoaded('requester', function () {
                return [
                    'id' => $this->requester->id,
                    'name' => $this->requester->name,
                    'username' => $this->requester->username,
                ];
            }),
        ];
    }
}
