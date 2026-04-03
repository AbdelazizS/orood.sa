<?php

namespace App\Events;

use App\Models\Comment;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CommentLiked implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Comment $comment)
    {
    }

    public function broadcastOn(): Channel
    {
        return new Channel('listing.' . $this->comment->listing_id);
    }

    public function broadcastAs(): string
    {
        return 'CommentLiked';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => (int) $this->comment->id,
            'likes_count' => (int) $this->comment->likes_count,
            'dislikes_count' => (int) $this->comment->dislikes_count,
        ];
    }
}

