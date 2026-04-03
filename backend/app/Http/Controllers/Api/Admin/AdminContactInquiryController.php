<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactInquiry;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminContactInquiryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ContactInquiry::with('assignedTo')
            ->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $inquiries = $query->paginate($request->get('per_page', 20));

        return response()->json([
            'data' => $inquiries->items(),
            'meta' => [
                'current_page' => $inquiries->currentPage(),
                'last_page' => $inquiries->lastPage(),
                'per_page' => $inquiries->perPage(),
                'total' => $inquiries->total(),
            ],
        ]);
    }

    public function show(ContactInquiry $contact_inquiry): JsonResponse
    {
        $contact_inquiry->load('assignedTo');
        return response()->json(['data' => $contact_inquiry]);
    }

    public function update(Request $request, ContactInquiry $contact_inquiry): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['sometimes', 'string', 'in:new,in_progress,resolved,closed'],
            'assigned_to' => ['nullable', 'exists:users,id'],
            'admin_notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $contact_inquiry->update($validated);

        return response()->json([
            'message' => __('Inquiry updated.'),
            'data' => $contact_inquiry->fresh('assignedTo'),
        ]);
    }

    public function assignees(): JsonResponse
    {
        $users = User::whereIn('role', ['super_admin', 'admin', 'manager', 'employee'])
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role']);

        return response()->json(['data' => $users]);
    }
}
