<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminMessageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Conversation::with(['product', 'buyer', 'seller'])
            ->withCount('messages')
            ->orderByDesc('updated_at');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->whereHas('buyer', fn ($b) => $b->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"))
                    ->orWhereHas('seller', fn ($s) => $s->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"))
                    ->orWhereHas('product', fn ($p) => $p->where('title', 'like', "%{$search}%"));
            });
        }

        $conversations = $query->paginate($request->get('per_page', 20));

        $data = $conversations->getCollection()->map(fn ($c) => [
            'id' => $c->id,
            'product' => $c->product ? ['id' => $c->product->id, 'title' => $c->product->title] : null,
            'buyer' => $c->buyer ? ['id' => $c->buyer->id, 'name' => $c->buyer->name, 'email' => $c->buyer->email] : null,
            'seller' => $c->seller ? ['id' => $c->seller->id, 'name' => $c->seller->name, 'email' => $c->seller->email] : null,
            'messages_count' => $c->messages_count ?? 0,
            'updated_at' => $c->updated_at,
        ]);

        $conversations->setCollection($data);

        return response()->json([
            'data' => $conversations->items(),
            'meta' => [
                'current_page' => $conversations->currentPage(),
                'last_page' => $conversations->lastPage(),
                'per_page' => $conversations->perPage(),
                'total' => $conversations->total(),
            ],
        ]);
    }

    public function show(Conversation $conversation): JsonResponse
    {
        $conversation->load(['product', 'buyer', 'seller']);
        $messages = $conversation->messages()->with('user')->orderBy('created_at')->get();

        return response()->json([
            'data' => [
                'conversation' => [
                    'id' => $conversation->id,
                    'product' => $conversation->product ? ['id' => $conversation->product->id, 'title' => $conversation->product->title] : null,
                    'buyer' => $conversation->buyer ? ['id' => $conversation->buyer->id, 'name' => $conversation->buyer->name, 'email' => $conversation->buyer->email] : null,
                    'seller' => $conversation->seller ? ['id' => $conversation->seller->id, 'name' => $conversation->seller->name, 'email' => $conversation->seller->email] : null,
                ],
                'messages' => $messages->map(fn ($m) => [
                    'id' => $m->id,
                    'body' => $m->body,
                    'user_id' => $m->user_id,
                    'user' => $m->user ? ['id' => $m->user->id, 'name' => $m->user->name] : null,
                    'created_at' => $m->created_at,
                ]),
            ],
        ]);
    }
}
