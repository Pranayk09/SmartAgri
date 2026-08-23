import React, { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { Boxes, Calendar, FileSpreadsheet, ShieldAlert, BadgeInfo, Play } from 'lucide-react';

export default function InventoryView() {
  const { showToast } = useToast();
  const [allocationQty, setAllocationQty] = useState(10000);
  const [allocationResult, setAllocationResult] = useState(null);

  // Demo inventory batches
  const batches = [
    { id: '1', batchNumber: 'B001-NPK', product: 'NPK 19-19-19 Premium', mfg: '2026-03-01', exp: '2026-09-03', qty: 4000, reserved: 0, status: 'AVAILABLE' },
    { id: '2', batchNumber: 'B002-NPK', product: 'NPK 19-19-19 Premium', mfg: '2026-04-10', exp: '2026-10-15', qty: 6000, reserved: 0, status: 'AVAILABLE' },
    { id: '3', batchNumber: 'B003-NPK', product: 'NPK 19-19-19 Premium', mfg: '2026-05-15', exp: '2027-05-14', qty: 8000, reserved: 0, status: 'AVAILABLE' },
    { id: '4', batchNumber: 'B004-ZN', product: 'Zinc Sulphate Mono', mfg: '2026-01-10', exp: '2026-09-04', qty: 2500, reserved: 200, status: 'EXPIRING_SOON' }
  ];

  const handleFEFO = () => {
    if (allocationQty <= 0) {
      showToast('Please enter a valid requested quantity.', 'warning');
      return;
    }

    // Sort batches by expiry date ASC
    const npkBatches = batches
      .filter(b => b.product.includes('NPK'))
      .sort((a, b) => new Date(a.exp) - new Date(b.exp));

    let remaining = allocationQty;
    const allocations = [];

    for (const b of npkBatches) {
      if (remaining <= 0) break;
      const allocated = Math.min(b.qty, remaining);
      allocations.push({
        batchNumber: b.batchNumber,
        expiry: b.exp,
        allocatedQuantity: allocated
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
      showToast('FEFO calculation complete! Earliest expiring stock successfully resolved.', 'success');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Batch Inventory & FEFO Engine</h2>
          <p style={styles.subtitle}>Track production lots, manufacturing and expiry timelines, and auto-allocate stock using FEFO rules.</p>
        </div>
      </div>

      <div style={styles.splitGrid}>
        {/* Batches Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', flex: 2 }}>
          <div style={styles.cardHeader}>
            <Boxes size={18} color="#10b981" />
            <h3 style={styles.cardTitle}>Batch Quantities Log</h3>
          </div>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={styles.th}>Batch Number</th>
                <th style={styles.th}>Product</th>
                <th style={styles.th}>Expiry Date</th>
                <th style={styles.th}>Available</th>
                <th style={styles.th}>Reserved</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} style={styles.tr}>
                  <td style={{ ...styles.td, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{b.batchNumber}</td>
                  <td style={styles.td}>{b.product}</td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Calendar size={14} color="#94a3b8" /> {b.exp}
                    </div>
                  </td>
                  <td style={{ ...styles.td, color: '#10b981', fontWeight: 700 }}>{b.qty.toLocaleString()} KG</td>
                  <td style={{ ...styles.td, color: b.reserved > 0 ? '#f59e0b' : '#94a3b8' }}>{b.reserved.toLocaleString()} KG</td>
                  <td style={styles.td}>
                    <span className={`badge ${b.status === 'EXPIRING_SOON' ? 'badge-warning' : 'badge-success'}`}>
                      {b.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FEFO Calculator Box */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={styles.cardHeader}>
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
            />
          </div>

          <button onClick={handleFEFO} style={styles.allocateBtn}>
            Run Allocation Algorithm
          </button>

          {allocationResult && (
            <div style={styles.resultsBox}>
              <h4 style={styles.resultsTitle}>Allocation Results:</h4>
              <div style={styles.resultsList}>
                {allocationResult.allocations.map((alloc, i) => (
                  <div key={i} style={styles.resultItem}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{alloc.batchNumber}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Exp: {alloc.expiry}</span>
                    <strong style={{ color: '#10b981' }}>{alloc.allocatedQuantity} KG</strong>
                  </div>
                ))}
              </div>
              
              {!allocationResult.success && (
                <div style={styles.shortageBox}>
                  <ShieldAlert size={16} color="#ef4444" />
                  <span>Shortage: <strong>{allocationResult.shortage} KG</strong> (insufficient stock)</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
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
    backgroundColor: '#0b0f17',
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
  }
};
