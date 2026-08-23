import React, { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { ShoppingCart, Plus, CheckCircle, PackageCheck, Receipt, AlertCircle } from 'lucide-react';

export default function SalesOrdersView() {
  const { showToast } = useToast();
  
  // Simulated sales orders state
  const [orders, setOrders] = useState([
    { id: '1', orderNumber: 'SO-00261', customer: 'Hindustan Agro Distributors', date: '2026-08-20', total: 1450000, status: 'CONFIRMED' },
    { id: '2', orderNumber: 'SO-00262', customer: 'Venkata Fertilizers & Seeds', date: '2026-08-22', total: 660000, status: 'DRAFT' },
    { id: '3', orderNumber: 'SO-00260', customer: 'Balaji Agri Trading Co', date: '2026-08-18', total: 255000, status: 'DISPATCHED' }
  ]);

  const handleCreateOrder = () => {
    showToast('Redirecting to order builder screen. Dynamic creation starts in Phase 9!', 'info');
  };

  const handleConfirmOrder = (orderId, orderNum) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CONFIRMED' } : o));
    showToast(`Sales Order ${orderNum} CONFIRMED! Reserved stock successfully created.`, 'success');
  };

  const handleDispatchOrder = (orderId, orderNum) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'DISPATCHED' } : o));
    showToast(`Order ${orderNum} DISPATCHED! Inventory deducted, invoice generated.`, 'success');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Sales Orders Registry</h2>
          <p style={styles.subtitle}>Create bulk order drafts, validate credits & pricing rules, and confirm allocations.</p>
        </div>
        <button onClick={handleCreateOrder} style={styles.addBtn}>
          <Plus size={16} /> Create Sales Order
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.theadRow}>
              <th style={styles.th}>Order Number</th>
              <th style={styles.th}>Customer</th>
              <th style={styles.th}>Order Date</th>
              <th style={styles.th}>Total Amount</th>
              <th style={styles.th}>Status</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Workflow Transitions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const getStatusBadge = (status) => {
                switch (status) {
                  case 'DISPATCHED': return <span className="badge badge-success">DISPATCHED</span>;
                  case 'CONFIRMED': return <span className="badge badge-info">CONFIRMED</span>;
                  case 'DRAFT':
                  default:
                    return <span className="badge badge-warning">DRAFT</span>;
                }
              };

              return (
                <tr key={o.id} style={styles.tr}>
                  <td style={{ ...styles.td, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#3b82f6' }}>{o.orderNumber}</td>
                  <td style={{ ...styles.td, fontWeight: 700 }}>{o.customer}</td>
                  <td style={styles.td}>{o.date}</td>
                  <td style={styles.td}>₹{o.total.toLocaleString('en-IN')}</td>
                  <td style={styles.td}>{getStatusBadge(o.status)}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>
                    <div style={styles.actions}>
                      {o.status === 'DRAFT' && (
                        <button onClick={() => handleConfirmOrder(o.id, o.orderNumber)} style={styles.confirmBtn}>
                          <CheckCircle size={14} /> Confirm Order
                        </button>
                      )}
                      {o.status === 'CONFIRMED' && (
                        <button onClick={() => handleDispatchOrder(o.id, o.orderNumber)} style={styles.dispatchBtn}>
                          <PackageCheck size={14} /> Dispatch Stock
                        </button>
                      )}
                      {o.status === 'DISPATCHED' && (
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
                          <Receipt size={14} /> Invoice Auto-Generated
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.5rem',
  },
  confirmBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: '#10b981',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    padding: '0.375rem 0.75rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 600,
    transition: 'all 0.2s ease',
  },
  dispatchBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    color: '#3b82f6',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    padding: '0.375rem 0.75rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 600,
    transition: 'all 0.2s ease',
  },
};
