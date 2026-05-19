<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ __('New order') }}</title>
</head>
<body style="font-family: sans-serif; line-height: 1.5;">
    <p>{{ __('Hello :name,', ['name' => $purchase->seller?->name ?? '']) }}</p>
    <p>{{ __('You have a new order.') }}</p>
    @if($purchase->group_buy_reservation_id)
        <p style="background:#f0f9ff;padding:10px;border-radius:6px;"><strong>{{ __('wholesale.email_new_wholesale_note') }}</strong></p>
    @endif
    <ul>
        <li><strong>{{ __('Order') }}</strong> #{{ $purchase->id }}</li>
        <li><strong>{{ __('Product') }}</strong> {{ $purchase->product?->title }}</li>
        <li><strong>{{ __('Amount') }}</strong> {{ $purchase->amount }}</li>
        <li><strong>{{ __('Payment') }}</strong> {{ $purchase->payment_method }}</li>
    </ul>
    <p>{{ __('Buyer') }}: {{ $purchase->buyer?->name }}</p>
</body>
</html>
