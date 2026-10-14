# SmartAgri ERP - Architecture & Engineering Specification

## Architecture Overview
SmartAgri ERP is built as a **Modular Monolith** using the **PERN** stack with standard **ES Modules JavaScript** (`"type": "module"`).

```text
React + Vite (JS/JSX)
       │ HTTP / REST APIs
       ▼
Node.js + Express (ESM JavaScript)
       │ Prisma ORM
       ▼
PostgreSQL Database
```

---

## Technical Constraints & Standards

### JavaScript / ES Modules (ESM)
- All Node.js backend files use ES Modules syntax (`import / export`).
- `"type": "module"` must be declared in backend `package.json`.
- Extensions in relative imports must be explicitly specified if required by Node ESM (e.g. `import { db } from './config/db.js'`).
- DO NOT use TypeScript (`.ts` / `.tsx`). All logic is pure JavaScript (`.js` / `.jsx`).

### Backend Design Pattern (Strict Layering)
```text
Routes / Controllers → Business Services → Prisma ORM → Database
```
1. **Controllers:** Extract request params/body, validate input, call Service layer, format standard JSON HTTP response.
2. **Services:** Contain ALL business logic (FEFO, Credit Validation, Pricing, Tax, Inventory Reservations, Invoicing). Frontend or Controllers MUST NEVER execute business logic directly.
3. **Database Transactions:** All multi-entity state mutations (Confirm Order, Dispatch, Payment) MUST use Prisma transactions (`prisma.$transaction`).

### Multi-Tenant Isolation
- All database tables (except static RBAC system definitions if applicable) include `organization_id`.
- `organization_id` MUST be extracted from the authenticated JWT token session on the backend.
- APIs MUST filter all queries by `req.user.organization_id`. Never trust `organization_id` passed from client requests.

---

## Data Model & Schema Overview (PostgreSQL via Prisma)

### 1. Organization & Security
- `Organization` (`id`, `name`, `code`, `status`, timestamps)
- `User` (`id`, `organization_id`, `name`, `email`, `password_hash`, `role_id`, `status`, timestamps)
- `Role` (`id`, `name`, `description`)
- `Permission` (`id`, `name`, `description`)
- `RolePermission` (`role_id`, `permission_id`)

### 2. Products & Batches
- `ProductCategory` (`id`, `organization_id`, `name`, `description`, `status`)
- `Product` (`id`, `organization_id`, `category_id`, `name`, `sku`, `unit`, `default_selling_price`, `minimum_stock`, `status`, timestamps)
- `ProductBatch` (`id`, `organization_id`, `product_id`, `batch_number`, `manufacturing_date`, `expiry_date`, `initial_quantity`, `available_quantity`, `reserved_quantity`, `status`, timestamps)
  - Batch Statuses: `AVAILABLE`, `EXPIRING_SOON`, `EXPIRED`, `BLOCKED`, `DEPLETED`

### 3. Inventory & Movements
- `StockMovement` (`id`, `organization_id`, `product_id`, `batch_id`, `type`, `quantity`, `reference_type`, `reference_id`, `reason`, `created_by`, timestamps)
  - Types: `STOCK_IN`, `RESERVATION`, `RELEASE`, `DISPATCH`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`

### 4. Customers & Credit
- `Customer` (`id`, `organization_id`, `name`, `type`, `phone`, `email`, `address`, `status`, timestamps)
  - Customer Types: `DISTRIBUTOR`, `DEALER`, `RETAILER`
- `CustomerCredit` (`id`, `organization_id`, `customer_id`, `credit_limit`, `outstanding_amount`, `payment_terms_days`, `status`, timestamps)

### 5. Pricing Engine
- `PriceRule` (`id`, `organization_id`, `product_id`, `min_quantity`, `max_quantity`, `price_per_unit`, `status`, timestamps)

### 6. Sales & Allocation
- `SalesOrder` (`id`, `organization_id`, `customer_id`, `order_number`, `order_date`, `total_amount`, `payment_terms_days`, `status`, `created_by`, timestamps)
  - Order Statuses: `DRAFT`, `CONFIRMED`, `DISPATCHED`, `INVOICED`, `PAID`, `CANCELLED`
- `SalesOrderItem` (`id`, `sales_order_id`, `product_id`, `quantity`, `unit_price`, `subtotal`)
- `BatchAllocation` (`id`, `organization_id`, `sales_order_item_id`, `batch_id`, `quantity`, timestamps)

### 7. Finance & Invoicing
- `Invoice` (`id`, `organization_id`, `customer_id`, `sales_order_id`, `invoice_number`, `invoice_date`, `subtotal`, `discount`, `total_amount`, `amount_paid`, `outstanding_amount`, `payment_terms_days`, `due_date`, `status`, timestamps)
  - Invoice Statuses: `PENDING`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`, `CANCELLED`
- `Payment` (`id`, `organization_id`, `invoice_id`, `customer_id`, `amount`, `payment_date`, `payment_method`, `reference_number`, `notes`, `created_by`, timestamps)

### 8. Audit Log
- `AuditLog` (`id`, `organization_id`, `user_id`, `action`, `entity_type`, `entity_id`, `metadata`, timestamps)

---

## Core Business Service Contracts

### 1. FEFO Engine (`InventoryService.js` / `ExpiryService.js`)
- Input: `product_id`, `requested_quantity`
- Filters: Active organization, non-expired (`expiry_date > current_date`), non-blocked, non-depleted (`available_quantity > 0`).
- Sorting: `expiry_date ASC` (earliest expiring batch first).
- Returns: Array of proposed allocations `[{ batch_id, quantity }]`.

### 2. Credit Validation (`CreditValidationService.js`)
- Formula: `available_credit = credit_limit - outstanding_amount`
- Approval Rule: `order_amount <= available_credit`

### 3. Pricing Calculation (`PricingService.js`)
- Input: `product_id`, `quantity`
- Resolves matching `PriceRule` where `quantity >= min_quantity AND (max_quantity IS NULL OR quantity <= max_quantity)`.
- Output: `unit_price`, `subtotal = quantity * unit_price`.

### 4. Sales Order Check (`SalesOrderService.js`)
- Endpoint: `POST /api/sales/orders/check`
- Non-mutating calculation that integrates Stock availability, FEFO preview, Pricing rules, and Credit limit evaluation.

---

## Standard Error Response Specification
All API errors return consistent JSON:
```json
{
  "success": false,
  "error": {
    "code": "CREDIT_LIMIT_EXCEEDED",
    "message": "Order amount (₹8,50,000) exceeds available credit limit (₹4,00,000)."
  }
}
```
Standard Error Codes:
`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `INSUFFICIENT_STOCK`, `CREDIT_LIMIT_EXCEEDED`, `BATCH_EXPIRED`, `BATCH_BLOCKED`, `INVALID_ORDER_STATE`, `PAYMENT_EXCEEDS_OUTSTANDING`, `DUPLICATE_OPERATION`.

---

## Task-Centered Contextual Workspaces Architecture (Phase 15)

SmartAgri ERP organizes the user interface around **real business tasks** rather than isolated database tables or backend modules. While backend services maintain strict separation of concerns, the frontend collates real-time cross-module intelligence into unified, responsive workspaces without altering backend contracts or calculations.

### 1. Architectural Philosophy: Task-to-Information Matrix

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       TASK-CENTERED WORKSPACE                               │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ PRIMARY WORK AREA (60%)              │ CONTEXTUAL INTELLIGENCE (40%)        │
│ • Entity Selector (Customer/Product) │ • Entity Profile & Live Metrics      │
│ • Direct Transaction Work Form       │ • Cross-Module History & Status      │
│ • Action Triggers & Check Engine     │ • Authoritative Verification Gauges  │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

| Task | Primary Work Area | Secondary Supporting Context | Deep Detail Navigation |
|---|---|---|---|
| **Sales Order Creation** | Customer picker, Line items, Qty, Unit Price, Draft creation | • Customer credit limit & live utilization<br>• Outstanding invoices & recent orders<br>• Real-time batch stock & FEFO sequence<br>• Bulk pricing rules tier matrix | Customer 360 (`#customers?id=...`) |
| **Customer Relationship & Credit Review** | Customer directory with search, type filters, and credit risk badges | • 360° Financial profile (Limit, Outstanding, Avail)<br>• Complete sales order history<br>• Unsettled & overdue tax invoices<br>• Payment receipts ledger | Dedicated order/invoice view |
| **Payment Receipt & Cash Settlement** | Invoice selection, Payment amount, Method, Reference #, Notes | • Customer overall exposure & other unpaid invoices<br>• Previous partial payments on invoice<br>• Real-time credit restoration impact preview | Customer 360 (`#customers`) |
| **Batch Inventory & Stock Adjustment** | Production lot creation, Manual stock adjustment (Surplus/Deficit) | • Product specifications (SKU, Unit, Category)<br>• Product total stock across all active lots<br>• Shelf-life expiry status & days countdown<br>• Batch movement audit trail (STOCK_IN, DISPATCH) | FEFO Simulator tab |

### 2. Information Hierarchy & Progressive Disclosure
1. **Primary Context (Immediate):** Critical metrics required to make the immediate transaction decision (e.g., Available Credit, Available Stock, Total Amount, Unit Price).
2. **Secondary Context (Inline Panels / Drawers):** Historical records and comparative context organized in compact tabs or sticky side drawers (e.g., last 5 orders, batch expiry radar, other unpaid invoices).
3. **Deep Detail (Dedicated Views):** Comprehensive full-page audit records with cross-navigation links (e.g. Analytics & Reports, Full Movements Ledger).

### 3. Dynamic State & Zero Stale-Data Rule
- Context panels are entity-aware: changing selected customer or product immediately refreshes all dependent context sections.
- URL hash routing with query parameters (`#sales?customerId=...`, `#sales?action=new`, `#customers?id=...`, `#inventory?batch=...`) enables deep linking across workspaces while preserving context state.
