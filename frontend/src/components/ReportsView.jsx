import React from 'react';
import { useToast } from '../context/ToastContext';
import { FileText, ArrowDownToLine, BarChart3, LineChart, PieChart, ShieldCheck } from 'lucide-react';

export default function ReportsView() {
  const { showToast } = useToast();

  const handleDownload = (reportName) => {
    showToast(`Downloading ${reportName} in PDF/Excel format...`, 'success');
  };

  const reports = [
    { id: '1', title: 'Inventory Expiry Forecast (FEFO)', desc: 'Forecast of stock batches expiring within 30/60/90 days, enabling early sales discounting.', icon: <PieChart size={24} color="#10b981" /> },
    { id: '2', title: 'Sales Volume & Pricing Report', desc: 'Analyzes quantity sold by product and checks volume-based price tier distributions.', icon: <BarChart3 size={24} color="#3b82f6" /> },
    { id: '3', title: 'Credit Risk & Outstanding Balances', desc: 'Identifies distributors exceeding credit limits and displays aging accounts receivable.', icon: <LineChart size={24} color="#f59e0b" /> },
    { id: '4', title: 'Collections & Revenue Reconciliation', desc: 'Ledger matching payments against generated invoices for cashflow health.', icon: <ShieldCheck size={24} color="#8b5cf6" /> }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Analytics & Executive Reports</h2>
          <p style={styles.subtitle}>Analyze supply chain metrics, financial risks, inventory aging, and collection loops.</p>
        </div>
      </div>

      <div style={styles.grid}>
        {reports.map((r) => (
          <div key={r.id} className="card" style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.iconBox}>{r.icon}</div>
              <h3 style={styles.cardTitle}>{r.title}</h3>
            </div>
            <p style={styles.cardDesc}>{r.desc}</p>
            <button onClick={() => handleDownload(r.title)} style={styles.downloadBtn}>
              <ArrowDownToLine size={16} /> Export Report Data
            </button>
          </div>
        ))}
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    height: '100%',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  iconBox: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#f8fafc',
    flex: 1,
  },
  cardDesc: {
    fontSize: '0.8125rem',
    color: '#94a3b8',
    lineHeight: 1.5,
    flex: 1,
  },
  downloadBtn: {
    alignSelf: 'flex-start',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: '#0f172a',
    color: '#cbd5e1',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    padding: '0.625rem 1rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '0.5rem',
  },
};
