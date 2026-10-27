import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import ErrorBoundary from './components/ErrorBoundary';

// Import Tab Views
import DashboardView from './components/DashboardView';
import ProductsView from './components/ProductsView';
import InventoryView from './components/InventoryView';
import CustomersView from './components/CustomersView';
import PricingView from './components/PricingView';
import SalesOrdersView from './components/SalesOrdersView';
import InvoicesView from './components/InvoicesView';
import ReportsView from './components/ReportsView';
import UsersView from './components/UsersView';
import AgriForecastView from './components/AgriForecastView';

import { 
  Sprout, 
  LayoutDashboard, 
  Package, 
  Boxes, 
  Users, 
  Tag,
  ShoppingCart, 
  Receipt, 
  BarChart3, 
  TrendingUp, 
  ShieldCheck, 
  Activity,
  LogOut,
  User,
  Bell,
  CheckCheck,
  Moon,
  Sun,
  Loader2,
  Lock,
  UserCog,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';

export default function App() {
  const { user, loading, isAuthenticated, logout, hasPermission } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('smartagri_theme') || 'dark';
  });

  const [notifications, setNotifications] = useState([
    { id: 1, message: "Urgent: NPK batch #NPK-2026-B12 expiring in 18 days.", time: "10m ago", read: false, type: "warning" },
    { id: 2, message: "Sales Order SO-00261 confirmed by Bangalore Agro.", time: "45m ago", read: false, type: "success" },
    { id: 3, message: "Customer 'Hindustan Fertilizers' credit utilization at 92%.", time: "2h ago", read: true, type: "info" }
  ]);

  // Apply theme to HTML document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('smartagri_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Sync state with hash route
  useEffect(() => {
    const handleHashChange = () => {
      const rawHash = window.location.hash.replace('#', '');
      const viewName = rawHash.split('?')[0];
      if (viewName) {
        setCurrentView(viewName);
      } else {
        setCurrentView('dashboard');
      }
      setShowNotifications(false);
      setSidebarOpen(false); // Close mobile sidebar on route switch
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
          <div style={styles.loadingLogo}>
            <Sprout size={36} color="#10b981" />
          </div>
          <Loader2 size={36} color="#10b981" style={styles.spinner} />
          <h3 style={{ marginTop: '1.25rem', color: '#f1f5f9', fontSize: '1.125rem', fontWeight: 700 }}>
            SmartAgri ERP
          </h3>
          <p style={{ marginTop: '0.25rem', color: '#94a3b8', fontSize: '0.875rem' }}>
            Initializing enterprise workspace...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // Sidebar navigation sections with permissions
  const navSections = [
    {
      title: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, permission: 'dashboard.view' }
      ]
    },
    {
      title: 'Catalog & Inventory',
      items: [
        { id: 'products', label: 'Products & Categories', icon: <Package size={18} />, permission: 'products.view' },
        { id: 'inventory', label: 'Batch Inventory & FEFO', icon: <Boxes size={18} />, permission: 'inventory.view' },
        { id: 'pricing', label: 'Bulk Pricing Engine', icon: <Tag size={18} />, permission: 'products.view' }
      ]
    },
    {
      title: 'Sales & Finance',
      items: [
        { id: 'customers', label: 'Customers & Credit', icon: <Users size={18} />, permission: 'customers.view' },
        { id: 'sales', label: 'Sales Orders', icon: <ShoppingCart size={18} />, permission: 'sales.view' },
        { id: 'invoices', label: 'Invoices & Payments', icon: <Receipt size={18} />, permission: 'invoices.view' }
      ]
    },
    {
      title: 'AI & Intelligence',
      items: [
        { id: 'forecast', label: 'AgriForecast AI', icon: <TrendingUp size={18} />, permission: 'dashboard.view' },
        { id: 'reports', label: 'Analytics & Reports', icon: <BarChart3 size={18} />, permission: 'dashboard.view' },
        { id: 'users', label: 'User Management', icon: <UserCog size={18} />, permission: 'users.manage' }
      ]
    }
  ];

  // Flattened for authorization check
  const allNavItems = navSections.flatMap(s => s.items);
  const currentNavItem = allNavItems.find(item => item.id === currentView) || { label: 'Dashboard', permission: 'dashboard.view' };
  const isAuthorized = hasPermission(currentNavItem.permission);

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const renderActiveView = () => {
    if (!isAuthorized) {
      return (
        <div style={styles.unauthContainer}>
          <div className="card" style={styles.unauthCard}>
            <div style={styles.unauthIconBox}>
              <Lock size={32} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Access Restricted
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '360px', margin: '0 auto' }}>
              Your current account role (<strong style={{ color: 'var(--brand-500)' }}>{user.role}</strong>) does not have permission <code>{currentNavItem?.permission}</code> to access this module.
            </p>
            <a href="#dashboard" className="btn btn-primary" style={{ marginTop: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              Return to Dashboard
            </a>
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
      case 'pricing':
        return <PricingView />;
      case 'sales':
        return <SalesOrdersView />;
      case 'invoices':
        return <InvoicesView />;
      case 'forecast':
        return <AgriForecastView />;
      case 'reports':
        return <ReportsView />;
      case 'users':
        return <UsersView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="app-container">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={styles.mobileOverlay}
        />
      )}

      {/* Enterprise Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <Sprout size={22} color="#10b981" />
          </div>
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-name">
              SmartAgri <span>ERP</span>
            </div>
            <div className="sidebar-brand-sub">Fertilizer Mfg & Dist</div>
          </div>
        </div>

        {/* Grouped Navigation */}
        <nav className="sidebar-nav">
          {navSections.map((section, sIdx) => {
            const visibleItems = section.items.filter(item => hasPermission(item.permission));
            if (visibleItems.length === 0) return null;

            return (
              <React.Fragment key={section.title || sIdx}>
                <div className="nav-section-label">{section.title}</div>
                {visibleItems.map(item => {
                  const isActive = currentView === item.id;
                  return (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                      title={item.label}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                    </a>
                  );
                })}
              </React.Fragment>
            );
          })}
        </nav>

        {/* User Card in Sidebar Footer */}
        <div className="sidebar-user">
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-user-name" title={user.name}>{user.name}</div>
              <div className="sidebar-user-role">{user.role}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main App Container */}
      <main className="main-content">
        {/* Header Bar */}
        <header className="header">
          <div className="header-left">
            <button 
              className="header-icon-btn mobile-menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title="Toggle Navigation Menu"
              style={{ display: 'none' }}
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            <div>
              <div className="header-breadcrumb">
                <span>SmartAgri ERP</span>
                <ChevronRight size={12} className="header-breadcrumb-sep" />
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{currentNavItem.label}</span>
              </div>
            </div>
          </div>

          <div className="header-right">
            {/* Live System Health Badge */}
            <div className="header-org-badge" title="Backend Server Status: Connected">
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Online</span>
            </div>

            {/* Organization Tag */}
            {user.organizationName && (
              <span className="badge badge-primary" style={{ textTransform: 'none', fontWeight: 600 }}>
                {user.organizationName}
              </span>
            )}

            {/* Notification Bell */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)} 
                className="header-icon-btn" 
                title="System Notifications"
              >
                <Bell size={17} />
                {unreadCount > 0 && <span className="header-badge">{unreadCount}</span>}
              </button>

              {showNotifications && (
                <div style={styles.notificationDropdown}>
                  <div style={styles.dropdownHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Bell size={15} color="var(--brand-500)" />
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>Notifications</span>
                    </div>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} style={styles.markReadBtn}>
                        <CheckCheck size={13} /> Mark all read
                      </button>
                    )}
                  </div>
                  <div style={styles.dropdownList}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                        No notifications
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n.id} 
                          style={{ 
                            ...styles.dropdownItem, 
                            borderLeft: n.read ? '3px solid transparent' : '3px solid var(--brand-500)',
                            backgroundColor: n.read ? 'transparent' : 'rgba(16, 185, 129, 0.04)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <p style={{ ...styles.dropdownMsg, color: n.read ? 'var(--text-secondary)' : 'var(--text-primary)', fontWeight: n.read ? 400 : 500 }}>
                              {n.message}
                            </p>
                          </div>
                          <span style={styles.dropdownTime}>{n.time}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle Button */}
            <button 
              onClick={toggleTheme} 
              className="theme-toggle" 
              title={theme === 'dark' ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Logout Button */}
            <button onClick={logout} className="logout-btn" title="Sign out of SmartAgri">
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="content-body">
          <ErrorBoundary onReset={() => setCurrentView('dashboard')}>
            {renderActiveView()}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

const styles = {
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: 'var(--bg-app)',
  },
  loadingCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'var(--surface-1)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '16px',
    padding: '3rem 2.5rem',
    boxShadow: 'var(--shadow-xl)',
    minWidth: '280px',
  },
  loadingLogo: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    background: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1.25rem',
  },
  spinner: {
    animation: 'spin 1s linear infinite',
  },
  unauthContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '4rem 2rem',
    minHeight: '60vh',
  },
  unauthCard: {
    maxWidth: '440px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '2.5rem',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    background: 'var(--surface-1)',
    borderRadius: '16px',
    boxShadow: 'var(--shadow-lg)',
  },
  unauthIconBox: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1.25rem',
  },
  notificationDropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    width: '340px',
    backgroundColor: 'var(--surface-1)',
    border: '1px solid var(--border-default)',
    borderRadius: '12px',
    boxShadow: 'var(--shadow-xl)',
    zIndex: 100,
    overflow: 'hidden',
  },
  dropdownHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: 'var(--surface-2)',
    borderBottom: '1px solid var(--border-subtle)',
  },
  markReadBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--brand-500)',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '11px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  dropdownList: {
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '280px',
    overflowY: 'auto',
  },
  dropdownItem: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--border-subtle)',
    transition: 'background 0.15s ease',
  },
  dropdownMsg: {
    fontSize: '12px',
    lineHeight: 1.5,
  },
  dropdownTime: {
    fontSize: '10px',
    color: 'var(--text-tertiary)',
    marginTop: '4px',
    display: 'block',
  },
  mobileOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 25,
  }
};
