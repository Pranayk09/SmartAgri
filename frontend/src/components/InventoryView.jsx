import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost } from '../utils/api';
import {
  Boxes, Calendar, ShieldAlert, Play, Plus, Sliders, History,
  Loader2, X, RefreshCw, AlertTriangle, CheckCircle2, XCircle,
  BarChart3, Zap, TrendingDown, Search, Filter, Layers, ExternalLink,
  Info, Eye, ArrowRight, Package, Clock
} from 'lucide-react';

// ─── Expiry Classification Helper ────────────────────────────────────
function classifyExpiry(expiryDate) {
  const now = new Date();
  const expiry = new Date(expiryDate);
  if (expiry <= now) return 'EXPIRED';
  const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
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
    DEPLETED:      { cls: 'badge-neutral', label: 'Depleted' },
    BLOCKED:       { cls: 'badge-danger',  label: 'Blocked' },
  };
  const { cls, label } = map[effective] || { cls: 'badge-neutral', label: effective };
  return <span className={`badge ${cls}`}>{label}</span>;
}

// ─── Modal Wrapper ────────────────────────────────────────────────────
function Modal({ title, onClose, children, maxWidth = '560px' }) {
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

// ─── Main Component: Contextual Inventory Workspace ──────────────────
export default function InventoryView() {
  const { showToast } = useToast();
  const { hasPermission } = useAuth();
  const canAdjust = hasPermission('inventory.adjust');

  const [activeSubTab, setActiveSubTab] = useState('batches'); // 'batches' | 'expiry' | 'fefo' | 'ledger'
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [productFilter, setProductFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected Batch Context Drawer
  const [inspectBatch, setInspectBatch] = useState(null);

  // Expiry Dashboard
  const [expiryDashboard, setExpiryDashboard] = useState(null);
  const [expiryLoading, setExpiryLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  // FEFO Preview Simulator
  const [fefoProductId, setFefoProductId] = useState('');
  const [fefoQty, setFefoQty] = useState(10000);
  const [fefoLoading, setFefoLoading] = useState(false);
  const [fefoResult, setFefoResult] = useState(null);

  // Modals
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedBatchForAdjust, setSelectedBatchForAdjust] = useState(null);
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  // Forms
  const [batchForm, setBatchForm] = useState({
    productId: '', batchNumber: '', manufacturingDate: '', expiryDate: '', initialQuantity: '',
  });

  const [adjustForm, setAdjustForm] = useState({
    type: 'ADJUSTMENT_IN', quantity: '', reason: '',
  });

  // ─── Data Fetching ──────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [batchRes, prodRes, moveRes] = await Promise.all([
        apiGet('/inventory/batches').catch(() => ({ data: [] })),
        apiGet('/products').catch(() => ({ data: [] })),
        apiGet('/inventory/movements').catch(() => ({ data: [] })),
      ]);
      const fetchedBatches = batchRes.data || [];
      const fetchedProducts = (prodRes.data || []).filter(p => p.status === 'ACTIVE');

      setBatches(fetchedBatches);
      setProducts(fetchedProducts);
      setMovements(moveRes.data || []);

      if (fetchedProducts.length > 0 && !fefoProductId) {
        setFefoProductId(fetchedProducts[0].id);
      }

      // Check URL hash for batch preselection (e.g. #inventory?batch=...)
      const hash = window.location.hash;
      if (hash.includes('?')) {
        const params = new URLSearchParams(hash.split('?')[1]);
        const bNum = params.get('batch');
        if (bNum) {
          const match = fetchedBatches.find(b => b.batchNumber === bNum);
          if (match) setInspectBatch(match);
        }
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [fefoProductId, showToast]);

  const fetchExpiryDashboard = useCallback(async () => {
    setExpiryLoading(true);
    try {
      const res = await apiGet('/inventory/expiry/dashboard');
      setExpiryDashboard(res.data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setExpiryLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeSubTab === 'expiry') fetchExpiryDashboard();
  }, [activeSubTab, fetchExpiryDashboard]);

  // ─── Actions ────────────────────────────────────────────────────────
  const handleAddBatch = async (e) => {
    e.preventDefault();
    const { productId, batchNumber, manufacturingDate, expiryDate, initialQuantity } = batchForm;
    if (!productId || !batchNumber.trim() || !manufacturingDate || !expiryDate || initialQuantity === '') {
      showToast('Please fill in all required batch fields.', 'warning');
      return;
    }
    try {
      await apiPost('/inventory/batches', {
        ...batchForm,
        initialQuantity: parseFloat(initialQuantity),
      });
      showToast('Batch inventory registered successfully!', 'success');
      setShowAddBatchModal(false);
      setBatchForm({ productId: '', batchNumber: '', manufacturingDate: '', expiryDate: '', initialQuantity: '' });
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!selectedBatchForAdjust) return;
    const { type, quantity, reason } = adjustForm;
    if (!quantity || isNaN(parseFloat(quantity)) || parseFloat(quantity) <= 0) {
      showToast('Please enter a valid adjustment quantity.', 'warning');
      return;
    }

    setAdjustSubmitting(true);
    try {
      await apiPost(`/inventory/batches/${selectedBatchForAdjust.id}/adjust`, {
        type,
        quantity: parseFloat(quantity),
        reason: reason || 'Manual inventory reconciliation',
      });
      showToast('Inventory adjusted successfully!', 'success');
      setShowAdjustModal(false);
      setSelectedBatchForAdjust(null);
      setAdjustForm({ type: 'ADJUSTMENT_IN', quantity: '', reason: '' });
      fetchData();
      if (inspectBatch && inspectBatch.id === selectedBatchForAdjust.id) {
        setInspectBatch(null);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const handleSyncExpiry = async () => {
    setSyncLoading(true);
    try {
      const res = await apiPost('/inventory/expiry/sync');
      const { updated, expired, expiringSoon, normal } = res.data;
      showToast(`Expiry sync complete! Expired: ${expired}, Expiring Soon: ${expiringSoon}, Normal: ${normal}.`, 'success');
      fetchData();
      fetchExpiryDashboard();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleFEFOPreview = async (e) => {
    if (e) e.preventDefault();
    if (!fefoProductId) {
      showToast('Please select a product for FEFO simulation.', 'warning');
      return;
    }
    if (!fefoQty || fefoQty <= 0) {
      showToast('Enter a valid requested quantity.', 'warning');
      return;
    }

    setFefoLoading(true);
    setFefoResult(null);
    try {
      const res = await apiPost('/inventory/fefo/preview', {
        productId: fefoProductId,
        quantity: parseFloat(fefoQty),
      });
      setFefoResult(res.data);
      if (res.data.canFulfill) {
        showToast('FEFO allocation preview complete — stock is sufficient!', 'success');
      } else {
        showToast(`Stock shortage of ${res.data.shortage.toLocaleString()} units!`, 'warning');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setFefoLoading(false);
    }
  };

  const openAdjustModal = (batch) => {
    setSelectedBatchForAdjust(batch);
    setAdjustForm({ type: 'ADJUSTMENT_IN', quantity: '', reason: '' });
    setShowAdjustModal(true);
  };

  // ─── Filtered Batches ───────────────────────────────────────────────
  const filteredBatches = useMemo(() => {
    return batches.filter(b => {
      const matchSearch = !searchQuery ||
        b.batchNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.product?.sku?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchProduct = productFilter === 'ALL' || b.productId === productFilter;

      let matchStatus = true;
      if (statusFilter !== 'ALL') {
        const live = classifyExpiry(b.expiryDate);
        if (statusFilter === 'AVAILABLE') matchStatus = b.status === 'AVAILABLE' && live === 'AVAILABLE';
        else if (statusFilter === 'EXPIRING_SOON') matchStatus = live === 'EXPIRING_SOON';
        else if (statusFilter === 'EXPIRED') matchStatus = live === 'EXPIRED' || b.status === 'EXPIRED';
        else if (statusFilter === 'DEPLETED') matchStatus = b.status === 'DEPLETED';
      }

      return matchSearch && matchProduct && matchStatus;
    });
  }, [batches, searchQuery, productFilter, statusFilter]);

  // Context: Movements for the inspected batch
  const inspectedBatchMovements = useMemo(() => {
    if (!inspectBatch) return [];
    return movements.filter(m => m.batchId === inspectBatch.id || m.batch?.batchNumber === inspectBatch.batchNumber);
  }, [inspectBatch, movements]);

  // Context: Other batches for the same product as the inspected batch
  const sameProductBatches = useMemo(() => {
    if (!inspectBatch) return [];
    return batches.filter(b => b.productId === inspectBatch.productId);
  }, [inspectBatch, batches]);

  // Total stock across all batches for inspected product
  const inspectedProductTotalAvailable = useMemo(() => {
    return sameProductBatches.reduce((sum, b) => sum + (b.availableQuantity || 0), 0);
  }, [sameProductBatches]);

  // Overall KPIs
  const totalPhysicalStock = useMemo(() => batches.reduce((sum, b) => sum + (b.availableQuantity || 0), 0), [batches]);
  const totalReservedStock = useMemo(() => batches.reduce((sum, b) => sum + (b.reservedQuantity || 0), 0), [batches]);
  const expiringSoonCount = useMemo(() => batches.filter(b => classifyExpiry(b.expiryDate) === 'EXPIRING_SOON' && b.status !== 'DEPLETED').length, [batches]);
  const expiredCount = useMemo(() => batches.filter(b => classifyExpiry(b.expiryDate) === 'EXPIRED' && b.status !== 'DEPLETED').length, [batches]);

  if (loading && batches.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '5rem' }}>
        <Loader2 size={36} color="var(--brand-500)" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="workspace-container">
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Batch Inventory & FEFO Allocation Engine
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Production lot tracking, shelf life radar, automated First-Expire-First-Out allocations, and physical stock reconciliation.
          </p>
        </div>

        {canAdjust && (
          <button
            onClick={() => {
              setBatchForm({
                productId: products.length > 0 ? products[0].id : '',
                batchNumber: '', manufacturingDate: '', expiryDate: '', initialQuantity: '',
              });
              setShowAddBatchModal(true);
            }}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> New Batch Production Lot
          </button>
        )}
      </div>

      {/* KPI Overview Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div className="card" style={{ padding: '16px', background: 'var(--surface-1)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Available Stock
          </span>
          <p style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 800, color: 'var(--brand-400)', fontFamily: 'var(--font-mono)' }}>
            {totalPhysicalStock.toLocaleString()}
          </p>
        </div>

        <div className="card" style={{ padding: '16px', background: 'var(--surface-1)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Stock Reserved on Orders
          </span>
          <p style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 800, color: 'var(--status-info)', fontFamily: 'var(--font-mono)' }}>
            {totalReservedStock.toLocaleString()}
          </p>
        </div>

        <div className="card" style={{ padding: '16px', background: 'var(--surface-1)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Lots Expiring Soon (&le;30d)
          </span>
          <p style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 800, color: expiringSoonCount > 0 ? 'var(--status-warning)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {expiringSoonCount}
          </p>
        </div>

        <div className="card" style={{ padding: '16px', background: 'var(--surface-1)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Expired Lots Blocked
          </span>
          <p style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 800, color: expiredCount > 0 ? 'var(--status-danger)' : 'var(--status-success)', fontFamily: 'var(--font-mono)' }}>
            {expiredCount}
          </p>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="context-nav-tabs" style={{ maxWidth: '640px' }}>
        <button
          type="button"
          className={`context-nav-tab ${activeSubTab === 'batches' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('batches')}
        >
          <Boxes size={14} /> Batch Quantities ({batches.length})
        </button>

        <button
          type="button"
          className={`context-nav-tab ${activeSubTab === 'expiry' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('expiry')}
        >
          <ShieldAlert size={14} /> Expiry Radar
        </button>

        <button
          type="button"
          className={`context-nav-tab ${activeSubTab === 'fefo' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('fefo')}
        >
          <Zap size={14} /> FEFO Simulator
        </button>

        <button
          type="button"
          className={`context-nav-tab ${activeSubTab === 'ledger' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('ledger')}
        >
          <History size={14} /> Movements Ledger ({movements.length})
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: BATCH QUANTITIES (Interactive with Context Drawer)
          ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'batches' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Filter Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={14} color="var(--text-tertiary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                className="form-input"
                type="text"
                placeholder="Search by Batch #, Product, or SKU..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '34px', fontSize: '13px' }}
              />
            </div>

            <select className="form-select" value={productFilter} onChange={e => setProductFilter(e.target.value)} style={{ minWidth: '180px', fontSize: '13px' }}>
              <option value="ALL">All Products ({products.length})</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ minWidth: '160px', fontSize: '13px' }}>
              <option value="ALL">All Lot Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="EXPIRING_SOON">Expiring Soon</option>
              <option value="EXPIRED">Expired</option>
              <option value="DEPLETED">Depleted</option>
            </select>
          </div>

          {/* Batches Table */}
          {filteredBatches.length === 0 ? (
            <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              <Boxes size={40} style={{ marginBottom: '8px' }} />
              <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>No Batches Found</h4>
              <p style={{ margin: '4px 0 0', fontSize: '13px' }}>No production lots match active filters.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Batch Number</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Product & SKU</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Mfg Date</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Expiry Date</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Available Stock</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Reserved</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBatches.map(b => (
                    <tr
                      key={b.id}
                      onClick={() => setInspectBatch(b)}
                      style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                    >
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--status-info)' }}>
                        {b.batchNumber}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{b.product?.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{b.product?.sku}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {new Date(b.manufacturingDate).toLocaleDateString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={13} color="var(--text-tertiary)" />
                          <span>{new Date(b.expiryDate).toLocaleDateString('en-IN')}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--brand-400)' }}>
                        {Number(b.availableQuantity).toLocaleString()} {b.product?.unit}
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: b.reservedQuantity > 0 ? 'var(--status-warning)' : 'var(--text-tertiary)' }}>
                        {Number(b.reservedQuantity).toLocaleString()} {b.product?.unit}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <ExpiryBadge status={b.status} expiryDate={b.expiryDate} />
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            onClick={() => setInspectBatch(b)}
                            className="btn btn-secondary btn-icon"
                            title="Inspect Batch Context"
                          >
                            <Eye size={13} />
                          </button>
                          {canAdjust && (
                            <button
                              onClick={() => openAdjustModal(b)}
                              className="btn btn-secondary btn-sm"
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                            >
                              <Sliders size={12} /> Adjust
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
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: EXPIRY RADAR (Alerts & Automated Synchronization)
          ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'expiry' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Sync Header */}
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', padding: '16px 20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Automated Shelf-Life Sync & Compliance
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                System marks lots EXPIRED when date is past and EXPIRING_SOON within 30 days. Expired lots are automatically blocked from FEFO sales order allocation.
              </p>
            </div>
            {canAdjust && (
              <button onClick={handleSyncExpiry} disabled={syncLoading} className="btn btn-primary btn-sm">
                {syncLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
                Run Live Expiry Audit Sync
              </button>
            )}
          </div>

          {/* Expiry Breakdown Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {/* Urgent: Expired */}
            <div className="card" style={{ borderLeft: '4px solid var(--status-danger)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <XCircle size={18} color="var(--status-danger)" />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--status-danger)' }}>
                  Expired Lots (Blocked)
                </h4>
              </div>
              <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                These batches cannot be confirmed for distributor fulfillment.
              </p>
              {batches.filter(b => classifyExpiry(b.expiryDate) === 'EXPIRED' && b.status !== 'DEPLETED').length === 0 ? (
                <div style={{ padding: '10px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--status-success)' }}>
                  ✓ No expired lots present in inventory.
                </div>
              ) : (
                <div className="context-table-wrap">
                  <table className="context-table">
                    <thead>
                      <tr>
                        <th>Batch #</th>
                        <th>Product</th>
                        <th style={{ textAlign: 'right' }}>Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batches.filter(b => classifyExpiry(b.expiryDate) === 'EXPIRED' && b.status !== 'DEPLETED').map(b => (
                        <tr key={b.id} onClick={() => setInspectBatch(b)} style={{ cursor: 'pointer' }}>
                          <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--status-danger)', fontWeight: 700 }}>{b.batchNumber}</td>
                          <td>{b.product?.name}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{b.availableQuantity.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Warning: Expiring Soon */}
            <div className="card" style={{ borderLeft: '4px solid var(--status-warning)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <AlertTriangle size={18} color="var(--status-warning)" />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--status-warning)' }}>
                  Expiring in &le; 30 Days (High Priority FEFO)
                </h4>
              </div>
              <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Allocated first under the FEFO algorithm to minimize expiration loss.
              </p>
              {batches.filter(b => classifyExpiry(b.expiryDate) === 'EXPIRING_SOON' && b.status !== 'DEPLETED').length === 0 ? (
                <div style={{ padding: '10px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--status-success)' }}>
                  ✓ No lots expiring within the next 30 days.
                </div>
              ) : (
                <div className="context-table-wrap">
                  <table className="context-table">
                    <thead>
                      <tr>
                        <th>Batch #</th>
                        <th>Product</th>
                        <th>Days Left</th>
                        <th style={{ textAlign: 'right' }}>Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batches.filter(b => classifyExpiry(b.expiryDate) === 'EXPIRING_SOON' && b.status !== 'DEPLETED').map(b => {
                        const daysLeft = Math.ceil((new Date(b.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                        return (
                          <tr key={b.id} onClick={() => setInspectBatch(b)} style={{ cursor: 'pointer' }}>
                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--status-warning)' }}>{b.batchNumber}</td>
                            <td>{b.product?.name}</td>
                            <td><span className="badge badge-warning" style={{ fontSize: '10px' }}>{daysLeft}d</span></td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>{b.availableQuantity.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: FEFO ALLOCATION SIMULATOR
          ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'fefo' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(0, 1.6fr)', gap: '20px', alignItems: 'start' }}>
          {/* Simulator Form */}
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={20} color="#f59e0b" />
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  FEFO Allocation Simulator
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Test how the warehouse allocation engine distributes order quantities across batches.
                </p>
              </div>
            </div>

            <form onSubmit={handleFEFOPreview} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Fertilizer Product</label>
                <select
                  className="form-select"
                  value={fefoProductId}
                  onChange={e => setFefoProductId(e.target.value)}
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Simulated Order Quantity</label>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  step="any"
                  value={fefoQty}
                  onChange={e => setFefoQty(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700 }}
                />
              </div>

              <button type="submit" disabled={fefoLoading} className="btn btn-primary" style={{ marginTop: '4px' }}>
                {fefoLoading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={15} />}
                Run FEFO Allocation Preview
              </button>
            </form>
          </div>

          {/* Allocation Results */}
          <div className="card" style={{ padding: '20px', minHeight: '300px' }}>
            {!fefoResult ? (
              <div className="context-empty" style={{ padding: '4rem 1rem' }}>
                <Zap size={36} color="var(--text-tertiary)" />
                <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Awaiting Simulation Parameters</h4>
                <p style={{ margin: 0, fontSize: '12px' }}>
                  Select a product, enter a test volume, and click "Run FEFO Allocation Preview".
                </p>
              </div>
            ) : (
              <div>
                {/* Result Gate */}
                <div style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${fefoResult.canFulfill ? 'var(--status-success)' : 'var(--status-danger)'}`,
                  background: fefoResult.canFulfill ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '16px'
                }}>
                  {fefoResult.canFulfill
                    ? <CheckCircle2 size={22} color="var(--status-success)" />
                    : <XCircle size={22} color="var(--status-danger)" />
                  }
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: fefoResult.canFulfill ? 'var(--status-success)' : 'var(--status-danger)' }}>
                      {fefoResult.canFulfill ? 'Order Fully Fulfillable via FEFO' : 'Stock Shortage Detected'}
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Requested: {Number(fefoResult.totalRequested).toLocaleString()} • Allocated: {Number(fefoResult.totalAllocated).toLocaleString()} {fefoResult.shortage > 0 && `• Shortage: ${Number(fefoResult.shortage).toLocaleString()}`}
                    </p>
                  </div>
                </div>

                {/* Proposed Allocation Table */}
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Proposed FEFO Batch Dispatch Sequence
                </span>

                <div className="context-table-wrap" style={{ marginTop: '8px' }}>
                  <table className="context-table">
                    <thead>
                      <tr>
                        <th>Batch #</th>
                        <th>Expiry Date</th>
                        <th>Available in Lot</th>
                        <th style={{ textAlign: 'right' }}>Simulated Allocation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fefoResult.allocations?.map((al, idx) => (
                        <tr key={al.batchId || idx}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--status-info)' }}>
                            {al.batchNumber}
                          </td>
                          <td>{new Date(al.expiryDate).toLocaleDateString('en-IN')}</td>
                          <td>{Number(al.availableQuantity).toLocaleString()}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--brand-400)', fontFamily: 'var(--font-mono)' }}>
                            {Number(al.allocatedQuantity).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 4: STOCK MOVEMENTS AUDIT LEDGER
          ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'ledger' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Timestamp</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Product</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Batch #</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Movement Type</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Quantity</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Reason / Ref</th>
              </tr>
            </thead>
            <tbody>
              {movements.map(m => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {new Date(m.createdAt).toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {m.product?.name}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--status-info)' }}>
                    {m.batch?.batchNumber || '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className={`badge ${
                      m.type === 'STOCK_IN' || m.type === 'ADJUSTMENT_IN' ? 'badge-success' :
                      m.type === 'DISPATCH' || m.type === 'ADJUSTMENT_OUT' ? 'badge-danger' : 'badge-warning'
                    }`}>
                      {m.type}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {m.quantity > 0 ? `+${m.quantity.toLocaleString()}` : m.quantity.toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-tertiary)' }}>
                    {m.reason || m.referenceType || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          BATCH CONTEXT INSPECTION FLYOUT DRAWER
          ───────────────────────────────────────────────────────────── */}
      {inspectBatch && (
        <div className="context-flyout-overlay" onClick={() => setInspectBatch(null)}>
          <div className="context-flyout-panel" onClick={e => e.stopPropagation()}>
            <div className="context-flyout-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Batch Lot {inspectBatch.batchNumber}
                  </h3>
                  <ExpiryBadge status={inspectBatch.status} expiryDate={inspectBatch.expiryDate} />
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                  Production lot for {inspectBatch.product?.name} ({inspectBatch.product?.sku})
                </p>
              </div>
              <button onClick={() => setInspectBatch(null)} className="btn btn-ghost btn-icon">
                <X size={18} />
              </button>
            </div>

            <div className="context-flyout-body">
              {/* Product Identity Card */}
              <div style={{ padding: '14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <span className="context-kpi-label">Associated Fertilizer Product</span>
                <h4 style={{ margin: '2px 0 0', fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {inspectBatch.product?.name}
                </h4>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span>SKU: <strong style={{ color: 'var(--brand-400)', fontFamily: 'var(--font-mono)' }}>{inspectBatch.product?.sku}</strong></span>
                  <span>• Unit: {inspectBatch.product?.unit}</span>
                  <span>• Total Product Stock Across Lots: <strong>{inspectedProductTotalAvailable.toLocaleString()} {inspectBatch.product?.unit}</strong></span>
                </div>
              </div>

              {/* Lot Shelf Life Snapshot */}
              <div className="context-kpi-grid">
                <div className="context-kpi-cell">
                  <span className="context-kpi-label">Available Physical Qty</span>
                  <span className="context-kpi-val" style={{ color: 'var(--brand-400)' }}>
                    {inspectBatch.availableQuantity.toLocaleString()} {inspectBatch.product?.unit}
                  </span>
                </div>
                <div className="context-kpi-cell">
                  <span className="context-kpi-label">Reserved on Confirmed SO</span>
                  <span className="context-kpi-val" style={{ color: inspectBatch.reservedQuantity > 0 ? 'var(--status-warning)' : 'var(--text-secondary)' }}>
                    {inspectBatch.reservedQuantity.toLocaleString()} {inspectBatch.product?.unit}
                  </span>
                </div>
                <div className="context-kpi-cell">
                  <span className="context-kpi-label">Manufacturing Date</span>
                  <span className="context-kpi-val" style={{ fontSize: '13px' }}>
                    {new Date(inspectBatch.manufacturingDate).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <div className="context-kpi-cell">
                  <span className="context-kpi-label">Expiration Date</span>
                  <span className="context-kpi-val" style={{ fontSize: '13px' }}>
                    {new Date(inspectBatch.expiryDate).toLocaleDateString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Stock Movements for this batch */}
              <div>
                <span style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.04em' }}>
                  Batch Movement Audit History ({inspectedBatchMovements.length})
                </span>

                {inspectedBatchMovements.length === 0 ? (
                  <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    No separate manual adjustments or reservations logged for this batch lot.
                  </p>
                ) : (
                  <div className="context-table-wrap" style={{ marginTop: '6px' }}>
                    <table className="context-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Qty</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inspectedBatchMovements.map(m => (
                          <tr key={m.id}>
                            <td>{new Date(m.createdAt).toLocaleDateString('en-IN')}</td>
                            <td><span className="badge badge-info" style={{ fontSize: '9.5px' }}>{m.type}</span></td>
                            <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{m.quantity.toLocaleString()}</td>
                            <td style={{ color: 'var(--text-tertiary)' }}>{m.reason || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="context-flyout-footer">
              {canAdjust && (
                <button onClick={() => openAdjustModal(inspectBatch)} className="btn btn-primary">
                  <Sliders size={14} /> Adjust Batch Stock
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: INITIAL BATCH ENTRY
          ───────────────────────────────────────────────────────────── */}
      {showAddBatchModal && (
        <Modal title="Initial Batch Production Lot Entry" onClose={() => setShowAddBatchModal(false)}>
          <form onSubmit={handleAddBatch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Product <span className="required">*</span></label>
              <select
                className="form-select"
                value={batchForm.productId}
                onChange={e => setBatchForm(prev => ({ ...prev, productId: e.target.value }))}
                required
              >
                <option value="">— Select Product —</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Batch / Lot Number <span className="required">*</span></label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. NPK-2026-B08"
                value={batchForm.batchNumber}
                onChange={e => setBatchForm(prev => ({ ...prev, batchNumber: e.target.value }))}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Manufacturing Date <span className="required">*</span></label>
                <input
                  className="form-input"
                  type="date"
                  value={batchForm.manufacturingDate}
                  onChange={e => setBatchForm(prev => ({ ...prev, manufacturingDate: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Expiry Date <span className="required">*</span></label>
                <input
                  className="form-input"
                  type="date"
                  value={batchForm.expiryDate}
                  onChange={e => setBatchForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Initial Manufactured Quantity <span className="required">*</span></label>
              <input
                className="form-input"
                type="number"
                min="0.01"
                step="any"
                placeholder="10000"
                value={batchForm.initialQuantity}
                onChange={e => setBatchForm(prev => ({ ...prev, initialQuantity: e.target.value }))}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button type="button" onClick={() => setShowAddBatchModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Register Production Lot
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: CONTEXTUAL STOCK ADJUSTMENT
          ───────────────────────────────────────────────────────────── */}
      {showAdjustModal && selectedBatchForAdjust && (
        <Modal
          title={`Adjust Stock — Lot ${selectedBatchForAdjust.batchNumber}`}
          onClose={() => setShowAdjustModal(false)}
        >
          <form onSubmit={handleAdjustStock} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Batch Context Card */}
            <div style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '12px' }}>
              <div><span style={{ color: 'var(--text-tertiary)' }}>Product:</span> <strong>{selectedBatchForAdjust.product?.name}</strong></div>
              <div><span style={{ color: 'var(--text-tertiary)' }}>Current Available:</span> <strong style={{ color: 'var(--brand-400)' }}>{selectedBatchForAdjust.availableQuantity.toLocaleString()} {selectedBatchForAdjust.product?.unit}</strong></div>
              <div><span style={{ color: 'var(--text-tertiary)' }}>Reserved:</span> <span>{selectedBatchForAdjust.reservedQuantity.toLocaleString()}</span></div>
              <div><span style={{ color: 'var(--text-tertiary)' }}>Expires:</span> <span>{new Date(selectedBatchForAdjust.expiryDate).toLocaleDateString('en-IN')}</span></div>
            </div>

            <div className="form-group">
              <label className="form-label">Adjustment Type</label>
              <select
                className="form-select"
                value={adjustForm.type}
                onChange={e => setAdjustForm(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="ADJUSTMENT_IN">ADJUSTMENT_IN (Add Stock / Count Surplus)</option>
                <option value="ADJUSTMENT_OUT">ADJUSTMENT_OUT (Deduct Stock / Damage / Count Deficit)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Quantity to Adjust <span className="required">*</span></label>
              <input
                className="form-input"
                type="number"
                min="0.01"
                step="any"
                placeholder="Quantity"
                value={adjustForm.quantity}
                onChange={e => setAdjustForm(prev => ({ ...prev, quantity: e.target.value }))}
                required
                style={{ fontSize: '15px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Audit Reason / Justification</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Monthly physical inventory count variance reconciliation"
                value={adjustForm.reason}
                onChange={e => setAdjustForm(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button type="button" onClick={() => setShowAdjustModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={adjustSubmitting} className="btn btn-primary">
                {adjustSubmitting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Sliders size={15} />}
                Confirm Adjustment
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Modal Styles ─────────────────────────────────────────────────────
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
