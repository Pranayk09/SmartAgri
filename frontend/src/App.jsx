import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
  Activity 
} from 'lucide-react';

export default function App() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get('/api/health')
      .then(response => {
        setHealth(response.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Backend health check error:', err);
        setError(err.message || 'Failed to connect to backend server');
        setLoading(false);
      });
  }, []);

  return (
    <div className="app-container">
      {/* Sidebar Navigation Shell */}
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

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <a href="#dashboard" style={navItemStyle(true)}>
            <LayoutDashboard size={18} /> Dashboard
          </a>
          <a href="#products" style={navItemStyle(false)}>
            <Package size={18} /> Products
          </a>
          <a href="#inventory" style={navItemStyle(false)}>
            <Boxes size={18} /> Batch Inventory & FEFO
          </a>
          <a href="#customers" style={navItemStyle(false)}>
            <Users size={18} /> Customers & Credit
          </a>
          <a href="#sales" style={navItemStyle(false)}>
            <ShoppingCart size={18} /> Sales Orders
          </a>
          <a href="#invoices" style={navItemStyle(false)}>
            <Receipt size={18} /> Invoices & Payments
          </a>
          <a href="#reports" style={navItemStyle(false)}>
            <BarChart3 size={18} /> Analytics & Reports
          </a>
        </nav>
      </aside>

      {/* Main App Content Container */}
      <main className="main-content">
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} color="#10b981" />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8' }}>System Status:</span>
            {loading ? (
              <span className="badge badge-warning">CONNECTING...</span>
            ) : error ? (
              <span className="badge badge-danger">BACKEND DISCONNECTED</span>
            ) : (
              <span className="badge badge-success">ONLINE (PERN ESM)</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="badge badge-info">ORGANIZATION: AGRI-CHEM CORP</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f8fafc', fontSize: '0.875rem', fontWeight: 600 }}>
              <ShieldCheck size={18} color="#3b82f6" /> OWNER
            </div>
          </div>
        </header>

        <div className="content-body">
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>
              Phase 1 Checkpoint - Environment & Architecture Setup
            </h2>
            <p style={{ color: '#94a3b8', marginTop: '0.25rem' }}>
              Agricultural Fertilizer Manufacturing & Distribution Steel Thread MVP
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            <div className="card">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', color: '#10b981' }}>
                📡 Backend API Health
              </h3>
              {loading ? (
                <p style={{ color: '#94a3b8' }}>Checking connection to Node.js / Express server...</p>
              ) : error ? (
                <div style={{ color: '#ef4444' }}>
                  <p><strong>Connection Error:</strong> {error}</p>
                  <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: '#94a3b8' }}>
                    Ensure the backend server is running on port 5000 (`npm run dev` in backend directory).
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <div><strong>System:</strong> {health?.system}</div>
                  <div><strong>Environment:</strong> <span className="badge badge-info">{health?.environment}</span></div>
                  <div><strong>Timestamp:</strong> {health?.timestamp}</div>
                  <div><strong>Status Code:</strong> <span className="badge badge-success">200 OK</span></div>
                </div>
              )}
            </div>

            <div className="card">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', color: '#3b82f6' }}>
                🗄️ Database & Prisma ORM
              </h3>
              <div style={{ fontSize: '0.875rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div><strong>Stack:</strong> PERN (PostgreSQL, Express, React, Node.js)</div>
                <div><strong>ORM Layer:</strong> Prisma 5.10 with PostgreSQL Schema</div>
                <div><strong>Module Type:</strong> ES Modules JavaScript (`"type": "module"`)</div>
                <div><strong>Entity Count:</strong> 18 Core Tables Defined</div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', color: '#f59e0b' }}>
                🌾 Steel Thread Target Workflow
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.6 }}>
                NPK 19-19-19 (10,000 KG Order) → FEFO Expiry Selection (B001, B002) → Bulk Price Calculation → Credit Limit Verification → Stock Reservation → Dispatch → Invoice Generation → Customer Payment → Dashboard KPIs.
              </p>
            </div>
          </div>
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
    backgroundColor: isActive ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
    textDecoration: 'none',
    fontWeight: isActive ? 700 : 500,
    fontSize: '0.875rem',
    borderLeft: isActive ? '3px solid #10b981' : '3px solid transparent',
  };
}
