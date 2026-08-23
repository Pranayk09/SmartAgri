import React, { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { FolderHeart, Sparkles, Filter, Plus, Pencil, Trash, Table } from 'lucide-react';

export default function ProductsView() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('products');

  const handleAction = (action) => {
    showToast(`Action "${action}" is simulated. CRUD actions will be fully connected in Phase 4!`, 'info');
  };

  const categories = [
    { id: '1', name: 'NPK Complex Fertilizers', desc: 'Nitrogen, Phosphorus, and Potassium mixed compounds', status: 'ACTIVE' },
    { id: '2', name: 'Micronutrients', desc: 'Zinc, Iron, Boron, and Manganese additives', status: 'ACTIVE' },
    { id: '3', name: 'Organic Conditioners', desc: 'Bio-fertilizers and soil enrichments', status: 'ACTIVE' }
  ];

  const products = [
    { id: '1', sku: 'NPK-191919-50KG', name: 'NPK 19-19-19 Premium', category: 'NPK Complex Fertilizers', price: 1450, minStock: 2000, unit: 'BAG' },
    { id: '2', sku: 'NPK-123216-50KG', name: 'NPK 12-32-16 Standard', category: 'NPK Complex Fertilizers', price: 1320, minStock: 1500, unit: 'BAG' },
    { id: '3', sku: 'ZN-SULF-25KG', name: 'Zinc Sulphate Mono', category: 'Micronutrients', price: 850, minStock: 500, unit: 'BAG' },
    { id: '4', sku: 'ORG-HUMIC-1L', name: 'Liquid Humic Bio-Enricher', category: 'Organic Conditioners', price: 340, minStock: 1000, unit: 'LITER' }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Product & Category Catalog</h2>
          <p style={styles.subtitle}>Define categories and finished products with default pricing rules and safety margins.</p>
        </div>
        <button onClick={() => handleAction('Add New')} style={styles.addBtn}>
          <Plus size={16} /> Add {activeTab === 'products' ? 'Product' : 'Category'}
        </button>
      </div>

      {/* Tabs */}
      <div style={styles.tabsContainer}>
        <button 
          onClick={() => setActiveTab('products')} 
          style={{ ...styles.tab, borderBottom: activeTab === 'products' ? '2px solid #10b981' : '2px solid transparent', color: activeTab === 'products' ? '#10b981' : '#94a3b8' }}
        >
          Finished Products ({products.length})
        </button>
        <button 
          onClick={() => setActiveTab('categories')} 
          style={{ ...styles.tab, borderBottom: activeTab === 'categories' ? '2px solid #10b981' : '2px solid transparent', color: activeTab === 'categories' ? '#10b981' : '#94a3b8' }}
        >
          Product Categories ({categories.length})
        </button>
      </div>

      {activeTab === 'products' ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={styles.th}>SKU</th>
                <th style={styles.th}>Product Name</th>
                <th style={styles.th}>Category</th>
                <th style={styles.th}>Base Price</th>
                <th style={styles.th}>Min Stock</th>
                <th style={styles.th}>Unit</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} style={styles.tr}>
                  <td style={{ ...styles.td, fontFamily: 'var(--font-mono)', color: '#3b82f6', fontWeight: 600 }}>{p.sku}</td>
                  <td style={{ ...styles.td, fontWeight: 700 }}>{p.name}</td>
                  <td style={styles.td}>{p.category}</td>
                  <td style={styles.td}>₹{p.price.toLocaleString('en-IN')}</td>
                  <td style={styles.td}>{p.minStock.toLocaleString()}</td>
                  <td style={styles.td}><span className="badge badge-info">{p.unit}</span></td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>
                    <div style={styles.actions}>
                      <button onClick={() => handleAction('Edit Product')} style={styles.iconBtn} title="Edit"><Pencil size={14} /></button>
                      <button onClick={() => handleAction('Delete Product')} style={styles.iconBtnDanger} title="Delete"><Trash size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={styles.th}>Category Name</th>
                <th style={styles.th}>Description</th>
                <th style={styles.th}>Status</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} style={styles.tr}>
                  <td style={{ ...styles.td, fontWeight: 700 }}>{c.name}</td>
                  <td style={styles.td}>{c.desc}</td>
                  <td style={styles.td}><span className="badge badge-success">{c.status}</span></td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>
                    <div style={styles.actions}>
                      <button onClick={() => handleAction('Edit Category')} style={styles.iconBtn} title="Edit"><Pencil size={14} /></button>
                      <button onClick={() => handleAction('Delete Category')} style={styles.iconBtnDanger} title="Delete"><Trash size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
    gap: '1rem',
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
  addBtn: {
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
  tabsContainer: {
    display: 'flex',
    borderBottom: '1px solid #1e293b',
    gap: '1.5rem',
  },
  tab: {
    background: 'none',
    border: 'none',
    padding: '0.75rem 0.5rem',
    fontSize: '0.875rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
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
    transition: 'all 0.2s ease',
    backgroundColor: 'rgba(30, 41, 59, 0.2)',
  },
  td: {
    padding: '1rem 1.5rem',
    color: '#cbd5e1',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.5rem',
  },
  iconBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    color: '#3b82f6',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    padding: '0.375rem',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  iconBtnDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    padding: '0.375rem',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
};
