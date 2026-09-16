import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { TrendingUp, AlertTriangle, Users, Coins, Box, ShoppingBag, BellRing, Sparkles } from 'lucide-react';
import { apiGet } from '../utils/api';

export default function DashboardView() {
  const { showToast } = useToast();
  
  const [kpis, setKpis] = useState({
    activeInventory: 0,
    pendingSales: 0,
    pendingOrdersCount: 0,
    creditUtilization: 0,
    activeDistributors: 0
  });
  
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [kpiRes, alertsRes] = await Promise.all([
        apiGet('/dashboard/kpis'),
        apiGet('/dashboard/alerts')
      ]);
      setKpis(kpiRes.data || {});
      setAlerts(alertsRes.data || []);
      showToast('System stats reloaded and refreshed successfully!', 'success');
    } catch (error) {
      showToast('Failed to load dashboard data: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
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
        <button onClick={fetchDashboardData} style={styles.bannerBtn} disabled={loading}>
          <Sparkles size={16} /> {loading ? 'Syncing...' : 'Sync Live Data'}
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
          <p style={styles.kpiVal}>{kpis.activeInventory.toLocaleString()} KG</p>
          <span style={styles.kpiLabel}>Available across all batches</span>
        </div>

        <div className="card" style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Pending Sales</span>
            <div style={{ ...styles.iconBox, backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
              <ShoppingBag size={20} color="#3b82f6" />
            </div>
          </div>
          <p style={styles.kpiVal}>{formatCurrency(kpis.pendingSales)}</p>
          <span style={styles.kpiLabel}>{kpis.pendingOrdersCount} Confirmed Orders</span>
        </div>

        <div className="card" style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Credit Utilization</span>
            <div style={{ ...styles.iconBox, backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
              <Coins size={20} color="#f59e0b" />
            </div>
          </div>
          <p style={styles.kpiVal}>{formatCurrency(kpis.creditUtilization)}</p>
          <span style={styles.kpiLabel}>Total Outstanding Balance</span>
        </div>

        <div className="card" style={styles.kpiCard}>
          <div style={styles.kpiHeader}>
            <span style={styles.kpiTitle}>Active Distributors</span>
            <div style={{ ...styles.iconBox, backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
              <Users size={20} color="#8b5cf6" />
            </div>
          </div>
          <p style={styles.kpiVal}>{kpis.activeDistributors} Accounts</p>
          <span style={styles.kpiLabel}>Verified Distributors</span>
        </div>
      </div>

      {/* Main Grid: Alerts and Quick Toasts */}
      <div style={styles.mainGrid}>
        {/* Real-time Alerts Panel */}
        <div className="card" style={styles.panelCard}>
          <h3 style={styles.panelTitle}>System Notifications & Reminders</h3>
          <div style={styles.alertsList}>
            {loading ? (
              <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Loading alerts...</p>
            ) : alerts.length === 0 ? (
              <p style={{ color: '#10b981', fontSize: '0.875rem' }}>All systems nominal. No alerts.</p>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} style={styles.alertItem}>
                  {alert.type === 'error' ? (
                    <TrendingUp size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                  ) : (
                    <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
                  )}
                  <div>
                    <p style={styles.alertText}>
                      <strong>{alert.title}:</strong> {alert.message}
                    </p>
                    <span style={styles.alertTime}>{alert.time}</span>
                  </div>
                </div>
              ))
            )}
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
