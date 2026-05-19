<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssistantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $this->user;

        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'full_name' => $user?->name,
            'email' => $user?->email,
            'phone' => $user?->phone,
            'job_role' => $this->job_role,
            'assigned_user_types' => $this->assignedUserTypes(),
            'status' => $this->status,
            'created_at' => $this->created_at?->toIso8601String(),
            'deactivated_at' => $this->deactivated_at?->toIso8601String(),
            'last_login_at' => $user?->last_login_at?->toIso8601String(),
            'created_by' => $this->created_by,
        ];
    }
}
