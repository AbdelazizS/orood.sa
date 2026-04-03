<?php

namespace App\Notifications;

use App\Models\Review;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class NewReviewNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Review $review
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $reviewerName = $this->review->reviewer?->username ?? 'مستخدم';
        $ratingLabel = $this->review->rating_label;
        $username = $notifiable instanceof User ? $notifiable->username : (string) $notifiable->id;

        return [
            'type' => 'review_new',
            'title' => 'تقييم جديد',
            'body' => "{$reviewerName} قام بتقييمك: {$ratingLabel}",
            'data' => [
                'review_id' => $this->review->id,
                'reviewer_id' => $this->review->reviewer_id,
                'reviewer_username' => $this->review->reviewer?->username,
                'rating' => $this->review->rating,
                'link' => '/profile/' . $username,
            ],
        ];
    }
}
