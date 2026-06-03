<?php

namespace App\Http\Requests;

use App\Services\PasswordPolicyService;
use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:3', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'regex:/^05\d{8}$/'],
            'how_did_you_hear' => ['nullable', 'string', 'max:255'],
            'referred_by_marketer_id' => ['nullable', 'integer', 'exists:users,id'],
            'password' => PasswordPolicyService::registerRules(),
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => __('auth.validation.name_required'),
            'name.min' => __('auth.validation.name_min'),
            'email.required' => __('auth.validation.email_required'),
            'email.email' => __('auth.validation.email_invalid'),
            'email.unique' => __('auth.validation.email_taken'),
            'password.required' => __('auth.validation.password_required'),
            'password.min' => __('auth.validation.password_min'),
            'password.regex' => __('auth.validation.password_rule'),
            'password.confirmed' => __('auth.validation.password_confirmed'),
        ];
    }
}
