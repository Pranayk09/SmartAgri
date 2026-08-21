# SmartAgri ERP - Master Development Plan

## Project Overview
**SmartAgri ERP** is a domain-specific Enterprise Resource Planning system tailored for Agricultural Fertilizer Manufacturing & Distribution.
The primary focus of this MVP is to deliver a complete, production-grade steel thread workflow:
> **Batch Inventory → Distributor → Bulk Sales Order → Credit Check → Bulk Pricing → FEFO Allocation → Order Confirmation → Inventory Reservation → Dispatch → Stock Movement → Invoicing → Payment → Financial Feedback Loop → Executive Dashboard**

## Tech Stack (PERN - ES Modules)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Backend:** Node.js + Express (ES Modules / JS)
- **Frontend:** React + Vite + Vanilla CSS / Modern UI Styling (ES Modules / JS)
- **Architecture:** Modular Monolith

---

## 15-Day Milestone Roadmap

### Phase 1: Environment & Project Foundation (Days 1–2)
- Project directory setup (`backend`, `frontend`, `prisma`).
- Initialization of package configuration (`type: "module"` for Node ESM).
- Prisma schema definition for all core & supporting ERP models.
- Express app setup with error handling, logging, and environment management.
- React + Vite setup with routing shell, global design tokens, and base layout.
- Database connection & migration setup.

### Phase 2: Authentication & RBAC (Days 2–3)
- Multi-tenant organization isolation (`organization_id` on all entities).
- User management, Role & Permission database structures.
- JWT-based authentication service & password hashing.
- Backend RBAC authorization middleware.
- Frontend Auth context, protected routes, and role-based UI visibility.

### Phase 3: Application Shell & Layout (Day 3)
- Core ERP navigation layout (Sidebar, Header, User Menu).
- Role-aware menu filtering.
- Dynamic page container, notification toast system, loading/error states.

### Phase 4: Product & Category Management (Day 4)
- Product categories CRUD.
- Finished products catalog (SKU, Unit, Default Selling Price, Min Stock).
- Backend service layer and frontend product management views.

### Phase 5: Batches & Inventory Management (Day 5)
- Product batch tracking (Manufacturing date, Expiry date, Initial, Available, Reserved quantities, Batch status).
- Initial stock entry and manual inventory adjustments.
- Immutable `StockMovement` logging (STOCK_IN, ADJUSTMENT_IN, ADJUSTMENT_OUT).

### Phase 6: Expiry Engine & FEFO Allocation (Day 6)
- Expiry calculation logic (EXPIRED, EXPIRING_SOON [30 days], NORMAL).
- FEFO (First Expire, First Out) algorithm implementation in `InventoryService`.
- Backend allocation preview endpoint (`POST /api/sales/orders/check` FEFO component).
- FEFO test suite and validation.

### Phase 7: Customers & Credit Management (Day 7)
- Customer management (Distributor, Dealer, Retailer).
- Distributor credit limit & outstanding balance tracking.
- `CreditValidationService` (`available_credit = credit_limit - outstanding_amount`).
- Credit check enforcement on sales orders.

### Phase 8: Bulk Pricing Engine (Day 8)
- Tiered bulk price rules based on order volume.
- `PricingService` logic to automatically resolve unit price and total based on ordered quantity.

### Phase 9: Bulk Sales Orders & Order Check (Days 9–10)
- `SalesOrderService` implementation.
- `POST /api/sales/orders/check` (Non-mutating business evaluation engine: Credit check + Pricing + Stock + FEFO preview).
- Sales order creation screen & order detail views.

### Phase 10: Reservation, Confirmation & Dispatch (Day 11)
- Order confirmation transaction (Stock reservation: `available_quantity` ↓, `reserved_quantity` ↑).
- Dispatch transaction (`POST /api/sales/orders/:id/dispatch`): stock deduction (`reserved_quantity` ↓, physical stock ↓), dispatch stock movement, batch allocation persistence.
- Server-side state machine enforcement (DRAFT → CONFIRMED → DISPATCHED).

### Phase 11: Invoicing & Finance Loop (Day 12)
- Automatic invoice generation upon dispatch (`due_date = invoice_date + payment_terms_days`).
- Customer outstanding balance update (`outstanding_amount` ↑).
- Payment recording (`POST /api/invoices/:id/payments`): partial & full payments.
- Financial feedback loop (`Payment` → `Invoice` → `Customer Credit Available` ↑).

### Phase 12: Executive Dashboard & Reports (Day 13)
- Inventory KPIs (Total stock, expiring stock, low stock count).
- Sales KPIs (Today sales, monthly sales, pending orders).
- Credit KPIs (Total outstanding, over-limit customers).
- Finance KPIs (Revenue, pending invoices, collections).
- Four core reports: Inventory, Sales, Credit, Invoice.

### Phase 13: End-to-End Testing & Hardening (Day 14)
- Verification of Golden Scenario:
  - 10,000 KG NPK 19-19-19 order.
  - Batches B001 (4k KG), B002 (6k KG), B003 (8k KG).
  - Credit check validation & FEFO allocation of B001 & B002.
  - Dispatch, Invoicing, Payment, & Financial update verification.
- Edge case hardening (expired batches, credit overruns, duplicate dispatch prevention).

### Phase 14: Demo Dataset & Handover Polish (Day 15)
- Seed realistic agricultural fertilizer demo data.
- UI styling polish and status badges.
- Final review against Definition of Done.
