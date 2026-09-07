import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost, apiDelete } from '../utils/api';
import {
  Plus, X, Loader2, AlertTriangle, Check, ChevronDown, ChevronUp,
  ShoppingCart, Trash2, Zap, ShieldCheck, ShieldAlert, Package,
  PackageSearch, CheckCircle2, XCircle, Info, Minus, CheckSquare, Truck
} from 'lucide-react';

// ─────────────────────────────────────────────
// STATUS CONFIG
// ─────────────────────────────────────────────
const STATUS_META = {
  DRAFT:      { label: 'DRAFT',      cls: 'badge-warning' },
  CONFIRMED:  { label: 'CONFIRMED',  cls: 'badge-info'    },
  DISPATCHED: { label: 'DISPATCHED', cls: 'badge-success' },
  INVOICED:   { label: 'INVOICED',   cls: 'badge-success' },
  PAID:       { label: 'PAID',       cls: 'badge-success' },
  CANCELLED:  { label: 'CANCELLED',  cls: 'badge-danger'  },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, cls: 'badge-warning' };
  return <span className={`badge ${meta.cls}`}>{meta.label}</span>;
}

// ─────────────────────────────────────────────
// MODAL WRAPPER
// ─────────────────────────────────────────────
function Modal({ title, onClose, children, maxWidth = '720px' }) {
  return (
    <div style={ms.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...ms.modal, maxWidth }}>
        <div style={ms.header}>
          <h3 style={ms.title}>{title}</h3>
          <button onClick={onClose} style={ms.closeBtn}><X size={18} /></button>
        </div>
        <div style={ms.body}>{children}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ORDER CHECK RESULT PANEL
// ─────────────────────────────────────────────
function CheckResultPanel({ result, onConfirmCreate, creating }) {
  const [showFEFO, setShowFEFO] = useState({});

  return (
    <div style={cr.panel}>
      {/* Header */}
      <div style={cr.sectionTitle}>
        <Zap size={16} color="#f59e0b" /> Order Evaluation Result
      </div>

      {/* Overall Gate */}
      <div style={{ ...cr.gateBanner, borderColor: result.canProceed ? '#10b981' : '#ef4444', backgroundColor: result.canProceed ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)' }}>
        {result.canProceed
          ? <><CheckCircle2 size={20} color="#10b981" /> <span style={{ color: '#10b981', fontWeight: 700 }}>Order can proceed — all checks passed.</span></>
          : <><XCircle size={20} color="#ef4444" /> <span style={{ color: '#ef4444', fontWeight: 700 }}>Order cannot proceed — review issues below.</span></>
        }
      </div>

      {/* Credit Check */}
      <div style={cr.card}>
        <div style={cr.cardHeader}>
          {result.credit.passed
            ? <ShieldCheck size={16} color="#10b981" />
            : <ShieldAlert size={16} color="#ef4444" />
          }
          <span style={{ fontWeight: 700, color: '#f8fafc' }}>Credit Check</span>
          <span className={result.credit.passed ? 'badge badge-success' : 'badge badge-danger'} style={{ marginLeft: 'auto' }}>
            {result.credit.passed ? 'APPROVED' : 'REJECTED'}
          </span>
        </div>
        {result.credit.error && (
          <p style={{ color: '#ef4444', fontSize: '0.8125rem', margin: '0.5rem 0 0' }}>{result.credit.error}</p>
        )}
        <div style={cr.metaGrid}>
          <div style={cr.metaItem}><span style={cr.metaLabel}>Customer</span><span style={cr.metaVal}>{result.credit.customerName}</span></div>
          <div style={cr.metaItem}><span style={cr.metaLabel}>Credit Limit</span><span style={cr.metaVal}>₹{Number(result.credit.creditLimit || 0).toLocaleString('en-IN')}</span></div>
          <div style={cr.metaItem}><span style={cr.metaLabel}>Outstanding</span><span style={{ ...cr.metaVal, color: '#f59e0b' }}>₹{Number(result.credit.outstandingAmount || 0).toLocaleString('en-IN')}</span></div>
          <div style={cr.metaItem}><span style={cr.metaLabel}>Available Credit</span><span style={{ ...cr.metaVal, color: result.credit.passed ? '#10b981' : '#ef4444' }}>₹{Number(result.credit.availableCredit || 0).toLocaleString('en-IN')}</span></div>
          <div style={cr.metaItem}><span style={cr.metaLabel}>Order Total</span><span style={{ ...cr.metaVal, color: '#3b82f6', fontWeight: 800 }}>₹{Number(result.totalAmount).toLocaleString('en-IN')}</span></div>
          <div style={cr.metaItem}><span style={cr.metaLabel}>Payment Terms</span><span style={cr.metaVal}>{result.credit.paymentTermsDays ?? '—'} days</span></div>
        </div>
      </div>

      {/* Stock & Line Items */}
      <div style={cr.card}>
        <div style={cr.cardHeader}>
          <Package size={16} color={result.stock.allSufficient ? '#10b981' : '#ef4444'} />
          <span style={{ fontWeight: 700, color: '#f8fafc' }}>Stock & Pricing</span>
          <span className={result.stock.allSufficient ? 'badge badge-success' : 'badge badge-danger'} style={{ marginLeft: 'auto' }}>
            {result.stock.allSufficient ? 'SUFFICIENT' : 'SHORTAGE'}
          </span>
        </div>

        {result.items.map((item, idx) => {
          const open = showFEFO[idx];
          return (
            <div key={item.productId} style={cr.lineItem}>
              <div style={cr.lineHeader}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700, color: '#f8fafc' }}>{item.productName}</span>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', fontFamily: 'monospace', marginLeft: '0.5rem' }}>{item.productSku}</span>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Qty × Price</p>
                    <p style={{ fontWeight: 700, color: '#cbd5e1', fontSize: '0.8125rem' }}>{item.quantity.toLocaleString()} × ₹{Number(item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: '100px' }}>
                    <p style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Subtotal</p>
                    <p style={{ fontWeight: 800, color: '#3b82f6', fontSize: '0.9375rem' }}>₹{Number(item.subtotal).toLocaleString('en-IN')}</p>
                  </div>
                  <span className={item.fefo.canFulfill ? 'badge badge-success' : 'badge badge-danger'}>
                    {item.fefo.canFulfill ? '✓ STOCK OK' : `⚠ SHORT ${item.fefo.shortage.toLocaleString()}`}
                  </span>
                  <button onClick={() => setShowFEFO(p => ({ ...p, [idx]: !p[idx] }))} style={cr.toggleBtn}>
                    {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />} FEFO
                  </button>
                </div>
              </div>

              {item.pricingFallback && (
                <div style={cr.infoChip}><Info size={12} /> Using default price (no bulk tier matched for qty {item.quantity.toLocaleString()} {item.productUnit})</div>
              )}

              {open && (
                <div style={cr.fefoTable}>
                  <p style={cr.fefoTitle}>FEFO Allocation Plan — {item.fefo.allocations.length} batch(es)</p>
                  {item.fefo.allocations.length === 0
                    ? <p style={{ color: '#ef4444', fontSize: '0.8rem' }}>No eligible batches available.</p>
                    : item.fefo.allocations.map((a) => (
                        <div key={a.batchId} style={cr.fefoRow}>
                          <span style={{ fontFamily: 'monospace', color: '#3b82f6', fontWeight: 600, fontSize: '0.8rem' }}>{a.batchNumber}</span>
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Exp: {new Date(a.expiryDate).toLocaleDateString('en-IN')}</span>
                          <span className={a.expiryStatus === 'EXPIRING_SOON' ? 'badge badge-warning' : 'badge badge-success'} style={{ fontSize: '0.65rem' }}>{a.expiryStatus}</span>
                          <span style={{ color: '#10b981', fontWeight: 700, marginLeft: 'auto', fontSize: '0.8125rem' }}>Alloc: {a.allocatedQuantity.toLocaleString()} {item.productUnit}</span>
                        </div>
                      ))
                  }
                </div>
              )}
            </div>
          );
        })}

        <div style={cr.totalRow}>
          <span style={{ color: '#94a3b8', fontWeight: 600 }}>Order Total</span>
          <span style={{ color: '#3b82f6', fontWeight: 800, fontSize: '1.25rem' }}>₹{Number(result.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Action */}
      {result.canProceed && (
        <button onClick={onConfirmCreate} style={cr.createBtn} disabled={creating}>
          {creating
            ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Creating Draft Order...</>
            : <><Check size={16} /> Save as Draft Order</>
          }
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CREATE ORDER MODAL
// ─────────────────────────────────────────────
function CreateOrderModal({ customers, products, onClose, onCreated }) {
  const { showToast } = useToast();
  const [customerId, setCustomerId] = useState('');
  const [lines, setLines] = useState([{ productId: '', quantity: '', unitPrice: '' }]);
  const [checking, setChecking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  const setLine = (idx, field, val) => {
    setLines(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      // Auto-fill unit price from product default when product is selected
      if (field === 'productId' && val) {
        const prod = products.find(p => p.id === val);
        if (prod) next[idx].unitPrice = String(prod.defaultSellingPrice);
      }
      return next;
    });
    setCheckResult(null); // reset check on any change
  };

  const addLine = () => setLines(prev => [...prev, { productId: '', quantity: '', unitPrice: '' }]);
  const removeLine = (idx) => setLines(prev => prev.filter((_, i) => i !== idx));

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!customerId) { showToast('Select a customer.', 'error'); return; }
    const validLines = lines.filter(l => l.productId && l.quantity);
    if (validLines.length === 0) { showToast('Add at least one product line.', 'error'); return; }

    setChecking(true);
    setCheckResult(null);
    try {
      const res = await apiPost('/sales/orders/check', {
        customerId,
        items: validLines.map(l => ({ productId: l.productId, quantity: parseFloat(l.quantity) })),
      });
      // Merge resolved unit prices back into lines
      const resolvedItems = res.data.items;
      setLines(prev => prev.map(l => {
        if (!l.productId) return l;
        const resolved = resolvedItems.find(r => r.productId === l.productId);
        return resolved ? { ...l, unitPrice: String(resolved.unitPrice) } : l;
      }));
      setCheckResult(res.data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setChecking(false);
    }
  };

  const handleCreate = async () => {
    if (!checkResult) return;
    setCreating(true);
    try {
      const validLines = lines.filter(l => l.productId && l.quantity && l.unitPrice);
      await apiPost('/sales/orders', {
        customerId,
        items: validLines.map(l => ({
          productId: l.productId,
          quantity: parseFloat(l.quantity),
          unitPrice: parseFloat(l.unitPrice),
        })),
      });
      showToast('Sales order created as DRAFT successfully.', 'success');
      onCreated();
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const orderTotal = lines.reduce((s, l) => {
    const qty = parseFloat(l.quantity) || 0;
    const price = parseFloat(l.unitPrice) || 0;
    return s + qty * price;
  }, 0);

  return (
    <Modal title="Create Sales Order" onClose={onClose} maxWidth="860px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Customer */}
        <div style={fs.field}>
          <label style={fs.label}>Customer <span style={fs.req}>*</span></label>
          <select
            id="order-customer"
            style={fs.select}
            value={customerId}
            onChange={e => { setCustomerId(e.target.value); setCheckResult(null); }}
            required
          >
            <option value="">— Select Customer —</option>
            {customers.filter(c => c.status === 'ACTIVE').map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type}) — Credit: ₹{Number(c.credit?.availableCredit ?? 0).toLocaleString('en-IN')}
              </option>
            ))}
          </select>
        </div>

        {/* Line Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={fs.label}>Order Lines <span style={fs.req}>*</span></label>
            <button type="button" onClick={addLine} style={fs.addLineBtn}>
              <Plus size={13} /> Add Line
            </button>
          </div>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem' }}>
            <span style={{ ...fs.label, paddingLeft: '0.25rem' }}>Product</span>
            <span style={{ ...fs.label, paddingLeft: '0.25rem' }}>Quantity</span>
            <span style={{ ...fs.label, paddingLeft: '0.25rem' }}>Unit Price (₹)</span>
            <span></span>
          </div>

          {lines.map((line, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
              <select
                style={fs.select}
                value={line.productId}
                onChange={e => setLine(idx, 'productId', e.target.value)}
              >
                <option value="">— Product —</option>
                {products.filter(p => p.status === 'ACTIVE').map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                ))}
              </select>
              <input
                style={fs.input}
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0"
                value={line.quantity}
                onChange={e => setLine(idx, 'quantity', e.target.value)}
              />
              <input
                style={{ ...fs.input, color: '#10b981', fontWeight: 600 }}
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={line.unitPrice}
                onChange={e => setLine(idx, 'unitPrice', e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeLine(idx)}
                style={fs.removeBtn}
                disabled={lines.length === 1}
                title="Remove line"
              >
                <Minus size={14} />
              </button>
            </div>
          ))}

          {/* Running total */}
          {orderTotal > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.8125rem', marginRight: '0.75rem', fontWeight: 600 }}>Estimated Total:</span>
              <span style={{ color: '#3b82f6', fontWeight: 800, fontSize: '0.9375rem' }}>₹{orderTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>

        {/* Check Button */}
        <button onClick={handleCheck} style={fs.checkBtn} disabled={checking}>
          {checking
            ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Running checks...</>
            : <><Zap size={15} /> Run Order Check (Credit + Stock + Pricing)</>
          }
        </button>

        {/* Check Result */}
        {checkResult && (
          <CheckResultPanel
            result={checkResult}
            onConfirmCreate={handleCreate}
            creating={creating}
          />
        )}
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// ORDER DETAIL MODAL
// ─────────────────────────────────────────────
function OrderDetailModal({ order, onClose }) {
  return (
    <Modal title={`Order ${order.orderNumber}`} onClose={onClose} maxWidth="680px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={cr.metaGrid}>
          <div style={cr.metaItem}><span style={cr.metaLabel}>Customer</span><span style={cr.metaVal}>{order.customer?.name}</span></div>
          <div style={cr.metaItem}><span style={cr.metaLabel}>Status</span><StatusBadge status={order.status} /></div>
          <div style={cr.metaItem}><span style={cr.metaLabel}>Order Date</span><span style={cr.metaVal}>{new Date(order.orderDate).toLocaleDateString('en-IN')}</span></div>
          <div style={cr.metaItem}><span style={cr.metaLabel}>Payment Terms</span><span style={cr.metaVal}>{order.paymentTermsDays} days</span></div>
          <div style={cr.metaItem}><span style={cr.metaLabel}>Created By</span><span style={cr.metaVal}>{order.user?.name}</span></div>
          <div style={cr.metaItem}><span style={cr.metaLabel}>Total</span><span style={{ ...cr.metaVal, color: '#3b82f6', fontWeight: 800, fontSize: '1rem' }}>₹{Number(order.totalAmount).toLocaleString('en-IN')}</span></div>
        </div>
        <div>
          <p style={{ ...fs.label, marginBottom: '0.625rem' }}>Order Lines</p>
          <table style={vs.table}>
            <thead>
              <tr style={vs.theadRow}>
                <th style={vs.th}>Product</th>
                <th style={vs.th}>SKU</th>
                <th style={vs.th}>Qty</th>
                <th style={vs.th}>Unit Price</th>
                <th style={{ ...vs.th, textAlign: 'right' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map(item => (
                <tr key={item.id} style={vs.tr}>
                  <td style={{ ...vs.td, fontWeight: 700 }}>{item.product?.name}</td>
                  <td style={{ ...vs.td, fontFamily: 'monospace', color: '#3b82f6', fontSize: '0.75rem' }}>{item.product?.sku}</td>
                  <td style={vs.td}>{Number(item.quantity).toLocaleString()} {item.product?.unit}</td>
                  <td style={vs.td}>₹{Number(item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td style={{ ...vs.td, textAlign: 'right', fontWeight: 700, color: '#10b981' }}>₹{Number(item.subtotal).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {['CONFIRMED', 'DISPATCHED', 'INVOICED', 'PAID'].includes(order.status) && order.items?.some(i => i.allocations?.length > 0) && (
          <div>
            <p style={{ ...fs.label, marginBottom: '0.625rem', color: '#3b82f6' }}>Reserved / Dispatched Batches</p>
            <div style={{ backgroundColor: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {order.items.map(item => (
                item.allocations?.length > 0 && (
                  <div key={item.id}>
                    <p style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>{item.product?.name}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {item.allocations.map(alloc => (
                        <div key={alloc.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: '#0f172a', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                          <span style={{ fontFamily: 'monospace', color: '#3b82f6', fontWeight: 700, fontSize: '0.8125rem' }}>{alloc.batch?.batchNumber}</span>
                          <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Exp: {new Date(alloc.batch?.expiryDate).toLocaleDateString('en-IN')}</span>
                          <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.8125rem', marginLeft: 'auto' }}>{alloc.quantity.toLocaleString()} {item.product?.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// MAIN VIEW
// ─────────────────────────────────────────────
export default function SalesOrdersView() {
  const { showToast } = useToast();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('sales.create');
  const canConfirm = hasPermission('sales.confirm');
  const canDispatch = hasPermission('sales.dispatch');

  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'create' | { type: 'detail', order } | { type: 'cancel', order }
  const [cancelling, setCancelling] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const fetchOrders = useCallback(async () => {
    try {
      const res = await apiGet('/sales/orders');
      setOrders(res.data || []);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }, [showToast]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, custRes, prodRes] = await Promise.all([
        apiGet('/sales/orders'),
        apiGet('/customers'),
        apiGet('/products'),
      ]);
      setOrders(ordersRes.data || []);
      setCustomers(custRes.data || []);
      setProducts(prodRes.data || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCancelOrder = async () => {
    setCancelling(true);
    try {
      await apiDelete(`/sales/orders/${modal.order.id}`);
      showToast(`Order ${modal.order.orderNumber} cancelled.`, 'success');
      setModal(null);
      fetchOrders();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handleConfirmOrder = async (orderId) => {
    if (!window.confirm('Confirm order? This will reserve stock and cannot be undone.')) return;
    setConfirming(true);
    try {
      await apiPost(`/sales/orders/${orderId}/confirm`);
      showToast('Order confirmed — stock reserved.', 'success');
      fetchOrders();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setConfirming(false);
    }
  };

  const handleDispatchOrder = async (orderId) => {
    if (!window.confirm('Dispatch order? This will deduct stock permanently and add to customer outstanding balance.')) return;
    setDispatching(true);
    try {
      await apiPost(`/sales/orders/${orderId}/dispatch`);
      showToast('Order dispatched — stock deducted.', 'success');
      fetchOrders();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDispatching(false);
    }
  };

  const filteredOrders = filterStatus
    ? orders.filter(o => o.status === filterStatus)
    : orders;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '5rem' }}>
        <Loader2 size={36} color="#10b981" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={vs.container}>
      {/* Header */}
      <div style={vs.header}>
        <div>
          <h2 style={vs.title}>Sales Orders Registry</h2>
          <p style={vs.subtitle}>Create bulk orders, run credit & stock checks, and manage order lifecycle.</p>
        </div>
        {canCreate && (
          <button id="create-order-btn" onClick={() => setModal('create')} style={vs.addBtn}>
            <Plus size={16} /> Create Sales Order
          </button>
        )}
      </div>

      {/* KPI Strip */}
      <div style={vs.kpiRow}>
        {[
          { label: 'Total Orders', val: orders.length, color: '#f8fafc' },
          { label: 'Draft', val: orders.filter(o => o.status === 'DRAFT').length, color: '#f59e0b' },
          { label: 'Confirmed', val: orders.filter(o => o.status === 'CONFIRMED').length, color: '#3b82f6' },
          { label: 'Dispatched', val: orders.filter(o => o.status === 'DISPATCHED').length, color: '#10b981' },
        ].map(k => (
          <div key={k.label} className="card" style={vs.kpiCard}>
            <p style={vs.kpiVal(k.color)}>{k.val}</p>
            <p style={vs.kpiLabel}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={vs.filterBar}>
        <label style={{ ...fs.label, marginBottom: 0, whiteSpace: 'nowrap' }}>Filter by Status:</label>
        <select style={{ ...fs.select, maxWidth: '200px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All ({orders.length})</option>
          {Object.keys(STATUS_META).map(s => (
            <option key={s} value={s}>{s} ({orders.filter(o => o.status === s).length})</option>
          ))}
        </select>
      </div>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem', textAlign: 'center', gap: '1rem' }}>
          <ShoppingCart size={44} color="#334155" />
          <div>
            <p style={{ fontWeight: 700, color: '#f8fafc', marginBottom: '0.375rem' }}>No sales orders yet</p>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
              {canCreate ? 'Create your first sales order to get started.' : 'No orders have been created yet.'}
            </p>
          </div>
          {canCreate && (
            <button onClick={() => setModal('create')} style={{ ...fs.submitBtn, marginTop: '0.5rem' }}>
              <Plus size={14} /> Create Sales Order
            </button>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={vs.table}>
            <thead>
              <tr style={vs.theadRow}>
                <th style={vs.th}>Order #</th>
                <th style={vs.th}>Customer</th>
                <th style={vs.th}>Items</th>
                <th style={vs.th}>Order Date</th>
                <th style={vs.th}>Total</th>
                <th style={vs.th}>Status</th>
                <th style={{ ...vs.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id} style={vs.tr}>
                  <td style={{ ...vs.td, fontFamily: 'monospace', color: '#3b82f6', fontWeight: 700, fontSize: '0.8125rem' }}>
                    {order.orderNumber}
                  </td>
                  <td style={{ ...vs.td, fontWeight: 700 }}>{order.customer?.name}</td>
                  <td style={vs.td}>
                    <span className="badge badge-info">{order.items?.length ?? 0} line{(order.items?.length ?? 0) !== 1 ? 's' : ''}</span>
                  </td>
                  <td style={vs.td}>{new Date(order.orderDate).toLocaleDateString('en-IN')}</td>
                  <td style={{ ...vs.td, fontWeight: 700, color: '#10b981' }}>
                    ₹{Number(order.totalAmount).toLocaleString('en-IN')}
                  </td>
                  <td style={vs.td}><StatusBadge status={order.status} /></td>
                  <td style={{ ...vs.td, textAlign: 'right' }}>
                    <div style={vs.actions}>
                      <button
                        id={`view-order-${order.id}`}
                        onClick={() => setModal({ type: 'detail', order })}
                        style={vs.iconBtn}
                        title="View Details"
                      >
                        <PackageSearch size={14} />
                      </button>
                      {order.status === 'DRAFT' && canCreate && (
                        <button
                          id={`cancel-order-${order.id}`}
                          onClick={() => setModal({ type: 'cancel', order })}
                          style={vs.iconBtnDanger}
                          title="Cancel Order"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      {order.status === 'DRAFT' && canConfirm && (
                        <button
                          id={`confirm-order-${order.id}`}
                          onClick={() => handleConfirmOrder(order.id)}
                          style={vs.iconBtnSuccess}
                          title="Confirm Order"
                          disabled={confirming}
                        >
                          <CheckSquare size={14} />
                        </button>
                      )}
                      {order.status === 'CONFIRMED' && canDispatch && (
                        <button
                          id={`dispatch-order-${order.id}`}
                          onClick={() => handleDispatchOrder(order.id)}
                          style={{...vs.iconBtnSuccess, color: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.2)'}}
                          title="Dispatch Order"
                          disabled={dispatching}
                        >
                          <Truck size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {modal === 'create' && (
        <CreateOrderModal
          customers={customers}
          products={products}
          onClose={() => setModal(null)}
          onCreated={fetchOrders}
        />
      )}

      {modal?.type === 'detail' && (
        <OrderDetailModal order={modal.order} onClose={() => setModal(null)} />
      )}

      {modal?.type === 'cancel' && (
        <Modal title="Cancel Order" onClose={() => !cancelling && setModal(null)} maxWidth="420px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', textAlign: 'center' }}>
            <AlertTriangle size={36} color="#f59e0b" />
            <div>
              <p style={{ color: '#f8fafc', fontWeight: 600, marginBottom: '0.375rem' }}>Cancel this order?</p>
              <p style={{ color: '#f59e0b', fontWeight: 700 }}>{modal.order.orderNumber}</p>
              <p style={{ color: '#94a3b8', fontSize: '0.8125rem', marginTop: '0.375rem' }}>
                Only DRAFT orders can be cancelled. This cannot be undone.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
              <button onClick={() => setModal(null)} style={fs.cancelBtn}>Keep Order</button>
              <button onClick={handleCancelOrder} style={fs.deleteBtn} disabled={cancelling}>
                {cancelling ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <XCircle size={14} />}
                {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────

const vs = {
  container: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' },
  title: { fontSize: '1.375rem', fontWeight: 800, color: '#f8fafc' },
  subtitle: { fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem' },
  addBtn: {
    display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0,
    backgroundColor: '#059669', color: '#fff', border: 'none',
    borderRadius: '8px', padding: '0.625rem 1rem', fontSize: '0.8125rem',
    fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease',
  },
  kpiRow: { display: 'flex', gap: '1rem', flexWrap: 'wrap' },
  kpiCard: { flex: '1 1 120px', padding: '1rem 1.25rem', textAlign: 'center' },
  kpiVal: (color) => ({ fontSize: '1.75rem', fontWeight: 800, color, lineHeight: 1 }),
  kpiLabel: { fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '0.375rem' },
  filterBar: { display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' },
  theadRow: { backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b' },
  th: { padding: '0.875rem 1.25rem', fontWeight: 700, color: '#94a3b8', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #1e293b', transition: 'background 0.15s ease' },
  td: { padding: '0.875rem 1.25rem', color: '#cbd5e1' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' },
  iconBtn: {
    backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6',
    border: '1px solid rgba(59,130,246,0.2)', padding: '0.375rem', borderRadius: '6px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
  },
  iconBtnDanger: {
    backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444',
    border: '1px solid rgba(239,68,68,0.2)', padding: '0.375rem', borderRadius: '6px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
  },
  iconBtnSuccess: {
    backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981',
    border: '1px solid rgba(16,185,129,0.2)', padding: '0.375rem', borderRadius: '6px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
  },
};

const ms = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
  },
  modal: {
    backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px',
    width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
    maxHeight: '92vh', overflowY: 'auto', animation: 'fadeInUp 0.2s ease',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '1.25rem 1.5rem', borderBottom: '1px solid #334155',
    position: 'sticky', top: 0, backgroundColor: '#1e293b', zIndex: 1,
  },
  title: { fontWeight: 800, fontSize: '1rem', color: '#f8fafc' },
  closeBtn: {
    background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer',
    padding: '0.25rem', display: 'flex', alignItems: 'center', borderRadius: '4px',
  },
  body: { padding: '1.5rem' },
};

const fs = {
  label: { fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' },
  req: { color: '#ef4444' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  input: {
    backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px',
    padding: '0.625rem 0.875rem', color: '#f8fafc', fontSize: '0.875rem',
    outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
  },
  select: {
    backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px',
    padding: '0.625rem 0.875rem', color: '#f8fafc', fontSize: '0.875rem',
    outline: 'none', width: '100%', boxSizing: 'border-box', cursor: 'pointer',
  },
  addLineBtn: {
    display: 'flex', alignItems: 'center', gap: '0.375rem',
    background: 'rgba(16,185,129,0.1)', color: '#10b981',
    border: '1px solid rgba(16,185,129,0.2)', borderRadius: '6px',
    padding: '0.375rem 0.75rem', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
  },
  removeBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444',
    border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px',
    padding: '0.5rem', cursor: 'pointer', width: '36px', height: '36px',
  },
  checkBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
    backgroundColor: '#f59e0b', color: '#0f172a', border: 'none',
    borderRadius: '8px', padding: '0.75rem 1.5rem', fontSize: '0.875rem',
    fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', width: '100%',
  },
  submitBtn: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    backgroundColor: '#059669', color: '#fff', border: 'none',
    borderRadius: '8px', padding: '0.625rem 1.25rem', fontSize: '0.875rem',
    fontWeight: 700, cursor: 'pointer',
  },
  cancelBtn: {
    flex: 1, padding: '0.625rem', backgroundColor: 'rgba(30,41,59,0.8)',
    color: '#94a3b8', border: '1px solid #334155', borderRadius: '8px',
    fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem',
  },
  deleteBtn: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
    padding: '0.625rem', backgroundColor: 'rgba(239,68,68,0.15)',
    color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px',
    fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem',
  },
};

// Check result panel styles
const cr = {
  panel: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  sectionTitle: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    fontSize: '0.875rem', fontWeight: 800, color: '#f8fafc',
    borderBottom: '1px solid #334155', paddingBottom: '0.625rem',
  },
  gateBanner: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '0.875rem 1rem', borderRadius: '10px', border: '1px solid',
    fontSize: '0.9375rem',
  },
  card: {
    backgroundColor: '#0f172a', border: '1px solid #1e293b',
    borderRadius: '10px', padding: '1rem',
    display: 'flex', flexDirection: 'column', gap: '0.75rem',
  },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' },
  metaItem: { display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  metaLabel: { fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' },
  metaVal: { fontSize: '0.875rem', color: '#f8fafc', fontWeight: 600 },
  lineItem: {
    borderTop: '1px solid #1e293b', paddingTop: '0.75rem',
    display: 'flex', flexDirection: 'column', gap: '0.5rem',
  },
  lineHeader: { display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' },
  infoChip: {
    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
    backgroundColor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)',
    color: '#3b82f6', borderRadius: '6px', padding: '0.25rem 0.625rem',
    fontSize: '0.75rem', fontWeight: 500,
  },
  toggleBtn: {
    display: 'flex', alignItems: 'center', gap: '0.25rem',
    background: 'rgba(255,255,255,0.04)', border: '1px solid #334155',
    color: '#94a3b8', borderRadius: '6px', padding: '0.3rem 0.625rem',
    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
  },
  fefoTable: {
    backgroundColor: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.1)',
    borderRadius: '8px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
  },
  fefoTitle: { fontSize: '0.75rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' },
  fefoRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' },
  totalRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    borderTop: '2px solid #334155', paddingTop: '0.75rem', marginTop: '0.25rem',
  },
  createBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
    backgroundColor: '#059669', color: '#fff', border: 'none',
    borderRadius: '10px', padding: '0.875rem 1.5rem',
    fontWeight: 800, fontSize: '1rem', cursor: 'pointer',
    transition: 'all 0.2s', width: '100%',
    boxShadow: '0 4px 12px rgba(5,150,105,0.3)',
  },
};
