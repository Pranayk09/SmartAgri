import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
import {
  Plus, Pencil, Trash2, X, Loader2, AlertTriangle, Check,
  Tag, Calculator, TrendingDown, Infinity, ChevronRight, Zap
} from 'lucide-react';

// ─────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────
function Modal({ title, onClose, children, maxWidth = '520px' }) {
  return (
    <div style={ms.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...ms.modal, maxWidth }}>
        <div style={ms.modalHeader}>
          <h3 style={ms.modalTitle}>{title}</h3>
          <button onClick={onClose} style={ms.closeBtn}><X size={18} /></button>
        </div>
        <div style={ms.modalBody}>{children}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// RULE FORM  (Add / Edit)
// ─────────────────────────────────────────────
function RuleForm({ initial, products, onSubmit, submitting }) {
  const [form, setForm] = useState(
    initial || { productId: '', minQuantity: '', maxQuantity: '', pricePerUnit: '', status: 'ACTIVE' }
  );
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const isEdit = !!initial?.id;

  return (
    <form id="rule-form" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} style={fs.form}>
      {/* Product selector (only on create) */}
      {!isEdit && (
        <div style={fs.field}>
          <label style={fs.label}>Product <span style={fs.req}>*</span></label>
          <select
            id="rule-product"
            style={fs.select}
            value={form.productId}
            onChange={e => set('productId', e.target.value)}
            required
            autoFocus
          >
            <option value="">— Select Product —</option>
            {products.filter(p => p.status === 'ACTIVE').map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.sku}) — {p.unit}</option>
            ))}
          </select>
        </div>
      )}

      <div style={fs.row}>
        <div style={{ ...fs.field, flex: 1 }}>
          <label style={fs.label}>Min Quantity <span style={fs.req}>*</span></label>
          <input
            id="rule-min"
            style={fs.input}
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 1000"
            value={form.minQuantity}
            onChange={e => set('minQuantity', e.target.value)}
            required
          />
        </div>
        <div style={{ ...fs.field, flex: 1 }}>
          <label style={fs.label}>
            Max Quantity
            <span style={{ color: '#64748b', fontWeight: 400, marginLeft: '0.25rem' }}>(leave blank = unlimited)</span>
          </label>
          <input
            id="rule-max"
            style={fs.input}
            type="number"
            min="0"
            step="0.01"
            placeholder="Unlimited"
            value={form.maxQuantity}
            onChange={e => set('maxQuantity', e.target.value)}
          />
        </div>
      </div>

      <div style={fs.row}>
        <div style={{ ...fs.field, flex: 1 }}>
          <label style={fs.label}>Price Per Unit (₹) <span style={fs.req}>*</span></label>
          <input
            id="rule-price"
            style={fs.input}
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            value={form.pricePerUnit}
            onChange={e => set('pricePerUnit', e.target.value)}
            required
          />
        </div>
        <div style={{ ...fs.field, flex: 1 }}>
          <label style={fs.label}>Status</label>
          <select id="rule-status" style={fs.select} value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>
      </div>

      <div style={fs.actions}>
        <button type="submit" form="rule-form" style={fs.submitBtn} disabled={submitting}>
          {submitting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
          {submitting ? 'Saving...' : isEdit ? 'Update Rule' : 'Create Price Rule'}
        </button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────
// DELETE CONFIRM
// ─────────────────────────────────────────────
function DeleteConfirm({ label, onConfirm, onCancel, submitting }) {
  return (
    <Modal title="Delete Price Rule" onClose={onCancel} maxWidth="420px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', textAlign: 'center', padding: '0.25rem 0' }}>
        <AlertTriangle size={36} color="#f59e0b" />
        <div>
          <p style={{ color: '#f8fafc', fontWeight: 600, marginBottom: '0.375rem' }}>Delete pricing tier:</p>
          <p style={{ color: '#f59e0b', fontWeight: 700 }}>{label}</p>
          <p style={{ color: '#94a3b8', fontSize: '0.8125rem', marginTop: '0.375rem' }}>This cannot be undone.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
          <button onClick={onCancel} style={fs.cancelBtn}>Cancel</button>
          <button onClick={onConfirm} style={fs.deleteBtn} disabled={submitting}>
            {submitting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
            {submitting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// LIVE PRICE CALCULATOR PANEL
// ─────────────────────────────────────────────
function PriceCalculator({ products }) {
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const calculate = async (e) => {
    e.preventDefault();
    if (!productId || !quantity) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiPost('/pricing/resolve', { productId, quantity: parseFloat(quantity) });
      setResult(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const discount = result
    ? ((result.defaultSellingPrice - result.unitPrice) / result.defaultSellingPrice * 100).toFixed(1)
    : 0;

  return (
    <div className="card" style={calc.panel}>
      {/* Header */}
      <div style={calc.header}>
        <Calculator size={18} color="#10b981" />
        <h3 style={calc.title}>Live Price Calculator</h3>
      </div>
      <p style={calc.desc}>Test pricing tiers in real-time — select a product, enter quantity, and see which tier applies.</p>

      <form onSubmit={calculate} style={calc.form}>
        <div style={calc.row}>
          <div style={calc.field}>
            <label style={fs.label}>Product</label>
            <select
              id="calc-product"
              style={fs.select}
              value={productId}
              onChange={e => { setProductId(e.target.value); setResult(null); }}
              required
            >
              <option value="">— Select Product —</option>
              {products.filter(p => p.status === 'ACTIVE').map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
              ))}
            </select>
          </div>
          <div style={{ ...calc.field, flex: '0 0 160px' }}>
            <label style={fs.label}>Quantity</label>
            <input
              id="calc-quantity"
              style={fs.input}
              type="number"
              min="0.01"
              step="0.01"
              placeholder="e.g. 5000"
              value={quantity}
              onChange={e => { setQuantity(e.target.value); setResult(null); }}
              required
            />
          </div>
          <div style={{ ...calc.field, flex: '0 0 auto', alignSelf: 'flex-end' }}>
            <button type="submit" style={calc.calcBtn} disabled={loading}>
              {loading
                ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                : <><Zap size={15} /> Calculate</>
              }
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div style={calc.errorBox}>
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div style={calc.resultGrid}>
          {/* Applied tier chip */}
          <div style={calc.tierChip}>
            <Tag size={14} />
            {result.fallback
              ? <span>Using default selling price (no tier matched)</span>
              : <span>
                  Tier matched: ≥{result.appliedRule.minQuantity.toLocaleString()}
                  {result.appliedRule.maxQuantity
                    ? ` – ${result.appliedRule.maxQuantity.toLocaleString()}`
                    : '+'
                  } {result.productUnit}
                </span>
            }
          </div>

          <div style={calc.metricRow}>
            <div style={calc.metric}>
              <p style={calc.metricLabel}>Default Price / Unit</p>
              <p style={calc.metricVal}>₹{result.defaultSellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
            <ChevronRight size={20} color="#334155" style={{ flexShrink: 0 }} />
            <div style={{ ...calc.metric, borderColor: result.fallback ? '#334155' : '#10b981' }}>
              <p style={calc.metricLabel}>Applied Price / Unit</p>
              <p style={{ ...calc.metricVal, color: result.fallback ? '#f8fafc' : '#10b981' }}>
                ₹{result.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <ChevronRight size={20} color="#334155" style={{ flexShrink: 0 }} />
            <div style={{ ...calc.metric, borderColor: '#3b82f6' }}>
              <p style={calc.metricLabel}>Total ({result.quantity.toLocaleString()} {result.productUnit})</p>
              <p style={{ ...calc.metricVal, color: '#3b82f6' }}>
                ₹{result.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {!result.fallback && Number(discount) > 0 && (
            <div style={calc.discountBadge}>
              <TrendingDown size={13} />
              {discount}% bulk discount applied
            </div>
          )}

          {/* Available tiers for this product */}
          {result.availableRules.length > 0 && (
            <div style={calc.tiersSection}>
              <p style={calc.tiersTitle}>All tiers for this product:</p>
              <div style={calc.tiersList}>
                {result.availableRules.map((r, i) => {
                  const active = result.appliedRule?.id === r.id;
                  return (
                    <div key={r.id} style={{ ...calc.tierRow, borderColor: active ? '#10b981' : '#1e293b', backgroundColor: active ? 'rgba(16,185,129,0.06)' : 'transparent' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem', minWidth: '140px' }}>
                        ≥{r.minQuantity.toLocaleString()} {r.maxQuantity ? `– ${r.maxQuantity.toLocaleString()}` : <Infinity size={11} style={{ display: 'inline', verticalAlign: 'middle' }} />}
                      </span>
                      <span style={{ fontWeight: 700, color: active ? '#10b981' : '#f8fafc' }}>
                        ₹{r.pricePerUnit.toLocaleString('en-IN', { minimumFractionDigits: 2 })} / unit
                      </span>
                      {active && <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>ACTIVE TIER</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN PRICING VIEW
// ─────────────────────────────────────────────
export default function PricingView() {
  const { showToast } = useToast();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('pricing.create');

  const [rules, setRules] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterProductId, setFilterProductId] = useState('');
  const [modal, setModal] = useState(null); // null | { mode, data }
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, prodsRes] = await Promise.all([
        apiGet('/pricing/rules'),
        apiGet('/products'),
      ]);
      setRules(rulesRes.data || []);
      setProducts(prodsRes.data || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Group rules by product for display
  const filteredRules = filterProductId
    ? rules.filter(r => r.productId === filterProductId)
    : rules;

  // ── Handlers ──
  const handleSaveRule = async (form) => {
    setSubmitting(true);
    try {
      if (modal.mode === 'add') {
        await apiPost('/pricing/rules', form);
        showToast('Price rule created successfully.', 'success');
      } else {
        await apiPut(`/pricing/rules/${modal.data.id}`, form);
        showToast('Price rule updated successfully.', 'success');
      }
      setModal(null);
      fetchAll();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRule = async () => {
    setSubmitting(true);
    try {
      await apiDelete(`/pricing/rules/${modal.data.id}`);
      showToast('Price rule deleted.', 'success');
      setModal(null);
      fetchAll();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

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
          <h2 style={vs.title}>Bulk Pricing Engine</h2>
          <p style={vs.subtitle}>
            Configure tiered price rules per product. Lower prices are automatically applied when order quantity exceeds a tier threshold.
          </p>
        </div>
        {canManage && (
          <button
            id="add-rule-btn"
            onClick={() => setModal({ mode: 'add', data: null })}
            style={vs.addBtn}
          >
            <Plus size={16} /> Add Price Rule
          </button>
        )}
      </div>

      {/* Live Price Calculator */}
      <PriceCalculator products={products} />

      {/* Filter Bar */}
      <div style={vs.filterBar}>
        <label style={{ ...fs.label, marginBottom: 0, whiteSpace: 'nowrap' }}>Filter by Product:</label>
        <select
          id="filter-product"
          style={{ ...fs.select, maxWidth: '340px', flex: 1 }}
          value={filterProductId}
          onChange={e => setFilterProductId(e.target.value)}
        >
          <option value="">All Products ({rules.length} rules)</option>
          {products.map(p => {
            const count = rules.filter(r => r.productId === p.id).length;
            return <option key={p.id} value={p.id}>{p.name} ({count} rule{count !== 1 ? 's' : ''})</option>;
          })}
        </select>
      </div>

      {/* Rules Table */}
      {filteredRules.length === 0 ? (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem', textAlign: 'center', gap: '1rem' }}>
          <Tag size={44} color="#334155" />
          <div>
            <p style={{ fontWeight: 700, color: '#f8fafc', marginBottom: '0.375rem' }}>No pricing rules yet</p>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
              {canManage
                ? 'Add tiered pricing rules to give bulk buyers a discounted price per unit.'
                : 'No pricing tiers have been configured for this organization yet.'}
            </p>
          </div>
          {canManage && (
            <button onClick={() => setModal({ mode: 'add', data: null })} style={{ ...fs.submitBtn, marginTop: '0.5rem' }}>
              <Plus size={14} /> Add First Rule
            </button>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={vs.table}>
            <thead>
              <tr style={vs.theadRow}>
                <th style={vs.th}>Product</th>
                <th style={vs.th}>SKU</th>
                <th style={vs.th}>Min Qty</th>
                <th style={vs.th}>Max Qty</th>
                <th style={vs.th}>Price / Unit</th>
                <th style={vs.th}>Status</th>
                {canManage && <th style={{ ...vs.th, textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredRules.map((rule) => (
                <tr key={rule.id} style={vs.tr}>
                  <td style={{ ...vs.td, fontWeight: 700 }}>{rule.product?.name ?? '—'}</td>
                  <td style={{ ...vs.td, fontFamily: 'var(--font-mono, monospace)', color: '#3b82f6', fontSize: '0.75rem', fontWeight: 600 }}>
                    {rule.product?.sku ?? '—'}
                  </td>
                  <td style={vs.td}>
                    <span style={vs.tierBadge}>≥ {Number(rule.minQuantity).toLocaleString()} {rule.product?.unit ?? ''}</span>
                  </td>
                  <td style={vs.td}>
                    {rule.maxQuantity
                      ? <span style={vs.tierBadge}>≤ {Number(rule.maxQuantity).toLocaleString()} {rule.product?.unit ?? ''}</span>
                      : <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#64748b', fontSize: '0.75rem' }}>
                          <Infinity size={14} /> Unlimited
                        </span>
                    }
                  </td>
                  <td style={{ ...vs.td, fontWeight: 700, color: '#10b981' }}>
                    ₹{Number(rule.pricePerUnit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={vs.td}>
                    <span className={rule.status === 'ACTIVE' ? 'badge badge-success' : 'badge badge-warning'}>
                      {rule.status}
                    </span>
                  </td>
                  {canManage && (
                    <td style={{ ...vs.td, textAlign: 'right' }}>
                      <div style={vs.actions}>
                        <button
                          id={`edit-rule-${rule.id}`}
                          onClick={() => setModal({ mode: 'edit', data: { ...rule, minQuantity: rule.minQuantity, maxQuantity: rule.maxQuantity ?? '', pricePerUnit: rule.pricePerUnit } })}
                          style={vs.iconBtn}
                          title="Edit Rule"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          id={`delete-rule-${rule.id}`}
                          onClick={() => setModal({ mode: 'delete', data: rule })}
                          style={vs.iconBtnDanger}
                          title="Delete Rule"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {modal?.mode === 'add' && (
        <Modal title="Add Pricing Tier" onClose={() => !submitting && setModal(null)}>
          <RuleForm
            products={products}
            onSubmit={handleSaveRule}
            submitting={submitting}
          />
        </Modal>
      )}

      {modal?.mode === 'edit' && (
        <Modal title="Edit Pricing Tier" onClose={() => !submitting && setModal(null)}>
          <RuleForm
            initial={modal.data}
            products={products}
            onSubmit={handleSaveRule}
            submitting={submitting}
          />
        </Modal>
      )}

      {modal?.mode === 'delete' && (
        <DeleteConfirm
          label={`${modal.data.product?.name} — ≥${Number(modal.data.minQuantity).toLocaleString()} @ ₹${Number(modal.data.pricePerUnit).toLocaleString('en-IN')}/unit`}
          onConfirm={handleDeleteRule}
          onCancel={() => !submitting && setModal(null)}
          submitting={submitting}
        />
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
  subtitle: { fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem', maxWidth: '560px' },
  addBtn: {
    display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0,
    backgroundColor: '#059669', color: '#ffffff', border: 'none',
    borderRadius: '8px', padding: '0.625rem 1rem', fontSize: '0.8125rem',
    fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease',
  },
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
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease',
  },
  iconBtnDanger: {
    backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444',
    border: '1px solid rgba(239,68,68,0.2)', padding: '0.375rem', borderRadius: '6px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease',
  },
  tierBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
    padding: '0.2rem 0.6rem', borderRadius: '6px',
    backgroundColor: 'rgba(30,41,59,0.8)', border: '1px solid #334155',
    color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-mono, monospace)',
  },
};

const ms = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
  },
  modal: {
    backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px',
    width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
    maxHeight: '90vh', overflowY: 'auto', animation: 'fadeInUp 0.2s ease',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '1.25rem 1.5rem', borderBottom: '1px solid #334155',
    position: 'sticky', top: 0, backgroundColor: '#1e293b', zIndex: 1,
  },
  modalTitle: { fontWeight: 800, fontSize: '1rem', color: '#f8fafc' },
  closeBtn: {
    background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer',
    padding: '0.25rem', display: 'flex', alignItems: 'center', borderRadius: '4px',
  },
  modalBody: { padding: '1.5rem' },
};

const fs = {
  form: { display: 'flex', flexDirection: 'column', gap: '1.125rem' },
  row: { display: 'flex', gap: '1rem', flexWrap: 'wrap' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.375rem', flex: 1, minWidth: '140px' },
  label: { fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' },
  req: { color: '#ef4444' },
  input: {
    backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px',
    padding: '0.625rem 0.875rem', color: '#f8fafc', fontSize: '0.875rem',
    outline: 'none', transition: 'border-color 0.2s', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
  },
  select: {
    backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px',
    padding: '0.625rem 0.875rem', color: '#f8fafc', fontSize: '0.875rem',
    outline: 'none', transition: 'border-color 0.2s', width: '100%', boxSizing: 'border-box', cursor: 'pointer',
  },
  actions: { display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' },
  submitBtn: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    backgroundColor: '#059669', color: '#fff', border: 'none',
    borderRadius: '8px', padding: '0.625rem 1.25rem', fontSize: '0.875rem',
    fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease',
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

// Calculator panel styles
const calc = {
  panel: {
    background: 'linear-gradient(135deg, rgba(16,185,129,0.04) 0%, rgba(30,41,59,0.8) 100%)',
    border: '1px solid rgba(16,185,129,0.15)',
    borderRadius: '12px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  header: { display: 'flex', alignItems: 'center', gap: '0.625rem' },
  title: { fontSize: '1rem', fontWeight: 800, color: '#f8fafc', margin: 0 },
  desc: { fontSize: '0.8125rem', color: '#94a3b8', marginTop: '-0.75rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  row: { display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.375rem', flex: 1, minWidth: '200px' },
  calcBtn: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    backgroundColor: '#10b981', color: '#fff', border: 'none',
    borderRadius: '8px', padding: '0.625rem 1.25rem',
    fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '8px', padding: '0.75rem 1rem',
    color: '#ef4444', fontSize: '0.875rem',
  },
  resultGrid: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  tierChip: {
    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
    backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
    color: '#10b981', borderRadius: '8px', padding: '0.5rem 0.875rem',
    fontSize: '0.8125rem', fontWeight: 600,
  },
  metricRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' },
  metric: {
    flex: 1, minWidth: '140px',
    backgroundColor: '#0f172a', border: '1px solid #334155',
    borderRadius: '10px', padding: '0.875rem 1rem',
  },
  metricLabel: { fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.375rem' },
  metricVal: { fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' },
  discountBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
    backgroundColor: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
    color: '#10b981', borderRadius: '999px', padding: '0.3rem 0.875rem',
    fontSize: '0.8rem', fontWeight: 700,
  },
  tiersSection: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  tiersTitle: { fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' },
  tiersList: { display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  tierRow: {
    display: 'flex', alignItems: 'center', gap: '1rem',
    padding: '0.625rem 0.875rem', borderRadius: '8px',
    border: '1px solid',  transition: 'all 0.2s',
  },
};
