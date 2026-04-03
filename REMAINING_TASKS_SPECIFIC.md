# Arooth – Specific Prompts for Remaining Tasks

Use these prompts when implementing each feature. Each is self-contained and references the scope PDFs.

---

## 1. Notifications System

**Prompt:**
> Implement the full notification system for Arooth (Block 26 from scope PDFs):
> - Backend: Create `notifications` table (id, user_id, type, title, body, data JSON, read_at, created_at). Add Notification model, NotificationController with index (paginated), markAsRead, markAllAsRead. Support types: message, bid, product_approved, product_rejected.
> - Frontend: Create NotificationBell component in header, NotificationDropdown with list and mark-read. Use shadcn DropdownMenu. Poll or use a simple refresh every 30s for now.
> - Add locale keys: notifications.title, notifications.empty, notifications.markAllRead.

---

## 2. Social Share

**Prompt:**
> Implement social share for Arooth (Block 28):
> - Add ShareButton component with DropdownMenu: Share to WhatsApp, Twitter/X, Facebook. Use `window.open` with share URLs (wa.me, twitter.com/intent/tweet, facebook.com/sharer).
> - Add ShareButton to ProductDetailsPage.
> - Add Open Graph meta tags: use react-helmet-async or a simple useEffect to set document head meta (og:title, og:description, og:image) from product data.
> - Locale: share.title, share.whatsapp, share.twitter, share.facebook.

---

## 3. Admin Moderation

**Prompt:**
> Implement admin moderation (Block 22):
> - Backend: Add `banned_at`, `suspended_at` to users table. Add `moderation_status` (pending, approved, rejected) to products. AdminUserController: add ban, unban, suspend, unsuspend. AdminProductController: add approve, reject (set moderation_status).
> - Frontend: AdminUsersPage – add Ban/Suspend buttons and dropdown. AdminProductsPage – add Approve/Reject for products with moderation_status pending. Use Badge for status.
> - Middleware: Block banned users from API. Filter products by moderation_status in feed.
> - Locale: admin.ban, admin.unban, admin.suspend, admin.approve, admin.reject.

---

## 4. Task Management (Admin)

**Prompt:**
> Implement task management for admin (Block 24):
> - Backend: Create `tasks` table (id, title, description, assignee_id, status, priority, due_at, created_at). Task model, TaskController CRUD. Assignee = admin user.
> - Frontend: AdminTasksPage with TanStack Table (sorting, filtering by status). Add task form (create/edit) in Dialog. Status: todo, in_progress, done.
> - Add /admin/tasks route and sidebar link.
> - Locale: admin.tasks, admin.taskTitle, admin.taskStatus, admin.priority.

---

## 5. User Profiles + Reviews

**Prompt:**
> Implement user profiles and reviews (Blocks 15, 16):
> - Backend: Add `reviews` table (id, reviewer_id, reviewee_id, product_id, rating 1-5, comment, created_at). Review model. Add `bio`, `avatar_url` to users. ProfileController: show(user), update (own). ReviewController: store, index (for user).
> - Frontend: UserProfilePage at /users/:id – public view with bio, avatar, listings, reviews. ProfileEditPage at /dashboard/profile – edit own profile. ReviewSection component on profile.
> - Locale: profile.bio, profile.edit, reviews.title, reviews.rating, reviews.submit.

---

## 6. Real-time Chat

**Prompt:**
> Implement real-time chat (Block 8 extended):
> - Use Laravel Reverb or Pusher. Backend: Broadcast MessageSent event when message created. Frontend: Use Laravel Echo + Pusher to listen for new messages, update MessagesPage in real time.
> - Fallback: If no WebSocket, keep polling every 5s on MessagesPage when conversation is open.
> - Ensure Message model has proper structure for broadcasting.

---

## 7. Wholesale Section

**Prompt:**
> Implement wholesale (Block 9, سعر الجملة):
> - Backend: Add `wholesale_price`, `min_quantity` to products. Add `is_wholesale` boolean. Scope products for wholesale feed. Companies already exist – link products to company for wholesale.
> - Frontend: WholesaleSection on homepage – filter products with wholesale_price. Add wholesale fields to AddOfferPage/EditOfferPage. Company directory page listing companies.
> - Locale: wholesale.title, wholesale.minQuantity, wholesale.price.

---

## 8. Group Buying

**Prompt:**
> Implement group buying (Block 10):
> - Backend: Create `group_buys` table (id, product_id, target_quantity, current_quantity, discount_percent, ends_at). GroupBuy model. Create `group_buy_participants` (user_id, group_buy_id, quantity). API: join, leave, get status.
> - Frontend: GroupBuyCard on product page when product has group buy. Show progress bar, join button. Admin: create group buy for product.
> - Locale: groupBuy.title, groupBuy.join, groupBuy.progress.

---

## 9. Roles & Permissions (Fix)

**Prompt:**
> Fix roles and permissions so they actually gate admin actions:
> - Backend: Create EnsureUserHasPermission middleware. Check Permission::getForRole($user->role) for each admin route. Map routes to permissions (e.g. products.update -> offers.update).
> - Frontend: Use permission checks to hide/disable buttons. Fetch user permissions from GET /auth/user (include permissions in response). Create usePermission hook.
> - Ensure PermissionSeeder has correct role_permission data. Super_admin bypasses all.

---

## 10. TanStack Table (shadcn Data Table)

**Prompt:**
> Replace basic Table with shadcn Data Table pattern using @tanstack/react-table:
> - Create DataTable component: accepts columns, data, pagination. Use shadcn Table, flexRender, getCoreRowModel, getSortedRowModel, getPaginationRowModel.
> - Add sorting, column visibility. Use in AdminProductsPage, AdminUsersPage, AdminCategoriesPage.
> - Follow shadcn blocks data-table example structure.

---

## 11. Full Localization

**Prompt:**
> Audit the entire frontend and add t() for every user-facing string:
> - Admin pages: AdminProductsPage, AdminCategoriesPage, AdminRegionsPage, AdminUsersPage, AdminRolesPage, AdminAuditPage – replace all hardcoded English.
> - Dashboard: DashboardOverviewPage, SellerListingsPage, BuyerFavoritesPage, SavedSearchesPage, MessagesPage.
> - Add missing keys to en.json and ar.json. Use nested keys (admin.products.title, etc.).

---

## 12. SelectItem Empty Value (Already Fixed)

> Radix Select does not allow SelectItem value="". Use value="all" and map to empty in onValueChange.
