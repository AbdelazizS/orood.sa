<?php

namespace App\Services;

use App\Models\Assistant;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

class AssistantPermissionService
{
    /** @return list<string> */
    public function permissionsForUser(User $user): array
    {
        if ($user->role !== 'assistant') {
            return [];
        }

        $assistant = Assistant::query()
            ->where('user_id', $user->id)
            ->where('status', Assistant::STATUS_ACTIVE)
            ->first();

        if (! $assistant) {
            return [];
        }

        return Cache::remember(
            "assistant_permissions:{$assistant->id}",
            300,
            fn () => $this->permissionsForJobRole($assistant->job_role)
        );
    }

    /** @return list<string> */
    public function permissionsForJobRole(string $jobRole): array
    {
        $map = config('assistants.job_roles', []);

        return array_values(array_unique($map[$jobRole] ?? []));
    }

    public function forgetCacheForAssistant(Assistant $assistant): void
    {
        Cache::forget("assistant_permissions:{$assistant->id}");
        Cache::forget("user_permissions:{$assistant->user_id}");
    }
}
