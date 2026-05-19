<?php

namespace App\Support;

use App\Models\ChargeRequest;
use App\Models\DocumentVerification;
use App\Models\GuaranteeRequest;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Task;
use App\Models\User;
use App\Models\WithdrawalRequest;

/**
 * Structured notification data for the SPA (i18n keys + deep links).
 */
class InAppNotificationPayload
{
    private static function safeProductTitle(Product $product): string
    {
        $title = trim((string) ($product->title ?? ''));

        return $title !== '' ? $title : 'Listing';
    }

    public static function bidNew(Product $product, int $bidId, float $amount, int $buyerId): array
    {
        $title = (string) round($amount);
        $productTitle = self::safeProductTitle($product);

        return [
            'user_id' => $product->user_id,
            'type' => 'bid_new',
            'title' => 'New bid received',
            'body' => 'A buyer submitted a new bid on your listing.',
            'data' => [
                'i18n_title_key' => 'notifications.types.bid_new.title',
                'i18n_body_key' => 'notifications.types.bid_new.body',
                'i18n_params' => [
                    'productTitle' => $productTitle,
                    'amount' => $title,
                ],
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.openListing',
                        'href' => '/products/'.$product->id,
                        'intent' => 'open_listing',
                    ],
                    [
                        'i18n_label_key' => 'notifications.actions.openBids',
                        'href' => '/products/'.$product->id.'#bids-section',
                        'intent' => 'open_bids',
                    ],
                ],
                'product_id' => $product->id,
                'bid_id' => $bidId,
                'amount' => $amount,
                'buyer_id' => $buyerId,
            ],
        ];
    }

    public static function viewRequestNew(Product $product, int $viewRequestId, int $requesterId, ?string $scheduledDateIso = null): array
    {
        $productTitle = self::safeProductTitle($product);

        return [
            'user_id' => $product->user_id,
            'type' => 'view_request_new',
            'title' => 'New view-at-location request',
            'body' => 'A buyer requested to view the product at their location.',
            'data' => [
                'i18n_title_key' => 'notifications.types.view_request_new.title',
                'i18n_body_key' => 'notifications.types.view_request_new.body',
                'i18n_params' => [
                    'productTitle' => $productTitle,
                ],
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.manageViewRequests',
                        'href' => '/dashboard/view-requests?tab=incoming&focus='.$viewRequestId,
                        'intent' => 'open_view_requests',
                        'primary' => true,
                    ],
                    [
                        'i18n_label_key' => 'notifications.actions.openListing',
                        'href' => '/products/'.$product->id,
                        'intent' => 'open_listing',
                    ],
                ],
                'product_id' => $product->id,
                'view_request_id' => $viewRequestId,
                'requester_id' => $requesterId,
                'scheduled_date' => $scheduledDateIso,
            ],
        ];
    }

    public static function viewRequestCancelled(Product $product, int $viewRequestId): array
    {
        $productTitle = self::safeProductTitle($product);

        return [
            'user_id' => $product->user_id,
            'type' => 'view_request_cancelled',
            'title' => 'View request cancelled',
            'body' => 'The buyer cancelled a view-at-location request.',
            'data' => [
                'i18n_title_key' => 'notifications.types.view_request_cancelled.title',
                'i18n_body_key' => 'notifications.types.view_request_cancelled.body',
                'i18n_params' => [
                    'productTitle' => $productTitle,
                ],
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.openListing',
                        'href' => '/products/'.$product->id,
                        'intent' => 'open_listing',
                    ],
                    [
                        'i18n_label_key' => 'notifications.actions.manageViewRequests',
                        'href' => '/dashboard/view-requests?tab=incoming',
                        'intent' => 'open_view_requests',
                    ],
                ],
                'product_id' => $product->id,
                'view_request_id' => $viewRequestId,
            ],
        ];
    }

    /**
     * Buyer receives approve/decline on their outgoing request.
     */
    public static function viewRequestDecisionForBuyer(Product $product, int $viewRequestId, int $buyerUserId, string $status): array
    {
        $isApproved = $status === 'APPROVED';
        $type = $isApproved ? 'view_request_approved' : 'view_request_declined';
        $productTitle = self::safeProductTitle($product);

        return [
            'user_id' => $buyerUserId,
            'type' => $type,
            'title' => $isApproved ? 'View request approved' : 'View request declined',
            'body' => $isApproved
                ? 'The seller approved your view-at-location request.'
                : 'The seller declined your view-at-location request.',
            'data' => [
                'i18n_title_key' => $isApproved
                    ? 'notifications.types.view_request_approved.title'
                    : 'notifications.types.view_request_declined.title',
                'i18n_body_key' => $isApproved
                    ? 'notifications.types.view_request_approved.body'
                    : 'notifications.types.view_request_declined.body',
                'i18n_params' => [
                    'productTitle' => $productTitle,
                ],
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.openListing',
                        'href' => '/products/'.$product->id,
                        'intent' => 'open_listing',
                    ],
                    [
                        'i18n_label_key' => 'notifications.actions.myViewRequests',
                        'href' => '/dashboard/view-requests?tab=outgoing',
                        'intent' => 'open_view_requests',
                    ],
                ],
                'product_id' => $product->id,
                'view_request_id' => $viewRequestId,
            ],
        ];
    }

    public static function bidAcceptedForBuyer(Product $product, int $bidId, int $buyerUserId): array
    {
        $productTitle = self::safeProductTitle($product);

        return [
            'user_id' => $buyerUserId,
            'type' => 'bid_accepted',
            'title' => 'Bid accepted',
            'body' => 'Your bid was accepted by the seller.',
            'data' => [
                'i18n_title_key' => 'notifications.types.bid_accepted.title',
                'i18n_body_key' => 'notifications.types.bid_accepted.body',
                'i18n_params' => [
                    'productTitle' => $productTitle,
                ],
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.manageMyBids',
                        'href' => '/dashboard/bids?bid='.$bidId,
                        'intent' => 'manage_bids',
                    ],
                    [
                        'i18n_label_key' => 'notifications.actions.completeOrder',
                        'href' => '/dashboard/bids?bid='.$bidId,
                        'intent' => 'complete_order',
                    ],
                ],
                'product_id' => $product->id,
                'bid_id' => $bidId,
                'order_id' => null,
            ],
        ];
    }

    public static function bidRejectedForBuyer(Product $product, int $bidId, int $buyerUserId): array
    {
        $productTitle = self::safeProductTitle($product);

        return [
            'user_id' => $buyerUserId,
            'type' => 'bid_rejected',
            'title' => 'Bid not accepted',
            'body' => 'The seller did not accept your bid.',
            'data' => [
                'i18n_title_key' => 'notifications.types.bid_rejected.title',
                'i18n_body_key' => 'notifications.types.bid_rejected.body',
                'i18n_params' => [
                    'productTitle' => $productTitle,
                ],
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.manageMyBids',
                        'href' => '/dashboard/bids?bid='.$bidId,
                        'intent' => 'manage_bids',
                    ],
                    [
                        'i18n_label_key' => 'notifications.actions.openListing',
                        'href' => '/products/'.$product->id,
                        'intent' => 'open_listing',
                    ],
                ],
                'product_id' => $product->id,
                'bid_id' => $bidId,
            ],
        ];
    }

    public static function bidOrderCreatedForSeller(Product $product, int $bidId, int $sellerUserId, Purchase $order): array
    {
        $productTitle = self::safeProductTitle($product);

        return [
            'user_id' => $sellerUserId,
            'type' => 'bid_order_created',
            'title' => 'Order created from accepted bid',
            'body' => 'An order was created after accepting a bid.',
            'data' => [
                'i18n_title_key' => 'notifications.types.bid_order_created.title',
                'i18n_body_key' => 'notifications.types.bid_order_created.body',
                'i18n_params' => [
                    'productTitle' => $productTitle,
                ],
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.openOrder',
                        'href' => '/dashboard/orders/'.$order->id,
                        'intent' => 'open_order',
                    ],
                    [
                        'i18n_label_key' => 'notifications.actions.openBids',
                        'href' => '/products/'.$product->id.'#bids-section',
                        'intent' => 'open_bids',
                    ],
                ],
                'product_id' => $product->id,
                'bid_id' => $bidId,
                'order_id' => $order->id,
            ],
        ];
    }

    public static function orderStatusForBuyer(Purchase $order, string $type): array
    {
        $product = $order->product;
        $title = trim((string) ($product?->title ?? '')) ?: 'Listing';

        return [
            'user_id' => (int) $order->buyer_id,
            'type' => $type,
            'title' => 'Order update',
            'body' => 'Your order status has been updated.',
            'data' => [
                'i18n_title_key' => "notifications.types.{$type}.title",
                'i18n_body_key' => "notifications.types.{$type}.body",
                'i18n_params' => [
                    'productTitle' => $title,
                    'orderNumber' => 'ORD-'.str_pad((string) $order->id, 6, '0', STR_PAD_LEFT),
                ],
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.openOrder',
                        'href' => '/dashboard/orders/'.$order->id,
                        'intent' => 'open_order',
                    ],
                ],
                'order_id' => $order->id,
                'product_id' => $order->product_id,
            ],
        ];
    }

    public static function orderTransferSentConfirmedForBuyer(Purchase $order): array
    {
        $product = $order->product;
        $title = trim((string) ($product?->title ?? '')) ?: 'Listing';

        return [
            'user_id' => (int) $order->buyer_id,
            'type' => 'order_transfer_sent_confirmed',
            'title' => 'Transfer confirmation recorded',
            'body' => 'You confirmed sending the bank transfer.',
            'data' => array_merge(
                self::orderNotificationData($order, $title, 'notifications.types.order_transfer_sent_confirmed'),
                [
                    'actions' => [
                        [
                            'i18n_label_key' => 'notifications.actions.openOrder',
                            'href' => '/dashboard/orders/'.$order->id,
                            'intent' => 'open_order',
                        ],
                    ],
                ],
            ),
        ];
    }

    public static function orderTransferAwaitingSellerConfirmForSeller(Purchase $order): array
    {
        $product = $order->product;
        $title = trim((string) ($product?->title ?? '')) ?: 'Listing';

        return [
            'user_id' => (int) $order->seller_id,
            'type' => 'order_transfer_awaiting_seller_confirm',
            'title' => 'Buyer confirmed transfer',
            'body' => 'Confirm you received the bank transfer before shipping.',
            'data' => array_merge(
                self::orderNotificationData($order, $title, 'notifications.types.order_transfer_awaiting_seller_confirm'),
                [
                    'actions' => [
                        [
                            'i18n_label_key' => 'notifications.actions.confirmTransferReceived',
                            'href' => '/dashboard/orders/'.$order->id,
                            'intent' => 'confirm_direct_transfer',
                        ],
                    ],
                ],
            ),
        ];
    }

    public static function orderTransferReceiptApprovedForBuyer(Purchase $order): array
    {
        $product = $order->product;
        $title = trim((string) ($product?->title ?? '')) ?: 'Listing';

        return [
            'user_id' => (int) $order->buyer_id,
            'type' => 'order_transfer_receipt_approved',
            'title' => 'Transfer receipt approved',
            'body' => 'Your transfer receipt was approved.',
            'data' => self::orderNotificationData($order, $title, 'notifications.types.order_transfer_receipt_approved'),
        ];
    }

    public static function orderTransferConfirmPaymentForSeller(Purchase $order): array
    {
        $product = $order->product;
        $title = trim((string) ($product?->title ?? '')) ?: 'Listing';

        return [
            'user_id' => (int) $order->seller_id,
            'type' => 'order_transfer_confirm_payment',
            'title' => 'Confirm bank transfer',
            'body' => 'Review the receipt and confirm you received the transfer.',
            'data' => self::orderNotificationData($order, $title, 'notifications.types.order_transfer_confirm_payment'),
        ];
    }

    public static function orderTransferPaymentConfirmedForBuyer(Purchase $order): array
    {
        $product = $order->product;
        $title = trim((string) ($product?->title ?? '')) ?: 'Listing';

        return [
            'user_id' => (int) $order->buyer_id,
            'type' => 'order_transfer_payment_confirmed',
            'title' => 'Seller confirmed payment',
            'body' => 'The seller confirmed receiving your bank transfer.',
            'data' => self::orderNotificationData($order, $title, 'notifications.types.order_transfer_payment_confirmed'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected static function orderNotificationData(Purchase $order, string $productTitle, string $i18nPrefix): array
    {
        return [
            'i18n_title_key' => "{$i18nPrefix}.title",
            'i18n_body_key' => "{$i18nPrefix}.body",
            'i18n_params' => [
                'productTitle' => $productTitle,
                'orderNumber' => 'ORD-'.str_pad((string) $order->id, 6, '0', STR_PAD_LEFT),
            ],
            'payment_method' => $order->payment_method,
            'actions' => [
                [
                    'i18n_label_key' => 'notifications.actions.openOrder',
                    'href' => '/dashboard/orders/'.$order->id,
                    'intent' => 'open_order',
                ],
            ],
            'order_id' => $order->id,
            'product_id' => $order->product_id,
        ];
    }

    public static function orderStatusForSeller(Purchase $order, string $type): array
    {
        $product = $order->product;
        $title = trim((string) ($product?->title ?? '')) ?: 'Listing';

        return [
            'user_id' => (int) $order->seller_id,
            'type' => $type,
            'title' => 'Order update',
            'body' => 'An order status has been updated.',
            'data' => [
                'i18n_title_key' => "notifications.types.{$type}.title",
                'i18n_body_key' => "notifications.types.{$type}.body",
                'i18n_params' => [
                    'productTitle' => $title,
                    'orderNumber' => 'ORD-'.str_pad((string) $order->id, 6, '0', STR_PAD_LEFT),
                ],
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.openOrder',
                        'href' => '/dashboard/orders/'.$order->id,
                        'intent' => 'open_order',
                    ],
                ],
                'order_id' => $order->id,
                'product_id' => $order->product_id,
            ],
        ];
    }

    public static function chargeRequestPendingForStaff(int $financeUserId, ChargeRequest $cr, User $submitter): array
    {
        $memberName = trim((string) ($submitter->name ?? '')) !== '' ? trim((string) $submitter->name) : __('Member');
        $memberEmail = (string) ($submitter->email ?? '');
        $amount = number_format((float) $cr->amount, 2, '.', '');
        $msgHref = '/admin/messages?user_email='.rawurlencode($memberEmail).'&source=charge_request&charge_id='.$cr->id;
        $chargesHref = '/admin/charges?focus='.$cr->id;

        return [
            'user_id' => $financeUserId,
            'type' => 'charge_request_pending',
            'title' => __('Wallet top-up request'),
            'body' => __(':name (:email) requested :amount SAR.', [
                'name' => $memberName,
                'email' => $memberEmail,
                'amount' => $amount,
            ]),
            'data' => [
                'i18n_title_key' => 'notifications.types.charge_request_pending.title',
                'i18n_body_key' => 'notifications.types.charge_request_pending.body',
                'i18n_params' => [
                    'memberName' => $memberName,
                    'memberEmail' => $memberEmail,
                    'amount' => $amount,
                ],
                'charge_request_id' => $cr->id,
                'user_email' => $memberEmail,
                'amount' => (float) $cr->amount,
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.reviewChargeRequests',
                        'href' => $chargesHref,
                        'intent' => 'open_admin_charges',
                    ],
                    [
                        'i18n_label_key' => 'notifications.actions.contactClientCharge',
                        'href' => $msgHref,
                        'intent' => 'open_admin_messages_charge',
                    ],
                ],
            ],
        ];
    }

    public static function chargeRequestApprovedForMember(ChargeRequest $cr, User $member): array
    {
        $amount = number_format((float) $cr->amount, 2, '.', '');

        return [
            'user_id' => $member->id,
            'type' => 'charge_request_approved',
            'title' => __('Wallet top-up approved'),
            'body' => __('Your request of :amount SAR was approved and credited to your wallet.', ['amount' => $amount]),
            'data' => [
                'i18n_title_key' => 'notifications.types.charge_request_approved.title',
                'i18n_body_key' => 'notifications.types.charge_request_approved.body',
                'i18n_params' => [
                    'amount' => $amount,
                ],
                'charge_request_id' => $cr->id,
                'amount' => (float) $cr->amount,
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.viewWallet',
                        'href' => '/dashboard/balance',
                        'intent' => 'open_balance',
                    ],
                ],
            ],
        ];
    }

    public static function chargeRequestRejectedForMember(ChargeRequest $cr, User $member): array
    {
        $amount = number_format((float) $cr->amount, 2, '.', '');
        $reason = trim((string) ($cr->rejection_reason ?? ''));

        return [
            'user_id' => $member->id,
            'type' => 'charge_request_rejected',
            'title' => __('wallet.notify_charge_rejected_member_title'),
            'body' => __('wallet.notify_charge_rejected_member_body', ['amount' => $amount]),
            'data' => [
                'i18n_title_key' => 'notifications.types.charge_request_rejected.title',
                'i18n_body_key' => 'notifications.types.charge_request_rejected.body',
                'i18n_params' => [
                    'amount' => $amount,
                ],
                'charge_request_id' => $cr->id,
                'amount' => (float) $cr->amount,
                'rejection_reason' => $reason !== '' ? $reason : null,
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.viewWallet',
                        'href' => '/dashboard/balance',
                        'intent' => 'open_balance',
                    ],
                ],
            ],
        ];
    }

    public static function withdrawalRequestPendingForStaff(int $financeUserId, WithdrawalRequest $wr, User $submitter): array
    {
        $memberName = trim((string) ($submitter->name ?? '')) !== '' ? trim((string) $submitter->name) : __('Member');
        $memberEmail = (string) ($submitter->email ?? '');
        $amount = number_format((float) $wr->amount, 2, '.', '');
        $msgHref = '/admin/messages?user_email='.rawurlencode($memberEmail).'&source=withdrawal_request&withdrawal_id='.$wr->id;
        $queueHref = '/admin/withdrawals?focus='.$wr->id;

        return [
            'user_id' => $financeUserId,
            'type' => 'withdrawal_request_pending',
            'title' => __('wallet.notify_withdrawal_pending_staff_title'),
            'body' => __('wallet.notify_withdrawal_pending_staff_body', [
                'name' => $memberName,
                'email' => $memberEmail,
                'amount' => $amount,
            ]),
            'data' => [
                'i18n_title_key' => 'notifications.types.withdrawal_request_pending.title',
                'i18n_body_key' => 'notifications.types.withdrawal_request_pending.body',
                'i18n_params' => [
                    'memberName' => $memberName,
                    'memberEmail' => $memberEmail,
                    'amount' => $amount,
                    'bankIban' => (string) ($wr->bank_iban ?? ''),
                ],
                'withdrawal_request_id' => $wr->id,
                'user_email' => $memberEmail,
                'amount' => (float) $wr->amount,
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.reviewWithdrawals',
                        'href' => $queueHref,
                        'intent' => 'open_admin_withdrawals',
                    ],
                    [
                        'i18n_label_key' => 'notifications.actions.contactClientWithdrawal',
                        'href' => $msgHref,
                        'intent' => 'open_admin_messages_withdrawal',
                    ],
                ],
            ],
        ];
    }

    public static function withdrawalApprovedForMember(WithdrawalRequest $wr, User $member): array
    {
        $amount = number_format((float) $wr->amount, 2, '.', '');

        return [
            'user_id' => $member->id,
            'type' => 'withdrawal_request_approved',
            'title' => __('wallet.notify_withdrawal_approved_member_title'),
            'body' => __('wallet.notify_withdrawal_approved_member_body', ['amount' => $amount]),
            'data' => [
                'i18n_title_key' => 'notifications.types.withdrawal_request_approved.title',
                'i18n_body_key' => 'notifications.types.withdrawal_request_approved.body',
                'i18n_params' => [
                    'amount' => $amount,
                ],
                'withdrawal_request_id' => $wr->id,
                'amount' => (float) $wr->amount,
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.viewWallet',
                        'href' => '/dashboard/balance',
                        'intent' => 'open_balance',
                    ],
                ],
            ],
        ];
    }

    public static function withdrawalRejectedForMember(WithdrawalRequest $wr, User $member): array
    {
        $amount = number_format((float) $wr->amount, 2, '.', '');
        $reason = trim((string) ($wr->rejection_reason ?? ''));

        return [
            'user_id' => $member->id,
            'type' => 'withdrawal_request_rejected',
            'title' => __('wallet.notify_withdrawal_rejected_member_title'),
            'body' => __('wallet.notify_withdrawal_rejected_member_body', ['amount' => $amount]),
            'data' => [
                'i18n_title_key' => 'notifications.types.withdrawal_request_rejected.title',
                'i18n_body_key' => 'notifications.types.withdrawal_request_rejected.body',
                'i18n_params' => [
                    'amount' => $amount,
                ],
                'withdrawal_request_id' => $wr->id,
                'amount' => (float) $wr->amount,
                'rejection_reason' => $reason !== '' ? $reason : null,
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.viewWallet',
                        'href' => '/dashboard/balance',
                        'intent' => 'open_balance',
                    ],
                ],
            ],
        ];
    }

    public static function guaranteeRequestPendingForStaff(int $staffUserId, GuaranteeRequest $gr, User $submitter): array
    {
        $memberName = trim((string) ($submitter->name ?? '')) !== '' ? trim((string) $submitter->name) : __('Member');
        $memberEmail = (string) ($submitter->email ?? '');
        $isDeposit = $gr->type === GuaranteeRequest::TYPE_DEPOSIT;
        $amount = $isDeposit ? number_format((float) ($gr->amount ?? 0), 2, '.', '') : '';
        $bodyKeySuffix = $isDeposit ? 'body_deposit' : 'body_refund';
        $msgHref = '/admin/messages?user_email='.rawurlencode($memberEmail).'&source=guarantee_request&guarantee_request_id='.$gr->id;
        $queueHref = '/admin/guarantee-requests?focus='.$gr->id;

        $i18nParams = [
            'memberName' => $memberName,
            'memberEmail' => $memberEmail,
            'amount' => $amount,
        ];

        return [
            'user_id' => $staffUserId,
            'type' => 'guarantee_request_pending',
            'title' => __('wallet.notify_guarantee_pending_staff_title'),
            'body' => __('wallet.notify_guarantee_pending_staff_body', [
                'name' => $memberName,
                'email' => $memberEmail,
                'type' => $gr->type,
            ]),
            'data' => [
                'i18n_title_key' => 'notifications.types.guarantee_request_pending.title',
                'i18n_body_key' => 'notifications.types.guarantee_request_pending.'.$bodyKeySuffix,
                'i18n_params' => $i18nParams,
                'guarantee_request_id' => $gr->id,
                'guarantee_type' => $gr->type,
                'user_email' => $memberEmail,
                'amount' => $isDeposit ? (float) ($gr->amount ?? 0) : null,
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.reviewGuaranteeRequests',
                        'href' => $queueHref,
                        'intent' => 'open_admin_guarantee_requests',
                    ],
                    [
                        'i18n_label_key' => 'notifications.actions.contactClientGuarantee',
                        'href' => $msgHref,
                        'intent' => 'open_admin_messages_guarantee',
                    ],
                ],
            ],
        ];
    }

    public static function guaranteeRequestApprovedForMember(GuaranteeRequest $gr, User $member): array
    {
        $isDeposit = $gr->type === GuaranteeRequest::TYPE_DEPOSIT;
        $amount = number_format((float) ($gr->amount ?? 0), 2, '.', '');
        $bodyKeySuffix = $isDeposit ? 'body_deposit' : 'body_refund';

        return [
            'user_id' => $member->id,
            'type' => 'guarantee_request_approved',
            'title' => __('wallet.notify_guarantee_approved_member_title'),
            'body' => __('wallet.notify_guarantee_approved_member_body', ['type' => $gr->type]),
            'data' => [
                'i18n_title_key' => 'notifications.types.guarantee_request_approved.title',
                'i18n_body_key' => 'notifications.types.guarantee_request_approved.'.$bodyKeySuffix,
                'i18n_params' => [
                    'amount' => $amount,
                ],
                'guarantee_request_id' => $gr->id,
                'guarantee_type' => $gr->type,
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.viewWallet',
                        'href' => '/dashboard/balance',
                        'intent' => 'open_balance',
                    ],
                    [
                        'i18n_label_key' => 'notifications.actions.openGuaranteePage',
                        'href' => '/dashboard/guarantee',
                        'intent' => 'open_guarantee',
                    ],
                ],
            ],
        ];
    }

    public static function guaranteeRequestRejectedForMember(GuaranteeRequest $gr, User $member): array
    {
        $isDeposit = $gr->type === GuaranteeRequest::TYPE_DEPOSIT;
        $note = trim((string) ($gr->admin_note ?? ''));
        $bodyKeySuffix = $isDeposit ? 'body_deposit' : 'body_refund';
        $amountFormatted = number_format((float) ($gr->amount ?? 0), 2, '.', '');

        return [
            'user_id' => $member->id,
            'type' => 'guarantee_request_rejected',
            'title' => __('wallet.notify_guarantee_rejected_member_title'),
            'body' => __('wallet.notify_guarantee_rejected_member_body', ['type' => $gr->type]),
            'data' => [
                'i18n_title_key' => 'notifications.types.guarantee_request_rejected.title',
                'i18n_body_key' => 'notifications.types.guarantee_request_rejected.'.$bodyKeySuffix,
                'i18n_params' => $isDeposit ? [
                    'amount' => $amountFormatted,
                ] : [],
                'guarantee_request_id' => $gr->id,
                'guarantee_type' => $gr->type,
                'admin_note' => $note !== '' ? $note : null,
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.viewWallet',
                        'href' => '/dashboard/balance',
                        'intent' => 'open_balance',
                    ],
                    [
                        'i18n_label_key' => 'notifications.actions.openGuaranteePage',
                        'href' => '/dashboard/guarantee',
                        'intent' => 'open_guarantee',
                    ],
                ],
            ],
        ];
    }

    public static function documentVerificationPendingForStaff(int $staffUserId, DocumentVerification $dv, User $submitter): array
    {
        $memberName = trim((string) ($submitter->name ?? '')) !== '' ? trim((string) $submitter->name) : __('Member');
        $memberEmail = (string) ($submitter->email ?? '');
        $isCompany = $dv->type === DocumentVerification::TYPE_COMPANY_LICENSE;
        $bodyKeySuffix = $isCompany ? 'body_company' : 'body_id';
        $msgHref = '/admin/messages?user_email='.rawurlencode($memberEmail).'&source=document_verification&document_verification_id='.$dv->id;
        $queueHref = '/admin/verifications?focus='.$dv->id;

        return [
            'user_id' => $staffUserId,
            'type' => 'document_verification_pending',
            'title' => __('wallet.notify_document_verification_pending_staff_title'),
            'body' => __('wallet.notify_document_verification_pending_staff_body', [
                'name' => $memberName,
                'email' => $memberEmail,
                'type' => $dv->type,
            ]),
            'data' => [
                'i18n_title_key' => 'notifications.types.document_verification_pending.title',
                'i18n_body_key' => 'notifications.types.document_verification_pending.'.$bodyKeySuffix,
                'i18n_params' => [
                    'memberName' => $memberName,
                    'memberEmail' => $memberEmail,
                ],
                'document_verification_id' => $dv->id,
                'verification_type' => $dv->type,
                'user_email' => $memberEmail,
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.reviewVerifications',
                        'href' => $queueHref,
                        'intent' => 'open_admin_verifications',
                    ],
                    [
                        'i18n_label_key' => 'notifications.actions.contactClientVerification',
                        'href' => $msgHref,
                        'intent' => 'open_admin_messages_verification',
                    ],
                ],
            ],
        ];
    }

    public static function documentVerificationApprovedForMember(DocumentVerification $dv, User $member): array
    {
        $isCompany = $dv->type === DocumentVerification::TYPE_COMPANY_LICENSE;
        $bodyKeySuffix = $isCompany ? 'body_company' : 'body_id';

        return [
            'user_id' => $member->id,
            'type' => 'document_verification_approved',
            'title' => __('wallet.notify_document_verification_approved_member_title'),
            'body' => __('wallet.notify_document_verification_approved_member_body'),
            'data' => [
                'i18n_title_key' => 'notifications.types.document_verification_approved.title',
                'i18n_body_key' => 'notifications.types.document_verification_approved.'.$bodyKeySuffix,
                'i18n_params' => [],
                'document_verification_id' => $dv->id,
                'verification_type' => $dv->type,
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.openVerification',
                        'href' => '/dashboard/verification',
                        'intent' => 'open_verification',
                    ],
                ],
            ],
        ];
    }

    public static function documentVerificationRejectedForMember(DocumentVerification $dv, User $member): array
    {
        $isCompany = $dv->type === DocumentVerification::TYPE_COMPANY_LICENSE;
        $bodyKeySuffix = $isCompany ? 'body_company' : 'body_id';
        $reason = trim((string) ($dv->rejected_reason ?? ''));

        return [
            'user_id' => $member->id,
            'type' => 'document_verification_rejected',
            'title' => __('wallet.notify_document_verification_rejected_member_title'),
            'body' => __('wallet.notify_document_verification_rejected_member_body'),
            'data' => [
                'i18n_title_key' => 'notifications.types.document_verification_rejected.title',
                'i18n_body_key' => 'notifications.types.document_verification_rejected.'.$bodyKeySuffix,
                'i18n_params' => [],
                'document_verification_id' => $dv->id,
                'verification_type' => $dv->type,
                'rejected_reason' => $reason !== '' ? $reason : null,
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.openVerification',
                        'href' => '/dashboard/verification',
                        'intent' => 'open_verification',
                    ],
                ],
            ],
        ];
    }

    public static function taskAssigned(int $userId, Task $task, ?string $actorName = null): array
    {
        $actor = trim((string) ($actorName ?? '')) !== '' ? trim((string) $actorName) : __('Admin');
        return [
            'user_id' => $userId,
            'type' => 'task_assigned',
            'title' => __('New task assigned'),
            'body' => __('A new task has been assigned to you.'),
            'data' => [
                'i18n_title_key' => 'notifications.types.task_assigned.title',
                'i18n_body_key' => 'notifications.types.task_assigned.body',
                'i18n_params' => [
                    'taskTitle' => $task->title,
                    'actor' => $actor,
                ],
                'task_id' => $task->id,
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.openAdminTasks',
                        'href' => '/admin/tasks?focus='.$task->id,
                        'intent' => 'open_admin_tasks',
                    ],
                ],
            ],
        ];
    }

    public static function taskReassigned(int $userId, Task $task, ?string $actorName = null): array
    {
        $actor = trim((string) ($actorName ?? '')) !== '' ? trim((string) $actorName) : __('Admin');
        return [
            'user_id' => $userId,
            'type' => 'task_reassigned',
            'title' => __('Task reassigned'),
            'body' => __('A task has been reassigned to you.'),
            'data' => [
                'i18n_title_key' => 'notifications.types.task_reassigned.title',
                'i18n_body_key' => 'notifications.types.task_reassigned.body',
                'i18n_params' => [
                    'taskTitle' => $task->title,
                    'actor' => $actor,
                ],
                'task_id' => $task->id,
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.openAdminTasks',
                        'href' => '/admin/tasks?focus='.$task->id,
                        'intent' => 'open_admin_tasks',
                    ],
                ],
            ],
        ];
    }

    public static function taskStatusChanged(int $userId, Task $task, string $fromStatus, string $toStatus): array
    {
        return [
            'user_id' => $userId,
            'type' => 'task_status_changed',
            'title' => __('Task status updated'),
            'body' => __('A task status has changed.'),
            'data' => [
                'i18n_title_key' => 'notifications.types.task_status_changed.title',
                'i18n_body_key' => 'notifications.types.task_status_changed.body',
                'i18n_params' => [
                    'taskTitle' => $task->title,
                    'fromStatus' => $fromStatus,
                    'toStatus' => $toStatus,
                ],
                'task_id' => $task->id,
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.openAdminTasks',
                        'href' => '/admin/tasks?focus='.$task->id,
                        'intent' => 'open_admin_tasks',
                    ],
                ],
            ],
        ];
    }

    public static function taskDeleted(int $userId, Task $task): array
    {
        return [
            'user_id' => $userId,
            'type' => 'task_deleted',
            'title' => __('Task deleted'),
            'body' => __('A task was deleted.'),
            'data' => [
                'i18n_title_key' => 'notifications.types.task_deleted.title',
                'i18n_body_key' => 'notifications.types.task_deleted.body',
                'i18n_params' => [
                    'taskTitle' => $task->title,
                ],
                'task_id' => $task->id,
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.openAdminTasks',
                        'href' => '/admin/tasks',
                        'intent' => 'open_admin_tasks',
                    ],
                ],
            ],
        ];
    }

    public static function taskTeamWatcher(int $userId, Task $task, string $watcherType = 'task_team_updated'): array
    {
        return [
            'user_id' => $userId,
            'type' => $watcherType,
            'title' => __('Team task updated'),
            'body' => __('A team task has activity that may require admin follow-up.'),
            'data' => [
                'i18n_title_key' => "notifications.types.{$watcherType}.title",
                'i18n_body_key' => "notifications.types.{$watcherType}.body",
                'i18n_params' => [
                    'taskTitle' => $task->title,
                ],
                'task_id' => $task->id,
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.openAdminTasks',
                        'href' => '/admin/tasks?type=team&focus='.$task->id,
                        'intent' => 'open_admin_tasks',
                    ],
                ],
            ],
        ];
    }

    public static function reviewNew(int $targetUserId, int $reviewId, string $reviewerName, int $rating, string $profileHref): array
    {
        return [
            'user_id' => $targetUserId,
            'type' => 'review_new',
            'title' => 'New review',
            'body' => "{$reviewerName} rated you",
            'data' => [
                'i18n_title_key' => 'notifications.types.review_new.title',
                'i18n_body_key' => 'notifications.types.review_new.body',
                'i18n_params' => [
                    'reviewer' => $reviewerName,
                    'rating' => (string) $rating,
                ],
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.openProfile',
                        'href' => $profileHref,
                        'intent' => 'open_profile',
                    ],
                ],
                'review_id' => $reviewId,
                'link' => $profileHref,
            ],
        ];
    }

    public static function wholesaleCampaignCompleted(int $userId, Product $product, int $reservationId, string $checkoutDeadlineIso): array
    {
        $productTitle = self::safeProductTitle($product);

        return [
            'user_id' => $userId,
            'type' => 'wholesale_campaign_completed',
            'title' => 'Wholesale reservation completed',
            'body' => 'The minimum buyers threshold has been reached.',
            'data' => [
                'i18n_title_key' => 'notifications.types.wholesale_campaign_completed.title',
                'i18n_body_key' => 'notifications.types.wholesale_campaign_completed.body',
                'i18n_params' => [
                    'productTitle' => $productTitle,
                ],
                'reservation_id' => $reservationId,
                'product_id' => $product->id,
                'checkout_deadline' => $checkoutDeadlineIso,
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.openWholesaleCheckout',
                        'href' => '/wholesale/checkout/'.$reservationId,
                        'intent' => 'open_wholesale_checkout',
                    ],
                ],
            ],
        ];
    }

    public static function wholesaleReservationCreated(int $userId, Product $product, int $reservationId, int $quantity): array
    {
        $productTitle = self::safeProductTitle($product);

        return [
            'user_id' => $userId,
            'type' => 'wholesale_reservation_created',
            'title' => 'Wholesale reservation created',
            'body' => 'Your reservation has been recorded successfully.',
            'data' => [
                'i18n_title_key' => 'notifications.types.wholesale_reservation_created.title',
                'i18n_body_key' => 'notifications.types.wholesale_reservation_created.body',
                'i18n_params' => [
                    'productTitle' => $productTitle,
                    'quantity' => (string) $quantity,
                ],
                'reservation_id' => $reservationId,
                'product_id' => $product->id,
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.openWholesaleReservations',
                        'href' => '/wholesale/reservations',
                        'intent' => 'open_wholesale_reservations',
                    ],
                ],
            ],
        ];
    }

    public static function wholesaleNewParticipantSeller(int $sellerUserId, Product $product, string $buyerName, int $quantity): array
    {
        $productTitle = self::safeProductTitle($product);

        return [
            'user_id' => $sellerUserId,
            'type' => 'wholesale_new_participant_seller',
            'title' => 'New wholesale reservation',
            'body' => 'A buyer reserved slots on your wholesale listing.',
            'data' => [
                'i18n_title_key' => 'notifications.types.wholesale_new_participant_seller.title',
                'i18n_body_key' => 'notifications.types.wholesale_new_participant_seller.body',
                'i18n_params' => [
                    'productTitle' => $productTitle,
                    'buyerName' => $buyerName,
                    'quantity' => (string) $quantity,
                ],
                'product_id' => $product->id,
                'actions' => [
                    [
                        'i18n_label_key' => 'notifications.actions.openWholesaleProduct',
                        'href' => '/wholesale/product/'.$product->id,
                        'intent' => 'open_wholesale_product',
                    ],
                ],
            ],
        ];
    }

    public static function listingPendingActivation(Product $product, int $sellerUserId): array
    {
        $productTitle = self::safeProductTitle($product);

        return [
            'user_id' => $sellerUserId,
            'type' => 'listing_pending_activation',
            'title' => __('finance.notification.listing_pending_title'),
            'body' => __('finance.notification.listing_pending_body'),
            'data' => [
                'i18n_title_key' => 'notifications.types.listing_pending_activation.title',
                'i18n_body_key' => 'notifications.types.listing_pending_activation.body',
                'i18n_params' => [
                    'productTitle' => $productTitle,
                ],
                'product_id' => $product->id,
                'actions' => [
                    [
                        'i18n_label_key' => 'listingActions.setupPayments',
                        'href' => '/dashboard/payment-setup',
                        'intent' => 'go_to_payment_setup',
                        'variant' => 'primary',
                    ],
                    [
                        'i18n_label_key' => 'listingActions.editListing',
                        'href' => '/products/'.$product->id.'/edit',
                        'intent' => 'edit_listing',
                        'variant' => 'secondary',
                    ],
                    [
                        'i18n_label_key' => 'listingActions.viewListing',
                        'href' => '/products/'.$product->id,
                        'intent' => 'view_listing',
                        'variant' => 'outline',
                    ],
                ],
            ],
        ];
    }

    public static function payoutProfileVerified(int $userId): array
    {
        return [
            'user_id' => $userId,
            'type' => 'payout_profile_verified',
            'title' => __('finance.notification.payout_verified_title'),
            'body' => __('finance.notification.payout_verified_body'),
            'data' => [
                'i18n_title_key' => 'notifications.types.payout_profile_verified.title',
                'i18n_body_key' => 'notifications.types.payout_profile_verified.body',
                'i18n_params' => [],
                'actions' => [
                    [
                        'i18n_label_key' => 'listingActions.viewListings',
                        'href' => '/dashboard/listings',
                        'intent' => 'view_listings',
                        'variant' => 'primary',
                    ],
                    [
                        'i18n_label_key' => 'listingActions.setupPayments',
                        'href' => '/dashboard/account?tab=payments',
                        'intent' => 'go_to_payment_setup',
                        'variant' => 'secondary',
                    ],
                ],
            ],
        ];
    }

    public static function payoutProfilePendingReview(int $staffUserId, int $sellerUserId, string $sellerLabel): array
    {
        return [
            'user_id' => $staffUserId,
            'type' => 'payout_profile_pending',
            'title' => __('finance.notification.payout_pending_staff_title'),
            'body' => __('finance.notification.payout_pending_staff_body', ['seller' => $sellerLabel]),
            'data' => [
                'seller_user_id' => $sellerUserId,
                'i18n_title_key' => 'notifications.types.payout_profile_pending.title',
                'i18n_body_key' => 'notifications.types.payout_profile_pending.body',
                'i18n_params' => ['seller' => $sellerLabel],
                'actions' => [
                    [
                        'i18n_label_key' => 'admin.reviewPayoutProfile',
                        'href' => '/admin/finance-ops?tab=queues',
                        'intent' => 'review_payout_profile',
                        'variant' => 'primary',
                    ],
                ],
            ],
        ];
    }

    public static function payoutProfileRejected(int $userId, string $reason): array
    {
        return [
            'user_id' => $userId,
            'type' => 'payout_profile_rejected',
            'title' => __('finance.notification.payout_rejected_title'),
            'body' => $reason !== '' ? $reason : __('finance.notification.payout_rejected_body'),
            'data' => [
                'i18n_title_key' => 'notifications.types.payout_profile_rejected.title',
                'i18n_body_key' => 'notifications.types.payout_profile_rejected.body',
                'i18n_params' => ['reason' => $reason],
                'actions' => [
                    [
                        'i18n_label_key' => 'listingActions.setupPayments',
                        'href' => '/dashboard/account?tab=payments',
                        'intent' => 'go_to_payment_setup',
                        'variant' => 'primary',
                    ],
                ],
            ],
        ];
    }
}
