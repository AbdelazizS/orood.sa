<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Videos\ChunkedVideoUploads;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** POST /uploads/video-chunks — one piece of a large video (see ChunkedVideoUploads). */
class VideoChunkController extends Controller
{
    public function store(Request $request, ChunkedVideoUploads $uploads): JsonResponse
    {
        $validated = $request->validate([
            'upload_id' => ['required', 'uuid'],
            'index' => ['required', 'integer', 'min:0'],
            'total' => ['required', 'integer', 'min:1'],
            'chunk' => ['required', 'file', 'max:2048'],
        ]);

        $uploads->storeChunk(
            (int) $request->user()->id,
            $validated['upload_id'],
            (int) $validated['index'],
            (int) $validated['total'],
            $request->file('chunk'),
        );

        return response()->json(['data' => ['received' => (int) $validated['index']]]);
    }
}
