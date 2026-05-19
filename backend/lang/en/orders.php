<?php

return [
    'unauthorized' => 'Unauthorized',
    'invalid_action' => 'Invalid action',
    'cancel_not_allowed' => 'Order cannot be cancelled in current status',

    'cod_action_only' => 'This action applies only to cash on delivery orders.',
    'already_accepted' => 'This order was already accepted.',
    'cannot_accept_status' => 'Order cannot be accepted in its current status.',
    'cod_accepted' => 'Cash on delivery order accepted. You can now add shipment details.',
    'accept_cod_before_shipment' => 'Accept this cash-on-delivery order before adding shipment details.',

    'cannot_dispatch_status' => 'Order cannot be marked as out for delivery in its current status.',
    'confirm_delivery_location_first' => 'Please confirm delivery location before marking out for delivery.',
    'shipping_location_missing' => 'Shipping location is missing. Buyer must set delivery location first.',

    'delivered_requires_shipped' => 'You can mark as delivered only after the order is already shipped. Save shipment details first, then mark delivered.',
    'cannot_mark_delivered_status' => 'Order cannot be marked as delivered in its current status.',
    'marked_delivered' => 'Marked as delivered.',
    'marked_out_for_delivery' => 'Marked as out for delivery.',
    'order_updated' => 'Order updated.',

    'cancelled' => 'Order cancelled.',
    'dispute_not_allowed' => 'Dispute cannot be opened for this order.',
    'dispute_opened' => 'Dispute opened. Admin will review.',

    'direct_transfer_action_only' => 'This action applies only to direct bank transfer orders.',
    'cannot_confirm_transfer_status' => 'Transfer receipt cannot be confirmed in the current status.',
    'transfer_already_confirmed' => 'Bank transfer was already confirmed.',
    'transfer_confirmed' => 'Transfer confirmed. You can ship the order now.',
    'confirm_transfer_before_shipment' => 'Confirm you received the bank transfer before shipping.',

    'location_edit_not_allowed' => 'Delivery location cannot be edited for this order.',
    'location_updated' => 'Delivery location updated.',

    'cannot_confirm_transfer_sent_status' => 'Transfer cannot be confirmed in the current status.',
    'transfer_sent_already_confirmed' => 'Transfer send was already confirmed.',
    'transfer_receipt_required' => 'Upload a transfer receipt before confirming.',
    'transfer_sent_confirmed' => 'Transfer send confirmed. Waiting for the seller to confirm receipt.',
    'confirm_transfer_sent_before_shipment' => 'The buyer must confirm sending the transfer before you can ship.',
];
