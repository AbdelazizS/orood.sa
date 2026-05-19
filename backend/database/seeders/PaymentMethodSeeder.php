<?php

namespace Database\Seeders;

use App\Models\CodPolicy;
use App\Models\PaymentMethod;
use App\Models\PaymentMethodField;
use Illuminate\Database\Seeder;

class PaymentMethodSeeder extends Seeder
{
    public function run(): void
    {
        $wallet = PaymentMethod::updateOrCreate(
            ['code' => PaymentMethod::CODE_WALLET_ESCROW],
            [
                'name_ar' => 'الدفع عبر المنصة (ضمان)',
                'name_en' => 'Platform escrow',
                'audience' => 'buyer',
                'enabled' => true,
                'sort_order' => 1,
                'requires_admin_review' => false,
                'requires_seller_payout_profile' => false,
                'requires_buyer_acknowledgement' => false,
                'config' => ['legacy_code' => 'escrow'],
            ]
        );

        $cod = PaymentMethod::updateOrCreate(
            ['code' => PaymentMethod::CODE_COD],
            [
                'name_ar' => 'الدفع عند الاستلام',
                'name_en' => 'Cash on delivery',
                'audience' => 'buyer',
                'enabled' => true,
                'sort_order' => 2,
                'requires_admin_review' => false,
                'requires_seller_payout_profile' => false,
                'requires_buyer_acknowledgement' => true,
                'config' => ['legacy_code' => 'cod'],
            ]
        );

        $direct = PaymentMethod::updateOrCreate(
            ['code' => PaymentMethod::CODE_DIRECT_TRANSFER],
            [
                'name_ar' => 'تحويل مباشر للبائع',
                'name_en' => 'Direct bank transfer',
                'audience' => 'buyer',
                'enabled' => true,
                'sort_order' => 3,
                'requires_admin_review' => true,
                'requires_seller_payout_profile' => true,
                'requires_buyer_acknowledgement' => false,
                'config' => ['legacy_code' => 'direct_transfer'],
            ]
        );

        $bankTopUp = PaymentMethod::updateOrCreate(
            ['code' => PaymentMethod::CODE_BANK_TRANSFER],
            [
                'name_ar' => 'تحويل بنكي لشحن الرصيد',
                'name_en' => 'Bank transfer (wallet top-up)',
                'audience' => 'both',
                'enabled' => true,
                'sort_order' => 10,
                'requires_admin_review' => true,
                'min_amount' => 10,
                'max_amount' => null,
                'processing_time_ar' => 'عادةً خلال 24 ساعة عمل',
                'processing_time_en' => 'Usually within 24 business hours',
                'instructions' => [
                    'ar' => [
                        'title' => 'تعليمات شحن المحفظة',
                        'account_name' => '',
                        'bank_name' => '',
                        'iban' => '',
                        'steps' => [
                            'حوّل إلى حساب المنصة المستلم',
                            'نفّذ التحويل من تطبيق البنك واحتفظ بإثبات التحويل',
                            'أدخل المبلغ والمرجع وأرفق الإيصال أدناه',
                        ],
                    ],
                    'en' => [
                        'title' => 'Wallet top-up instructions',
                        'account_name' => '',
                        'bank_name' => '',
                        'iban' => '',
                        'steps' => [
                            'Transfer to the platform receiving account',
                            'Use your bank app and keep proof of transfer',
                            'Enter amount, reference, and attach receipt below',
                        ],
                    ],
                ],
            ]
        );

        // STC Pay disabled — wallet uses bank transfer only (charge + withdraw).
        PaymentMethod::updateOrCreate(
            ['code' => 'stc_pay'],
            [
                'name_ar' => 'STC Pay',
                'name_en' => 'STC Pay',
                'audience' => 'both',
                'enabled' => false,
                'sort_order' => 21,
                'requires_admin_review' => true,
                'min_amount' => 10,
            ]
        );

        $this->seedChargeFields($bankTopUp);
        $this->seedWithdrawFields();
        $this->seedPayoutProfileFields($direct);
        $this->seedOrderPaymentFields($direct);
        $this->seedCodPolicy();
    }

    protected function seedChargeFields(PaymentMethod $method): void
    {
        $fields = [
            ['field_key' => 'amount', 'field_type' => 'amount', 'label_ar' => 'المبلغ', 'required' => true, 'sort_order' => 1],
            ['field_key' => 'payer_bank_name', 'field_type' => 'text', 'label_ar' => 'اسم البنك المحوّل منه', 'required' => true, 'sort_order' => 2],
            ['field_key' => 'transfer_reference', 'field_type' => 'text', 'label_ar' => 'رقم التحويل', 'required' => true, 'sort_order' => 3],
            ['field_key' => 'receipt_url', 'field_type' => 'file', 'label_ar' => 'إيصال التحويل', 'label_en' => 'Transfer receipt', 'required' => true, 'sort_order' => 4],
            ['field_key' => 'note', 'field_type' => 'textarea', 'label_ar' => 'ملاحظة', 'required' => false, 'sort_order' => 5],
        ];

        foreach ($fields as $f) {
            PaymentMethodField::updateOrCreate(
                [
                    'payment_method_id' => $method->id,
                    'context' => 'charge',
                    'field_key' => $f['field_key'],
                ],
                $f
            );
        }
    }

    protected function seedWithdrawFields(): void
    {
        $withdrawMethod = PaymentMethod::updateOrCreate(
            ['code' => 'wallet_withdraw_bank'],
            [
                'name_ar' => 'تحويل بنكي للسحب',
                'name_en' => 'Bank transfer withdrawal',
                'audience' => 'both',
                'enabled' => true,
                'sort_order' => 20,
                'requires_admin_review' => true,
                'min_amount' => 10,
            ]
        );

        $fields = [
            ['field_key' => 'amount', 'field_type' => 'amount', 'label_ar' => 'المبلغ', 'label_en' => 'Amount', 'required' => true, 'sort_order' => 1],
            ['field_key' => 'bank_name', 'field_type' => 'text', 'label_ar' => 'اسم البنك', 'label_en' => 'Bank name', 'required' => true, 'sort_order' => 2],
            ['field_key' => 'bank_iban', 'field_type' => 'iban', 'label_ar' => 'رقم الآيبان', 'label_en' => 'IBAN', 'required' => true, 'sort_order' => 3],
            ['field_key' => 'account_holder', 'field_type' => 'text', 'label_ar' => 'اسم صاحب الحساب', 'label_en' => 'Account holder', 'required' => false, 'sort_order' => 4],
        ];

        foreach ($fields as $f) {
            PaymentMethodField::updateOrCreate(
                [
                    'payment_method_id' => $withdrawMethod->id,
                    'context' => 'withdraw',
                    'field_key' => $f['field_key'],
                ],
                $f
            );
        }
    }

    protected function seedStcWithdrawFields(PaymentMethod $method): void
    {
        $fields = [
            ['field_key' => 'amount', 'field_type' => 'amount', 'label_ar' => 'المبلغ', 'required' => true, 'sort_order' => 1],
            ['field_key' => 'phone', 'field_type' => 'phone', 'label_ar' => 'رقم STC Pay', 'required' => true, 'sort_order' => 2],
            ['field_key' => 'receipt_url', 'field_type' => 'file', 'label_ar' => 'لقطة شاشة', 'required' => false, 'sort_order' => 3],
        ];

        foreach ($fields as $f) {
            PaymentMethodField::updateOrCreate(
                [
                    'payment_method_id' => $method->id,
                    'context' => 'withdraw',
                    'field_key' => $f['field_key'],
                ],
                $f
            );
        }
    }

    protected function seedPayoutProfileFields(PaymentMethod $method): void
    {
        $fields = [
            ['field_key' => 'bank_name', 'field_type' => 'text', 'label_ar' => 'اسم البنك', 'required' => true, 'sort_order' => 1],
            ['field_key' => 'account_holder', 'field_type' => 'text', 'label_ar' => 'اسم صاحب الحساب', 'required' => true, 'sort_order' => 2],
            ['field_key' => 'bank_iban', 'field_type' => 'iban', 'label_ar' => 'رقم الآيبان', 'required' => true, 'sort_order' => 3],
        ];

        foreach ($fields as $f) {
            PaymentMethodField::updateOrCreate(
                [
                    'payment_method_id' => $method->id,
                    'context' => 'payout_profile',
                    'field_key' => $f['field_key'],
                ],
                $f
            );
        }
    }

    protected function seedOrderPaymentFields(PaymentMethod $method): void
    {
        $fields = [
            ['field_key' => 'transfer_reference', 'field_type' => 'text', 'label_ar' => 'رقم التحويل', 'required' => true, 'sort_order' => 1],
            ['field_key' => 'receipt_url', 'field_type' => 'file', 'label_ar' => 'سند التحويل', 'required' => true, 'sort_order' => 2],
            ['field_key' => 'note', 'field_type' => 'textarea', 'label_ar' => 'ملاحظة', 'required' => false, 'sort_order' => 3],
        ];

        foreach ($fields as $f) {
            PaymentMethodField::updateOrCreate(
                [
                    'payment_method_id' => $method->id,
                    'context' => 'order_payment',
                    'field_key' => $f['field_key'],
                ],
                $f
            );
        }
    }

    protected function seedCodPolicy(): void
    {
        CodPolicy::updateOrCreate(
            ['scope' => CodPolicy::SCOPE_GLOBAL, 'scope_id' => null],
            [
                'enabled' => false,
                'buyer_must_accept' => true,
                'seller_can_toggle' => true,
                'priority' => 0,
            ]
        );
    }
}
