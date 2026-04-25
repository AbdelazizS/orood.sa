# Marketplace Foundation

## Canonical Domain Models

- `User`: identity, roles, profile, verification state.
- `Listing` (`products` table): offer/request, pricing, media, location, listing stats.
- **Naming:** Public API paths use `/listings/*`; the Eloquent model is `Product`. Commerce “orders” in copy map to `Purchase` (`purchases` table) for checkout and review gates.
- **Listing age (UI):** Relative “منذ …” on the listing detail header uses `published_at` when present, otherwise `created_at` (see `ProductResource`).
- `Category` + `Subcategory`: listing taxonomy.
- `Region` + `City`: geo hierarchy for targeting/filtering.
- `MessageThread` (`conversations`) + `Message`: buyer/seller communication.
- `Order` (`purchases`): checkout lifecycle and fulfillment status.
- `Payment` (`transactions`): balance and charge/withdraw records.
- `Verification` (`verifications`, `document_verifications`): trust workflows.
- `AdminTask` (`tasks`): internal operations/task routing.

## Role and Permission Matrix

- `guest`: browse public feed/details and public profile.
- `buyer`: browse, message, bid, purchase, manage account/orders.
- `seller`: buyer permissions + create/publish/manage listings.
- `company`: seller permissions + company verification/listing directory participation.
- `employee`: admin tools by assigned permissions.
- `manager`: broader admin management/analytics permissions.
- `admin` and `super_admin`: full backoffice moderation and configuration.

## API Contract Conventions

- Base path: `/api/v1`.
- List endpoints return:
  - `data`: array payload.
  - `meta`: pagination context (`current_page`, `last_page`, `per_page`, `total`, `has_more` when applicable).
- Detail endpoints return `data` object.
- Validation failures return HTTP `422` with Laravel validation payload.
- Auth failures return HTTP `401`; permission failures return `403`.
- Backward-compatible feed routes:
  - `GET /homepage/feed` (legacy public feed).
  - `GET /listings` and `GET /listings/{listing}` (canonical listing API).

## Seed Data

- Regions/cities: `SaudiRegionsSeeder`.
- Categories/subcategories + category-region visibility: `PhaseOneSeeder`.
- Demo users, listings, and activity data: `PhaseOneSeeder`.
- Seeder entrypoint: `DatabaseSeeder`.
