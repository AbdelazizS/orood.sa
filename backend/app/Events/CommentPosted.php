<?php

namespace App\Events;

use App\Models\Comment;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CommentPosted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Comment $comment)
    {
        $this->comment->loadMissing(['user:id,name,username,avatar_url,is_verified', 'replies']);
    }

    public function broadcastOn(): Channel
    {
        return new Channel('listing.' . $this->comment->listing_id);
    }

    public function broadcastAs(): string
    {
        return 'CommentPosted';
    }

    public function broadcastWith(): array
    {
        return [
            'comment' => $this->comment->toArray(),
        ];
    }
}

