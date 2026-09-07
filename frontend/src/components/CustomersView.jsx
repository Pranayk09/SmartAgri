import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  CreditCard,
  Plus,
  Edit3,
  Trash2,
  Coins,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  X,
  TrendingUp,
  IndianRupee,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';

// ─── Credit utilization badge helper ────────────────────────────────────────
function UtilizationBar({ pct }) {
  const color = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#10b981';
  const cappedPct = Math.min(pct, 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ flex: 1, height: '6px', borderRadius: '99px', backgroundColor: '#1e293b', overflow: 'hidden' }}>
        <div style={{ width: `${cappedPct}%`, height: '100%', borderRadius: '99px', backgroundColor: color, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color, minWidth: '38px', textAlign: 'right' }}>{pct.toFixed(1)}%</span>
    </div>
  );
}

// ─── Customer type badge colors ──────────────────────────────────────────────
function TypeBadge({ type }) {
  const map = {
    DISTRIBUTOR: 'badge-info',
    DEALER:      'badge-warning',
    RETAILER:    'badge-success',
  };
  return <span className={`badge ${map[type] || 'badge-info'}`}>{type}</span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CustomersView() {
  const { showToast } = useToast();
  const { hasPermission } = useAuth();

  const [activeTab, setActiveTab] = useState('accounts');
  const [customers, setCustomers] = useState([]);
  const [creditSummary, setCreditSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creditLoading, setCreditLoading] = useState(false);

  // Modal states
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null); // null = add mode
  const [creditTarget, setCreditTarget] = useState(null);

  // Form states
  const defaultCustomerForm = {
    name: '', type: 'DISTRIBUTOR', phone: '', email: '',
    address: '', status: 'ACTIVE', creditLimit: '', paymentTermsDays: '30',
  };
  const [customerForm, setCustomerForm] = useState(defaultCustomerForm);
  const [creditForm, setCreditForm] = useState({ creditLimit: '', paymentTermsDays: '', status: 'ACTIVE' });
  const [submitting, setSubmitting] = useState(false);

  const canCreate = hasPermission('customers.create');
  const canUpdate = hasPermission('customers.update');
  const canDelete = hasPermission('customers.delete');
  const canCredit = hasPermission('customers.credit');

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/customers');
      if (res.data.success) setCustomers(res.data.data);
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to load customers.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCreditSummary = useCallback(async () => {
    setCreditLoading(true);
    try {
      const res = await axios.get('/api/customers/credit/summary');
      if (res.data.success) setCreditSummary(res.data.data);
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to load credit summary.', 'error');
    } finally {
      setCreditLoading(false);
    }
  }, []);

  useEffect(() => { fetchCustomers(); }, []);
  useEffect(() => { if (activeTab === 'credit') fetchCreditSummary(); }, [activeTab]);

  // ─── Customer CRUD handlers ─────────────────────────────────────────────────

  const openAddModal = () => {
    setEditingCustomer(null);
    setCustomerForm(defaultCustomerForm);
    setShowCustomerModal(true);
  };

  const openEditModal = (customer) => {
    setEditingCustomer(customer);
    setCustomerForm({
      name: customer.name,
      type: customer.type,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      status: customer.status,
      creditLimit: customer.credit?.creditLimit ?? '',
      paymentTermsDays: customer.credit?.paymentTermsDays ?? 30,
    });
    setShowCustomerModal(true);
  };

  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!customerForm.name.trim()) {
      showToast('Customer name is required.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      if (editingCustomer) {
        // Update profile only (not credit)
        const { creditLimit, paymentTermsDays, ...profileData } = customerForm;
        await axios.put(`/api/customers/${editingCustomer.id}`, profileData);
        showToast('Customer profile updated successfully!', 'success');
      } else {
        await axios.post('/api/customers', customerForm);
        showToast('Customer created successfully!', 'success');
      }
      setShowCustomerModal(false);
      fetchCustomers();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Operation failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (customer) => {
    if (!window.confirm(`Delete customer "${customer.name}"? This cannot be undone.`)) return;
    try {
      const res = await axios.delete(`/api/customers/${customer.id}`);
      showToast(res.data.message || 'Customer removed.', 'success');
      fetchCustomers();
      if (activeTab === 'credit') fetchCreditSummary();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to delete customer.', 'error');
    }
  };

  // ─── Credit management handler ──────────────────────────────────────────────

  const openCreditModal = (customer) => {
    setCreditTarget(customer);
    setCreditForm({
      creditLimit: customer.credit?.creditLimit ?? '',
      paymentTermsDays: customer.credit?.paymentTermsDays ?? 30,
      status: customer.credit?.creditStatus || 'ACTIVE',
    });
    setShowCreditModal(true);
  };

  const handleCreditSubmit = async (e) => {
    e.preventDefault();
    if (!creditTarget) return;
    setSubmitting(true);
    try {
      await axios.put(`/api/customers/${creditTarget.id}/credit`, creditForm);
      showToast('Credit limit updated successfully!', 'success');
      setShowCreditModal(false);
      fetchCustomers();
      if (activeTab === 'credit') fetchCreditSummary();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to update credit limit.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Customers & Credit Management</h2>
          <p style={styles.subtitle}>
            Manage distributor accounts, payment terms, credit lines, and real-time outstanding balances.
          </p>
        </div>
        {canCreate && (
          <button onClick={openAddModal} style={styles.addBtn}>
            <Plus size={16} /> Add Customer
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={styles.tabsContainer}>
        {[
          { key: 'accounts', label: `Customer Accounts (${customers.length})` },
          { key: 'credit',   label: 'Credit Dashboard' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              ...styles.tab,
              borderBottom: activeTab === key ? '2px solid #10b981' : '2px solid transparent',
              color: activeTab === key ? '#10b981' : '#94a3b8',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: Customer Accounts ── */}
      {activeTab === 'accounts' && (
        loading ? (
          <div style={styles.loadingState}>
            <Loader2 size={32} style={styles.spinner} />
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="card" style={styles.emptyState}>
            <Users size={48} color="#475569" style={{ marginBottom: '1rem' }} />
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No customers added yet.</p>
            {canCreate && (
              <button onClick={openAddModal} style={{ ...styles.addBtn, marginTop: '1rem' }}>
                <Plus size={14} /> Add First Customer
              </button>
            )}
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.theadRow}>
                  <th style={styles.th}>Customer Name</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Credit Limit</th>
                  <th style={styles.th}>Outstanding</th>
                  <th style={styles.th}>Available</th>
                  <th style={styles.th}>Terms</th>
                  <th style={styles.th}>Status</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const avail = c.credit?.availableCredit ?? 0;
                  const outstanding = c.credit?.outstandingAmount ?? 0;
                  const limit = c.credit?.creditLimit ?? 0;
                  const overrun = outstanding > limit;
                  const nearLimit = limit > 0 && (outstanding / limit) >= 0.8;

                  return (
                    <tr key={c.id} style={styles.tr}>
                      <td style={{ ...styles.td, fontWeight: 700, color: '#f8fafc' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {overrun && <AlertCircle size={14} color="#ef4444" title="Over credit limit!" />}
                          {!overrun && nearLimit && <AlertTriangle size={14} color="#f59e0b" title="Near limit (>80%)" />}
                          {c.name}
                        </div>
                      </td>
                      <td style={styles.td}><TypeBadge type={c.type} /></td>
                      <td style={{ ...styles.td, color: '#64748b' }}>{c.phone || '—'}</td>
                      <td style={{ ...styles.td, color: '#64748b' }}>{c.email || '—'}</td>
                      <td style={styles.td}>₹{limit.toLocaleString('en-IN')}</td>
                      <td style={{ ...styles.td, color: overrun ? '#ef4444' : nearLimit ? '#f59e0b' : '#cbd5e1', fontWeight: overrun || nearLimit ? 700 : 400 }}>
                        ₹{outstanding.toLocaleString('en-IN')}
                      </td>
                      <td style={{ ...styles.td, color: avail > 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                        ₹{avail.toLocaleString('en-IN')}
                      </td>
                      <td style={styles.td}>{c.credit?.paymentTermsDays ?? '—'} Days</td>
                      <td style={styles.td}>
                        <span className={`badge ${c.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          {canCredit && (
                            <button onClick={() => openCreditModal(c)} style={styles.creditBtn} title="Adjust Credit Limit">
                              <Coins size={12} /> Credit
                            </button>
                          )}
                          {canUpdate && (
                            <button onClick={() => openEditModal(c)} style={styles.editBtn} title="Edit Customer">
                              <Edit3 size={12} />
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => handleDelete(c)} style={styles.deleteBtn} title="Delete Customer">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── TAB: Credit Dashboard ── */}
      {activeTab === 'credit' && (
        creditLoading ? (
          <div style={styles.loadingState}>
            <Loader2 size={32} style={styles.spinner} />
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Loading credit data...</p>
          </div>
        ) : creditSummary ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* KPI Cards */}
            <div style={styles.kpiGrid}>
              <div style={{ ...styles.kpiCard, borderColor: 'rgba(99, 102, 241, 0.3)', background: 'rgba(99, 102, 241, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
                  <div style={{ ...styles.kpiIcon, background: 'rgba(99, 102, 241, 0.15)' }}><IndianRupee size={18} color="#6366f1" /></div>
                  <span style={styles.kpiLabel}>Total Credit Exposure</span>
                </div>
                <div style={{ ...styles.kpiValue, color: '#6366f1' }}>₹{(creditSummary.summary.totalCreditExposure / 100000).toFixed(1)}L</div>
                <div style={styles.kpiSub}>across {creditSummary.summary.totalCustomers} customers</div>
              </div>

              <div style={{ ...styles.kpiCard, borderColor: 'rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
                  <div style={{ ...styles.kpiIcon, background: 'rgba(245, 158, 11, 0.15)' }}><TrendingUp size={18} color="#f59e0b" /></div>
                  <span style={styles.kpiLabel}>Total Outstanding</span>
                </div>
                <div style={{ ...styles.kpiValue, color: '#f59e0b' }}>₹{(creditSummary.summary.totalOutstanding / 100000).toFixed(1)}L</div>
                <div style={styles.kpiSub}>total receivables across org</div>
              </div>

              <div style={{ ...styles.kpiCard, borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
                  <div style={{ ...styles.kpiIcon, background: 'rgba(239, 68, 68, 0.15)' }}><XCircle size={18} color="#ef4444" /></div>
                  <span style={styles.kpiLabel}>Over-Limit Customers</span>
                </div>
                <div style={{ ...styles.kpiValue, color: '#ef4444' }}>{creditSummary.summary.overLimitCount}</div>
                <div style={styles.kpiSub}>exceeded their credit limit</div>
              </div>

              <div style={{ ...styles.kpiCard, borderColor: 'rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
                  <div style={{ ...styles.kpiIcon, background: 'rgba(16, 185, 129, 0.15)' }}><CheckCircle2 size={18} color="#10b981" /></div>
                  <span style={styles.kpiLabel}>Total Available Credit</span>
                </div>
                <div style={{ ...styles.kpiValue, color: '#10b981' }}>₹{(creditSummary.summary.totalAvailable / 100000).toFixed(1)}L</div>
                <div style={styles.kpiSub}>{creditSummary.summary.nearLimitCount} near-limit (≥80%)</div>
              </div>
            </div>

            {/* Credit Utilization Table */}
            {creditSummary.customers.length > 0 && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={styles.cardHeader}>
                  <CreditCard size={18} color="#6366f1" />
                  <h3 style={styles.cardTitle}>Customer Credit Utilization</h3>
                  <span style={{ fontSize: '0.75rem', color: '#475569', marginLeft: 'auto' }}>Sorted by highest utilization</span>
                </div>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.theadRow}>
                      <th style={styles.th}>Customer</th>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Credit Limit</th>
                      <th style={styles.th}>Outstanding</th>
                      <th style={styles.th}>Available</th>
                      <th style={{ ...styles.th, minWidth: '160px' }}>Utilization</th>
                      <th style={styles.th}>Terms</th>
                      <th style={styles.th}>Credit Status</th>
                      {canCredit && <th style={{ ...styles.th, textAlign: 'right' }}>Manage</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {creditSummary.customers.map((c) => {
                      const overrun = c.outstandingAmount > c.creditLimit;
                      const nearLimit = c.utilizationPct >= 80 && !overrun;
                      return (
                        <tr key={c.customerId} style={styles.tr}>
                          <td style={{ ...styles.td, fontWeight: 700, color: '#f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              {overrun && <ShieldAlert size={14} color="#ef4444" />}
                              {nearLimit && <AlertTriangle size={14} color="#f59e0b" />}
                              {!overrun && !nearLimit && <UserCheck size={14} color="#10b981" />}
                              {c.customerName}
                            </div>
                          </td>
                          <td style={styles.td}><TypeBadge type={c.customerType} /></td>
                          <td style={styles.td}>₹{c.creditLimit.toLocaleString('en-IN')}</td>
                          <td style={{ ...styles.td, color: overrun ? '#ef4444' : nearLimit ? '#f59e0b' : '#cbd5e1', fontWeight: overrun ? 700 : 400 }}>
                            ₹{c.outstandingAmount.toLocaleString('en-IN')}
                          </td>
                          <td style={{ ...styles.td, color: c.availableCredit >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                            ₹{c.availableCredit.toLocaleString('en-IN')}
                          </td>
                          <td style={styles.td}>
                            <UtilizationBar pct={overrun ? 100 + ((c.outstandingAmount - c.creditLimit) / c.creditLimit) * 100 : c.utilizationPct} />
                          </td>
                          <td style={styles.td}>{c.paymentTermsDays} Days</td>
                          <td style={styles.td}>
                            <span className={`badge ${c.creditStatus === 'ACTIVE' ? 'badge-success' : c.creditStatus === 'SUSPENDED' ? 'badge-danger' : 'badge-warning'}`}>
                              {c.creditStatus}
                            </span>
                          </td>
                          {canCredit && (
                            <td style={{ ...styles.td, textAlign: 'right' }}>
                              <button
                                onClick={() => {
                                  const full = customers.find((cu) => cu.id === c.customerId);
                                  if (full) openCreditModal(full);
                                }}
                                style={styles.creditBtn}
                              >
                                <Coins size={12} /> Adjust
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <CreditCard size={40} color="#475569" style={{ marginBottom: '0.75rem' }} />
            <p style={{ color: '#94a3b8' }}>No credit data available.</p>
          </div>
        )
      )}

      {/* ══ ADD / EDIT CUSTOMER MODAL ═══════════════════════════════════════════ */}
      {showCustomerModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {editingCustomer ? `Edit: ${editingCustomer.name}` : 'Add New Customer'}
              </h3>
              <button onClick={() => setShowCustomerModal(false)} style={styles.closeBtn}><X size={18} /></button>
            </div>

            <form onSubmit={handleCustomerSubmit} style={styles.form}>
              {/* Name + Type */}
              <div style={styles.formRow}>
                <div style={{ ...styles.formGroup, flex: 2 }}>
                  <label style={styles.label}>Customer Name <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="e.g. Hindustan Agro Distributors"
                    value={customerForm.name}
                    onChange={(e) => setCustomerForm((p) => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Type <span style={{ color: '#ef4444' }}>*</span></label>
                  <select style={styles.select} value={customerForm.type} onChange={(e) => setCustomerForm((p) => ({ ...p, type: e.target.value }))}>
                    <option value="DISTRIBUTOR">Distributor</option>
                    <option value="DEALER">Dealer</option>
                    <option value="RETAILER">Retailer</option>
                  </select>
                </div>
              </div>

              {/* Phone + Email */}
              <div style={styles.formRow}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Phone</label>
                  <input type="tel" style={styles.input} placeholder="+91 98765 43210"
                    value={customerForm.phone} onChange={(e) => setCustomerForm((p) => ({ ...p, phone: e.target.value }))} />
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Email</label>
                  <input type="email" style={styles.input} placeholder="contact@company.com"
                    value={customerForm.email} onChange={(e) => setCustomerForm((p) => ({ ...p, email: e.target.value }))} />
                </div>
              </div>

              {/* Address */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Address</label>
                <input type="text" style={styles.input} placeholder="City, State"
                  value={customerForm.address} onChange={(e) => setCustomerForm((p) => ({ ...p, address: e.target.value }))} />
              </div>

              {/* Credit Limit + Payment Terms — only on create */}
              {!editingCustomer && (
                <div style={{ ...styles.formGroup, backgroundColor: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px', padding: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6366f1', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <CreditCard size={14} /> Credit Configuration
                  </div>
                  <div style={styles.formRow}>
                    <div style={{ ...styles.formGroup, flex: 1 }}>
                      <label style={styles.label}>Credit Limit (₹)</label>
                      <input type="number" min="0" step="1000" style={styles.input} placeholder="500000"
                        value={customerForm.creditLimit} onChange={(e) => setCustomerForm((p) => ({ ...p, creditLimit: e.target.value }))} />
                    </div>
                    <div style={{ ...styles.formGroup, flex: 1 }}>
                      <label style={styles.label}>Payment Terms (Days)</label>
                      <input type="number" min="0" max="365" style={styles.input} placeholder="30"
                        value={customerForm.paymentTermsDays} onChange={(e) => setCustomerForm((p) => ({ ...p, paymentTermsDays: e.target.value }))} />
                    </div>
                  </div>
                </div>
              )}

              {/* Status */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Status</label>
                <select style={styles.select} value={customerForm.status} onChange={(e) => setCustomerForm((p) => ({ ...p, status: e.target.value }))}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setShowCustomerModal(false)} style={styles.cancelBtn} disabled={submitting}>Cancel</button>
                <button type="submit" style={styles.submitBtn} disabled={submitting}>
                  {submitting ? <><Loader2 size={14} style={styles.spinner} /> Saving...</> : editingCustomer ? 'Save Changes' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ ADJUST CREDIT MODAL ═════════════════════════════════════════════════ */}
      {showCreditModal && creditTarget && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Adjust Credit Limit</h3>
              <button onClick={() => setShowCreditModal(false)} style={styles.closeBtn}><X size={18} /></button>
            </div>

            {/* Customer info panel */}
            <div style={{ backgroundColor: '#0f172a', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Customer</div>
              <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.9375rem' }}>{creditTarget.name}</div>
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1.5rem', fontSize: '0.8125rem' }}>
                <span>Current Limit: <strong style={{ color: '#6366f1' }}>₹{(creditTarget.credit?.creditLimit ?? 0).toLocaleString('en-IN')}</strong></span>
                <span>Outstanding: <strong style={{ color: '#f59e0b' }}>₹{(creditTarget.credit?.outstandingAmount ?? 0).toLocaleString('en-IN')}</strong></span>
                <span>Available: <strong style={{ color: '#10b981' }}>₹{(creditTarget.credit?.availableCredit ?? 0).toLocaleString('en-IN')}</strong></span>
              </div>
            </div>

            <form onSubmit={handleCreditSubmit} style={styles.form}>
              <div style={styles.formRow}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>New Credit Limit (₹) <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="number" min="0" step="1000" style={styles.input}
                    value={creditForm.creditLimit} onChange={(e) => setCreditForm((p) => ({ ...p, creditLimit: e.target.value }))} required />
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label style={styles.label}>Payment Terms (Days)</label>
                  <input type="number" min="0" max="365" style={styles.input}
                    value={creditForm.paymentTermsDays} onChange={(e) => setCreditForm((p) => ({ ...p, paymentTermsDays: e.target.value }))} />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Credit Status</label>
                <select style={styles.select} value={creditForm.status} onChange={(e) => setCreditForm((p) => ({ ...p, status: e.target.value }))}>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="OVER_LIMIT">Over Limit</option>
                </select>
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setShowCreditModal(false)} style={styles.cancelBtn} disabled={submitting}>Cancel</button>
                <button type="submit" style={{ ...styles.submitBtn, backgroundColor: '#6366f1' }} disabled={submitting}>
                  {submitting ? <><Loader2 size={14} style={styles.spinner} /> Updating...</> : 'Update Credit Limit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  container:   { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' },
  title:       { fontSize: '1.375rem', fontWeight: 800, color: '#f8fafc' },
  subtitle:    { fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem' },
  addBtn: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    backgroundColor: '#059669', color: '#fff', border: 'none',
    borderRadius: '8px', padding: '0.625rem 1rem', fontSize: '0.8125rem',
    fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease',
  },
  tabsContainer: { display: 'flex', borderBottom: '1px solid #1e293b', gap: '1.5rem' },
  tab: {
    background: 'none', border: 'none', padding: '0.75rem 0.5rem',
    fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease',
  },
  table:     { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' },
  theadRow:  { backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b' },
  th:        { padding: '1rem 1.25rem', fontWeight: 700, color: '#94a3b8' },
  tr:        { borderBottom: '1px solid #1e293b', backgroundColor: 'rgba(30, 41, 59, 0.2)' },
  td:        { padding: '0.875rem 1.25rem', color: '#cbd5e1' },
  cardHeader: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    padding: '1.25rem 1.5rem', borderBottom: '1px solid #1e293b', backgroundColor: '#0f172a',
  },
  cardTitle:  { fontSize: '1rem', fontWeight: 700, color: '#f8fafc' },
  kpiGrid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' },
  kpiCard:    { backgroundColor: '#1e293b', borderRadius: '12px', padding: '1.25rem', border: '1px solid #1e293b' },
  kpiIcon:    { padding: '0.5rem', borderRadius: '8px', display: 'inline-flex', alignItems: 'center' },
  kpiLabel:   { fontSize: '0.8125rem', fontWeight: 700, color: '#94a3b8' },
  kpiValue:   { fontSize: '1.875rem', fontWeight: 800, lineHeight: 1, marginTop: '0.25rem' },
  kpiSub:     { fontSize: '0.75rem', color: '#64748b', marginTop: '0.375rem' },
  editBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '28px', height: '28px', borderRadius: '6px',
    backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6',
    border: '1px solid rgba(59,130,246,0.2)', cursor: 'pointer', transition: 'all 0.2s',
  },
  deleteBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '28px', height: '28px', borderRadius: '6px',
    backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444',
    border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', transition: 'all 0.2s',
  },
  creditBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
    backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b',
    border: '1px solid rgba(245,158,11,0.2)', padding: '0.375rem 0.625rem',
    borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
    transition: 'all 0.2s',
  },
  loadingState: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '4rem 0' },
  spinner:      { animation: 'spin 1s linear infinite', color: '#10b981' },
  emptyState:   { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem', textAlign: 'center' },
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    backgroundColor: 'rgba(11,15,23,0.75)', backdropFilter: 'blur(8px)',
    zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem',
  },
  modalCard: {
    backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px',
    width: '100%', maxWidth: '600px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
    padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    borderBottom: '1px solid #334155', paddingBottom: '1rem', marginBottom: '1.25rem',
  },
  modalTitle: { fontSize: '1.125rem', fontWeight: 800, color: '#f8fafc' },
  closeBtn: {
    background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer',
    display: 'flex', alignItems: 'center', padding: '0.25rem', borderRadius: '6px',
  },
  form:      { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  formRow:   { display: 'flex', gap: '1rem' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '0.375rem' },
  label:     { fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' },
  input: {
    padding: '0.625rem 0.875rem', backgroundColor: '#0f172a',
    border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc',
    fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  select: {
    backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px',
    padding: '0.625rem 0.875rem', color: '#cbd5e1', fontSize: '0.8125rem',
    outline: 'none', cursor: 'pointer', width: '100%',
  },
  modalFooter: {
    display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
    borderTop: '1px solid #334155', paddingTop: '1.25rem', marginTop: '0.5rem',
  },
  cancelBtn: {
    backgroundColor: 'transparent', border: '1px solid #334155', color: '#cbd5e1',
    borderRadius: '8px', padding: '0.625rem 1rem', fontSize: '0.8125rem',
    fontWeight: 700, cursor: 'pointer',
  },
  submitBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
    backgroundColor: '#059669', border: 'none', color: '#fff',
    borderRadius: '8px', padding: '0.625rem 1.25rem', fontSize: '0.8125rem',
    fontWeight: 700, cursor: 'pointer',
  },
};
