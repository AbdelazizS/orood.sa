# Admin Dashboard & Analytics Redesign — Master Prompt

**Use this prompt with Cursor to redesign the admin overview and analytics pages from scratch. Ignore the existing implementation; design new pages following big-company standards and shadcn/ui.**

---

## Context

- **Platform:** Arooth (عروض) — Saudi marketplace for offers and requests
- **Tech:** React, TanStack Query, shadcn/ui, Recharts, Tailwind
- **Routes:**
  - `/admin` — لوحة الإدارة (Dashboard Overview)
  - `/admin/analytics` — التحليلات والتقارير (Analytics & Reports)
- **API:** `GET /admin/overview`, `GET /admin/analytics?date_from=&date_to=&category_id=&region_id=`

---

## 1. Admin Dashboard (لوحة الإدارة) — `/admin`

**Title:** نظرة عامة على المنصة والتحليلات  
**Subtitle:** Overview of the platform and analytics

### Requirements

Design a **new overview page from scratch** as big companies do (Stripe, Vercel, Linear, Notion dashboards):

1. **Hero / Welcome section**
   - Greeting with user name
   - Short platform summary
   - Last updated timestamp

2. **KPI cards (primary metrics)**
   - Products, Users, Offers, Requests, Completed Orders
   - Use shadcn `Card` with clear typography
   - Optional: small trend indicator (↑/↓ vs previous period)
   - Icons: Package, Users, FileText, ShoppingCart
   - Responsive grid: 2 cols mobile, 4–5 cols desktop

3. **Main chart (above the fold)**
   - Activity over last 14–30 days: Products + Users by day
   - Use Recharts `AreaChart` or `LineChart`
   - Clean tooltip, legend, muted grid
   - Empty state when no data

4. **Secondary sections**
   - Offers vs Requests trend (LineChart)
   - Top categories by product count (horizontal BarChart or list with progress)
   - Top regions by listings (same style)
   - Recent listings table (last 10) with link to product

5. **Quick actions**
   - Links to: Products, Users, Categories, Regions, Analytics
   - Use shadcn `Button` variant outline

6. **Design standards**
   - shadcn components only (Card, Table, Badge, Button, Skeleton)
   - Consistent spacing (gap-4, gap-6)
   - RTL support (Arabic)
   - Dark mode compatible (use CSS variables)
   - Skeleton loaders for all async sections
   - Error state with retry

---

## 2. Analytics Page (التحليلات والتقارير) — `/admin/analytics`

**Title:** التحليلات والتقارير  
**Subtitle:** مؤشرات الأداء والاتجاهات (KPIs and Trends)

### Requirements

Design a **professional analytics page** like Stripe Analytics, Vercel Analytics, or Google Analytics:

1. **Filters bar**
   - Date range: `date_from`, `date_to` (date inputs)
   - Category filter (Select)
   - Region filter (Select)
   - Export: CSV, PDF buttons
   - Use shadcn `Select`, `Button`, `Input` (type date)

2. **KPI cards**
   - Products, Users, Offers, Requests, Active Users, Verified Sellers, Completed Orders
   - Same style as dashboard
   - Role-based visibility (e.g. super_admin sees all)

3. **Charts (Recharts)**
   - **Offers vs Requests trend** — LineChart, daily
   - **Top categories** — BarChart (horizontal) or PieChart
   - **Regional distribution** — PieChart or horizontal BarChart
   - **Products & Users by day** — AreaChart or BarChart
   - All charts: ResponsiveContainer, Tooltip, Legend, muted CartesianGrid
   - Use `hsl(var(--chart-1))` … `--chart-5` for colors

4. **Data tables**
   - Most Viewed (product, views)
   - Most Sold (product, sold count)
   - Cheapest (product, price)
   - Use shadcn `Table`, link to product

5. **Empty states**
   - When no data: friendly message, illustration or icon
   - No hardcoded "0" tables — show "No data" row

6. **Design standards**
   - Same as dashboard
   - Proper loading skeletons
   - Error boundary with reload
   - Fully localized (AR/EN)

---

## 3. API Data Shape (Reference)

### `GET /admin/overview`
```json
{
  "data": {
    "totals": {
      "products": 20,
      "users": 6,
      "offers": 19,
      "requests": 1,
      "active_users": 5,
      "verified_sellers": 2,
      "completed_orders": 511
    },
    "categories": [{ "id", "name", "products_count", "subcategories": [...] }],
    "regions": [{ "id", "name", "products_count", "cities": [...] }],
    "recent_products": [{ "id", "title", "type", "category", "region", "moderation_status" }]
  }
}
```

### `GET /admin/analytics?date_from=&date_to=&category_id=&region_id=`
```json
{
  "data": {
    "totals": { "products", "users", "offers", "requests", "active_users", "verified_sellers", "completed_orders" },
    "most_viewed": [{ "id", "title", "stats": { "views" } }],
    "most_sold": [{ "id", "title", "stats": { "purchases" } }],
    "cheapest": [{ "id", "title", "price" }],
    "products_by_day": [{ "date", "count" }],
    "users_by_day": [{ "date", "count" }],
    "offers_vs_requests_trend": [{ "date", "offers", "requests" }],
    "top_categories": [{ "name", "count" }],
    "regional_distribution": [{ "name", "count" }]
  }
}
```

---

## 4. shadcn/ui Components to Use

- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`, `TableHead`
- `Badge`, `Button`, `Skeleton`
- `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`
- `Input` (type="date")
- Recharts: `AreaChart`, `LineChart`, `BarChart`, `PieChart`, `ResponsiveContainer`, `Tooltip`, `Legend`, `CartesianGrid`, `XAxis`, `YAxis`, `Area`, `Line`, `Bar`, `Pie`, `Cell`

---

## 5. Big-Company Design Principles

1. **Hierarchy** — Primary metrics first, charts second, tables third
2. **Whitespace** — Generous padding, clear sections
3. **Typography** — Bold headings, muted descriptions
4. **Consistency** — Same card style, same chart height (e.g. h-72)
5. **Responsiveness** — Mobile-first, stacked on small screens
6. **Accessibility** — Labels, focus states, RTL
7. **Performance** — Skeleton loaders, no layout shift

---

## 6. Files to Create/Replace

- `frontend/src/pages/admin/AdminDashboardPage.jsx` — new overview
- `frontend/src/pages/admin/AdminAnalyticsPage.jsx` — new analytics
- Ensure `AdminOverviewController` and `AdminAnalyticsController` return the data shape above

---

## 7. Locale Keys (AR/EN)

Use existing keys in `ar.json` / `en.json`:
- `admin.dashboardTitle`, `admin.dashboardDescription`
- `admin.stats.products`, `admin.stats.users`, `admin.stats.offers`, `admin.stats.requests`
- `admin.activityTitle`, `admin.activityDescription`
- `admin.mostViewed`, `admin.mostSold`, `admin.cheapest`
- `analytics.title`, `analytics.description`, `analytics.activeUsers`, etc.
- `overview.categories`, `overview.regions`, `overview.recentListings`, `overview.manageProducts`, etc.

Add any missing keys as needed.

---

## 8. Seeded Product Images — Saudi Local

All product images in `PhaseOneSeeder` must look **Saudi-local**:
- **Real estate:** Saudi/Middle East architecture, Riyadh skyline, Jeddah corniche, modern apartments, villas with palm trees, desert land
- **Electronics:** Real product photos (phones, laptops, TVs) — used or new
- **Avoid:** Generic Western homes, non-Middle East cityscapes

Use Unsplash URLs that suggest Saudi/Middle East:
- Riyadh: Kingdom Tower, modern towers, Faisaliah
- Jeddah: Coastal, corniche, sea view
- Land: Desert, agricultural, Saudi landscape
- Apartments: Modern Arabic/Middle East interiors
