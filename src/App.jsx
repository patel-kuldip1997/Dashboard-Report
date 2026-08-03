import React, { useState, useRef, useMemo, useEffect } from 'react';
import { UploadCloud, FileSpreadsheet, Download, Building2, Truck, FileText, Filter, AlertCircle, Database, Menu, X, ChevronDown, ChevronRight, FileDown, Settings, GripVertical, History, Trash2, FolderOpen, Search, CheckCircle, Repeat } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveHistoryReport, getHistoryReports, deleteHistoryReport } from './db.js';
import SmsTemplate from './components/SmsTemplate';

const DEFAULT_GM_CONFIG = [
  { id: 'refNo', label: 'Ref. No', visible: true },
  { id: 'district', label: 'TP District', visible: true },
  { id: 'sourceLoc', label: 'TP Source Name', visible: true },
  { id: 'destLoc', label: 'TP Destination Name', visible: true },
  { id: 'createdAt', label: 'Created At', visible: true },
  { id: 'startDate', label: 'Start Trip Date', visible: true },
  { id: 'endDate', label: 'End Trip Date', visible: true },
  { id: 'pendingDays', label: 'Pending Days', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'trips', label: 'Total Trips', visible: true }
];

const DEFAULT_EPOD_CONFIG = [
  { id: 'refNo', label: 'Reference No', visible: true },
  { id: 'district', label: 'District', visible: true },
  { id: 'destLoc', label: 'Destination Godown', visible: true },
  { id: 'transporter', label: 'Transporter Name', visible: true },
  { id: 'tpDate', label: 'TP Date', visible: true },
  { id: 'status', label: 'EPOD Status', visible: true },
  { id: 'trips', label: 'EPOD Pending Total', visible: true }
];

const DEFAULT_MG_CONFIG = [
  { id: 'refNo', label: 'Ref. No', visible: true },
  { id: 'district', label: 'District', visible: true },
  { id: 'sourceLoc', label: 'GP Source Name', visible: true },
  { id: 'destLoc', label: 'GP Destination Name', visible: true },
  { id: 'createdAt', label: 'Created At', visible: true },
  { id: 'startDate', label: 'Start Trip Date', visible: true },
  { id: 'endDate', label: 'End Trip Date', visible: true },
  { id: 'pendingDays', label: 'Pending Days', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'trips', label: 'Total Trips', visible: true }
];

const DEFAULT_LAST_MILE_EPOD_CONFIG = [
  { id: 'district', label: 'District', visible: true },
  { id: 'godown', label: 'GSCSCL Godown', visible: true },
  { id: 'transporter', label: 'DSD Transporter Name', visible: true },
  { id: 'deliveryChallan', label: 'No. of Delivery Challan', visible: true },
  { id: 'epodComplete', label: 'No. of EPOD Complete', visible: true },
  { id: 'epodPending', label: 'No. of EPOD Pending', visible: true },
  { id: 'epodPendingPercent', label: 'EPOD Pending (%)', visible: true }
];

const DEFAULT_LIFTING_CONFIG = [
  { id: 'srNo', label: 'Sr. No.', visible: true },
  { id: 'district', label: 'District', visible: true },
  { id: 'vehicleAssigned', label: 'No. of Vehicle Assigned', visible: true },
  { id: 'dosTpCreated', label: 'DOS TP Created', visible: true },
  { id: 'manualTpCreated', label: 'Manual TP Created', visible: true },
  { id: 'tpsGenerated', label: 'No.of TPs Generated', visible: true },
  { id: 'liftedQty', label: 'Lifted Quantity', visible: true },
  { id: 'tripsTracked', label: 'No. of Trips Tracked', visible: true },
  { id: 'untracked', label: 'Untracked', visible: true },
  { id: 'epodDriver', label: 'No.of EPOD (Driver)', visible: true },
  { id: 'pendingEpodDriver', label: 'Pending EPOD (Driver)', visible: true },
  { id: 'percentEpodDriver', label: '% of EPOD (Driver)', visible: true },
  { id: 'epodManager', label: 'No.of EPOD (Godown Manager)', visible: true },
  { id: 'pendingEpodManager', label: 'Pending EPOD (Godown Manager)', visible: true },
  { id: 'percentEpodManager', label: '% of EPOD', visible: true }
];

const DEFAULT_MULTI_TRIP_CONFIG = [
  { id: 'district', label: 'District', visible: true },
  { id: 'tpDate', label: 'TP date', visible: true },
  { id: 'hrs', label: 'Hrs', visible: true },
  { id: 'refNo', label: 'Reference Number', visible: true },
  { id: 'vehicle', label: 'Vehicle Number', visible: true },
  { id: 'source', label: 'Source', visible: true },
  { id: 'dest', label: 'Destination', visible: true },
  { id: 'tripCount', label: 'Count of Reference Number', visible: true },
  { id: 'netWeight', label: 'Net Weight (MT)', visible: true },
  { id: 'remarks', label: 'Remarks', visible: true }
];

const DEFAULT_ETA_ROUTE_CONFIG = [
  { id: 'origin', label: 'Origin Lat/Lng', visible: true },
  { id: 'destination', label: 'Destination Lat/Lng', visible: true },
  { id: 'actualTime', label: 'Actual Time (Mins)', visible: true },
  { id: 'googleEta', label: 'Calculated ETA (Mins)', visible: true },
  { id: 'distance', label: 'Google Distance (Km)', visible: true },
  { id: 'vehicleType', label: 'Vehicle Type', visible: true },
  { id: 'tripStatus', label: 'Trip Status', visible: true }
];

const DEFAULT_VEHICLE_ASSIGNED_CONFIG = [
  { id: 'refNo', label: 'Reference Number', visible: true },
  { id: 'district', label: 'District', visible: true },
  { id: 'tpDate', label: 'TP Date', visible: true },
  { id: 'vehicleNo', label: 'Vehicle Number', visible: true },
  { id: 'destGodown', label: 'Destination Godown', visible: true },
  { id: 'transporter', label: 'Transporter Name', visible: true }
];


// Multi-Select Dropdown Component
function MultiSelectDropdown({ options, selected, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));
  
  // If selected is null, it means ALL are selected. If [], NONE are selected.
  const activeSelected = selected === null ? options : selected;
  const isAllSelected = activeSelected.length === options.length && options.length > 0;

  const handleToggleSelectAll = () => {
    if (isAllSelected) onChange([]); // Clear all
    else onChange(null); // Select all
  };

  const handleToggleOption = (opt) => {
    let newSelected;
    if (activeSelected.includes(opt)) {
      newSelected = activeSelected.filter(o => o !== opt);
    } else {
      newSelected = [...activeSelected, opt];
    }
    
    if (newSelected.length === options.length) onChange(null);
    else onChange(newSelected);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block', minWidth: '180px' }}>
      <div 
        className="btn-secondary"
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
          {placeholder}: {isAllSelected ? 'All' : `${activeSelected.length} Selected`}
        </span>
        <ChevronDown size={16} style={{ marginLeft: '8px' }} />
      </div>
      
      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: '4px', zIndex: 100,
          background: 'var(--bg-panel)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', width: '250px',
          padding: '8px'
        }}>
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '6px 8px 6px 28px', borderRadius: '4px',
                background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                color: 'white', outline: 'none'
              }}
            />
          </div>
          
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            <label style={{ display: 'flex', alignItems: 'center', padding: '6px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <input 
                type="checkbox" 
                checked={isAllSelected}
                onChange={handleToggleSelectAll}
                style={{ marginRight: '8px' }}
              />
              (Select All)
            </label>
            {filteredOptions.map(opt => (
              <label key={opt} style={{ display: 'flex', alignItems: 'center', padding: '6px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={activeSelected.includes(opt)}
                    onChange={() => handleToggleOption(opt)}
                    style={{ marginRight: '8px' }}
                  />
                {opt}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [activeReport, setActiveReport] = useState(() => {
    return localStorage.getItem('activeReportTab') || 'godown-to-miller';
  });
  const [reportData, setReportData] = useState({});
  const rawData = reportData[activeReport] || [];
  const [filterStatus, setFilterStatus] = useState('All');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const fileInputRef = useRef(null);
  
  // Lifting Report File States
  const [mainLiftingFile, setMainLiftingFile] = useState(null);
  const [trackLiftingFile, setTrackLiftingFile] = useState(null);
  const mainLiftingRef = useRef(null);
  const trackLiftingRef = useRef(null);

  // Column Configuration State
  const [columnConfig, setColumnConfig] = useState([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [reportTitle, setReportTitle] = useState('');
  
  // Custom Alert Modal State
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'error', isConfirm: false, onConfirm: null });

  // ETA Route Config
  const [etaApiKey, setEtaApiKey] = useState('');
  const [etaVehicleType, setEtaVehicleType] = useState('Truck');

  // Last Mile EPOD Filters (null means "All Selected")
  const [dcMonthFilter, setDcMonthFilter] = useState(null);
  const [dcDateFilter, setDcDateFilter] = useState(null);
  const [epodStatusFilter, setEpodStatusFilter] = useState(null);
  const [tpDateFilter, setTpDateFilter] = useState(null);
  const [remarksFilter, setRemarksFilter] = useState(null);

  useEffect(() => {
    // Persist active tab
    localStorage.setItem('activeReportTab', activeReport);

    // Set default title
    if (activeReport === 'first-mile-epod') {
      setReportTitle("First Mile EPOD Pending Report of Till 29th August'25 ( 00:00-23:59)");
    } else if (activeReport === 'last-mile-epod') {
      setReportTitle("Last Mile EPOD Pending Report of Till 30th July'26 ( 00:00-23:59)");
    } else if (activeReport === 'miller-to-godown') {
      setReportTitle("Miller to Godown Trips");
    } else if (activeReport === 'lifting-report') {
      setReportTitle("Lifting Report");
    } else if (activeReport === 'history') {
      // Handled separately or leave as is
    } else if (activeReport === 'multi-trip-analysis') {
       setReportTitle("Multi-Trip Analysis");
    } else if (activeReport === 'eta-route') {
       setReportTitle("ETA Route Analytics");
    } else if (activeReport === 'vehicle-assigned') {
       setReportTitle("First Mile - Vehicle Assignment Report");
    } else if (activeReport === 'sms-template') {
       setReportTitle("SMS Templates");
    } else {
       setReportTitle("Godown to Miller Trips");
    }

    const savedConfig = localStorage.getItem(`reportConfig_${activeReport}`);
    let defaultConf = DEFAULT_GM_CONFIG;
    if (activeReport === 'first-mile-epod') defaultConf = DEFAULT_EPOD_CONFIG;
    else if (activeReport === 'last-mile-epod') defaultConf = DEFAULT_LAST_MILE_EPOD_CONFIG;
    else if (activeReport === 'miller-to-godown') defaultConf = DEFAULT_MG_CONFIG;
    else if (activeReport === 'lifting-report') defaultConf = DEFAULT_LIFTING_CONFIG;
    else if (activeReport === 'multi-trip-analysis') defaultConf = DEFAULT_MULTI_TRIP_CONFIG;
    else if (activeReport === 'eta-route') defaultConf = DEFAULT_ETA_ROUTE_CONFIG;
    else if (activeReport === 'vehicle-assigned') defaultConf = DEFAULT_VEHICLE_ASSIGNED_CONFIG;
    
    if (savedConfig && activeReport !== 'history') {
      const parsedConfig = JSON.parse(savedConfig);
      const finalConfig = [...parsedConfig];
      let modified = false;
      defaultConf.forEach(dc => {
         if (!finalConfig.find(c => c.id === dc.id)) {
            finalConfig.splice(0, 0, dc); // Add at the beginning
            modified = true;
         }
      });
      setColumnConfig(finalConfig);
      if (modified) {
         localStorage.setItem(`reportConfig_${activeReport}`, JSON.stringify(finalConfig));
      }
    } else {
      setColumnConfig([...defaultConf]);
    }
  }, [activeReport]);

  const saveConfig = (newConfig) => {
    setColumnConfig(newConfig);
    localStorage.setItem(`reportConfig_${activeReport}`, JSON.stringify(newConfig));
  };

  const handleColDragStart = (e, index) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      e.target.style.opacity = '0.5';
    }, 0);
  };

  const handleColDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedItemIndex(null);
  };

  const handleColDragOver = (e, index) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    
    const newConfig = [...columnConfig];
    const draggedItem = newConfig[draggedItemIndex];
    newConfig.splice(draggedItemIndex, 1);
    newConfig.splice(index, 0, draggedItem);
    
    setDraggedItemIndex(index);
    saveConfig(newConfig);
  };

  const toggleColumnVisibility = (index) => {
    const newConfig = [...columnConfig];
    newConfig[index].visible = !newConfig[index].visible;
    saveConfig(newConfig);
  };

  const visibleColumns = columnConfig.filter(c => c.visible);

  const filterCounts = useMemo(() => {
    const counts = { all: rawData.length, startPending: 0, endPending: 0, completed: 0 };
    rawData.forEach(row => {
      if (row.status === 'Completed') counts.completed++;
      if (row.isStartPending) counts.startPending++;
      if (row.isEndPending) counts.endPending++;
    });
    return counts;
  }, [rawData]);

  // Responsive Sidebar States
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [millerMenuOpen, setMillerMenuOpen] = useState(true);
  const [firstMileMenuOpen, setFirstMileMenuOpen] = useState(true);
  const [lastMileMenuOpen, setLastMileMenuOpen] = useState(true);
  const [analyticsMenuOpen, setAnalyticsMenuOpen] = useState(true);
  const [templatesMenuOpen, setTemplatesMenuOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const calculatePendingDays = (dateString) => {
    if (!dateString) return '';
    
    let targetDate = new Date(dateString);
    if (isNaN(targetDate.getTime())) return '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - targetDate.getTime();
    const diffDays = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
    return `${diffDays} days`;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file) => {
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const arrayBuffer = evt.target.result;
      
      const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
      
      worker.onmessage = (e) => {
        setIsLoading(false);
        if (e.data.type === 'error' || e.data.error) {
          setAlertConfig({ isOpen: true, title: 'Error Processing File', message: e.data.message || e.data.error, type: 'error' });
          if (fileInputRef.current) fileInputRef.current.value = '';
          setReportData(prev => ({ ...prev, [activeReport]: [] }));
        } else if (e.data.type === 'success' || !e.data.error) {
          if (e.data.data.length === 0) {
            setAlertConfig({ 
              isOpen: true, 
              title: 'Data Not Match', 
              message: 'No valid data found for this report type. Please ensure you uploaded the correct Excel file.', 
              type: 'error' 
            });
            if (fileInputRef.current) fileInputRef.current.value = '';
            setReportData(prev => ({ ...prev, [activeReport]: [] }));
          } else {
            setReportData(prev => ({ ...prev, [activeReport]: e.data.data }));
          }
        }
        worker.terminate();
      };

      worker.postMessage({ data: arrayBuffer, activeReport, etaApiKey, etaVehicleType });
    };
    reader.readAsArrayBuffer(file);
  };

  const handleProcessLiftingFiles = () => {
    if (!mainLiftingFile) return;
    setIsLoading(true);
    
    const readAsArrayBuffer = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = e => reject(e);
      reader.readAsArrayBuffer(file);
    });

    Promise.all([
      readAsArrayBuffer(mainLiftingFile),
      trackLiftingFile ? readAsArrayBuffer(trackLiftingFile) : Promise.resolve(null)
    ]).then(([mainBuffer, trackBuffer]) => {
      const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
      
      worker.onmessage = (e) => {
        setIsLoading(false);
        if (e.data.type === 'error' || e.data.error) {
          setAlertConfig({ isOpen: true, title: 'Error Processing Files', message: e.data.message || e.data.error, type: 'error' });
          setReportData(prev => ({ ...prev, [activeReport]: [] }));
        } else if (e.data.type === 'success' || !e.data.error) {
          if (e.data.data.length === 0) {
            setAlertConfig({ 
              isOpen: true, 
              title: 'Data Not Match', 
              message: 'No valid data found for this report type. Please ensure you uploaded the correct Excel file.', 
              type: 'error' 
            });
            setReportData(prev => ({ ...prev, [activeReport]: [] }));
          } else {
            setReportData(prev => ({ ...prev, [activeReport]: e.data.data }));
          }
        }
        worker.terminate();
      };

      worker.postMessage({ data: mainBuffer, trackingData: trackBuffer, activeReport });
    }).catch(err => {
      setIsLoading(false);
      setAlertConfig({ isOpen: true, title: 'Error Reading Files', message: 'Failed to read uploaded files.', type: 'error' });
    });
  };

  const handleSaveToHistory = async () => {
    if (rawData.length === 0) return;
    try {
      await saveHistoryReport({
        title: reportTitle,
        type: activeReport,
        rawData: rawData
      });
      setAlertConfig({ isOpen: true, title: 'Success', message: 'Report saved to History successfully!', type: 'success' });
    } catch (e) {
      setAlertConfig({ isOpen: true, title: 'Error', message: 'Error saving to history: ' + e.message, type: 'error' });
    }
  };

  const loadHistory = async () => {
    try {
      const reports = await getHistoryReports();
      setHistoryList(reports);
    } catch (e) {
      console.error('Failed to load history', e);
    }
  };

  useEffect(() => {
    if (activeReport === 'history') {
      loadHistory();
    }
  }, [activeReport]);

  const handleOpenHistoryItem = (report) => {
    setFilterStatus('All');
    setDcMonthFilter(null);
    setDcDateFilter(null);
    setEpodStatusFilter(null);
    setTpDateFilter(null);
    setActiveReport(report.type);
    setReportTitle(report.title);
    setReportData(prev => ({ ...prev, [report.type]: report.rawData }));
  };


  const calculateVehicleAssignedPivot = (data) => {
    const pivot = {};
    const datesSet = new Set();
    
    data.forEach(row => {
      if(row.isGrandTotal || row.isSubtotal) return;
      const district = row.district;
      const date = row.tpDate;
      if(!district || !date) return;
      
      datesSet.add(date);
      if(!pivot[district]) pivot[district] = {};
      pivot[district][date] = (pivot[district][date] || 0) + 1;
    });
    
    const sortedDates = Array.from(datesSet).sort();
    let dates = [];
    if (sortedDates.length > 0) {
      let current = new Date(sortedDates[0]);
      const end = new Date(sortedDates[sortedDates.length - 1]);
      while (current <= end) {
        const dateStr = current.getFullYear() + '-' + String(current.getMonth() + 1).padStart(2, '0') + '-' + String(current.getDate()).padStart(2, '0');
        dates.push(dateStr);
        current.setDate(current.getDate() + 1);
      }
    }
    
    // Calculate Grand Totals
    pivot['Grand Total'] = {};
    dates.forEach(date => {
      let colTotal = 0;
      Object.keys(pivot).forEach(district => {
         if(district !== 'Grand Total') {
            colTotal += (pivot[district][date] || 0);
         }
      });
      pivot['Grand Total'][date] = colTotal;
    });
    
    return { dates, pivot };
  };

  const handleDeleteHistoryItem = (id) => {
    setAlertConfig({
      isOpen: true,
      title: 'Delete Report?',
      message: 'Are you sure you want to delete this saved report? This action cannot be undone.',
      type: 'error',
      isConfirm: true,
      onConfirm: () => {
        deleteHistoryReport(id).then(() => {
          loadHistory();
        });
      }
    });
  };

  const handleMenuClick = (reportType) => {
    setFilterStatus('All');
    setDcMonthFilter(null);
    setDcDateFilter(null);
    setEpodStatusFilter(null);
    setTpDateFilter(null);
    setRemarksFilter(null);
    setActiveReport(reportType);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (isMobile) setSidebarOpen(false);
  };

  const handleClearData = () => {
    setReportData(prev => ({ ...prev, [activeReport]: [] }));
    setDcMonthFilter(null);
    setDcDateFilter(null);
    setEpodStatusFilter(null);
    setTpDateFilter(null);
    setRemarksFilter(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Extract unique filter options for Last Mile EPOD, Lifting Report, and Multi-Trip
  const { uniqueDcMonths, uniqueDcDates, uniqueEpodStatuses, uniqueTpDates, uniqueRemarks } = useMemo(() => {
    if (activeReport !== 'last-mile-epod' && activeReport !== 'lifting-report' && activeReport !== 'multi-trip-analysis') {
        return { uniqueDcMonths: [], uniqueDcDates: [], uniqueEpodStatuses: [], uniqueTpDates: [], uniqueRemarks: [] };
    }
    const months = new Set();
    const dates = new Set();
    const epodStatuses = new Set();
    const tpDates = new Set();
    const remarks = new Set();
    rawData.forEach(r => {
      if (r.dcMonth) months.add(r.dcMonth);
      if (r.dcCreationDate) dates.add(r.dcCreationDate);
      if (r.epodStatusRaw) epodStatuses.add(r.epodStatusRaw);
      if (r.tpDate) tpDates.add(r.tpDate);
      if (r.remarks && r.isSubtotal) remarks.add(r.remarks);
    });
    return {
      uniqueDcMonths: Array.from(months).sort(),
      uniqueDcDates: Array.from(dates).sort(),
      uniqueEpodStatuses: Array.from(epodStatuses).sort(),
      uniqueTpDates: Array.from(tpDates).sort(),
      uniqueRemarks: Array.from(remarks).sort()
    };
  }, [rawData, activeReport]);

  // Filter and Group data dynamically
  const displayData = useMemo(() => {
    if (rawData.length === 0) return [];
    
    let filtered = rawData;
    
    if (activeReport === 'multi-trip-analysis') {
       if (remarksFilter && remarksFilter.length > 0) {
           const validKeys = new Set();
           rawData.forEach(row => {
               if (row.isSubtotal && remarksFilter.includes(row.remarks)) {
                   validKeys.add(row.sortKey);
               }
           });
           filtered = rawData.filter(row => validKeys.has(row.sortKey));
       }
       return filtered;
    }

    if (activeReport === 'last-mile-epod') {
       if (dcMonthFilter !== null) {
          filtered = filtered.filter(row => dcMonthFilter.includes(row.dcMonth));
       }
       if (dcDateFilter !== null) {
          filtered = filtered.filter(row => dcDateFilter.includes(row.dcCreationDate));
       }
       // We DO NOT filter rawData by epodStatusFilter here. 
       // We want the total counts to remain intact. We will filter the displayed groups later.
    } else if (activeReport === 'lifting-report') {
       if (tpDateFilter !== null) {
          filtered = filtered.filter(row => tpDateFilter.includes(row.tpDate));
       }
    } else {
       if (filterStatus === 'Start Trip Pending') {
         filtered = rawData.filter(row => row.isStartPending);
       } else if (filterStatus === 'End Trip Pending') {
         filtered = rawData.filter(row => row.isEndPending);
       } else if (filterStatus === 'Completed') {
         filtered = rawData.filter(row => row.status === 'Completed');
       }
    }

    const groupedData = [];
    const distGroups = {};

    if (activeReport === 'lifting-report') {
       const GUJARAT_DISTRICTS = [
          'Ahmedabad', 'GirSomnath', 'Junagadh', 'VavTharad', 'Dang', 'Botad',
          'Chottaudepur', 'Surendranagar', 'Rajkot', 'Anand', 'Jamnagar', 
          'Gandhinagar', 'Porbandar', 'AhmedabadCity', 'Navasari', 'Tapi',
          'Morbi', 'Kutch', 'Bhavanagar', 'Arvalli', 'DevbhumiDwarka',
          'Mahisagar', 'Panchmahal', 'Sabarkantha', 'Narmada', 'Baroda',
          'Bharuch', 'Valsad', 'Amreli', 'Kheda', 'Patan', 'Banaskantha',
          'Mehsana', 'Surat', 'Dahod'
       ];
       GUJARAT_DISTRICTS.forEach(d => distGroups[d] = []);
       rawData.forEach(r => { if (r.district && !distGroups[r.district]) distGroups[r.district] = []; });
    }

    filtered.forEach(item => {
      if (!distGroups[item.district]) distGroups[item.district] = [];
      distGroups[item.district].push(item);
    });

    let grandTotalTrips = 0;
    let gtTrips = 0, gtChallan = 0, gtComplete = 0;
    
    const liftingNumerics = ['vehicleAssigned', 'dosTpCreated', 'manualTpCreated', 'tpsGenerated', 'liftedQty', 'tripsTracked', 'untracked', 'epodDriver', 'pendingEpodDriver', 'percentEpodDriver', 'epodManager', 'pendingEpodManager', 'percentEpodManager'];

    Object.keys(distGroups).sort().forEach(dist => {
      const distRows = distGroups[dist];
      
      // Pivot Table Style Grouping
      const pivotGroups = {};
      const numericColumns = ['trips', 'deliveryChallan', 'epodComplete', 'epodPending', 'epodPendingPercent', ...liftingNumerics];
      const pivotKeys = visibleColumns.filter(c => !numericColumns.includes(c.id)).map(c => c.id);
      
      const distTotals = { trips: 0, deliveryChallan: 0, epodComplete: 0, epodPending: 0 };
      
      const validGroupKeys = new Set();
      
      if (activeReport === 'lifting-report' && distRows.length === 0) {
         const dummyRow = { district: dist };
         const getVal = (key) => dummyRow[key] || '';
         const groupKey = pivotKeys.map(key => getVal(key)).join('|||');
         
         validGroupKeys.add(groupKey);
         pivotGroups[groupKey] = {
             district: dist,
             vehicleSet: new Set()
         };
         numericColumns.forEach(metric => pivotGroups[groupKey][metric] = 0);
      }
      
      distRows.forEach(row => {
        const getVal = (key) => key === 'refNo' ? (row._ref || row.refNo || '') : (row[key] || '');
        const groupKey = pivotKeys.map(key => getVal(key)).join('|||');
        
        // Track if this group matches the EPOD Status filter
        if (activeReport !== 'last-mile-epod' || epodStatusFilter === null || epodStatusFilter.includes(row.epodStatusRaw)) {
            validGroupKeys.add(groupKey);
        }
        
        if (!pivotGroups[groupKey]) {
          pivotGroups[groupKey] = {
             refNo: getVal('refNo'),
             district: getVal('district'),
             sourceLoc: getVal('sourceLoc'),
             destLoc: getVal('destLoc'),
             godown: getVal('godown'),
             transporter: getVal('transporter'),
             tpDate: getVal('tpDate'),
             createdAt: getVal('createdAt'),
             startDate: getVal('startDate'),
             endDate: getVal('endDate'),
             pendingDays: getVal('pendingDays'),
             status: getVal('status'),
             vehicleSet: new Set()
          };
          numericColumns.forEach(metric => {
            pivotGroups[groupKey][metric] = 0;
          });
        }
        
        numericColumns.forEach(metric => {
          if (row[metric] !== undefined && !metric.toLowerCase().includes('percent')) {
             const val = Number(row[metric]) || 0;
             pivotGroups[groupKey][metric] += val;
          }
        });
        
        // Fallback for trips if not present but needed for legacy reports
        if (row.trips === undefined && row.deliveryChallan === undefined && activeReport !== 'last-mile-epod') {
           pivotGroups[groupKey].trips += 1;
        }

        if (activeReport === 'lifting-report' && row.vehicleAssignedRaw) {
           pivotGroups[groupKey].vehicleSet.add(row.vehicleAssignedRaw);
        }
      });

      // Explicitly apply user formulas for Pivot Groups
      Object.keys(pivotGroups).forEach(groupKey => {
        const group = pivotGroups[groupKey];
        
        if (activeReport === 'last-mile-epod') {
           gtTrips += (group.trips || 0);
           gtChallan += (group.deliveryChallan || 0);
           gtComplete += (group.epodComplete || 0);
        }

        if (!validGroupKeys.has(groupKey)) return; // Skip groups that don't match the EPOD Status filter
        
        group.epodPending = group.deliveryChallan - group.epodComplete;
        if (group.deliveryChallan > 0) {
           group.epodPendingPercent = ((group.epodPending / group.deliveryChallan) * 100).toFixed(0) + '%';
        } else {
           group.epodPendingPercent = '0%';
        }
        
        if (activeReport === 'lifting-report') {
           const tps = group.tpsGenerated || 0;
           group.pendingEpodDriver = Math.max(0, tps - group.epodDriver);
           group.percentEpodDriver = tps > 0 ? ((group.epodDriver / tps) * 100).toFixed(0) + '%' : '0%';
           
           group.pendingEpodManager = Math.max(0, tps - group.epodManager);
           group.percentEpodManager = tps > 0 ? ((group.epodManager / tps) * 100).toFixed(0) + '%' : '0%';
        }

         if (activeReport === 'lifting-report') {
            group.vehicleAssigned = group.vehicleSet.size;
         }

         distTotals.trips += group.trips || 0;
         distTotals.deliveryChallan += group.deliveryChallan || 0;
         distTotals.epodComplete += group.epodComplete || 0;
        groupedData.push(group);
      });

      if ((distTotals.trips > 0 || distTotals.deliveryChallan > 0 || activeReport === 'lifting-report') && activeReport !== 'lifting-report') {
        let percent = '';
        if (activeReport === 'last-mile-epod' && distTotals.deliveryChallan > 0) {
           percent = ((distTotals.epodPending / distTotals.deliveryChallan) * 100).toFixed(0) + '%';
        }
        groupedData.push({
          isSubtotal: true,
          district: `${dist} Total`,
          sourceLoc: '',
          destLoc: '',
          godown: '',
          transporter: '',
          tpDate: '',
          createdAt: '',
          startDate: '',
          endDate: '',
          pendingDays: '',
          status: '',
          refNo: '',
          trips: distTotals.trips,
          deliveryChallan: distTotals.deliveryChallan,
          epodComplete: distTotals.epodComplete,
          epodPending: distTotals.epodPending,
          epodPendingPercent: percent
        });
      }
    });

    // Sort and add Sr. No for lifting-report
    if (activeReport === 'lifting-report') {
       groupedData.sort((a, b) => (a.liftedQty || 0) - (b.liftedQty || 0));
       let sr = 1;
       groupedData.forEach(r => {
          if (!r.isSubtotal) r.srNo = sr++;
       });
    }

    // Grand totals logic
    let gtLifting = {};
    if (activeReport === 'lifting-report') {
       liftingNumerics.forEach(m => gtLifting[m] = 0);
       groupedData.forEach(r => {
          if (!r.isSubtotal) {
             liftingNumerics.forEach(m => {
                if (!m.toLowerCase().includes('percent')) {
                   gtLifting[m] += (r[m] || 0);
                }
             });
          }
       });
    } else if (activeReport === 'last-mile-epod') {
       let baseData = rawData;
       if (dcMonthFilter && dcMonthFilter.length > 0) {
          baseData = baseData.filter(r => dcMonthFilter.includes(r.dcMonth));
       }
       if (dcDateFilter && dcDateFilter.length > 0) {
          baseData = baseData.filter(r => dcDateFilter.includes(r.dcCreationDate));
       }
          
       baseData.forEach(r => {
          gtTrips += (r.trips || 0);
          gtChallan += (r.deliveryChallan || 0);
          gtComplete += (r.epodComplete || 0);
       });
    } else {
       groupedData.filter(r => r.isSubtotal && !r.isGrandTotal).forEach(r => {
          gtTrips += (r.trips || 0);
          gtChallan += (r.deliveryChallan || 0);
          gtComplete += (r.epodComplete || 0);
       });
    }

    if (gtTrips > 0 || gtChallan > 0 || activeReport === 'lifting-report') {
      const gtPending = gtChallan - gtComplete;
      let gtPercent = '';
      if (activeReport === 'last-mile-epod' && gtChallan > 0) {
         gtPercent = ((gtPending / gtChallan) * 100).toFixed(0) + '%';
      }
      
      let grandTotalRow = {
        isSubtotal: true,
        isGrandTotal: true,
        district: 'GRAND TOTAL',
        sourceLoc: '',
        destLoc: '',
        godown: '',
        transporter: '',
        tpDate: '',
        createdAt: '',
        startDate: '',
        endDate: '',
        pendingDays: '',
        status: '',
        refNo: '',
        trips: gtTrips,
        deliveryChallan: gtChallan,
        epodComplete: gtComplete,
        epodPending: gtPending,
        epodPendingPercent: gtPercent
      };
      
      if (activeReport === 'lifting-report') {
         const tps = gtLifting.tpsGenerated || 0;
         gtLifting.pendingEpodDriver = Math.max(0, tps - gtLifting.epodDriver);
         gtLifting.percentEpodDriver = tps > 0 ? ((gtLifting.epodDriver / tps) * 100).toFixed(0) + '%' : '0%';
         
         gtLifting.pendingEpodManager = Math.max(0, tps - gtLifting.epodManager);
         gtLifting.percentEpodManager = tps > 0 ? ((gtLifting.epodManager / tps) * 100).toFixed(0) + '%' : '0%';
         
         // Format liftedQty to fixed 4
         gtLifting.liftedQty = Number(gtLifting.liftedQty.toFixed(4));
         
         Object.assign(grandTotalRow, gtLifting);
      }
      
      groupedData.push(grandTotalRow);
    }

    return groupedData;
  }, [rawData, filterStatus, activeReport, dcMonthFilter, dcDateFilter, epodStatusFilter, visibleColumns]);


  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const exportExcel = () => {
    if (displayData.length === 0) return;

    const wb = XLSX.utils.book_new();

    if (activeReport === 'vehicle-assigned') {
      const { dates, pivot } = calculateVehicleAssignedPivot(displayData);
      
      const wsData = [
         ["TP date", "(All)"],
         [],
         ["Count of Reference Number", "Column Labels"],
         ["Row Labels", ...dates, "Grand Total"]
      ];
      
      Object.keys(pivot).filter(d => d !== 'Grand Total').sort().forEach(district => {
         const row = [district];
         let districtTotal = 0;
         dates.forEach(date => {
            const val = pivot[district][date] || 0;
            row.push(val === 0 ? '' : val);
            districtTotal += val;
         });
         row.push(districtTotal);
         wsData.push(row);
      });
      
      const grandTotalRow = ["Grand Total"];
      let absoluteTotal = 0;
      dates.forEach(date => {
         const colTotal = pivot['Grand Total'][date] || 0;
         grandTotalRow.push(colTotal);
         absoluteTotal += colTotal;
      });
      grandTotalRow.push(absoluteTotal);
      wsData.push(grandTotalRow);

      const wsPivot = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, wsPivot, "Pivot Summary");
    }

    const exportData = displayData.map(row => {
      const rowData = {};
      visibleColumns.forEach(col => {
         let content = row[col.id] !== undefined ? row[col.id] : '';
         rowData[col.label] = content;
      });
      return rowData;
    });

    const wsRaw = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, wsRaw, "Raw Data");

    XLSX.writeFile(wb, `GSCSCL_${activeReport || 'Report'}.xlsx`);
  };

  const exportPDF = () => {
    if (displayData.length === 0) return;

    const orientation = (activeReport === 'lifting-report' || activeReport === 'vehicle-assigned') ? 'landscape' : 'portrait';
    const doc = new jsPDF({ orientation, format: 'a4' });
    
    const drawHeader = () => {
      const pageWidth = doc.internal.pageSize.getWidth();


      // Top Header
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("FarEye Technologies Pvt. Ltd.", pageWidth / 2, 18, { align: 'center' });

      // Report Title Background
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      const titleWidth = doc.getTextWidth(reportTitle);
      const padding = 10;
      const boxHeight = 8;
      const boxX = (pageWidth - (titleWidth + padding)) / 2;
      const boxY = 21;
      
      doc.setFillColor(240, 240, 240); // Normal light gray background
      doc.rect(boxX, boxY, titleWidth + padding, boxHeight, 'F');

      // Report Title Text
      doc.setTextColor(0, 0, 0);
      doc.text(reportTitle, pageWidth / 2, 27, { align: 'center' });
      
      // Horizontal separator line
      doc.setLineWidth(0.5);
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 32, pageWidth - 14, 32);
    };

    drawHeader(); // Draw on the first page

    let headConfig = [visibleColumns.map(col => col.label)];
    if (activeReport === 'lifting-report') {
      const unitsRow = visibleColumns.map(col => {
         if (['srNo', 'district'].includes(col.id)) return '';
         if (col.id === 'liftedQty') return 'Qty (MT)';
         if (col.id.toLowerCase().includes('percent')) return '%';
         return 'Nos.';
      });
      const lettersRow = visibleColumns.map((col, index) => {
         if (index === 0) return '';
         return String.fromCharCode(64 + index); // 1=A, 2=B
      });
      headConfig = [
        [ { content: `Transport Contractors - First Mile (FCI to GSCSCL Godown) - ${reportTitle}`, colSpan: visibleColumns.length, styles: { halign: 'center', fillColor: [180, 198, 231], textColor: [0, 0, 0] } } ],
        visibleColumns.map(col => col.label),
        unitsRow,
        lettersRow
      ];
    }

    const tableRows = [];
    const maxLifted = activeReport === 'lifting-report' ? Math.max(...displayData.filter(r => !r.isSubtotal).map(r => r.liftedQty || 0), 1) : 1;

    displayData.forEach(row => {
      if (row.isSubtotal) {
        const fillColor = row.isGrandTotal ? [252, 213, 180] : [217, 217, 217];
        const fontSize = row.isGrandTotal ? 11 : 9;
        
        const subtotalCols = ['trips', 'deliveryChallan', 'epodComplete', 'epodPending', 'epodPendingPercent', 'vehicleAssigned', 'dosTpCreated', 'manualTpCreated', 'tpsGenerated', 'liftedQty', 'tripsTracked', 'untracked', 'epodDriver', 'pendingEpodDriver', 'percentEpodDriver', 'epodManager', 'pendingEpodManager', 'percentEpodManager', 'tripCount', 'netWeight', 'remarks'];
        const firstNumericIndex = visibleColumns.findIndex(c => subtotalCols.includes(c.id));
        const subtotalContent = [];

        if (firstNumericIndex === -1 || visibleColumns.length === 1) {
           subtotalContent.push({ 
              content: row.district, 
              colSpan: visibleColumns.length, 
              styles: { halign: 'left', fillColor: fillColor, textColor: [0, 0, 0], fontStyle: 'bold', fontSize: fontSize } 
           });
        } else {
           if (firstNumericIndex > 0) {
              subtotalContent.push({ 
                 content: row.district, 
                 colSpan: firstNumericIndex, 
                 styles: { halign: 'left', fillColor: fillColor, textColor: [0, 0, 0], fontStyle: 'bold', fontSize: fontSize } 
              });
           }
           
           for (let i = firstNumericIndex; i < visibleColumns.length; i++) {
             const col = visibleColumns[i];
             if (subtotalCols.includes(col.id)) {
               subtotalContent.push({ 
                 content: row[col.id] !== undefined ? String(row[col.id]) : '', 
                 styles: { halign: 'center', fillColor: fillColor, textColor: [0, 0, 0], fontStyle: 'bold', fontSize: fontSize + 1 } 
               });
             } else {
               subtotalContent.push({ 
                 content: '', 
                 styles: { fillColor: fillColor } 
               });
             }
           }
        }
        
        tableRows.push(subtotalContent);
      } else {
        const rowData = visibleColumns.map(col => {
          let val = row[col.id];
          if (val === undefined || val === null) return '';
          if (col.id === 'liftedQty' && typeof val === 'number') {
            const ratio = val / maxLifted;
            const r = Math.round(248 + (99 - 248) * ratio);
            const g = Math.round(105 + (190 - 105) * ratio);
            const b = Math.round(107 + (123 - 107) * ratio);
            return {
               content: val.toFixed(2),
               styles: { fillColor: [r, g, b], textColor: [0, 0, 0], halign: 'center' }
            };
          }
          return String(val);
        });
        tableRows.push(rowData);
      }
    });

    const columnStyles = {};
    const numericColsList = ['trips', 'deliveryChallan', 'epodComplete', 'epodPending', 'epodPendingPercent', 'vehicleAssigned', 'dosTpCreated', 'manualTpCreated', 'tpsGenerated', 'liftedQty', 'tripsTracked', 'untracked', 'epodDriver', 'pendingEpodDriver', 'percentEpodDriver', 'epodManager', 'pendingEpodManager', 'percentEpodManager'];
    visibleColumns.forEach((c, index) => {
      if (numericColsList.includes(c.id)) {
         columnStyles[index] = { halign: 'center' };
      }
    });

    autoTable(doc, {
      head: headConfig,
      body: tableRows,
      startY: 35,
      styles: { fontSize: 7.5, cellPadding: 1.5, textColor: [50, 50, 50], lineColor: [0, 0, 0], lineWidth: 0.1 },
      headStyles: { fillColor: [180, 198, 231], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'center', valign: 'middle' },
      columnStyles: columnStyles,
      margin: { left: 10, right: 10, top: 10, bottom: 15 },
      didDrawPage: function (data) {
        // Draw Watermark ON TOP of the table using opacity
        doc.setGState(new doc.GState({ opacity: 0.15 }));
        doc.setFontSize(80);
        doc.setTextColor(150, 150, 150);
        doc.setFont("helvetica", "bold");
        
        const text = "FarEye";
        const textWidth = doc.getTextWidth(text);
        const x = (doc.internal.pageSize.getWidth() - textWidth) / 2;
        const y = doc.internal.pageSize.getHeight() / 2;
        
        doc.text(text, x, y);
        doc.setGState(new doc.GState({ opacity: 1.0 })); // Reset opacity
        
        // Footer: Page Number
        doc.setLineWidth(0.5);
        doc.setDrawColor(200, 200, 200);
        doc.line(14, doc.internal.pageSize.getHeight() - 15, doc.internal.pageSize.getWidth() - 14, doc.internal.pageSize.getHeight() - 15);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        const str = "Page " + data.pageNumber;
        doc.text(str, doc.internal.pageSize.getWidth() - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
      }
    });

    if (activeReport === 'lifting-report') {
      const gt = displayData.find(r => r.isGrandTotal);
      if (gt) {
        const summaryData = [
          ["Vehicle Assign", gt.vehicleAssigned || 0, "DOS TP Created", gt.dosTpCreated || 0],
          ["Lifted Quantity (MT)", typeof gt.liftedQty === 'number' ? gt.liftedQty.toFixed(2) : (gt.liftedQty || 0), "Manual TP Created", gt.manualTpCreated || 0],
          ["Total TP Created", gt.tpsGenerated || 0, "EPOD Pending", gt.pendingEpodDriver || 0]
        ];

        doc.setFontSize(11);
        doc.setTextColor(255, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text("Summary :-", 14, doc.lastAutoTable.finalY + 8);

        autoTable(doc, {
          body: summaryData,
          startY: doc.lastAutoTable.finalY + 10,
          styles: { fontSize: 9, cellPadding: 2, textColor: [0, 0, 0], lineColor: [255, 0, 0], lineWidth: 0.5, fillColor: [230, 230, 230] },
          columnStyles: {
            0: { fontStyle: 'bold', halign: 'left', cellWidth: 40 },
            1: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
            2: { fontStyle: 'bold', halign: 'left', cellWidth: 40 },
            3: { halign: 'center', fontStyle: 'bold', cellWidth: 20 }
          },
          margin: { left: 14 }
        });
      }
    }

    else if (activeReport === 'vehicle-assigned') {
      const { dates, pivot } = calculateVehicleAssignedPivot(displayData);
      
      const minDate = dates.length > 0 ? dates[0] : '';
      const maxDate = dates.length > 0 ? dates[dates.length - 1] : '';
      
      const mainTitleRow = [{
         content: `First Mile - Vehicle Assignment TP Report ${minDate} to ${maxDate}`,
         colSpan: dates.length + 2,
         styles: { halign: 'center', fillColor: [218, 238, 243], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 11 }
      }];
      
      const pivotHeaders = ["Row Labels", ...dates, "Grand Total"];
      const pivotBody = Object.keys(pivot).filter(d => d !== 'Grand Total').sort().map(district => {
         const row = [district];
         let districtTotal = 0;
         dates.forEach(date => {
            const val = pivot[district][date] || 0;
            row.push(val === 0 ? '' : val);
            districtTotal += val;
         });
         row.push(districtTotal);
         return row;
      });
      
      const grandTotalRow = ["Grand Total"];
      let absoluteTotal = 0;
      dates.forEach(date => {
         const colTotal = pivot['Grand Total'][date] || 0;
         grandTotalRow.push(colTotal);
         absoluteTotal += colTotal;
      });
      grandTotalRow.push(absoluteTotal);
      
      const startYPivot = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 37;
      autoTable(doc, {
        head: [mainTitleRow, pivotHeaders],
        body: pivotBody,
        foot: [grandTotalRow],
        startY: startYPivot,
        theme: 'grid',
        styles: { 
           fontSize: 8, 
           textColor: [0, 0, 0], 
           lineColor: [0, 0, 0], 
           lineWidth: 0.1,
           halign: 'right'
        },
        headStyles: { 
           fillColor: [253, 233, 217], 
           textColor: [0, 0, 0], 
           fontStyle: 'bold', 
           halign: 'center' 
        },
        footStyles: { 
           fillColor: [253, 233, 217], 
           textColor: [0, 0, 0], 
           fontStyle: 'bold' 
        },
        columnStyles: {
           0: { fontStyle: 'bold', fillColor: [253, 233, 217], halign: 'left' }
        }
      });
    }

    doc.save(`GSCSCL_${activeReport}.pdf`);
  };

  let lastDist = null;
  let lastSource = null;

  return (
    <div className="app-container">
      
      {/* Custom Alert Modal */}
      {alertConfig.isOpen && (
        <div className="modal-overlay" style={{ zIndex: 9999, animation: 'fadeIn 0.2s ease' }}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '30px', animation: 'scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
            <div style={{ marginBottom: '20px' }}>
               {alertConfig.type === 'error' ? (
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255, 107, 107, 0.1)', color: '#ff6b6b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                     <AlertCircle size={32} />
                  </div>
               ) : (
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(46, 213, 115, 0.1)', color: '#2ed573', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                     <CheckCircle size={32} />
                  </div>
               )}
            </div>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '12px', color: 'var(--text-main)', fontWeight: '700' }}>{alertConfig.title}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5', fontSize: '1rem' }}>{alertConfig.message}</p>
            {alertConfig.isConfirm ? (
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  className="btn-secondary" 
                  style={{ flex: 1, justifyContent: 'center', padding: '12px', fontSize: '1rem' }}
                  onClick={() => setAlertConfig({ ...alertConfig, isOpen: false })}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary" 
                  style={{ flex: 1, justifyContent: 'center', padding: '12px', fontSize: '1rem', background: 'var(--danger)' }}
                  onClick={() => {
                    if (alertConfig.onConfirm) alertConfig.onConfirm();
                    setAlertConfig({ ...alertConfig, isOpen: false });
                  }}
                >
                  Delete
                </button>
              </div>
            ) : (
              <button 
                className="btn-primary" 
                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '1rem' }}
                onClick={() => setAlertConfig({ ...alertConfig, isOpen: false })}
              >
                OK
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Premium Admin Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <Database className="logo-icon" size={26} />
            <span className="logo-text">GSCSCL</span>
          </div>
          <button className="close-btn" onClick={() => setSidebarOpen(false)}>
            <Menu size={24} />
          </button>
        </div>
        
        <div className="nav-menu">
          {/* Section 1 */}
          <div className="nav-section">
            <div 
              className="nav-section-header" 
              onClick={() => setMillerMenuOpen(!millerMenuOpen)}
            >
              <span className="nav-section-title">Miller Reports</span>
              {millerMenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>
            
            {millerMenuOpen && (
              <div className="nav-submenu">
                <div 
                  className={`nav-item ${activeReport === 'godown-to-miller' ? 'active' : ''}`}
                  onClick={() => handleMenuClick('godown-to-miller')}
                >
                  <Truck className="nav-icon" size={16} />
                  <span>Godown to Miller</span>
                </div>
                
                <div 
                  className={`nav-item ${activeReport === 'miller-to-godown' ? 'active' : ''}`}
                  onClick={() => handleMenuClick('miller-to-godown')}
                >
                  <Building2 className="nav-icon" size={16} />
                  <span>Miller to GSCSCL</span>
                </div>
              </div>
            )}
          </div>

          {/* Section: First Mile */}
          <div className="nav-section" style={{ marginTop: '12px' }}>
            <div 
              className="nav-section-header" 
              onClick={() => setFirstMileMenuOpen(!firstMileMenuOpen)}
            >
              <span className="nav-section-title">First Mile Reports</span>
              {firstMileMenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>
            
            {firstMileMenuOpen && (
              <div className="nav-submenu">
                <div 
                  className={`nav-item ${activeReport === 'first-mile-epod' ? 'active' : ''}`}
                  onClick={() => handleMenuClick('first-mile-epod')}
                >
                  <FileText className="nav-icon" size={16} />
                  <span>First Mile EPOD</span>
                </div>
                
                <div 
                  className={`nav-item ${activeReport === 'lifting-report' ? 'active' : ''}`}
                  onClick={() => handleMenuClick('lifting-report')}
                >
                  <FileText className="nav-icon" size={16} />
                  <span>Lifting Report</span>
                </div>
                <div 
                  className={`nav-item ${activeReport === 'vehicle-assigned' ? 'active' : ''}`}
                  onClick={() => handleMenuClick('vehicle-assigned')}
                >
                  <FileText className="nav-icon" size={16} />
                  <span>Vehicle Assigned</span>
                </div>
              </div>
            )}
          </div>

          {/* Section: Last Mile */}
          <div className="nav-section" style={{ marginTop: '12px' }}>
            <div 
              className="nav-section-header" 
              onClick={() => setLastMileMenuOpen(!lastMileMenuOpen)}
            >
              <span className="nav-section-title">Last Mile Reports</span>
              {lastMileMenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>
            
            {lastMileMenuOpen && (
              <div className="nav-submenu">
                <div 
                  className={`nav-item ${activeReport === 'last-mile-epod' ? 'active' : ''}`}
                  onClick={() => handleMenuClick('last-mile-epod')}
                >
                  <FileText className="nav-icon" size={16} />
                  <span>Last Mile EPOD</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 2 */}
          <div className="nav-section" style={{ marginTop: '12px' }}>
            <div 
              className="nav-section-header" 
              onClick={() => setAnalyticsMenuOpen(!analyticsMenuOpen)}
            >
              <span className="nav-section-title">Analytics</span>
              {analyticsMenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>
            
            {analyticsMenuOpen && (
              <div className="nav-submenu">
                <div 
                  className={`nav-item ${activeReport === 'multi-trip-analysis' ? 'active' : ''}`}
                  onClick={() => handleMenuClick('multi-trip-analysis')}
                >
                  <Repeat className="nav-icon" size={16} />
                  <span>Multi-Trip Analysis</span>
                </div>
                <div 
                  className={`nav-item ${activeReport === 'eta-route' ? 'active' : ''}`}
                  onClick={() => handleMenuClick('eta-route')}
                >
                  <AlertCircle className="nav-icon" size={16} />
                  <span>ETA Route</span>
                </div>
                <div 
                  className={`nav-item ${activeReport === 'monthly' ? 'active' : ''}`}
                  onClick={() => handleMenuClick('monthly')}
                >
                  <FileText className="nav-icon" size={16} />
                  <span>Monthly Overview</span>
                </div>
                <div 
                  className={`nav-item ${activeReport === 'history' ? 'active' : ''}`}
                  onClick={() => handleMenuClick('history')}
                >
                  <History className="nav-icon" size={16} />
                  <span>History</span>
                </div>
              </div>
            )}
          </div>

          {/* Section: Templates */}
          <div className="nav-section" style={{ marginTop: '12px' }}>
            <div 
              className="nav-section-header" 
              onClick={() => setTemplatesMenuOpen(!templatesMenuOpen)}
            >
              <span className="nav-section-title">Templates</span>
              {templatesMenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </div>
            
            {templatesMenuOpen && (
              <div className="nav-submenu">
                <div 
                  className={`nav-item ${activeReport === 'sms-template' ? 'active' : ''}`}
                  onClick={() => handleMenuClick('sms-template')}
                >
                  <FileText className="nav-icon" size={16} />
                  <span>SMS TEMPLATE</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`main-content ${sidebarOpen && !isMobile ? 'sidebar-open' : 'sidebar-closed'}`}>
        
        {/* Top Header for toggling sidebar */}
        {!sidebarOpen && (
          <div className="top-header">
            <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <span className="logo-text" style={{ fontSize: '1.2rem' }}>GSCSCL Report</span>
          </div>
        )}
        
        {/* Render content based on active report */}
        {(activeReport === 'godown-to-miller' || activeReport === 'miller-to-godown' || activeReport === 'first-mile-epod' || activeReport === 'last-mile-epod' || activeReport === 'lifting-report' || activeReport === 'multi-trip-analysis' || activeReport === 'eta-route' || activeReport === 'vehicle-assigned') && (
          <>
            <div className="page-header">
              <div style={{ flex: 1, maxWidth: '70%' }}>
                <input 
                  type="text" 
                  value={reportTitle} 
                  onChange={(e) => setReportTitle(e.target.value)}
                  style={{
                    fontSize: '1.8rem',
                    fontWeight: '700',
                    color: 'var(--text-main)',
                    background: 'transparent',
                    border: '1px dashed transparent',
                    borderBottom: '1px dashed rgba(255,255,255,0.3)',
                    width: '100%',
                    padding: '4px 8px',
                    outline: 'none',
                    fontFamily: 'Outfit, sans-serif',
                    transition: 'all 0.2s ease',
                    marginBottom: '4px'
                  }}
                  onFocus={(e) => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.borderBottom = '1px dashed var(--accent-primary)'; }}
                  onBlur={(e) => { e.target.style.background = 'transparent'; e.target.style.borderBottom = '1px dashed transparent'; }}
                  title="Click to edit report title"
                />
                <p className="page-subtitle" style={{ paddingLeft: '8px' }}>Upload raw Excel data to generate and clean reports</p>
              </div>
              {rawData.length > 0 && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn-secondary" onClick={handleClearData} title="Clear Data for this report" style={{ color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.3)' }}>
                    <Trash2 size={18} />
                  </button>
                  <button className="btn-secondary" onClick={() => setShowConfigModal(true)} title="Configure Columns">
                    <Settings size={18} />
                  </button>
                  <button className="btn-secondary" onClick={handleSaveToHistory} title="Save Report Data to History">
                    <History size={18} />
                    Save to History
                  </button>
                  <button className="btn-secondary" onClick={exportPDF}>
                    <FileDown size={18} />
                    Download PDF
                  </button>
                  <button className="btn-primary" onClick={exportExcel}>
                    <Download size={18} />
                    Export Excel
                  </button>
                </div>
              )}
            </div>

            {isLoading && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-main)', fontSize: '1.2rem' }}>
                <div className="spinner" style={{ border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                Processing Large File... Please wait.
              </div>
            )}

            {!isLoading && rawData.length === 0 && activeReport !== 'lifting-report' && activeReport !== 'eta-route' && (
              <div 
                className={`upload-area ${isDragging ? 'active' : ''} glass-panel`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".xlsx, .xls, .csv" 
                  style={{ display: 'none' }} 
                />
                <UploadCloud className="upload-icon" />
                <h3 className="upload-title">Upload Raw Data</h3>
                <p className="upload-subtitle">Drag and drop your Excel file here or click to browse</p>
              </div>
            )}
            {!isLoading && rawData.length === 0 && activeReport === 'eta-route' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: '600', margin: 0 }}>Google Maps Configuration</h3>
                    <a href="/ETA_Route_Template.xlsx" download className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', padding: '6px 12px', fontSize: '0.9rem' }}>
                      <FileSpreadsheet size={16} />
                      Download Sample File
                    </a>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Google Maps API Key (Required)</label>
                      <input 
                        type="password" 
                        value={etaApiKey}
                        onChange={(e) => setEtaApiKey(e.target.value)}
                        placeholder="AIzaSy..." 
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Vehicle Type</label>
                      <select 
                        value={etaVehicleType}
                        onChange={(e) => setEtaVehicleType(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }}
                      >
                        <option value="Truck">Truck (Logistics Estimated ETA)</option>
                        <option value="Car">Car (Standard Google ETA)</option>
                      </select>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic' }}>* Truck mode automatically adjusts time for slower speeds (+20%) and mandated rest breaks (1 hr per 5 hrs of driving).</p>
                    </div>
                  </div>
                </div>

                <div 
                  className={`upload-area ${isDragging ? 'active' : ''} glass-panel`}
                  style={{ opacity: etaApiKey ? 1 : 0.5, cursor: etaApiKey ? 'pointer' : 'not-allowed' }}
                  onDragOver={(e) => etaApiKey && handleDragOver(e)}
                  onDragLeave={(e) => etaApiKey && handleDragLeave(e)}
                  onDrop={(e) => etaApiKey && handleDrop(e)}
                  onClick={() => etaApiKey && fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept=".xlsx, .xls, .csv" 
                    style={{ display: 'none' }} 
                    disabled={!etaApiKey}
                  />
                  <UploadCloud className="upload-icon" />
                  <h3 className="upload-title">{etaApiKey ? "Upload ETA Excel File" : "Enter API Key First"}</h3>
                  <p className="upload-subtitle">Drag and drop your Excel file containing Origin/Dest coordinates.</p>
                </div>
              </div>
            )}
            
            {!isLoading && rawData.length === 0 && activeReport === 'lifting-report' && (
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', width: '100%' }}>
                <div 
                  className="upload-area glass-panel"
                  style={{ flex: 1, minWidth: '300px' }}
                  onClick={() => mainLiftingRef.current?.click()}
                >
                  <input type="file" ref={mainLiftingRef} onChange={e => setMainLiftingFile(e.target.files[0])} accept=".xlsx, .xls, .csv" style={{ display: 'none' }} />
                  <UploadCloud className="upload-icon" />
                  <h3 className="upload-title">1. Upload Main Data</h3>
                  <p className="upload-subtitle" style={{ color: mainLiftingFile ? '#2ed573' : 'var(--text-muted)' }}>
                    {mainLiftingFile ? mainLiftingFile.name : "Select FM Report Excel"}
                  </p>
                </div>

                <div 
                  className="upload-area glass-panel"
                  style={{ flex: 1, minWidth: '300px' }}
                  onClick={() => trackLiftingRef.current?.click()}
                >
                  <input type="file" ref={trackLiftingRef} onChange={e => setTrackLiftingFile(e.target.files[0])} accept=".xlsx, .xls, .csv" style={{ display: 'none' }} />
                  <UploadCloud className="upload-icon" />
                  <h3 className="upload-title">2. Upload Tracking Data (Optional)</h3>
                  <p className="upload-subtitle" style={{ color: trackLiftingFile ? '#2ed573' : 'var(--text-muted)' }}>
                    {trackLiftingFile ? trackLiftingFile.name : "Select Tracking Data Excel"}
                  </p>
                </div>
                
                {(mainLiftingFile) && (
                   <div style={{ width: '100%', textAlign: 'center', marginTop: '16px' }}>
                      <button className="btn-primary" onClick={handleProcessLiftingFiles} style={{ padding: '14px 40px', fontSize: '1.2rem' }}>
                        Generate Lifting Report
                      </button>
                   </div>
                )}
              </div>
            )}

            {!isLoading && rawData.length > 0 && (
              <>
              {activeReport === 'lifting-report' && displayData.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                   {(() => {
                     const grandTotal = displayData.find(r => r.isGrandTotal) || {};
                     return (
                       <>
                         <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: '4px solid var(--accent-secondary)' }}>
                           <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '600' }}>Total Lifted Qty</span>
                           <span style={{ fontSize: '2.2rem', fontWeight: '600', color: 'var(--text-main)', lineHeight: '1' }}>{grandTotal.liftedQty || 0}</span>
                         </div>
                         <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: '4px solid #3b82f6' }}>
                           <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '600' }}>Total TPs Generated</span>
                           <span style={{ fontSize: '2.2rem', fontWeight: '600', color: 'var(--text-main)', lineHeight: '1' }}>{grandTotal.tpsGenerated || 0}</span>
                         </div>
                         <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: '4px solid #2ed573' }}>
                           <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '600' }}>Total Tracked</span>
                           <span style={{ fontSize: '2.2rem', fontWeight: '600', color: 'var(--text-main)', lineHeight: '1' }}>{grandTotal.tripsTracked || 0}</span>
                         </div>
                         <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: '4px solid #ff6b6b' }}>
                           <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '600' }}>Total Untracked</span>
                           <span style={{ fontSize: '2.2rem', fontWeight: '600', color: 'var(--text-main)', lineHeight: '1' }}>{grandTotal.untracked || 0}</span>
                         </div>
                       </>
                     );
                   })()}
                </div>
              )}
              
              {activeReport === 'multi-trip-analysis' && displayData.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                   {(() => {
                     const subtotalRows = displayData.filter(r => r.isSubtotal);
                     const totalVehicles = subtotalRows.length;
                     const totalTrips = subtotalRows.reduce((sum, r) => sum + (r.tripCount || 0), 0);
                     const totalWeight = subtotalRows.reduce((sum, r) => sum + (r.netWeight || 0), 0);
                     const greaterThan35 = subtotalRows.filter(r => r.remarks && r.remarks.includes('Greater')).length;
                     
                     return (
                       <>
                         <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: '4px solid var(--accent-secondary)' }}>
                           <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '600' }}>Total Vehicles (&gt;1 Trip)</span>
                           <span style={{ fontSize: '2.2rem', fontWeight: '600', color: 'var(--text-main)', lineHeight: '1' }}>{totalVehicles}</span>
                         </div>
                         <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: '4px solid #3b82f6' }}>
                           <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '600' }}>Total Trips</span>
                           <span style={{ fontSize: '2.2rem', fontWeight: '600', color: 'var(--text-main)', lineHeight: '1' }}>{totalTrips}</span>
                         </div>
                         <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: '4px solid #f59e0b' }}>
                           <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '600' }}>Total Weight (MT)</span>
                           <span style={{ fontSize: '2.2rem', fontWeight: '600', color: 'var(--text-main)', lineHeight: '1' }}>{totalWeight.toFixed(2)}</span>
                         </div>
                         <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: '4px solid #ff6b6b' }}>
                           <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '600' }}>Vehicles &gt; 35 MT</span>
                           <span style={{ fontSize: '2.2rem', fontWeight: '600', color: 'var(--text-main)', lineHeight: '1' }}>{greaterThan35}</span>
                         </div>
                       </>
                     );
                   })()}
                </div>
              )}
              
              <div className="glass-panel" style={{ padding: '24px' }}>
                <div className="filter-bar">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.2rem', fontWeight: '600' }}>
                    <FileSpreadsheet size={22} className="logo-icon" />
                    Report Preview
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
                    <Filter size={18} style={{ color: 'var(--text-muted)' }} />
                    
                    {activeReport === 'lifting-report' ? (
                      <MultiSelectDropdown 
                        placeholder="TP Date" 
                        options={uniqueTpDates} 
                        selected={tpDateFilter} 
                        onChange={setTpDateFilter} 
                      />
                    ) : activeReport === 'multi-trip-analysis' ? (
                      <MultiSelectDropdown 
                        placeholder="Remarks" 
                        options={uniqueRemarks} 
                        selected={remarksFilter} 
                        onChange={setRemarksFilter} 
                      />
                    ) : activeReport === 'last-mile-epod' ? (
                      <>
                        <MultiSelectDropdown 
                          placeholder="DC Month" 
                          options={uniqueDcMonths} 
                          selected={dcMonthFilter} 
                          onChange={setDcMonthFilter} 
                        />
                        <MultiSelectDropdown 
                          placeholder="DC Date" 
                          options={uniqueDcDates} 
                          selected={dcDateFilter} 
                          onChange={setDcDateFilter} 
                        />
                        <MultiSelectDropdown 
                          placeholder="EPOD Status" 
                          options={uniqueEpodStatuses} 
                          selected={epodStatusFilter} 
                          onChange={setEpodStatusFilter} 
                        />
                      </>
                    ) : (activeReport === 'godown-to-miller' || activeReport === 'miller-to-godown') ? (
                      <select 
                        className="btn-secondary" 
                        value={filterStatus} 
                        onChange={(e) => setFilterStatus(e.target.value)}
                        style={{ outline: 'none', appearance: 'none', paddingRight: '16px', backgroundColor: 'var(--bg-panel)' }}
                      >
                        <option value="All">All Trips ({filterCounts.all})</option>
                        <option value="Start Trip Pending">Start Trip Pending ({filterCounts.startPending})</option>
                        <option value="End Trip Pending">End Trip Pending (In Transit) ({filterCounts.endPending})</option>
                        <option value="Completed">Completed ({filterCounts.completed})</option>
                      </select>
                    ) : null}
                  </div>
                </div>

                {displayData.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                    <AlertCircle size={48} style={{ opacity: 0.3, margin: '0 auto 16px' }} />
                    <p style={{ fontSize: '1.1rem' }}>No trips found for the selected filter.</p>
                  </div>
                ) : (
                  <div className="table-container" style={{ marginTop: 0 }}>
                    <table>
                      <thead>
                        <tr>
                          {visibleColumns.map(col => (
                            <th key={col.id}>{col.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {displayData.map((row, index) => {
                          if (row.isSubtotal) {
                            lastDist = null;
                            lastSource = null;
                            const subtotalCols = ['trips', 'deliveryChallan', 'epodComplete', 'epodPending', 'epodPendingPercent', 'vehicleAssigned', 'dosTpCreated', 'manualTpCreated', 'tpsGenerated', 'liftedQty', 'tripsTracked', 'untracked', 'epodDriver', 'pendingEpodDriver', 'percentEpodDriver', 'epodManager', 'pendingEpodManager', 'percentEpodManager', 'tripCount', 'netWeight', 'remarks'];
                            const firstNumericIndex = visibleColumns.findIndex(c => subtotalCols.includes(c.id));
                            const colSpanBeforeNum = firstNumericIndex > 0 ? firstNumericIndex : visibleColumns.length;
                            const sizeStyle = row.isGrandTotal ? '1.15rem' : '1.05rem';
                            return (
                              <tr key={index} className={row.isGrandTotal ? "subtotal-row grand-total-row" : "subtotal-row"}>
                                {visibleColumns.map((col, i) => {
                                  if (col.id === 'district') {
                                    return <td key={col.id} colSpan={colSpanBeforeNum} style={{ fontSize: sizeStyle }}>{row.district}</td>;
                                  } else if (subtotalCols.includes(col.id)) {
                                    if (col.id === 'remarks') {
                                       return <td key={col.id} style={{ fontSize: sizeStyle, textAlign: 'center' }}><span className={`status-badge ${row.remarks.includes('Greater') ? 'status-error' : 'status-success'}`}>{row.remarks}</span></td>;
                                    }
                                    const val = row[col.id];
                                    return <td key={col.id} style={{ fontSize: sizeStyle, textAlign: 'center' }}>{val === 0 ? '' : val}</td>;
                                  } else if (i < firstNumericIndex || firstNumericIndex === -1) {
                                    return null; 
                                  } else {
                                    return <td key={col.id}></td>;
                                  }
                                })}
                              </tr>
                            );
                          }
                          
                          const isDistSame = lastDist === row.district;
                          const isSourceSame = lastDist === row.district && lastSource === row.sourceLoc;
                          
                          lastDist = row.district;
                          lastSource = row.sourceLoc;

                          let statusClass = 'status-pending';
                          if (row.status === 'Completed') statusClass = 'status-success';
                          else if (row.status === 'End Trip Pending') statusClass = 'status-warning';
                          else if (row.status === 'Start Trip Pending') statusClass = 'status-error';

                          const displayDist = !isDistSame ? row.district : '';
                          const displaySource = !isSourceSame ? row.sourceLoc : '';

                          return (
                            <tr key={index} className="data-row">
                              {visibleColumns.map(col => {
                                let content;
                                switch(col.id) {
                                  case 'refNo': 
                                    content = <span style={{ fontWeight: '500', color: 'var(--accent)' }}>{row.refNo}</span>; 
                                    break;
                                  case 'district': 
                                    content = <span style={{ fontWeight: displayDist ? '700' : 'normal', color: displayDist ? 'var(--text-main)' : 'inherit' }}>{displayDist}</span>; 
                                    break;
                                  case 'sourceLoc': 
                                    content = <span style={{ fontWeight: displaySource ? '500' : 'normal' }}>{displaySource}</span>; 
                                    break;
                                  case 'destLoc': content = row.destLoc; break;
                                  case 'transporter': content = row.transporter; break;
                                  case 'godown': content = row.godown; break;
                                  case 'tpDate': content = row.tpDate; break;
                                  case 'createdAt': content = row.createdAt; break;
                                  case 'startDate': 
                                    content = row.startDate === 'PENDING' ? <span className="status-badge status-error">PENDING</span> : row.startDate; 
                                    break;
                                  case 'endDate': 
                                    content = row.endDate === 'PENDING' ? <span className="status-badge status-warning">PENDING</span> : row.endDate; 
                                    break;
                                  case 'pendingDays': content = row.pendingDays; break;
                                  case 'status': 
                                    content = <span className={`status-badge ${statusClass}`}>{row.status}</span>; 
                                    break;
                                  case 'remarks':
                                    content = <span className={`status-badge ${row.remarks.includes('Greater') ? 'status-error' : 'status-success'}`}>{row.remarks}</span>;
                                    break;
                                  case 'vehicle': content = row.vehicle; break;
                                  case 'source': content = row.source; break;
                                  case 'dest': content = row.dest; break;
                                  case 'hrs': 
                                  case 'tripCount':
                                  case 'netWeight':
                                  case 'trips': 
                                  case 'deliveryChallan': 
                                  case 'epodComplete': 
                                  case 'epodPending': 
                                  case 'epodPendingPercent': 
                                    content = <div style={{ textAlign: 'center' }}>{row[col.id] === 0 ? '' : row[col.id]}</div>; 
                                    break;
                                  default: 
                                    if (row[col.id] !== undefined) {
                                      let val = row[col.id];
                                      if (col.id === 'liftedQty' && typeof val === 'number') {
                                          val = val.toFixed(2);
                                          const maxVal = Math.max(...displayData.filter(r => !r.isSubtotal).map(r => r.liftedQty || 0), 1);
                                          const ratio = row.liftedQty / maxVal;
                                          const r = Math.round(248 + (99 - 248) * ratio);
                                          const g = Math.round(105 + (190 - 105) * ratio);
                                          const b = Math.round(107 + (123 - 107) * ratio);
                                          content = <div style={{ textAlign: 'center', backgroundColor: `rgb(${r},${g},${b})`, color: '#000', fontWeight: '500', padding: '4px', borderRadius: '4px' }}>{val}</div>;
                                      } else {
                                          content = <div style={{ textAlign: 'center' }}>{val === 0 ? '' : val}</div>;
                                      }
                                    } else {
                                      content = '';
                                    }
                                }
                                return <td key={col.id}>{content}</td>;
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              </>
            )}
          </>
        )}


        {/* Placeholder for Monthly Overview */}
        {activeReport === 'monthly' && (
          <div className="coming-soon-container">
            <FileText className="coming-soon-icon" size={64} />
            <h2 className="coming-soon-title">Monthly Analytics</h2>
            <p className="coming-soon-subtitle">Advanced analytics and charts will be available soon.</p>
          </div>
        )}

        {/* History View */}
        {activeReport === 'history' && (
          <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
            <div className="page-header" style={{ marginBottom: '24px' }}>
               <h2 style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <History size={28} style={{ color: 'var(--accent-primary)' }} />
                 Saved Reports History
               </h2>
            </div>
            
            {historyList.length === 0 ? (
               <div className="coming-soon-container">
                 <FolderOpen className="coming-soon-icon" size={64} />
                 <h2 className="coming-soon-title">No Saved Reports</h2>
                 <p className="coming-soon-subtitle">Generate a report and click "Save to History" to view it here later.</p>
               </div>
            ) : (
               <div className="glass-panel" style={{ padding: '20px' }}>
                 <div className="table-responsive">
                   <table className="report-table">
                     <thead>
                       <tr>
                         <th>Report Title</th>
                         <th>Report Type</th>
                         <th>Saved Date & Time</th>
                         <th style={{ textAlign: 'right' }}>Actions</th>
                       </tr>
                     </thead>
                     <tbody>
                       {historyList.map(item => (
                         <tr key={item.id} className="table-row-hover">
                           <td style={{ fontWeight: '600', color: 'var(--text-main)' }}>{item.title}</td>
                           <td style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>{String(item.type).replace(/-/g, ' ')}</td>
                           <td style={{ color: 'var(--text-muted)' }}>{new Date(item.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                           <td style={{ textAlign: 'right' }}>
                             <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                               <button className="btn-primary" onClick={() => handleOpenHistoryItem(item)} title="Open Report" style={{ padding: '6px 12px', fontSize: '0.9rem' }}>
                                 <FolderOpen size={16} /> Open
                               </button>
                               <button className="btn-secondary" style={{ color: '#ef4444', padding: '6px 12px', fontSize: '0.9rem' }} onClick={() => handleDeleteHistoryItem(item.id)} title="Delete Report">
                                 <Trash2 size={16} /> Delete
                               </button>
                             </div>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>
            )}
          </div>
        )}

        {/* Config Modal */}
        {showConfigModal && (
          <div className="modal-overlay" onClick={(e) => { if (e.target.className === 'modal-overlay') setShowConfigModal(false) }}>
            <div className="modal-content">
              <div className="modal-header">
                <h3>Configure Columns</h3>
                <button onClick={() => setShowConfigModal(false)} className="close-btn" style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              <div className="modal-body" style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 0, marginBottom: '16px' }}>Drag handles to reorder. Toggle checkbox to show/hide.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {columnConfig.map((col, index) => (
                    <div 
                      key={col.id} 
                      className="column-list-item"
                      draggable
                      onDragStart={(e) => handleColDragStart(e, index)}
                      onDragEnd={handleColDragEnd}
                      onDragOver={(e) => handleColDragOver(e, index)}
                    >
                      <GripVertical size={16} style={{ color: 'var(--text-dim)', cursor: 'grab' }} />
                      <input 
                        type="checkbox" 
                        checked={col.visible} 
                        onChange={() => toggleColumnVisibility(index)}
                        id={`col-${col.id}`}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                      <label htmlFor={`col-${col.id}`} style={{ flex: 1, cursor: 'pointer', fontSize: '0.95rem', margin: 0, userSelect: 'none' }}>{col.label}</label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn-secondary" onClick={() => saveConfig(activeReport === 'first-mile-epod' ? [...DEFAULT_EPOD_CONFIG] : activeReport === 'miller-to-godown' ? [...DEFAULT_MG_CONFIG] : [...DEFAULT_GM_CONFIG])}>Reset</button>
                <button className="btn-primary" onClick={() => setShowConfigModal(false)}>Done</button>
              </div>
            </div>
          </div>
        )}

        {activeReport === 'sms-template' && (
          <SmsTemplate />
        )}

      </div>
    </div>
  );
}

export default App;
