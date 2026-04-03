# Phase 2 Implementation Checklist

## Completed

### 1. Authentication & RBAC (Backend)
- [x] Custom API token auth (Bearer token, 30-day expiry)
- [x] AuthenticateApi + EnsureUserHasRole middleware
- [x] AuthController: register, login, logout, user, forgotPassword
- [x] Roles: super_admin, admin, manager, seller, buyer
- [x] Demo users: super@arooth.sa, admin@arooth.sa, manager@arooth.sa, demo@arooth.sa, seller2@arooth.sa, buyer@arooth.sa (all: password)

### 2. Auth Pages (Frontend)
- [x] AuthLayout: split screen (left brand, right form)
- [x] Login, Register, Forgot Password pages
- [x] useAuthStore, apiClient Bearer token
- [x] TopNavigation: login/register vs logout + dashboard link

### 3. Admin Dashboard
- [x] AdminLayout with sidebar (Overview, Categories, Users, Audit Logs)
- [x] AdminDashboardPage: analytics (most viewed, most sold, cheapest)
- [x] AdminCategoriesPage: toggle category visibility per region
- [x] AdminUsersPage: list users with roles
- [x] AdminAuditPage: audit logs for admin actions

### 4. Dashboard Layout
- [x] DashboardShell: minimal header (no main Navbar), sidebar-first
- [x] Dashboard and Admin use DashboardShell (no TopNavigation)
- [x] Back to site link, user dropdown menu

### 5. Seller Dashboard
- [x] DashboardLayout with sidebar
- [x] DashboardOverviewPage: stats cards
- [x] SellerListingsPage: my products, view stats, bids count, link to add, link to edit
- [x] EditOfferPage: edit product (PUT /products/{id})

### 6. Buyer Dashboard
- [x] BuyerFavoritesPage: favorite products
- [x] SavedSearchesPage: list and delete saved searches
- [x] MessagesPage: conversations + chat UI

### 7. Product Details Page
- [x] Main image + gallery
- [x] Title, description, price, condition, warranty (used only)
- [x] Seller info, stats (views, purchases, bids)
- [x] ContactDialog: start conversation
- [x] BidSection: bidding (وصل المبلغ السوم) when accept_bids enabled
- [x] Hidden bids: amount masked when bids_visible=false (owner sees all)
- [x] Similar products on right side (same category)

### 8. Dynamic Control
- [x] category_region pivot: visibility per region
- [x] ProductFeedService: filter by category visibility when region selected
- [x] FeedList: "Category not available in your area" message

### 9. Messaging
- [x] Conversations, Messages models + migrations
- [x] MessageController: list conversations, show messages, send, reply
- [x] ContactDialog on product page
- [x] MessagesPage: conversation list + chat

### 10. Favorites & Saved Searches
- [x] FavoriteController: index, store, destroy
- [x] SavedSearchController: index, store, destroy
- [x] Migrations: favorites, saved_searches

### 11. APIs
- [x] GET /products/{id}, PUT /products/{id}
- [x] GET /products/{id}/similar
- [x] GET /products/{id}/bids, POST /products/{id}/bids
- [x] GET /areas (alias for regions)
- [x] POST /auth/forgot-password
- [x] POST /messages, GET /conversations, POST /conversations/{id}/messages
- [x] GET/DELETE /favorites, GET/POST/DELETE /saved-searches
- [x] GET /admin/analytics, /admin/categories, /admin/users, /admin/audit-logs

### 12. Offers/Requests Flow
- [x] Multi-image (main + 2+ additional)
- [x] Warranty only for used products
- [x] Checkboxes: accept bids, bids visible, free shipping, free return, view at client
- [x] Contact: phone, messages

### 13. Bidding System
- [x] Bids model + migration
- [x] POST /products/{id}/bids, GET /products/{id}/bids
- [x] Visible/hidden bids per product

### 14. Audit Logs
- [x] AuditLog model + migration
- [x] AuditLogService for admin actions
- [x] GET /admin/audit-logs

## Pending (Future Phases)

- [ ] 2FA (two-factor authentication)
- [ ] Real-time chat (WebSockets / Laravel Echo / Pusher)
- [ ] File upload for images (currently URL-based)
- [ ] Admin companies management UI

## Run Migrations

```bash
cd backend
php artisan migrate
# or fresh:
php artisan migrate:fresh --seed
```

## Routes

- `/` — Homepage
- `/login`, `/register` — Auth
- `/add` — Add offer/request (protected)
- `/products/:id` — Product details
- `/products/:id/edit` — Edit listing (protected, owner only)
- `/dashboard` — User dashboard (protected)
- `/dashboard/listings`, `/favorites`, `/saved-searches`, `/messages`
- `/admin` — Admin dashboard (super_admin, admin, manager)
- `/admin/categories`, `/admin/users`, `/admin/audit`
- `/forgot-password` — Forgot password
