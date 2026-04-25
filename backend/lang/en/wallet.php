<?php

return [
    'idempotency_key_min_length' => 'Idempotency key must be at least 8 characters.',
    'charge_submitted' => 'Charge request submitted and pending approval.',
    'withdrawal_submitted' => 'Withdrawal request submitted. Awaiting finance approval.',
    'insufficient_withdrawable' => 'Insufficient withdrawable balance.',
    'charge_request_approved_description' => 'Charge request approved',
    'charge_request_approved' => 'Charge request approved.',
    'charge_request_rejected' => 'Charge request rejected.',
    'notify_charge_rejected_member_title' => 'Top-up request not accepted',
    'notify_charge_rejected_member_body' => 'Your :amount SAR wallet top-up request was not accepted.',
    'withdrawal_approved_description' => 'Withdrawal approved (IBAN: :iban)',
    'withdrawal_approved' => 'Withdrawal approved.',
    'withdrawal_rejected' => 'Withdrawal request rejected.',
    'withdrawal_insufficient_for_approval' => 'User no longer has sufficient withdrawable balance.',

    'notify_withdrawal_pending_staff_title' => 'Payout withdrawal request',
    'notify_withdrawal_pending_staff_body' => ':name (:email) requested withdrawal of :amount SAR.',
    'notify_withdrawal_approved_member_title' => 'Withdrawal approved',
    'notify_withdrawal_approved_member_body' => 'Your withdrawal of :amount SAR was approved.',
    'notify_withdrawal_rejected_member_title' => 'Withdrawal request not accepted',
    'notify_withdrawal_rejected_member_body' => 'Your withdrawal request of :amount SAR was not accepted.',

    'notify_guarantee_pending_staff_title' => 'Financial guarantee request',
    'notify_guarantee_pending_staff_body' => ':name (:email) submitted a guarantee request (:type).',
    'notify_guarantee_approved_member_title' => 'Guarantee request approved',
    'notify_guarantee_approved_member_body' => 'Your guarantee request (:type) was approved.',
    'notify_guarantee_rejected_member_title' => 'Guarantee request not accepted',
    'notify_guarantee_rejected_member_body' => 'Your guarantee request (:type) was not accepted.',

    'notify_document_verification_pending_staff_title' => 'Document verification submitted',
    'notify_document_verification_pending_staff_body' => ':name (:email) submitted documents for verification (:type).',
    'notify_document_verification_approved_member_title' => 'Verification approved',
    'notify_document_verification_approved_member_body' => 'Your document verification was approved.',
    'notify_document_verification_rejected_member_title' => 'Verification request not accepted',
    'notify_document_verification_rejected_member_body' => 'Your document verification request was not accepted.',
];
