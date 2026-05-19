<?php

namespace App\Services\Finance;

class FieldTypeRegistry
{
    public const INPUT_TYPES = [
        'text', 'textarea', 'richtext', 'amount', 'number', 'phone', 'email', 'iban',
        'select', 'multiselect', 'radio', 'checkbox', 'switch',
        'upload', 'file', 'image', 'image_upload', 'pdf', 'pdf_upload',
        'date', 'time', 'bank_select',
    ];

    public const LAYOUT_TYPES = [
        'instruction_block', 'info', 'warning', 'divider', 'note',
    ];

    public static function isLayout(string $type): bool
    {
        return in_array($type, self::LAYOUT_TYPES, true);
    }

    public static function isFileType(string $type): bool
    {
        return in_array($type, ['upload', 'file', 'image', 'image_upload', 'pdf', 'pdf_upload'], true);
    }
}
