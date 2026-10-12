import React, { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { 
  FileSpreadsheet, 
  ArrowDownToLine, 
  BarChart3, 
  LineChart, 
  PieChart, 
  ShieldCheck, 
  Clock, 
  Download, 
  CheckCircle2, 
  Layers,
  Sparkles
} from 'lucide-react';
import { apiGet } from '../utils/api';

export default function ReportsView() {
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState(null);

  const convertToCSV = (arr) => {
    if (!arr || !arr.length) return '';
    const keys = Object.keys(arr[0]);
    const header = keys.join(',');
    const rows = arr.map(obj => 
      keys.map(key => {
        let val = obj[key] === null || obj[key] === undefined ? '' : obj[key];
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',')
    );
    return [header, ...rows].join('\n');
  };

  const handleDownload = async (reportId, reportName, endpoint) => {
    setDownloading(reportId);
    showToast(`Generating ${reportName}...`, 'info');
    
    try {
      const res = await apiGet(`/dashboard/reports/${endpoint}`);
      if (!res.data || res.data.length === 0) {
        showToast(`No records found for ${reportName}`, 'warning');
        setDownloading(null);
        return;
      }
      
      const csv = convertToCSV(res.data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${endpoint}_report_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast(`${reportName} exported successfully (${res.data.length} records).`, 'success');
    } catch (error) {
      showToast(`Failed to export report: ${error.message}`, 'error');
    } finally {
      setDownloading(null);
    }
  };

  const reports = [
    { 
      id: '1', 
      endpoint: 'inventory-expiry', 
      title: 'Inventory Expiry Forecast (FEFO)', 
      tag: 'WAREHOUSE & RISK',
      desc: 'Predictive schedule of batches expiring in 30, 60, and 90 days. Essential for inventory managers to discount aging fertilizer and prevent spoilage.',
      icon: <PieChart size={24} color="#10b981" />,
      themeColor: '#10b981'
    },
    { 
      id: '2', 
      endpoint: 'sales-volume', 
      title: 'Sales Volume & Pricing Analysis', 
      tag: 'REVENUE & DISCOUNTS',
      desc: 'Breakdown of dispatched quantities by chemical SKU, analyzing tier discount utilization across bulk orders.',
      icon: <BarChart3 size={24} color="#3b82f6" />,
      themeColor: '#3b82f6'
    },
    { 
      id: '3', 
      endpoint: 'credit-risk', 
      title: 'Distributor Credit Exposure Ledger', 
      tag: 'ACCOUNTS RECEIVABLE',
      desc: 'Complete credit limit vs. outstanding utilization audit. Flags high-risk accounts exceeding 90% exposure limits.',
      icon: <LineChart size={24} color="#f59e0b" />,
      themeColor: '#f59e0b'
    },
    { 
      id: '4', 
      endpoint: 'collections', 
      title: 'Collections & Revenue Reconciliation', 
      tag: 'FINANCIAL AUDIT',
      desc: 'Cross-verification of bank transfers, cheques, and cash payments against issued sales invoices to reconcile cash flow.',
      icon: <ShieldCheck size={24} color="#a78bfa" />,
      themeColor: '#a78bfa'
    }
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Analytics & Executive Reports</h2>
          <p style={styles.subtitle}>
            Comprehensive operational audits, accounts receivable exposure, and inventory aging forecasts.
          </p>
        </div>
      </div>

      {/* Reports Grid */}
      <div style={styles.grid}>
        {reports.map((r) => {
          const isDownloading = downloading === r.id;
          return (
            <div key={r.id} className="card card-hover" style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={{ ...styles.iconBox, backgroundColor: `${r.themeColor}15`, borderColor: `${r.themeColor}30` }}>
                  {r.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span className="badge" style={{ backgroundColor: `${r.themeColor}15`, color: r.themeColor, border: `1px solid ${r.themeColor}30`, fontSize: '10px' }}>
                    {r.tag}
                  </span>
                  <h3 style={styles.cardTitle}>{r.title}</h3>
                </div>
              </div>

              <p style={styles.cardDesc}>{r.desc}</p>

              <div style={styles.cardFooter}>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FileSpreadsheet size={13} /> UTF-8 CSV format
                </span>
                <button 
                  onClick={() => handleDownload(r.id, r.title, r.endpoint)} 
                  className={isDownloading ? "btn btn-secondary" : "btn btn-primary"}
                  disabled={isDownloading}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 16px', fontSize: '13px' }}
                >
                  <ArrowDownToLine size={15} className={isDownloading ? 'spin' : ''} />
                  <span>{isDownloading ? 'Exporting...' : 'Export CSV'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: '20px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '16px',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '24px',
    borderRadius: 'var(--radius-lg)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    marginBottom: '14px',
  },
  iconBox: {
    width: '46px',
    height: '46px',
    borderRadius: '12px',
    border: '1px solid',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    marginTop: '6px',
    lineHeight: 1.3,
  },
  cardDesc: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
    flex: 1,
    marginBottom: '20px',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid var(--border-subtle)',
    paddingTop: '16px',
  },
};
