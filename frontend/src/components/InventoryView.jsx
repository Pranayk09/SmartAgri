import React, { useState, useEffect } from 'react';
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
  X 
} from 'lucide-react';

export default function InventoryView() {
  const { showToast } = useToast();
  const { hasPermission } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState('batches');
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

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
    initialQuantity: ''
  });

  const [adjustForm, setAdjustForm] = useState({
    type: 'ADJUSTMENT_IN',
    quantity: '',
    reason: ''
  });

  // FEFO Allocation Tool states
  const [allocationQty, setAllocationQty] = useState(10000);
  const [allocationResult, setAllocationResult] = useState(null);

  const canAdjust = hasPermission('inventory.adjust');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [batchRes, prodRes, moveRes] = await Promise.all([
        axios.get('/api/inventory/batches'),
        axios.get('/api/products'),
        axios.get('/api/inventory/movements')
      ]);

      if (batchRes.data.success) setBatches(batchRes.data.data);
      if (prodRes.data.success) setProducts(prodRes.data.data.filter(p => p.status === 'ACTIVE'));
      if (moveRes.data.success) setMovements(moveRes.data.data);
    } catch (error) {
      const errMsg = error.response?.data?.error?.message || error.message || 'Error fetching inventory data.';
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
        initialQuantity: parseFloat(initialQuantity)
      });

      if (response.data.success) {
        showToast('Batch inventory created successfully!', 'success');
        setShowAddBatchModal(false);
        setBatchForm({
          productId: '',
          batchNumber: '',
          manufacturingDate: '',
          expiryDate: '',
          initialQuantity: ''
        });
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
        reason
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

  const handleFEFO = () => {
    if (allocationQty <= 0) {
      showToast('Please enter a valid requested quantity.', 'warning');
      return;
    }

    // Sort active batches of NPK products by expiry date ASC
    const npkBatches = batches
      .filter(b => b.product.sku.includes('NPK') && b.availableQuantity > 0)
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

    if (npkBatches.length === 0) {
      showToast('No available NPK batches found to allocate.', 'warning');
      return;
    }

    let remaining = allocationQty;
    const allocations = [];

    for (const b of npkBatches) {
      if (remaining <= 0) break;
      const allocated = Math.min(b.availableQuantity, remaining);
      allocations.push({
        batchNumber: b.batchNumber,
        expiry: new Date(b.expiryDate).toLocaleDateString(),
        allocatedQuantity: allocated,
        unit: b.product.unit
      });
      remaining -= allocated;
    }

    if (remaining > 0) {
      setAllocationResult({
        success: false,
        shortage: remaining,
        allocations
      });
      showToast(`Stock shortage! Unable to fully allocate. Missing: ${remaining} KG.`, 'error');
    } else {
      setAllocationResult({
        success: true,
        allocations
      });
      showToast('FEFO calculation complete! Earliest expiring stock resolved successfully.', 'success');
    }
  };

  const openAdjustModal = (batch) => {
    setSelectedBatch(batch);
    setAdjustForm({
      type: 'ADJUSTMENT_IN',
      quantity: '',
      reason: ''
    });
    setShowAdjustModal(true);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Batch Inventory & FEFO Engine</h2>
          <p style={styles.subtitle}>Track production lots, manufacturing and expiry timelines, and auto-allocate stock using FEFO rules.</p>
        </div>
        {canAdjust && (
          <button 
            onClick={() => {
              setBatchForm({
                productId: products.length > 0 ? products[0].id : '',
                batchNumber: '',
                manufacturingDate: '',
                expiryDate: '',
                initialQuantity: ''
              });
              setShowAddBatchModal(true);
            }} 
            style={styles.addBtn}
          >
            <Plus size={16} /> Initial Batch Entry
          </button>
        )}
      </div>

      {/* Sub tabs */}
      <div style={styles.tabsContainer}>
        <button 
          onClick={() => setActiveSubTab('batches')} 
          style={{ 
            ...styles.tab, 
            borderBottom: activeSubTab === 'batches' ? '2px solid #10b981' : '2px solid transparent', 
            color: activeSubTab === 'batches' ? '#10b981' : '#94a3b8' 
          }}
        >
          Batch Quantities ({batches.length})
        </button>
        <button 
          onClick={() => setActiveSubTab('ledger')} 
          style={{ 
            ...styles.tab, 
            borderBottom: activeSubTab === 'ledger' ? '2px solid #10b981' : '2px solid transparent', 
            color: activeSubTab === 'ledger' ? '#10b981' : '#94a3b8' 
          }}
        >
          Stock Movement Ledger ({movements.length})
        </button>
      </div>

      {loading ? (
        <div style={styles.loadingState}>
          <Loader2 size={36} style={styles.spinner} />
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Loading inventory records...</p>
        </div>
      ) : activeSubTab === 'batches' ? (
        <div style={styles.splitGrid}>
          {/* Batches Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 2, minWidth: '320px' }}>
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
                        <span className={`badge ${
                          b.status === 'EXPIRED' ? 'badge-danger' : 
                          b.status === 'EXPIRING_SOON' ? 'badge-warning' : 
                          b.status === 'DEPLETED' ? 'badge-info' : 'badge-success'
                        }`}>
                          {b.status}
                        </span>
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

          {/* FEFO Calculator Box */}
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem', height: 'fit-content', minWidth: '300px' }}>
            <div style={styles.cardHeaderSmall}>
              <Play size={18} color="#3b82f6" />
              <h3 style={styles.cardTitle}>FEFO Allocation Tool</h3>
            </div>
            <p style={styles.desc}>
              Test the First-Expired, First-Out (FEFO) allocation algorithm. Input a target volume to allocate NPK stock.
            </p>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Requested Quantity (KG)</label>
              <input
                type="number"
                value={allocationQty}
                onChange={(e) => setAllocationQty(Number(e.target.value))}
                style={styles.input}
                min="1"
              />
            </div>

            <button onClick={handleFEFO} style={styles.allocateBtn}>
              Run Allocation Algorithm
            </button>

            {allocationResult && (
              <div style={styles.resultsBox}>
                <h4 style={styles.resultsTitle}>Allocation Results:</h4>
                {allocationResult.allocations.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.75rem', textAlign: 'center', padding: '0.5rem' }}>No allocations resolved.</p>
                ) : (
                  <div style={styles.resultsList}>
                    {allocationResult.allocations.map((alloc, i) => (
                      <div key={i} style={styles.resultItem}>
                        <div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8125rem' }}>{alloc.batchNumber}</div>
                          <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>Exp: {alloc.expiry}</div>
                        </div>
                        <strong style={{ color: '#10b981' }}>{alloc.allocatedQuantity.toLocaleString()} {alloc.unit}</strong>
                      </div>
                    ))}
                  </div>
                )}
                
                {!allocationResult.success && (
                  <div style={styles.shortageBox}>
                    <ShieldAlert size={16} color="#ef4444" />
                    <span>Shortage: <strong>{allocationResult.shortage.toLocaleString()} KG</strong> (insufficient stock)</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Movements Ledger Tab */
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
                  <th style={styles.th}>Audit Details / Reason</th>
                  <th style={styles.th}>Logged By</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => {
                  const isPositive = m.type === 'STOCK_IN' || m.type === 'ADJUSTMENT_IN' || m.type === 'RELEASE';
                  const isWarning = m.type === 'RESERVATION';
                  const badgeClass = isPositive ? 'badge-success' : (isWarning ? 'badge-warning' : 'badge-danger');
                  return (
                    <tr key={m.id} style={styles.tr}>
                      <td style={styles.td}>{new Date(m.createdAt).toLocaleString()}</td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{m.product.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>{m.product.sku}</div>
                      </td>
                      <td style={{ ...styles.td, fontFamily: 'var(--font-mono)' }}>{m.batch.batchNumber}</td>
                      <td style={styles.td}>
                        <span className={`badge ${badgeClass}`}>
                          {m.type.replace('_', ' ')}
                        </span>
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
      )}

      {/* ========================================== */}
      {/* ADD BATCH MODAL                            */}
      {/* ========================================== */}
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
                  onChange={(e) => setBatchForm(prev => ({ ...prev, productId: e.target.value }))}
                  required
                >
                  <option value="" disabled>Select Product Profile</option>
                  {products.map(p => (
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
                    onChange={(e) => setBatchForm(prev => ({ ...prev, batchNumber: e.target.value }))}
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
                    onChange={(e) => setBatchForm(prev => ({ ...prev, initialQuantity: e.target.value }))}
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
                    onChange={(e) => setBatchForm(prev => ({ ...prev, manufacturingDate: e.target.value }))}
                    required
                  />
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Expiry Date <span style={{ color: '#ef4444' }}>*</span></label>
                  <input 
                    type="date" 
                    style={styles.input} 
                    value={batchForm.expiryDate}
                    onChange={(e) => setBatchForm(prev => ({ ...prev, expiryDate: e.target.value }))}
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

      {/* ========================================== */}
      {/* ADJUST STOCK MODAL                         */}
      {/* ========================================== */}
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
                    onChange={(e) => setAdjustForm(prev => ({ ...prev, type: e.target.value }))}
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
                    onChange={(e) => setAdjustForm(prev => ({ ...prev, quantity: e.target.value }))}
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
                  onChange={(e) => setAdjustForm(prev => ({ ...prev, reason: e.target.value }))}
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

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
  },
  title: {
    fontSize: '1.375rem',
    fontWeight: 800,
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#94a3b8',
    marginTop: '0.25rem',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: '#059669',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.625rem 1rem',
    fontSize: '0.8125rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  tabsContainer: {
    display: 'flex',
    borderBottom: '1px solid #1e293b',
    gap: '1.5rem',
  },
  tab: {
    background: 'none',
    border: 'none',
    padding: '0.75rem 0.5rem',
    fontSize: '0.875rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  splitGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1.5rem',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid #1e293b',
    backgroundColor: '#0f172a',
  },
  cardHeaderSmall: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    paddingBottom: '0.75rem',
    borderBottom: '1px solid #1e293b',
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#f8fafc',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '0.8125rem',
  },
  theadRow: {
    backgroundColor: '#0f172a',
    borderBottom: '1px solid #1e293b',
  },
  th: {
    padding: '1rem 1.5rem',
    fontWeight: 700,
    color: '#94a3b8',
  },
  tr: {
    borderBottom: '1px solid #1e293b',
    backgroundColor: 'rgba(30, 41, 59, 0.2)',
  },
  td: {
    padding: '1rem 1.5rem',
    color: '#cbd5e1',
  },
  adjustBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    color: '#3b82f6',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    padding: '0.375rem 0.625rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    transition: 'all 0.2s ease',
  },
  desc: {
    fontSize: '0.8125rem',
    color: '#94a3b8',
    lineHeight: 1.5,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#cbd5e1',
  },
  input: {
    padding: '0.625rem 0.875rem',
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    color: '#f8fafc',
    fontSize: '0.875rem',
    outline: 'none',
  },
  allocateBtn: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem',
    fontWeight: 700,
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  resultsBox: {
    backgroundColor: '#0f172a',
    borderRadius: '10px',
    padding: '1rem',
    border: '1px solid #1e293b',
  },
  resultsTitle: {
    fontSize: '0.8125rem',
    fontWeight: 700,
    color: '#cbd5e1',
    marginBottom: '0.75rem',
  },
  resultsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  resultItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.8125rem',
    color: '#cbd5e1',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    paddingBottom: '0.375rem',
  },
  shortageBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '0.75rem',
    color: '#f87171',
    fontSize: '0.75rem',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: '0.5rem',
    borderRadius: '6px',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '4rem 0',
  },
  spinner: {
    animation: 'spin 1s linear infinite',
    color: '#10b981',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '2.5rem 1.5rem',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(11, 15, 23, 0.7)',
    backdropFilter: 'blur(8px)',
    zIndex: 999,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '1.5rem',
  },
  modalCard: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '560px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.5rem',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #334155',
    paddingBottom: '1rem',
    marginBottom: '1.25rem',
  },
  modalTitle: {
    fontSize: '1.125rem',
    fontWeight: 800,
    color: '#f8fafc',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.25rem',
    borderRadius: '6px',
    transition: 'all 0.2s ease',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  formRow: {
    display: 'flex',
    gap: '1rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  label: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#94a3b8',
  },
  textarea: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '0.625rem 0.875rem',
    color: '#cbd5e1',
    fontSize: '0.8125rem',
    outline: 'none',
    minHeight: '80px',
    resize: 'vertical',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
  },
  select: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '0.625rem 0.875rem',
    color: '#cbd5e1',
    fontSize: '0.8125rem',
    outline: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    borderTop: '1px solid #334155',
    paddingTop: '1.25rem',
    marginTop: '0.5rem',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    border: '1px solid #334155',
    color: '#cbd5e1',
    borderRadius: '8px',
    padding: '0.625rem 1rem',
    fontSize: '0.8125rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  submitBtn: {
    backgroundColor: '#059669',
    border: 'none',
    color: '#ffffff',
    borderRadius: '8px',
    padding: '0.625rem 1.25rem',
    fontSize: '0.8125rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  }
};
