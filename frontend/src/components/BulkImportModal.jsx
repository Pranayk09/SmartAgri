import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  X, Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle,
  ChevronRight, RotateCcw, Download, ArrowRight, Loader2, Info
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

// ==========================================
// BULK IMPORT MODAL COMPONENT
// ==========================================
export default function BulkImportModal({ onClose, onImportComplete }) {
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  // Steps: 'upload' -> 'preview' -> 'result'
  const [step, setStep] = useState('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [showAllErrors, setShowAllErrors] = useState(false);

  // ---- FILE SELECTION ----
  const handleFileSelect = useCallback((file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      showToast('Only .xlsx, .xls, and .csv files are supported.', 'error');
      return;
    }
    setSelectedFile(file);
    setPreviewData(null);
  }, [showToast]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  // ---- PREVIEW ----
  const handlePreview = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await axios.post('/api/products/bulk-import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        setPreviewData(res.data.data);
        setStep('preview');
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to parse the file.';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ---- EXECUTE IMPORT ----
  const handleImport = async () => {
    if (!selectedFile) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await axios.post('/api/products/bulk-import/execute', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        setImportResult(res.data.data);
        setStep('result');
        if (onImportComplete) onImportComplete();
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Import failed.';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setSelectedFile(null);
    setPreviewData(null);
    setImportResult(null);
    setShowAllErrors(false);
  };

  // ---- DOWNLOAD TEMPLATE ----
  const downloadTemplate = () => {
    const headers = ['SKU', 'Product Name', 'Category', 'Base Price', 'Min Stock', 'Unit', 'Status'];
    const sampleRows = [
      ['NPK-191919-50', 'NPK 19-19-19 Premium Fertilizer', 'NPK Complex Fertilizers', '1250.00', '100', 'KG', 'ACTIVE'],
      ['UREA-46-50KG', 'Urea 46% Nitrogen', 'Nitrogen Fertilizers', '980.00', '200', 'BAG', 'ACTIVE'],
      ['DAP-18-46-50', 'DAP 18-46-0 Fertilizer', 'Phosphate Fertilizers', '1400.00', '150', 'KG', 'ACTIVE'],
    ];
    const csvContent = [headers, ...sampleRows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smartagri_product_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        {/* ---- Header ---- */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <div style={s.headerIcon}>
              <FileSpreadsheet size={20} color="#10b981" />
            </div>
            <div>
              <h3 style={s.title}>Bulk Import Products</h3>
              <p style={s.subtitle}>Import products from Excel or CSV — categories auto-created</p>
            </div>
          </div>
          <button onClick={onClose} style={s.closeBtn}><X size={18} /></button>
        </div>

        {/* ---- Step Indicator ---- */}
        <div style={s.stepBar}>
          {['upload', 'preview', 'result'].map((st, idx) => {
            const labels = ['Upload File', 'Preview & Validate', 'Import Complete'];
            const active = step === st;
            const done = ['upload', 'preview', 'result'].indexOf(step) > idx;
            return (
              <React.Fragment key={st}>
                <div style={s.stepItem}>
                  <div style={{
                    ...s.stepCircle,
                    background: done ? '#10b981' : active ? 'rgba(16,185,129,0.15)' : 'rgba(51,65,85,0.5)',
                    border: done ? '2px solid #10b981' : active ? '2px solid #10b981' : '2px solid #334155',
                    color: done ? '#fff' : active ? '#10b981' : '#475569',
                  }}>
                    {done ? <CheckCircle size={14} /> : <span style={{ fontSize: '0.7rem', fontWeight: 800 }}>{idx + 1}</span>}
                  </div>
                  <span style={{
                    ...s.stepLabel,
                    color: active ? '#f8fafc' : done ? '#10b981' : '#475569',
                  }}>{labels[idx]}</span>
                </div>
                {idx < 2 && <div style={{ ...s.stepConnector, background: done ? '#10b981' : '#1e293b' }} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* ---- Body ---- */}
        <div style={s.body}>
          {/* ======== STEP 1: UPLOAD ======== */}
          {step === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Info Banner */}
              <div style={s.infoBanner}>
                <Info size={15} color="#3b82f6" style={{ flexShrink: 0, marginTop: '1px' }} />
                <div>
                  <p style={{ margin: 0, color: '#93c5fd', fontSize: '0.8rem', fontWeight: 700 }}>
                    Flexible Column Detection
                  </p>
                  <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.75rem', lineHeight: 1.5 }}>
                    Your file does not need to match exact column names. The system detects common variations
                    like "Product Name", "Item Name", "Base Price", "Rate", "UOM", etc.
                    Categories found in the file will be <strong style={{ color: '#94a3b8' }}>automatically created</strong> if they don't already exist.
                  </p>
                </div>
              </div>

              {/* Drop Zone */}
              <div
                style={{
                  ...s.dropzone,
                  borderColor: isDragging ? '#10b981' : selectedFile ? '#059669' : '#334155',
                  background: isDragging ? 'rgba(16,185,129,0.05)' : selectedFile ? 'rgba(5,150,105,0.04)' : 'rgba(15,23,42,0.4)',
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                />
                {selectedFile ? (
                  <div style={{ textAlign: 'center' }}>
                    <FileSpreadsheet size={40} color="#10b981" style={{ marginBottom: '0.75rem' }} />
                    <p style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.9rem', margin: '0 0 0.25rem' }}>
                      {selectedFile.name}
                    </p>
                    <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0 }}>
                      {(selectedFile.size / 1024).toFixed(1)} KB — click to change file
                    </p>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <Upload size={40} color="#475569" style={{ marginBottom: '0.75rem' }} />
                    <p style={{ color: '#cbd5e1', fontWeight: 700, fontSize: '0.9rem', margin: '0 0 0.25rem' }}>
                      Drag & drop your file here
                    </p>
                    <p style={{ color: '#475569', fontSize: '0.75rem', margin: 0 }}>
                      or click to browse — supports .xlsx, .xls, .csv
                    </p>
                  </div>
                )}
              </div>

              {/* Expected columns */}
              <div style={s.columnsCard}>
                <p style={s.columnsTitle}>Expected Column Format</p>
                <div style={s.columnsPills}>
                  {['SKU *', 'Product Name *', 'Category *', 'Base Price *', 'Min Stock', 'Unit', 'Status'].map(col => (
                    <span key={col} style={{
                      ...s.pill,
                      borderColor: col.includes('*') ? 'rgba(239,68,68,0.35)' : 'rgba(51,65,85,0.8)',
                      color: col.includes('*') ? '#fca5a5' : '#94a3b8',
                    }}>
                      {col}
                    </span>
                  ))}
                </div>
                <p style={{ color: '#475569', fontSize: '0.7rem', margin: '0.5rem 0 0' }}>
                  * required fields &nbsp;|&nbsp; Unit accepts: KG, LITER, BAG, TON &nbsp;|&nbsp; Status: ACTIVE or INACTIVE
                </p>
              </div>

              {/* Actions */}
              <div style={s.footer}>
                <button onClick={downloadTemplate} style={s.ghostBtn}>
                  <Download size={14} /> Download Template
                </button>
                <button
                  onClick={handlePreview}
                  disabled={!selectedFile || isLoading}
                  style={{ ...s.primaryBtn, opacity: (!selectedFile || isLoading) ? 0.5 : 1 }}
                >
                  {isLoading
                    ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Parsing...</>
                    : <><span>Preview & Validate</span> <ChevronRight size={14} /></>
                  }
                </button>
              </div>
            </div>
          )}

          {/* ======== STEP 2: PREVIEW ======== */}
          {step === 'preview' && previewData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Stats Row */}
              <div style={s.statsRow}>
                <StatCard label="Total Rows" value={previewData.totalRows} color="#3b82f6" />
                <StatCard label="Valid" value={previewData.validCount} color="#10b981" />
                <StatCard label="Will Skip" value={previewData.invalidCount} color="#f59e0b" />
                <StatCard
                  label="New Categories"
                  value={[...new Set(previewData.allRows.filter(r => r._errors.length === 0).map(r => r.category))].length}
                  color="#a78bfa"
                />
              </div>

              {/* Missing Columns Warning */}
              {previewData.missingRequired?.length > 0 && (
                <div style={s.warningBanner}>
                  <AlertTriangle size={15} color="#f59e0b" style={{ flexShrink: 0 }} />
                  <p style={{ margin: 0, color: '#fcd34d', fontSize: '0.8rem' }}>
                    <strong>Missing required columns:</strong> {previewData.missingRequired.join(', ')} —
                    import may fail. Check your file headers.
                  </p>
                </div>
              )}

              {/* Column Mapping */}
              <div style={s.mappingCard}>
                <p style={s.mappingTitle}>Detected Column Mapping</p>
                <div style={s.mappingGrid}>
                  {Object.entries(previewData.columnMap).map(([canonical, fileCol]) => (
                    <div key={canonical} style={s.mappingRow}>
                      <span style={s.mappingCanonical}>{canonical}</span>
                      <ArrowRight size={12} color="#475569" />
                      <span style={s.mappingFile}>"{fileCol}"</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview Table */}
              <div>
                <p style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
                  PREVIEW (first {Math.min(previewData.preview.length, 10)} rows)
                </p>
                <div style={s.tableWrapper}>
                  <table style={s.table}>
                    <thead>
                      <tr style={s.theadRow}>
                        <th style={s.th}>Status</th>
                        <th style={s.th}>SKU</th>
                        <th style={s.th}>Product Name</th>
                        <th style={s.th}>Category</th>
                        <th style={s.th}>Price</th>
                        <th style={s.th}>Unit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.preview.map((row, i) => (
                        <tr key={i} style={{ ...s.tr, background: row._errors.length > 0 ? 'rgba(239,68,68,0.05)' : 'transparent' }}>
                          <td style={s.td}>
                            {row._errors.length === 0
                              ? <CheckCircle size={14} color="#10b981" />
                              : <span title={row._errors.join('; ')}><XCircle size={14} color="#ef4444" /></span>
                            }
                          </td>
                          <td style={{ ...s.td, fontFamily: 'monospace', color: '#3b82f6', fontWeight: 700 }}>{row.sku || '—'}</td>
                          <td style={s.td}>{row.name || '—'}</td>
                          <td style={{ ...s.td, color: '#a78bfa' }}>{row.category || '—'}</td>
                          <td style={s.td}>{row.basePrice ? `₹${Number(row.basePrice).toLocaleString('en-IN')}` : '—'}</td>
                          <td style={s.td}><span style={s.unitBadge}>{row.unit || 'KG'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Error List */}
              {previewData.allRows.some(r => r._errors.length > 0) && (
                <div style={s.errorCard}>
                  <p style={{ margin: '0 0 0.5rem', color: '#fca5a5', fontSize: '0.8rem', fontWeight: 700 }}>
                    Rows with validation issues (will be skipped)
                  </p>
                  {previewData.allRows.filter(r => r._errors.length > 0)
                    .slice(0, showAllErrors ? undefined : 3)
                    .map((r, i) => (
                      <div key={i} style={s.errorRow}>
                        <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Row {r._rowIndex}:</span>
                        <span style={{ color: '#ef4444', fontSize: '0.72rem' }}>{r._errors.join(' | ')}</span>
                      </div>
                    ))}
                  {previewData.allRows.filter(r => r._errors.length > 0).length > 3 && (
                    <button onClick={() => setShowAllErrors(v => !v)} style={s.seeMoreBtn}>
                      {showAllErrors ? 'Show less' : `+${previewData.allRows.filter(r => r._errors.length > 0).length - 3} more errors`}
                    </button>
                  )}
                </div>
              )}

              {/* Footer */}
              <div style={s.footer}>
                <button onClick={handleReset} style={s.ghostBtn}>
                  <RotateCcw size={14} /> Start Over
                </button>
                <button
                  onClick={handleImport}
                  disabled={isLoading || previewData.validCount === 0}
                  style={{ ...s.primaryBtn, opacity: (isLoading || previewData.validCount === 0) ? 0.5 : 1 }}
                >
                  {isLoading
                    ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Importing...</>
                    : <><span>Import {previewData.validCount} Products</span> <ChevronRight size={14} /></>
                  }
                </button>
              </div>
            </div>
          )}

          {/* ======== STEP 3: RESULT ======== */}
          {step === 'result' && importResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', textAlign: 'center' }}>
              <div style={s.resultIconWrap}>
                <CheckCircle size={40} color="#10b981" />
              </div>
              <div>
                <h4 style={{ color: '#f8fafc', fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.5rem' }}>
                  Import Complete!
                </h4>
                <p style={{ color: '#64748b', fontSize: '0.8rem' }}>
                  Your product catalog has been updated.
                </p>
              </div>

              {/* Result Stats */}
              <div style={{ ...s.statsRow, width: '100%' }}>
                <StatCard label="Processed" value={importResult.total} color="#3b82f6" />
                <StatCard label="Products Added" value={importResult.productsCreated} color="#10b981" />
                <StatCard label="Categories Created" value={importResult.categoriesCreated} color="#a78bfa" />
                <StatCard label="Skipped" value={importResult.productsSkipped} color="#f59e0b" />
              </div>

              {/* Skipped Errors */}
              {importResult.rowErrors?.length > 0 && (
                <div style={{ ...s.errorCard, width: '100%', textAlign: 'left' }}>
                  <p style={{ margin: '0 0 0.5rem', color: '#fca5a5', fontSize: '0.8rem', fontWeight: 700 }}>
                    Skipped / Error Details
                  </p>
                  {importResult.rowErrors.slice(0, 5).map((e, i) => (
                    <div key={i} style={s.errorRow}>
                      {e.rowIndex && <span style={{ color: '#64748b', fontSize: '0.72rem' }}>Row {e.rowIndex} ({e.sku}):</span>}
                      <span style={{ color: '#f59e0b', fontSize: '0.72rem' }}>{e.errors?.join(' | ') || e.message}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={handleReset} style={s.ghostBtn}>
                  <RotateCcw size={14} /> Import More
                </button>
                <button onClick={onClose} style={s.primaryBtn}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Helper: Stat Card ----
function StatCard({ label, value, color }) {
  return (
    <div style={{
      flex: 1,
      background: 'var(--surface-2)',
      border: `1px solid ${color}35`,
      borderRadius: '10px',
      padding: '0.875rem 0.75rem',
      textAlign: 'center',
      minWidth: 0,
    }}>
      <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color, fontFamily: 'var(--font-mono)' }}>{value}</p>
      <p style={{ margin: '0.25rem 0 0', fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{label}</p>
    </div>
  );
}

// ---- Styles ----
const s = {
  overlay: {
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
    zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1.5rem',
  },
  modal: {
    backgroundColor: 'var(--surface-1)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '680px',
    maxHeight: '92vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow-xl)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid var(--border-subtle)',
    backgroundColor: 'var(--surface-2)',
    flexShrink: 0,
  },
  headerLeft: { display: 'flex', alignItems: 'flex-start', gap: '0.875rem' },
  headerIcon: {
    width: '40px', height: '40px', borderRadius: '10px',
    background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  title: { fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 },
  subtitle: { fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: '0.2rem 0 0' },
  closeBtn: {
    background: 'transparent', border: '1px solid var(--border-subtle)',
    color: 'var(--text-tertiary)', cursor: 'pointer', padding: '0.375rem', borderRadius: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s ease', flexShrink: 0,
  },
  // Step Bar
  stepBar: {
    display: 'flex', alignItems: 'center', padding: '0.875rem 1.5rem',
    borderBottom: '1px solid var(--border-subtle)', flexShrink: 0,
    backgroundColor: 'var(--surface-1)',
  },
  stepItem: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  stepCircle: {
    width: '28px', height: '28px', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    transition: 'all 0.3s ease',
  },
  stepLabel: { fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', transition: 'color 0.3s ease' },
  stepConnector: { flex: 1, height: '1px', margin: '0 0.75rem', minWidth: '20px', transition: 'background 0.3s ease' },
  // Body
  body: {
    padding: '1.5rem',
    overflowY: 'auto',
    flex: 1,
  },
  // Upload step
  infoBanner: {
    display: 'flex', gap: '0.75rem', padding: '0.875rem 1rem',
    background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)',
    borderRadius: '10px',
  },
  dropzone: {
    border: '2px dashed', borderRadius: '14px', padding: '2.5rem 1.5rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: 'all 0.25s ease',
  },
  columnsCard: {
    background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
    borderRadius: '10px', padding: '0.875rem 1rem',
  },
  columnsTitle: { color: 'var(--text-tertiary)', fontSize: '0.72rem', fontWeight: 700, margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
  columnsPills: { display: 'flex', flexWrap: 'wrap', gap: '0.375rem' },
  pill: {
    padding: '0.2rem 0.6rem', borderRadius: '100px', border: '1px solid',
    fontSize: '0.72rem', fontWeight: 600,
  },
  // Preview step
  statsRow: { display: 'flex', gap: '0.75rem' },
  warningBanner: {
    display: 'flex', gap: '0.75rem', padding: '0.75rem 1rem',
    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
    borderRadius: '10px', alignItems: 'flex-start',
  },
  mappingCard: {
    background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
    borderRadius: '10px', padding: '0.875rem 1rem',
  },
  mappingTitle: { color: 'var(--text-tertiary)', fontSize: '0.72rem', fontWeight: 700, margin: '0 0 0.625rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
  mappingGrid: { display: 'flex', flexWrap: 'wrap', gap: '0.375rem 1.5rem' },
  mappingRow: { display: 'flex', alignItems: 'center', gap: '0.375rem' },
  mappingCanonical: { color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 },
  mappingFile: { color: 'var(--brand-500)', fontSize: '0.75rem', fontFamily: 'monospace' },
  tableWrapper: { overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--border-subtle)' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' },
  theadRow: { background: 'var(--surface-2)', borderBottom: '1px solid var(--border-subtle)' },
  th: { padding: '0.625rem 0.875rem', color: 'var(--text-tertiary)', fontWeight: 700, whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.2s' },
  td: { padding: '0.625rem 0.875rem', color: 'var(--text-primary)' },
  unitBadge: {
    background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
    color: '#3b82f6', padding: '0.1rem 0.45rem', borderRadius: '4px',
    fontSize: '0.7rem', fontWeight: 700,
  },
  errorCard: {
    background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '10px', padding: '0.875rem 1rem',
  },
  errorRow: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' },
  seeMoreBtn: {
    background: 'none', border: 'none', color: 'var(--status-danger)',
    fontSize: '0.72rem', cursor: 'pointer', padding: '0.25rem 0',
    fontWeight: 700,
  },
  // Result step
  resultIconWrap: {
    width: '72px', height: '72px', borderRadius: '50%',
    background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  // Footer
  footer: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', marginTop: '0.5rem',
  },
  ghostBtn: {
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    background: 'transparent', border: '1px solid var(--border-default)',
    color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.6rem 1rem',
    borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700,
    transition: 'all 0.2s ease',
  },
  primaryBtn: {
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    background: 'var(--brand-600)', border: 'none',
    color: '#fff', cursor: 'pointer', padding: '0.6rem 1.25rem',
    borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700,
    transition: 'all 0.2s ease',
  },
};
