import React from 'react';
import { useToast } from '../context/ToastContext';
import { TrendingUp, AlertTriangle, Users, Coins, Box, ShoppingBag, BellRing, Sparkles } from 'lucide-react';

export default function DashboardView() {
  const { showToast } = useToast();

  const triggerToast = (type) => {
    switch (type) {
      case 'success':
        showToast('System stats reloaded and refreshed successfully!', 'success');
        break;
      case 'warning':
        showToast('Distributor CREDIT_LIMIT near overrun for "Hindustan Agro".', 'warning');
        break;
      case 'error':
        showToast('Failed to connect to secondary replication server.', 'error');
        break;
      case 'info':
      default:
        showToast('New sales order notification from Bangalore distributor.', 'info');
        break;
    }
  };

  return (
    <div style={styles.container}>
      {/* Welcome Banner */}
      <div style={styles.banner}>
        <div style={{ flex: 1 }}>
          <h2 style={styles.bannerTitle}>ERP Control Center</h2>
          <p style={styles.bannerSubtitle}>
            SmartAgri Modular Monolith — Real-time tracking of manufacturing batches, credit limits, and FEFO dispatches.
          </p>
        </div>
        <button onClick={() => triggerToast('success')} style={styles.bannerBtn}>
          <Sparkles size={16} /> Sync Live Data
        </button>
      </div>

      {/* KPI Cards */}
      <div style={styles.kpiGrid}>
        <div className="card" style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Active Inventory</span>
            <div style={{ ...styles.iconBox, backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
              <Box size={20} color="#10b981" />
            </div>
          </div>
          <p style={styles.kpiVal}>84,250 KG</p>
          <span style={styles.kpiLabel}>Across 8 Warehouses</span>
        </div>

        <div className="card" style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Pending Sales</span>
            <div style={{ ...styles.iconBox, backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
              <ShoppingBag size={20} color="#3b82f6" />
            </div>
          </div>
          <p style={styles.kpiVal}>₹12,45,800</p>
          <span style={styles.kpiLabel}>14 Confirmed Orders</span>
        </div>

        <div className="card" style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Credit Utilization</span>
            <div style={{ ...styles.iconBox, backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
              <Coins size={20} color="#f59e0b" />
            </div>
          </div>
          <p style={styles.kpiVal}>₹48,50,000</p>
          <span style={styles.kpiLabel}>Total Outstanding Balance</span>
        </div>

        <div className="card" style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Active Distributors</span>
            <div style={{ ...styles.iconBox, backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
              <Users size={20} color="#8b5cf6" />
            </div>
          </div>
          <p style={styles.kpiVal}>42 Accounts</p>
          <span style={styles.kpiLabel}>18 Premium Dealers</span>
        </div>
      </div>

      {/* Main Grid: Alerts and Quick Toasts */}
      <div style={styles.mainGrid}>
        {/* Real-time Alerts Panel */}
        <div className="card" style={styles.panelCard}>
          <h3 style={styles.panelTitle}>System Notifications & Reminders</h3>
          <div style={styles.alertsList}>
            <div style={styles.alertItem}>
              <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
              <div>
                <p style={styles.alertText}><strong>Batch EXPIRY warning:</strong> Batch #NPK-2026-B12 (3,200 KG) expires in 12 days.</p>
                <span style={styles.alertTime}>Warehouse-2 • 10m ago</span>
              </div>
            </div>
            <div style={styles.alertItem}>
              <TrendingUp size={18} color="#10b981" style={{ flexShrink: 0 }} />
              <div>
                <p style={styles.alertText}><strong>Limit Check:</strong> Distributor "Venkata Fertilizers" request approved (₹4,50,000 within credit limit).</p>
                <span style={styles.alertTime}>Finance Service • 1h ago</span>
              </div>
            </div>
          </div>
        </div>

        {/* Toast Testing Panel */}
        <div className="card" style={styles.panelCard}>
          <h3 style={styles.panelTitle}>UI Components Interaction Playground</h3>
          <p style={styles.panelDesc}>
            Test the response metrics and the floating notification toast portal setup.
          </p>
          <div style={styles.btnGrid}>
            <button onClick={() => triggerToast('info')} style={{ ...styles.actionBtn, borderLeft: '4px solid #3b82f6' }}>
              <BellRing size={16} color="#3b82f6" /> Trigger Info Toast
            </button>
            <button onClick={() => triggerToast('warning')} style={{ ...styles.actionBtn, borderLeft: '4px solid #f59e0b' }}>
              <AlertTriangle size={16} color="#f59e0b" /> Trigger Warning Toast
            </button>
            <button onClick={() => triggerToast('error')} style={{ ...styles.actionBtn, borderLeft: '4px solid #ef4444' }}>
              <AlertTriangle size={16} color="#ef4444" /> Trigger Error Toast
            </button>
          </div>
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
  banner: {
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    borderRadius: '16px',
    padding: '1.5rem 2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1.5rem',
  },
  bannerTitle: {
    fontSize: '1.375rem',
    fontWeight: 800,
    color: '#f8fafc',
  },
  bannerSubtitle: {
    fontSize: '0.875rem',
    color: '#cbd5e1',
    marginTop: '0.25rem',
    lineHeight: 1.5,
  },
  bannerBtn: {
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
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1.25rem',
  },
  kpiCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  kpiHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiTitle: {
    fontSize: '0.8125rem',
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  iconBox: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiVal: {
    fontSize: '1.625rem',
    fontWeight: 800,
    color: '#f8fafc',
  },
  kpiLabel: {
    fontSize: '0.75rem',
    color: '#64748b',
    fontWeight: 500,
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: '1.5rem',
  },
  panelCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  panelTitle: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#cbd5e1',
  },
  panelDesc: {
    fontSize: '0.8125rem',
    color: '#94a3b8',
    lineHeight: 1.5,
  },
  alertsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  alertItem: {
    display: 'flex',
    gap: '0.75rem',
    padding: '0.75rem',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    border: '1px solid #1e293b',
  },
  alertText: {
    fontSize: '0.8125rem',
    color: '#cbd5e1',
    lineHeight: 1.4,
  },
  alertTime: {
    fontSize: '0.6875rem',
    color: '#64748b',
    marginTop: '0.25rem',
    display: 'block',
  },
  btnGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    color: '#f8fafc',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s ease',
  },
};
