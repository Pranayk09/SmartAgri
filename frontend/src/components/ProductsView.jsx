import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Loader2, 
  FolderHeart, 
  Upload, 
  Search, 
  Filter, 
  Layers, 
  Package, 
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown
} from 'lucide-react';
import BulkImportModal from './BulkImportModal';

export default function ProductsView() {
  const { showToast } = useToast();
  const { hasPermission } = useAuth();
  
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // Modals visibility
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // { type: 'product'|'category', id, name }
  const [showBulkImport, setShowBulkImport] = useState(false);

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

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategoryFilter === 'ALL' || p.categoryId === selectedCategoryFilter;
      const matchesStatus = selectedStatusFilter === 'ALL' || p.status === selectedStatusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchQuery, selectedCategoryFilter, selectedStatusFilter]);

  // Filtered Categories
  const filteredCategories = useMemo(() => {
    return categories.filter(c => {
      const matchesSearch = 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = selectedStatusFilter === 'ALL' || c.status === selectedStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [categories, searchQuery, selectedStatusFilter]);

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
      const payload = {
        ...productForm,
        defaultSellingPrice: parseFloat(defaultSellingPrice),
        minimumStock: parseInt(minimumStock, 10) || 0
      };

      let response;
      if (editingProduct) {
        response = await axios.put(`/api/products/${editingProduct.id}`, payload);
        showToast('Product updated successfully!', 'success');
      } else {
        response = await axios.post('/api/products', payload);
        showToast('Product registered successfully!', 'success');
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
  const handleDeleteConfirm = async () => {
    if (!showDeleteConfirm) return;
    const { type, id } = showDeleteConfirm;

    try {
      const endpoint = type === 'product' ? `/api/products/${id}` : `/api/categories/${id}`;
      const response = await axios.delete(endpoint);
      if (response.data.success) {
        showToast(`${type === 'product' ? 'Product' : 'Category'} removed successfully!`, 'success');
        fetchData();
      }
    } catch (error) {
      const errMsg = error.response?.data?.error?.message || error.message || 'Error deleting item.';
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
      {/* Page Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Product & Category Catalog</h2>
          <p style={styles.subtitle}>
            Standardized chemical formulas, NPK blends, safety stocks, and wholesale pricing.
          </p>
        </div>
        {canCreate && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowBulkImport(true)}
              className="btn btn-secondary"
              title="Import products from Excel or CSV file"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Upload size={15} />
              <span>Bulk Import (Excel/CSV)</span>
            </button>
            <button 
              onClick={() => activeTab === 'products' ? openProductModal() : openCategoryModal()} 
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={16} />
              <span>Add {activeTab === 'products' ? 'Product' : 'Category'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Summary KPI Strip */}
      <div style={styles.statGrid}>
        <div className="card" style={styles.statCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ ...styles.statIcon, backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
              <Package size={20} />
            </div>
            <div>
              <div style={styles.statLabel}>Total Products</div>
              <div style={styles.statValue}>{products.length}</div>
            </div>
          </div>
        </div>

        <div className="card" style={styles.statCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ ...styles.statIcon, backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
              <Layers size={20} />
            </div>
            <div>
              <div style={styles.statLabel}>Categories</div>
              <div style={styles.statValue}>{categories.length}</div>
            </div>
          </div>
        </div>

        <div className="card" style={styles.statCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ ...styles.statIcon, backgroundColor: 'rgba(167, 139, 250, 0.12)', color: '#a78bfa' }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div style={styles.statLabel}>Active SKUs</div>
              <div style={styles.statValue}>{products.filter(p => p.status === 'ACTIVE').length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar: Tabs + Search & Filters */}
      <div className="card" style={styles.controlsCard}>
        <div style={styles.controlsLeft}>
          <div className="tab-group" style={{ margin: 0 }}>
            <button 
              onClick={() => setActiveTab('products')} 
              className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
            >
              Finished Products ({products.length})
            </button>
            <button 
              onClick={() => setActiveTab('categories')} 
              className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
            >
              Product Categories ({categories.length})
            </button>
          </div>
        </div>

        <div style={styles.controlsRight}>
          {/* Search Box */}
          <div style={styles.searchBox}>
            <Search size={15} color="var(--text-tertiary)" style={{ position: 'absolute', left: '12px' }} />
            <input 
              type="text"
              placeholder={activeTab === 'products' ? "Search SKU or Name..." : "Search Categories..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                style={styles.searchClearBtn}
                title="Clear Search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Category Filter for Products Tab */}
          {activeTab === 'products' && (
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="form-select"
              style={{ width: 'auto', minWidth: '150px', height: '38px', padding: '0 12px', fontSize: '13px' }}
            >
              <option value="ALL">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="form-select"
            style={{ width: 'auto', minWidth: '120px', height: '38px', padding: '0 12px', fontSize: '13px' }}
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={styles.loadingState}>
          <Loader2 size={36} className="spin" color="var(--brand-500)" />
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '12px', fontWeight: 600 }}>
            Loading catalog data...
          </p>
        </div>
      ) : activeTab === 'products' ? (
        filteredProducts.length === 0 ? (
          <div className="card" style={styles.emptyState}>
            <FolderHeart size={44} color="var(--text-tertiary)" style={{ marginBottom: '12px' }} />
            <h4 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
              {products.length === 0 ? 'No Products Registered' : 'No Matching Products Found'}
            </h4>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', maxWidth: '380px', marginBottom: '18px', lineHeight: 1.5 }}>
              {products.length === 0 
                ? 'Define finished fertilizer products or import an Excel/CSV spreadsheet to start managing batches.' 
                : 'Try adjusting your search query or category filters to find the products you need.'}
            </p>
            {canCreate && products.length === 0 && (
              <button onClick={() => openProductModal()} className="btn btn-primary">
                <Plus size={16} /> Register First Product
              </button>
            )}
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
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
                  {filteredProducts.map((p) => (
                    <tr key={p.id} style={styles.tr}>
                      <td style={styles.td}>
                        <span style={styles.skuTag}>{p.sku}</span>
                      </td>
                      <td style={{ ...styles.td, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {p.name}
                      </td>
                      <td style={styles.td}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                          {p.category?.name || 'Unassigned'}
                        </span>
                      </td>
                      <td style={{ ...styles.td, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        ₹{Number(p.defaultSellingPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ ...styles.td, fontFamily: 'var(--font-mono)' }}>
                        {Number(p.minimumStock).toLocaleString()}
                      </td>
                      <td style={styles.td}>
                        <span className="badge badge-info" style={{ fontSize: '10px' }}>{p.unit}</span>
                      </td>
                      <td style={styles.td}>
                        <span className={`badge ${p.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                          {p.status}
                        </span>
                      </td>
                      {(canUpdate || canDelete) && (
                        <td style={{ ...styles.td, textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            {canUpdate && (
                              <button 
                                onClick={() => openProductModal(p)} 
                                style={styles.iconBtn} 
                                title="Edit Product"
                              >
                                <Pencil size={14} />
                              </button>
                            )}
                            {canDelete && (
                              <button 
                                onClick={() => setShowDeleteConfirm({ type: 'product', id: p.id, name: p.name })} 
                                style={styles.iconBtnDanger} 
                                title="Delete Product"
                              >
                                <Trash2 size={14} />
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
          </div>
        )
      ) : (
        filteredCategories.length === 0 ? (
          <div className="card" style={styles.emptyState}>
            <FolderHeart size={44} color="var(--text-tertiary)" style={{ marginBottom: '12px' }} />
            <h4 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
              {categories.length === 0 ? 'No Categories Found' : 'No Matching Categories'}
            </h4>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', maxWidth: '380px', marginBottom: '18px', lineHeight: 1.5 }}>
              Create categories to group complex compounds, bulk nutrients, and organic supplements.
            </p>
            {canCreate && categories.length === 0 && (
              <button onClick={() => openCategoryModal()} className="btn btn-primary">
                <Plus size={16} /> Add First Category
              </button>
            )}
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Category Name</th>
                    <th style={styles.th}>Description</th>
                    <th style={styles.th}>Status</th>
                    {(canUpdate || canDelete) && <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map((c) => (
                    <tr key={c.id} style={styles.tr}>
                      <td style={{ ...styles.td, fontWeight: 700, color: 'var(--text-primary)', width: '240px' }}>
                        {c.name}
                      </td>
                      <td style={styles.td}>
                        <span style={{ color: c.description ? 'var(--text-secondary)' : 'var(--text-tertiary)', fontSize: '13px' }}>
                          {c.description || 'No description provided'}
                        </span>
                      </td>
                      <td style={{ ...styles.td, width: '120px' }}>
                        <span className={`badge ${c.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                          {c.status}
                        </span>
                      </td>
                      {(canUpdate || canDelete) && (
                        <td style={{ ...styles.td, textAlign: 'right', width: '120px' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            {canUpdate && (
                              <button 
                                onClick={() => openCategoryModal(c)} 
                                style={styles.iconBtn} 
                                title="Edit Category"
                              >
                                <Pencil size={14} />
                              </button>
                            )}
                            {canDelete && (
                              <button 
                                onClick={() => setShowDeleteConfirm({ type: 'category', id: c.id, name: c.name })} 
                                style={styles.iconBtnDanger} 
                                title="Delete Category"
                              >
                                <Trash2 size={14} />
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
          </div>
        )
      )}

      {/* ========================================== */}
      {/* CATEGORY FORM MODAL                        */}
      {/* ========================================== */}
      {showCategoryModal && (
        <div style={styles.modalOverlay}>
          <div className="card" style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>
                  {editingCategory ? 'Edit Category' : 'Create Product Category'}
                </h3>
                <p style={styles.modalSubtitle}>Organize product lines and formula families</p>
              </div>
              <button onClick={closeCategoryModal} style={styles.closeBtn}><X size={18} /></button>
            </div>
            <form onSubmit={handleCategorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Category Name <span style={{ color: 'var(--status-danger)' }}>*</span></label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. NPK Complex Fertilizers"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea 
                  className="form-textarea" 
                  placeholder="Describe chemical compound profile or safety storage guidance..."
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select 
                  className="form-select"
                  value={categoryForm.status}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
              <div style={styles.modalFooter}>
                <button type="button" onClick={closeCategoryModal} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">
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
          <div className="card" style={styles.modalCardLarge}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>
                  {editingProduct ? 'Edit Product Catalog' : 'Add New Finished Product'}
                </h3>
                <p style={styles.modalSubtitle}>Specify catalog rules, pricing, and stock minimums</p>
              </div>
              <button onClick={closeProductModal} style={styles.closeBtn}><X size={18} /></button>
            </div>
            <form onSubmit={handleProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={styles.formRow}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Category <span style={{ color: 'var(--status-danger)' }}>*</span></label>
                  <select 
                    className="form-select"
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
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Product SKU <span style={{ color: 'var(--status-danger)' }}>*</span></label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. NPK-191919-50KG"
                    value={productForm.sku}
                    onChange={(e) => setProductForm(prev => ({ ...prev, sku: e.target.value }))}
                    required
                    disabled={!!editingProduct}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Product Name <span style={{ color: 'var(--status-danger)' }}>*</span></label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. NPK 19-19-19 Premium Fertilizer"
                  value={productForm.name}
                  onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div style={styles.formRow}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Base Price (INR) <span style={{ color: 'var(--status-danger)' }}>*</span></label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="e.g. 1450.00"
                    min="0"
                    step="0.01"
                    value={productForm.defaultSellingPrice}
                    onChange={(e) => setProductForm(prev => ({ ...prev, defaultSellingPrice: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Unit of Measure</label>
                  <select 
                    className="form-select"
                    value={productForm.unit}
                    onChange={(e) => setProductForm(prev => ({ ...prev, unit: e.target.value }))}
                  >
                    <option value="KG">KG (Kilograms)</option>
                    <option value="L">L (Liters)</option>
                    <option value="BAG">BAG</option>
                    <option value="TON">TON</option>
                  </select>
                </div>
              </div>

              <div style={styles.formRow}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Safety Minimum Stock</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="e.g. 500"
                    min="0"
                    value={productForm.minimumStock}
                    onChange={(e) => setProductForm(prev => ({ ...prev, minimumStock: e.target.value }))}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Status</label>
                  <select 
                    className="form-select"
                    value={productForm.status}
                    onChange={(e) => setProductForm(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={closeProductModal} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'Save Changes' : 'Register Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* DELETE CONFIRMATION MODAL                  */}
      {/* ========================================== */}
      {showDeleteConfirm && (
        <div style={styles.modalOverlay}>
          <div className="card" style={styles.deleteCard}>
            <div style={styles.deleteIconBox}>
              <AlertTriangle size={28} color="var(--status-danger)" />
            </div>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
              Confirm Deletion
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5, marginBottom: '20px' }}>
              Are you sure you want to delete {showDeleteConfirm.type} <strong style={{ color: 'var(--text-primary)' }}>"{showDeleteConfirm.name}"</strong>? This action cannot be reversed.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', width: '100%' }}>
              <button onClick={() => setShowDeleteConfirm(null)} className="btn btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} className="btn btn-danger" style={{ flex: 1 }}>
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Excel/CSV Import Modal */}
      {showBulkImport && (
        <BulkImportModal
          onClose={() => setShowBulkImport(false)}
          onImportComplete={() => {
            fetchData();
          }}
        />
      )}
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
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  },
  statCard: {
    padding: '16px',
    borderRadius: 'var(--radius-md)',
  },
  statIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    marginTop: '2px',
  },
  controlsCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    flexWrap: 'wrap',
  },
  controlsLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  controlsRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  searchBox: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchInput: {
    height: '38px',
    padding: '0 32px 0 34px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-default)',
    backgroundColor: 'var(--surface-2)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    width: '240px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  searchClearBtn: {
    position: 'absolute',
    right: '8px',
    background: 'none',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  th: {
    padding: '12px 16px',
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderBottom: '1px solid var(--border-subtle)',
    backgroundColor: 'var(--surface-2)',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid var(--border-subtle)',
    transition: 'background-color 0.15s ease',
  },
  td: {
    padding: '14px 16px',
    fontSize: '13px',
    verticalAlign: 'middle',
  },
  skuTag: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--brand-500)',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    padding: '3px 8px',
    borderRadius: '4px',
    border: '1px solid rgba(16, 185, 129, 0.2)',
  },
  iconBtn: {
    padding: '6px',
    borderRadius: '6px',
    border: '1px solid var(--border-subtle)',
    backgroundColor: 'var(--surface-2)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDanger: {
    padding: '6px',
    borderRadius: '6px',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    color: 'var(--status-danger)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center',
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalCard: {
    width: '100%',
    maxWidth: '480px',
    padding: '24px',
    borderRadius: '16px',
    boxShadow: 'var(--shadow-xl)',
  },
  modalCardLarge: {
    width: '100%',
    maxWidth: '560px',
    padding: '24px',
    borderRadius: '16px',
    boxShadow: 'var(--shadow-xl)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
  },
  modalTitle: {
    fontSize: '16px',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  modalSubtitle: {
    fontSize: '12px',
    color: 'var(--text-tertiary)',
    marginTop: '2px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    padding: '4px',
  },
  formRow: {
    display: 'flex',
    gap: '12px',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '12px',
    paddingTop: '16px',
    borderTop: '1px solid var(--border-subtle)',
  },
  deleteCard: {
    width: '100%',
    maxWidth: '400px',
    padding: '28px 24px',
    borderRadius: '16px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  deleteIconBox: {
    width: '54px',
    height: '54px',
    borderRadius: '50%',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  }
};
