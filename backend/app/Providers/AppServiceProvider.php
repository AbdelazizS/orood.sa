<?php

namespace App\Providers;

use App\Contracts\SmsSender;
use App\Services\Sms\LogSmsSender;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(SmsSender::class, LogSmsSender::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        JsonResource::withoutWrapping();

        // Video uploads get their own counters: plain "throttle:N,1" limits share one counter per
        // user, so the hundreds of pieces of a big video made the final save fail ("Too Many Attempts").
        RateLimiter::for('video-chunks', fn (Request $request) => Limit::perMinute(3000)
            ->by('video-chunks:'.($request->user()?->id ?: $request->ip())));
        RateLimiter::for('video-save', fn (Request $request) => Limit::perMinute(30)
            ->by('video-save:'.($request->user()?->id ?: $request->ip())));
    }
}
