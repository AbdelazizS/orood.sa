# Arooth Platform – Master Task List

Extracted from `Arooth_Complete_Scope_Definition.pdf` and `__منصة عروض Arooth -0_.pdf`.

---

## Phase 1: Foundation (DONE)

- [x] Platform foundation, homepage, feed
- [x] Categories, regions, cities
- [x] Offers & requests CRUD
- [x] Image upload
- [x] Auth (login, register, forgot password)
- [x] Dashboard layout (shadcn sidebar)
- [x] Admin panel structure
- [x] Bidding (basic)
- [x] Messaging (basic)
- [x] Favorites, saved searches
- [x] Language persistence (localStorage)
- [x] RTL support
- [x] Admin CRUD: categories, subcategories, regions, cities, products, users
- [x] Roles & permissions (RBAC)
- [x] Analytics dashboard (charts, stats)
- [x] CRUD auto-refresh (refetchQueries)

---

## Phase 2: Auth & Verification

- [ ] OTP phone verification
- [ ] Email verification link
- [ ] Absher integration (Saudi government ID)
- [ ] Company verification (document upload)
- [ ] Verification badges (Level 1–3)
- [ ] Social login (Google, Apple)
- [ ] Password strength validation
- [ ] Terms & privacy acceptance

---

## Phase 3: Offers & Requests (Extended)

- [ ] Rich text editor for description
- [ ] Video upload (or YouTube/Vimeo link)
- [ ] Map integration for location
- [ ] Live streaming option
- [ ] Bump listing (24h cooldown)
- [ ] Pause/Resume listing
- [ ] Duplicate listing
- [ ] View statistics (views, messages, bids)
- [ ] Full bidding flow (accept/reject)
- [ ] Bid notifications

---

## Phase 4: Payments & Financial

- [ ] Escrow system
- [ ] Payment on delivery
- [ ] Payment gateway integration
- [ ] Financial guarantee (seller deposits)
- [ ] Guarantee management

---

## Phase 5: Messaging & Social

- [ ] Full chat UI (WhatsApp-style)
- [ ] Real-time messaging (WebSockets)
- [ ] File sharing in chat
- [ ] Wholesale section (سعر الجملة)
- [ ] Wholesale price field
- [ ] Company directory
- [ ] Group buying
- [ ] Social features (تعبري - tweets)

---

## Phase 6: Search & Discovery

- [ ] Search auto-complete
- [ ] Elasticsearch or Algolia
- [ ] Typo-tolerant search
- [ ] Advanced filters

---

## Phase 7: User & Company

- [ ] Public user profile
- [ ] Private profile/settings
- [ ] Profile editing
- [ ] Company profile pages
- [ ] Company directory listing
- [ ] Reviews & ratings
- [ ] Review moderation

---

## Phase 8: Orders & Shipping

- [ ] Order management
- [ ] Order tracking
- [ ] Buyer/seller order views
- [ ] Shipping management
- [ ] Delivery tracking
- [ ] Product viewing at location (scheduling)

---

## Phase 9: Admin (Extended)

- [ ] User ban/suspend
- [ ] Offer/request moderation
- [ ] Permission checks on all admin actions
- [ ] Task management system
- [ ] Marketer referral tracking
- [ ] Media management (library)
- [ ] Announcements & broadcasts

---

## Phase 10: Notifications & Integrations

- [ ] Push notifications
- [ ] SMS notifications
- [ ] Email notifications
- [ ] In-app notifications
- [ ] Share to social (Facebook, Twitter, WhatsApp)
- [ ] Open Graph meta tags

---

## Phase 11: Infrastructure

- [ ] Redis caching
- [ ] CDN for static assets
- [ ] Image optimization (WebP, lazy load)
- [ ] Security (GDPR, rate limiting)
- [ ] Testing (unit, integration, E2E)
- [ ] CI/CD pipeline
- [ ] Monitoring & logging
- [ ] Backup & disaster recovery

---

## Quick Reference: API Endpoints Needed

| Endpoint | Purpose |
|----------|---------|
| POST /api/auth/verify-phone | Send OTP |
| POST /api/auth/confirm-phone | Verify OTP |
| GET /api/auth/confirm-email/:token | Email verification |
| POST /api/verification/absher | Absher verification |
| POST /api/verification/upload-document | Company docs |
| POST /api/offers/:id/update | Bump listing |
| POST /api/offers/:id/pause | Pause listing |
| POST /api/offers/:id/resume | Resume listing |
| POST /api/offers/:id/duplicate | Duplicate listing |
| Payment, escrow, messaging, etc. | Per block specs |

---

*Enterprise-standard implementation. All UI follows shadcn/ui best practices.*
