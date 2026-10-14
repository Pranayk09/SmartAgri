import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';
import {
  Users, CreditCard, Plus, Edit3, Trash2, Coins, AlertCircle,
  CheckCircle2, AlertTriangle, XCircle, Loader2, X, TrendingUp,
  IndianRupee, UserCheck, ShieldAlert, ShoppingCart, Receipt,
  Landmark, ExternalLink, Search, Filter, Phone, Mail, MapPin,
  Clock, CheckSquare, ChevronRight, Eye, Layers, Check
} from 'lucide-react';

// ─── Credit Utilization Bar ──────────────────────────────────────────
function UtilizationBar({ pct }) {
  const color = pct >= 100 ? 'var(--status-danger)' : pct >= 80 ? 'var(--status-warning)' : 'var(--status-success)';
  const cappedPct = Math.min(pct, 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
      <div style={{ flex: 1, height: '7px', borderRadius: '99px', backgroundColor: 'var(--surface-3)', overflow: 'hidden' }}>
        <div style={{ width: `${cappedPct}%`, height: '100%', borderRadius: '99px', backgroundColor: color, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: 700, color, minWidth: '40px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

// ─── Customer Type Badge ──────────────────────────────────────────────
function TypeBadge({ type }) {
  const map = {
    DISTRIBUTOR: 'badge-info',
    DEALER:      'badge-warning',
    RETAILER:    'badge-success',
  };
  return <span className={`badge ${map[type] || 'badge-info'}`}>{type}</span>;
}

// ─── Modal Wrapper ────────────────────────────────────────────────────
function Modal({ title, onClose, children, maxWidth = '560px' }) {
  return (
    <div style={ms.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...ms.modal, maxWidth }}>
        <div style={ms.header}>
          <h3 style={ms.title}>{title}</h3>
          <button onClick={onClose} style={ms.closeBtn}><X size={18} /></button>
        </div>
        <div style={ms.body}>{children}</div>
      </div>
    </div>
  );
}

// ─── Main Component: Customer 360 Workspace ───────────────────────────
export default function CustomersView() {
  const { showToast } = useToast();
  const { hasPermission } = useAuth();

  const canCreate = hasPermission('customers.create');
  const canUpdate = hasPermission('customers.update');
  const canDelete = hasPermission('customers.delete');
  const canCredit = hasPermission('customers.credit');
  const canRecordPayment = hasPermission('invoices.payment');

  // Master Data
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected Customer in 360 Workspace
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [active360Tab, setActive360Tab] = useState('orders'); // 'orders' | 'invoices' | 'payments' | 'credit'

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');

  // Modals
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null); // null = add mode
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditTarget, setCreditTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Payment Recording Modal (In-Context)
  const [paymentModalInvoice, setPaymentModalInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentMethod: 'BANK_TRANSFER', referenceNumber: '', notes: '' });
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Forms
  const defaultCustomerForm = {
    name: '', type: 'DISTRIBUTOR', phone: '', email: '',
    address: '', status: 'ACTIVE', creditLimit: '', paymentTermsDays: '30',
  };
  const [customerForm, setCustomerForm] = useState(defaultCustomerForm);
  const [creditForm, setCreditForm] = useState({ creditLimit: '', paymentTermsDays: '', status: 'ACTIVE' });

  // ─── Data Fetching ──────────────────────────────────────────────────
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [custRes, ordRes, invRes] = await Promise.all([
        apiGet('/customers').catch(() => ({ data: [] })),
        apiGet('/sales/orders').catch(() => ({ data: [] })),
        apiGet('/invoices').catch(() => ({ data: [] })),
      ]);
      const fetchedCustomers = custRes.data || [];
      setCustomers(fetchedCustomers);
      setOrders(ordRes.data || []);
      setInvoices(invRes.data || []);

      // If no customer selected yet, select first active customer or read hash param
      if (fetchedCustomers.length > 0) {
        const hash = window.location.hash;
        if (hash.includes('?')) {
          const params = new URLSearchParams(hash.split('?')[1]);
          const targetId = params.get('id');
          if (targetId && fetchedCustomers.some(c => c.id === targetId)) {
            setSelectedCustomerId(targetId);
            return;
          }
        }
        setSelectedCustomerId(prev => prev || fetchedCustomers[0].id);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find(c => c.id === selectedCustomerId) || customers[0] || null;
  }, [selectedCustomerId, customers]);

  // Orders for selected customer
  const customerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return orders.filter(o => o.customerId === selectedCustomer.id);
  }, [selectedCustomer, orders]);

  // Invoices for selected customer
  const customerInvoices = useMemo(() => {
    if (!selectedCustomer) return [];
    return invoices.filter(i => i.customerId === selectedCustomer.id);
  }, [selectedCustomer, invoices]);

  // Payments for selected customer (extracted from customer invoices)
  const customerPayments = useMemo(() => {
    if (!customerInvoices.length) return [];
    const list = [];
    customerInvoices.forEach(inv => {
      if (inv.payments && inv.payments.length) {
        inv.payments.forEach(p => {
          list.push({ ...p, invoiceNumber: inv.invoiceNumber, invoiceId: inv.id });
        });
      }
    });
    return list.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
  }, [customerInvoices]);

  // Filtered customer accounts
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchSearch = !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchType = typeFilter === 'ALL' || c.type === typeFilter;

      const limit = c.credit?.creditLimit || 0;
      const outstanding = c.credit?.outstandingAmount || 0;
      const util = limit > 0 ? (outstanding / limit) * 100 : 0;

      let matchRisk = true;
      if (riskFilter === 'HIGH_RISK') matchRisk = util >= 80 && util < 100;
      else if (riskFilter === 'OVER_LIMIT') matchRisk = util >= 100;
      else if (riskFilter === 'NORMAL') matchRisk = util < 80;

      return matchSearch && matchType && matchRisk;
    });
  }, [customers, searchQuery, typeFilter, riskFilter]);

  // Overall KPIs
  const totalExposure = useMemo(() => customers.reduce((sum, c) => sum + (c.credit?.creditLimit || 0), 0), [customers]);
  const totalOutstanding = useMemo(() => customers.reduce((sum, c) => sum + (c.credit?.outstandingAmount || 0), 0), [customers]);
  const overLimitCount = useMemo(() => customers.filter(c => {
    const lim = c.credit?.creditLimit || 0;
    const out = c.credit?.outstandingAmount || 0;
    return lim > 0 && out >= lim;
  }).length, [customers]);

  // ─── Modal Openers & Actions ────────────────────────────────────────
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

  const openCreditModal = (customer) => {
    setCreditTarget(customer);
    setCreditForm({
      creditLimit: customer.credit?.creditLimit ?? '',
      paymentTermsDays: customer.credit?.paymentTermsDays ?? 30,
      status: customer.credit?.status || 'ACTIVE',
    });
    setShowCreditModal(true);
  };

  const openPaymentModal = (invoice) => {
    setPaymentModalInvoice(invoice);
    setPaymentForm({
      amount: String(invoice.outstandingAmount || ''),
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: '',
      notes: `Settlement for invoice ${invoice.invoiceNumber}`
    });
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
        const profileData = {
          name: customerForm.name.trim(),
          type: customerForm.type || 'DISTRIBUTOR',
          phone: customerForm.phone?.trim() || null,
          email: customerForm.email?.trim() || null,
          address: customerForm.address?.trim() || null,
          status: customerForm.status || 'ACTIVE',
        };
        await apiPut(`/customers/${editingCustomer.id}`, profileData);
        showToast('Customer profile updated.', 'success');
      } else {
        const rawLimit = customerForm.creditLimit !== '' ? parseFloat(customerForm.creditLimit) : 0;
        const rawTerms = customerForm.paymentTermsDays !== '' ? parseInt(customerForm.paymentTermsDays, 10) : 30;
        const payload = {
          name: customerForm.name.trim(),
          type: customerForm.type || 'DISTRIBUTOR',
          phone: customerForm.phone?.trim() || null,
          email: customerForm.email?.trim() || null,
          address: customerForm.address?.trim() || null,
          status: customerForm.status || 'ACTIVE',
          creditLimit: isNaN(rawLimit) || rawLimit < 0 ? 0 : rawLimit,
          paymentTermsDays: isNaN(rawTerms) || rawTerms < 0 ? 30 : rawTerms,
        };
        const res = await apiPost('/customers', payload);
        showToast('Customer account created.', 'success');
        if (res.data?.id) setSelectedCustomerId(res.data.id);
      }
      setShowCustomerModal(false);
      fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreditSubmit = async (e) => {
    e.preventDefault();
    if (!creditTarget) return;
    const parsedLimit = parseFloat(creditForm.creditLimit);
    if (isNaN(parsedLimit) || parsedLimit < 0) {
      showToast('Credit limit must be a valid non-negative number.', 'warning');
      return;
    }
    const currentOutstanding = creditTarget.credit?.outstandingAmount || 0;
    if (parsedLimit < currentOutstanding) {
      showToast(`Credit limit (₹${parsedLimit.toLocaleString('en-IN')}) cannot be less than current outstanding balance (₹${currentOutstanding.toLocaleString('en-IN')}).`, 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await apiPut(`/customers/${creditTarget.id}/credit`, {
        creditLimit: parsedLimit,
        paymentTermsDays: parseInt(creditForm.paymentTermsDays, 10) || 30,
        status: creditForm.status || 'ACTIVE',
      });
      showToast('Credit limit updated successfully.', 'success');
      setShowCreditModal(false);
      fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (customer) => {
    if (!window.confirm(`Delete customer "${customer.name}"? If order history exists, customer will be deactivated.`)) return;
    try {
      const res = await apiDelete(`/customers/${customer.id}`);
      showToast(res.message || 'Customer record updated.', 'success');
      fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentModalInvoice) return;
    const amount = parseFloat(paymentForm.amount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Enter a valid payment amount.', 'warning');
      return;
    }
    if (amount > paymentModalInvoice.outstandingAmount) {
      showToast(`Payment exceeds outstanding amount (₹${paymentModalInvoice.outstandingAmount}).`, 'warning');
      return;
    }

    setPaymentSubmitting(true);
    try {
      await apiPost(`/invoices/${paymentModalInvoice.id}/payments`, {
        amount,
        paymentMethod: paymentForm.paymentMethod,
        referenceNumber: paymentForm.referenceNumber,
        notes: paymentForm.notes
      });
      showToast(`Payment of ₹${amount.toLocaleString('en-IN')} recorded. Customer credit restored!`, 'success');
      setPaymentModalInvoice(null);
      fetchAllData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  if (loading && customers.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '5rem' }}>
        <Loader2 size={36} color="var(--brand-500)" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  // ─── Selected Customer Credit Calculations ──────────────────────────
  const selCredit = selectedCustomer?.credit;
  const selLimit = selCredit?.creditLimit || 0;
  const selOutstanding = selCredit?.outstandingAmount || 0;
  const selAvailable = selCredit ? (selCredit.availableCredit ?? (selLimit - selOutstanding)) : 0;
  const selUtil = selLimit > 0 ? (selOutstanding / selLimit) * 100 : 0;
  const selUtilColor = selUtil >= 100 ? 'var(--status-danger)' : selUtil >= 80 ? 'var(--status-warning)' : 'var(--status-success)';

  return (
    <div className="workspace-container">
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Customer Accounts & 360 Workspace
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Comprehensive commercial intelligence: credit exposure, complete order history, invoice ledger, and payment tracking.
          </p>
        </div>

        {canCreate && (
          <button onClick={openAddModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> New Customer Account
          </button>
        )}
      </div>

      {/* KPI Overview Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        <div className="card" style={{ padding: '16px', background: 'var(--surface-1)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Registered Customers
          </span>
          <p style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {customers.length}
          </p>
        </div>

        <div className="card" style={{ padding: '16px', background: 'var(--surface-1)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Credit Limit Exposure
          </span>
          <p style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 800, color: 'var(--status-info)', fontFamily: 'var(--font-mono)' }}>
            ₹{totalExposure.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="card" style={{ padding: '16px', background: 'var(--surface-1)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Outstanding Receivables
          </span>
          <p style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 800, color: 'var(--status-warning)', fontFamily: 'var(--font-mono)' }}>
            ₹{totalOutstanding.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="card" style={{ padding: '16px', background: 'var(--surface-1)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Accounts Over Credit Limit
          </span>
          <p style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 800, color: overLimitCount > 0 ? 'var(--status-danger)' : 'var(--status-success)', fontFamily: 'var(--font-mono)' }}>
            {overLimitCount}
          </p>
        </div>
      </div>

      {/* Two-Column Master-Detail 360 Workspace */}
      <div className="workspace-split-equal">
        {/* LEFT COLUMN: Customer Directory */}
        <div className="workspace-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Customer Accounts ({filteredCustomers.length})
            </span>
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} color="var(--text-tertiary)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              className="form-input"
              type="text"
              placeholder="Search by name, phone, email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '32px', fontSize: '12.5px' }}
            />
          </div>

          {/* Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <select className="form-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ fontSize: '12px' }}>
              <option value="ALL">All Types</option>
              <option value="DISTRIBUTOR">Distributors</option>
              <option value="DEALER">Dealers</option>
              <option value="RETAILER">Retailers</option>
            </select>

            <select className="form-select" value={riskFilter} onChange={e => setRiskFilter(e.target.value)} style={{ fontSize: '12px' }}>
              <option value="ALL">All Risk Statuses</option>
              <option value="NORMAL">Normal (&lt;80%)</option>
              <option value="HIGH_RISK">Near Limit (&gt;=80%)</option>
              <option value="OVER_LIMIT">Over Limit (&gt;=100%)</option>
            </select>
          </div>

          {/* Customer Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}>
            {filteredCustomers.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                No customers match active filters.
              </div>
            ) : (
              filteredCustomers.map(c => {
                const isSelected = selectedCustomerId === c.id;
                const lim = c.credit?.creditLimit || 0;
                const out = c.credit?.outstandingAmount || 0;
                const util = lim > 0 ? (out / lim) * 100 : 0;
                const isOver = out > lim;

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'var(--surface-2)' : 'var(--surface-1)',
                      border: `1px solid ${isSelected ? 'var(--brand-500)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '13.5px', color: isSelected ? 'var(--brand-400)' : 'var(--text-primary)' }}>
                        {c.name}
                      </span>
                      <TypeBadge type={c.type} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      <span>Outstanding: <strong style={{ color: isOver ? 'var(--status-danger)' : 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>₹{out.toLocaleString('en-IN')}</strong></span>
                      <span>Limit: ₹{lim.toLocaleString('en-IN')}</span>
                    </div>

                    <UtilizationBar pct={util} />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }} onClick={e => e.stopPropagation()}>
                      {canCredit && (
                        <button
                          onClick={() => openCreditModal(c)}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '2px 8px', fontSize: '11px', color: 'var(--status-warning)' }}
                          title="Adjust Credit Limit"
                        >
                          <Coins size={12} /> Credit
                        </button>
                      )}
                      {canUpdate && (
                        <button
                          onClick={() => openEditModal(c)}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '2px 8px', fontSize: '11px', color: 'var(--text-secondary)' }}
                          title="Edit Customer Profile"
                        >
                          <Edit3 size={12} /> Edit
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Customer 360 Contextual Console */}
        <div className="workspace-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {!selectedCustomer ? (
            <div className="context-empty" style={{ padding: '5rem' }}>
              <Users size={48} color="var(--text-tertiary)" />
              <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>Select a Customer</h4>
              <p style={{ margin: 0, fontSize: '13px' }}>Click any customer on the left to inspect their 360 workspace.</p>
            </div>
          ) : (
            <div>
              {/* Profile Header & Action Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {selectedCustomer.name}
                    </h3>
                    <TypeBadge type={selectedCustomer.type} />
                    <span className={`badge ${selectedCustomer.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                      {selectedCustomer.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                    {selectedCustomer.phone && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={12} color="var(--text-tertiary)" /> {selectedCustomer.phone}
                      </span>
                    )}
                    {selectedCustomer.email && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Mail size={12} color="var(--text-tertiary)" /> {selectedCustomer.email}
                      </span>
                    )}
                    {selectedCustomer.address && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} color="var(--text-tertiary)" /> {selectedCustomer.address}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Commercial Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <a
                    href={`#sales?customerId=${selectedCustomer.id}`}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <ShoppingCart size={13} /> Create Sales Order
                  </a>

                  {canCredit && (
                    <button onClick={() => openCreditModal(selectedCustomer)} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Coins size={13} /> Adjust Credit
                    </button>
                  )}

                  {canUpdate && (
                    <button onClick={() => openEditModal(selectedCustomer)} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title="Edit Profile">
                      <Edit3 size={13} /> Edit Profile
                    </button>
                  )}

                  {canDelete && (
                    <button onClick={() => handleDeleteCustomer(selectedCustomer)} className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)' }} title="Delete or Deactivate">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Authoritative Financial Standing Banner */}
              <div className="context-kpi-grid" style={{ marginBottom: '16px' }}>
                <div className="context-kpi-cell">
                  <span className="context-kpi-label">Credit Limit Line</span>
                  <span className="context-kpi-val">₹{selLimit.toLocaleString('en-IN')}</span>
                </div>
                <div className="context-kpi-cell">
                  <span className="context-kpi-label">Current Outstanding</span>
                  <span className="context-kpi-val" style={{ color: 'var(--status-warning)' }}>
                    ₹{selOutstanding.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="context-kpi-cell">
                  <span className="context-kpi-label">Available Credit</span>
                  <span className="context-kpi-val" style={{ color: selAvailable >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>
                    ₹{selAvailable.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="context-kpi-cell">
                  <span className="context-kpi-label">Payment Terms Policy</span>
                  <span className="context-kpi-val" style={{ fontSize: '14px' }}>
                    {selCredit?.paymentTermsDays || 30} Days Net
                  </span>
                </div>
              </div>

              {/* Utilization Meter */}
              <div style={{ marginBottom: '20px', padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Credit Line Exposure Utilization</span>
                  <span style={{ color: selUtilColor, fontFamily: 'var(--font-mono)' }}>{selUtil.toFixed(1)}%</span>
                </div>
                <div className="context-utilization-meter" style={{ height: '9px', marginTop: '8px' }}>
                  <div className="context-utilization-fill" style={{ width: `${Math.min(selUtil, 100)}%`, backgroundColor: selUtilColor }} />
                </div>
              </div>

              {/* Contextual Tabs Navigation */}
              <div className="context-nav-tabs">
                <button
                  type="button"
                  className={`context-nav-tab ${active360Tab === 'orders' ? 'active' : ''}`}
                  onClick={() => setActive360Tab('orders')}
                >
                  <ShoppingCart size={14} /> Orders ({customerOrders.length})
                </button>
                <button
                  type="button"
                  className={`context-nav-tab ${active360Tab === 'invoices' ? 'active' : ''}`}
                  onClick={() => setActive360Tab('invoices')}
                >
                  <Receipt size={14} /> Invoices Ledger ({customerInvoices.length})
                </button>
                <button
                  type="button"
                  className={`context-nav-tab ${active360Tab === 'payments' ? 'active' : ''}`}
                  onClick={() => setActive360Tab('payments')}
                >
                  <Landmark size={14} /> Payment Receipts ({customerPayments.length})
                </button>
                <button
                  type="button"
                  className={`context-nav-tab ${active360Tab === 'credit' ? 'active' : ''}`}
                  onClick={() => setActive360Tab('credit')}
                >
                  <ShieldAlert size={14} /> Credit & Terms Policy
                </button>
              </div>

              {/* ────────────────────────────────────────────────────────
                  TAB 1: ORDER HISTORY
                  ──────────────────────────────────────────────────────── */}
              {active360Tab === 'orders' && (
                <div>
                  {customerOrders.length === 0 ? (
                    <div className="context-empty">
                      <ShoppingCart size={32} color="var(--text-tertiary)" />
                      <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>No Orders Placed Yet</p>
                      <p style={{ margin: 0, fontSize: '12px' }}>This customer has not placed any sales orders.</p>
                      <a href={`#sales?customerId=${selectedCustomer.id}`} className="btn btn-primary btn-sm" style={{ marginTop: '8px' }}>
                        <Plus size={13} /> Create Initial Order
                      </a>
                    </div>
                  ) : (
                    <div className="context-table-wrap">
                      <table className="context-table">
                        <thead>
                          <tr>
                            <th>Order #</th>
                            <th>Date</th>
                            <th>Items</th>
                            <th>Total Amount</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customerOrders.map(o => (
                            <tr key={o.id}>
                              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--status-info)' }}>
                                {o.orderNumber}
                              </td>
                              <td>{new Date(o.orderDate).toLocaleDateString('en-IN')}</td>
                              <td>{o.items?.length || 0} line item{(o.items?.length || 0) !== 1 ? 's' : ''}</td>
                              <td style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--brand-400)' }}>
                                ₹{Number(o.totalAmount).toLocaleString('en-IN')}
                              </td>
                              <td>
                                <span className={`badge ${
                                  o.status === 'DRAFT' ? 'badge-warning' :
                                  o.status === 'CONFIRMED' ? 'badge-info' :
                                  o.status === 'DISPATCHED' ? 'badge-success' : 'badge-neutral'
                                }`}>
                                  {o.status}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <a
                                  href="#sales"
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: '4px 8px', fontSize: '11px' }}
                                >
                                  View in Sales Desk
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ────────────────────────────────────────────────────────
                  TAB 2: INVOICES LEDGER
                  ──────────────────────────────────────────────────────── */}
              {active360Tab === 'invoices' && (
                <div>
                  {customerInvoices.length === 0 ? (
                    <div className="context-empty">
                      <Receipt size={32} color="var(--text-tertiary)" />
                      <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>No Invoices Generated</p>
                      <p style={{ margin: 0, fontSize: '12px' }}>No tax invoices have been issued for this customer yet.</p>
                    </div>
                  ) : (
                    <div className="context-table-wrap">
                      <table className="context-table">
                        <thead>
                          <tr>
                            <th>Invoice #</th>
                            <th>Sales Order</th>
                            <th>Due Date</th>
                            <th>Total</th>
                            <th>Paid</th>
                            <th>Outstanding</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customerInvoices.map(inv => (
                            <tr key={inv.id}>
                              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--status-info)' }}>
                                {inv.invoiceNumber}
                              </td>
                              <td style={{ color: 'var(--text-tertiary)' }}>{inv.salesOrder?.orderNumber || '—'}</td>
                              <td>{new Date(inv.dueDate).toLocaleDateString('en-IN')}</td>
                              <td style={{ fontFamily: 'var(--font-mono)' }}>₹{inv.totalAmount.toLocaleString('en-IN')}</td>
                              <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--status-success)' }}>₹{inv.amountPaid.toLocaleString('en-IN')}</td>
                              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: inv.outstandingAmount > 0 ? 'var(--status-danger)' : 'var(--text-secondary)' }}>
                                ₹{inv.outstandingAmount.toLocaleString('en-IN')}
                              </td>
                              <td>
                                <span className={`badge ${
                                  inv.status === 'PAID' ? 'badge-success' :
                                  inv.status === 'PARTIALLY_PAID' ? 'badge-warning' : 'badge-danger'
                                }`}>
                                  {inv.status}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {inv.outstandingAmount > 0 && canRecordPayment && (
                                  <button
                                    onClick={() => openPaymentModal(inv)}
                                    className="btn btn-primary btn-sm"
                                    style={{ fontSize: '11px', padding: '4px 8px' }}
                                  >
                                    <Landmark size={12} /> Record Payment
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ────────────────────────────────────────────────────────
                  TAB 3: PAYMENT RECORDS
                  ──────────────────────────────────────────────────────── */}
              {active360Tab === 'payments' && (
                <div>
                  {customerPayments.length === 0 ? (
                    <div className="context-empty">
                      <Landmark size={32} color="var(--text-tertiary)" />
                      <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>No Payment Records</p>
                      <p style={{ margin: 0, fontSize: '12px' }}>No payment receipts logged for this customer account.</p>
                    </div>
                  ) : (
                    <div className="context-table-wrap">
                      <table className="context-table">
                        <thead>
                          <tr>
                            <th>Payment Date</th>
                            <th>Invoice #</th>
                            <th>Amount Collected</th>
                            <th>Method</th>
                            <th>Reference #</th>
                            <th>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customerPayments.map(p => (
                            <tr key={p.id}>
                              <td>{new Date(p.paymentDate).toLocaleDateString('en-IN')}</td>
                              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--status-info)' }}>
                                {p.invoiceNumber}
                              </td>
                              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--status-success)' }}>
                                ₹{p.amount.toLocaleString('en-IN')}
                              </td>
                              <td>
                                <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                                  {p.paymentMethod}
                                </span>
                              </td>
                              <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                {p.referenceNumber || '—'}
                              </td>
                              <td style={{ color: 'var(--text-tertiary)', fontSize: '11.5px' }}>
                                {p.notes || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ────────────────────────────────────────────────────────
                  TAB 4: CREDIT POLICY & AUDIT
                  ──────────────────────────────────────────────────────── */}
              {active360Tab === 'credit' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ padding: '14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Authoritative Credit Calculation Formula
                    </h4>
                    <p style={{ margin: '6px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      <code>Available Credit = Credit Limit (₹{selLimit.toLocaleString('en-IN')}) - Outstanding Balance (₹{selOutstanding.toLocaleString('en-IN')}) = ₹{selAvailable.toLocaleString('en-IN')}</code>
                    </p>
                    <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                      New sales orders are automatically blocked by the business engine whenever order amount exceeds available credit. Outstanding balance increments upon order dispatch and is restored upon payment logging.
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    <div style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700 }}>Payment Terms</span>
                      <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {selCredit?.paymentTermsDays || 30} Calendar Days
                      </p>
                    </div>

                    <div style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700 }}>Account Credit Status</span>
                      <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: 700, color: 'var(--status-success)' }}>
                        {selCredit?.status || 'ACTIVE'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ADD / EDIT CUSTOMER
          ───────────────────────────────────────────────────────────── */}
      {showCustomerModal && (
        <Modal
          title={editingCustomer ? `Edit Customer Profile: ${editingCustomer.name}` : 'New Customer Account'}
          onClose={() => setShowCustomerModal(false)}
        >
          <form onSubmit={handleCustomerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Customer Legal Name <span className="required">*</span></label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Kaveri Agro Supplies Ltd."
                value={customerForm.name}
                onChange={e => setCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Customer Type</label>
                <select
                  className="form-select"
                  value={customerForm.type}
                  onChange={e => setCustomerForm(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="DISTRIBUTOR">DISTRIBUTOR</option>
                  <option value="DEALER">DEALER</option>
                  <option value="RETAILER">RETAILER</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="+91 98765 43210"
                  value={customerForm.phone}
                  onChange={e => setCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="accounts@kaveriagro.com"
                  value={customerForm.email}
                  onChange={e => setCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={customerForm.status}
                  onChange={e => setCustomerForm(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Registered Office / Warehouse Address</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Plot 45, APMC Market Yard, Hubli..."
                value={customerForm.address}
                onChange={e => setCustomerForm(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>

            {!editingCustomer && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}>
                <div className="form-group">
                  <label className="form-label">Initial Credit Limit (₹)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    placeholder="500000"
                    value={customerForm.creditLimit}
                    onChange={e => setCustomerForm(prev => ({ ...prev, creditLimit: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Terms (Days)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    placeholder="30"
                    value={customerForm.paymentTermsDays}
                    onChange={e => setCustomerForm(prev => ({ ...prev, paymentTermsDays: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button type="button" onClick={() => setShowCustomerModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn btn-primary">
                {submitting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={15} />}
                {editingCustomer ? 'Update Profile' : 'Create Account'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ADJUST CREDIT LIMIT
          ───────────────────────────────────────────────────────────── */}
      {showCreditModal && creditTarget && (
        <Modal
          title={`Adjust Credit Limit: ${creditTarget.name}`}
          onClose={() => setShowCreditModal(false)}
        >
          <form onSubmit={handleCreditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '12px' }}>
              <div><span style={{ color: 'var(--text-tertiary)' }}>Current Limit:</span> <strong>₹{creditTarget.credit?.creditLimit?.toLocaleString('en-IN') || 0}</strong></div>
              <div><span style={{ color: 'var(--text-tertiary)' }}>Outstanding:</span> <strong style={{ color: 'var(--status-warning)' }}>₹{creditTarget.credit?.outstandingAmount?.toLocaleString('en-IN') || 0}</strong></div>
            </div>

            <div className="form-group">
              <label className="form-label">New Credit Limit (₹) <span className="required">*</span></label>
              <input
                className="form-input"
                type="number"
                min={creditTarget.credit?.outstandingAmount || 0}
                step="1000"
                value={creditForm.creditLimit}
                onChange={e => setCreditForm(prev => ({ ...prev, creditLimit: e.target.value }))}
                required
              />
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                Rule: Cannot be lower than current outstanding balance (₹{creditTarget.credit?.outstandingAmount?.toLocaleString('en-IN') || 0}).
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Terms (Days Net)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                value={creditForm.paymentTermsDays}
                onChange={e => setCreditForm(prev => ({ ...prev, paymentTermsDays: e.target.value }))}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button type="button" onClick={() => setShowCreditModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn btn-primary">
                {submitting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={15} />}
                Save Credit Terms
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: IN-CONTEXT PAYMENT RECORDING
          ───────────────────────────────────────────────────────────── */}
      {paymentModalInvoice && (
        <Modal
          title={`Record Payment for Invoice ${paymentModalInvoice.invoiceNumber}`}
          onClose={() => setPaymentModalInvoice(null)}
          maxWidth="640px"
        >
          <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Invoice summary strip */}
            <div style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div>
                <span className="context-kpi-label">Invoice Total</span>
                <span className="context-kpi-val" style={{ fontSize: '14px' }}>₹{paymentModalInvoice.totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="context-kpi-label">Already Paid</span>
                <span className="context-kpi-val" style={{ fontSize: '14px', color: 'var(--status-success)' }}>₹{paymentModalInvoice.amountPaid.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="context-kpi-label">Outstanding</span>
                <span className="context-kpi-val" style={{ fontSize: '14px', color: 'var(--status-danger)' }}>₹{paymentModalInvoice.outstandingAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Payment Amount (₹) <span className="required">*</span></label>
                <button
                  type="button"
                  onClick={() => setPaymentForm(prev => ({ ...prev, amount: String(paymentModalInvoice.outstandingAmount) }))}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', padding: '2px 8px' }}
                >
                  Pay Full Balance (₹{paymentModalInvoice.outstandingAmount.toLocaleString('en-IN')})
                </button>
              </div>
              <input
                className="form-input"
                type="number"
                min="0.01"
                step="0.01"
                max={paymentModalInvoice.outstandingAmount}
                value={paymentForm.amount}
                onChange={e => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                required
                style={{ fontSize: '15px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select
                  className="form-select"
                  value={paymentForm.paymentMethod}
                  onChange={e => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                >
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                  <option value="CHEQUE">Cheque / Demand Draft</option>
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI / Digital</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Reference / UTR / Cheque #</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. UTR84729103"
                  value={paymentForm.referenceNumber}
                  onChange={e => setPaymentForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes & Remarks</label>
              <input
                className="form-input"
                type="text"
                placeholder="Optional payment notes..."
                value={paymentForm.notes}
                onChange={e => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            {/* Credit restoration preview */}
            {parseFloat(paymentForm.amount) > 0 && (
              <div style={{ padding: '10px 14px', background: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--status-success)' }}>
                ✓ Recording this payment restores <strong>₹{parseFloat(paymentForm.amount).toLocaleString('en-IN')}</strong> back to customer available credit!
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button type="button" onClick={() => setPaymentModalInvoice(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={paymentSubmitting} className="btn btn-primary">
                {paymentSubmitting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Landmark size={15} />}
                Confirm Payment Receipt
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Modal Styles ─────────────────────────────────────────────────────
const ms = {
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 1000, padding: '1rem',
  },
  modal: {
    backgroundColor: 'var(--surface-1)', border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-lg)', width: '100%', maxHeight: '90vh',
    display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-xl)',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)',
  },
  title: { margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' },
  closeBtn: {
    background: 'none', border: 'none', color: 'var(--text-tertiary)',
    cursor: 'pointer', padding: '4px', borderRadius: '4px',
  },
  body: { padding: '20px', overflowY: 'auto' },
};
