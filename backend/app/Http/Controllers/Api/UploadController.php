<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class UploadController extends Controller
{
    /**
     * Upload image or PDF (transfer receipts, product images, etc.).
     * Accepts multipart field "image" (legacy) or "file" (finance forms).
     */
    public function store(Request $request): JsonResponse
    {
        $uploaded = $request->file('file') ?? $request->file('image');
        $inputKey = $request->hasFile('file') ? 'file' : ($request->hasFile('image') ? 'image' : null);

        if (! $uploaded || ! $inputKey) {
            throw ValidationException::withMessages([
                'file' => [__('validation.required', ['attribute' => 'file'])],
            ]);
        }

        $context = (string) $request->input('context', '');
        $invalidTypeMessage = match ($context) {
            'wallet_charge' => __('finance.wallet_charge_receipt_invalid_type'),
            'wallet_withdraw' => __('finance.wallet_withdraw_receipt_invalid_type'),
            'order_payment' => __('finance.upload_invalid_type'),
            default => __('finance.upload_invalid_type'),
        };

        Validator::make(
            [$inputKey => $uploaded],
            [
                $inputKey => [
                    'required',
                    'file',
                    'mimes:jpeg,jpg,png,webp,gif,pdf',
                    'max:10240',
                ],
            ],
            [
                "{$inputKey}.mimes" => $invalidTypeMessage,
            ],
        )->validate();

        $mime = (string) $uploaded->getMimeType();
        $ext = strtolower($uploaded->getClientOriginalExtension() ?: '');
        $isPdf = $mime === 'application/pdf' || $ext === 'pdf';

        $folder = $isPdf ? 'uploads/finance' : 'uploads/products';
        $name = Str::uuid().'.'.$uploaded->getClientOriginalExtension();
        $path = $uploaded->storeAs($folder, $name, 'public');
        $url = '/storage/'.$path;

        return response()->json([
            'url' => $url,
            'path' => $path,
            'data' => [
                'url' => $url,
                'path' => $path,
            ],
        ], 201);
    }
}
