import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  Coins, 
  Boxes, 
  ShoppingBag, 
  Sparkles, 
  ArrowUpRight, 
  CheckCircle2, 
  ShieldAlert,
  Clock,
  ChevronRight,
  PackageCheck,
  PlusCircle,
  FileSpreadsheet,
  Receipt,
  Scale,
  CloudRain,
  Zap
} from 'lucide-react';
import { apiGet } from '../utils/api';

export default function DashboardView() {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [kpis, setKpis] = useState({
    activeInventory: 0,
    pendingSales: 0,
    pendingOrdersCount: 0,
    creditUtilization: 0,
    activeDistributors: 0
  });
  
  const [alerts, setAlerts] = useState([]);
  const [forecastSummary, setForecastSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchDashboardData = async (showFeedback = false) => {
    setLoading(true);
    try {
      const [kpiRes, alertsRes, forecastRes] = await Promise.all([
        apiGet('/dashboard/kpis'),
        apiGet('/dashboard/alerts'),
        apiGet('/forecast').catch(() => ({ success: false }))
      ]);
      setKpis(kpiRes.data || {});
      setAlerts(alertsRes.data || []);
      if (forecastRes.success && forecastRes.data) {
        setForecastSummary(forecastRes.data);
      }
      setLastRefreshed(new Date());
      if (showFeedback) {
        showToast('Dashboard metrics refreshed with live production data.', 'success');
      }
    } catch (error) {
      showToast('Failed to load dashboard data: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(false);
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getRoleGreeting = () => {
    if (user?.role === 'OWNER') {
      return {
        title: 'Executive Control & Financial Health',
        desc: 'Comprehensive oversight of fertilizer inventory valuation, sales fulfillment, and customer credit exposure.'
      };
    } else if (user?.role === 'INVENTORY_MANAGER') {
      return {
        title: 'Warehouse & Batch FEFO Operations',
        desc: 'Real-time stock monitoring, shelf-life expiry control, and batch dispatch tracking.'
      };
    } else {
      return {
        title: 'Sales & Distribution Pipeline',
        desc: 'Distributor order check compliance, credit utilization management, and invoice tracking.'
      };
    }
  };

  const greeting = getRoleGreeting();

  return (
    <div style={styles.container}>
      {/* Welcome & Role Context Banner */}
      <div style={styles.banner}>
        <div style={{ flex: 1, minWidth: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary">
              {user?.role ? user.role.replace('_', ' ') : 'ENTERPRISE ERP'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              Last synced: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <h2 style={styles.bannerTitle}>
            Welcome back, <span style={{ color: 'var(--brand-500)' }}>{user?.name || 'Manager'}</span>
          </h2>
          <p style={styles.bannerSubtitle}>{greeting.desc}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => fetchDashboardData(true)} 
            className="btn btn-primary" 
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
          >
            <Sparkles size={16} className={loading ? 'spin' : ''} />
            <span>{loading ? 'Syncing...' : 'Sync Live Data'}</span>
          </button>
        </div>
      </div>

      {/* AgriForecast AI Intelligence Strip */}
      {forecastSummary && (
        <div className="card" style={{ padding: '16px 20px', marginBottom: '20px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--brand-500)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TrendingUp size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <span className="badge badge-primary" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Sparkles size={11} /> AI SOWING RADAR
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {forecastSummary.scenario?.season?.name || 'Active Sowing Cycle'}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                Projected 30-day sowing demand is <strong>{(forecastSummary.summary?.projected30dDemand || 0).toLocaleString()} units</strong> ({forecastSummary.summary?.projectedSurgeRatio}x surge).
                {forecastSummary.summary?.imminentStockoutsCount > 0 && (
                  <span style={{ color: 'var(--status-danger)', fontWeight: 600, marginLeft: '6px' }}>
                    ⚠️ {forecastSummary.summary.imminentStockoutsCount} SKUs below dynamic ROP!
                  </span>
                )}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <a 
              href="#forecast" 
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 16px' }}
            >
              Open AgriForecast Studio <ChevronRight size={15} />
            </a>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div style={styles.kpiGrid}>
        {/* Active Inventory */}
        <div className="card card-hover" style={styles.kpiCard}>
          <div style={styles.kpiTop}>
            <div>
              <span style={styles.kpiLabel}>Active Finished Goods</span>
              <h3 style={styles.kpiValue}>
                {loading ? '...' : (kpis.activeInventory || 0).toLocaleString()} <span style={{ fontSize: '15px', color: 'var(--text-tertiary)', fontWeight: 600 }}>KG</span>
              </h3>
            </div>
            <div style={{ ...styles.kpiIconBox, backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
              <Boxes size={22} />
            </div>
          </div>
          <div style={styles.kpiFooter}>
            <span className="badge badge-success" style={{ fontSize: '10px' }}>In Stock</span>
            <span style={styles.kpiMeta}>Available across active production batches</span>
          </div>
        </div>

        {/* Pending Sales Pipeline */}
        <div className="card card-hover" style={styles.kpiCard}>
          <div style={styles.kpiTop}>
            <div>
              <span style={styles.kpiLabel}>Confirmed Sales Pipeline</span>
              <h3 style={styles.kpiValue}>
                {loading ? '...' : formatCurrency(kpis.pendingSales)}
              </h3>
            </div>
            <div style={{ ...styles.kpiIconBox, backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
              <ShoppingBag size={22} />
            </div>
          </div>
          <div style={styles.kpiFooter}>
            <span className="badge badge-info" style={{ fontSize: '10px' }}>
              {kpis.pendingOrdersCount || 0} Orders
            </span>
            <span style={styles.kpiMeta}>Awaiting warehouse dispatch</span>
          </div>
        </div>

        {/* Credit Utilization */}
        <div className="card card-hover" style={styles.kpiCard}>
          <div style={styles.kpiTop}>
            <div>
              <span style={styles.kpiLabel}>Total Credit Exposure</span>
              <h3 style={styles.kpiValue}>
                {loading ? '...' : formatCurrency(kpis.creditUtilization)}
              </h3>
            </div>
            <div style={{ ...styles.kpiIconBox, backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
              <Coins size={22} />
            </div>
          </div>
          <div style={styles.kpiFooter}>
            <span className="badge badge-warning" style={{ fontSize: '10px' }}>Outstanding</span>
            <span style={styles.kpiMeta}>Total balance utilized across distributors</span>
          </div>
        </div>

        {/* Active Distributors */}
        <div className="card card-hover" style={styles.kpiCard}>
          <div style={styles.kpiTop}>
            <div>
              <span style={styles.kpiLabel}>Active Distributors</span>
              <h3 style={styles.kpiValue}>
                {loading ? '...' : kpis.activeDistributors || 0} <span style={{ fontSize: '15px', color: 'var(--text-tertiary)', fontWeight: 600 }}>Agencies</span>
              </h3>
            </div>
            <div style={{ ...styles.kpiIconBox, backgroundColor: 'rgba(167, 139, 250, 0.12)', color: '#a78bfa' }}>
              <Users size={22} />
            </div>
          </div>
          <div style={styles.kpiFooter}>
            <span className="badge badge-purple" style={{ fontSize: '10px' }}>Verified</span>
            <span style={styles.kpiMeta}>Active B2B distribution accounts</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Quick Actions & Live Alerts */}
      <div style={styles.mainGrid}>
        {/* Left Column: Quick Operational Actions */}
        <div className="card" style={styles.panelCard}>
          <div style={styles.panelHeader}>
            <div>
              <h3 style={styles.panelTitle}>Quick ERP Operations</h3>
              <p style={styles.panelSubtitle}>Instant shortcuts to high-frequency manufacturing and sales workflows</p>
            </div>
          </div>

          <div style={styles.actionGrid}>
            <a href="#sales?action=new" className="card card-hover" style={styles.actionTile}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ ...styles.actionIconBox, backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                  <PlusCircle size={20} />
                </div>
                <div>
                  <div style={styles.actionTitle}>New Sales Order</div>
                  <div style={styles.actionDesc}>Contextual workspace & FEFO check</div>
                </div>
              </div>
              <ChevronRight size={16} color="var(--text-tertiary)" />
            </a>

            <a href="#inventory" className="card card-hover" style={styles.actionTile}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ ...styles.actionIconBox, backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
                  <Boxes size={20} />
                </div>
                <div>
                  <div style={styles.actionTitle}>Batch Inventory & FEFO</div>
                  <div style={styles.actionDesc}>Inspect shelf life & batch stocks</div>
                </div>
              </div>
              <ChevronRight size={16} color="var(--text-tertiary)" />
            </a>

            <a href="#products" className="card card-hover" style={styles.actionTile}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ ...styles.actionIconBox, backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                  <PackageCheck size={20} />
                </div>
                <div>
                  <div style={styles.actionTitle}>Catalog & Bulk Import</div>
                  <div style={styles.actionDesc}>Manage products & upload Excel</div>
                </div>
              </div>
              <ChevronRight size={16} color="var(--text-tertiary)" />
            </a>

            <a href="#customers" className="card card-hover" style={styles.actionTile}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ ...styles.actionIconBox, backgroundColor: 'rgba(167, 139, 250, 0.12)', color: '#a78bfa' }}>
                  <Scale size={20} />
                </div>
                <div>
                  <div style={styles.actionTitle}>Distributor Credits</div>
                  <div style={styles.actionDesc}>Review credit limits & balances</div>
                </div>
              </div>
              <ChevronRight size={16} color="var(--text-tertiary)" />
            </a>

            <a href="#invoices" className="card card-hover" style={styles.actionTile}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ ...styles.actionIconBox, backgroundColor: 'rgba(14, 165, 233, 0.12)', color: '#0ea5e9' }}>
                  <Receipt size={20} />
                </div>
                <div>
                  <div style={styles.actionTitle}>Invoices & Payments</div>
                  <div style={styles.actionDesc}>Issue tax invoices & log payments</div>
                </div>
              </div>
              <ChevronRight size={16} color="var(--text-tertiary)" />
            </a>

            <a href="#reports" className="card card-hover" style={styles.actionTile}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ ...styles.actionIconBox, backgroundColor: 'rgba(236, 72, 153, 0.12)', color: '#ec4899' }}>
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <div style={styles.actionTitle}>Executive Reports</div>
                  <div style={styles.actionDesc}>Download analytical CSV audits</div>
                </div>
              </div>
              <ChevronRight size={16} color="var(--text-tertiary)" />
            </a>

            <a href="#forecast" className="card card-hover" style={styles.actionTile}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ ...styles.actionIconBox, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                  <TrendingUp size={20} />
                </div>
                <div>
                  <div style={styles.actionTitle}>AgriForecast AI Studio</div>
                  <div style={styles.actionDesc}>Sowing waves & dynamic buffer ROP</div>
                </div>
              </div>
              <ChevronRight size={16} color="var(--text-tertiary)" />
            </a>
          </div>

          {/* System Guardrails Info Box */}
          <div style={styles.guardrailsBox}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <CheckCircle2 size={16} color="var(--brand-500)" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Manufacturing Guardrails Active
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              FEFO batch allocation runs on every order confirmation. Credit limit overrun locks are automated to protect working capital against overdue balances.
            </p>
          </div>
        </div>

        {/* Right Column: Live System & Expiry Alerts */}
        <div className="card" style={styles.panelCard}>
          <div style={styles.panelHeader}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={styles.panelTitle}>System & Risk Alerts</h3>
                {alerts.length > 0 && (
                  <span className="badge badge-danger">{alerts.length} Active</span>
                )}
              </div>
              <p style={styles.panelSubtitle}>Automatic expiry notices and distributor credit limit overruns</p>
            </div>
          </div>

          <div style={styles.alertsList}>
            {loading ? (
              <div style={styles.loadingBox}>
                <Clock size={20} className="spin" color="var(--text-tertiary)" />
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Scanning database for alerts...</span>
              </div>
            ) : alerts.length === 0 ? (
              <div style={styles.nominalBox}>
                <div style={styles.nominalIcon}>
                  <CheckCircle2 size={28} color="#10b981" />
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '8px' }}>
                  All Systems Nominal
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', maxWidth: '280px', marginTop: '4px', lineHeight: 1.4 }}>
                  No batch expiry warnings in the next 30 days and no distributor has overrun their 90% credit threshold.
                </p>
              </div>
            ) : (
              alerts.map(alert => {
                const isError = alert.type === 'error';
                return (
                  <div 
                    key={alert.id} 
                    style={{ 
                      ...styles.alertItem, 
                      borderLeft: isError ? '4px solid #ef4444' : '4px solid #f59e0b',
                      backgroundColor: isError ? 'rgba(239, 68, 68, 0.05)' : 'rgba(245, 158, 11, 0.05)'
                    }}
                  >
                    <div style={{ marginTop: '2px' }}>
                      {isError ? (
                        <ShieldAlert size={18} color="#ef4444" />
                      ) : (
                        <AlertTriangle size={18} color="#f59e0b" />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: isError ? '#ef4444' : '#f59e0b' }}>
                          {alert.title}
                        </span>
                        <span style={styles.alertTime}>{alert.time}</span>
                      </div>
                      <p style={styles.alertText}>{alert.message}</p>
                      <a 
                        href={alert.title?.toLowerCase().includes('expiry') ? '#inventory' : '#customers'}
                        style={{ fontSize: '11px', color: isError ? '#ef4444' : '#f59e0b', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', textDecoration: 'none' }}
                      >
                        Inspect in Context Workspace →
                      </a>
                    </div>
                  </div>
                );
              })
            )}
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
    gap: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  banner: {
    background: 'linear-gradient(135deg, var(--surface-1) 0%, var(--surface-2) 100%)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px 28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '20px',
    flexWrap: 'wrap',
    boxShadow: 'var(--shadow-sm)',
  },
  bannerTitle: {
    fontSize: '22px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    lineHeight: 1.3,
  },
  bannerSubtitle: {
    fontSize: '13.5px',
    color: 'var(--text-secondary)',
    marginTop: '6px',
    lineHeight: 1.5,
    maxWidth: '640px',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '16px',
  },
  kpiCard: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '20px',
    borderRadius: 'var(--radius-lg)',
    minHeight: '140px',
  },
  kpiTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
  },
  kpiLabel: {
    fontSize: '11.5px',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    display: 'block',
    marginBottom: '6px',
  },
  kpiValue: {
    fontSize: '24px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
    fontFamily: 'var(--font-mono)',
  },
  kpiIconBox: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  kpiFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '16px',
    paddingTop: '12px',
    borderTop: '1px solid var(--border-subtle)',
  },
  kpiMeta: {
    fontSize: '11.5px',
    color: 'var(--text-tertiary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
    gap: '20px',
  },
  panelCard: {
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
    borderRadius: 'var(--radius-lg)',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
  },
  panelTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  panelSubtitle: {
    fontSize: '12.5px',
    color: 'var(--text-tertiary)',
    marginTop: '2px',
  },
  actionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '12px',
    marginBottom: '20px',
  },
  actionTile: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    textDecoration: 'none',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--surface-2)',
    border: '1px solid var(--border-subtle)',
    transition: 'all 0.2s ease',
  },
  actionIconBox: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  actionDesc: {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    marginTop: '2px',
  },
  guardrailsBox: {
    marginTop: 'auto',
    padding: '14px 16px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
  },
  alertsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '440px',
    overflowY: 'auto',
  },
  alertItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-subtle)',
  },
  alertText: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    marginTop: '4px',
  },
  alertTime: {
    fontSize: '10px',
    color: 'var(--text-tertiary)',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  loadingBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '40px 20px',
  },
  nominalBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    textAlign: 'center',
    backgroundColor: 'var(--surface-2)',
    borderRadius: 'var(--radius-md)',
    border: '1px dashed var(--border-subtle)',
  },
  nominalIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
};
