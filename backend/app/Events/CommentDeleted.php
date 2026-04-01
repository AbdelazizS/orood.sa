<?php

namespace App\Events;

use App\Models\Comment;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CommentDeleted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $listingId;
    public int $commentId;

    public function __construct(Comment $comment)
    {
        $this->listingId = (int) $comment->listing_id;
        $this->commentId = (int) $comment->id;
    }

    public function broadcastOn(): Channel
    {
        return new Channel('listing.' . $this->listingId);
    }

    public function broadcastAs(): string
    {
        return 'CommentDeleted';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->commentId,
        ];
    }
}

