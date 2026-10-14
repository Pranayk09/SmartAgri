import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiGet, apiPost } from '../utils/api';
import {
  Landmark, AlertTriangle, CheckSquare, Plus, Receipt, Loader2,
  IndianRupee, FileText, FilePlus, Search, Filter, ExternalLink,
  ChevronRight, Calendar, User, ShoppingCart, Clock, CheckCircle2,
  X, Info, ShieldAlert, CreditCard
} from 'lucide-react';

// ─── Modal Wrapper ────────────────────────────────────────────────────
function Modal({ title, onClose, children, maxWidth = '820px' }) {
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

// ─── Main Invoices & Finance View ─────────────────────────────────────
export default function InvoicesView() {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();

  const canView = hasPermission('invoices.view');
  const canCreate = hasPermission('invoices.create');
  const canPayment = hasPermission('invoices.payment');

  const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' | 'pending'
  const [loading, setLoading] = useState(true);

  // Master Lists
  const [invoices, setInvoices] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Contextual Payment Workspace Modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'BANK_TRANSFER',
    referenceNumber: '',
    notes: ''
  });
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // ─── Data Fetching ──────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, pendRes, custRes, ordRes] = await Promise.all([
        canView ? apiGet('/invoices').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        canCreate ? apiGet('/invoices/pending-orders').catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        apiGet('/customers').catch(() => ({ data: [] })),
        apiGet('/sales/orders').catch(() => ({ data: [] })),
      ]);
      setInvoices(invRes.data || []);
      setPendingOrders(pendRes.data || []);
      setCustomers(custRes.data || []);
      setOrders(ordRes.data || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [canView, canCreate, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle invoice generation from dispatched order
  const handleGenerateInvoice = async (orderId) => {
    try {
      await apiPost('/invoices', { salesOrderId: orderId });
      showToast('Tax invoice generated successfully!', 'success');
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Open Contextual Payment Workspace for selected invoice
  const openPaymentWorkspace = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentForm({
      amount: invoice.outstandingAmount.toString(),
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: '',
      notes: `Settlement for ${invoice.invoiceNumber}`
    });
  };

  // Submit payment
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const amount = parseFloat(paymentForm.amount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid payment amount.', 'warning');
      return;
    }
    if (amount > selectedInvoice.outstandingAmount) {
      showToast(`Amount exceeds outstanding balance (₹${selectedInvoice.outstandingAmount.toLocaleString('en-IN')}).`, 'warning');
      return;
    }

    setPaymentSubmitting(true);
    try {
      await apiPost(`/invoices/${selectedInvoice.id}/payments`, {
        amount,
        paymentMethod: paymentForm.paymentMethod,
        referenceNumber: paymentForm.referenceNumber,
        notes: paymentForm.notes
      });

      showToast(`Payment of ₹${amount.toLocaleString('en-IN')} recorded! Customer credit restored.`, 'success');
      setSelectedInvoice(null);
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Context: Customer for selected invoice in payment workspace
  const invoiceCustomer = useMemo(() => {
    if (!selectedInvoice) return null;
    return customers.find(c => c.id === selectedInvoice.customerId) || null;
  }, [selectedInvoice, customers]);

  // Context: Other unpaid invoices for same customer
  const otherCustomerInvoices = useMemo(() => {
    if (!selectedInvoice || !selectedInvoice.customerId) return [];
    return invoices.filter(inv =>
      inv.customerId === selectedInvoice.customerId &&
      inv.id !== selectedInvoice.id &&
      inv.outstandingAmount > 0
    );
  }, [selectedInvoice, invoices]);

  // Context: Linked sales order details for selected invoice
  const linkedSalesOrder = useMemo(() => {
    if (!selectedInvoice || !selectedInvoice.salesOrderId) return null;
    return orders.find(o => o.id === selectedInvoice.salesOrderId) || null;
  }, [selectedInvoice, orders]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchSearch = !searchQuery ||
        inv.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.salesOrder?.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  // KPI Metrics
  const totalOutstanding = useMemo(() => invoices.reduce((sum, inv) => sum + (inv.outstandingAmount || 0), 0), [invoices]);
  const totalCollected = useMemo(() => invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0), [invoices]);
  const pendingCount = useMemo(() => invoices.filter(inv => inv.status !== 'PAID').length, [invoices]);
  const pendingOrdersCount = pendingOrders.length;

  if (loading && invoices.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '5rem' }}>
        <Loader2 size={36} color="var(--brand-500)" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="workspace-container">
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Invoices & Finance Cash Loop
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Manage commercial receivables, issue tax invoices from dispatched shipments, and record payments to restore customer credit.
          </p>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        <div className="card" style={{ padding: '16px', background: 'var(--surface-1)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Receivables Outstanding
          </span>
          <p style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 800, color: 'var(--status-danger)', fontFamily: 'var(--font-mono)' }}>
            ₹{totalOutstanding.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="card" style={{ padding: '16px', background: 'var(--surface-1)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Cash Collected
          </span>
          <p style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 800, color: 'var(--status-success)', fontFamily: 'var(--font-mono)' }}>
            ₹{totalCollected.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="card" style={{ padding: '16px', background: 'var(--surface-1)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Unsettled Invoices Count
          </span>
          <p style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 800, color: 'var(--status-warning)', fontFamily: 'var(--font-mono)' }}>
            {pendingCount}
          </p>
        </div>

        <div className="card" style={{ padding: '16px', background: 'var(--surface-1)' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Dispatches Awaiting Invoice
          </span>
          <p style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 800, color: pendingOrdersCount > 0 ? 'var(--status-info)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {pendingOrdersCount}
          </p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="context-nav-tabs" style={{ maxWidth: '440px' }}>
        <button
          type="button"
          className={`context-nav-tab ${activeTab === 'ledger' ? 'active' : ''}`}
          onClick={() => setActiveTab('ledger')}
        >
          <Receipt size={14} /> Invoices Ledger ({invoices.length})
        </button>

        {canCreate && (
          <button
            type="button"
            className={`context-nav-tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            <FilePlus size={14} /> Pending Invoicing ({pendingOrders.length})
          </button>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: INVOICES LEDGER
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'ledger' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Search & Status Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={14} color="var(--text-tertiary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                className="form-input"
                type="text"
                placeholder="Search by Invoice #, Customer, or Order #..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '34px', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase' }}>
                Status:
              </label>
              <select
                className="form-select"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ minWidth: '160px', fontSize: '13px' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="PAID">Paid (Settled)</option>
              </select>
            </div>
          </div>

          {/* Invoices Table */}
          {filteredInvoices.length === 0 ? (
            <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              <Receipt size={40} style={{ marginBottom: '8px' }} />
              <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>No Invoices Found</h4>
              <p style={{ margin: '4px 0 0', fontSize: '13px' }}>No invoices match current search or filters.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Invoice #</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Customer</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Sales Order</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Due Date</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Total Billed</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Amount Paid</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Outstanding</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map(inv => {
                    const isSettled = inv.status === 'PAID';
                    return (
                      <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background-color 0.15s ease' }}>
                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--status-info)' }}>
                          {inv.invoiceNumber}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {inv.customer?.name}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                          {inv.salesOrder?.orderNumber || '—'}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                          {new Date(inv.dueDate).toLocaleDateString('en-IN')}
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>
                          ₹{inv.totalAmount.toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--status-success)', fontWeight: 600 }}>
                          ₹{inv.amountPaid.toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: inv.outstandingAmount > 0 ? 'var(--status-danger)' : 'var(--text-secondary)' }}>
                          ₹{inv.outstandingAmount.toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className={`badge ${
                            inv.status === 'PAID' ? 'badge-success' :
                            inv.status === 'PARTIALLY_PAID' ? 'badge-warning' : 'badge-danger'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          {!isSettled ? (
                            canPayment ? (
                              <button
                                onClick={() => openPaymentWorkspace(inv)}
                                className="btn btn-primary btn-sm"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px' }}
                              >
                                <Landmark size={13} /> Record Payment
                              </button>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Read Only</span>
                            )
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--status-success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CheckSquare size={13} /> Settled
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: DISPATCHED ORDERS AWAITING INVOICE
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {pendingOrders.length === 0 ? (
            <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              <CheckCircle2 size={40} color="var(--brand-500)" style={{ marginBottom: '8px' }} />
              <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>All Dispatched Orders Invoiced</h4>
              <p style={{ margin: '4px 0 0', fontSize: '13px' }}>No shipments currently waiting for invoice generation.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Order #</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Customer</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Items Dispatched</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Order Amount</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Dispatch Date</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingOrders.map(po => (
                    <tr key={po.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--status-info)' }}>
                        {po.orderNumber}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {po.customer?.name}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="badge badge-info">{po.items?.length || 0} line{(po.items?.length || 0) !== 1 ? 's' : ''}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--brand-400)' }}>
                        ₹{Number(po.totalAmount).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {new Date(po.updatedAt).toLocaleDateString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleGenerateInvoice(po.id)}
                          className="btn btn-primary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Receipt size={13} /> Generate Tax Invoice
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CONTEXTUAL PAYMENT WORKSPACE MODAL
          (Payment Entry + Customer & Invoice Intelligence)
          ───────────────────────────────────────────────────────────── */}
      {selectedInvoice && (
        <Modal
          title={`Contextual Payment Workspace — ${selectedInvoice.invoiceNumber}`}
          onClose={() => setSelectedInvoice(null)}
          maxWidth="860px"
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'start' }}>
            {/* LEFT: Payment Form */}
            <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div>
                  <span className="context-kpi-label">Billed Amount</span>
                  <span className="context-kpi-val" style={{ fontSize: '14px' }}>₹{selectedInvoice.totalAmount.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="context-kpi-label">Paid So Far</span>
                  <span className="context-kpi-val" style={{ fontSize: '14px', color: 'var(--status-success)' }}>₹{selectedInvoice.amountPaid.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="context-kpi-label">Outstanding</span>
                  <span className="context-kpi-val" style={{ fontSize: '14px', color: 'var(--status-danger)' }}>₹{selectedInvoice.outstandingAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Amount input */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">Payment Amount (₹) <span className="required">*</span></label>
                  <button
                    type="button"
                    onClick={() => setPaymentForm(prev => ({ ...prev, amount: String(selectedInvoice.outstandingAmount) }))}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '2px 8px' }}
                  >
                    Pay Full Balance
                  </button>
                </div>
                <input
                  className="form-input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={selectedInvoice.outstandingAmount}
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  required
                  style={{ fontSize: '15px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                />
              </div>

              {/* Payment Method */}
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
                    <option value="UPI">UPI / Digital Gateway</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Reference / UTR #</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="e.g. UTR-93820184"
                    value={paymentForm.referenceNumber}
                    onChange={e => setPaymentForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label">Ledger Notes / Remarks</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Received via HDFC Bank"
                  value={paymentForm.notes}
                  onChange={e => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              {/* Live Credit Restoration Preview */}
              {parseFloat(paymentForm.amount) > 0 && (
                <div style={{ padding: '10px 14px', background: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--status-success)' }}>
                  ✓ <strong>Credit Impact Preview:</strong> This transaction frees up <strong>₹{parseFloat(paymentForm.amount).toLocaleString('en-IN')}</strong> back into {selectedInvoice.customer?.name}'s available credit line!
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setSelectedInvoice(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={paymentSubmitting} className="btn btn-primary">
                  {paymentSubmitting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Landmark size={15} />}
                  Confirm Payment Receipt
                </button>
              </div>
            </form>

            {/* RIGHT: Supporting Commercial Context */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--surface-2)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              {/* Customer Standing */}
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.04em' }}>
                  Customer Credit Health
                </span>
                <h4 style={{ margin: '3px 0 0', fontSize: '14.5px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {selectedInvoice.customer?.name}
                </h4>
                {invoiceCustomer && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>Credit Limit:</span>
                      <strong>₹{Number(invoiceCustomer.credit?.creditLimit || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>Total Outstanding:</span>
                      <strong style={{ color: 'var(--status-warning)' }}>₹{Number(invoiceCustomer.credit?.outstandingAmount || 0).toLocaleString('en-IN')}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>Available Credit:</span>
                      <strong style={{ color: 'var(--status-success)' }}>₹{Number(invoiceCustomer.credit?.availableCredit || 0).toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment History for this Invoice */}
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.04em' }}>
                  Previous Payments on this Invoice ({selectedInvoice.payments?.length || 0})
                </span>
                {(!selectedInvoice.payments || selectedInvoice.payments.length === 0) ? (
                  <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: 'var(--text-tertiary)' }}>
                    No partial payments logged yet.
                  </p>
                ) : (
                  <div className="context-table-wrap" style={{ marginTop: '6px' }}>
                    <table className="context-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Method</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.payments.map(p => (
                          <tr key={p.id}>
                            <td>{new Date(p.paymentDate).toLocaleDateString('en-IN')}</td>
                            <td style={{ fontWeight: 700, color: 'var(--status-success)', fontFamily: 'var(--font-mono)' }}>
                              ₹{p.amount.toLocaleString('en-IN')}
                            </td>
                            <td>{p.paymentMethod}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Other Unpaid Invoices for this customer */}
              {otherCustomerInvoices.length > 0 && (
                <div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--status-warning)', fontWeight: 700, letterSpacing: '0.04em' }}>
                    Other Unpaid Invoices ({otherCustomerInvoices.length})
                  </span>
                  <div className="context-table-wrap" style={{ marginTop: '6px' }}>
                    <table className="context-table">
                      <thead>
                        <tr>
                          <th>Invoice #</th>
                          <th>Due Date</th>
                          <th style={{ textAlign: 'right' }}>Outstanding</th>
                        </tr>
                      </thead>
                      <tbody>
                        {otherCustomerInvoices.slice(0, 3).map(oth => (
                          <tr key={oth.id}>
                            <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--status-info)' }}>{oth.invoiceNumber}</td>
                            <td>{new Date(oth.dueDate).toLocaleDateString('en-IN')}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--status-danger)' }}>
                              ₹{oth.outstandingAmount.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
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
