import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Pencil, Trash, X, Loader2, FolderHeart, ShieldAlert } from 'lucide-react';

export default function ProductsView() {
  const { showToast } = useToast();
  const { hasPermission } = useAuth();
  
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals visibility
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // { type: 'product'|'category', id, name }

  // Editing state
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  // Forms state
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    status: 'ACTIVE'
  });

  const [productForm, setProductForm] = useState({
    categoryId: '',
    name: '',
    sku: '',
    unit: 'KG',
    defaultSellingPrice: '',
    minimumStock: '',
    status: 'ACTIVE'
  });

  // Fetch all products and categories
  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        axios.get('/api/products'),
        axios.get('/api/categories')
      ]);
      if (prodRes.data.success) setProducts(prodRes.data.data);
      if (catRes.data.success) setCategories(catRes.data.data);
    } catch (error) {
      const errMsg = error.response?.data?.error?.message || error.message || 'Failed to fetch catalog data.';
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Category Submit
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      showToast('Category name is required.', 'warning');
      return;
    }

    try {
      let response;
      if (editingCategory) {
        response = await axios.put(`/api/categories/${editingCategory.id}`, categoryForm);
        showToast('Category updated successfully!', 'success');
      } else {
        response = await axios.post('/api/categories', categoryForm);
        showToast('Category created successfully!', 'success');
      }

      if (response.data.success) {
        closeCategoryModal();
        fetchData();
      }
    } catch (error) {
      const errMsg = error.response?.data?.error?.message || error.message || 'Error saving category.';
      showToast(errMsg, 'error');
    }
  };

  // Product Submit
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    const { categoryId, name, sku, unit, defaultSellingPrice, minimumStock } = productForm;
    if (!categoryId || !name.trim() || !sku.trim() || defaultSellingPrice === '') {
      showToast('Please fill all required fields.', 'warning');
      return;
    }

    try {
      let response;
      const payload = {
        ...productForm,
        defaultSellingPrice: parseFloat(defaultSellingPrice),
        minimumStock: parseFloat(minimumStock || 0)
      };

      if (editingProduct) {
        response = await axios.put(`/api/products/${editingProduct.id}`, payload);
        showToast('Product updated successfully!', 'success');
      } else {
        response = await axios.post('/api/products', payload);
        showToast('Product created successfully!', 'success');
      }

      if (response.data.success) {
        closeProductModal();
        fetchData();
      }
    } catch (error) {
      const errMsg = error.response?.data?.error?.message || error.message || 'Error saving product.';
      showToast(errMsg, 'error');
    }
  };

  // Delete Action
  const handleDeleteConfirmSubmit = async () => {
    if (!showDeleteConfirm) return;
    const { type, id } = showDeleteConfirm;

    try {
      if (type === 'category') {
        const response = await axios.delete(`/api/categories/${id}`);
        if (response.data.success) {
          showToast('Category deleted successfully.', 'success');
          fetchData();
        }
      } else if (type === 'product') {
        const response = await axios.delete(`/api/products/${id}`);
        if (response.data.success) {
          showToast('Product deleted successfully.', 'success');
          fetchData();
        }
      }
    } catch (error) {
      const errMsg = error.response?.data?.error?.message || error.message || `Failed to delete ${type}.`;
      showToast(errMsg, 'error');
    } finally {
      setShowDeleteConfirm(null);
    }
  };

  // Modal handlers
  const openCategoryModal = (cat = null) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryForm({
        name: cat.name,
        description: cat.description || '',
        status: cat.status
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '', status: 'ACTIVE' });
    }
    setShowCategoryModal(true);
  };

  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    setEditingCategory(null);
  };

  const openProductModal = (prod = null) => {
    if (prod) {
      setEditingProduct(prod);
      setProductForm({
        categoryId: prod.categoryId,
        name: prod.name,
        sku: prod.sku,
        unit: prod.unit,
        defaultSellingPrice: prod.defaultSellingPrice,
        minimumStock: prod.minimumStock,
        status: prod.status
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        categoryId: categories.length > 0 ? categories[0].id : '',
        name: '',
        sku: '',
        unit: 'KG',
        defaultSellingPrice: '',
        minimumStock: '0',
        status: 'ACTIVE'
      });
    }
    setShowProductModal(true);
  };

  const closeProductModal = () => {
    setShowProductModal(false);
    setEditingProduct(null);
  };

  const canCreate = hasPermission('products.create');
  const canUpdate = hasPermission('products.update');
  const canDelete = hasPermission('products.delete');

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Product & Category Catalog</h2>
          <p style={styles.subtitle}>Define categories and finished products with default pricing rules and safety margins.</p>
        </div>
        {canCreate && (
          <button 
            onClick={() => activeTab === 'products' ? openProductModal() : openCategoryModal()} 
            style={styles.addBtn}
          >
            <Plus size={16} /> Add {activeTab === 'products' ? 'Product' : 'Category'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={styles.tabsContainer}>
        <button 
          onClick={() => setActiveTab('products')} 
          style={{ 
            ...styles.tab, 
            borderBottom: activeTab === 'products' ? '2px solid #10b981' : '2px solid transparent', 
            color: activeTab === 'products' ? '#10b981' : '#94a3b8' 
          }}
        >
          Finished Products ({products.length})
        </button>
        <button 
          onClick={() => setActiveTab('categories')} 
          style={{ 
            ...styles.tab, 
            borderBottom: activeTab === 'categories' ? '2px solid #10b981' : '2px solid transparent', 
            color: activeTab === 'categories' ? '#10b981' : '#94a3b8' 
          }}
        >
          Product Categories ({categories.length})
        </button>
      </div>

      {loading ? (
        <div style={styles.loadingState}>
          <Loader2 size={36} style={styles.spinner} />
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Loading catalog items...</p>
        </div>
      ) : activeTab === 'products' ? (
        products.length === 0 ? (
          <div style={styles.emptyState}>
            <FolderHeart size={48} color="#475569" style={{ marginBottom: '1rem' }} />
            <h4 style={{ color: '#cbd5e1', marginBottom: '0.5rem' }}>No Products Defined</h4>
            <p style={{ color: '#64748b', fontSize: '0.8125rem', maxWidth: '360px', marginBottom: '1.5rem' }}>
              Define finished product profiles to track batch inventories, credit lines, and customer distributions.
            </p>
            {canCreate && (
              <button onClick={() => openProductModal()} style={styles.addBtn}>
                <Plus size={16} /> Add First Product
              </button>
            )}
          </div>
        ) : (
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
                  <th style={styles.th}>Status</th>
                  {(canUpdate || canDelete) && <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} style={styles.tr}>
                    <td style={{ ...styles.td, fontFamily: 'var(--font-mono)', color: '#3b82f6', fontWeight: 600 }}>{p.sku}</td>
                    <td style={{ ...styles.td, fontWeight: 700 }}>{p.name}</td>
                    <td style={styles.td}>{p.category?.name || 'N/A'}</td>
                    <td style={styles.td}>₹{p.defaultSellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={styles.td}>{p.minimumStock.toLocaleString()}</td>
                    <td style={styles.td}><span className="badge badge-info">{p.unit}</span></td>
                    <td style={styles.td}>
                      <span className={`badge ${p.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                        {p.status}
                      </span>
                    </td>
                    {(canUpdate || canDelete) && (
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <div style={styles.actions}>
                          {canUpdate && (
                            <button onClick={() => openProductModal(p)} style={styles.iconBtn} title="Edit Product">
                              <Pencil size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => setShowDeleteConfirm({ type: 'product', id: p.id, name: p.name })} style={styles.iconBtnDanger} title="Delete Product">
                              <Trash size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        categories.length === 0 ? (
          <div style={styles.emptyState}>
            <FolderHeart size={48} color="#475569" style={{ marginBottom: '1rem' }} />
            <h4 style={{ color: '#cbd5e1', marginBottom: '0.5rem' }}>No Categories Found</h4>
            <p style={{ color: '#64748b', fontSize: '0.8125rem', maxWidth: '360px', marginBottom: '1.5rem' }}>
              Create categories to group chemical formulas, micro-nutrients, and bulk crop soil supplements.
            </p>
            {canCreate && (
              <button onClick={() => openCategoryModal()} style={styles.addBtn}>
                <Plus size={16} /> Add First Category
              </button>
            )}
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.theadRow}>
                  <th style={styles.th}>Category Name</th>
                  <th style={styles.th}>Description</th>
                  <th style={styles.th}>Status</th>
                  {(canUpdate || canDelete) && <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} style={styles.tr}>
                    <td style={{ ...styles.td, fontWeight: 700 }}>{c.name}</td>
                    <td style={styles.td}>{c.description || <em style={{ color: '#475569' }}>No description</em>}</td>
                    <td style={styles.td}>
                      <span className={`badge ${c.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                        {c.status}
                      </span>
                    </td>
                    {(canUpdate || canDelete) && (
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <div style={styles.actions}>
                          {canUpdate && (
                            <button onClick={() => openCategoryModal(c)} style={styles.iconBtn} title="Edit Category">
                              <Pencil size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => setShowDeleteConfirm({ type: 'category', id: c.id, name: c.name })} style={styles.iconBtnDanger} title="Delete Category">
                              <Trash size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ========================================== */}
      {/* CATEGORY FORM MODAL                        */}
      {/* ========================================== */}
      {showCategoryModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {editingCategory ? 'Edit Category' : 'Create Product Category'}
              </h3>
              <button onClick={closeCategoryModal} style={styles.closeBtn}><X size={18} /></button>
            </div>
            <form onSubmit={handleCategorySubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Category Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  type="text" 
                  style={styles.input} 
                  placeholder="e.g. NPK Complex Fertilizers"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Description</label>
                <textarea 
                  style={styles.textarea} 
                  placeholder="Describe chemical compound profile or safety storage guidance..."
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Status</label>
                <select 
                  style={styles.select}
                  value={categoryForm.status}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
              <div style={styles.modalFooter}>
                <button type="button" onClick={closeCategoryModal} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" style={styles.submitBtn}>
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* PRODUCT FORM MODAL                         */}
      {/* ========================================== */}
      {showProductModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {editingProduct ? 'Edit Product Catalog' : 'Add New Finished Product'}
              </h3>
              <button onClick={closeProductModal} style={styles.closeBtn}><X size={18} /></button>
            </div>
            <form onSubmit={handleProductSubmit} style={styles.form}>
              <div style={styles.formRow}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Category <span style={{ color: '#ef4444' }}>*</span></label>
                  <select 
                    style={styles.select}
                    value={productForm.categoryId}
                    onChange={(e) => setProductForm(prev => ({ ...prev, categoryId: e.target.value }))}
                    required
                  >
                    <option value="" disabled>Select Category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Product SKU <span style={{ color: '#ef4444' }}>*</span></label>
                  <input 
                    type="text" 
                    style={styles.input} 
                    placeholder="e.g. NPK-191919-50KG"
                    value={productForm.sku}
                    onChange={(e) => setProductForm(prev => ({ ...prev, sku: e.target.value }))}
                    required
                    disabled={!!editingProduct} // SKU shouldn't change to prevent stock mismatch
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Product Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  type="text" 
                  style={styles.input} 
                  placeholder="e.g. NPK 19-19-19 Premium Fertilizer"
                  value={productForm.name}
                  onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div style={styles.formRow}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Unit of Measure <span style={{ color: '#ef4444' }}>*</span></label>
                  <select 
                    style={styles.select}
                    value={productForm.unit}
                    onChange={(e) => setProductForm(prev => ({ ...prev, unit: e.target.value }))}
                    required
                  >
                    <option value="KG">KG (Kilogram)</option>
                    <option value="LITER">LITER (Liquid)</option>
                    <option value="BAG">BAG (50KG Sacks)</option>
                    <option value="TON">TON (Bulk Metric)</option>
                  </select>
                </div>

                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Base Price (₹) <span style={{ color: '#ef4444' }}>*</span></label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    style={styles.input} 
                    placeholder="0.00"
                    value={productForm.defaultSellingPrice}
                    onChange={(e) => setProductForm(prev => ({ ...prev, defaultSellingPrice: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Min Safety Stock</label>
                  <input 
                    type="number" 
                    min="0"
                    style={styles.input} 
                    placeholder="0"
                    value={productForm.minimumStock}
                    onChange={(e) => setProductForm(prev => ({ ...prev, minimumStock: e.target.value }))}
                  />
                </div>

                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Status</label>
                  <select 
                    style={styles.select}
                    value={productForm.status}
                    onChange={(e) => setProductForm(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={closeProductModal} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" style={styles.submitBtn}>
                  {editingProduct ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* DELETE CONFIRMATION OVERLAY (sleek alert) */}
      {/* ========================================== */}
      {showDeleteConfirm && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalCard, maxWidth: '400px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={styles.alertIconBg}>
                <ShieldAlert size={28} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#f8fafc', margin: '1rem 0 0.5rem 0' }}>
                Confirm Delete Action
              </h3>
              <p style={{ fontSize: '0.8125rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                Are you sure you want to delete the {showDeleteConfirm.type} <strong style={{ color: '#f8fafc' }}>"{showDeleteConfirm.name}"</strong>? This operation is permanent.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
                <button onClick={() => setShowDeleteConfirm(null)} style={{ ...styles.cancelBtn, flex: 1 }}>Cancel</button>
                <button onClick={handleDeleteConfirmSubmit} style={{ ...styles.deleteBtn, flex: 1 }}>Delete</button>
              </div>
            </div>
          </div>
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
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '4rem 0',
  },
  spinner: {
    animation: 'spin 1s linear infinite',
    color: '#10b981',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '4rem 2rem',
    background: 'rgba(30, 41, 59, 0.2)',
    border: '1px dashed #334155',
    borderRadius: '12px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(11, 15, 23, 0.7)',
    backdropFilter: 'blur(8px)',
    zIndex: 999,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '1.5rem',
  },
  modalCard: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '560px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.5rem',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #334155',
    paddingBottom: '1rem',
    marginBottom: '1.25rem',
  },
  modalTitle: {
    fontSize: '1.125rem',
    fontWeight: 800,
    color: '#f8fafc',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.25rem',
    borderRadius: '6px',
    transition: 'all 0.2s ease',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  formRow: {
    display: 'flex',
    gap: '1rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  label: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#94a3b8',
  },
  input: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '0.625rem 0.875rem',
    color: '#cbd5e1',
    fontSize: '0.8125rem',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  textarea: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '0.625rem 0.875rem',
    color: '#cbd5e1',
    fontSize: '0.8125rem',
    outline: 'none',
    minHeight: '80px',
    resize: 'vertical',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
  },
  select: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '0.625rem 0.875rem',
    color: '#cbd5e1',
    fontSize: '0.8125rem',
    outline: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    borderTop: '1px solid #334155',
    paddingTop: '1.25rem',
    marginTop: '0.5rem',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    border: '1px solid #334155',
    color: '#cbd5e1',
    borderRadius: '8px',
    padding: '0.625rem 1rem',
    fontSize: '0.8125rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  submitBtn: {
    backgroundColor: '#059669',
    border: 'none',
    color: '#ffffff',
    borderRadius: '8px',
    padding: '0.625rem 1.25rem',
    fontSize: '0.8125rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  deleteBtn: {
    backgroundColor: '#ef4444',
    border: 'none',
    color: '#ffffff',
    borderRadius: '8px',
    padding: '0.625rem 1.25rem',
    fontSize: '0.8125rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  alertIconBg: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
};
