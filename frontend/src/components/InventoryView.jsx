import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  Boxes,
  Calendar,
  ShieldAlert,
  Play,
  Plus,
  Sliders,
  History,
  Loader2,
  X,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BarChart3,
  Zap,
  TrendingDown,
} from 'lucide-react';

// ─── Expiry classification helper (mirrors backend logic) ─────────────────────
function classifyExpiry(expiryDate) {
  const now = new Date();
  const expiry = new Date(expiryDate);
  if (expiry <= now) return 'EXPIRED';
  const diffDays = (expiry - now) / (1000 * 60 * 60 * 24);
  if (diffDays <= 30) return 'EXPIRING_SOON';
  return 'AVAILABLE';
}

function ExpiryBadge({ status, expiryDate }) {
  const live = classifyExpiry(expiryDate);
  const effective = status === 'DEPLETED' ? 'DEPLETED' : status === 'BLOCKED' ? 'BLOCKED' : live;
  const map = {
    EXPIRED:       { cls: 'badge-danger',  label: 'Expired' },
    EXPIRING_SOON: { cls: 'badge-warning', label: 'Expiring Soon' },
    AVAILABLE:     { cls: 'badge-success', label: 'Available' },
    DEPLETED:      { cls: 'badge-info',    label: 'Depleted' },
    BLOCKED:       { cls: 'badge-info',    label: 'Blocked' },
  };
  const { cls, label } = map[effective] || { cls: 'badge-info', label: effective };
  return <span className={`badge ${cls}`}>{label}</span>;
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function InventoryView() {
  const { showToast } = useToast();
  const { hasPermission } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState('batches');
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Expiry Dashboard state
  const [expiryDashboard, setExpiryDashboard] = useState(null);
  const [expiryLoading, setExpiryLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  // FEFO Preview state
  const [fefoProductId, setFefoProductId] = useState('');
  const [fefoQty, setFefoQty] = useState(10000);
  const [fefoLoading, setFefoLoading] = useState(false);
  const [fefoResult, setFefoResult] = useState(null);

  // Modal visibility
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Form states
  const [batchForm, setBatchForm] = useState({
    productId: '',
    batchNumber: '',
    manufacturingDate: '',
    expiryDate: '',
    initialQuantity: '',
  });

  const [adjustForm, setAdjustForm] = useState({
    type: 'ADJUSTMENT_IN',
    quantity: '',
    reason: '',
  });

  const canAdjust = hasPermission('inventory.adjust');

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [batchRes, prodRes, moveRes] = await Promise.all([
        axios.get('/api/inventory/batches'),
        axios.get('/api/products'),
        axios.get('/api/inventory/movements'),
      ]);
      if (batchRes.data.success) setBatches(batchRes.data.data);
      if (prodRes.data.success) {
        const active = prodRes.data.data.filter((p) => p.status === 'ACTIVE');
        setProducts(active);
        if (active.length > 0 && !fefoProductId) setFefoProductId(active[0].id);
      }
      if (moveRes.data.success) setMovements(moveRes.data.data);
    } catch (error) {
      const errMsg = error.response?.data?.error?.message || error.message || 'Error fetching inventory data.';
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExpiryDashboard = useCallback(async () => {
    setExpiryLoading(true);
    try {
      const res = await axios.get('/api/inventory/expiry/dashboard');
      if (res.data.success) setExpiryDashboard(res.data.data);
    } catch (error) {
      const errMsg = error.response?.data?.error?.message || error.message || 'Failed to fetch expiry dashboard.';
      showToast(errMsg, 'error');
    } finally {
      setExpiryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'expiry') fetchExpiryDashboard();
  }, [activeSubTab]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleAddBatch = async (e) => {
    e.preventDefault();
    const { productId, batchNumber, manufacturingDate, expiryDate, initialQuantity } = batchForm;
    if (!productId || !batchNumber.trim() || !manufacturingDate || !expiryDate || initialQuantity === '') {
      showToast('Please fill in all required fields.', 'warning');
      return;
    }
    try {
      const response = await axios.post('/api/inventory/batches', {
        ...batchForm,
        initialQuantity: parseFloat(initialQuantity),
      });
      if (response.data.success) {
        showToast('Batch inventory created successfully!', 'success');
        setShowAddBatchModal(false);
        setBatchForm({ productId: '', batchNumber: '', manufacturingDate: '', expiryDate: '', initialQuantity: '' });
        fetchData();
      }
    } catch (error) {
      const errMsg = error.response?.data?.error?.message || error.message || 'Failed to add batch.';
      showToast(errMsg, 'error');
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!selectedBatch) return;
    const { type, quantity, reason } = adjustForm;
    if (quantity === '') {
      showToast('Please enter an adjustment quantity.', 'warning');
      return;
    }
    try {
      const response = await axios.post(`/api/inventory/batches/${selectedBatch.id}/adjust`, {
        type,
        quantity: parseFloat(quantity),
        reason,
      });
      if (response.data.success) {
        showToast('Inventory adjusted successfully!', 'success');
        setShowAdjustModal(false);
        setSelectedBatch(null);
        setAdjustForm({ type: 'ADJUSTMENT_IN', quantity: '', reason: '' });
        fetchData();
      }
    } catch (error) {
      const errMsg = error.response?.data?.error?.message || error.message || 'Failed to adjust stock.';
      showToast(errMsg, 'error');
    }
  };

  const handleSyncExpiry = async () => {
    setSyncLoading(true);
    try {
      const res = await axios.post('/api/inventory/expiry/sync');
      if (res.data.success) {
        const { updated, expired, expiringSoon, normal } = res.data.data;
        showToast(
          `Expiry sync complete! Updated: ${updated} batch(es). Expired: ${expired}, Expiring Soon: ${expiringSoon}, Normal: ${normal}.`,
          'success'
        );
        fetchData();
        fetchExpiryDashboard();
      }
    } catch (error) {
      const errMsg = error.response?.data?.error?.message || error.message || 'Expiry sync failed.';
      showToast(errMsg, 'error');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleFEFOPreview = async () => {
    if (!fefoProductId) {
      showToast('Please select a product.', 'warning');
      return;
    }
    if (!fefoQty || fefoQty <= 0) {
      showToast('Please enter a valid requested quantity.', 'warning');
      return;
    }
    setFefoLoading(true);
    setFefoResult(null);
    try {
      const res = await axios.post('/api/inventory/fefo/preview', {
        productId: fefoProductId,
        quantity: parseFloat(fefoQty),
      });
      if (res.data.success) {
        setFefoResult(res.data.data);
        if (res.data.data.canFulfill) {
          showToast('FEFO allocation preview complete — order can be fulfilled!', 'success');
        } else {
          showToast(
            `Insufficient stock! Shortage: ${res.data.data.shortage.toLocaleString()} units.`,
            'error'
          );
        }
      }
    } catch (error) {
      const errMsg = error.response?.data?.error?.message || error.message || 'FEFO preview failed.';
      showToast(errMsg, 'error');
    } finally {
      setFefoLoading(false);
    }
  };

  const openAdjustModal = (batch) => {
    setSelectedBatch(batch);
    setAdjustForm({ type: 'ADJUSTMENT_IN', quantity: '', reason: '' });
    setShowAdjustModal(true);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Batch Inventory & FEFO Engine</h2>
          <p style={styles.subtitle}>
            Track production lots, expiry timelines, and auto-allocate stock using FEFO rules.
          </p>
        </div>
        {canAdjust && (
          <button
            onClick={() => {
              setBatchForm({
                productId: products.length > 0 ? products[0].id : '',
                batchNumber: '',
                manufacturingDate: '',
                expiryDate: '',
                initialQuantity: '',
              });
              setShowAddBatchModal(true);
            }}
            style={styles.addBtn}
          >
            <Plus size={16} /> Initial Batch Entry
          </button>
        )}
      </div>

      {/* Sub Tabs */}
      <div style={styles.tabsContainer}>
        {[
          { key: 'batches', label: `Batch Quantities (${batches.length})` },
          { key: 'ledger',  label: `Stock Ledger (${movements.length})` },
          { key: 'expiry',  label: 'Expiry Dashboard' },
          { key: 'fefo',    label: 'FEFO Allocation' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveSubTab(key)}
            style={{
              ...styles.tab,
              borderBottom: activeSubTab === key ? '2px solid #10b981' : '2px solid transparent',
              color: activeSubTab === key ? '#10b981' : '#94a3b8',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={styles.loadingState}>
          <Loader2 size={36} style={styles.spinner} />
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Loading inventory records...</p>
        </div>
      ) : activeSubTab === 'batches' ? (
        /* ── Batches Table ── */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={styles.cardHeader}>
            <Boxes size={18} color="#10b981" />
            <h3 style={styles.cardTitle}>Batch Quantities Log</h3>
          </div>
          {batches.length === 0 ? (
            <div style={styles.emptyState}>
              <Boxes size={40} color="#475569" style={{ marginBottom: '0.75rem' }} />
              <p style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>No batch inventory logged.</p>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.theadRow}>
                  <th style={styles.th}>Batch Number</th>
                  <th style={styles.th}>Product</th>
                  <th style={styles.th}>Mfg Date</th>
                  <th style={styles.th}>Expiry Date</th>
                  <th style={styles.th}>Available</th>
                  <th style={styles.th}>Reserved</th>
                  <th style={styles.th}>Status</th>
                  {canAdjust && <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} style={styles.tr}>
                    <td style={{ ...styles.td, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{b.batchNumber}</td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>{b.product.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>{b.product.sku}</div>
                    </td>
                    <td style={styles.td}>{new Date(b.manufacturingDate).toLocaleDateString()}</td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={14} color="#94a3b8" /> {new Date(b.expiryDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={{ ...styles.td, color: '#10b981', fontWeight: 700 }}>
                      {b.availableQuantity.toLocaleString()} {b.product.unit}
                    </td>
                    <td style={{ ...styles.td, color: b.reservedQuantity > 0 ? '#f59e0b' : '#94a3b8' }}>
                      {b.reservedQuantity.toLocaleString()} {b.product.unit}
                    </td>
                    <td style={styles.td}>
                      <ExpiryBadge status={b.status} expiryDate={b.expiryDate} />
                    </td>
                    {canAdjust && (
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <button onClick={() => openAdjustModal(b)} style={styles.adjustBtn}>
                          <Sliders size={12} /> Adjust
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : activeSubTab === 'ledger' ? (
        /* ── Stock Movements Ledger ── */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={styles.cardHeader}>
            <History size={18} color="#10b981" />
            <h3 style={styles.cardTitle}>Inventory Audit History Ledger</h3>
          </div>
          {movements.length === 0 ? (
            <div style={styles.emptyState}>
              <History size={40} color="#475569" style={{ marginBottom: '0.75rem' }} />
              <p style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>No stock movements recorded yet.</p>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.theadRow}>
                  <th style={styles.th}>Timestamp</th>
                  <th style={styles.th}>Product</th>
                  <th style={styles.th}>Batch Number</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Quantity</th>
                  <th style={styles.th}>Reason</th>
                  <th style={styles.th}>Logged By</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => {
                  const isPositive = ['STOCK_IN', 'ADJUSTMENT_IN', 'RELEASE'].includes(m.type);
                  const isWarning = m.type === 'RESERVATION';
                  const badgeClass = isPositive ? 'badge-success' : isWarning ? 'badge-warning' : 'badge-danger';
                  return (
                    <tr key={m.id} style={styles.tr}>
                      <td style={styles.td}>{new Date(m.createdAt).toLocaleString()}</td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{m.product.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>{m.product.sku}</div>
                      </td>
                      <td style={{ ...styles.td, fontFamily: 'var(--font-mono)' }}>{m.batch.batchNumber}</td>
                      <td style={styles.td}>
                        <span className={`badge ${badgeClass}`}>{m.type.replace('_', ' ')}</span>
                      </td>
                      <td style={{ ...styles.td, fontWeight: 700, color: isPositive ? '#10b981' : '#f87171' }}>
                        {isPositive ? '+' : '-'}{m.quantity.toLocaleString()}
                      </td>
                      <td style={styles.td}>{m.reason || <em style={{ color: '#475569' }}>Manual Entry</em>}</td>
                      <td style={styles.td}>{m.user?.name || <span style={{ color: '#475569' }}>System</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : activeSubTab === 'expiry' ? (
        /* ── Expiry Dashboard Tab ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Header row with Sync button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.25rem' }}>
                Expiry Status Dashboard
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                Real-time classification of batch inventory by expiry proximity.
              </p>
            </div>
            {canAdjust && (
              <button onClick={handleSyncExpiry} disabled={syncLoading} style={styles.syncBtn}>
                {syncLoading ? <Loader2 size={14} style={styles.spinner} /> : <RefreshCw size={14} />}
                {syncLoading ? 'Syncing...' : 'Sync Expiry Status'}
              </button>
            )}
          </div>

          {/* KPI Summary Cards */}
          {expiryLoading ? (
            <div style={styles.loadingState}>
              <Loader2 size={28} style={styles.spinner} />
              <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Loading expiry data...</p>
            </div>
          ) : expiryDashboard ? (
            <>
              <div style={styles.kpiGrid}>
                {/* Expired */}
                <div style={{ ...styles.kpiCard, borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
                    <div style={{ ...styles.kpiIcon, background: 'rgba(239, 68, 68, 0.15)' }}>
                      <XCircle size={18} color="#ef4444" />
                    </div>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#94a3b8' }}>Expired Batches</span>
                  </div>
                  <div style={{ ...styles.kpiValue, color: '#ef4444' }}>{expiryDashboard.summary.expired.count}</div>
                  <div style={styles.kpiSub}>
                    {expiryDashboard.summary.expired.totalQuantity.toLocaleString()} units total
                  </div>
                </div>

                {/* Expiring Soon */}
                <div style={{ ...styles.kpiCard, borderColor: 'rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
                    <div style={{ ...styles.kpiIcon, background: 'rgba(245, 158, 11, 0.15)' }}>
                      <AlertTriangle size={18} color="#f59e0b" />
                    </div>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#94a3b8' }}>Expiring Soon (≤30d)</span>
                  </div>
                  <div style={{ ...styles.kpiValue, color: '#f59e0b' }}>{expiryDashboard.summary.expiringSoon.count}</div>
                  <div style={styles.kpiSub}>
                    {expiryDashboard.summary.expiringSoon.totalQuantity.toLocaleString()} units at risk
                  </div>
                </div>

                {/* Normal / Available */}
                <div style={{ ...styles.kpiCard, borderColor: 'rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
                    <div style={{ ...styles.kpiIcon, background: 'rgba(16, 185, 129, 0.15)' }}>
                      <CheckCircle2 size={18} color="#10b981" />
                    </div>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#94a3b8' }}>Normal Stock</span>
                  </div>
                  <div style={{ ...styles.kpiValue, color: '#10b981' }}>{expiryDashboard.summary.normal.count}</div>
                  <div style={styles.kpiSub}>
                    {expiryDashboard.summary.normal.totalQuantity.toLocaleString()} units healthy
                  </div>
                </div>

                {/* Total Batches */}
                <div style={{ ...styles.kpiCard, borderColor: 'rgba(99, 102, 241, 0.3)', background: 'rgba(99, 102, 241, 0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
                    <div style={{ ...styles.kpiIcon, background: 'rgba(99, 102, 241, 0.15)' }}>
                      <BarChart3 size={18} color="#6366f1" />
                    </div>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#94a3b8' }}>Total Batches</span>
                  </div>
                  <div style={{ ...styles.kpiValue, color: '#6366f1' }}>{expiryDashboard.totalBatches}</div>
                  <div style={styles.kpiSub}>across all products</div>
                </div>
              </div>

              {/* Per-Product Breakdown Table */}
              {expiryDashboard.byProduct.length > 0 && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={styles.cardHeader}>
                    <TrendingDown size={18} color="#f59e0b" />
                    <h3 style={styles.cardTitle}>Per-Product Expiry Breakdown</h3>
                  </div>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.theadRow}>
                        <th style={styles.th}>Product</th>
                        <th style={styles.th}>SKU</th>
                        <th style={{ ...styles.th, color: '#ef4444' }}>Expired (qty)</th>
                        <th style={{ ...styles.th, color: '#f59e0b' }}>Expiring Soon (qty)</th>
                        <th style={{ ...styles.th, color: '#10b981' }}>Normal (qty)</th>
                        <th style={styles.th}>Total Available</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiryDashboard.byProduct.map((row) => (
                        <tr key={row.productId} style={styles.tr}>
                          <td style={{ ...styles.td, fontWeight: 600, color: '#f8fafc' }}>{row.productName}</td>
                          <td style={{ ...styles.td, fontFamily: 'var(--font-mono)', color: '#64748b' }}>{row.sku}</td>
                          <td style={{ ...styles.td, color: row.expired > 0 ? '#ef4444' : '#475569', fontWeight: row.expired > 0 ? 700 : 400 }}>
                            {row.expired > 0 ? `⚠ ${row.expired.toLocaleString()} ${row.unit}` : '—'}
                          </td>
                          <td style={{ ...styles.td, color: row.expiringSoon > 0 ? '#f59e0b' : '#475569', fontWeight: row.expiringSoon > 0 ? 700 : 400 }}>
                            {row.expiringSoon > 0 ? `${row.expiringSoon.toLocaleString()} ${row.unit}` : '—'}
                          </td>
                          <td style={{ ...styles.td, color: '#10b981' }}>
                            {row.normal.toLocaleString()} {row.unit}
                          </td>
                          <td style={{ ...styles.td, fontWeight: 700, color: '#cbd5e1' }}>
                            {row.totalAvailable.toLocaleString()} {row.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div style={styles.emptyState}>
              <BarChart3 size={40} color="#475569" style={{ marginBottom: '0.75rem' }} />
              <p style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>No expiry data available yet.</p>
            </div>
          )}
        </div>
      ) : (
        /* ── FEFO Allocation Tab ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.25rem' }}>
              FEFO Allocation Preview
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
              Non-mutating simulation — calculates which batches would be consumed in First Expire, First Out order for a given product and quantity.
            </p>
          </div>

          {/* FEFO Input Panel */}
          <div className="card" style={{ maxWidth: '540px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #1e293b' }}>
              <Zap size={18} color="#3b82f6" />
              <h3 style={styles.cardTitle}>Configure Allocation Query</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Product <span style={{ color: '#ef4444' }}>*</span></label>
                <select
                  style={styles.select}
                  value={fefoProductId}
                  onChange={(e) => { setFefoProductId(e.target.value); setFefoResult(null); }}
                >
                  <option value="">Select product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Requested Quantity <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="number"
                  value={fefoQty}
                  min="1"
                  step="1"
                  onChange={(e) => { setFefoQty(Number(e.target.value)); setFefoResult(null); }}
                  style={styles.input}
                />
              </div>

              <button onClick={handleFEFOPreview} disabled={fefoLoading} style={styles.allocateBtn}>
                {fefoLoading ? (
                  <><Loader2 size={14} style={{ ...styles.spinner, display: 'inline-block' }} /> Running FEFO Preview...</>
                ) : (
                  <><Play size={14} /> Run FEFO Preview</>
                )}
              </button>
            </div>
          </div>

          {/* FEFO Results */}
          {fefoResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Status Banner */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem 1.25rem',
                borderRadius: '10px',
                border: `1px solid ${fefoResult.canFulfill ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                backgroundColor: fefoResult.canFulfill ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)',
              }}>
                {fefoResult.canFulfill
                  ? <CheckCircle2 size={22} color="#10b981" />
                  : <ShieldAlert size={22} color="#ef4444" />
                }
                <div>
                  <div style={{ fontWeight: 700, color: fefoResult.canFulfill ? '#10b981' : '#ef4444', fontSize: '0.9375rem' }}>
                    {fefoResult.canFulfill ? 'Order Can Be Fulfilled' : 'Insufficient Stock — Cannot Fulfill'}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '0.125rem' }}>
                    Product: <strong style={{ color: '#cbd5e1' }}>{fefoResult.product.name}</strong>
                    &nbsp;|&nbsp; Requested: <strong style={{ color: '#cbd5e1' }}>{fefoResult.requestedQuantity.toLocaleString()} {fefoResult.product.unit}</strong>
                    &nbsp;|&nbsp; Available: <strong style={{ color: '#10b981' }}>{fefoResult.totalAvailable.toLocaleString()} {fefoResult.product.unit}</strong>
                    {!fefoResult.canFulfill && (
                      <>&nbsp;|&nbsp; Shortage: <strong style={{ color: '#ef4444' }}>{fefoResult.shortage.toLocaleString()} {fefoResult.product.unit}</strong></>
                    )}
                  </div>
                </div>
              </div>

              {/* Allocation Table */}
              {fefoResult.allocations.length > 0 && (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={styles.cardHeader}>
                    <Boxes size={18} color="#3b82f6" />
                    <h3 style={styles.cardTitle}>Proposed Batch Allocation Plan (FEFO Order)</h3>
                  </div>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.theadRow}>
                        <th style={styles.th}>#</th>
                        <th style={styles.th}>Batch Number</th>
                        <th style={styles.th}>Expiry Date</th>
                        <th style={styles.th}>Days Until Expiry</th>
                        <th style={styles.th}>Batch Status</th>
                        <th style={styles.th}>Available in Batch</th>
                        <th style={{ ...styles.th, color: '#3b82f6' }}>Allocated Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fefoResult.allocations.map((alloc, i) => (
                        <tr key={alloc.batchId} style={styles.tr}>
                          <td style={{ ...styles.td, color: '#475569', fontFamily: 'var(--font-mono)' }}>{i + 1}</td>
                          <td style={{ ...styles.td, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{alloc.batchNumber}</td>
                          <td style={styles.td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Calendar size={13} color="#94a3b8" />
                              {new Date(alloc.expiryDate).toLocaleDateString()}
                            </div>
                          </td>
                          <td style={{ ...styles.td, color: alloc.daysUntilExpiry <= 30 ? '#f59e0b' : '#10b981', fontWeight: 700 }}>
                            {alloc.daysUntilExpiry} days
                          </td>
                          <td style={styles.td}>
                            <span className={`badge ${alloc.expiryStatus === 'EXPIRING_SOON' ? 'badge-warning' : 'badge-success'}`}>
                              {alloc.expiryStatus === 'EXPIRING_SOON' ? 'Expiring Soon' : 'Available'}
                            </span>
                          </td>
                          <td style={{ ...styles.td, color: '#94a3b8' }}>
                            {alloc.availableQuantity.toLocaleString()} {fefoResult.product.unit}
                          </td>
                          <td style={{ ...styles.td, color: '#3b82f6', fontWeight: 700, fontSize: '0.9375rem' }}>
                            {alloc.allocatedQuantity.toLocaleString()} {fefoResult.product.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ backgroundColor: '#0f172a', borderTop: '2px solid #1e293b' }}>
                        <td colSpan={6} style={{ ...styles.td, fontWeight: 700, color: '#94a3b8', textAlign: 'right' }}>
                          Total Allocated:
                        </td>
                        <td style={{ ...styles.td, fontWeight: 800, color: '#3b82f6', fontSize: '1rem' }}>
                          {fefoResult.allocations
                            .reduce((sum, a) => sum + a.allocatedQuantity, 0)
                            .toLocaleString()}{' '}
                          {fefoResult.product.unit}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ ADD BATCH MODAL ══════════════════════════════════════════════════════ */}
      {showAddBatchModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Initial Batch Inventory Entry</h3>
              <button onClick={() => setShowAddBatchModal(false)} style={styles.closeBtn}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddBatch} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Product <span style={{ color: '#ef4444' }}>*</span></label>
                <select
                  style={styles.select}
                  value={batchForm.productId}
                  onChange={(e) => setBatchForm((prev) => ({ ...prev, productId: e.target.value }))}
                  required
                >
                  <option value="" disabled>Select Product Profile</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div style={styles.formRow}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Batch Number <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="e.g. BAT-2026-N1"
                    value={batchForm.batchNumber}
                    onChange={(e) => setBatchForm((prev) => ({ ...prev, batchNumber: e.target.value }))}
                    required
                  />
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Initial Quantity <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    style={styles.input}
                    placeholder="0.00"
                    value={batchForm.initialQuantity}
                    onChange={(e) => setBatchForm((prev) => ({ ...prev, initialQuantity: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Manufacturing Date <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="date"
                    style={styles.input}
                    value={batchForm.manufacturingDate}
                    onChange={(e) => setBatchForm((prev) => ({ ...prev, manufacturingDate: e.target.value }))}
                    required
                  />
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Expiry Date <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="date"
                    style={styles.input}
                    value={batchForm.expiryDate}
                    onChange={(e) => setBatchForm((prev) => ({ ...prev, expiryDate: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setShowAddBatchModal(false)} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" style={styles.submitBtn}>Add Inventory Batch</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ ADJUST STOCK MODAL ═══════════════════════════════════════════════════ */}
      {showAdjustModal && selectedBatch && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Manual Stock Adjustment</h3>
              <button onClick={() => { setShowAdjustModal(false); setSelectedBatch(null); }} style={styles.closeBtn}><X size={18} /></button>
            </div>
            <div style={{ backgroundColor: '#0f172a', padding: '0.875rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Target Batch:</div>
              <strong style={{ fontSize: '0.9375rem', color: '#f8fafc' }}>{selectedBatch.batchNumber}</strong>
              <span style={{ fontSize: '0.8125rem', color: '#94a3b8', marginLeft: '0.5rem' }}>({selectedBatch.product.name})</span>
              <div style={{ fontSize: '0.8125rem', color: '#10b981', fontWeight: 600, marginTop: '0.25rem' }}>
                Current Available Qty: {selectedBatch.availableQuantity.toLocaleString()} {selectedBatch.product.unit}
              </div>
            </div>
            <form onSubmit={handleAdjustStock} style={styles.form}>
              <div style={styles.formRow}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Adjustment Type <span style={{ color: '#ef4444' }}>*</span></label>
                  <select
                    style={styles.select}
                    value={adjustForm.type}
                    onChange={(e) => setAdjustForm((prev) => ({ ...prev, type: e.target.value }))}
                    required
                  >
                    <option value="ADJUSTMENT_IN">Addition (ADJUSTMENT_IN)</option>
                    <option value="ADJUSTMENT_OUT">Deduction (ADJUSTMENT_OUT)</option>
                  </select>
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Adjustment Quantity <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    style={styles.input}
                    placeholder="0.00"
                    value={adjustForm.quantity}
                    onChange={(e) => setAdjustForm((prev) => ({ ...prev, quantity: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Reason / Remarks <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="e.g. Audit correction, damage deduction, production surplus"
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm((prev) => ({ ...prev, reason: e.target.value }))}
                  required
                />
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={() => { setShowAdjustModal(false); setSelectedBatch(null); }} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" style={styles.submitBtn}>Apply Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' },
  title: { fontSize: '1.375rem', fontWeight: 800, color: '#f8fafc' },
  subtitle: { fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem' },
  addBtn: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    backgroundColor: '#059669', color: '#ffffff', border: 'none',
    borderRadius: '8px', padding: '0.625rem 1rem', fontSize: '0.8125rem',
    fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease',
  },
  syncBtn: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1',
    border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '8px',
    padding: '0.625rem 1rem', fontSize: '0.8125rem', fontWeight: 700,
    cursor: 'pointer', transition: 'all 0.2s ease',
  },
  tabsContainer: { display: 'flex', borderBottom: '1px solid #1e293b', gap: '1.5rem' },
  tab: {
    background: 'none', border: 'none', padding: '0.75rem 0.5rem',
    fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease',
  },
  cardHeader: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    padding: '1.25rem 1.5rem', borderBottom: '1px solid #1e293b',
    backgroundColor: '#0f172a',
  },
  cardTitle: { fontSize: '1rem', fontWeight: 700, color: '#f8fafc' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' },
  theadRow: { backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b' },
  th: { padding: '1rem 1.5rem', fontWeight: 700, color: '#94a3b8' },
  tr: { borderBottom: '1px solid #1e293b', backgroundColor: 'rgba(30, 41, 59, 0.2)' },
  td: { padding: '1rem 1.5rem', color: '#cbd5e1' },
  adjustBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6',
    border: '1px solid rgba(59, 130, 246, 0.2)', padding: '0.375rem 0.625rem',
    borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
    display: 'inline-flex', alignItems: 'center', gap: '0.25rem', transition: 'all 0.2s ease',
  },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' },
  kpiCard: {
    backgroundColor: '#1e293b', borderRadius: '12px', padding: '1.25rem',
    border: '1px solid #1e293b', transition: 'all 0.2s ease',
  },
  kpiIcon: { padding: '0.5rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center' },
  kpiValue: { fontSize: '2rem', fontWeight: 800, lineHeight: 1 },
  kpiSub: { fontSize: '0.75rem', color: '#64748b', marginTop: '0.375rem' },
  label: { fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' },
  input: {
    padding: '0.625rem 0.875rem', backgroundColor: '#0f172a',
    border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc',
    fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  select: {
    backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px',
    padding: '0.625rem 0.875rem', color: '#cbd5e1', fontSize: '0.8125rem',
    outline: 'none', cursor: 'pointer', transition: 'all 0.2s ease', width: '100%',
  },
  allocateBtn: {
    backgroundColor: '#3b82f6', color: '#ffffff', border: 'none',
    borderRadius: '8px', padding: '0.75rem', fontWeight: 700,
    fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s ease',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
  },
  loadingState: {
    display: 'flex', flexDirection: 'column', justifyContent: 'center',
    alignItems: 'center', gap: '0.75rem', padding: '4rem 0',
  },
  spinner: { animation: 'spin 1s linear infinite', color: '#10b981' },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    textAlign: 'center', padding: '2.5rem 1.5rem',
  },
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    backgroundColor: 'rgba(11, 15, 23, 0.7)', backdropFilter: 'blur(8px)',
    zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem',
  },
  modalCard: {
    backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px',
    width: '100%', maxWidth: '560px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
    display: 'flex', flexDirection: 'column', padding: '1.5rem',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    borderBottom: '1px solid #334155', paddingBottom: '1rem', marginBottom: '1.25rem',
  },
  modalTitle: { fontSize: '1.125rem', fontWeight: 800, color: '#f8fafc' },
  closeBtn: {
    background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '0.25rem', borderRadius: '6px', transition: 'all 0.2s ease',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  formRow: { display: 'flex', gap: '1rem' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  modalFooter: {
    display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
    borderTop: '1px solid #334155', paddingTop: '1.25rem', marginTop: '0.5rem',
  },
  cancelBtn: {
    backgroundColor: 'transparent', border: '1px solid #334155', color: '#cbd5e1',
    borderRadius: '8px', padding: '0.625rem 1rem', fontSize: '0.8125rem',
    fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease',
  },
  submitBtn: {
    backgroundColor: '#059669', border: 'none', color: '#ffffff',
    borderRadius: '8px', padding: '0.625rem 1.25rem', fontSize: '0.8125rem',
    fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease',
  },
};
