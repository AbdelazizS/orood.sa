<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Purchase extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'buyer_id',
        'seller_id',
        'bid_id',
        'group_buy_reservation_id',
        'amount',
        'wholesale_unit_price',
        'wholesale_discount_percent',
        'wholesale_checkout_deadline_at',
        'wholesale_campaign_completed_at',
        'quantity',
        'payment_method',
        'payment_method_id',
        'status',
        'cod_policy_accepted_at',
        'shipping_address',
        'shipping_lat',
        'shipping_lng',
        'buyer_note',
        'cod_seller_accepted_at',
        'seller_transfer_confirmed_at',
        'transfer_confirmed_by',
        'buyer_transfer_confirmed_at',
        'buyer_transfer_confirmed_by',
        'tracking_number',
        'carrier',
        'tracking_url',
        'invoice_url',
        'buyer_phone',
        'buyer_email',
        'buyer_name',
        'admin_cancellation_reason',
        'admin_cancelled_by',
        'admin_cancelled_at',
        'admin_refund_reason',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'wholesale_unit_price' => 'decimal:2',
        'wholesale_discount_percent' => 'integer',
        'quantity' => 'integer',
        'shipping_lat' => 'decimal:7',
        'shipping_lng' => 'decimal:7',
        'cod_seller_accepted_at' => 'datetime',
        'seller_transfer_confirmed_at' => 'datetime',
        'buyer_transfer_confirmed_at' => 'datetime',
        'admin_cancelled_at' => 'datetime',
        'wholesale_checkout_deadline_at' => 'datetime',
        'wholesale_campaign_completed_at' => 'datetime',
    ];

    public const STATUS_PENDING = 'pending';
    /** Escrow / platform hold: funds captured, not yet released to seller. */
    public const STATUS_AWAITING_PAYMENT = 'awaiting_payment';
    /** COD: buyer requested; seller must accept before shipping. */
    public const STATUS_COD_REQUESTED = 'cod_requested';
    public const STATUS_SHIPPED = 'shipped';
    public const STATUS_DELIVERED = 'delivered';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_DISPUTED = 'disputed';

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function bid(): BelongsTo
    {
        return $this->belongsTo(Bid::class);
    }

    public function groupBuyReservation(): BelongsTo
    {
        return $this->belongsTo(GroupBuyReservation::class, 'group_buy_reservation_id');
    }

    public function orderPaymentRequests(): HasMany
    {
        return $this->hasMany(OrderPaymentRequest::class);
    }

    public function latestOrderPaymentRequest(): HasOne
    {
        return $this->hasOne(OrderPaymentRequest::class)->latestOfMany();
    }

    public function isDirectTransfer(): bool
    {
        return $this->payment_method === 'direct_transfer';
    }

    public function sellerConfirmedDirectTransfer(): bool
    {
        return $this->seller_transfer_confirmed_at !== null;
    }

    public function buyerConfirmedTransferSent(): bool
    {
        return $this->buyer_transfer_confirmed_at !== null;
    }

    public function hasTransferReceiptUploaded(): bool
    {
        $req = $this->relationLoaded('latestOrderPaymentRequest')
            ? $this->latestOrderPaymentRequest
            : $this->latestOrderPaymentRequest()->with('values')->first();

        if (! $req) {
            return false;
        }

        foreach ($req->values as $value) {
            if ($value->file_url) {
                return true;
            }
            if (str_contains((string) $value->field_key, 'receipt') && $value->value_text) {
                return true;
            }
        }

        return false;
    }
}

