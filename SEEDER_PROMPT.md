# Seeder Prompt for Cursor

Use this prompt to ensure the Arooth marketplace has complete demo data for testing all Phase 2 dashboards and features.

## Objective

Seed the database with demo users (super_admin, admin, manager, seller, buyer) and sample data so each dashboard can be tested immediately after `php artisan migrate:fresh --seed`.

## Demo Users (All password: `password`)

| Email | Role | Purpose |
|-------|------|---------|
| super@arooth.sa | super_admin | Full control, test admin routes |
| admin@arooth.sa | admin | Manage categories, users, audit |
| manager@arooth.sa | manager | Limited admin, analytics view |
| demo@arooth.sa | seller | Main seller, owns most products |
| seller2@arooth.sa | seller | Secondary seller for multi-seller testing |
| buyer@arooth.sa | buyer | Browse, favorites, bids, messaging |

## Seeder Requirements

1. **Users**
   - Create all 6 users with `bcrypt('password')`
   - Use `firstOrCreate` or `updateOrCreate` so re-running doesn't duplicate

2. **Products**
   - Assign products to `demo@arooth.sa` and `seller2@arooth.sa`
   - Include Phase 2 fields: `accept_bids`, `bids_visible`, `contact_preferences`, `shipping_details`
   - At least 3 products with `accept_bids=true` for bidding tests
   - At least 2 products with `bids_visible=false` to test hidden bids
   - Add `media.gallery` (main + 2+ additional image URLs) for gallery tests
   - Add `stats.bids` for products that accept bids

3. **Bids**
   - Create 2–5 bids on products with `accept_bids=true`
   - Assign bids to `buyer@arooth.sa` and optionally other users

4. **Favorites**
   - Add 2–4 favorites for `buyer@arooth.sa` on various products

5. **Saved Searches**
   - Add 1–2 saved searches for `buyer@arooth.sa`

6. **Conversations & Messages**
   - Create 1–2 conversations between `buyer@arooth.sa` and sellers
   - Add 3–5 messages per conversation for chat UI testing

7. **Audit Logs**
   - Add 2–3 sample audit log entries (admin actions) for AdminAuditPage

8. **Category-Region Visibility**
   - Ensure `category_region` pivot exists with `is_visible` per region
   - Optionally set 1 category as hidden in 1 region to test "not available in your area"

## Quick Test Checklist After Seeding

- [ ] Login as super@arooth.sa → access /admin
- [ ] Login as admin@arooth.sa → access /admin
- [ ] Login as manager@arooth.sa → access /admin
- [ ] Login as demo@arooth.sa → see listings in /dashboard/listings
- [ ] Login as buyer@arooth.sa → see favorites, saved searches, messages
- [ ] Product details page shows gallery, bids, warranty (for used)
- [ ] Bid on product as buyer → see bid in list
- [ ] Admin categories page → toggle visibility
- [ ] Admin audit page → see sample logs

## Implementation Status

The `PhaseOneSeeder` has been enhanced with:

- **seller2@arooth.sa** (seller) — secondary seller
- Products with `accept_bids`, `bids_visible`, `contact_preferences`, `shipping_details`, `media.gallery`
- 3 products with bids (Luxury Apartment, iPhone 15 Pro, MacBook Pro M3)
- 1 product with hidden bids (iPhone 15 Pro)
- Favorites for buyer (4 products)
- Saved searches for buyer (2)
- 1 conversation with 3 messages
- 2 audit log entries

## Run Command

```bash
cd backend
php artisan migrate:fresh --seed
```
