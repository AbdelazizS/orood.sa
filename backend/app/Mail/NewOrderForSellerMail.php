<?php

namespace App\Mail;

use App\Models\Purchase;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NewOrderForSellerMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Purchase $purchase,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: __('New order #:id', ['id' => $this->purchase->id]),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.new-order-seller',
        );
    }
}
