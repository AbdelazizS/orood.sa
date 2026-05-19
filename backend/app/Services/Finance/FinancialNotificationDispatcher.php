<?php

namespace App\Services\Finance;

use App\Models\FinancialRequest;
use App\Models\Notification;
use App\Models\Permission;
use App\Models\Product;
use App\Models\SellerPayoutProfile;
use App\Models\User;
use App\Support\InAppNotificationPayload;

class FinancialNotificationDispatcher
{
    public function requestSubmitted(FinancialRequest $request): void
    {
        $permission = match ($request->type) {
            FinancialRequest::TYPE_WALLET_CHARGE => 'finance.approve_charge',
            FinancialRequest::TYPE_WALLET_WITHDRAW => 'finance.approve_withdrawal',
            FinancialRequest::TYPE_GUARANTEE_DEPOSIT, FinancialRequest::TYPE_GUARANTEE_REFUND => 'compliance.review_guarantee_requests',
            default => 'finance.approve_charge',
        };

        foreach (Permission::userIdsHavingPermission($permission) as $staffId) {
            Notification::create([
                'user_id' => $staffId,
                'type' => 'financial_request_pending',
                'title' => __('finance.notification.pending_staff_title'),
                'body' => __('finance.notification.pending_staff_body', [
                    'type' => $request->type,
                    'amount' => $request->amount,
                ]),
                'data' => ['financial_request_id' => $request->id, 'type' => $request->type],
            ]);
        }
    }

    public function requestApproved(FinancialRequest $request): void
    {
        Notification::create([
            'user_id' => $request->user_id,
            'type' => 'financial_request_approved',
            'title' => __('finance.notification.approved_title'),
            'body' => __('finance.notification.approved_body'),
            'data' => ['financial_request_id' => $request->id],
        ]);
    }

    public function requestRejected(FinancialRequest $request): void
    {
        Notification::create([
            'user_id' => $request->user_id,
            'type' => 'financial_request_rejected',
            'title' => __('finance.notification.rejected_title'),
            'body' => $request->rejection_reason ?? __('finance.notification.rejected_body'),
            'data' => ['financial_request_id' => $request->id],
        ]);
    }

    public function payoutProfileVerified(User $user): void
    {
        Notification::create(InAppNotificationPayload::payoutProfileVerified($user->id));
    }

    public function payoutProfilePendingReview(SellerPayoutProfile $profile): void
    {
        $seller = $profile->user;
        $sellerLabel = $seller?->name ?? $seller?->email ?? (string) $profile->user_id;

        foreach (Permission::userIdsHavingPermission('finance.approve_charge') as $staffId) {
            Notification::create(InAppNotificationPayload::payoutProfilePendingReview(
                $staffId,
                (int) $profile->user_id,
                $sellerLabel,
            ));
        }
    }

    public function payoutProfileRejected(User $user, string $reason): void
    {
        Notification::create(InAppNotificationPayload::payoutProfileRejected($user->id, $reason));
    }

    public function listingPendingActivation(User $user, Product $product): void
    {
        Notification::create(InAppNotificationPayload::listingPendingActivation($product, $user->id));
    }

    /**
     * Staff compliance review of transfer receipt — does not advance the order for buyers/sellers.
     */
    public function orderPaymentComplianceReviewed(\App\Models\OrderPaymentRequest $request): void
    {
        // Optional: staff-only audit log via notification — no customer-facing status change.
    }

    /** @deprecated Use orderPaymentComplianceReviewed — kept for callers during transition */
    public function orderPaymentApproved(\App\Models\OrderPaymentRequest $request): void
    {
        $this->orderPaymentComplianceReviewed($request);
    }
}
