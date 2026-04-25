<?php

return [
    'idempotency_key_min_length' => 'مفتاح منع التكرار يجب أن يكون 8 أحرف على الأقل.',
    'charge_submitted' => 'تم إرسال طلب شحن الرصيد وهو بانتظار موافقة الإدارة.',
    'withdrawal_submitted' => 'تم إرسال طلب السحب. بانتظار موافقة الإدارة المالية.',
    'insufficient_withdrawable' => 'الرصيد القابل للسحب غير كافٍ.',
    'charge_request_approved_description' => 'تمت الموافقة على طلب شحن الرصيد',
    'charge_request_approved' => 'تمت الموافقة على طلب الشحن.',
    'charge_request_rejected' => 'تم رفض طلب الشحن.',
    'notify_charge_rejected_member_title' => 'لم يُقبل طلب شحن المحفظة',
    'notify_charge_rejected_member_body' => 'لم يُقبل طلب شحن محفظتك بمبلغ :amount ر.س.',
    'withdrawal_approved_description' => 'تمت الموافقة على السحب (الآيبان: :iban)',
    'withdrawal_approved' => 'تمت الموافقة على طلب السحب.',
    'withdrawal_rejected' => 'تم رفض طلب السحب.',
    'withdrawal_insufficient_for_approval' => 'المستخدم لم يعد لديه رصيد قابل للسحب كافٍ.',

    'notify_withdrawal_pending_staff_title' => 'طلب صرف (سحب)',
    'notify_withdrawal_pending_staff_body' => 'قدّم :name (:email) طلب سحب بمبلغ :amount ر.س.',
    'notify_withdrawal_approved_member_title' => 'تمت الموافقة على السحب',
    'notify_withdrawal_approved_member_body' => 'تمت الموافقة على طلب سحبك بمبلغ :amount ر.س.',
    'notify_withdrawal_rejected_member_title' => 'لم يُقبل طلب السحب',
    'notify_withdrawal_rejected_member_body' => 'لم يُقبل طلب سحبك بمبلغ :amount ر.س.',

    'notify_guarantee_pending_staff_title' => 'طلب ضمان مالي',
    'notify_guarantee_pending_staff_body' => 'قدّم :name (:email) طلباً متعلقاً بالضمان المالي (:type).',
    'notify_guarantee_approved_member_title' => 'تمت الموافقة على طلب الضمان',
    'notify_guarantee_approved_member_body' => 'تمت الموافقة على طلب الضمان المالي (:type).',
    'notify_guarantee_rejected_member_title' => 'لم يُقبل طلب الضمان المالي',
    'notify_guarantee_rejected_member_body' => 'لم يُقبل طلب الضمان المالي (:type).',

    'notify_document_verification_pending_staff_title' => 'تم تقديم وثائق للتحقق',
    'notify_document_verification_pending_staff_body' => 'قدّم :name (:email) وثائق للتحقق (:type).',
    'notify_document_verification_approved_member_title' => 'تمت الموافقة على التحقق',
    'notify_document_verification_approved_member_body' => 'تمت الموافقة على طلب التحقق من الوثائق.',
    'notify_document_verification_rejected_member_title' => 'لم يُقبل طلب التحقق من الوثائق',
    'notify_document_verification_rejected_member_body' => 'لم يُقبل طلب التحقق من الوثائق.',
];
