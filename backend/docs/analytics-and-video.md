# Market analytics & video delivery — audit, design and operations

## 1. Analytics audit (before this change)

| Source | Table | What it records | Notes |
|---|---|---|---|
| Listing views | `page_visits` | product, owner, visitor (user id) or IP, source, time | Written by `ProductViewController`, `VisitorController` (deduplicated), `PublicProfileController` (profile views, no product) |
| Page visits | `visitors` | path, session, IP, user agent, source / UTM / referrer, user | `city` / `country` columns exist but are never filled — **viewer location is not tracked** |
| View counters | `products.view_count`, `today_view_count`, `daily_view_count` | running totals | No history; not used for reports |
| Searches | — | **not tracked** | Added: `analytics_search_events` |
| Orders | `purchases` | product, buyer, seller, `amount` (total = unit × quantity), `status`, `admin_refund_reason` | Business record, source of truth for sales |
| Existing admin analytics | `AdminAnalyticsController` | computed live from raw tables on every request | Slows down with volume; would lose history once raw events are deleted |
| Cleanup jobs | — | none for analytics | |

## 2. Data classification

**Raw analytics events — deleted after `ANALYTICS_RAW_RETENTION_DAYS` (75):**
`page_visits`, `visitors`, `analytics_search_events`.

**Business records — never touched by analytics cleanup:** products, purchases (orders, payments, refunds),
users / companies, reviews, listing feedback, reports, wallet / finance tables, audit logs, conversations.

**Permanent aggregates (never deleted):** `analytics_daily_product_views`, `analytics_daily_product_sales`,
`analytics_daily_market_stats`, `analytics_daily_search_terms`, plus bookkeeping `analytics_aggregated_days`
and the run log `analytics_job_runs`.

> Side effect to know: features that read old `page_visits` / `visitors` directly (seller "visits" charts,
> the admin visitor log) will only show the last 75 days once cleanup is enabled. Listing view counters on
> `products` are unaffected.

## 3. Metric definitions

- **Reporting day:** calendar day in `ANALYTICS_TIMEZONE` (Asia/Riyadh). Database timestamps stay UTC.
- **Views:** rows in `page_visits` with a product.
- **Unique viewers (per day):** distinct signed-in viewers + distinct guest IPs. Summed across days in the
  dashboard ("daily uniques"), so one person on two days counts twice. Guest uniqueness by IP is approximate.
- **Listing city:** the city of the listing (where the property / item is), not the viewer's city.
- **Orders:** purchases created that day, any status.
- **Completed sales / revenue:** status `completed` or `delivered` (config `analytics.completed_statuses`),
  dated by the day the order was **placed**; revenue = `amount` of those orders. Pending, awaiting payment,
  COD requested, shipped, disputed and cancelled orders are never counted as sales.
- **Cancelled:** status `cancelled`. **Refunded:** cancelled with `admin_refund_reason` set.
- **Conversion:** completed sales ÷ views. **Average order value:** revenue ÷ completed sales.
- **Search:** one event per search (first results page only); `zero_result_searches` = searches with no results.

## 4. Aggregation

`php artisan analytics:aggregate` (scheduled every 15 minutes):
- recomputes today and the last `ANALYTICS_LATE_DAYS` (2) days from raw events — late events are picked up;
- recomputes the **sales** of any earlier day whose orders were placed / updated since the last run, so an
  order completed weeks later still lands on the right day;
- each day is fully recomputed and replaced in one transaction: re-running never double-counts;
- days older than the raw window keep their stored view / search numbers (only sales can be rebuilt).

Listing title, section, city and seller are snapshotted into the daily rows, so history survives
listing edits and deletions. Aggregates contain no IPs or user ids.

## 5. Retention

`php artisan analytics:prune` (scheduled daily 04:00) does nothing until `ANALYTICS_RETENTION_ENABLED=true`.
- Preview: `php artisan analytics:prune --dry-run` (counts only, deletes nothing).
- Before deleting, any day in the deletion range without final aggregates is aggregated first.
- Deletes in batches of 1000 ids per table; idempotent; results and failures are logged in `analytics_job_runs`.

## 6. Video delivery audit and changes

| Area | Finding | Change |
|---|---|---|
| Listing cards, video grid, listing page | Thumbnails only (lazy `<img>`), no video downloads | — (already correct) |
| Shorts viewer | Every Short on the page had `preload="metadata"` (7 requests, 48.9 MB in 8 s locally) | Only the active Short and its neighbours get a source; others show the poster (3 requests, 26.9 MB) |
| Simultaneous playback | Nothing prevented two videos playing | Starting a video pauses all others (`lib/video/singlePlayback.js`) |
| Thumbnails | Browser-generated at up to 1280 px | 640 px, JPEG 0.78 for new uploads |
| Upload | Rejected by server body limits; shared throttle counter | 512 KB chunked upload, separate rate limiters, in-browser compression > 20 MB |
| Processing | No server processing, no ffmpeg | Optional fast start (`-c copy -movflags +faststart`, no re-encode) after the response when ffmpeg is installed; file size recorded; `videos:optimize` for existing videos |
| Delivery | Files served from `/storage` by the web server | Keep it that way (see nginx below); HLS / CDN not justified for short listing videos yet |

Measurements were taken with `--disable-cache` headless Chrome against the local dev server (PHP's
built-in server ignores HTTP Range requests, so sizes there are upper bounds; nginx serves only the bytes
needed).

### Recommended nginx for `/storage` (videos and images are immutable — new uploads get new names)

```nginx
location /storage/ {
    alias /var/www/arooth/backend/storage/app/public/;
    expires 30d;
    add_header Cache-Control "public, max-age=2592000, immutable";
    access_log off;
    # nginx handles Range requests for static files by default (fast seeking / progressive playback).
}
```

### Remaining bottleneck (not video)

Listing **images** are stored and served at their original size (up to 5 MB each): 9–10 MB of images on
the homepage and videos page. Resizing images on upload (e.g. 1600 px + a 400 px card thumbnail) would cut
page weight far more than any video change. Needs a decision (GD/Imagick on the server, or resize in the
browser before upload).
