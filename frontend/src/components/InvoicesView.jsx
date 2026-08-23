import React, { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { Landmark, AlertTriangle, CheckSquare, Plus } from 'lucide-react';

export default function InvoicesView() {
  const { showToast } = useToast();

  const [invoices, setInvoices] = useState([
    { id: '1', invoiceNumber: 'INV-00102', customer: 'Hindustan Agro Distributors', total: 1450000, paid: 0, outstanding: 1450000, status: 'PENDING', due: '2026-09-19' },
    { id: '2', invoiceNumber: 'INV-00101', customer: 'Balaji Agri Trading Co', total: 255000, paid: 255000, outstanding: 0, status: 'PAID', due: '2026-09-17' }
  ]);

  const handleRecordPayment = (id, invNum, outstanding) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        return {
          ...inv,
          paid: inv.total,
          outstanding: 0,
          status: 'PAID'
        };
      }
      return inv;
    }));
    showToast(`Payment of ₹${outstanding.toLocaleString('en-IN')} received for Invoice ${invNum}. Customer credit limit updated!`, 'success');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Invoices & Payments Ledger</h2>
          <p style={styles.subtitle}>Track auto-generated dispatch invoices, due dates, payments, and credit adjustments.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.theadRow}>
              <th style={styles.th}>Invoice Number</th>
              <th style={styles.th}>Customer</th>
              <th style={styles.th}>Due Date</th>
              <th style={styles.th}>Total Billed</th>
              <th style={styles.th}>Amount Paid</th>
              <th style={styles.th}>Outstanding</th>
              <th style={styles.th}>Status</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Payment Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const getStatusBadge = (status) => {
                switch (status) {
                  case 'PAID': return <span className="badge badge-success">PAID</span>;
                  case 'PENDING':
                  default:
                    return <span className="badge badge-danger">PENDING</span>;
                }
              };

              return (
                <tr key={inv.id} style={styles.tr}>
                  <td style={{ ...styles.td, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#3b82f6' }}>{inv.invoiceNumber}</td>
                  <td style={{ ...styles.td, fontWeight: 700 }}>{inv.customer}</td>
                  <td style={styles.td}>{inv.due}</td>
                  <td style={styles.td}>₹{inv.total.toLocaleString('en-IN')}</td>
                  <td style={{ ...styles.td, color: '#10b981', fontWeight: 600 }}>₹{inv.paid.toLocaleString('en-IN')}</td>
                  <td style={{ ...styles.td, color: inv.outstanding > 0 ? '#ef4444' : '#cbd5e1', fontWeight: 700 }}>₹{inv.outstanding.toLocaleString('en-IN')}</td>
                  <td style={styles.td}>{getStatusBadge(inv.status)}</td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>
                    {inv.status === 'PENDING' ? (
                      <button onClick={() => handleRecordPayment(inv.id, inv.invoiceNumber, inv.outstanding)} style={styles.payBtn}>
                        <Landmark size={14} /> Record Payment
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckSquare size={14} /> Ledger Settled
                      </span>
                    )}
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
  payBtn: {
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
};
