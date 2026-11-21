import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Building2, Truck, MapPin, Route, FileSpreadsheet, FileDown, Calendar, Save, 
  Download, Sparkles, RefreshCw, Layers, CheckCircle2, AlertTriangle, ShieldCheck, Home, RotateCcw, Trash2,
  UploadCloud, Settings
} from 'lucide-react';
import { processAmulRecords, parseAmulRawData } from './amulDataProcessor';
import { exportAmulPdf } from './amulPdfExport';
import { exportAmulExcel } from './amulExcelExport';
import { getAmulColumnConfig } from './amulColumnConfig';
import AmulWelcome from './AmulWelcome';
import AmulKpiCards from './AmulKpiCards';
import AmulFiltersToolbar from './AmulFiltersToolbar';
import AmulPlantTable from './AmulPlantTable';
import AmulTransporterTable from './AmulTransporterTable';
import AmulDistrictTable from './AmulDistrictTable';
import AmulRouteRegister from './AmulRouteRegister';
import AmulCustomizeColumns from './AmulCustomizeColumns';

export default function AmulDashboard({ showToast, initialView = 'welcome', onTabChange }) {
  const fileInputRef = useRef(null);

  // BY DEFAULT BLANK DATA (0 records)
  const [data, setData] = useState(() => processAmulRecords([]));
  const [activeTab, setActiveTab] = useState(initialView || 'welcome');
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [fileName, setFileName] = useState('');
  const [columnConfig, setColumnConfig] = useState(() => getAmulColumnConfig());

  // Editable Report Title with Date
  const getInitialTitle = () => {
    const saved = localStorage.getItem('custom_amul_report_title');
    if (saved && saved.trim()) return saved.trim();
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `Amul Take Home Ration (THR) Daily KPI Dashboard - ${dd}-${mm}-${yyyy}`;
  };

  const [customTitle, setCustomTitle] = useState(getInitialTitle);

  const handleSaveTitle = () => {
    if (!customTitle || !customTitle.trim()) return;
    localStorage.setItem('custom_amul_report_title', customTitle.trim());
    if (showToast) showToast('Dashboard title saved successfully!', 'success');
  };

  const handleResetTitle = () => {
    localStorage.removeItem('custom_amul_report_title');
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const def = `Amul Take Home Ration (THR) Daily KPI Dashboard - ${dd}-${mm}-${yyyy}`;
    setCustomTitle(def);
    if (showToast) showToast('Title reset to default template.', 'info');
  };

  const handleSetTodayDate = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const dateStr = `${dd}-${mm}-${yyyy}`;

    // Strip existing trailing date if present and append new
    const base = customTitle.replace(/ - \d{2}-\d{2}-\d{4}$/, '').replace(/ - \d{4}-\d{2}-\d{2}$/, '').trim();
    const updated = `${base} - ${dateStr}`;
    setCustomTitle(updated);
    localStorage.setItem('custom_amul_report_title', updated);
    if (showToast) showToast(`Updated title with date: ${dateStr}`, 'success');
  };

  // Filter State
  const [filters, setFilters] = useState({
    dairy: 'ALL',
    district: 'ALL',
    transporter: 'ALL',
    deliveryStatus: 'ALL',
    trackingStatus: 'ALL',
    search: ''
  });

  useEffect(() => {
    if (initialView) {
      setActiveTab(initialView);
    }
  }, [initialView]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const handleResetFilters = () => {
    setFilters({
      dairy: 'ALL',
      district: 'ALL',
      transporter: 'ALL',
      deliveryStatus: 'ALL',
      trackingStatus: 'ALL',
      search: ''
    });
  };

  // Single Clean File Upload Handler
  const handleFileSelect = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      if (showToast) showToast('Please select a valid Excel (.xlsx, .xls) or CSV file.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setIsProcessingFile(true);
      setFileName(file.name);
      const buffer = await file.arrayBuffer();

      setTimeout(() => {
        try {
          const processed = parseAmulRawData(buffer);
          setData(processed);
          handleResetFilters();
          if (showToast) {
            showToast(`Successfully loaded ${processed.records.length.toLocaleString('en-IN')} records from ${file.name}!`, 'success');
          }
        } catch (err) {
          console.error(err);
          if (showToast) showToast('Error processing file: ' + err.message, 'error');
        } finally {
          setIsProcessingFile(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }, 50);
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Error reading file: ' + err.message, 'error');
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };



  const handleClearData = () => {
    setData(processAmulRecords([]));
    setFileName('');
    handleResetFilters();
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (showToast) showToast('All data cleared. Dashboard is now blank.', 'info');
  };

  // Filtered records calculation
  const filteredRecords = useMemo(() => {
    if (!data.records || data.records.length === 0) return [];

    return data.records.filter(r => {
      // 1. Dairy filter
      if (filters.dairy !== 'ALL') {
        const plant = (r.plantName || '').toUpperCase();
        if (plant !== filters.dairy) return false;
      }

      // 2. District filter
      if (filters.district !== 'ALL') {
        const dist = (r.districtName || '').trim().toUpperCase();
        if (dist !== filters.district) return false;
      }

      // 3. Transporter filter
      if (filters.transporter !== 'ALL') {
        const trans = (r.transporter || '').trim();
        if (trans !== filters.transporter) return false;
      }

      // 4. Delivery Status
      if (filters.deliveryStatus !== 'ALL') {
        if (r.deliveryStatus !== filters.deliveryStatus) return false;
      }

      // 5. Tracking Status
      if (filters.trackingStatus !== 'ALL') {
        if (r.trackingStatus !== filters.trackingStatus) return false;
      }

      // 6. Keyword Search
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        const lr = (r.lrNo || '').toLowerCase();
        const route = (r.route || '').toLowerCase();
        const veh = (r.vehicle || '').toLowerCase();
        const block = (r.blockName || '').toLowerCase();
        const seja = (r.sejaName || '').toLowerCase();
        if (!lr.includes(q) && !route.includes(q) && !veh.includes(q) && !block.includes(q) && !seja.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [data.records, filters]);

  // Dynamically reprocess data based on active filters for synchronized KPI cards & tables
  const displayData = useMemo(() => {
    if (filteredRecords.length === data.records.length) {
      return data;
    }
    return processAmulRecords(filteredRecords);
  }, [data, filteredRecords]);

  const handlePdfExport = (includeRoutes) => {
    if (!displayData.records || displayData.records.length === 0) {
      if (showToast) showToast('No data to export. Please upload a raw data file first.', 'error');
      return;
    }

    try {
      setIsExporting(true);
      setShowPdfModal(false);
      setTimeout(() => {
        try {
          const filename = exportAmulPdf(displayData, includeRoutes, customTitle);
          if (showToast) showToast('Downloaded: ' + filename, 'success');
        } catch (err) {
          console.error(err);
          if (showToast) showToast('PDF Export failed: ' + err.message, 'error');
        } finally {
          setIsExporting(false);
        }
      }, 50);
    } catch (e) {
      setIsExporting(false);
    }
  };

  const handleExcelExport = async () => {
    if (!displayData.records || displayData.records.length === 0) {
      if (showToast) showToast('No data to export. Please upload a raw data file first.', 'error');
      return;
    }

    try {
      setIsExporting(true);
      await exportAmulExcel(displayData, customTitle);
      if (showToast) showToast('Master Excel report exported successfully!', 'success');
    } catch (err) {
      console.error(err);
      if (showToast) showToast('Excel Export failed: ' + err.message, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // If activeTab is welcome, render the Amul Landing Page
  if (activeTab === 'welcome') {
    return (
      <AmulWelcome
        onNavigate={(targetTab) => {
          switchTab(targetTab);
        }}
        kpis={displayData.kpis}
      />
    );
  }

  // If activeTab is customize-columns, render Customize Columns Page
  if (activeTab === 'customize-columns') {
    return (
      <AmulCustomizeColumns
        onSave={(cfg) => setColumnConfig(cfg)}
        showToast={showToast}
      />
    );
  }

  const isBlank = data.records.length === 0;

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1600px', margin: '0 auto', color: 'var(--text-main, #0F172A)' }}>
      {/* Hidden Single File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Top Amul Header Banner */}
      <div style={{
        background: 'var(--bg-panel, #FFFFFF)',
        border: '1px solid var(--border-color, #E2E8F0)',
        borderLeft: '5px solid #E31E24',
        borderRadius: '16px',
        padding: '20px 24px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: 'var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.04))'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: '#FFFFFF',
            padding: '6px 14px',
            borderRadius: '10px',
            border: '1px solid var(--border-color, #E2E8F0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
          }}>
            <img src="/amul-logo.svg" alt="Amul Logo" style={{ height: '34px', objectFit: 'contain' }} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#1E3A8A',
                background: 'rgba(30, 58, 138, 0.08)',
                padding: '2px 8px',
                borderRadius: '6px'
              }}>
                GCMMF Operations
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim, #64748b)' }}>&bull;</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #475569)', fontWeight: '600' }}>
                WCDD (ICDS) Govt. of Gujarat &bull; {data.kpis.mdoCycle}
              </span>
              {fileName && (
                <span style={{
                  fontSize: '0.72rem',
                  color: '#059669',
                  background: 'rgba(5, 150, 105, 0.1)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontWeight: '700'
                }}>
                  {fileName}
                </span>
              )}
            </div>

            {/* Editable Title with Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '320px' }}>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  style={{
                    fontSize: '1.45rem',
                    fontWeight: '800',
                    color: 'var(--text-main, #0F172A)',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '2px dashed var(--border-color, #CBD5E1)',
                    width: '100%',
                    padding: '2px 4px',
                    outline: 'none',
                    fontFamily: 'Outfit, sans-serif',
                    letterSpacing: '-0.02em',
                    transition: 'border-color 0.15s ease'
                  }}
                  onFocus={(e) => e.target.style.borderBottomColor = '#E31E24'}
                  onBlur={(e) => e.target.style.borderBottomColor = 'var(--border-color, #CBD5E1)'}
                  title="Click to edit or update title with date"
                  placeholder="Enter Dashboard Title (e.g. Amul THR Daily KPI Dashboard - 21-11-2026)"
                />
              </div>

              {/* Title Action Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={handleSetTodayDate}
                  style={{
                    background: 'rgba(30, 58, 138, 0.08)',
                    color: '#1E3A8A',
                    border: '1px solid rgba(30, 58, 138, 0.2)',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '0.74rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Update title with today's date"
                >
                  <Calendar size={13} /> Set Today's Date
                </button>

                <button
                  onClick={handleSaveTitle}
                  style={{
                    background: 'rgba(5, 150, 105, 0.08)',
                    color: '#059669',
                    border: '1px solid rgba(5, 150, 105, 0.2)',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '0.74rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Save customized title permanently"
                >
                  <Save size={13} /> Save Title
                </button>

                {localStorage.getItem('custom_amul_report_title') && (
                  <button
                    onClick={handleResetTitle}
                    style={{
                      background: 'rgba(0, 0, 0, 0.04)',
                      color: 'var(--text-muted, #64748B)',
                      border: '1px solid var(--border-color, #CBD5E1)',
                      borderRadius: '6px',
                      padding: '4px 6px',
                      fontSize: '0.74rem',
                      cursor: 'pointer'
                    }}
                    title="Reset title back to default"
                  >
                    <RotateCcw size={13} />
                  </button>
                )}
              </div>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted, #475569)' }}>
              Dispatches: <strong>{displayData.kpis.dateRange}</strong> &bull; Manufacturing Hubs: Banas, Kaira, Sumul &bull; 40 Covered Districts
            </p>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => switchTab('welcome')}
            style={{
              background: 'rgba(0, 0, 0, 0.04)',
              color: 'var(--text-main, #0F172A)',
              border: '1px solid var(--border-color, #CBD5E1)',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
            title="Return to Amul Welcome Screen"
          >
            <Home size={15} /> Welcome Dashboard
          </button>

          {/* SINGLE DEDICATED UPLOAD BUTTON */}
          <button
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            disabled={isProcessingFile}
            style={{
              background: '#E31E24',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: isProcessingFile ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(227, 30, 36, 0.25)',
              transition: 'all 0.15s ease'
            }}
            title="Upload new FarEye dispatch file (.xlsx, .csv)"
          >
            <UploadCloud size={15} /> {isProcessingFile ? 'Loading File...' : 'Upload Data File'}
          </button>

          {/* CLEAR DATA BUTTON */}
          {!isBlank && (
            <button
              onClick={handleClearData}
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                color: '#DC2626',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
              title="Clear loaded data and reset dashboard to blank"
            >
              <Trash2 size={15} /> Clear Data
            </button>
          )}

          {/* CUSTOMIZE COLUMNS BUTTON */}
          <button
            onClick={() => switchTab('customize-columns')}
            style={{
              background: 'rgba(0, 0, 0, 0.04)',
              color: 'var(--text-main, #0F172A)',
              border: '1px solid var(--border-color, #CBD5E1)',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
            title="Customize table columns"
          >
            <Settings size={15} /> Customize Columns
          </button>

          <button
            onClick={() => setShowPdfModal(true)}
            disabled={isExporting || isBlank}
            style={{
              background: isBlank ? 'rgba(0, 0, 0, 0.04)' : '#1E3A8A',
              color: isBlank ? 'var(--text-muted, #94A3B8)' : '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: (isExporting || isBlank) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: isBlank ? 'none' : '0 4px 12px rgba(30, 58, 138, 0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            <FileDown size={15} /> Export PDF
          </button>

          <button
            onClick={handleExcelExport}
            disabled={isExporting || isBlank}
            style={{
              background: isBlank ? 'rgba(0, 0, 0, 0.04)' : '#059669',
              color: isBlank ? 'var(--text-muted, #94A3B8)' : '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: (isExporting || isBlank) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: isBlank ? 'none' : '0 4px 12px rgba(5, 150, 105, 0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            <Download size={15} /> Export Excel
          </button>
        </div>
      </div>

      {/* KPI Cards (Synchronized with active filters) */}
      <AmulKpiCards kpis={displayData.kpis} />

      {/* COMPREHENSIVE FILTER TOOLBAR */}
      <AmulFiltersToolbar
        records={data.records}
        filters={filters}
        setFilters={setFilters}
        filteredCount={filteredRecords.length}
        totalCount={data.records.length}
        onReset={handleResetFilters}
      />

      {/* View Tabs with Amul Red Branding */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '20px',
        borderBottom: '1px solid var(--border-color, #E2E8F0)',
        paddingBottom: '8px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => switchTab('all')}
          style={{
            background: activeTab === 'all' ? '#E31E24' : 'transparent',
            color: activeTab === 'all' ? '#FFFFFF' : 'var(--text-muted, #475569)',
            border: activeTab === 'all' ? 'none' : '1px solid transparent',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '0.85rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: activeTab === 'all' ? '0 2px 8px rgba(227, 30, 36, 0.3)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <Layers size={15} /> All In One Master View
        </button>

        <button
          onClick={() => switchTab('plants')}
          style={{
            background: activeTab === 'plants' ? '#E31E24' : 'transparent',
            color: activeTab === 'plants' ? '#FFFFFF' : 'var(--text-muted, #475569)',
            border: activeTab === 'plants' ? 'none' : '1px solid transparent',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '0.85rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: activeTab === 'plants' ? '0 2px 8px rgba(227, 30, 36, 0.3)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <Building2 size={15} /> Plants Performance
        </button>

        <button
          onClick={() => switchTab('transporters')}
          style={{
            background: activeTab === 'transporters' ? '#E31E24' : 'transparent',
            color: activeTab === 'transporters' ? '#FFFFFF' : 'var(--text-muted, #475569)',
            border: activeTab === 'transporters' ? 'none' : '1px solid transparent',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '0.85rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: activeTab === 'transporters' ? '0 2px 8px rgba(227, 30, 36, 0.3)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <Truck size={15} /> Transporter SLA Scorecard
        </button>

        <button
          onClick={() => switchTab('districts')}
          style={{
            background: activeTab === 'districts' ? '#E31E24' : 'transparent',
            color: activeTab === 'districts' ? '#FFFFFF' : 'var(--text-muted, #475569)',
            border: activeTab === 'districts' ? 'none' : '1px solid transparent',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '0.85rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: activeTab === 'districts' ? '0 2px 8px rgba(227, 30, 36, 0.3)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <MapPin size={15} /> District Matrix (40 Districts)
        </button>

        <button
          onClick={() => switchTab('routes')}
          style={{
            background: activeTab === 'routes' ? '#E31E24' : 'transparent',
            color: activeTab === 'routes' ? '#FFFFFF' : 'var(--text-muted, #475569)',
            border: activeTab === 'routes' ? 'none' : '1px solid transparent',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '0.85rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: activeTab === 'routes' ? '0 2px 8px rgba(227, 30, 36, 0.3)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <Route size={15} /> Route Register ({displayData.routes.length} Routes)
        </button>
      </div>

      {/* Render Selected View or Empty State */}
      {isBlank ? (
        <div style={{
          background: 'var(--bg-panel, #FFFFFF)',
          border: '1px solid var(--border-color, #E2E8F0)',
          borderRadius: '16px',
          padding: '50px 24px',
          textAlign: 'center',
          marginBottom: '28px',
          boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(227, 30, 36, 0.08)',
            color: '#E31E24',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <FileSpreadsheet size={28} />
          </div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main, #0F172A)', fontFamily: 'Outfit, sans-serif' }}>
            No THR Dispatch Data Loaded (Blank State)
          </h3>
          <p style={{ margin: '0 auto 24px auto', fontSize: '0.9rem', color: 'var(--text-muted, #475569)', maxWidth: '560px', lineHeight: '1.6' }}>
            By default the dashboard is kept blank. Click the button below to upload your daily FarEye dispatch export (.xlsx or .csv) to auto-calculate all operational KPIs.
          </p>
          <div style={{ display: 'inline-flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{
                background: '#E31E24',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 24px',
                fontSize: '0.88rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(227, 30, 36, 0.25)'
              }}
            >
              <UploadCloud size={16} /> Choose File (.xlsx / .csv)
            </button>
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'all' && (
            <>
              <AmulPlantTable plants={displayData.plants} totalKpi={displayData.kpis} />
              <AmulTransporterTable transporters={displayData.transporters} totalKpi={displayData.kpis} columnConfig={columnConfig} />
              <AmulDistrictTable districts={displayData.districts} totalKpi={displayData.kpis} columnConfig={columnConfig} />
              <AmulRouteRegister routes={displayData.routes} columnConfig={columnConfig} />
            </>
          )}

          {activeTab === 'plants' && (
            <AmulPlantTable plants={displayData.plants} totalKpi={displayData.kpis} />
          )}

          {activeTab === 'transporters' && (
            <AmulTransporterTable transporters={displayData.transporters} totalKpi={displayData.kpis} columnConfig={columnConfig} />
          )}

          {activeTab === 'districts' && (
            <AmulDistrictTable districts={displayData.districts} totalKpi={displayData.kpis} columnConfig={columnConfig} />
          )}

          {activeTab === 'routes' && (
            <AmulRouteRegister routes={displayData.routes} columnConfig={columnConfig} />
          )}
        </>
      )}

      {/* PDF Export Choice Modal */}
      {showPdfModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-panel, #FFFFFF)',
            border: '1px solid var(--border-color, #E2E8F0)',
            borderRadius: '16px',
            padding: '24px 28px',
            maxWidth: '520px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main, #0F172A)' }}>
              Export Amul THR PDF Report
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: 'var(--text-muted, #475569)', lineHeight: '1.5' }}>
              Choose whether to include the <strong>4. CONSIGNMENT & ROUTE MONITORING REGISTER</strong> ({displayData.routes.length} Unique Routes) in the PDF document:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {/* Option 1: Executive Summary */}
              <div
                onClick={() => handlePdfExport(false)}
                style={{
                  background: 'rgba(30, 58, 138, 0.04)',
                  border: '1px solid rgba(30, 58, 138, 0.15)',
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '800', fontSize: '0.95rem', color: '#1E3A8A' }}>
                    1. Executive Summary (2 Pages)
                  </span>
                  <span style={{ fontSize: '0.72rem', background: 'rgba(30, 58, 138, 0.1)', color: '#1E3A8A', padding: '2px 8px', borderRadius: '4px', fontWeight: '800' }}>
                    RECOMMENDED
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted, #475569)' }}>
                  Includes KPI Cards, Plant Performance Breakdown, Transporter SLA Scorecard, and 40-District Distribution Matrix. Compact and ideal for meetings.
                </p>
              </div>

              {/* Option 2: Complete Report */}
              <div
                onClick={() => handlePdfExport(true)}
                style={{
                  background: 'rgba(5, 150, 105, 0.04)',
                  border: '1px solid rgba(5, 150, 105, 0.15)',
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '800', fontSize: '0.95rem', color: '#059669' }}>
                    2. Complete Dossier with Route Register
                  </span>
                  <span style={{ fontSize: '0.72rem', background: 'rgba(5, 150, 105, 0.1)', color: '#059669', padding: '2px 8px', borderRadius: '4px', fontWeight: '800' }}>
                    FULL ({Math.ceil(displayData.routes.length / 32) + 2} PAGES)
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted, #475569)' }}>
                  Includes everything in Executive Summary plus the complete <strong>4. CONSIGNMENT & ROUTE MONITORING REGISTER</strong> ({displayData.routes.length} unique routes with vehicle & LR details).
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowPdfModal(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color, #CBD5E1)',
                  color: 'var(--text-muted, #475569)',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
