<?php

namespace App\Services;

use App\Models\ContactInquiry;
use App\Models\Notification;
use App\Models\Permission;
use App\Services\Finance\PhoneNormalizationService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ContactInquiryService
{
    public function __construct(
        private readonly AdminSettingsService $settings,
        private readonly PhoneNormalizationService $phones,
    ) {}

    /**
     * @param  array<string, mixed>  $input
     * @param  array<string, UploadedFile|array<int, UploadedFile>>  $files
     */
    public function submit(array $input, array $files = []): ContactInquiry
    {
        $page = $this->settings->contactPage();
        if (! ($page['form_enabled'] ?? true)) {
            throw ValidationException::withMessages([
                'form' => [__('contact.form_disabled')],
            ]);
        }

        $fields = collect($page['form_fields'] ?? []);
        $errors = [];
        $normalizedInput = $input;

        $inquiryTypeOptions = collect($page['inquiry_types'] ?? [])
            ->filter(fn ($t) => $t['visible'] ?? true)
            ->pluck('key')
            ->all();

        foreach ($fields as $field) {
            $key = (string) $field['field_key'];
            $type = (string) ($field['field_type'] ?? 'text');
            $required = (bool) ($field['required'] ?? false);
            $label = $field['label_ar'] ?? $key;

            if ($type === 'file') {
                $uploaded = $this->normalizeFiles($files[$key] ?? null);
                if ($required && $uploaded === []) {
                    $errors[$key] = [__('validation.required', ['attribute' => $label])];
                }
                foreach ($uploaded as $file) {
                    if (! $this->isAllowedAttachment($file)) {
                        $errors[$key] = [__('contact.invalid_attachment')];
                    }
                }
                continue;
            }

            $value = $input[$key] ?? null;
            if ($required && ($value === null || $value === '')) {
                $errors[$key] = [__('validation.required', ['attribute' => $label])];
                continue;
            }

            if ($value === null || $value === '') {
                continue;
            }

            if ($type === 'email' || $key === 'email') {
                if (! filter_var((string) $value, FILTER_VALIDATE_EMAIL)) {
                    $errors[$key] = [__('validation.email', ['attribute' => $label])];
                }
            }

            if ($type === 'phone' || $key === 'phone') {
                $normalized = $this->phones->normalize((string) $value);
                if (! $this->phones->isValidSaudiMobile($normalized)) {
                    $errors[$key] = [__('Use a Saudi mobile number, e.g. 05xxxxxxxx.')];
                } else {
                    $normalizedInput[$key] = $normalized;
                }
            }

            if ($type === 'select' || $key === 'inquiry_type') {
                if (! in_array((string) $value, $inquiryTypeOptions, true)) {
                    $errors[$key] = [__('contact.invalid_inquiry_type')];
                }
            }

            if ($key === 'message' && mb_strlen(trim((string) $value)) < 10) {
                $errors[$key] = [__('contact.message_too_short')];
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        $inquiry = ContactInquiry::create([
            'name' => (string) ($normalizedInput['name'] ?? ''),
            'email' => (string) ($normalizedInput['email'] ?? ''),
            'phone' => isset($normalizedInput['phone']) ? (string) $normalizedInput['phone'] : null,
            'inquiry_type' => isset($normalizedInput['inquiry_type']) ? (string) $normalizedInput['inquiry_type'] : null,
            'subject' => isset($normalizedInput['subject']) ? (string) $normalizedInput['subject'] : null,
            'message' => (string) ($normalizedInput['message'] ?? ''),
            'form_data' => collect($normalizedInput)
                ->except(['name', 'email', 'phone', 'message', 'inquiry_type', 'subject', 'attachments'])
                ->all(),
            'status' => ContactInquiry::STATUS_NEW,
        ]);

        $attachmentPaths = $this->storeAttachments($inquiry, $files);
        if ($attachmentPaths !== []) {
            $formData = $inquiry->form_data ?? [];
            $formData['attachments'] = $attachmentPaths;
            $inquiry->update(['form_data' => $formData]);
        }

        $this->notifyStaff($inquiry->fresh(), $page);

        return $inquiry;
    }

    /**
     * @return list<UploadedFile>
     */
    private function normalizeFiles(mixed $files): array
    {
        if ($files === null) {
            return [];
        }
        if ($files instanceof UploadedFile) {
            return [$files];
        }
        if (is_array($files)) {
            return array_values(array_filter($files, fn ($f) => $f instanceof UploadedFile));
        }

        return [];
    }

    private function isAllowedAttachment(UploadedFile $file): bool
    {
        if ($file->getSize() > 5 * 1024 * 1024) {
            return false;
        }

        return in_array(strtolower($file->extension()), ['pdf', 'jpg', 'jpeg', 'png'], true);
    }

    /**
     * @param  array<string, UploadedFile|array<int, UploadedFile>>  $files
     * @return list<array{path: string, name: string}>
     */
    private function storeAttachments(ContactInquiry $inquiry, array $files): array
    {
        $stored = [];
        $uploaded = $this->normalizeFiles($files['attachments'] ?? null);
        if (count($uploaded) > 3) {
            throw ValidationException::withMessages([
                'attachments' => [__('contact.too_many_attachments')],
            ]);
        }

        foreach ($uploaded as $index => $file) {
            $path = $file->store("contact-inquiries/{$inquiry->id}", 'public');
            $stored[] = [
                'path' => $path,
                'name' => $file->getClientOriginalName(),
                'url' => Storage::disk('public')->url($path),
            ];
        }

        return $stored;
    }

    /**
     * @param  array<string, mixed>  $page
     */
    protected function notifyStaff(ContactInquiry $inquiry, array $page): void
    {
        $staffIds = Permission::userIdsHavingPermission('settings.view');
        foreach ($staffIds as $staffId) {
            Notification::create([
                'user_id' => (int) $staffId,
                'type' => 'contact_inquiry_new',
                'title' => __('contact.notification_staff_title'),
                'body' => __('contact.notification_staff_body', ['name' => $inquiry->name]),
                'data' => ['contact_inquiry_id' => $inquiry->id],
            ]);
        }

        $emails = array_filter($page['notify_emails'] ?? []);
        foreach ($emails as $email) {
            if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                continue;
            }
            try {
                Mail::raw(
                    __('contact.email_body', [
                        'name' => $inquiry->name,
                        'email' => $inquiry->email,
                        'message' => $inquiry->message,
                    ]),
                    fn ($m) => $m->to($email)->subject(__('contact.email_subject'))
                );
            } catch (\Throwable) {
                // Mail optional in dev
            }
        }
    }
}
