import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiGet, apiPost } from '../utils/api';
import {
  TrendingUp,
  CloudRain,
  Calendar,
  AlertTriangle,
  ShieldCheck,
  Zap,
  RotateCcw,
  Sliders,
  ChevronRight,
  Boxes,
  PackagePlus,
  Info,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  ArrowUpRight,
  Filter,
  Sparkles,
  Layers,
  Search,
  Sun,
  Droplets,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';

export default function AgriForecastView() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [activeTab, setActiveTab] = useState('chart'); // 'chart', 'matrix', 'guide'
  const [showHowItWorks, setShowHowItWorks] = useState(true);
  
  // Forecast Data from Backend
  const [forecastData, setForecastData] = useState(null);

  // Scenario Simulator State
  const [scenario, setScenario] = useState({
    season: 'KHARIF',
    monsoonDeltaDays: 0,
    acreageGrowthPercent: 0,
    serviceLevel: 95,
    leadTimeDays: 14
  });

  // Active Preset Tracker
  const [activePreset, setActivePreset] = useState('NORMAL');

  // SKU Matrix Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Schedule Batch Modal State
  const [selectedSkuForBatch, setSelectedSkuForBatch] = useState(null);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchSizeInput, setBatchSizeInput] = useState('');
  const [batchNotes, setBatchNotes] = useState('');
  const [schedulingBatch, setSchedulingBatch] = useState(false);

  // Hover point inspector for chart
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Initial Fetch
  const fetchForecast = async (customParams = null) => {
    setLoading(true);
    try {
      const queryParams = customParams 
        ? `?season=${customParams.season}&monsoonDeltaDays=${customParams.monsoonDeltaDays}&acreageGrowthPercent=${customParams.acreageGrowthPercent}&serviceLevel=${customParams.serviceLevel}&leadTimeDays=${customParams.leadTimeDays}`
        : '';
      const res = await apiGet(`/forecast${queryParams}`);
      if (res.success) {
        setForecastData(res.data);
        if (!customParams && res.data.scenario) {
          setScenario({
            season: res.data.scenario.season.code,
            monsoonDeltaDays: res.data.scenario.monsoonDeltaDays || 0,
            acreageGrowthPercent: res.data.scenario.acreageGrowthPercent || 0,
            serviceLevel: res.data.scenario.serviceLevel || 95,
            leadTimeDays: res.data.scenario.leadTimeDays || 14
          });
        }
      }
    } catch (err) {
      showToast('Failed to load AgriForecast data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, []);

  // Handle Scenario Simulation
  const handleRunSimulation = async (customScenario = null) => {
    setSimulating(true);
    const targetScenario = customScenario || scenario;
    try {
      const res = await apiPost('/forecast/simulate', targetScenario);
      if (res.success) {
        setForecastData(res.data);
        showToast('Scenario simulation calculated successfully.', 'success');
      }
    } catch (err) {
      showToast('Simulation failed: ' + err.message, 'error');
    } finally {
      setSimulating(false);
    }
  };

  // Preset Scenario Buttons
  const applyPreset = (presetKey) => {
    setActivePreset(presetKey);
    let newScenario = { ...scenario };

    if (presetKey === 'NORMAL') {
      newScenario = { ...newScenario, monsoonDeltaDays: 0, acreageGrowthPercent: 0, serviceLevel: 95 };
    } else if (presetKey === 'DELAYED_MONSOON') {
      newScenario = { ...newScenario, monsoonDeltaDays: 10, acreageGrowthPercent: 0 };
    } else if (presetKey === 'EARLY_RAINS') {
      newScenario = { ...newScenario, monsoonDeltaDays: -7, acreageGrowthPercent: 5 };
    } else if (presetKey === 'BUMPER_SOWING') {
      newScenario = { ...newScenario, monsoonDeltaDays: 0, acreageGrowthPercent: 20, serviceLevel: 98 };
    } else if (presetKey === 'DROUGHT_RISK') {
      newScenario = { ...newScenario, monsoonDeltaDays: 14, acreageGrowthPercent: -15 };
    }

    setScenario(newScenario);
    handleRunSimulation(newScenario);
  };

  // Reset to Baseline
  const handleResetBaseline = () => {
    const defaultParams = {
      season: 'KHARIF',
      monsoonDeltaDays: 0,
      acreageGrowthPercent: 0,
      serviceLevel: 95,
      leadTimeDays: 14
    };
    setActivePreset('NORMAL');
    setScenario(defaultParams);
    fetchForecast(defaultParams);
    showToast('Reset forecast scenario to baseline defaults.', 'info');
  };

  // Open Schedule Batch Modal
  const handleOpenBatchModal = (skuItem) => {
    setSelectedSkuForBatch(skuItem);
    setBatchSizeInput(skuItem.recommendedBatchSize || Math.max(100, skuItem.dynamicROP - skuItem.currentStock));
    setBatchNotes(`AgriForecast seasonal buffer replenishment for ${forecastData?.scenario?.season?.name || 'Sowing Window'}`);
    setBatchModalOpen(true);
  };

  // Submit Schedule Batch
  const handleSubmitBatch = async (e) => {
    e.preventDefault();
    if (!selectedSkuForBatch) return;

    const qty = parseFloat(batchSizeInput);
    if (isNaN(qty) || qty <= 0) {
      showToast('Please enter a valid batch quantity.', 'error');
      return;
    }

    setSchedulingBatch(true);
    try {
      const res = await apiPost('/forecast/schedule-batch', {
        productId: selectedSkuForBatch.productId,
        batchSize: qty,
        leadTimeDays: scenario.leadTimeDays,
        notes: batchNotes
      });

      if (res.success) {
        showToast(res.message || 'Batch scheduled successfully!', 'success');
        setBatchModalOpen(false);
        fetchForecast(scenario);
      }
    } catch (err) {
      showToast('Failed to schedule batch: ' + err.message, 'error');
    } finally {
      setSchedulingBatch(false);
    }
  };

  // Filtered SKUs
  const filteredSkus = useMemo(() => {
    if (!forecastData?.skus) return [];
    return forecastData.skus.filter(sku => {
      const matchesSearch = 
        sku.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sku.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'ALL' || sku.category === categoryFilter;
      const matchesStatus = statusFilter === 'ALL' || sku.stockStatus === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [forecastData, searchQuery, categoryFilter, statusFilter]);

  // Counts by status for quick pill filters
  const statusCounts = useMemo(() => {
    if (!forecastData?.skus) return { all: 0, imminent: 0, below: 0, optimal: 0, over: 0 };
    return {
      all: forecastData.skus.length,
      imminent: forecastData.skus.filter(s => s.stockStatus === 'STOCKOUT_IMMINENT').length,
      below: forecastData.skus.filter(s => s.stockStatus === 'BELOW_BUFFER').length,
      optimal: forecastData.skus.filter(s => s.stockStatus === 'OPTIMAL').length,
      over: forecastData.skus.filter(s => s.stockStatus === 'OVERSTOCKED').length
    };
  }, [forecastData]);

  // Unique Categories
  const categoriesList = useMemo(() => {
    if (!forecastData?.skus) return [];
    const set = new Set(forecastData.skus.map(s => s.category));
    return Array.from(set);
  }, [forecastData]);

  // SVG Chart Calculations
  const chartData = useMemo(() => {
    if (!forecastData?.dailyTimeline || forecastData.dailyTimeline.length === 0) return null;

    const timeline = forecastData.dailyTimeline;
    const maxDemand = Math.max(...timeline.map(d => d.upperDemand), 10);
    const width = 850;
    const height = 280;
    const padding = { top: 25, right: 35, bottom: 45, left: 60 };

    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const getX = (idx) => padding.left + (idx / (timeline.length - 1)) * chartW;
    const getY = (val) => padding.top + chartH - (val / maxDemand) * chartH;

    // Upper Confidence Band Path
    const upperPoints = timeline.map((d, i) => `${getX(i)},${getY(d.upperDemand)}`);
    // Lower Confidence Band Path (reversed to form enclosed polygon)
    const lowerPoints = timeline.map((d, i) => `${getX(i)},${getY(d.lowerDemand)}`).reverse();
    const confidenceAreaPath = `M ${upperPoints.join(' L ')} L ${lowerPoints.join(' L ')} Z`;

    // Median Line Path
    const medianLinePath = timeline.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.medianDemand)}`).join(' ');

    // Fertilizer Curve Path
    const fertLinePath = timeline.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.fertilizerDemand)}`).join(' ');

    // Seeds Curve Path
    const seedsLinePath = timeline.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.seedsDemand)}`).join(' ');

    return {
      width,
      height,
      padding,
      chartW,
      chartH,
      maxDemand,
      getX,
      getY,
      confidenceAreaPath,
      medianLinePath,
      fertLinePath,
      seedsLinePath,
      timeline
    };
  }, [forecastData]);

  const formatNumber = (num) => new Intl.NumberFormat('en-IN').format(num || 0);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  if (loading && !forecastData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Sparkles size={44} color="var(--brand-500)" className="spin" style={{ marginBottom: '16px' }} />
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Computing AgriForecast Sowing Surge Models...
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px' }}>
          Simulating seasonal wave curves, monsoon shifts, and factory production lead times.
        </p>
      </div>
    );
  }

  const { summary, scenario: activeScen } = forecastData || {};

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* 1. Header Banner */}
      <div className="card" style={{ padding: '22px 26px', marginBottom: '18px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', fontSize: '12px' }}>
                <Sparkles size={13} /> AGRIFORECAST AI
              </span>
              <span className="badge" style={{ background: 'var(--status-info-bg)', color: 'var(--status-info)', borderColor: 'var(--status-info-border)', fontSize: '12px', padding: '4px 10px' }}>
                🌾 {activeScen?.season?.name || 'Active Sowing Cycle'}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', background: 'var(--surface-3)', padding: '3px 10px', borderRadius: '6px' }}>
                ⏳ Sowing Rush Starts: <strong>Day {14 + (scenario.monsoonDeltaDays || 0)}</strong>
              </span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              Sowing-Window Demand & Buffer Stocking
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '6px 0 0 0', maxWidth: '850px', lineHeight: 1.5 }}>
              AI forecasts seasonal farmer demand spikes so your factory can manufacture and stage stock <strong>before</strong> the 3-week sowing window begins — preventing lost sales.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setShowHowItWorks(!showHowItWorks)}
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
            >
              <HelpCircle size={15} />
              {showHowItWorks ? 'Hide Guide' : 'How It Works'}
              {showHowItWorks ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <button 
              onClick={() => fetchForecast(scenario)} 
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
              title="Refresh live data"
            >
              <RotateCcw size={14} /> Sync
            </button>
            <button 
              onClick={() => setActiveTab('matrix')} 
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '9px 16px' }}
            >
              <Zap size={15} /> View Critical Stock
            </button>
          </div>
        </div>

        {/* 3-Step "How It Works" Clear Explainer (Collapsible) */}
        {showHowItWorks && (
          <div style={{ marginTop: '20px', paddingTop: '18px', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
              💡 How This Feature Protects Your Business in 3 Steps:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
              <div style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--brand-500)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>1</span>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>Seasonal Surge Prediction</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  The AI knows farmers buy 80% of fertilizer within 3 weeks of rainfall. It calculates expected daily sales for the next 60 days.
                </p>
              </div>

              <div style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--status-danger)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>2</span>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>Stockout Warnings (Red Pills)</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  It compares current warehouse bags against factory lead time (14 days). If stock runs out before a new batch can finish, it flags red.
                </p>
              </div>

              <div style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--status-info)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>3</span>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>1-Click Production Action</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Click <strong>"⚡ Schedule"</strong> to instantly create a batch in the factory for the exact shortage amount.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Top Executive KPI Metric Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '22px' }}>
        
        {/* KPI 1: 30-Day Projected Demand */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                30-Day Demand Forecast
              </span>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Expected farmer purchases</div>
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--brand-100)', color: 'var(--brand-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {formatNumber(summary?.projected30dDemand)} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-tertiary)' }}>units</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '12px', color: 'var(--brand-500)', fontWeight: 600 }}>
            <ArrowUpRight size={15} />
            <span>Peak surge: <strong>{summary?.projectedSurgeRatio}x</strong> normal run-rate</span>
          </div>
        </div>

        {/* KPI 2: Current Inventory vs 60d Need */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Current Warehouse Stock
              </span>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Ready in finished goods</div>
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--status-info-bg)', color: 'var(--status-info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Boxes size={20} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {formatNumber(summary?.currentTotalStock)} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-tertiary)' }}>units</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
            Full season need: <strong>{formatNumber(summary?.projected60dDemand)} units</strong>
          </div>
        </div>

        {/* KPI 3: Potential Lost Sales (Stockout Risk) */}
        <div className="card" style={{ 
          padding: '20px 22px', 
          borderLeft: summary?.capitalAtStockoutRisk > 0 ? '4px solid var(--status-danger)' : '1px solid var(--border-default)',
          background: summary?.capitalAtStockoutRisk > 0 ? 'rgba(239, 68, 68, 0.03)' : undefined
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Potential Lost Revenue
              </span>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Stockout risk if unreplenished</div>
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--status-danger-bg)', color: 'var(--status-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: summary?.capitalAtStockoutRisk > 0 ? 'var(--status-danger)' : 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {formatCurrency(summary?.capitalAtStockoutRisk)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '12px', color: summary?.imminentStockoutsCount > 0 ? 'var(--status-danger)' : 'var(--text-tertiary)', fontWeight: 600 }}>
            {summary?.imminentStockoutsCount > 0 ? (
              <>
                <AlertCircle size={15} />
                <span>{summary.imminentStockoutsCount} products will run out during peak!</span>
              </>
            ) : (
              <span>All product buffers are fully covered</span>
            )}
          </div>
        </div>

        {/* KPI 4: Dynamic Buffer Health Index */}
        <div className="card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Buffer Health Score
              </span>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Stock safety compliance</div>
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--status-purple-bg)', color: 'var(--status-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {summary?.healthIndexPercent}%
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              ({summary?.optimalCount} of {summary?.totalSkusAnalyzed} safe)
            </span>
          </div>
          <div style={{ marginTop: '10px', width: '100%', height: '8px', background: 'var(--surface-3)', borderRadius: '4px', overflow: 'hidden' }}>
            <div 
              style={{ 
                height: '100%', 
                width: `${summary?.healthIndexPercent}%`, 
                background: summary?.healthIndexPercent > 70 ? 'var(--brand-500)' : summary?.healthIndexPercent > 40 ? 'var(--status-warning)' : 'var(--status-danger)',
                transition: 'width 0.4s ease'
              }} 
            />
          </div>
        </div>

      </div>

      {/* 3. Main Workspace: Two-Column Task Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(360px, 1.15fr)', gap: '24px' }}>
        
        {/* Left Column (65%): Demand Curves, Buffer Matrix & Agronomic Calendar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Subtab Navigation Strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-default)', paddingBottom: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('chart')}
              className={`btn ${activeTab === 'chart' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <TrendingUp size={15} /> 60-Day Sowing Demand Curve
            </button>
            <button
              onClick={() => setActiveTab('matrix')}
              className={`btn ${activeTab === 'matrix' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Boxes size={15} /> SKU Buffer & Replenishment Matrix
              {summary?.imminentStockoutsCount > 0 && (
                <span className="badge badge-danger" style={{ fontSize: '11px', padding: '1px 7px', marginLeft: '4px' }}>
                  {summary.imminentStockoutsCount} Urgent
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`btn ${activeTab === 'guide' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Calendar size={15} /> Sowing Calendar & Crops
            </button>
          </div>

          {/* TAB 1: 60-Day Sowing Demand Curve (Interactive SVG Chart) */}
          {activeTab === 'chart' && (
            <div className="card" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Predictive Sowing Wave Curve (Next 60 Days)
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
                    Shaded green band represents the 90% confidence rush window (Upper 95% vs Lower 5%).
                  </p>
                </div>
                
                {/* Clear Legend */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', background: 'var(--surface-2)', padding: '6px 12px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '14px', height: '3px', background: 'var(--brand-500)', borderRadius: '2px' }} />
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Total Demand</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '14px', height: '2px', background: 'var(--status-info)', borderRadius: '2px' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>Fertilizers</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '14px', height: '2px', background: 'var(--status-warning)', borderRadius: '2px' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>Seeds</span>
                  </div>
                </div>
              </div>

              {/* Chart Canvas Area */}
              {chartData && (
                <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
                  <svg 
                    viewBox={`0 0 ${chartData.width} ${chartData.height}`} 
                    style={{ width: '100%', height: 'auto', maxHeight: '330px', display: 'block' }}
                  >
                    <defs>
                      <linearGradient id="confidenceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--brand-500)" stopOpacity="0.30" />
                        <stop offset="100%" stopColor="var(--brand-500)" stopOpacity="0.04" />
                      </linearGradient>
                    </defs>

                    {/* Sowing Surge Zone Shading (Days 8 to 28) */}
                    {(() => {
                      const startX = chartData.getX(Math.max(0, 7 + scenario.monsoonDeltaDays));
                      const endX = chartData.getX(Math.min(59, 26 + scenario.monsoonDeltaDays));
                      return (
                        <g>
                          <rect
                            x={startX}
                            y={chartData.padding.top}
                            width={Math.max(20, endX - startX)}
                            height={chartData.chartH}
                            fill="rgba(16, 185, 129, 0.07)"
                            rx="4"
                          />
                          <text
                            x={startX + (endX - startX) / 2}
                            y={chartData.padding.top + 16}
                            fill="var(--brand-500)"
                            fontSize="11"
                            fontWeight="700"
                            textAnchor="middle"
                            letterSpacing="0.04em"
                          >
                            PEAK SOWING WINDOW
                          </text>
                        </g>
                      );
                    })()}

                    {/* Horizontal Grid Lines */}
                    {[0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
                      const y = chartData.padding.top + chartData.chartH * (1 - ratio);
                      return (
                        <g key={idx}>
                          <line 
                            x1={chartData.padding.left} 
                            y1={y} 
                            x2={chartData.width - chartData.padding.right} 
                            y2={y} 
                            stroke="var(--border-subtle)" 
                            strokeDasharray="4 4" 
                          />
                          <text 
                            x={chartData.padding.left - 10} 
                            y={y + 4} 
                            fill="var(--text-tertiary)" 
                            fontSize="10" 
                            textAnchor="end"
                            fontFamily="var(--font-mono)"
                          >
                            {Math.round(chartData.maxDemand * ratio)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Peak Sowing Center Marker Vertical Line */}
                    {(() => {
                      const peakIndex = Math.min(Math.max(0, 13 + (scenario.monsoonDeltaDays || 0)), 59);
                      const peakX = chartData.getX(peakIndex);
                      return (
                        <g>
                          <line 
                            x1={peakX} 
                            y1={chartData.padding.top + 22} 
                            x2={peakX} 
                            y2={chartData.height - chartData.padding.bottom} 
                            stroke="var(--status-danger)" 
                            strokeWidth="1.5" 
                            strokeDasharray="3 3" 
                          />
                          <text 
                            x={peakX} 
                            y={chartData.padding.top + 35} 
                            fill="var(--status-danger)" 
                            fontSize="10" 
                            fontWeight="700"
                            textAnchor="middle"
                          >
                            Peak Day {peakIndex + 1}
                          </text>
                        </g>
                      );
                    })()}

                    {/* Factory Lead Time Marker (Day 14) */}
                    {(() => {
                      const leadX = chartData.getX(scenario.leadTimeDays - 1);
                      return (
                        <g>
                          <line 
                            x1={leadX} 
                            y1={chartData.padding.top} 
                            x2={leadX} 
                            y2={chartData.height - chartData.padding.bottom} 
                            stroke="var(--status-info)" 
                            strokeWidth="1.5" 
                            strokeDasharray="2 2" 
                          />
                          <text 
                            x={leadX} 
                            y={chartData.height - chartData.padding.bottom + 20} 
                            fill="var(--status-info)" 
                            fontSize="10" 
                            fontWeight="700"
                            textAnchor="middle"
                          >
                            Lead Time ({scenario.leadTimeDays}d)
                          </text>
                        </g>
                      );
                    })()}

                    {/* Confidence Band Polygon */}
                    <path d={chartData.confidenceAreaPath} fill="url(#confidenceGrad)" />

                    {/* Category Lines */}
                    <path d={chartData.fertLinePath} fill="none" stroke="var(--status-info)" strokeWidth="1.5" strokeOpacity="0.75" />
                    <path d={chartData.seedsLinePath} fill="none" stroke="var(--status-warning)" strokeWidth="1.5" strokeOpacity="0.75" />

                    {/* Total Median Demand Main Line */}
                    <path d={chartData.medianLinePath} fill="none" stroke="var(--brand-500)" strokeWidth="3" />

                    {/* Interactive Points on Median Line */}
                    {chartData.timeline.map((d, i) => {
                      if (i % 3 !== 0 && i !== (13 + scenario.monsoonDeltaDays)) return null;
                      const cx = chartData.getX(i);
                      const cy = chartData.getY(d.medianDemand);
                      const isHovered = hoveredPoint?.day === d.day;
                      return (
                        <circle
                          key={i}
                          cx={cx}
                          cy={cy}
                          r={isHovered ? 6 : 3.5}
                          fill={isHovered ? '#ffffff' : 'var(--brand-500)'}
                          stroke="var(--brand-700)"
                          strokeWidth="2"
                          style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                          onMouseEnter={() => setHoveredPoint(d)}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      );
                    })}

                    {/* X-Axis Labels */}
                    {[1, 15, 30, 45, 60].map((dayVal) => {
                      const x = chartData.getX(dayVal - 1);
                      return (
                        <text
                          key={dayVal}
                          x={x}
                          y={chartData.height - 10}
                          fill="var(--text-tertiary)"
                          fontSize="10"
                          textAnchor="middle"
                          fontFamily="var(--font-mono)"
                        >
                          Day {dayVal}
                        </text>
                      );
                    })}
                  </svg>

                  {/* Hover Point Inspection Tooltip */}
                  {hoveredPoint && (
                    <div style={{
                      position: 'absolute',
                      top: '16px',
                      right: '24px',
                      background: 'var(--surface-1)',
                      border: '1.5px solid var(--brand-500)',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      boxShadow: 'var(--shadow-lg)',
                      pointerEvents: 'none',
                      fontSize: '12px',
                      zIndex: 10
                    }}>
                      <div style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        📅 Day {hoveredPoint.day} ({hoveredPoint.date})
                      </div>
                      <div style={{ color: 'var(--brand-500)', fontWeight: 700, fontSize: '13px' }}>
                        Projected Demand: {formatNumber(hoveredPoint.medianDemand)} units
                      </div>
                      <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Rush Band: {formatNumber(hoveredPoint.lowerDemand)} – {formatNumber(hoveredPoint.upperDemand)}
                      </div>
                      <div style={{ color: 'var(--status-info)', marginTop: '4px', borderTop: '1px solid var(--border-subtle)', paddingTop: '4px' }}>
                        Fertilizers: {formatNumber(hoveredPoint.fertilizerDemand)} | Seeds: {formatNumber(hoveredPoint.seedsDemand)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Chart Guidance Note */}
              <div style={{ marginTop: '16px', padding: '12px 16px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                <Info size={18} color="var(--brand-500)" style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)' }}>
                  <strong>How to read this curve:</strong> The steep rise is when farmers apply basal fertilizers (NPK, DAP) immediately after planting. Your warehouse must have full stock staged <strong>before</strong> the red vertical line (Peak Day).
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: SKU Dynamic Buffer & ROP Matrix Table */}
          {activeTab === 'matrix' && (
            <div className="card" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    SKU Buffer & Replenishment Matrix
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
                    Red rows will run out of stock during the sowing rush. Click <strong>"⚡ Schedule"</strong> to create factory production orders.
                  </p>
                </div>

                {/* Filter Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    className={`btn ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                  >
                    All ({statusCounts.all})
                  </button>
                  <button
                    onClick={() => setStatusFilter('STOCKOUT_IMMINENT')}
                    className={`btn ${statusFilter === 'STOCKOUT_IMMINENT' ? 'btn-danger' : 'btn-secondary'}`}
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                  >
                    🔴 Urgent Risk ({statusCounts.imminent})
                  </button>
                  <button
                    onClick={() => setStatusFilter('OPTIMAL')}
                    className={`btn ${statusFilter === 'OPTIMAL' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                  >
                    🟢 Safe ({statusCounts.optimal})
                  </button>
                </div>
              </div>

              {/* Search & Category Filter Row */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input
                    type="text"
                    placeholder="Search product name or SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="form-control"
                    style={{ paddingLeft: '32px', height: '36px', fontSize: '13px' }}
                  />
                </div>

                <select 
                  value={categoryFilter} 
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="form-control"
                  style={{ height: '36px', fontSize: '13px', width: '180px' }}
                >
                  <option value="ALL">All Categories</option>
                  {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Product & SKU</th>
                      <th>Category</th>
                      <th style={{ textAlign: 'right' }}>Current Stock</th>
                      <th style={{ textAlign: 'right' }}>30d Need</th>
                      <th style={{ textAlign: 'right' }}>Safe Level (ROP)</th>
                      <th style={{ textAlign: 'center' }}>Stock Depletion</th>
                      <th>Buffer Health</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSkus.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-tertiary)' }}>
                          No products match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredSkus.map(item => {
                        const isSevere = item.stockStatus === 'STOCKOUT_IMMINENT';
                        const isBelow = item.stockStatus === 'BELOW_BUFFER';

                        return (
                          <tr key={item.productId} style={{ background: isSevere ? 'rgba(239, 68, 68, 0.05)' : undefined }}>
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.productName}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{item.sku}</div>
                            </td>
                            <td>
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.category}</span>
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                              {formatNumber(item.currentStock)} {item.unit}
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                              {formatNumber(item.projected30dDemand)} {item.unit}
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--brand-500)', fontWeight: 700 }}>
                              {formatNumber(item.dynamicROP)} {item.unit}
                            </td>
                            <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                              <span style={{ 
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: item.runoutDays <= item.leadTimeDays ? 'var(--status-danger-bg)' : item.runoutDays <= 30 ? 'var(--status-warning-bg)' : 'var(--status-success-bg)',
                                color: item.runoutDays <= item.leadTimeDays ? 'var(--status-danger)' : item.runoutDays <= 30 ? 'var(--status-warning)' : 'var(--status-success)'
                              }}>
                                {item.runoutDays > 365 ? '>365 days' : `${item.runoutDays} days`}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${
                                isSevere ? 'badge-danger' : isBelow ? 'badge-warning' : item.stockStatus === 'OVERSTOCKED' ? 'badge-info' : 'badge-success'
                              }`} style={{ fontSize: '11px' }}>
                                {item.statusLabel}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {(isSevere || isBelow) ? (
                                <button
                                  onClick={() => handleOpenBatchModal(item)}
                                  className={`btn ${isSevere ? 'btn-danger' : 'btn-primary'}`}
                                  style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}
                                  title="Schedule replenishment batch in factory"
                                >
                                  <Zap size={14} /> Schedule +{formatNumber(item.recommendedBatchSize)} {item.unit}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleOpenBatchModal(item)}
                                  className="btn btn-secondary"
                                  style={{ padding: '5px 10px', fontSize: '11px' }}
                                >
                                  Custom Batch
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Agronomic Calendar & Crop Guide */}
          {activeTab === 'guide' && (
            <div className="card" style={{ padding: '22px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Understanding Sowing Cycles & Demand Surges
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                Why agricultural demand is different from standard retail.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                {/* Kharif */}
                <div style={{ padding: '18px', borderRadius: '10px', border: activeScen?.season?.code === 'KHARIF' ? '2px solid var(--brand-500)' : '1px solid var(--border-subtle)', background: 'var(--surface-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--brand-500)' }}>1. Kharif Season (Monsoon)</span>
                    <span className="badge badge-primary">June – October</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 10px 0' }}>
                    Triggered by southwest monsoon rains. Accounts for 55% of all national fertilizer sales. Basal NPK application must happen within 48 hours of sowing.
                  </p>
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                    <strong>Major Crops:</strong> Paddy (Rice), Cotton, Soybean, Maize, Groundnut.
                  </div>
                </div>

                {/* Rabi */}
                <div style={{ padding: '18px', borderRadius: '10px', border: activeScen?.season?.code === 'RABI' ? '2px solid var(--brand-500)' : '1px solid var(--border-subtle)', background: 'var(--surface-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--status-info)' }}>2. Rabi Season (Winter)</span>
                    <span className="badge" style={{ background: 'var(--status-info-bg)', color: 'var(--status-info)' }}>October – March</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 10px 0' }}>
                    Winter sowing relying on ground moisture and canal irrigation. Highest demand for high-grade Wheat seeds, DAP, and protective fungicides.
                  </p>
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                    <strong>Major Crops:</strong> Wheat, Mustard, Gram / Chickpeas, Barley.
                  </div>
                </div>

                {/* Zaid */}
                <div style={{ padding: '18px', borderRadius: '10px', border: activeScen?.season?.code === 'ZAID' ? '2px solid var(--brand-500)' : '1px solid var(--border-subtle)', background: 'var(--surface-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--status-warning)' }}>3. Zaid Season (Summer)</span>
                    <span className="badge" style={{ background: 'var(--status-warning-bg)', color: 'var(--status-warning)' }}>March – June</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 10px 0' }}>
                    Hot summer season. High reliance on bio-stimulants, micronutrients, drip irrigation equipment, and targeted insecticide applications.
                  </p>
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                    <strong>Major Crops:</strong> Fodder, Melons, Cucumbers, Summer Pulses.
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Column (35%): Interactive What-If Scenario Studio */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="card" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={18} color="var(--brand-500)" />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  What-If Scenario Simulator
                </h3>
              </div>
              <span className="badge" style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)', fontSize: '11px' }}>
                Interactive
              </span>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
              Test how weather delays or crop acreage changes affect factory production requirements.
            </p>

            {/* Quick 1-Click Scenario Preset Buttons */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                ⚡ 1-Click Simulation Presets:
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => applyPreset('NORMAL')}
                  className={`btn ${activePreset === 'NORMAL' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '12px', padding: '5px 10px' }}
                >
                  ⛅ Normal Season
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('DELAYED_MONSOON')}
                  className={`btn ${activePreset === 'DELAYED_MONSOON' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '12px', padding: '5px 10px' }}
                >
                  ⏳ Delayed Monsoon (+10d)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('EARLY_RAINS')}
                  className={`btn ${activePreset === 'EARLY_RAINS' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '12px', padding: '5px 10px' }}
                >
                  🌧️ Early Rains (-7d)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('BUMPER_SOWING')}
                  className={`btn ${activePreset === 'BUMPER_SOWING' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '12px', padding: '5px 10px' }}
                >
                  🌾 Bumper Crop (+20%)
                </button>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleRunSimulation(); }}>
              
              {/* 1. Agricultural Cycle / Season */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>
                  Active Season Cycle
                </label>
                <select
                  value={scenario.season}
                  onChange={(e) => {
                    setActivePreset('CUSTOM');
                    setScenario({ ...scenario, season: e.target.value });
                  }}
                  className="form-control"
                  style={{ fontSize: '13px' }}
                >
                  <option value="KHARIF">Kharif (Monsoon: June – Oct)</option>
                  <option value="RABI">Rabi (Winter: Oct – March)</option>
                  <option value="ZAID">Zaid (Summer: March – June)</option>
                </select>
              </div>

              {/* 2. Monsoon Arrival Delta Slider */}
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CloudRain size={14} color="var(--status-info)" /> Monsoon Timing Shift (Δm)
                  </label>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: 700, 
                    fontFamily: 'var(--font-mono)',
                    color: scenario.monsoonDeltaDays > 0 ? 'var(--status-warning)' : scenario.monsoonDeltaDays < 0 ? 'var(--status-info)' : 'var(--brand-500)'
                  }}>
                    {scenario.monsoonDeltaDays > 0 ? `+${scenario.monsoonDeltaDays}d Delayed` : scenario.monsoonDeltaDays < 0 ? `${scenario.monsoonDeltaDays}d Early` : 'On-Time (0d)'}
                  </span>
                </div>
                <input
                  type="range"
                  min="-15"
                  max="21"
                  step="1"
                  value={scenario.monsoonDeltaDays}
                  onChange={(e) => {
                    setActivePreset('CUSTOM');
                    setScenario({ ...scenario, monsoonDeltaDays: parseInt(e.target.value, 10) });
                  }}
                  style={{ width: '100%', accentColor: 'var(--brand-500)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  <span>15d Early</span>
                  <span>Normal</span>
                  <span>21d Delayed</span>
                </div>
              </div>

              {/* 3. Regional Crop Acreage Shift Slider */}
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, margin: 0 }}>
                    Farmer Crop Acreage Expansion (A)
                  </label>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: 700, 
                    fontFamily: 'var(--font-mono)',
                    color: scenario.acreageGrowthPercent > 0 ? 'var(--brand-500)' : scenario.acreageGrowthPercent < 0 ? 'var(--status-danger)' : 'var(--text-primary)'
                  }}>
                    {scenario.acreageGrowthPercent > 0 ? `+${scenario.acreageGrowthPercent}%` : `${scenario.acreageGrowthPercent}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="30"
                  step="5"
                  value={scenario.acreageGrowthPercent}
                  onChange={(e) => {
                    setActivePreset('CUSTOM');
                    setScenario({ ...scenario, acreageGrowthPercent: parseInt(e.target.value, 10) });
                  }}
                  style={{ width: '100%', accentColor: 'var(--brand-500)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  <span>-20% Drought</span>
                  <span>Normal</span>
                  <span>+30% Boom</span>
                </div>
              </div>

              {/* 4. Target Service Level */}
              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>
                  Target Delivery Guarantee (Service Level)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {[90, 95, 98, 99].map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => {
                        setActivePreset('CUSTOM');
                        setScenario({ ...scenario, serviceLevel: lvl });
                      }}
                      style={{
                        padding: '6px 0',
                        fontSize: '12px',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: scenario.serviceLevel === lvl ? '1.5px solid var(--brand-500)' : '1px solid var(--border-default)',
                        background: scenario.serviceLevel === lvl ? 'var(--brand-50)' : 'var(--surface-3)',
                        color: scenario.serviceLevel === lvl ? 'var(--brand-700)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {lvl}%
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Production Lead Time */}
              <div className="form-group" style={{ marginBottom: '22px' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>
                  Factory Manufacturing & Packaging Lead Time
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    min="3"
                    max="45"
                    value={scenario.leadTimeDays}
                    onChange={(e) => {
                      setActivePreset('CUSTOM');
                      setScenario({ ...scenario, leadTimeDays: parseInt(e.target.value, 10) || 14 });
                    }}
                    className="form-control"
                    style={{ fontSize: '13px', width: '90px', fontFamily: 'var(--font-mono)' }}
                  />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>days needed to manufacture a batch</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="submit"
                  disabled={simulating}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 700 }}
                >
                  <Sparkles size={16} className={simulating ? 'spin' : ''} />
                  {simulating ? 'Recalculating Sowing Waves...' : 'Run Custom Simulation'}
                </button>

                <button
                  type="button"
                  onClick={handleResetBaseline}
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px' }}
                >
                  <RotateCcw size={14} /> Reset to Defaults
                </button>
              </div>

            </form>
          </div>

          {/* Plant Manager Action Advice Card */}
          <div className="card" style={{ padding: '18px 20px', background: 'var(--surface-2)', border: '1px solid var(--border-default)' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={16} color="var(--brand-500)" /> Factory Scheduling Advice:
            </h4>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {scenario.monsoonDeltaDays > 7 ? (
                <p style={{ margin: 0 }}>
                  ⏳ <strong>Rains are delayed by +{scenario.monsoonDeltaDays} days.</strong> The sowing surge is pushed back. Delay packaging dispatches by {Math.round(scenario.monsoonDeltaDays * 0.7)} days to prevent chemicals expiring in dealer godowns.
                </p>
              ) : scenario.monsoonDeltaDays < -5 ? (
                <p style={{ margin: 0 }}>
                  ⚡ <strong>Early rains by {Math.abs(scenario.monsoonDeltaDays)} days!</strong> Farmers will start planting early. Expedite factory production for top fertilizers immediately!
                </p>
              ) : (
                <p style={{ margin: 0 }}>
                  ✅ <strong>Rains on schedule.</strong> Standard safety buffers are active. Prioritize scheduling batches for the {summary?.imminentStockoutsCount || 0} products flagged in red.
                </p>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* 4. Schedule Replenishment Batch Modal */}
      {batchModalOpen && selectedSkuForBatch && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-strong)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'var(--brand-100)', color: 'var(--brand-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PackagePlus size={18} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Schedule Factory Production Batch
                </h3>
              </div>
              <button
                onClick={() => setBatchModalOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '4px 8px', fontSize: '12px' }}
              >
                ✕
              </button>
            </div>

            {/* Target SKU Summary */}
            <div style={{ padding: '14px 16px', background: 'var(--surface-2)', borderRadius: '8px', marginBottom: '18px', fontSize: '13px' }}>
              <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '15px' }}>{selectedSkuForBatch.productName}</div>
              <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                SKU: <code style={{ color: 'var(--brand-500)', fontWeight: 700 }}>{selectedSkuForBatch.sku}</code> | Category: {selectedSkuForBatch.category}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                <div>
                  <span style={{ color: 'var(--text-tertiary)' }}>Current In Warehouse:</span>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px' }}>
                    {formatNumber(selectedSkuForBatch.currentStock)} {selectedSkuForBatch.unit}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--brand-500)' }}>Safe Sowing Level Needed:</span>
                  <div style={{ fontWeight: 700, color: 'var(--brand-500)', fontSize: '14px' }}>
                    {formatNumber(selectedSkuForBatch.dynamicROP)} {selectedSkuForBatch.unit}
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitBatch}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 700 }}>
                  Batch Quantity to Manufacture ({selectedSkuForBatch.unit}) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={batchSizeInput}
                  onChange={(e) => setBatchSizeInput(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
                  Pre-filled with AI suggested lot size to re-establish safe warehouse buffer.
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Factory Notes / Reason
                </label>
                <textarea
                  rows={2}
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setBatchModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={schedulingBatch}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={schedulingBatch}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                >
                  <Zap size={15} />
                  {schedulingBatch ? 'Creating Batch...' : 'Confirm & Produce Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
