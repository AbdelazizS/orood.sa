<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MessageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $conversations = Conversation::query()
            ->where(fn ($q) => $q->where('buyer_id', $user->id)->orWhere('seller_id', $user->id))
            ->with(['product', 'buyer', 'seller', 'messages' => fn ($q) => $q->orderByDesc('id')->limit(1)])
            ->withCount([
                'messages as unread_count' => fn ($q) => $q->where('read', false)->where('user_id', '!=', $user->id),
            ])
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (Conversation $conversation) => $this->formatConversation($conversation));

        return response()->json(['data' => $conversations]);
    }

    public function show(Request $request, Conversation $conversation): JsonResponse
    {
        $user = $request->user();
        if ($conversation->buyer_id !== $user->id && $conversation->seller_id !== $user->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $conversation->messages()
            ->where('user_id', '!=', $user->id)
            ->where('read', false)
            ->update(['read' => true]);

        $messages = $conversation->messages()->with('user')->orderBy('created_at')->get();

        return response()->json(['data' => $messages]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['nullable', 'integer', 'exists:products,id'],
            'recipient_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $hasProduct = $request->filled('product_id');
        $hasRecipient = $request->filled('recipient_id');

        if ($hasProduct === $hasRecipient) {
            return response()->json([
                'message' => __('Provide exactly one of product_id or recipient_id.'),
            ], 422);
        }

        $buyer = $request->user();

        if ($hasProduct) {
            $product = \App\Models\Product::findOrFail((int) $validated['product_id']);
            $seller = $product->seller;

            if ($buyer->id === $seller->id) {
                return response()->json(['message' => 'Cannot message yourself'], 422);
            }

            $dedupeKey = Conversation::listingDedupeKey((int) $product->id, (int) $buyer->id);
            $conversation = Conversation::firstOrCreate(
                ['dedupe_key' => $dedupeKey],
                [
                    'product_id' => $product->id,
                    'buyer_id' => $buyer->id,
                    'seller_id' => $seller->id,
                    'conversation_type' => Conversation::TYPE_LISTING,
                ],
            );

            $uniqueBuyersCount = Conversation::query()
                ->where('product_id', $product->id)
                ->distinct('buyer_id')
                ->count('buyer_id');

            $product->update(['message_count' => $uniqueBuyersCount]);
        } else {
            $seller = User::query()->findOrFail((int) $validated['recipient_id']);

            if ($buyer->id === $seller->id) {
                return response()->json(['message' => 'Cannot message yourself'], 422);
            }

            $dedupeKey = Conversation::directDedupeKey((int) $buyer->id, (int) $seller->id);
            $conversation = Conversation::firstOrCreate(
                ['dedupe_key' => $dedupeKey],
                [
                    'product_id' => null,
                    'buyer_id' => $buyer->id,
                    'seller_id' => $seller->id,
                    'conversation_type' => Conversation::TYPE_DIRECT,
                ],
            );
        }

        $message = $conversation->messages()->create([
            'user_id' => $buyer->id,
            'body' => $validated['body'],
            'read' => false,
        ]);

        $conversation->touch();

        return response()->json([
            'data' => $message->load('user'),
            'conversation_id' => $conversation->id,
        ], 201);
    }

    public function reply(Request $request, Conversation $conversation): JsonResponse
    {
        $user = $request->user();
        if ($conversation->buyer_id !== $user->id && $conversation->seller_id !== $user->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $message = $conversation->messages()->create([
            'user_id' => $user->id,
            'body' => $validated['body'],
            'read' => false,
        ]);

        $conversation->touch();

        return response()->json(['data' => $message->load('user')], 201);
    }

    private function formatConversation(Conversation $conversation): array
    {
        $last = $conversation->messages->first();

        return [
            'id' => $conversation->id,
            'product_id' => $conversation->product_id,
            'conversation_type' => $conversation->conversation_type ?? Conversation::TYPE_LISTING,
            'buyer_id' => $conversation->buyer_id,
            'seller_id' => $conversation->seller_id,
            'product' => $conversation->product,
            'buyer' => $conversation->buyer,
            'seller' => $conversation->seller,
            'updated_at' => $conversation->updated_at,
            'created_at' => $conversation->created_at,
            'unread_count' => (int) ($conversation->unread_count ?? 0),
            'last_message' => $last ? [
                'id' => $last->id,
                'body' => $last->body,
                'created_at' => $last->created_at,
                'user_id' => $last->user_id,
                'read' => (bool) $last->read,
            ] : null,
        ];
    }
}
