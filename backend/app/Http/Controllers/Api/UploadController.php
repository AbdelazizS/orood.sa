<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadController extends Controller
{
    /**
     * Upload image(s). Returns URLs for use in product creation.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'image', 'mimes:jpeg,jpg,png,webp,gif', 'max:5120'],
        ]);

        $file = $request->file('image');
        $name = Str::uuid() . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs('uploads/products', $name, 'public');

        // Return path for frontend — works with Vite proxy (/storage -> backend)
        $url = '/storage/' . $path;

        return response()->json([
            'url' => $url,
            'path' => $path,
        ], 201);
    }
}
