/**
 * Golden Scenario E2E Test Runner - Phase 13
 *
 * Executes the complete SmartAgri ERP steel thread workflow programmatically:
 *   1. Login as OWNER
 *   2. Create Sales Order — 10,000 KG NPK 19-19-19 for Golden Agro Ltd.
 *   3. Run Order Check — verify FEFO allocates B001+B002, credit passes
 *   4. Confirm Order — verify CONFIRMED status, BatchAllocations created
 *   5. Dispatch Order — verify DISPATCHED status, B001 DEPLETED
 *   6. Generate Invoice — verify INV-YYYYMM-XXXX number
 *   7. Record Payment — verify CustomerCredit.outstandingAmount restored
 *
 * Prerequisites:
 *   - Backend running on http://localhost:5000
 *   - Golden Scenario seed has been run: node backend/prisma/golden_scenario_seed.js
 *
 * Run: node backend/scripts/run_golden_scenario.js
 */

// Note: Node.js v18+ has native fetch built-in, no external package needed
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const BASE_URL = 'http://localhost:5000/api';
const OWNER_EMAIL = 'owner@smartagri.com';
const OWNER_PASSWORD = 'Password@123';
const ORG_CODE = 'AGRI_CORP';
const PRODUCT_SKU = 'NPK-19-19-19';
const CUSTOMER_NAME = 'Golden Agro Ltd.';
const ORDER_QUANTITY = 10000;

let token = '';
let passed = 0;
let failed = 0;
const errors = [];

// ==========================================
// HELPERS
// ==========================================

async function req(method, path, body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-organization-code': ORG_CODE,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const data = await res.json();
  return { status: res.status, data };
}

function pass(step, detail = '') {
  passed++;
  console.log(`  ✅ [PASS] ${step}${detail ? ' — ' + detail : ''}`);
}

function fail(step, detail = '') {
  failed++;
  const msg = `  ❌ [FAIL] ${step}${detail ? ' — ' + detail : ''}`;
  console.log(msg);
  errors.push(msg);
}

function assert(condition, stepName, detail = '') {
  if (condition) pass(stepName, detail);
  else fail(stepName, detail);
}

// ==========================================
// STEPS
// ==========================================

async function step1_login() {
  console.log('\n📍 Step 1: Login as OWNER');
  const { status, data } = await req('POST', '/auth/login', {
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
    organizationCode: ORG_CODE,
  });
  assert(status === 200, 'Login returns 200');
  assert(!!data.data?.token, 'JWT token returned');
  if (data.data?.token) {
    token = data.data.token;
    pass('Token stored');
  }
}

async function step2_fetchProductAndCustomer() {
  console.log('\n📍 Step 2: Fetch product & customer IDs');

  const { status: ps, data: pd } = await req('GET', '/products');
  assert(ps === 200, 'GET /products returns 200');
  const product = pd.data?.find(p => p.sku === PRODUCT_SKU);
  assert(!!product, `Product "${PRODUCT_SKU}" found`, product ? `id: ${product.id}` : 'NOT FOUND');

  const { status: cs, data: cd } = await req('GET', '/customers');
  assert(cs === 200, 'GET /customers returns 200');
  const customer = cd.data?.find(c => c.name === CUSTOMER_NAME);
  assert(!!customer, `Customer "${CUSTOMER_NAME}" found`, customer ? `id: ${customer.id}` : 'NOT FOUND');

  return { product, customer };
}

async function step3_orderCheck(productId, customerId) {
  console.log('\n📍 Step 3: Order Check (non-mutating)');
  const { status, data } = await req('POST', '/sales/orders/check', {
    customerId,
    items: [{ productId, quantity: ORDER_QUANTITY }],
  });

  assert(status === 200, 'POST /sales/orders/check returns 200');
  assert(data.data?.canProceed === true, 'canProceed is true');
  assert(data.data?.credit?.passed === true, 'Credit check passed');

  const fefo = data.data?.items?.[0]?.fefo;
  assert(fefo?.canFulfill === true, 'FEFO can fulfill 10,000 KG');

  const allocBatches = fefo?.allocations?.map(a => a.batchNumber) ?? [];
  assert(allocBatches.includes('B001'), 'FEFO allocates B001 (earliest expiry)');
  assert(allocBatches.includes('B002'), 'FEFO allocates B002 (second expiry)');
  assert(!allocBatches.includes('B003'), 'FEFO does NOT touch B003 (latest expiry)');

  // Check pricing (bulk tier should kick in: ₹1,200/KG for >= 5,000 KG)
  const unitPrice = data.data?.items?.[0]?.unitPrice;
  assert(unitPrice === 1200, `Bulk price tier applied: ₹${unitPrice}/KG`, unitPrice !== 1200 ? `expected 1200, got ${unitPrice}` : '');

  const totalAmount = data.data?.totalAmount;
  assert(totalAmount === 12000000, `Total = ₹${totalAmount?.toLocaleString('en-IN')} (expected ₹1,20,00,000)`, totalAmount !== 12000000 ? `expected 12000000, got ${totalAmount}` : '');

  return data.data;
}

async function step4_createOrder(productId, customerId, unitPrice) {
  console.log('\n📍 Step 4: Create Draft Order');
  const { status, data } = await req('POST', '/sales/orders', {
    customerId,
    items: [{ productId, quantity: ORDER_QUANTITY, unitPrice, subtotal: ORDER_QUANTITY * unitPrice }],
  });
  assert(status === 201, `POST /sales/orders returns 201`, `status: ${status}`);
  assert(data.data?.status === 'DRAFT', 'Order status is DRAFT');
  assert(!!data.data?.orderNumber, `Order number generated: ${data.data?.orderNumber}`);
  return data.data;
}

async function step5_confirmOrder(orderId) {
  console.log('\n📍 Step 5: Confirm Order (reserve stock)');
  const { status, data } = await req('POST', `/sales/orders/${orderId}/confirm`);
  assert(status === 200, `POST /orders/:id/confirm returns 200`, `status: ${status}`);
  assert(data.data?.status === 'CONFIRMED', 'Order status is CONFIRMED');

  const allocations = data.data?.items?.flatMap(i => i.allocations) ?? [];
  assert(allocations.length > 0, `BatchAllocation rows created: ${allocations.length}`);

  const allocBatchNums = allocations.map(a => a.batch?.batchNumber);
  assert(allocBatchNums.includes('B001'), 'BatchAllocation for B001 created');
  assert(allocBatchNums.includes('B002'), 'BatchAllocation for B002 created');
  return data.data;
}

async function step6_dispatchOrder(orderId) {
  console.log('\n📍 Step 6: Dispatch Order (deduct stock, increment credit)');
  const { status, data } = await req('POST', `/sales/orders/${orderId}/dispatch`);
  assert(status === 200, `POST /orders/:id/dispatch returns 200`, `status: ${status}`);
  assert(data.data?.status === 'DISPATCHED', 'Order status is DISPATCHED');

  // Verify B001 is DEPLETED after 4,000 KG was its entire stock
  const { data: batchData } = await req('GET', '/inventory/batches');
  const b001 = batchData?.data?.find(b => b.batchNumber === 'B001');
  assert(b001?.status === 'DEPLETED', `B001 marked DEPLETED`, `status: ${b001?.status}`);
  assert(b001?.reservedQuantity === 0, `B001 reservedQuantity = 0`, `reserved: ${b001?.reservedQuantity}`);

  const b002 = batchData?.data?.find(b => b.batchNumber === 'B002');
  assert(b002?.availableQuantity === 0, `B002 availableQuantity = 0 (fully allocated)`, `available: ${b002?.availableQuantity}`);
  
  return data.data;
}

async function step7_generateInvoice(orderId) {
  console.log('\n📍 Step 7: Generate Invoice');
  const { status, data } = await req('POST', '/invoices', { salesOrderId: orderId });
  assert(status === 201, `POST /invoices returns 201`, `status: ${status}`);
  assert(/^INV-\d{6}-\d{4}$/.test(data.data?.invoiceNumber), `Invoice number format valid: ${data.data?.invoiceNumber}`);
  assert(data.data?.status === 'PENDING', 'Invoice status is PENDING');
  assert(data.data?.totalAmount === 12000000, `Invoice total = ₹${data.data?.totalAmount?.toLocaleString('en-IN')}`);
  return data.data;
}

async function step8_recordPayment(invoiceId, customerId) {
  console.log('\n📍 Step 8: Record Full Payment');
  const { status, data } = await req('POST', `/invoices/${invoiceId}/payments`, {
    amount: 12000000,
    paymentMethod: 'BANK_TRANSFER',
    referenceNumber: 'NEFT-GS-TEST-001',
    notes: 'Golden Scenario full payment',
  });
  assert(status === 201, `POST /invoices/:id/payments returns 201`, `status: ${status}`);
  assert(data.data?.amount === 12000000, `Payment amount = ₹${data.data?.amount?.toLocaleString('en-IN')}`);

  // Verify CustomerCredit.outstandingAmount is restored to 0
  const { data: custData } = await req('GET', '/customers');
  const customer = custData?.data?.find(c => c.name === CUSTOMER_NAME);
  const outstanding = customer?.credit?.outstandingAmount ?? -1;
  assert(outstanding === 0, `CustomerCredit.outstandingAmount = ₹0 (credit restored)`, `outstanding: ₹${outstanding}`);
}

// ==========================================
// EDGE CASE GUARDS
// ==========================================

async function edgeCaseTests(orderId, invoiceId) {
  console.log('\n📍 Edge Case Verification');

  // Double dispatch should fail
  const { status: ds } = await req('POST', `/sales/orders/${orderId}/dispatch`);
  assert(ds === 400, `Double-dispatch blocked with 400`, `status: ${ds}`);

  // Overpayment should fail
  const { status: ps } = await req('POST', `/invoices/${invoiceId}/payments`, { amount: 1 });
  assert(ps === 400, `Overpayment on PAID invoice blocked with 400`, `status: ${ps}`);
}

// ==========================================
// MAIN RUNNER
// ==========================================

async function main() {
  console.log('='.repeat(60));
  console.log('  SmartAgri ERP — Golden Scenario E2E Test (Phase 13)');
  console.log('='.repeat(60));

  try {
    await step1_login();
    const { product, customer } = await step2_fetchProductAndCustomer();

    if (!product || !customer) {
      throw new Error('Required seed data not found. Run: node backend/prisma/golden_scenario_seed.js');
    }

    const checkResult = await step3_orderCheck(product.id, customer.id);
    const unitPrice = checkResult?.items?.[0]?.unitPrice ?? 1200;

    const order = await step4_createOrder(product.id, customer.id, unitPrice);
    await step5_confirmOrder(order.id);
    await step6_dispatchOrder(order.id);
    const invoice = await step7_generateInvoice(order.id);
    await step8_recordPayment(invoice.id, customer.id);
    await edgeCaseTests(order.id, invoice.id);

  } catch (err) {
    fail('UNEXPECTED ERROR', err.message);
  }

  // Final report
  console.log('\n' + '='.repeat(60));
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  if (errors.length > 0) {
    console.log('\n  Failed checks:');
    errors.forEach(e => console.log(`  ${e}`));
  }
  console.log('='.repeat(60));

  if (failed > 0) process.exit(1);
}

main();
