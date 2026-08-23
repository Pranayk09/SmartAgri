import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import ErrorBoundary from './components/ErrorBoundary';

// Import Tab Views
import DashboardView from './components/DashboardView';
import ProductsView from './components/ProductsView';
import InventoryView from './components/InventoryView';
import CustomersView from './components/CustomersView';
import SalesOrdersView from './components/SalesOrdersView';
import InvoicesView from './components/InvoicesView';
import ReportsView from './components/ReportsView';

import { 
  Sprout, 
  LayoutDashboard, 
  Package, 
  Boxes, 
  Users, 
  ShoppingCart, 
  Receipt, 
  BarChart3, 
  ShieldCheck, 
  Activity,
  LogOut,
  User,
  Bell,
  ShieldAlert,
  Loader2,
  Lock
} from 'lucide-react';

export default function App() {
  const { user, loading, isAuthenticated, logout, hasPermission } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, message: "Urgent: NPK batch #NPK-2026-B12 expiring soon.", read: false },
    { id: 2, message: "Sales Order SO-00261 confirmed by Bangalore.", read: true },
  ]);

  // Sync state with hash route
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        setCurrentView(hash);
      } else {
        setCurrentView('dashboard');
      }
      setShowNotifications(false);
    };

    window.addEventListener('hashchange', handleHashChange);
    // Initial parse
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingCard}>
          <Loader2 size={48} color="#10b981" style={styles.spinner} />
          <p style={{ marginTop: '1rem', color: '#94a3b8', fontSize: '0.9375rem', fontWeight: 600 }}>
            Initializing SmartAgri ERP...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // Sidebar navigation mapping with required permissions
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, permission: 'dashboard.view' },
    { id: 'products', label: 'Products', icon: <Package size={18} />, permission: 'products.view' },
    { id: 'inventory', label: 'Batch Inventory & FEFO', icon: <Boxes size={18} />, permission: 'inventory.view' },
    { id: 'customers', label: 'Customers & Credit', icon: <Users size={18} />, permission: 'customers.view' },
    { id: 'sales', label: 'Sales Orders', icon: <ShoppingCart size={18} />, permission: 'sales.view' },
    { id: 'invoices', label: 'Invoices & Payments', icon: <Receipt size={18} />, permission: 'invoices.view' },
    { id: 'reports', label: 'Analytics & Reports', icon: <BarChart3 size={18} />, permission: 'dashboard.view' },
  ];

  const filteredNavItems = navItems.filter(item => hasPermission(item.permission));
  const currentNavItem = navItems.find(item => item.id === currentView);
  const isAuthorized = currentNavItem ? hasPermission(currentNavItem.permission) : true;

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const renderActiveView = () => {
    if (!isAuthorized) {
      return (
        <div style={styles.unauthContainer}>
          <div className="card" style={styles.unauthCard}>
            <Lock size={48} color="#ef4444" style={{ marginBottom: '1rem', animation: 'bounce 2s infinite' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem' }}>Access Denied</h3>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.5 }}>
              Your account role (<strong style={{ color: '#10b981' }}>{user.role}</strong>) does not have the permission <code>{currentNavItem?.permission}</code> required to view this module.
            </p>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'products':
        return <ProductsView />;
      case 'inventory':
        return <InventoryView />;
      case 'customers':
        return <CustomersView />;
      case 'sales':
        return <SalesOrdersView />;
      case 'invoices':
        return <InvoicesView />;
      case 'reports':
        return <ReportsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Layout */}
      <aside className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', padding: '0 0.5rem' }}>
          <Sprout size={32} color="#10b981" />
          <div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#f8fafc' }}>
              SmartAgri <span style={{ color: '#10b981' }}>ERP</span>
            </h1>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Fertilizer Mfg & Dist</p>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {filteredNavItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <a 
                key={item.id} 
                href={`#${item.id}`} 
                style={navItemStyle(isActive)}
              >
                {item.icon} {item.label}
              </a>
            );
          })}
        </nav>

        {/* User Card inside Sidebar */}
        <div style={styles.userCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={styles.avatar}>
              <User size={16} color="#10b981" />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={styles.userName}>{user.name}</p>
              <p style={styles.userRole}>{user.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="main-content">
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} color="#10b981" />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8' }}>System Status:</span>
            <span className="badge badge-success">ONLINE</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowNotifications(!showNotifications)} style={styles.iconButton} title="System Alerts">
                <Bell size={18} color="#cbd5e1" />
                {unreadCount > 0 && <span style={styles.bellBadge}>{unreadCount}</span>}
              </button>

              {showNotifications && (
                <div style={styles.notificationDropdown}>
                  <div style={styles.dropdownHeader}>
                    <span style={{ fontWeight: 700, color: '#f8fafc' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} style={styles.markReadBtn}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div style={styles.dropdownList}>
                    {notifications.map((n) => (
                      <div key={n.id} style={{ ...styles.dropdownItem, borderLeft: n.read ? 'none' : '3px solid #10b981' }}>
                        <p style={{ ...styles.dropdownMsg, color: n.read ? '#94a3b8' : '#cbd5e1' }}>{n.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <span className="badge badge-info" style={{ textTransform: 'none' }}>
              {user.organizationName}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f8fafc', fontSize: '0.875rem', fontWeight: 600 }}>
              <ShieldCheck size={18} color="#10b981" /> {user.role}
            </div>
            <button onClick={logout} style={styles.logoutBtn} title="Sign Out">
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </header>

        <div className="content-body">
          {/* Main active view wrapped in ErrorBoundary */}
          <ErrorBoundary onReset={() => setCurrentView('dashboard')}>
            {renderActiveView()}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

function navItemStyle(isActive) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    color: isActive ? '#10b981' : '#94a3b8',
    backgroundColor: isActive ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
    textDecoration: 'none',
    fontWeight: isActive ? 700 : 500,
    fontSize: '0.875rem',
    borderLeft: isActive ? '3px solid #10b981' : '3px solid transparent',
    transition: 'all 0.2s ease',
  };
}

const styles = {
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#0b0f17',
  },
  loadingCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'rgba(30, 41, 59, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '3rem',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
  },
  spinner: {
    animation: 'spin 1s linear infinite',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.5rem 0.75rem',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '0.8125rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  iconButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    padding: '0.5rem',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  bellBadge: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontSize: '0.625rem',
    fontWeight: 800,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    border: '2px solid #0f172a',
  },
  notificationDropdown: {
    position: 'absolute',
    top: '110%',
    right: 0,
    width: '320px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
    zIndex: 100,
    overflow: 'hidden',
  },
  dropdownHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    backgroundColor: '#0f172a',
    borderBottom: '1px solid #334155',
    fontSize: '0.8125rem',
  },
  markReadBtn: {
    background: 'none',
    border: 'none',
    color: '#10b981',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
  dropdownList: {
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '240px',
    overflowY: 'auto',
  },
  dropdownItem: {
    padding: '0.875rem 1rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
    backgroundColor: 'rgba(30, 41, 59, 0.2)',
  },
  dropdownMsg: {
    fontSize: '0.75rem',
    lineHeight: 1.4,
  },
  userCard: {
    padding: '1rem',
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    marginTop: 'auto',
  },
  avatar: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
  },
  userName: {
    fontSize: '0.8125rem',
    fontWeight: 700,
    color: '#f8fafc',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userRole: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    fontWeight: 500,
  },
  unauthContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '4rem 2rem',
  },
  unauthCard: {
    maxWidth: '440px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '2.5rem',
    border: '1px solid rgba(239, 68, 68, 0.15)',
    background: 'rgba(239, 68, 68, 0.02)',
  }
};
