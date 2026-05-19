<?php

namespace App\Services;

use App\Models\Company;
use App\Models\User;

class CompanyVerificationApprovalService
{
    public function approve(Company $company, ?int $reviewedBy = null): void
    {
        $company->forceFill([
            'verification_status' => 'approved',
            'rejection_reason' => null,
            'reviewed_by' => $reviewedBy,
            'reviewed_at' => now(),
        ])->save();

        $user = $company->user;
        if ($user) {
            $user->forceFill([
                'role' => 'company',
                'company_verification_status' => 'approved',
                'company_verification_note' => null,
            ])->save();
        }
    }

    /**
     * Legacy document flow stored companies.verification_status as "verified".
     */
    public function normalizeLegacyVerifiedStatus(): int
    {
        $count = 0;

        Company::query()
            ->where('verification_status', 'verified')
            ->with('user')
            ->chunkById(50, function ($companies) use (&$count) {
                foreach ($companies as $company) {
                    $this->approve($company);
                    $count++;
                }
            });

        return $count;
    }
}
