# Arooth Account Dashboard & Related Products — Full Task List

Complete, detailed task list for building the account dashboard, verification, financial guarantee, order tracking, profile customization, and related products. All tasks should result in **fully functional, working features**.

---

## Phase 1: Database & Backend Foundation

### 1.1 Database Migrations

| # | Task | Details | Status |
|---|------|---------|--------|
| 1.1.1 | Create `verifications` table (document verification) | `user_id`, `type` (id_card, absher, company_license), `status` (pending, approved, rejected), `document_url`, `verified_at`, `rejected_reason`, `company_name`, `company_city`, `company_product_type` (for company type), `created_at`, `updated_at` | ⬜ |
| 1.1.2 | Create `guarantees` table | `user_id`, `amount`, `status` (active, refunded), `created_at`, `refunded_at` — for audit trail of guarantee deposits/refunds | ⬜ |
| 1.1.3 | Create `balances` table | `user_id`, `available` (decimal), `escrow` (decimal), `updated_at` — separate from users for proper balance tracking | ⬜ |
| 1.1.4 | Add `tracking_info` to `purchases` | `tracking_number`, `carrier`, `tracking_url` (nullable) | ⬜ |
| 1.1.5 | Add `invoice_url` to `purchases` | For generated invoice PDF path | ⬜ |
| 1.1.6 | Extend `users` for verification badges | `verification_level` (unverified, email, id_verified, company_verified) — or derive from verifications table | ⬜ |
| 1.1.7 | Add `companies` table (for wholesale directory) | `user_id`, `name`, `city_id`, `product_type`, `license_url`, `verified_at` — when company verification approved | ⬜ |

### 1.2 Backend Models

| # | Task | Details | Status |
|---|------|---------|--------|
| 1.2.1 | Create `Verification` model | BelongsTo User, fillable, casts, scopes for type/status | ⬜ |
| 1.2.2 | Create `Guarantee` model | BelongsTo User, fillable, casts | ⬜ |
| 1.2.3 | Create `Balance` model | BelongsTo User, or use Wallet pattern | ⬜ |
| 1.2.4 | Create `Company` model | For verified companies in wholesale directory | ⬜ |
| 1.2.5 | Update `User` model | Relations: verifications(), guarantees(), balance(), company() | ⬜ |
| 1.2.6 | Update `Purchase` model | Add tracking_info, invoice_url to fillable; relation to product with media | ⬜ |

---

## Phase 2: Account APIs (Laravel)

### 2.1 Verification APIs

| # | Task | Details | Status |
|---|------|---------|--------|
| 2.1.1 | `POST /api/v1/account/verify-document` | Upload ID/residence permit or company license. Request: `type` (id_card, company_license), `document` (file), `company_name`, `company_city`, `company_product_type` (if type=company). Store in storage, create Verification record. Rate limit: 5 attempts/hour. | ⬜ |
| 2.1.2 | `GET /api/v1/account/verification-status` | Return current verification level, pending/rejected status, badge type (grey, green, gold, blue) | ⬜ |
| 2.1.3 | Admin: `GET /api/v1/admin/verifications` | List pending verifications for admin review | ⬜ |
| 2.1.4 | Admin: `POST /api/v1/admin/verifications/{id}/approve` | Approve verification, set user.verification_level, create Company if company_license | ⬜ |
| 2.1.5 | Admin: `POST /api/v1/admin/verifications/{id}/reject` | Reject with reason | ⬜ |
| 2.1.6 | Absher placeholder | `POST /api/v1/account/verify-absher` — return "Coming soon" or stub for future integration | ⬜ |

### 2.2 Financial Guarantee APIs

| # | Task | Details | Status |
|---|------|---------|--------|
| 2.2.1 | `POST /api/v1/account/deposit-guarantee` | Request: `amount`. Validate amount > 0. Deduct from balance (or require payment flow). Create Guarantee record, update users.financial_guarantee. | ⬜ |
| 2.2.2 | `POST /api/v1/account/refund-guarantee` | Refund full guarantee to balance. Only if seller has no pending orders that could require guarantee deduction. Update users.financial_guarantee, create refund record in guarantees. | ⬜ |
| 2.2.3 | `GET /api/v1/account/guarantee-status` | Return current guarantee amount, status (active/refunded), can_refund (bool) | ⬜ |

### 2.3 Balance & Escrow APIs

| # | Task | Details | Status |
|---|------|---------|--------|
| 2.3.1 | `GET /api/v1/account/balance` | Return `available`, `escrow`, `financial_guarantee` | ⬜ |
| 2.3.2 | Balance logic on purchase | When buyer pays: add to escrow (seller). When buyer confirms receipt: move escrow → available (seller). | ⬜ |
| 2.3.3 | `POST /api/v1/account/confirm-receipt` | Request: `purchase_id`. Buyer only. Set purchase.status = 'completed', move escrow to seller available balance. | ⬜ |
| 2.3.4 | `POST /api/v1/account/withdraw` | Withdraw available balance to bank (placeholder or integration) | ⬜ |

### 2.4 Orders APIs

| # | Task | Details | Status |
|---|------|---------|--------|
| 2.4.1 | `GET /api/v1/account/orders` | List purchases where user is buyer OR seller. Query params: `role` (buyer|seller), `status`. Include product, buyer, seller, tracking_info. | ⬜ |
| 2.4.2 | `GET /api/v1/account/orders/{id}` | Single order with full details, product media, buyer/seller info, tracking, payment method, invoice | ⬜ |
| 2.4.3 | `PUT /api/v1/account/orders/{id}` | Seller: update tracking_info (tracking_number, carrier, tracking_url). Buyer: confirm receipt (calls confirm-receipt logic). | ⬜ |
| 2.4.4 | Invoice generation | On purchase completion or on demand: generate PDF invoice (product, buyer, seller, amount, payment method). Store path, return URL. | ⬜ |

### 2.5 Profile APIs

| # | Task | Details | Status |
|---|------|---------|--------|
| 2.5.1 | `PUT /api/v1/profile` | Already exists. Ensure it accepts: name, bio, avatar_url, cover_photo_url, logo_url, city_id, financial_guarantee. | ✅ |
| 2.5.2 | `GET /api/v1/users/{id}` | Public profile. Return: name, avatar, cover, bio, city, rating, completed_requests, last_seen, verification_badge, financial_guarantee_status, optional map location. | ⬜ |

---

## Phase 3: Frontend — Dashboard Layout & Sidebar

### 3.1 Sidebar Navigation

| # | Task | Details | Status |
|---|------|---------|--------|
| 3.1.1 | Add Financial Guarantee link | `/dashboard/guarantee` — separate page or keep in Balance page | ⬜ |
| 3.1.2 | Add Verification link | `/dashboard/verification` — verification flows | ⬜ |
| 3.1.3 | Reorder sidebar | User name/logo → Order Tracking → Balance → Financial Guarantee → Verification → Personal Info. (Overview, Listings, Favorites, Saved Searches as secondary.) | ⬜ |
| 3.1.4 | Top bar icons | Messages + Notifications — already exist. Ensure they work. | ✅ |
| 3.1.5 | User avatar/logo in sidebar | Use logo_url if set, else avatar, else initial. Link to public profile. | ⬜ |

### 3.2 Responsive Design

| # | Task | Details | Status |
|---|------|---------|--------|
| 3.2.1 | Desktop: two-column layout | Sidebar left, content right. Collapsible sidebar. | ✅ |
| 3.2.2 | Mobile: single-column | Sidebar as drawer/sheet. Content full width. | ⬜ |
| 3.2.3 | Clean typography | Consistent font sizes, line heights. Inline error messages. | ⬜ |

---

## Phase 4: Frontend — Profile Customization

### 4.1 Profile Edit Page

| # | Task | Details | Status |
|---|------|---------|--------|
| 4.1.1 | Logo/avatar upload | ImageUpload component, max 1 image, crop optional. Save to logo_url or avatar_url. | ✅ |
| 4.1.2 | Cover image upload | Aspect 3:1, full width. Save to cover_photo_url. | ✅ |
| 4.1.3 | "نبذة عني" (About me) | Textarea for bio. | ✅ |
| 4.1.4 | Edit/Delete buttons | Always visible for own profile. | ⬜ |
| 4.1.5 | City/region selector | Already in profile. | ✅ |
| 4.1.6 | Password change | Separate card. | ✅ |

### 4.2 Public Profile Page

| # | Task | Details | Status |
|---|------|---------|--------|
| 4.2.1 | Cover + logo display | Like Haraj. Full-width cover, avatar overlay. | ⬜ |
| 4.2.2 | City, rating, completed requests | Display from user data. | ⬜ |
| 4.2.3 | Last seen | "متصل الآن" or "آخر ظهور قبل X" | ⬜ |
| 4.2.4 | Verification badge | Grey / Green / Gold / Blue based on verification_level | ⬜ |
| 4.2.5 | Financial guarantee status | ✅ checkmark when guarantee > 0 | ⬜ |
| 4.2.6 | Optional map location | If user has location, show map embed or link | ⬜ |
| 4.2.7 | Share + Report icons | At top of profile | ⬜ |

---

## Phase 5: Frontend — Verification System

### 5.1 Verification Page (`/dashboard/verification`)

| # | Task | Details | Status |
|---|------|---------|--------|
| 5.1.1 | Three options UI | 1) Absher (disabled/coming soon), 2) Upload ID/residence permit, 3) Company license upload | ⬜ |
| 5.1.2 | Option 2: ID upload | File input, accept PDF/image. Submit to verify-document. Show pending/rejected state. | ⬜ |
| 5.1.3 | Option 3: Company upload | File + company name, city, product type. Submit to verify-document. | ⬜ |
| 5.1.4 | Badge display | Show current badge (grey/green/gold/blue) with explanation | ⬜ |
| 5.1.5 | Inline error messages | Validation errors, API errors | ⬜ |
| 5.1.6 | Rate limiting feedback | "Try again in X minutes" if rate limited | ⬜ |

### 5.2 Verification Badge Component

| # | Task | Details | Status |
|---|------|---------|--------|
| 5.2.1 | Badge variants | Grey (unverified), Green (email), Gold (ID verified), Blue (company) | ⬜ |
| 5.2.2 | Use across app | Profile, product cards, seller info, listings | ⬜ |

---

## Phase 6: Frontend — Financial Guarantee

### 6.1 Guarantee Page (or Balance page section)

| # | Task | Details | Status |
|---|------|---------|--------|
| 6.1.1 | Current guarantee display | Amount, status (active) | ✅ |
| 6.1.2 | Deposit form | Amount input, submit. Call deposit-guarantee API. | ✅ |
| 6.1.3 | Refund button | "استرداد الضمان" — only when no pending orders. Call refund-guarantee. Show confirmation dialog. | ⬜ |
| 6.1.4 | ✅ checkmark when active | Display when guarantee > 0 | ⬜ |
| 6.1.5 | Explanation text | "الضمان المالي: مبلغ محجوز لزيادة مصداقية البائع. قابل للاسترداد عند إلغاء البيع." | ⬜ |
| 6.1.6 | Refund flow clarification | "عند إلغاء البيع في المنصة، يمكن استرداد الضمان إلى الرصيد" — as per user note | ⬜ |

---

## Phase 7: Frontend — Balance & Escrow

### 7.1 Balance Page

| # | Task | Details | Status |
|---|------|---------|--------|
| 7.1.1 | Balance card | Available balance (from API, not hardcoded 0) | ⬜ |
| 7.1.2 | Escrow card | Amount held until buyer confirms receipt | ⬜ |
| 7.1.3 | Financial guarantee card | Already exists. Ensure API integration. | ⬜ |
| 7.1.4 | Withdraw button | Placeholder or real integration | ⬜ |
| 7.1.5 | Transaction history | Optional: list of balance changes | ⬜ |

---

## Phase 8: Frontend — Order Tracking

### 8.1 Order Tracking Page

| # | Task | Details | Status |
|---|------|---------|--------|
| 8.1.1 | Fetch orders API | GET /account/orders. Show as buyer and seller. | ⬜ |
| 8.1.2 | Order list | Cards or table: order number, date, product (image, title), buyer/seller info, status, payment method | ⬜ |
| 8.1.3 | Status badges | pending, paid, shipped, delivered, completed, cancelled | ⬜ |
| 8.1.4 | Shipment tracking | Display tracking_number, carrier, tracking_url. Seller can add/edit. | ⬜ |
| 8.1.5 | Confirm receipt (buyer) | Button to confirm. Calls confirm-receipt API. | ⬜ |
| 8.1.6 | Invoice link | Download/view invoice PDF | ⬜ |
| 8.1.7 | Tabs or filters | As buyer / As seller. By status. | ⬜ |
| 8.1.8 | Empty state | When no orders | ⬜ |

---

## Phase 9: Frontend — Offers & Requests (Listings)

### 9.1 Seller Listings Page

| # | Task | Details | Status |
|---|------|---------|--------|
| 9.1.1 | List user's products | Already exists. Ensure Edit, Update (bump), Delete, Duplicate. | ⬜ |
| 9.1.2 | Edit | Link to /products/:id/edit | ✅ |
| 9.1.3 | Update (bump) | POST /products/:id/bump | ✅ |
| 9.1.4 | Delete | With confirmation | ✅ |
| 9.1.5 | Duplicate | Navigate to /add with pre-filled state | ✅ |
| 9.1.6 | Share + Report | Icons at top of listing card or page | ⬜ |

### 9.2 Reviews Section ("آراء الآخرين")

| # | Task | Details | Status |
|---|------|---------|--------|
| 9.2.1 | Reviews on profile | GET /users/:id/reviews. Display rating, comment, reviewer, date. | ⬜ |
| 9.2.2 | Reviews on listings page | Optional: show reviews for each listing's seller | ⬜ |

---

## Phase 10: Related Products Section

### 10.1 Backend (Already Exists)

| # | Task | Details | Status |
|---|------|---------|--------|
| 10.1.1 | GET /products/:id/similar | Subcategory → category → city → recency. | ✅ |
| 10.1.2 | Add sort param | `?sort=price|views|newest` | ⬜ |
| 10.1.3 | Response includes | id, title, price, image_url, city, region, seller badge, stats (views, comments) | ⬜ |
| 10.1.4 | Redis cache | Cache related products query (optional) | ⬜ |

### 10.2 Frontend — Related Product Card

| # | Task | Details | Status |
|---|------|---------|--------|
| 10.2.1 | Card design | Image, title (truncate), price or "اسأل السعر", location, seller badge | ⬜ |
| 10.2.2 | Stats | Views, comments | ⬜ |
| 10.2.3 | CTA buttons | "عرض التفاصيل", "راسلني" (Chat) | ⬜ |
| 10.2.4 | Hover effect | Highlight card, show quick actions | ⬜ |
| 10.2.5 | Lazy load images | loading="lazy" | ✅ |
| 10.2.6 | Click opens product details | Link to /products/:id | ✅ |
| 10.2.6 | Responsive grid | 3 per row desktop, 1 mobile | ✅ |

### 10.3 Placement & Layout

| # | Task | Details | Status |
|---|------|---------|--------|
| 10.3.1 | Desktop | Two-column: main product left, related right — OR single column below (current). Per spec: below main product. | ✅ |
| 10.3.2 | Mobile | Single column, related below main product | ✅ |
| 10.3.3 | Sort dropdown | Optional: price low→high, most viewed, newest | ⬜ |
| 10.3.4 | Pagination or infinite scroll | If many related products | ⬜ |

---

## Phase 11: Security & Polish

### 11.1 Security

| # | Task | Details | Status |
|---|------|---------|--------|
| 11.1.1 | JWT for sessions | Already in use | ✅ |
| 11.1.2 | bcrypt passwords | Laravel default | ✅ |
| 11.1.3 | Rate limit verification | 5 attempts/hour per user | ⬜ |
| 11.1.4 | Document encryption at rest | Encrypt document_url or store in private disk | ⬜ |
| 11.1.5 | API rate limiting | Throttle account endpoints | ⬜ |

### 11.2 Localization

| # | Task | Details | Status |
|---|------|---------|--------|
| 11.2.1 | All new UI strings | Add to ar.json, en.json | ⬜ |
| 11.2.2 | Verification labels | Absher, ID upload, Company license | ⬜ |
| 11.2.3 | Guarantee, balance, orders | All labels translated | ⬜ |

### 11.3 Error Handling

| # | Task | Details | Status |
|---|------|---------|--------|
| 11.3.1 | Inline validation errors | Under each field | ⬜ |
| 11.3.2 | API error display | Toast or inline message | ⬜ |
| 11.3.3 | Loading states | Skeleton, spinner | ⬜ |

---

## Phase 12: Full Flow Integration

### 12.1 End-to-End Flows

| # | Task | Details | Status |
|---|------|---------|--------|
| 12.1.1 | Register → Verify → Deposit guarantee → List offer | Full flow | ⬜ |
| 12.1.2 | Buyer: Browse → Purchase (escrow) → Confirm receipt → Funds released | Full flow | ⬜ |
| 12.1.3 | Seller: See pending balance → Buyer confirms → Withdraw | Full flow | ⬜ |
| 12.1.4 | Seller: Refund guarantee when cancelling sales | Full flow | ⬜ |
| 12.1.5 | Order tracking: Both buyer and seller see same interface | Full flow | ⬜ |

---

## Summary: Priority Order

1. **Database** (1.1, 1.2) — Foundation
2. **Balance & Escrow APIs** (2.3) — Core transaction logic
3. **Orders APIs** (2.4) — List, detail, confirm receipt
4. **Order Tracking Page** (8.1) — Wire to real data
5. **Verification APIs** (2.1) — Document upload, admin approve
6. **Verification Page** (5.1) — Frontend
7. **Guarantee APIs** (2.2) — Deposit, refund
8. **Guarantee/Balance UI** (6.1, 7.1) — Polish
9. **Profile public view** (4.2) — Badge, guarantee status
10. **Related Products** (10.2) — Card enhancements, sort
11. **Security & Polish** (11)

---

## File Checklist

### Backend (Laravel)
- [ ] `app/Models/Verification.php`
- [ ] `app/Models/Guarantee.php`
- [ ] `app/Models/Balance.php` (or Wallet)
- [ ] `app/Models/Company.php`
- [ ] `app/Http/Controllers/Api/AccountController.php` (or VerificationController, BalanceController, OrderController)
- [ ] `app/Http/Controllers/Api/Admin/AdminVerificationController.php`
- [ ] Migrations: verifications, guarantees, balances, companies, purchases (tracking, invoice)
- [ ] Routes in `api.php`

### Frontend (React + shadcn)
- [ ] `pages/dashboard/VerificationPage.jsx`
- [ ] `pages/dashboard/GuaranteePage.jsx` (or extend BalancePage)
- [ ] `pages/dashboard/OrderTrackingPage.jsx` (wire to API)
- [ ] `components/account/VerificationBadge.jsx` (extend existing)
- [ ] `components/account/OrderCard.jsx`
- [ ] `components/account/OrderDetailSheet.jsx`
- [ ] `components/feed/cards/RelatedProductCard.jsx` (or enhance ProductCardGrid)
- [ ] Locale keys in ar.json, en.json
