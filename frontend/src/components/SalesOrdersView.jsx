import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost, apiDelete } from '../utils/api';
import {
  Plus, X, Loader2, AlertTriangle, Check, ChevronDown, ChevronUp,
  ShoppingCart, Trash2, Zap, ShieldCheck, ShieldAlert, Package,
  PackageSearch, CheckCircle2, XCircle, Info, Minus, CheckSquare, Truck,
  ArrowLeft, CreditCard, TrendingUp, History, Clock, Layers, FileText,
  Receipt, Search, Eye, ExternalLink, Calendar, HelpCircle
} from 'lucide-react';

// ─────────────────────────────────────────────
// STATUS CONFIG & BADGES
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
// MODAL COMPONENT
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '6px' }}>
      {/* Overall Gate Banner */}
      <div style={{
        padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${result.canProceed ? 'var(--status-success)' : 'var(--status-danger)'}`,
        background: result.canProceed ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        {result.canProceed
          ? <><CheckCircle2 size={22} color="var(--status-success)" /> <span style={{ color: 'var(--status-success)', fontWeight: 700, fontSize: '13.5px' }}>Evaluation Passed — all business constraints (credit & stock) are verified.</span></>
          : <><XCircle size={22} color="var(--status-danger)" /> <span style={{ color: 'var(--status-danger)', fontWeight: 700, fontSize: '13.5px' }}>Evaluation Failed — order cannot proceed due to constraint violations.</span></>
        }
      </div>

      {/* Customer Credit Check Card */}
      <div style={{ padding: '14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {result.credit.passed
              ? <ShieldCheck size={18} color="var(--status-success)" />
              : <ShieldAlert size={18} color="var(--status-danger)" />
            }
            <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-primary)' }}>Customer Credit Evaluation</span>
          </div>
          <span className={`badge ${result.credit.passed ? 'badge-success' : 'badge-danger'}`}>
            {result.credit.passed ? 'APPROVED' : 'REJECTED'}
          </span>
        </div>

        {result.credit.error && (
          <div style={{ padding: '8px 12px', background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', borderRadius: 'var(--radius-sm)', color: 'var(--status-danger)', fontSize: '12px', fontWeight: 600, marginBottom: '10px' }}>
            ⚠️ {result.credit.error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '12px' }}>
          <div><span style={{ color: 'var(--text-tertiary)' }}>Credit Limit:</span> <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>₹{Number(result.credit.creditLimit || 0).toLocaleString('en-IN')}</strong></div>
          <div><span style={{ color: 'var(--text-tertiary)' }}>Outstanding:</span> <strong style={{ color: 'var(--status-warning)', fontFamily: 'var(--font-mono)' }}>₹{Number(result.credit.outstandingAmount || 0).toLocaleString('en-IN')}</strong></div>
          <div><span style={{ color: 'var(--text-tertiary)' }}>Available Credit:</span> <strong style={{ color: result.credit.passed ? 'var(--status-success)' : 'var(--status-danger)', fontFamily: 'var(--font-mono)' }}>₹{Number(result.credit.availableCredit || 0).toLocaleString('en-IN')}</strong></div>
          <div><span style={{ color: 'var(--text-tertiary)' }}>Order Value:</span> <strong style={{ color: 'var(--brand-400)', fontFamily: 'var(--font-mono)' }}>₹{Number(result.totalAmount).toLocaleString('en-IN')}</strong></div>
        </div>
      </div>

      {/* Stock & FEFO Allocations */}
      <div style={{ padding: '14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={18} color={result.stock.allSufficient ? 'var(--status-success)' : 'var(--status-danger)'} />
            <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-primary)' }}>Stock Availability & FEFO Allocations</span>
          </div>
          <span className={`badge ${result.stock.allSufficient ? 'badge-success' : 'badge-danger'}`}>
            {result.stock.allSufficient ? 'SUFFICIENT' : 'SHORTAGE'}
          </span>
        </div>

        {result.items.map((item, idx) => {
          const open = showFEFO[idx];
          return (
            <div key={item.productId || idx} style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>{item.productName}</span>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '11px', fontFamily: 'var(--font-mono)', marginLeft: '6px' }}>({item.productSku})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {item.quantity.toLocaleString()} × ₹{Number(item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })} = <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>₹{Number(item.subtotal).toLocaleString('en-IN')}</strong>
                  </span>
                  <span className={`badge ${item.fefo.canFulfill ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '10px' }}>
                    {item.fefo.canFulfill ? 'STOCK OK' : `SHORT ${item.fefo.shortage.toLocaleString()}`}
                  </span>
                  <button type="button" onClick={() => setShowFEFO(p => ({ ...p, [idx]: !p[idx] }))} className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: '11px' }}>
                    {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />} FEFO Plan
                  </button>
                </div>
              </div>

              {open && (
                <div style={{ background: 'var(--surface-1)', padding: '10px', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-500)', textTransform: 'uppercase' }}>FEFO Allocation Plan</span>
                  {item.fefo.allocations.length === 0 ? (
                    <span style={{ color: 'var(--status-danger)', fontSize: '12px' }}>No eligible unexpired batches available.</span>
                  ) : (
                    item.fefo.allocations.map(a => (
                      <div key={a.batchId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', padding: '3px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--status-info)', fontWeight: 600 }}>{a.batchNumber}</span>
                        <span style={{ color: 'var(--text-tertiary)' }}>Exp: {a.expiryDate ? new Date(a.expiryDate).toLocaleDateString('en-IN') : '—'}</span>
                        <span style={{ fontWeight: 700, color: 'var(--status-success)', fontFamily: 'var(--font-mono)' }}>Allocated: {(a.allocatedQuantity ?? a.quantity ?? 0).toLocaleString()} {item.productUnit}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Creation Action Button: STRICTLY GATED BY result.canProceed */}
      {result.canProceed ? (
        <button
          onClick={onConfirmCreate}
          disabled={creating}
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px', fontWeight: 800, background: 'var(--status-success)', color: '#fff', boxShadow: 'var(--shadow-md)' }}
        >
          {creating
            ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Creating Draft Order in Database...</>
            : <><Check size={16} /> Save as Draft Order (Constraints Verified)</>
          }
        </button>
      ) : (
        <div style={{ padding: '12px', background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--status-danger)', fontSize: '13px', fontWeight: 700 }}>
          🚫 Order Creation Blocked: You must resolve credit limit overruns or stock shortages before this order can be created.
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CREATE ORDER MODAL (WITH EVALUATION ENGINE)
// ─────────────────────────────────────────────
function CreateOrderModal({ customers, products, onClose, onCreated }) {
  const { showToast } = useToast();
  const [customerId, setCustomerId] = useState('');
  const [lines, setLines] = useState([{ productId: '', quantity: '', unitPrice: '' }]);
  const [checking, setChecking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === customerId) || null;
  }, [customerId, customers]);

  const setLine = (idx, field, val) => {
    setLines(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      if (field === 'productId' && val) {
        const prod = products.find(p => p.id === val);
        if (prod) next[idx].unitPrice = String(prod.defaultSellingPrice);
      }
      return next;
    });
    setCheckResult(null); // Reset evaluation check whenever order details change
  };

  const addLine = () => setLines(prev => [...prev, { productId: '', quantity: '', unitPrice: '' }]);
  const removeLine = (idx) => {
    if (lines.length === 1) return;
    setLines(prev => prev.filter((_, i) => i !== idx));
    setCheckResult(null);
  };

  const handleCheck = async (e) => {
    if (e) e.preventDefault();
    if (!customerId) { showToast('Please select a customer first.', 'warning'); return; }
    const validLines = lines.filter(l => l.productId && l.quantity);
    if (validLines.length === 0) { showToast('Add at least one product with quantity.', 'warning'); return; }

    setChecking(true);
    setCheckResult(null);
    try {
      const res = await apiPost('/sales/orders/check', {
        customerId,
        items: validLines.map(l => ({ productId: l.productId, quantity: parseFloat(l.quantity) })),
      });
      const resolvedItems = res.data.items || [];
      setLines(prev => prev.map(l => {
        if (!l.productId) return l;
        const resolved = resolvedItems.find(r => r.productId === l.productId);
        return resolved ? { ...l, unitPrice: String(resolved.unitPrice) } : l;
      }));
      setCheckResult(res.data);
      if (res.data.canProceed) {
        showToast('Evaluation passed! Credit and stock verified.', 'success');
      } else {
        showToast(
          res.data.credit?.passed === false
            ? `Credit check rejected: ${res.data.credit.error}`
            : 'Order check flagged stock shortage.',
          'warning'
        );
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setChecking(false);
    }
  };

  const handleCreate = async () => {
    if (!checkResult) {
      showToast('Run order check first to evaluate credit and stock constraints.', 'warning');
      return;
    }
    if (!checkResult.canProceed) {
      showToast(`Cannot create order: ${checkResult.credit?.error || 'Business constraints violated'}`, 'error');
      return;
    }

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

  const availableCredit = selectedCustomer?.credit ? (selectedCustomer.credit.availableCredit ?? (selectedCustomer.credit.creditLimit - selectedCustomer.credit.outstandingAmount)) : 0;
  const isOverCredit = selectedCustomer && orderTotal > availableCredit;

  return (
    <Modal title="New Sales Order — Evaluation & Business Constraints" onClose={onClose} maxWidth="860px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Customer Select */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label">Customer Account <span className="required">*</span></label>
            {selectedCustomer && (
              <span className={`badge ${isOverCredit ? 'badge-danger' : 'badge-info'}`} style={{ fontSize: '11px' }}>
                Available Credit: ₹{Number(availableCredit).toLocaleString('en-IN')}
                {isOverCredit && ' (Credit Exceeded!)'}
              </span>
            )}
          </div>
          <select
            id="modal-order-customer"
            className="form-select"
            value={customerId}
            onChange={e => { setCustomerId(e.target.value); setCheckResult(null); }}
            required
          >
            <option value="">— Select Customer Account —</option>
            {customers.filter(c => c.status === 'ACTIVE').map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type}) — Available Credit: ₹{Number(c.credit?.availableCredit ?? (c.credit?.creditLimit - c.credit?.outstandingAmount) ?? 0).toLocaleString('en-IN')}
              </option>
            ))}
          </select>
        </div>

        {/* Order Lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" style={{ margin: 0 }}>Order Lines & Quantities <span className="required">*</span></label>
            <button type="button" onClick={addLine} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={13} /> Add Line
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) minmax(100px, 1fr) minmax(110px, 1fr) 36px', gap: '8px' }}>
            <span className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Product</span>
            <span className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Quantity</span>
            <span className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Unit Price (₹)</span>
            <span></span>
          </div>

          {lines.map((line, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) minmax(100px, 1fr) minmax(110px, 1fr) 36px', gap: '8px', alignItems: 'center' }}>
              <select
                className="form-select"
                value={line.productId}
                onChange={e => setLine(idx, 'productId', e.target.value)}
              >
                <option value="">— Select Product —</option>
                {products.filter(p => p.status === 'ACTIVE').map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                ))}
              </select>
              <input
                className="form-input"
                type="number"
                min="0.01"
                step="any"
                placeholder="Qty"
                value={line.quantity}
                onChange={e => setLine(idx, 'quantity', e.target.value)}
                style={{ fontFamily: 'var(--font-mono)' }}
              />
              <input
                className="form-input"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={line.unitPrice}
                onChange={e => setLine(idx, 'unitPrice', e.target.value)}
                style={{ color: 'var(--status-success)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}
              />
              <button
                type="button"
                onClick={() => removeLine(idx)}
                className="btn btn-ghost btn-sm"
                disabled={lines.length === 1}
                style={{ color: 'var(--status-danger)', padding: '6px' }}
                title="Remove line"
              >
                <Minus size={14} />
              </button>
            </div>
          ))}

          {orderTotal > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', paddingTop: '6px' }}>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '12px', fontWeight: 600 }}>Estimated Total:</span>
              <span style={{ color: 'var(--brand-400)', fontWeight: 800, fontSize: '16px', fontFamily: 'var(--font-mono)' }}>
                ₹{orderTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        {/* Evaluation Engine Check Button */}
        <button
          onClick={handleCheck}
          disabled={checking || !customerId || lines.filter(l => l.productId && l.quantity).length === 0}
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px', fontWeight: 800, background: 'var(--brand-500)' }}
        >
          {checking
            ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Evaluating Business Constraints (Credit + Stock + Pricing)...</>
            : <><Zap size={16} /> Run Evaluation Engine Check</>
          }
        </button>

        {/* Evaluation Result Panel */}
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
// MAIN SALES ORDERS COMPONENT
// ─────────────────────────────────────────────
export default function SalesOrdersView() {
  const { showToast } = useToast();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('sales.create');
  const canConfirm = hasPermission('sales.confirm');
  const canDispatch = hasPermission('sales.dispatch');
  const canInvoice = hasPermission('invoices.create');

  // Master Data State
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [priceRules, setPriceRules] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // View Mode: 'list' | 'workspace' (Order Creation)
  const [viewMode, setViewMode] = useState('list');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Order Details Flyout/Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancelModalOrder, setCancelModalOrder] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Order Creation Workspace State ─────────────────────────────
  const [orderCustomerId, setOrderCustomerId] = useState('');
  const [orderLines, setOrderLines] = useState([
    { productId: '', quantity: '', unitPrice: '', focused: false }
  ]);
  const [activeProductIndex, setActiveProductIndex] = useState(0);
  const [contextTab, setContextTab] = useState('customer'); // 'customer' | 'inventory' | 'evaluation'
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [creating, setCreating] = useState(false);

  // ── Data Fetching ───────────────────────────────────────────────
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordRes, custRes, prodRes, batchRes, priceRes, invRes] = await Promise.all([
        apiGet('/sales/orders').catch(() => ({ data: [] })),
        apiGet('/customers').catch(() => ({ data: [] })),
        apiGet('/products').catch(() => ({ data: [] })),
        apiGet('/inventory/batches').catch(() => ({ data: [] })),
        apiGet('/pricing/rules').catch(() => ({ data: [] })),
        apiGet('/invoices').catch(() => ({ data: [] })),
      ]);
      setOrders(ordRes.data || []);
      setCustomers(custRes.data || []);
      setProducts(prodRes.data || []);
      setBatches(batchRes.data || []);
      setPriceRules(priceRes.data || []);
      setInvoices(invRes.data || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Handle URL hash params (e.g. #sales?customerId=... or #sales?action=new)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('?')) {
      const query = hash.split('?')[1];
      const params = new URLSearchParams(query);
      const cid = params.get('customerId');
      const action = params.get('action');
      if (cid) {
        setOrderCustomerId(cid);
        setViewMode('workspace');
      } else if (action === 'new') {
        setShowCreateModal(true);
      }
    }
  }, []);

  // ── Derived Contexts ────────────────────────────────────────────

  // Selected customer object in creation workspace
  const selectedCustomer = useMemo(() => {
    if (!orderCustomerId) return null;
    return customers.find(c => c.id === orderCustomerId) || null;
  }, [orderCustomerId, customers]);

  // Customer's previous orders
  const customerPastOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return orders.filter(o => o.customerId === selectedCustomer.id);
  }, [selectedCustomer, orders]);

  // Customer's invoices
  const customerInvoices = useMemo(() => {
    if (!selectedCustomer) return [];
    return invoices.filter(i => i.customerId === selectedCustomer.id);
  }, [selectedCustomer, invoices]);

  // Customer's outstanding invoices
  const customerOutstandingInvoices = useMemo(() => {
    return customerInvoices.filter(i => i.outstandingAmount > 0 && i.status !== 'PAID');
  }, [customerInvoices]);

  // Customer's past payments (aggregated from customer invoices)
  const customerPayments = useMemo(() => {
    if (!customerInvoices.length) return [];
    const list = [];
    customerInvoices.forEach(inv => {
      if (inv.payments && inv.payments.length) {
        inv.payments.forEach(p => {
          list.push({ ...p, invoiceNumber: inv.invoiceNumber });
        });
      }
    });
    return list.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)).slice(0, 5);
  }, [customerInvoices]);

  // Active product in line items (for inventory/batch context)
  const activeProduct = useMemo(() => {
    const line = orderLines[activeProductIndex];
    if (!line || !line.productId) return null;
    return products.find(p => p.id === line.productId) || null;
  }, [orderLines, activeProductIndex, products]);

  // Batches for the active product
  const activeProductBatches = useMemo(() => {
    if (!activeProduct) return [];
    return batches
      .filter(b => b.productId === activeProduct.id && b.status !== 'DEPLETED')
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
  }, [activeProduct, batches]);

  // Total available stock for active product across batches
  const activeProductTotalStock = useMemo(() => {
    return activeProductBatches.reduce((acc, b) => acc + (b.availableQuantity || 0), 0);
  }, [activeProductBatches]);

  // Bulk pricing rules for active product
  const activeProductPricingTiers = useMemo(() => {
    if (!activeProduct) return [];
    return priceRules
      .filter(r => r.productId === activeProduct.id && r.status === 'ACTIVE')
      .sort((a, b) => a.minQuantity - b.minQuantity);
  }, [activeProduct, priceRules]);

  // ── Order Lines Manipulation ─────────────────────────────────────
  const setLine = (idx, field, val) => {
    setOrderLines(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };

      // If product changed, update default unit price from pricing or product
      if (field === 'productId') {
        setActiveProductIndex(idx);
        const prod = products.find(p => p.id === val);
        if (prod && !next[idx].unitPrice) {
          next[idx].unitPrice = String(prod.defaultSellingPrice || '');
        }
      }

      // If quantity changed and product is set, auto-resolve tiered price if rule exists
      if (field === 'quantity' && next[idx].productId) {
        const qty = parseFloat(val);
        if (!isNaN(qty) && qty > 0) {
          const matchingRule = priceRules.find(r =>
            r.productId === next[idx].productId &&
            r.status === 'ACTIVE' &&
            qty >= r.minQuantity &&
            (r.maxQuantity === null || qty <= r.maxQuantity)
          );
          if (matchingRule) {
            next[idx].unitPrice = String(matchingRule.pricePerUnit);
          }
        }
      }

      return next;
    });
    setCheckResult(null); // Reset evaluation on changes
  };

  const addLine = () => {
    setOrderLines(prev => [...prev, { productId: '', quantity: '', unitPrice: '', focused: false }]);
    setActiveProductIndex(orderLines.length);
  };

  const removeLine = (idx) => {
    if (orderLines.length === 1) return;
    setOrderLines(prev => prev.filter((_, i) => i !== idx));
    setActiveProductIndex(Math.max(0, idx - 1));
    setCheckResult(null);
  };

  const orderEstimatedTotal = useMemo(() => {
    return orderLines.reduce((acc, l) => {
      const q = parseFloat(l.quantity) || 0;
      const p = parseFloat(l.unitPrice) || 0;
      return acc + (q * p);
    }, 0);
  }, [orderLines]);

  // ── Run Order Check ──────────────────────────────────────────────
  const handleCheckOrder = async (e) => {
    if (e) e.preventDefault();
    if (!orderCustomerId) {
      showToast('Please select a customer first.', 'warning');
      setContextTab('customer');
      return;
    }
    const validLines = orderLines.filter(l => l.productId && l.quantity);
    if (validLines.length === 0) {
      showToast('Add at least one product with quantity.', 'warning');
      return;
    }

    setChecking(true);
    setCheckResult(null);
    try {
      const res = await apiPost('/sales/orders/check', {
        customerId: orderCustomerId,
        items: validLines.map(l => ({
          productId: l.productId,
          quantity: parseFloat(l.quantity),
        })),
      });

      // Update unit prices back from resolved pricing
      const resolvedItems = res.data.items || [];
      setOrderLines(prev => prev.map(l => {
        if (!l.productId) return l;
        const resolved = resolvedItems.find(r => r.productId === l.productId);
        return resolved ? { ...l, unitPrice: String(resolved.unitPrice) } : l;
      }));

      setCheckResult(res.data);
      setContextTab('evaluation');
      showToast(
        res.data.canProceed
          ? 'Order check passed! Credit and stock verified.'
          : 'Order evaluation flagged issues — check the review panel.',
        res.data.canProceed ? 'success' : 'warning'
      );
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setChecking(false);
    }
  };

  // ── Create Order (Commit Draft) ──────────────────────────────────
  const handleCreateOrder = async () => {
    const validLines = orderLines.filter(l => l.productId && l.quantity && l.unitPrice);
    if (!orderCustomerId || validLines.length === 0) {
      showToast('Customer and at least one complete line item required.', 'warning');
      return;
    }

    // MANDATORY EVALUATION CHECK: If not yet evaluated, run evaluation first
    let currentCheck = checkResult;
    if (!currentCheck) {
      setChecking(true);
      try {
        const res = await apiPost('/sales/orders/check', {
          customerId: orderCustomerId,
          items: validLines.map(l => ({
            productId: l.productId,
            quantity: parseFloat(l.quantity),
          })),
        });
        currentCheck = res.data;
        setCheckResult(res.data);
      } catch (err) {
        showToast(err.message, 'error');
        setChecking(false);
        return;
      } finally {
        setChecking(false);
      }
    }

    // Business rule: If constraints fail, order cannot be created
    if (!currentCheck || !currentCheck.canProceed) {
      const errorMsg = currentCheck?.credit?.error || 'Business constraints violated: credit limit exceeded or stock shortage.';
      showToast(`Cannot create order: ${errorMsg}`, 'error');
      setContextTab('evaluation');
      return;
    }

    setCreating(true);
    try {
      await apiPost('/sales/orders', {
        customerId: orderCustomerId,
        items: validLines.map(l => ({
          productId: l.productId,
          quantity: parseFloat(l.quantity),
          unitPrice: parseFloat(l.unitPrice),
        })),
      });

      showToast('Sales order created as DRAFT successfully.', 'success');
      // Reset form and switch to list
      setOrderCustomerId('');
      setOrderLines([{ productId: '', quantity: '', unitPrice: '' }]);
      setCheckResult(null);
      setViewMode('list');
      fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  // ── Lifecycle Actions ────────────────────────────────────────────
  const handleConfirmOrder = async (orderId) => {
    if (!window.confirm('Confirm order? This will reserve batch inventory under FEFO rules.')) return;
    setConfirming(true);
    try {
      await apiPost(`/sales/orders/${orderId}/confirm`);
      showToast('Order confirmed — batch stock reserved.', 'success');
      fetchAllData();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: 'CONFIRMED' }));
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setConfirming(false);
    }
  };

  const handleDispatchOrder = async (orderId) => {
    if (!window.confirm('Dispatch order? This permanently deducts physical stock and updates customer outstanding credit.')) return;
    setDispatching(true);
    try {
      await apiPost(`/sales/orders/${orderId}/dispatch`);
      showToast('Order dispatched — inventory deducted and credit updated.', 'success');
      fetchAllData();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: 'DISPATCHED' }));
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDispatching(false);
    }
  };

  const handleGenerateInvoiceFromOrder = async (orderId) => {
    try {
      await apiPost('/invoices', { salesOrderId: orderId });
      showToast('Tax invoice generated successfully!', 'success');
      fetchAllData();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: 'INVOICED' }));
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelModalOrder) return;
    setCancelling(true);
    try {
      await apiDelete(`/sales/orders/${cancelModalOrder.id}`);
      showToast(`Order ${cancelModalOrder.orderNumber} cancelled.`, 'success');
      setCancelModalOrder(null);
      if (selectedOrder && selectedOrder.id === cancelModalOrder.id) {
        setSelectedOrder(null);
      }
      fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCancelling(false);
    }
  };

  // ── Filtered Orders ──────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchStatus = !filterStatus || o.status === filterStatus;
      const matchSearch = !searchQuery ||
        o.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [orders, filterStatus, searchQuery]);

  // Loading State
  if (loading && orders.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '5rem' }}>
        <Loader2 size={36} color="var(--brand-500)" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // RENDER VIEW MODE: ORDER CREATION WORKSPACE
  // ─────────────────────────────────────────────────────────────────
  if (viewMode === 'workspace') {
    const custCredit = selectedCustomer?.credit;
    const creditLimit = custCredit?.creditLimit || 0;
    const outstanding = custCredit?.outstandingAmount || 0;
    const available = custCredit ? (custCredit.availableCredit ?? (creditLimit - outstanding)) : 0;
    const utilPct = creditLimit > 0 ? (outstanding / creditLimit) * 100 : 0;
    const utilColor = utilPct >= 100 ? 'var(--status-danger)' : utilPct >= 80 ? 'var(--status-warning)' : 'var(--status-success)';

    return (
      <div className="workspace-container">
        {/* Workspace Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => {
                if (orderLines.some(l => l.productId) && !window.confirm('Leave Order Workspace? Unsaved order draft will be lost.')) return;
                setViewMode('list');
              }}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowLeft size={15} /> Back to Orders
            </button>
            <div>
              <h2 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                Sales Order Creation Workspace
              </h2>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                Contextual order builder with live customer credit health, batch stock, and FEFO evaluation.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleCheckOrder}
              disabled={checking || !orderCustomerId || orderLines.filter(l => l.productId && l.quantity).length === 0}
              className="btn btn-secondary"
              style={{ borderColor: 'rgba(245, 158, 11, 0.4)', color: 'var(--text-primary)' }}
            >
              {checking ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={15} color="#f59e0b" />}
              Evaluate Order
            </button>
            <button
              onClick={handleCreateOrder}
              disabled={creating || !orderCustomerId || orderLines.filter(l => l.productId && l.quantity).length === 0 || !checkResult || !checkResult.canProceed}
              className="btn btn-primary"
              style={{
                opacity: (!checkResult || !checkResult.canProceed) ? 0.6 : 1,
                cursor: (!checkResult || !checkResult.canProceed) ? 'not-allowed' : 'pointer'
              }}
              title={!checkResult ? 'Run order evaluation first' : !checkResult.canProceed ? 'Order cannot be created: constraints failed' : 'Confirm and save order draft'}
            >
              {creating ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={15} />}
              {!checkResult ? 'Evaluate Order First' : !checkResult.canProceed ? 'Creation Blocked' : 'Confirm & Save Draft'}
            </button>
          </div>
        </div>

        {/* Two-Column Contextual Layout */}
        <div className="workspace-split">
          {/* LEFT: Primary Order Form */}
          <div className="workspace-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 1. Customer Selector */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ fontSize: '13px' }}>
                  Customer Account <span className="required">*</span>
                </label>
                {selectedCustomer && (
                  <span className="badge badge-info" style={{ fontSize: '11px' }}>
                    {selectedCustomer.type} • {selectedCustomer.credit?.paymentTermsDays || 30} Days Terms
                  </span>
                )}
              </div>
              <select
                id="order-workspace-customer"
                className="form-select"
                value={orderCustomerId}
                onChange={e => {
                  setOrderCustomerId(e.target.value);
                  setCheckResult(null);
                  setContextTab('customer');
                }}
                style={{ fontSize: '14px', fontWeight: 600, padding: '10px 12px' }}
              >
                <option value="">— Select Target Customer Account —</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type}) — Avail: ₹{Number(c.credit?.availableCredit ?? (c.credit?.creditLimit - c.credit?.outstandingAmount) ?? 0).toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Order Line Items Builder */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ fontSize: '13px', margin: 0 }}>
                  Order Lines & Pricing <span className="required">*</span>
                </label>
                <button
                  type="button"
                  onClick={addLine}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={13} /> Add Product Line
                </button>
              </div>

              {/* Grid Header */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 2fr) minmax(100px, 1fr) minmax(110px, 1fr) 100px 36px', gap: '8px', padding: '0 4px' }}>
                <span className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Product</span>
                <span className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Quantity</span>
                <span className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Unit Price (₹)</span>
                <span className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>Subtotal</span>
                <span></span>
              </div>

              {/* Line rows */}
              {orderLines.map((line, idx) => {
                const lineQty = parseFloat(line.quantity) || 0;
                const linePrice = parseFloat(line.unitPrice) || 0;
                const lineSubtotal = lineQty * linePrice;
                const isSelectedRow = activeProductIndex === idx;

                return (
                  <div
                    key={idx}
                    onClick={() => setActiveProductIndex(idx)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(180px, 2fr) minmax(100px, 1fr) minmax(110px, 1fr) 100px 36px',
                      gap: '8px',
                      alignItems: 'center',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelectedRow ? 'var(--surface-2)' : 'var(--surface-1)',
                      border: `1px solid ${isSelectedRow ? 'var(--brand-500)' : 'var(--border-subtle)'}`,
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    {/* Product select */}
                    <select
                      className="form-select"
                      value={line.productId}
                      onFocus={() => { setActiveProductIndex(idx); setContextTab('inventory'); }}
                      onChange={e => setLine(idx, 'productId', e.target.value)}
                      style={{ fontSize: '13px' }}
                    >
                      <option value="">— Select Product —</option>
                      {products.filter(p => p.status === 'ACTIVE').map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.unit})
                        </option>
                      ))}
                    </select>

                    {/* Quantity */}
                    <input
                      className="form-input"
                      type="number"
                      min="0.01"
                      step="any"
                      placeholder="Qty"
                      value={line.quantity}
                      onFocus={() => { setActiveProductIndex(idx); setContextTab('inventory'); }}
                      onChange={e => setLine(idx, 'quantity', e.target.value)}
                      style={{ fontSize: '13px', fontFamily: 'var(--font-mono)' }}
                    />

                    {/* Unit price */}
                    <input
                      className="form-input"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={line.unitPrice}
                      onFocus={() => setActiveProductIndex(idx)}
                      onChange={e => setLine(idx, 'unitPrice', e.target.value)}
                      style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--status-success)', fontWeight: 600 }}
                    />

                    {/* Line subtotal */}
                    <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      ₹{lineSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>

                    {/* Remove Line button */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeLine(idx); }}
                      disabled={orderLines.length === 1}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '6px', color: 'var(--status-danger)', opacity: orderLines.length === 1 ? 0.3 : 1 }}
                      title="Remove Line"
                    >
                      <Minus size={14} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Order Financial Summary Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              background: 'var(--surface-2)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              marginTop: '4px'
            }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                  Total Order Quantity
                </span>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {orderLines.reduce((acc, l) => acc + (parseFloat(l.quantity) || 0), 0).toLocaleString()} units
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                  Order Total Amount
                </span>
                <p style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--brand-400)', fontFamily: 'var(--font-mono)' }}>
                  ₹{orderEstimatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Gate Result Banner if already evaluated */}
            {checkResult && (
              <div style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${checkResult.canProceed ? 'var(--status-success)' : 'var(--status-danger)'}`,
                background: checkResult.canProceed ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {checkResult.canProceed
                    ? <CheckCircle2 size={22} color="var(--status-success)" />
                    : <XCircle size={22} color="var(--status-danger)" />
                  }
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: checkResult.canProceed ? 'var(--status-success)' : 'var(--status-danger)' }}>
                      {checkResult.canProceed ? 'Evaluation Passed — Order is eligible for creation' : 'Evaluation Failed — Review constraints in right panel'}
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {checkResult.credit?.passed ? '✓ Credit approved' : `✗ Credit rejected: ${checkResult.credit?.error || 'Exceeds limit'}`} • {checkResult.stock?.allSufficient ? '✓ Stock available' : '✗ Stock shortage detected'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setContextTab('evaluation')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11.5px' }}
                >
                  View Allocation Breakdown
                </button>
              </div>
            )}
          </div>

          {/* RIGHT: Dynamic Contextual Intelligence Drawer */}
          <div className="workspace-sticky-aside">
            <div className="workspace-panel" style={{ padding: '16px' }}>
              {/* Context Panel Tabs */}
              <div className="context-nav-tabs">
                <button
                  type="button"
                  className={`context-nav-tab ${contextTab === 'customer' ? 'active' : ''}`}
                  onClick={() => setContextTab('customer')}
                >
                  <CreditCard size={14} /> Customer Context
                </button>
                <button
                  type="button"
                  className={`context-nav-tab ${contextTab === 'inventory' ? 'active' : ''}`}
                  onClick={() => setContextTab('inventory')}
                >
                  <Package size={14} /> Batch Inventory
                </button>
                <button
                  type="button"
                  className={`context-nav-tab ${contextTab === 'evaluation' ? 'active' : ''}`}
                  onClick={() => setContextTab('evaluation')}
                >
                  <Zap size={14} /> Evaluation Gate
                </button>
              </div>

              {/* ────────────────────────────────────────────────────────
                  TAB 1: CUSTOMER CONTEXT & CREDIT
                  ──────────────────────────────────────────────────────── */}
              {contextTab === 'customer' && (
                <div>
                  {!selectedCustomer ? (
                    <div className="context-empty">
                      <CreditCard size={32} color="var(--text-tertiary)" />
                      <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-secondary)' }}>No Customer Selected</p>
                      <p style={{ margin: 0, fontSize: '11.5px' }}>
                        Select a customer from the dropdown to inspect real-time credit limit, outstanding ledger, and past orders.
                      </p>
                    </div>
                  ) : (
                    <div>
                      {/* Customer Header */}
                      <div className="context-header">
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>
                              {selectedCustomer.name}
                            </span>
                            <span className="badge badge-info">{selectedCustomer.type}</span>
                          </div>
                          <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: 'var(--text-tertiary)' }}>
                            {selectedCustomer.phone || selectedCustomer.email || 'No direct phone registered'}
                          </p>
                        </div>
                        <a
                          href={`#customers?id=${selectedCustomer.id}`}
                          className="btn btn-ghost btn-sm"
                          title="Open Customer in 360 Workspace"
                          style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          Customer 360 <ExternalLink size={12} />
                        </a>
                      </div>

                      {/* Credit Utilization Stat Strip */}
                      <div className="context-kpi-grid">
                        <div className="context-kpi-cell">
                          <span className="context-kpi-label">Credit Limit</span>
                          <span className="context-kpi-val">₹{creditLimit.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="context-kpi-cell">
                          <span className="context-kpi-label">Outstanding Balance</span>
                          <span className="context-kpi-val" style={{ color: 'var(--status-warning)' }}>
                            ₹{outstanding.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="context-kpi-cell">
                          <span className="context-kpi-label">Available Credit</span>
                          <span className="context-kpi-val" style={{ color: available >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>
                            ₹{available.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="context-kpi-cell">
                          <span className="context-kpi-label">Payment Terms</span>
                          <span className="context-kpi-val" style={{ fontSize: '13px' }}>
                            {custCredit?.paymentTermsDays || 30} Days Net
                          </span>
                        </div>
                      </div>

                      {/* Credit Utilization Bar */}
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 600 }}>
                          <span style={{ color: 'var(--text-tertiary)' }}>Credit Exposure Utilization</span>
                          <span style={{ color: utilColor, fontFamily: 'var(--font-mono)' }}>{utilPct.toFixed(1)}%</span>
                        </div>
                        <div className="context-utilization-meter">
                          <div className="context-utilization-fill" style={{ width: `${Math.min(utilPct, 100)}%`, backgroundColor: utilColor }} />
                        </div>
                      </div>

                      {/* Outstanding Invoices Section */}
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Unpaid Invoices ({customerOutstandingInvoices.length})
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Due dates & status</span>
                        </div>

                        {customerOutstandingInvoices.length === 0 ? (
                          <div style={{ padding: '10px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--status-success)', textAlign: 'center' }}>
                            ✓ No outstanding overdue invoices. All prior accounts settled.
                          </div>
                        ) : (
                          <div className="context-table-wrap">
                            <table className="context-table">
                              <thead>
                                <tr>
                                  <th>Invoice #</th>
                                  <th>Due Date</th>
                                  <th style={{ textAlign: 'right' }}>Outstanding</th>
                                </tr>
                              </thead>
                              <tbody>
                                {customerOutstandingInvoices.map(inv => (
                                  <tr key={inv.id}>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--status-info)' }}>{inv.invoiceNumber}</td>
                                    <td>{new Date(inv.dueDate).toLocaleDateString('en-IN')}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--status-danger)' }}>
                                      ₹{inv.outstandingAmount.toLocaleString('en-IN')}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Previous Customer Orders */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Recent Orders ({customerPastOrders.length})
                          </span>
                        </div>

                        {customerPastOrders.length === 0 ? (
                          <div style={{ padding: '10px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                            First order for this distributor.
                          </div>
                        ) : (
                          <div className="context-table-wrap">
                            <table className="context-table">
                              <thead>
                                <tr>
                                  <th>Order #</th>
                                  <th>Date</th>
                                  <th>Status</th>
                                  <th style={{ textAlign: 'right' }}>Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {customerPastOrders.slice(0, 4).map(po => (
                                  <tr key={po.id}>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--status-info)' }}>{po.orderNumber}</td>
                                    <td>{new Date(po.orderDate).toLocaleDateString('en-IN')}</td>
                                    <td><StatusBadge status={po.status} /></td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                                      ₹{Number(po.totalAmount).toLocaleString('en-IN')}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ────────────────────────────────────────────────────────
                  TAB 2: PRODUCT & BATCH INVENTORY CONTEXT
                  ──────────────────────────────────────────────────────── */}
              {contextTab === 'inventory' && (
                <div>
                  {!activeProduct ? (
                    <div className="context-empty">
                      <Package size={32} color="var(--text-tertiary)" />
                      <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-secondary)' }}>No Product Row Selected</p>
                      <p style={{ margin: 0, fontSize: '11.5px' }}>
                        Click on or select any product row in your order lines to view its real-time batch stock, expiration dates, and volume pricing tiers.
                      </p>
                    </div>
                  ) : (
                    <div>
                      {/* Product Header */}
                      <div className="context-header">
                        <div>
                          <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>
                            {activeProduct.name}
                          </span>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--brand-400)' }}>
                              {activeProduct.sku}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>• Unit: {activeProduct.unit}</span>
                          </div>
                        </div>
                        <span className="badge badge-success">
                          {activeProductTotalStock.toLocaleString()} {activeProduct.unit} In Stock
                        </span>
                      </div>

                      {/* Batches Table (FEFO Order) */}
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Available Batches (FEFO Sequence)
                          </span>
                          <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>Earliest expiry first</span>
                        </div>

                        {activeProductBatches.length === 0 ? (
                          <div style={{ padding: '10px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--status-danger)', textAlign: 'center' }}>
                            ⚠ No active batches in warehouse for this product!
                          </div>
                        ) : (
                          <div className="context-table-wrap">
                            <table className="context-table">
                              <thead>
                                <tr>
                                  <th>Batch #</th>
                                  <th>Expiry</th>
                                  <th>Days Left</th>
                                  <th style={{ textAlign: 'right' }}>Avail Qty</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeProductBatches.map(b => {
                                  const exp = new Date(b.expiryDate);
                                  const now = new Date();
                                  const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
                                  const isExpired = diffDays <= 0;
                                  const isSoon = diffDays > 0 && diffDays <= 30;

                                  return (
                                    <tr key={b.id}>
                                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>{b.batchNumber}</td>
                                      <td>{exp.toLocaleDateString('en-IN')}</td>
                                      <td>
                                        <span className={`badge ${isExpired ? 'badge-danger' : isSoon ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '10px' }}>
                                          {isExpired ? 'EXPIRED' : `${diffDays}d`}
                                        </span>
                                      </td>
                                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--brand-400)' }}>
                                        {Number(b.availableQuantity).toLocaleString()}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Bulk Pricing Tier Matrix */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Bulk Pricing Rules Matrix
                          </span>
                          <span style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>Auto-resolves by order qty</span>
                        </div>

                        {activeProductPricingTiers.length === 0 ? (
                          <div style={{ padding: '10px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Standard base price applies: <strong style={{ color: 'var(--text-primary)' }}>₹{activeProduct.defaultSellingPrice} / {activeProduct.unit}</strong> (no volume tier rules defined).
                          </div>
                        ) : (
                          <div className="context-table-wrap">
                            <table className="context-table">
                              <thead>
                                <tr>
                                  <th>Quantity Range</th>
                                  <th style={{ textAlign: 'right' }}>Price / {activeProduct.unit}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeProductPricingTiers.map(rule => {
                                  const currentLineQty = parseFloat(orderLines[activeProductIndex]?.quantity) || 0;
                                  const isMatched = currentLineQty >= rule.minQuantity && (rule.maxQuantity === null || currentLineQty <= rule.maxQuantity);

                                  return (
                                    <tr key={rule.id} style={{ background: isMatched ? 'var(--status-info-bg)' : undefined }}>
                                      <td>
                                        <span style={{ fontWeight: isMatched ? 800 : 500, color: isMatched ? 'var(--status-info)' : 'var(--text-secondary)' }}>
                                          {rule.minQuantity.toLocaleString()} — {rule.maxQuantity ? `${rule.maxQuantity.toLocaleString()} ${activeProduct.unit}` : 'and above'}
                                        </span>
                                        {isMatched && (
                                          <span className="badge badge-info" style={{ marginLeft: '6px', fontSize: '9.5px' }}>
                                            Active Tier
                                          </span>
                                        )}
                                      </td>
                                      <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', color: isMatched ? 'var(--status-info)' : 'var(--text-primary)' }}>
                                        ₹{Number(rule.pricePerUnit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ────────────────────────────────────────────────────────
                  TAB 3: EVALUATION GATE & FEFO PREVIEW
                  ──────────────────────────────────────────────────────── */}
              {contextTab === 'evaluation' && (
                <div>
                  {!checkResult ? (
                    <div className="context-empty">
                      <Zap size={32} color="#f59e0b" />
                      <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-secondary)' }}>Evaluation Not Yet Executed</p>
                      <p style={{ margin: 0, fontSize: '11.5px' }}>
                        Click <strong>"Evaluate Order"</strong> in the top toolbar to run automated credit checks and FEFO batch allocations.
                      </p>
                      <button
                        type="button"
                        onClick={handleCheckOrder}
                        disabled={checking || !orderCustomerId}
                        className="btn btn-primary btn-sm"
                        style={{ marginTop: '8px' }}
                      >
                        {checking ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={13} />}
                        Run Evaluation Now
                      </button>
                    </div>
                  ) : (
                    <div>
                      {/* Overall Banner */}
                      <div style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${checkResult.canProceed ? 'var(--status-success)' : 'var(--status-danger)'}`,
                        background: checkResult.canProceed ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '14px'
                      }}>
                        {checkResult.canProceed
                          ? <CheckCircle2 size={20} color="var(--status-success)" />
                          : <XCircle size={20} color="var(--status-danger)" />
                        }
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: checkResult.canProceed ? 'var(--status-success)' : 'var(--status-danger)' }}>
                            {checkResult.canProceed ? 'All Evaluation Gates Cleared' : 'Evaluation Gates Triggered'}
                          </span>
                          <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                            Total evaluated amount: ₹{Number(checkResult.totalAmount || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>

                      {/* Credit Gate Details */}
                      <div style={{ marginBottom: '14px', padding: '12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CreditCard size={14} /> Credit Check
                          </span>
                          <span className={`badge ${checkResult.credit?.passed ? 'badge-success' : 'badge-danger'}`}>
                            {checkResult.credit?.passed ? 'APPROVED' : 'REJECTED'}
                          </span>
                        </div>
                        {checkResult.credit?.error && (
                          <p style={{ margin: '0 0 8px', fontSize: '11.5px', color: 'var(--status-danger)' }}>
                            {checkResult.credit.error}
                          </p>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '11.5px' }}>
                          <div><span style={{ color: 'var(--text-tertiary)' }}>Credit Limit:</span> ₹{Number(checkResult.credit?.creditLimit || 0).toLocaleString('en-IN')}</div>
                          <div><span style={{ color: 'var(--text-tertiary)' }}>Outstanding:</span> ₹{Number(checkResult.credit?.outstandingAmount || 0).toLocaleString('en-IN')}</div>
                          <div><span style={{ color: 'var(--text-tertiary)' }}>Available:</span> ₹{Number(checkResult.credit?.availableCredit || 0).toLocaleString('en-IN')}</div>
                          <div><span style={{ color: 'var(--text-tertiary)' }}>Order Value:</span> ₹{Number(checkResult.totalAmount || 0).toLocaleString('en-IN')}</div>
                        </div>
                      </div>

                      {/* Stock & FEFO Allocations */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Package size={14} /> FEFO Allocations by Item
                          </span>
                          <span className={`badge ${checkResult.stock?.allSufficient ? 'badge-success' : 'badge-danger'}`}>
                            {checkResult.stock?.allSufficient ? 'SUFFICIENT' : 'SHORTAGE'}
                          </span>
                        </div>

                        {(checkResult.items || []).map((item, iIdx) => (
                          <div key={item.productId || iIdx} style={{ marginBottom: '10px', padding: '10px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.productName}</span>
                              <span className={`badge ${item.fefo?.canFulfill ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '10px' }}>
                                {item.fefo?.canFulfill ? 'FULFILLED' : `SHORT ${item.fefo?.shortage ?? 0}`}
                              </span>
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                              Requested: {item.quantity} • Unit Price: ₹{item.unitPrice} • Subtotal: ₹{Number(item.subtotal || 0).toLocaleString('en-IN')}
                            </div>

                            {/* Batch list */}
                            {item.fefo?.allocations && item.fefo.allocations.length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {item.fefo.allocations.map(alloc => (
                                  <div key={alloc.batchId || alloc.batchNumber} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', background: 'var(--surface-1)', borderRadius: '4px', fontSize: '11px' }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--status-info)' }}>{alloc.batchNumber}</span>
                                    <span style={{ color: 'var(--text-tertiary)' }}>Exp: {alloc.expiryDate ? new Date(alloc.expiryDate).toLocaleDateString('en-IN') : '—'}</span>
                                    <span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{(alloc.allocatedQuantity ?? alloc.quantity ?? 0).toLocaleString()} {item.productUnit || 'units'}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // RENDER VIEW MODE: ORDERS REGISTRY LIST
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="workspace-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Sales Orders Registry & Fulfillment
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Manage commercial orders, reserve stock via FEFO, execute warehouse dispatches, and trigger tax invoicing.
          </p>
        </div>
        {canCreate && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              id="create-order-btn"
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> New Sales Order
            </button>
            <button
              onClick={() => setViewMode('workspace')}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Layers size={14} /> Order Workspace
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        {[
          { label: 'Total Orders', val: orders.length, color: 'var(--text-primary)' },
          { label: 'Draft Orders', val: orders.filter(o => o.status === 'DRAFT').length, color: 'var(--status-warning)' },
          { label: 'Confirmed (Reserved)', val: orders.filter(o => o.status === 'CONFIRMED').length, color: 'var(--status-info)' },
          { label: 'Dispatched', val: orders.filter(o => o.status === 'DISPATCHED').length, color: 'var(--status-success)' },
          { label: 'Invoiced / Paid', val: orders.filter(o => ['INVOICED', 'PAID'].includes(o.status)).length, color: 'var(--status-purple)' },
        ].map(k => (
          <div key={k.label} className="card" style={{ padding: '16px', background: 'var(--surface-1)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {k.label}
            </span>
            <p style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 800, color: k.color, fontFamily: 'var(--font-mono)' }}>
              {k.val}
            </p>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={15} color="var(--text-tertiary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            className="form-input"
            type="text"
            placeholder="Search by Order # or Customer..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '34px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase' }}>
            Status:
          </label>
          <select
            className="form-select"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ minWidth: '160px' }}
          >
            <option value="">All Statuses ({orders.length})</option>
            {Object.keys(STATUS_META).map(s => (
              <option key={s} value={s}>{s} ({orders.filter(o => o.status === s).length})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <ShoppingCart size={44} color="var(--text-tertiary)" />
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            No Sales Orders Found
          </h4>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            {canCreate ? 'Launch the order workspace to draft and evaluate customer orders.' : 'No orders in current filter.'}
          </p>
          {canCreate && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button onClick={() => setShowCreateModal(true)} className="btn btn-primary btn-sm">
                <Plus size={14} /> New Sales Order
              </button>
              <button onClick={() => setViewMode('workspace')} className="btn btn-secondary btn-sm">
                <Layers size={14} /> Open Workspace
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Order #</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Customer</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Items</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Order Date</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Total Amount</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr
                  key={order.id}
                  style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background-color 0.15s ease', cursor: 'pointer' }}
                  onClick={() => setSelectedOrder(order)}
                >
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--status-info)' }}>
                    {order.orderNumber}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {order.customer?.name}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className="badge badge-info">{order.items?.length ?? 0} line{(order.items?.length ?? 0) !== 1 ? 's' : ''}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {new Date(order.orderDate).toLocaleDateString('en-IN')}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--brand-400)' }}>
                    ₹{Number(order.totalAmount).toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <StatusBadge status={order.status} />
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="btn btn-secondary btn-icon"
                        title="View Order Details & Allocations"
                      >
                        <PackageSearch size={14} />
                      </button>

                      {order.status === 'DRAFT' && canConfirm && (
                        <button
                          onClick={() => handleConfirmOrder(order.id)}
                          className="btn btn-primary btn-icon"
                          title="Confirm Order & Reserve Stock"
                          disabled={confirming}
                        >
                          <CheckSquare size={14} />
                        </button>
                      )}

                      {order.status === 'CONFIRMED' && canDispatch && (
                        <button
                          onClick={() => handleDispatchOrder(order.id)}
                          className="btn btn-secondary btn-icon"
                          style={{ color: 'var(--status-warning)', borderColor: 'rgba(245, 158, 11, 0.3)' }}
                          title="Dispatch Order"
                          disabled={dispatching}
                        >
                          <Truck size={14} />
                        </button>
                      )}

                      {order.status === 'DISPATCHED' && canInvoice && (
                        <button
                          onClick={() => handleGenerateInvoiceFromOrder(order.id)}
                          className="btn btn-secondary btn-icon"
                          style={{ color: 'var(--brand-400)', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                          title="Generate Tax Invoice"
                        >
                          <Receipt size={14} />
                        </button>
                      )}

                      {order.status === 'DRAFT' && canCreate && (
                        <button
                          onClick={() => setCancelModalOrder(order)}
                          className="btn btn-danger btn-icon"
                          title="Cancel Order"
                        >
                          <Trash2 size={14} />
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

      {/* ─────────────────────────────────────────────────────────────
          ORDER 360 FLYOUT DRAWER (Contextual Order Inspection)
          ───────────────────────────────────────────────────────────── */}
      {selectedOrder && (
        <div className="context-flyout-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="context-flyout-panel" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="context-flyout-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Order {selectedOrder.orderNumber}
                  </h3>
                  <StatusBadge status={selectedOrder.status} />
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                  Placed on {new Date(selectedOrder.orderDate).toLocaleDateString('en-IN')} by {selectedOrder.user?.name || 'Sales Desk'}
                </p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="btn btn-ghost btn-icon">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="context-flyout-body">
              {/* Customer Banner */}
              <div style={{ padding: '14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700 }}>Customer</span>
                  <h4 style={{ margin: '2px 0 0', fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {selectedOrder.customer?.name}
                  </h4>
                  <span className="badge badge-info" style={{ marginTop: '4px' }}>
                    {selectedOrder.customer?.type} • {selectedOrder.paymentTermsDays || 30} Days Terms
                  </span>
                </div>
                <a
                  href={`#customers?id=${selectedOrder.customerId}`}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  Customer 360 <ExternalLink size={12} />
                </a>
              </div>

              {/* Order Total Highlight */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'var(--surface-1)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700 }}>Total Order Value</span>
                  <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--brand-400)', fontFamily: 'var(--font-mono)' }}>
                    ₹{Number(selectedOrder.totalAmount).toLocaleString('en-IN')}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700 }}>Items Count</span>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedOrder.items?.length || 0} Line Items
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div>
                <span style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.04em' }}>
                  Ordered Products & Prices
                </span>
                <div className="context-table-wrap" style={{ marginTop: '6px' }}>
                  <table className="context-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th style={{ textAlign: 'right' }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items?.map(it => (
                        <tr key={it.id}>
                          <td>
                            <strong style={{ color: 'var(--text-primary)' }}>{it.product?.name}</strong>
                            <div style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: 'var(--status-info)' }}>{it.product?.sku}</div>
                          </td>
                          <td>{Number(it.quantity).toLocaleString()} {it.product?.unit}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>₹{Number(it.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                            ₹{Number(it.subtotal).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Allocated Batches (if confirmed or dispatched) */}
              {['CONFIRMED', 'DISPATCHED', 'INVOICED', 'PAID'].includes(selectedOrder.status) && (
                <div>
                  <span style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.04em' }}>
                    FEFO Allocated Warehouse Batches
                  </span>
                  <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedOrder.items?.map(it => {
                      if (!it.allocations || it.allocations.length === 0) return null;
                      return (
                        <div key={it.id} style={{ padding: '10px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{it.product?.name}</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                            {it.allocations.map(al => (
                              <div key={al.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: 'var(--surface-1)', borderRadius: '4px', fontSize: '11.5px' }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--status-info)' }}>{al.batch?.batchNumber}</span>
                                <span style={{ color: 'var(--text-tertiary)' }}>Exp: {new Date(al.batch?.expiryDate).toLocaleDateString('en-IN')}</span>
                                <span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{al.quantity.toLocaleString()} {it.product?.unit}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer with Direct Lifecycle Actions */}
            <div className="context-flyout-footer">
              {selectedOrder.status === 'DRAFT' && canConfirm && (
                <button
                  onClick={() => handleConfirmOrder(selectedOrder.id)}
                  disabled={confirming}
                  className="btn btn-primary"
                >
                  {confirming ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckSquare size={15} />}
                  Confirm Order & Reserve Stock
                </button>
              )}

              {selectedOrder.status === 'CONFIRMED' && canDispatch && (
                <button
                  onClick={() => handleDispatchOrder(selectedOrder.id)}
                  disabled={dispatching}
                  className="btn btn-secondary"
                  style={{ color: 'var(--status-warning)', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                >
                  {dispatching ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Truck size={15} />}
                  Dispatch Warehouse Shipment
                </button>
              )}

              {selectedOrder.status === 'DISPATCHED' && canInvoice && (
                <button
                  onClick={() => handleGenerateInvoiceFromOrder(selectedOrder.id)}
                  className="btn btn-primary"
                >
                  <Receipt size={15} /> Generate Tax Invoice
                </button>
              )}

              {selectedOrder.status === 'DRAFT' && canCreate && (
                <button
                  onClick={() => setCancelModalOrder(selectedOrder)}
                  className="btn btn-danger"
                >
                  <Trash2 size={15} /> Cancel Draft
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Confirm Modal */}
      {cancelModalOrder && (
        <Modal title="Cancel Draft Order" onClose={() => setCancelModalOrder(null)} maxWidth="420px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
            <AlertTriangle size={36} color="var(--status-warning)" />
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>
                Are you sure you want to cancel order {cancelModalOrder.orderNumber}?
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                This action cancels the draft and removes it from the pipeline.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button onClick={() => setCancelModalOrder(null)} className="btn btn-secondary" style={{ flex: 1 }}>
                Keep Order
              </button>
              <button onClick={handleCancelOrder} disabled={cancelling} className="btn btn-danger" style={{ flex: 1 }}>
                {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Order Modal (with Evaluation Engine & Constraints Gate) */}
      {showCreateModal && (
        <CreateOrderModal
          customers={customers}
          products={products}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            fetchAllData();
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MODAL STYLES
// ─────────────────────────────────────────────
const ms = {
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 1000, padding: '1rem',
  },
  modal: {
    backgroundColor: 'var(--surface-1)', border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)', width: '100%', maxHeight: '90vh',
    display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-xl)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)',
  },
  title: { margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' },
  closeBtn: {
    background: 'none', border: 'none', color: 'var(--text-tertiary)',
    cursor: 'pointer', padding: '4px', borderRadius: '4px',
  },
  body: { padding: '20px', overflowY: 'auto' },
};
