import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import { apiGet } from '../utils/api';
import {
  Brain,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Zap,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  AlertCircle,
  PackagePlus,
  TrendingUp,
  Calendar,
  Flame,
  Info
} from 'lucide-react';

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  CRITICAL: {
    label: 'CRITICAL',
    badgeClass: 'badge-danger',
    borderColor: 'var(--status-danger)',
    bgColor: 'rgba(239,68,68,0.04)',
    icon: <ShieldAlert size={16} />,
    dot: '#ef4444'
  },
  AMBER: {
    label: 'AMBER RISK',
    badgeClass: 'badge-warning',
    borderColor: 'var(--status-warning)',
    bgColor: 'rgba(245,158,11,0.04)',
    icon: <AlertTriangle size={16} />,
    dot: '#f59e0b'
  },
  HEALTHY: {
    label: 'HEALTHY',
    badgeClass: 'badge-success',
    borderColor: 'var(--status-success)',
    bgColor: 'rgba(16,185,129,0.04)',
    icon: <CheckCircle2 size={16} />,
    dot: '#10b981'
  },
  EXCELLENT: {
    label: 'EXCELLENT',
    badgeClass: 'badge-success',
    borderColor: 'var(--brand-500)',
    bgColor: 'rgba(99,102,241,0.04)',
    icon: <Sparkles size={16} />,
    dot: '#6366f1'
  }
};

const PRIORITY_CONFIG = {
  P1_URGENT: { label: 'P1 URGENT', color: 'var(--status-danger)', bg: 'var(--status-danger-bg)', icon: <Flame size={13} /> },
  P2_THIS_WEEK: { label: 'P2 THIS WEEK', color: 'var(--status-warning)', bg: 'var(--status-warning-bg)', icon: <AlertCircle size={13} /> },
  P3_MONITOR: { label: 'P3 MONITOR', color: 'var(--text-secondary)', bg: 'var(--surface-3)', icon: <Info size={13} /> }
};

export default function AiCopilotCard() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const fetchSummary = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const url = `/ai/executive-summary${forceRefresh ? '?refresh=true' : ''}`;
      const res = await apiGet(url);
      if (res.success) {
        setData(res.data);
        if (forceRefresh) showToast('AI Operations Copilot refreshed.', 'success');
      }
    } catch (err) {
      showToast('Failed to load AI Copilot: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => { fetchSummary(false); }, [fetchSummary]);

  const statusCfg = data ? (STATUS_CONFIG[data.overallStatus] || STATUS_CONFIG.HEALTHY) : null;
  const generatedAt = data?._meta?.generatedAt
    ? new Date(data._meta.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="card" style={{ padding: '20px 24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={20} color="var(--brand-500)" className="spin" />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>AI Operations Copilot</div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Analyzing inventory, sales velocity, and seasonal risk...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div
      id="ai-copilot"
      className="card"
      style={{
        marginBottom: '20px',
        borderLeft: `4px solid ${statusCfg.borderColor}`,
        background: statusCfg.bgColor,
        overflow: 'hidden'
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', cursor: 'pointer' }}
        onClick={() => setExpanded(v => !v)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Brain size={20} color="var(--brand-500)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>AI Operations Copilot</span>
              <span className={`badge ${statusCfg.badgeClass}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                {statusCfg.icon} {statusCfg.label}
              </span>
              {data._meta?.isFallback && (
                <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-tertiary)', fontSize: '10px' }}>
                  LOCAL MODE
                </span>
              )}
              {data.fromCache && (
                <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-tertiary)', fontSize: '10px' }}>
                  CACHED
                </span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              {data._meta?.skusAnalyzed} SKUs · {data._meta?.activeSeason}
              {generatedAt && <> · Updated {generatedAt}</>}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={e => e.stopPropagation()}>
          <button
            onClick={() => fetchSummary(true)}
            className="btn btn-secondary"
            disabled={refreshing}
            style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          >
            <RotateCcw size={13} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh AI'}
          </button>
          <button
            onClick={() => setExpanded(v => !v)}
            className="btn btn-secondary"
            style={{ padding: '6px 10px' }}
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* ── Expanded Body ───────────────────────────────────────────────────── */}
      {expanded && (
        <div style={{ padding: '0 20px 20px 20px' }}>
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>

            {/* Executive Summary */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                Executive Summary
              </div>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0, borderLeft: '3px solid var(--border-default)', paddingLeft: '12px' }}>
                {data.executiveSummary}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: '20px' }}>

              {/* Left: Immediate Actions */}
              <div>
                {data.immediateActions?.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                      ⚡ Immediate Actions
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {data.immediateActions.map((action, i) => {
                        const pCfg = PRIORITY_CONFIG[action.priority] || PRIORITY_CONFIG.P3_MONITOR;
                        return (
                          <div
                            key={i}
                            style={{
                              padding: '12px 14px',
                              borderRadius: '8px',
                              background: 'var(--surface-2)',
                              border: '1px solid var(--border-subtle)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', flex: 1 }}>
                                {action.actionTitle}
                              </span>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '3px',
                                fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px',
                                background: pCfg.bg, color: pCfg.color, flexShrink: 0, whiteSpace: 'nowrap'
                              }}>
                                {pCfg.icon} {pCfg.label}
                              </span>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                              {action.actionDetail}
                            </p>
                            {action.targetSku && action.recommendedQuantity > 0 && (
                              <a
                                href="#inventory"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '8px', fontSize: '11px', color: 'var(--brand-500)', fontWeight: 700, textDecoration: 'none' }}
                              >
                                <PackagePlus size={12} />
                                Schedule +{action.recommendedQuantity} units for {action.targetSku}
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Expiry Alerts */}
                {data.expiryAlerts?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                      ⚠️ Expiry & FEFO Alerts
                    </div>
                    {data.expiryAlerts.map((alert, i) => (
                      <div key={i} style={{
                        padding: '10px 12px', borderRadius: '8px', marginBottom: '6px',
                        background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--text-primary)' }}>
                            {alert.productName}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', whiteSpace: 'nowrap' }}>
                            <Clock size={11} style={{ marginRight: '3px', verticalAlign: 'middle' }} />
                            {alert.daysToExpiry}d left
                          </span>
                        </div>
                        <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                          {alert.units} units · {alert.recommendedAction}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Seasonal Insight + Financial Risk */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.seasonalInsight && (
                  <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <Calendar size={14} color="var(--brand-500)" />
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Seasonal Intelligence
                      </span>
                    </div>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                      {data.seasonalInsight}
                    </p>
                  </div>
                )}

                {data.financialRiskNote && (
                  <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <TrendingUp size={14} color="var(--status-success)" />
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--status-success)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Financial Context
                      </span>
                    </div>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                      {data.financialRiskNote}
                    </p>
                  </div>
                )}

                {data.statusRationale && (
                  <div style={{ padding: '12px 14px', borderRadius: '8px', background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Status Rationale
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                      {data.statusRationale}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
