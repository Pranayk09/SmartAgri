import React from 'react';
import { useToast } from '../context/ToastContext';
import { Users, Coins, AlertCircle, Sparkles } from 'lucide-react';

export default function CustomersView() {
  const { showToast } = useToast();

  const handleAdjustCredit = (name) => {
    showToast(`Request to adjust credit limit for ${name} sent to Finance Manager.`, 'info');
  };

  const customers = [
    { id: '1', name: 'Hindustan Agro Distributors', type: 'DISTRIBUTOR', limit: 5000000, outstanding: 4200000, terms: 30, status: 'ACTIVE' },
    { id: '2', name: 'Venkata Fertilizers & Seeds', type: 'DISTRIBUTOR', limit: 2500000, outstanding: 1200000, terms: 30, status: 'ACTIVE' },
    { id: '3', name: 'Balaji Agri Trading Co', type: 'DEALER', limit: 800000, outstanding: 750000, terms: 15, status: 'ACTIVE' },
    { id: '4', name: 'Sri Krishna Retail Stores', type: 'RETAILER', limit: 200000, outstanding: 0, terms: 7, status: 'ACTIVE' }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Customers & Credit Management</h2>
          <p style={styles.subtitle}>Manage distributor contracts, payment terms, credit lines, and real-time outstanding balances.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.theadRow}>
              <th style={styles.th}>Customer Name</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Credit Limit</th>
              <th style={styles.th}>Outstanding</th>
              <th style={styles.th}>Available Credit</th>
              <th style={styles.th}>Terms (Days)</th>
              <th style={styles.th}>Status</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Credit Controls</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => {
              const available = c.limit - c.outstanding;
              const ratio = c.outstanding / c.limit;
              const isOverrunNear = ratio > 0.8;

              return (
                <tr key={c.id} style={styles.tr}>
                  <td style={{ ...styles.td, fontWeight: 700 }}>{c.name}</td>
                  <td style={styles.td}><span className="badge badge-info">{c.type}</span></td>
                  <td style={styles.td}>₹{c.limit.toLocaleString('en-IN')}</td>
                  <td style={{ ...styles.td, color: isOverrunNear ? '#ef4444' : '#cbd5e1', fontWeight: isOverrunNear ? 700 : 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      ₹{c.outstanding.toLocaleString('en-IN')}
                      {isOverrunNear && <AlertCircle size={14} color="#ef4444" title="Over 80% limit utilization!" />}
                    </div>
                  </td>
                  <td style={{ ...styles.td, color: available > 500000 ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                    ₹{available.toLocaleString('en-IN')}
                  </td>
                  <td style={styles.td}>{c.terms} Days</td>
                  <td style={styles.td}>
                    <span className="badge badge-success">{c.status}</span>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>
                    <button onClick={() => handleAdjustCredit(c.name)} style={styles.adjustBtn}>
                      <Coins size={14} /> Adjust Credit
                    </button>
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
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    color: '#f59e0b',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    padding: '0.375rem 0.75rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 600,
    transition: 'all 0.2s ease',
  },
};
