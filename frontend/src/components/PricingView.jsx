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
  container: { display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1400px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' },
  title: { fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' },
  subtitle: { fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '560px' },
  addBtn: {
    display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
    backgroundColor: 'var(--brand-600)', color: '#ffffff', border: 'none',
    borderRadius: 'var(--radius-md)', padding: '10px 16px', fontSize: '13px',
    fontWeight: 700, cursor: 'pointer', transition: 'var(--transition-fast)',
  },
  filterBar: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' },
  theadRow: { backgroundColor: 'var(--surface-2)', borderBottom: '1px solid var(--border-subtle)' },
  th: { padding: '12px 18px', fontWeight: 700, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  tr: { borderBottom: '1px solid var(--border-subtle)', transition: 'background-color 0.15s ease' },
  td: { padding: '14px 18px', color: 'var(--text-primary)' },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '6px' },
  iconBtn: {
    backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6',
    border: '1px solid rgba(59,130,246,0.25)', padding: '6px', borderRadius: '6px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'var(--transition-fast)',
  },
  iconBtnDanger: {
    backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--status-danger)',
    border: '1px solid rgba(239,68,68,0.25)', padding: '6px', borderRadius: '6px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'var(--transition-fast)',
  },
  tierBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '3px 8px', borderRadius: '6px',
    backgroundColor: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)', fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-mono, monospace)',
  },
};

const ms = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
  },
  modal: {
    backgroundColor: 'var(--surface-1)', border: '1px solid var(--border-subtle)', borderRadius: '16px',
    width: '100%', boxShadow: 'var(--shadow-xl)',
    maxHeight: '90vh', overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)',
    position: 'sticky', top: 0, backgroundColor: 'var(--surface-2)', zIndex: 1,
  },
  modalTitle: { fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)' },
  closeBtn: {
    background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer',
    padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '4px',
  },
  modalBody: { padding: '20px' },
};

const fs = {
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  row: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '140px' },
  label: { fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  req: { color: 'var(--status-danger)' },
  input: {
    backgroundColor: 'var(--surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
    padding: '10px 14px', color: 'var(--text-primary)', fontSize: '13.5px',
    outline: 'none', transition: 'border-color 0.2s', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
  },
  select: {
    backgroundColor: 'var(--surface-2)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
    padding: '10px 14px', color: 'var(--text-primary)', fontSize: '13px',
    outline: 'none', transition: 'border-color 0.2s', width: '100%', boxSizing: 'border-box', cursor: 'pointer',
  },
  actions: { display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' },
  submitBtn: {
    display: 'flex', alignItems: 'center', gap: '8px',
    backgroundColor: 'var(--brand-600)', color: '#fff', border: 'none',
    borderRadius: 'var(--radius-md)', padding: '10px 18px', fontSize: '13px',
    fontWeight: 700, cursor: 'pointer', transition: 'var(--transition-fast)',
  },
  cancelBtn: {
    flex: 1, padding: '10px', backgroundColor: 'transparent',
    color: 'var(--text-secondary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
    fontWeight: 600, cursor: 'pointer', fontSize: '13px',
  },
  deleteBtn: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    padding: '10px', backgroundColor: 'rgba(239,68,68,0.1)',
    color: 'var(--status-danger)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-md)',
    fontWeight: 700, cursor: 'pointer', fontSize: '13px',
  },
};

// Calculator panel styles
const calc = {
  panel: {
    background: 'var(--surface-1)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    boxShadow: 'var(--shadow-sm)',
  },
  header: { display: 'flex', alignItems: 'center', gap: '10px' },
  title: { fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 },
  desc: { fontSize: '13px', color: 'var(--text-secondary)', marginTop: '-8px' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  row: { display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '200px' },
  calcBtn: {
    display: 'flex', alignItems: 'center', gap: '8px',
    backgroundColor: 'var(--brand-600)', color: '#fff', border: 'none',
    borderRadius: 'var(--radius-md)', padding: '10px 18px',
    fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'var(--transition-fast)',
    whiteSpace: 'nowrap',
  },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: '8px',
    backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '8px', padding: '12px 16px',
    color: 'var(--status-danger)', fontSize: '13px',
  },
  resultGrid: { display: 'flex', flexDirection: 'column', gap: '16px' },
  tierChip: {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
    color: 'var(--brand-500)', borderRadius: '8px', padding: '8px 14px',
    fontSize: '13px', fontWeight: 600,
  },
  metricRow: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  metric: {
    flex: 1, minWidth: '140px',
    backgroundColor: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
    borderRadius: '10px', padding: '14px 16px',
  },
  metricLabel: { fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' },
  metricVal: { fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' },
  discountBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    backgroundColor: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
    color: 'var(--brand-500)', borderRadius: '999px', padding: '4px 12px',
    fontSize: '12px', fontWeight: 700,
  },
  tiersSection: { display: 'flex', flexDirection: 'column', gap: '8px' },
  tiersTitle: { fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' },
  tiersList: { display: 'flex', flexDirection: 'column', gap: '6px' },
  tierRow: {
    display: 'flex', alignItems: 'center', gap: '16px',
    padding: '10px 14px', borderRadius: '8px',
    border: '1px solid var(--border-subtle)', transition: 'all 0.2s',
    backgroundColor: 'var(--surface-2)',
  },
};
