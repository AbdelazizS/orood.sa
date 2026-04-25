<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactInquiry;
use App\Models\Conversation;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminMessageController extends Controller
{
    /** i18n keys stored on notification `data` so titles follow the member's UI language. */
    private const PURPOSE_TITLE_KEYS = [
        'general' => 'notifications.adminNotice.general',
        'account_warning' => 'notifications.adminNotice.accountWarning',
        'finance_wallet' => 'notifications.adminNotice.financeWallet',
        'order' => 'notifications.adminNotice.order',
        'verification' => 'notifications.adminNotice.verification',
    ];

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
            'conversation_type' => $c->conversation_type ?? Conversation::TYPE_LISTING,
            'product' => $c->product ? ['id' => $c->product->id, 'title' => $c->product->title] : null,
            'buyer' => $this->formatConversationParticipant($c->buyer),
            'seller' => $this->formatConversationParticipant($c->seller),
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
                    'conversation_type' => $conversation->conversation_type ?? Conversation::TYPE_LISTING,
                    'product' => $conversation->product ? ['id' => $conversation->product->id, 'title' => $conversation->product->title] : null,
                    'buyer' => $this->formatConversationParticipant($conversation->buyer),
                    'seller' => $this->formatConversationParticipant($conversation->seller),
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

    public function unifiedSummary(): JsonResponse
    {
        $conversationByType = Conversation::query()
            ->selectRaw('COALESCE(conversation_type, ?) as conversation_type, COUNT(*) as total', [Conversation::TYPE_LISTING])
            ->groupBy('conversation_type')
            ->pluck('total', 'conversation_type');

        $contactByStatus = ContactInquiry::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');
        $unreadConversations = Conversation::query()
            ->whereHas('messages', fn ($q) => $q->where('read', false))
            ->count();

        return response()->json([
            'data' => [
                'conversations' => [
                    'listing' => (int) ($conversationByType[Conversation::TYPE_LISTING] ?? 0),
                    'direct' => (int) ($conversationByType[Conversation::TYPE_DIRECT] ?? 0),
                    'team' => (int) ($conversationByType['team'] ?? 0),
                    'unread' => (int) $unreadConversations,
                ],
                'contact_inquiries' => [
                    'new' => (int) ($contactByStatus[ContactInquiry::STATUS_NEW] ?? 0),
                    'in_progress' => (int) ($contactByStatus[ContactInquiry::STATUS_IN_PROGRESS] ?? 0),
                    'resolved' => (int) ($contactByStatus[ContactInquiry::STATUS_RESOLVED] ?? 0),
                    'closed' => (int) ($contactByStatus[ContactInquiry::STATUS_CLOSED] ?? 0),
                ],
            ],
        ]);
    }

    /**
     * Post a message in any conversation (admin panel). Members use {@see MessageController::reply}.
     */
    public function reply(Request $request, Conversation $conversation): JsonResponse
    {
        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $staff = $request->user();

        $message = $conversation->messages()->create([
            'user_id' => $staff->id,
            'body' => $validated['body'],
            'read' => false,
        ]);

        $conversation->touch();

        return response()->json(['data' => $message->load('user')], 201);
    }

    /**
     * @return array{id: int, name: string, email: string, role: string}|null
     */
    private function formatConversationParticipant(?User $user): ?array
    {
        if (! $user) {
            return null;
        }

        $role = $user->role;
        $roleValue = $role instanceof \BackedEnum ? $role->value : (string) $role;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $roleValue,
        ];
    }

    public function directMessage(Request $request): JsonResponse
    {
        $purposeKeys = array_merge(array_keys(self::PURPOSE_TITLE_KEYS), ['custom']);

        $validated = $request->validate([
            'user_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'user_email' => ['nullable', 'email', Rule::exists('users', 'email')],
            'body' => ['required', 'string', 'max:2000'],
            'purpose' => ['nullable', 'string', Rule::in($purposeKeys)],
            'title' => ['nullable', 'string', 'max:255'],
        ]);

        if (empty($validated['user_id']) && empty($validated['user_email'])) {
            return response()->json([
                'message' => __('Provide user_id or user_email.'),
            ], 422);
        }

        $purpose = $validated['purpose'] ?? 'general';
        if ($purpose === 'custom' && trim((string) ($validated['title'] ?? '')) === '') {
            return response()->json([
                'message' => __('A subject line is required for a custom notice.'),
            ], 422);
        }

        $user = isset($validated['user_id'])
            ? User::query()->findOrFail((int) $validated['user_id'])
            : User::query()->where('email', $validated['user_email'])->firstOrFail();

        $data = [
            'source' => 'admin_messages_panel',
            'purpose' => $purpose,
        ];

        $titleColumn = '';
        if ($purpose === 'custom') {
            $titleColumn = trim($validated['title']);
        } elseif (isset(self::PURPOSE_TITLE_KEYS[$purpose])) {
            $data['i18n_title_key'] = self::PURPOSE_TITLE_KEYS[$purpose];
        }

        $notification = Notification::create([
            'user_id' => $user->id,
            'type' => 'admin_notice',
            'title' => $titleColumn,
            'body' => $validated['body'],
            'data' => $data,
        ]);

        return response()->json([
            'message' => __('Notice sent to the user.'),
            'data' => [
                'notification_id' => $notification->id,
                'user_id' => $user->id,
                'user_email' => $user->email,
            ],
        ], 201);
    }

    /**
     * In-app chat with a member: staff is buyer, member is seller. No listing required.
     */
    public function openDirectConversation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'user_email' => ['nullable', 'email', Rule::exists('users', 'email')],
        ]);

        if (empty($validated['user_id']) && empty($validated['user_email'])) {
            return response()->json([
                'message' => __('Provide user_id or user_email.'),
            ], 422);
        }

        $member = isset($validated['user_id'])
            ? User::query()->findOrFail((int) $validated['user_id'])
            : User::query()->where('email', $validated['user_email'])->firstOrFail();

        $admin = $request->user();
        if ((int) $member->id === (int) $admin->id) {
            return response()->json(['message' => __('Cannot start a conversation with yourself.')], 422);
        }

        $dedupeKey = Conversation::directDedupeKey((int) $admin->id, (int) $member->id);
        $conversation = Conversation::firstOrCreate(
            ['dedupe_key' => $dedupeKey],
            [
                'product_id' => null,
                'buyer_id' => $admin->id,
                'seller_id' => $member->id,
                'conversation_type' => Conversation::TYPE_DIRECT,
            ],
        );

        return response()->json([
            'message' => __('Conversation ready.'),
            'data' => [
                'conversation_id' => $conversation->id,
                'product_id' => $conversation->product_id,
                'product_title' => $conversation->product?->title,
                'conversation_type' => $conversation->conversation_type,
            ],
        ], 201);
    }

    /** @deprecated Use openDirectConversation; kept for older admin clients. */
    public function openProductConversation(Request $request): JsonResponse
    {
        return $this->openDirectConversation($request);
    }
}
