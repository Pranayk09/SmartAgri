import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiGet, apiPost } from '../utils/api';
import { Landmark, AlertTriangle, CheckSquare, Plus, Receipt, Loader2, IndianRupee, FileText, FilePlus } from 'lucide-react';

export default function InvoicesView() {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' | 'pending'
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);

  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'BANK_TRANSFER',
    referenceNumber: '',
    notes: ''
  });
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, pendRes] = await Promise.all([
        hasPermission('invoices.view') ? apiGet('/invoices') : Promise.resolve({ data: [] }),
        hasPermission('invoices.create') ? apiGet('/invoices/pending-orders') : Promise.resolve({ data: [] })
      ]);
      setInvoices(invRes.data || []);
      setPendingOrders(pendRes.data || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvoice = async (orderId) => {
    try {
      await apiPost('/invoices', { salesOrderId: orderId });
      showToast('Invoice generated successfully!', 'success');
      fetchData(); // Refresh both lists
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const openPaymentModal = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentForm({
      amount: invoice.outstandingAmount.toString(),
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: '',
      notes: ''
    });
    setPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setPaymentSubmitting(true);
    try {
      const amount = parseFloat(paymentForm.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid payment amount.');
      }
      if (amount > selectedInvoice.outstandingAmount) {
        throw new Error(`Amount exceeds outstanding balance (₹${selectedInvoice.outstandingAmount}).`);
      }

      await apiPost(`/invoices/${selectedInvoice.id}/payments`, {
        amount,
        paymentMethod: paymentForm.paymentMethod,
        referenceNumber: paymentForm.referenceNumber,
        notes: paymentForm.notes
      });
      
      showToast('Payment recorded successfully. Customer credit restored.', 'success');
      setPaymentModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // KPIs
  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.outstandingAmount, 0);
  const totalCollected = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
  const pendingCount = invoices.filter(inv => inv.status !== 'PAID').length;

  if (loading && invoices.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <Loader2 size={32} color="#10b981" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Invoices & Payments Finance Loop</h2>
          <p style={styles.subtitle}>Manage receivables, generate invoices from dispatched orders, and record payments.</p>
        </div>
      </div>

      {/* KPI Strip */}
      <div style={styles.kpiGrid}>
        <div className="card" style={styles.kpiCard}>
          <div style={styles.kpiIconWrapper}>
            <AlertTriangle size={20} color="#ef4444" />
          </div>
          <div>
            <p style={styles.kpiLabel}>Total Outstanding</p>
            <p style={styles.kpiValue}>₹{totalOutstanding.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="card" style={styles.kpiCard}>
          <div style={styles.kpiIconWrapper}>
            <IndianRupee size={20} color="#10b981" />
          </div>
          <div>
            <p style={styles.kpiLabel}>Total Collected</p>
            <p style={styles.kpiValue}>₹{totalCollected.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="card" style={styles.kpiCard}>
          <div style={{ ...styles.kpiIconWrapper, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
            <FileText size={20} color="#3b82f6" />
          </div>
          <div>
            <p style={styles.kpiLabel}>Pending Invoices</p>
            <p style={styles.kpiValue}>{pendingCount}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          style={activeTab === 'ledger' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('ledger')}
        >
          <Receipt size={16} /> Invoices Ledger
        </button>
        {hasPermission('invoices.create') && (
          <button
            style={activeTab === 'pending' ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab('pending')}
          >
            <FilePlus size={16} /> Dispatched Orders ({pendingOrders.length})
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {activeTab === 'ledger' && (
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={styles.th}>Invoice #</th>
                <th style={styles.th}>Customer</th>
                <th style={styles.th}>Sales Order #</th>
                <th style={styles.th}>Billed</th>
                <th style={styles.th}>Paid</th>
                <th style={styles.th}>Outstanding</th>
                <th style={styles.th}>Status</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                    No invoices generated yet.
                  </td>
                </tr>
              ) : (
                invoices.map(inv => {
                  const getStatusBadge = (status) => {
                    switch (status) {
                      case 'PAID': return <span className="badge badge-success">PAID</span>;
                      case 'PARTIALLY_PAID': return <span className="badge badge-warning">PARTIAL</span>;
                      case 'PENDING': default: return <span className="badge badge-danger">PENDING</span>;
                    }
                  };

                  return (
                    <tr key={inv.id} style={styles.tr}>
                      <td style={{ ...styles.td, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#3b82f6' }}>{inv.invoiceNumber}</td>
                      <td style={{ ...styles.td, fontWeight: 700 }}>{inv.customer?.name}</td>
                      <td style={{ ...styles.td, color: '#94a3b8' }}>{inv.salesOrder?.orderNumber}</td>
                      <td style={styles.td}>₹{inv.totalAmount.toLocaleString('en-IN')}</td>
                      <td style={{ ...styles.td, color: '#10b981', fontWeight: 600 }}>₹{inv.amountPaid.toLocaleString('en-IN')}</td>
                      <td style={{ ...styles.td, color: inv.outstandingAmount > 0 ? '#ef4444' : '#cbd5e1', fontWeight: 700 }}>₹{inv.outstandingAmount.toLocaleString('en-IN')}</td>
                      <td style={styles.td}>{getStatusBadge(inv.status)}</td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        {inv.status !== 'PAID' ? (
                          hasPermission('invoices.payment') ? (
                            <button onClick={() => openPaymentModal(inv)} style={styles.payBtn}>
                              <Landmark size={14} /> Record Payment
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No access</span>
                          )
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CheckSquare size={14} /> Settled
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'pending' && (
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={styles.th}>Order #</th>
                <th style={styles.th}>Customer</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Dispatch Date</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingOrders.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                    No dispatched orders waiting for invoice.
                  </td>
                </tr>
              ) : (
                pendingOrders.map(order => (
                  <tr key={order.id} style={styles.tr}>
                    <td style={{ ...styles.td, fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#3b82f6' }}>{order.orderNumber}</td>
                    <td style={{ ...styles.td, fontWeight: 700 }}>{order.customer?.name}</td>
                    <td style={styles.td}>₹{order.totalAmount.toLocaleString('en-IN')}</td>
                    <td style={styles.td}>{new Date(order.updatedAt).toLocaleDateString()}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <button onClick={() => handleGenerateInvoice(order.id)} style={styles.generateBtn}>
                        <FilePlus size={14} /> Generate Invoice
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Payment Modal */}
      {paymentModalOpen && selectedInvoice && (
        <div style={styles.modalOverlay}>
          <div className="card" style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
                Record Payment
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                Invoice <strong style={{ color: '#3b82f6' }}>{selectedInvoice.invoiceNumber}</strong>
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Customer:</span>
                <span style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.875rem' }}>{selectedInvoice.customer?.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Outstanding Balance:</span>
                <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.875rem' }}>₹{selectedInvoice.outstandingAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Payment Amount (₹) <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="number"
                  required
                  step="0.01"
                  max={selectedInvoice.outstandingAmount}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  style={styles.input}
                  placeholder="Enter amount"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Payment Method <span style={{ color: '#ef4444' }}>*</span></label>
                <select
                  required
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  style={styles.input}
                >
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="UPI">UPI</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Reference Number</label>
                <input
                  type="text"
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                  style={styles.input}
                  placeholder="Transaction ID, Cheque No, etc."
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Notes</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  style={{ ...styles.input, minHeight: '60px', resize: 'vertical' }}
                  placeholder="Optional notes"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  style={styles.cancelBtn}
                  disabled={paymentSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.submitBtn} disabled={paymentSubmitting}>
                  {paymentSubmitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Landmark size={16} />}
                  Confirm Payment
                </button>
              </div>
            </form>
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
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1.5rem',
  },
  kpiCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.25rem',
  },
  kpiIconWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  kpiLabel: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 700,
    marginBottom: '0.25rem',
  },
  kpiValue: {
    fontSize: '1.5rem',
    fontWeight: 800,
    color: '#f8fafc',
  },
  tabs: {
    display: 'flex',
    gap: '1rem',
    borderBottom: '1px solid #1e293b',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: '#94a3b8',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  activeTab: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid #10b981',
    color: '#10b981',
    fontWeight: 700,
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
    backgroundColor: 'rgba(30, 41, 59, 0.2)',
  },
  td: {
    padding: '1rem 1.5rem',
    color: '#cbd5e1',
  },
  payBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: '#10b981',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    padding: '0.375rem 0.75rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 600,
    transition: 'all 0.2s ease',
  },
  generateBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    color: '#3b82f6',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    padding: '0.375rem 0.75rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 600,
    transition: 'all 0.2s ease',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modalContent: {
    width: '100%',
    maxWidth: '500px',
    padding: '2rem',
  },
  modalHeader: {
    marginBottom: '1.5rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#94a3b8',
  },
  input: {
    padding: '0.75rem 1rem',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#f8fafc',
    fontSize: '0.875rem',
  },
  cancelBtn: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #334155',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
