<?php

namespace App\Console\Commands;

use App\Services\CompanyVerificationApprovalService;
use Illuminate\Console\Command;

class NormalizeCompanyVerificationStatus extends Command
{
    protected $signature = 'companies:normalize-verification-status';

    protected $description = 'Upgrade legacy companies.verification_status "verified" to approved for wholesale access';

    public function handle(CompanyVerificationApprovalService $approval): int
    {
        $count = $approval->normalizeLegacyVerifiedStatus();

        $this->info("Normalized {$count} company record(s).");

        return self::SUCCESS;
    }
}
