# SmartAgri ERP - Phase Tracking & Status

## Current Phase: Phase 10 - Reservation & Dispatch Flow
**Status:** NOT_STARTED
**Developer Session:** 8

---

## Phase Status Summary

| Phase | Description | Days | Status | Checkpoint Passed |
|---|---|---|---|---|
| **Phase 1** | Foundation & Project Setup | Days 1–2 | 🟢 COMPLETED | ✅ Passed |
| **Phase 2** | Auth & Organization RBAC | Days 2–3 | 🟢 COMPLETED | ✅ Passed |
| **Phase 3** | Application Shell & UI Layout | Day 3 | 🟢 COMPLETED | ✅ Passed |
| **Phase 4** | Product & Category Management | Day 4 | 🟢 COMPLETED | ✅ Passed |
| **Phase 5** | Batches & Inventory Tracking | Day 5 | 🟢 COMPLETED | ✅ Passed |
| **Phase 6** | Expiry Rules & FEFO Engine | Day 6 | 🟢 COMPLETED | ✅ Passed |
| **Phase 7** | Customers & Credit Limit | Day 7 | 🟢 COMPLETED | ✅ Passed |
| **Phase 8** | Tiered Bulk Pricing Service | Day 8 | 🟢 COMPLETED | ✅ Passed |
| **Phase 9** | Sales Order & Check Flow | Days 9–10 | 🟢 COMPLETED | ✅ Passed |
| **Phase 10**| Reservation & Dispatch Flow | Day 11 | 🟢 COMPLETED | ✅ Passed |
| **Phase 11**| Invoice & Payment Finance Loop| Day 12 | 🟢 COMPLETED | ✅ Passed |
| **Phase 12**| Dashboard KPIs & Reports | Day 13 | ⚪ NOT_STARTED | ❌ Pending |
| **Phase 13**| End-to-End Hardening & Testing| Day 14 | ⚪ NOT_STARTED | ❌ Pending |
| **Phase 14**| Seed Data & Polish | Day 15 | ⚪ NOT_STARTED | ❌ Pending |

---

## Phase 1 Active Tasks
- [x] Create project structure (`frontend`, `backend`, `prisma`).
- [x] Write core repo files (`plan.md`, `phase.md`, `architecture.md`, `memory.md`).
- [x] Setup backend with Node.js + Express (ES Modules JS).
- [x] Setup Prisma ORM schema (`schema.prisma`) for PostgreSQL.
- [x] Setup frontend with React + Vite (JS/JSX) and Vanilla CSS tokens.
- [x] Configure environment variables (`.env`).
- [x] Verify backend server startup and health check (`http://localhost:5000/api/health`).
- [x] Verify frontend Vite dev server startup (`http://localhost:3000`).

---

## Phase 1 Checkpoint Requirements
1. Backend express server boots up cleanly on designated port (e.g., 5000).
2. Database schema validates cleanly via `npx prisma validate`.
3. Frontend Vite dev server boots up cleanly on designated port (e.g., 3000 / 5173).
4. Both servers run concurrently and respond to initial requests.

---

## Phase 2 Active Tasks
- [x] Seed database with default roles, permissions, and initial organization.
- [x] Implement Organization validation and tenant parsing middleware.
- [x] Build auth services: User registration, login with `bcryptjs` hashing, JWT token signature.
- [x] Develop authentication endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
- [x] Implement backend RBAC middleware (`authenticateToken`, `requirePermission`).
- [x] Create React frontend AuthContext, custom hooks, and login form.
- [x] Protect frontend application routes and toggle menu items using RBAC roles.

---
 
## Phase 2 Checkpoint Requirements
1. PostgreSQL database successfully seeded with roles (`OWNER`, `ADMIN`, etc.) and permissions.
2. Authenticated user endpoints return correct JWT credentials.
3. Accessing protected backend APIs without a valid token returns a `401 Unauthorized` or `403 Forbidden` response.
4. User logs in successfully from frontend and context updates accordingly.
 
---
 
## Phase 3 Active Tasks
- [x] Build premium global toast notification provider and context hook.
- [x] Implement dynamic placeholder views for ERP workflows (Dashboard, Products, Inventory, Customers, Sales, Invoices, Reports).
- [x] Configure client-side window hash listener for navigation updates.
- [x] Create global React Error Boundary to catch render exceptions gracefully.
- [x] Filter sidebar link visibility and block unauthorized page routes dynamically.
 
---
 
## Phase 3 Checkpoint Requirements
1. Navigation items adapt to the user's role-based permissions payload.
2. Clicking sidebar tabs updates window location hash and swaps views smoothly.
3. System triggers success, warning, info, and error toasts with visible micro-animations.
4. Accessing unassigned routes manually blocks rendering and displays an Access Denied card.

---

## Phase 4 Active Tasks
- [x] Implement database models for listing, adding, and updating product categories and products.
- [x] Implement Product Category and Products CRUD controllers and backend routes with tenant isolation.
- [x] Protect routes using RBAC security permission middlewares.
- [x] Refactor frontend `ProductsView.jsx` to render tables dynamically and handle modal-driven CRUD forms.
- [x] Prevent deletion of categories or products when child rows (products, batches, sales order items) exist.
- [x] Verify API responses, permissions, and database constraints in the browser application.

---

## Phase 4 Checkpoint Requirements
1. Category and Product entries successfully propagate from/to PostgreSQL database.
2. Only authorized roles (e.g. OWNER, ADMIN) can create, update, or delete products and categories.
3. Database constraint checks prevent deletion of referenced entities and return clear user-facing error toasts.
4. Product SKU values are verified unique per organization at the service validation layer.

---

## Phase 5 Active Tasks
- [x] Create backend services in `inventoryService.js` for batch lots and adjustment transactions.
- [x] Add Prisma transactions to log immutable `StockMovement` operations atomically.
- [x] Develop endpoint routes in `inventoryRoutes.js` protected by RBAC permissions.
- [x] Refactor frontend `InventoryView.jsx` to show database-backed lots, support CRUD creation, and adjust stock manual edits.
- [x] Design a secondary sub-tab for the Stock Movement Ledger to audit audit trails.
- [x] Verify API transaction responses, overdraft constraints, and ledger histories in the browser.

---

## Phase 5 Checkpoint Requirements
1. Batches and Stock Movements are saved in the PostgreSQL database with proper organization isolation.
2. Initial stock entries automatically create a corresponding `STOCK_IN` movement.
3. Decrementing stock validation checks prevent the available inventory from going below zero.
4. Users who adjust stock are captured and linked to the resulting `StockMovement` logs.

---

## Phase 6 Active Tasks
- [x] Create `expiryService.js` with `classifyExpiry`, `syncBatchExpiryStatuses`, and `getExpiryDashboard`.
- [x] Add `allocateFEFO()` engine to `inventoryService.js` (filters expired/blocked/depleted, sorts by `expiryDate ASC`).
- [x] Add 3 new controllers to `inventoryController.js`: `syncExpiry`, `getExpiryDashboard`, `fefoPreview`.
- [x] Register 3 new routes in `inventoryRoutes.js`: `POST /expiry/sync`, `GET /expiry/dashboard`, `POST /fefo/preview`.
- [x] Refactor `InventoryView.jsx` into 4-tab layout with Expiry Dashboard + live API-driven FEFO Allocation.

---

## Phase 6 Checkpoint Requirements
1. `POST /api/inventory/expiry/sync` returns `{ updated, expired, expiringSoon, normal }` summary.
2. `GET /api/inventory/expiry/dashboard` returns per-product expiry breakdown.
3. `POST /api/inventory/fefo/preview` returns correct FEFO-ordered batch allocations.
4. FEFO preview strictly skips EXPIRED, BLOCKED, and DEPLETED batches.
5. Frontend Expiry Dashboard and FEFO Allocation tabs render live data from API.

---

## Phase 7 Active Tasks
- [x] Create `customerService.js` with atomic Customer + CustomerCredit creation, credit validation, and delete guards.
- [x] Create `creditValidationService.js` with `validateCreditForOrder()` and `getCreditSummary()` for org-wide credit KPIs.
- [x] Create `customerController.js` (6 handlers) and `customerRoutes.js` (6 routes with RBAC permission gates).
- [x] Mount customer routes in `app.js`.
- [x] Fully rewrite `CustomersView.jsx` with 2-tab layout: Customer Accounts + Credit Dashboard.

---

## Phase 7 Checkpoint Requirements
1. Customer profiles can be created, read, updated, and deleted with full org-level multi-tenancy.
2. `CustomerCredit` is created atomically with each customer via `prisma.$transaction`.
3. `validateCreditForOrder()` correctly blocks orders when `orderAmount > creditLimit - outstandingAmount`.
4. Credit Dashboard renders live KPI cards: total credit exposure, outstanding, over-limit count.
5. Credit utilization bar indicators are sorted by highest utilization percentage.

---

## Phase 8 Active Tasks
- [x] `pricingService.js` implemented: `getPriceRules`, `createPriceRule`, `updatePriceRule`, `deletePriceRule`, `resolvePrice`.
- [x] Created `pricingController.js` (5 handlers: CRUD + resolvePrice endpoint).
- [x] Created `pricingRoutes.js` with permission gates (`products.view`/`products.manage`/`sales.view`).
- [x] Registered pricing routes in `app.js` under `/api/pricing`.
- [x] Created `PricingView.jsx` with: live Price Calculator panel (tier resolution + discount display), filterable pricing rules table, Add/Edit/Delete modals.
- [x] Wired `PricingView` into `App.jsx` with `Tag` icon sidebar entry.

---

## Phase 8 Checkpoint Requirements
1. `GET /api/pricing/rules` returns all price rules for the org with product info included.
2. `POST /api/pricing/rules` creates a tiered rule with min/max quantity validation.
3. `POST /api/pricing/resolve` returns correct `unitPrice`, `totalPrice`, and `appliedRule` for any product+quantity combination.
4. If no tier matches, `resolvePrice` falls back to `product.defaultSellingPrice` with `fallback: true`.
5. Frontend Price Calculator shows the active tier highlighted and displays bulk discount percentage.

---

## Phase 9 Active Tasks
- [x] Created `salesOrderService.js` with: `listOrders`, `getOrderById`, `checkOrder` (non-mutating: pricing + FEFO + credit in parallel), `createOrder` (DRAFT via `prisma.$transaction`), `cancelOrder`.
- [x] Created `salesOrderController.js` (5 handlers).
- [x] Created `salesOrderRoutes.js` (`/orders/check` before `/:id` to prevent route collision, `sales.view`/`sales.create` RBAC gates).
- [x] Registered sales routes in `app.js` under `/api/sales`.
- [x] Created `utils/api.js` helper (normalises axios errors from backend envelope).
- [x] Fully rewrote `SalesOrdersView.jsx` with: KPI strip, filterable live orders table, Create Order modal with multi-line item builder, Order Check panel (credit gate + FEFO batch tree + pricing breakdown + discount), Order Detail modal, Cancel confirmation.

---

## Phase 9 Checkpoint Requirements
1. `GET /api/sales/orders` returns all orders for the org with customer + items included.
2. `POST /api/sales/orders/check` returns `{ canProceed, credit, stock, items, totalAmount }` without writing to DB.
3. `POST /api/sales/orders` creates a `DRAFT` order with correct `SalesOrderItems` in a single transaction.
4. `DELETE /api/sales/orders/:id` cancels a DRAFT order and returns the updated record.
5. Frontend order check panel shows credit approval/rejection, per-line FEFO allocation with batch details, and applied pricing tier.
6. `checkOrder` correctly short-circuits credit errors into the response (`canProceed: false`) without throwing to the client.

---

## Phase 10 Active Tasks
- [x] Update `salesOrderService.js` to add `confirmOrder` (DRAFT -> CONFIRMED, allocates stock)
- [x] Update `salesOrderService.js` to add `dispatchOrder` (CONFIRMED -> DISPATCHED, dispatches stock, updates credit)
- [x] Update `salesOrderController.js` with `confirmOrder` and `dispatchOrder` handlers
- [x] Update `salesOrderRoutes.js` with new routes (`/orders/:id/confirm`, `/orders/:id/dispatch`) before `/:id`
- [x] Update `SalesOrdersView.jsx` with Confirm and Dispatch buttons (gated by RBAC permissions)
- [x] Update `SalesOrdersView.jsx` order detail modal to show BatchAllocation panel
- [x] Test end-to-end flow via browser subagent

---

## Phase 10 Checkpoint Requirements
1. `POST /api/sales/orders/:id/confirm` on DRAFT order transitions status to `CONFIRMED`, creates `BatchAllocation` rows, and reserves stock.
2. `POST /api/sales/orders/:id/dispatch` on CONFIRMED order transitions status to `DISPATCHED`, deducts reserved stock, and increments customer outstanding amount.
3. Batch dispatch correctly marks batches as `DEPLETED` if available and reserved quantities hit 0.
4. Frontend correctly gates actions behind `sales.confirm` and `sales.dispatch` permissions.
5. Frontend Order Detail modal displays the reserved/dispatched batches correctly for non-DRAFT orders.

---

## Phase 11 Active Tasks
- [x] Create `invoiceService.js` (getPendingDispatchOrders, createInvoice, listInvoices, recordPayment)
- [x] Create `invoiceController.js` and `invoiceRoutes.js`
- [x] Mount `/api/invoices` in `app.js`
- [x] Rewrite `InvoicesView.jsx` layout and integrate API calls
- [x] Connect "Generate Invoice" flow for dispatched orders
- [x] Connect "Record Payment" flow to update invoice and customer credit
- [x] Verify complete finance loop logic

---

## Phase 11 Checkpoint Requirements
1. `GET /api/invoices/pending-orders` correctly returns only DISPATCHED sales orders.
2. `POST /api/invoices` generates a unique `INV-YYYYMM-NNNN` number, creates the invoice, and updates order status to INVOICED.
3. `POST /api/invoices/:id/payments` correctly decrements invoice `outstandingAmount`, increments `amountPaid`, and updates invoice status (PARTIALLY_PAID / PAID).
4. Customer credit is restored: `CustomerCredit.outstandingAmount` is decremented by the exact payment amount.
5. Frontend allows users with `invoices.payment` permission to record payments and users with `invoices.create` to generate invoices.
