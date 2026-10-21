<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ListingFollowUpNote extends Model
{
    protected $fillable = [
        'subscriber_listing_id',
        'author_id',
        'body',
    ];

    public function subscriberListing(): BelongsTo
    {
        return $this->belongsTo(SubscriberListing::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
