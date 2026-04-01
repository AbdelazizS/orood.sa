# Arooth Platform — Master Development Prompt

Use this prompt in Cursor to drive enterprise-grade development of the Arooth marketplace platform.

---

## Context Files (attach these when prompting)

- `Arooth_Complete_Scope_Definition.pdf` — Full scope with 35 blocks
- `منصة عروض Arooth -0_.pdf` — Original Arabic specification

In Cursor, use `@` to attach: `@Arooth_Complete_Scope_Definition.pdf` and `@منصة عروض Arooth -0_.pdf`

---

## Master Prompt (copy and paste into Cursor)

```
You are a senior software architect and full-stack developer at a large enterprise. Your task is to design and implement the complete "Arooth" (منصة عروض) marketplace platform — a production-grade system for new and used products, similar to Haraj, Amazon, and eBay, tailored for the Middle East.

I have attached two scope documents:
1. Arooth_Complete_Scope_Definition.pdf — exhaustive specification with 35 blocks
2. منصة عروض Arooth -0_.pdf — original Arabic requirements

Read both documents carefully. Extract every feature, requirement, and detail. Treat this as a production system, not a prototype.

---

## Phase 1: Extract & Structure

From the documents, produce a structured task list organized by:

### 1. Backend
- Database schema (PostgreSQL) — all tables, indexes, relationships
- API endpoints — RESTful, versioned (/api/v1/...)
- Authentication: JWT + OAuth (Google, Apple)
- RBAC: super_admin, admin, manager, seller, buyer
- Rate limiting, validation, error handling

### 2. Frontend
- Route structure: /pages, /components, /features, /layouts
- State management (Zustand)
- i18n: Arabic (RTL) + English (LTR)
- Responsive, mobile-first

### 3. Database
- Migrations for all 35 blocks
- Seeders for demo data
- Indexes for search and filters

### 4. Admin Dashboard
- Categories, subcategories, regions, cities
- Users, companies, offers, requests
- Analytics, audit logs
- Use shadcn/ui blocks: dashboard-01, sidebar, table, charts

### 5. Deployment & DevOps
- Docker, CI/CD
- Environment configs

### 6. Testing & QA
- Unit, integration, E2E
- API contract tests

### 7. UI/UX (shadcn/ui)
- All components from shadcn/ui
- Run: npx shadcn@latest add dashboard-01
- Radix primitives for accessibility
- TailwindCSS utility-first
- Consistent typography (Cairo/IBM Plex Arabic, Inter/Roboto)
- RTL support, bilingual

---

## Phase 2: Development Order

Begin development step by step:

1. **Backend first**: Laravel/NestJS + PostgreSQL
   - Migrations, models, seeders
   - Auth (register, login, JWT, roles)
   - Core APIs: categories, regions, offers, requests

2. **Frontend foundation**: React + Vite (or Next.js)
   - shadcn/ui setup
   - Auth pages (login, register, forgot password)
   - Homepage feed, filters, search

3. **Offers & Requests flow**
   - Add/Edit form (category, subcategory, region, city, images, options)
   - Bidding system (السوم) — visible/hidden
   - Product details page (gallery, stats, contact)

4. **Dashboards**
   - Admin: categories, users, analytics
   - Seller: listings, stats, bids
   - Buyer: favorites, saved searches, messages

5. **Messaging**
   - Conversations, real-time chat (WebSockets or polling)

6. **Advanced features**
   - Wholesale (سعر الجملة), company directory
   - Reviews, orders, shipping
   - Notifications, social share

---

## Design Standards (MANDATORY)

- **shadcn/ui**: Use components from https://ui.shadcn.com
- **Dashboard blocks**: Add dashboard-01, sidebar, table, card, tabs, dialog
- **No main Navbar in dashboards**: Use sidebar-first layout
- **RTL**: Support Arabic right-to-left
- **Fonts**: Cairo / IBM Plex Arabic for Arabic, Inter / Roboto for English
- **Spacing**: Consistent 4/8/16/24px scale
- **Icons**: Lucide React
- **Loading**: Skeleton loaders for async content

---

## Deliverables

After each step:
1. Show the code
2. Explain how it maps to the scope
3. Update PHASE_2_CHECKLIST.md
4. Do not stop until all tasks for that phase are complete

---

## Key Scope Blocks (from PDF)

| Block | Focus |
|-------|-------|
| 1 | Homepage, feed, categories, filters |
| 2 | Registration, OTP, verification, Absher |
| 3 | Offers/Requests CRUD, images, video |
| 4 | Product details, gallery, stats |
| 5 | Bidding (السوم), price offers |
| 6–7 | Payments, escrow, guarantee |
| 8 | Messaging, chat |
| 9 | Wholesale, company directory |
| 10–11 | Group buying, company profiles |
| 12 | Search, filters |
| 13–14 | Category & location management |
| 15–21 | Profile, reviews, orders, shipping, social |
| 22–29 | Admin, analytics, notifications, media |
| 30–35 | Security, performance, testing, deployment |

---

Start by reading the attached PDFs, then produce the task breakdown. After I confirm, begin development from Phase 2 step 1.
```

---

## Quick Start Commands

```bash
# Add shadcn dashboard block
npx shadcn@latest add dashboard-01

# Add other blocks
npx shadcn@latest add sidebar
npx shadcn@latest add table
npx shadcn@latest add card
```

---

## Checklist File

Keep `PHASE_2_CHECKLIST.md` updated as features are implemented. Mark items complete with `[x]` and add new items from the scope as needed.
