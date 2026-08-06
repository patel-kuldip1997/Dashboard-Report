import React, { useState, useRef, useMemo, useEffect } from 'react';
import { UploadCloud, FileSpreadsheet, Download, Building2, Truck, FileText, Filter, AlertCircle, Database, Menu, X, ChevronDown, ChevronRight, FileDown, Settings, GripVertical, History, Trash2, FolderOpen, Search, CheckCircle, Repeat, MapPin, BarChart2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveHistoryReport, getHistoryReports, deleteHistoryReport } from './db.js';
import SmsTemplate from './components/SmsTemplate';
import CustomizeReport from './components/CustomizeReport';
import { DEFAULT_REPORT_ATTRIBUTES } from './reportAttributes';

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
  { id: 'routeCode', label: 'Route Code', visible: true },
  { id: 'origin', label: 'Origin Lat/Lng', visible: true },
  { id: 'destination', label: 'Destination Lat/Lng', visible: true },
  { id: 'actualTime', label: 'Actual Time (Mins)', visible: true },
  { id: 'googleEta', label: 'Calculated ETA (Mins)', visible: true },
  { id: 'distance', label: 'Google Distance (KM)', visible: true },
  { id: 'vehicleType', label: 'Vehicle Type', visible: true },
  { id: 'tripStatus', label: 'Trip Status', visible: true }
];

const DEFAULT_WEIGHBRIDGE_CONFIG = [
  { id: 'district', label: 'District', visible: true },
  { id: 'destGodown', label: 'Destination Godown', visible: true },
  { id: 'weighbridgeVendor', label: 'Weighbridge Vendor', visible: true },
  { id: 'epodStatus', label: 'Total EPOD', visible: true },
  { id: 'weighbridgeUsed', label: 'Total Weighbridge Used', visible: true }
];

const DEFAULT_VEHICLE_ASSIGNED_CONFIG = [
  { id: 'refNo', label: 'Reference Number', visible: true },
  { id: 'district', label: 'District', visible: true },
  { id: 'tpDate', label: 'TP Date', visible: true },
  { id: 'vehicleNo', label: 'Vehicle Number', visible: true },
  { id: 'destGodown', label: 'Destination Godown', visible: true },
  { id: 'transporter', label: 'Transporter Name', visible: true }
];

const DEFAULT_LAST_MILE_IMEI_CONFIG = [
  { id: 'district', label: 'District', visible: true },
  { id: 'godown', label: 'GSCSCL Godown', visible: true },
  { id: 'transporter', label: 'DSD Transporter Name', visible: true },
  { id: 'vehicleNo', label: 'Vehicle Number', visible: true },
  { id: 'refNo', label: 'Reference Number', visible: true },
  { id: 'dcCreationDate', label: 'DC Creation Date', visible: true },
  { id: 'epodStatusRaw', label: 'EPOD Status', visible: true },
  { id: 'startIMEI', label: 'IMEI At Start', visible: true },
  { id: 'endIMEI', label: 'IMEI At End', visible: true },
  { id: 'imeiStatus', label: 'IMEI Status', visible: true },
  { id: 'totalTrips', label: 'Total Trips', visible: true },
  { id: 'matched', label: 'IMEI Matched', visible: true },
  { id: 'mismatched', label: 'IMEI Mismatched', visible: true },
  { id: 'missing', label: 'Missing IMEI', visible: true }
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

const ALL_DISTRICTS = [
  "Ahmedabad", "AhmedabadCity", "Amreli", "Anand", "Arvalli", "Banaskantha", "Baroda", "Bharuch", "Bhavanagar", "Botad", 
  "Chottaudepur", "Dahod", "Dang", "DevbhumiDwarka", "Gandhinagar", "GirSomnath", "Jamnagar", "Junagadh", "Kheda", "Kutch", 
  "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navasari", "Panchmahal", "Patan", "Porbandar", "Rajkot", "Sabarkantha", 
  "Surat", "Surendranagar", "Tapi", "Valsad", "VavTharad"
];


function WeighbridgeVendors({ vendors, setVendors }) {
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [editIndex, setEditIndex] = useState(-1);
  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');

  const handleAdd = () => {
    if (!newId || !newName) return;
    setVendors([...vendors, { id: newId, name: newName }]);
    setNewId('');
    setNewName('');
  };

  const handleDelete = (index) => {
    const updated = [...vendors];
    updated.splice(index, 1);
    setVendors(updated);
  };

  const startEdit = (index, vendor) => {
    setEditIndex(index);
    setEditId(vendor.id);
    setEditName(vendor.name);
  };

  const saveEdit = () => {
    const updated = [...vendors];
    updated[editIndex] = { id: editId, name: editName };
    setVendors(updated);
    setEditIndex(-1);
  };

  return (
    <div className="report-container">
      <div className="report-header">
        <h2 className="report-title">
          <Settings size={28} className="logo-icon" />
          Weighbridge Vendors Configuration
        </h2>
      </div>
      <div style={{ padding: '24px' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          Map the trailing digit of a Weighbridge ID to the Vendor Name.
        </p>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <input type="text" placeholder="Vendor Code (e.g. 1)" value={newId} onChange={e => setNewId(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-main)', flex: 1, minWidth: '150px' }} />
          <input type="text" placeholder="Vendor Name (e.g. APPLE WEIGHINFRA LIMITED)" value={newName} onChange={e => setNewName(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-main)', flex: 3, minWidth: '250px' }} />
          <button className="btn-primary" onClick={handleAdd}>Add Vendor</button>
        </div>

        <table className="report-table">
          <thead>
            <tr>
              <th style={{ width: '150px' }}>Vendor Code</th>
              <th>Vendor Name</th>
              <th style={{ width: '150px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v, i) => (
              <tr key={i} className="data-row">
                {editIndex === i ? (
                  <>
                    <td><input type="text" value={editId} onChange={e => setEditId(e.target.value)} style={{ width: '100%', padding: '6px' }} /></td>
                    <td><input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%', padding: '6px' }} /></td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn-primary" onClick={saveEdit} style={{ padding: '6px 12px', marginRight: '8px' }}>Save</button>
                      <button className="btn-secondary" onClick={() => setEditIndex(-1)} style={{ padding: '6px 12px' }}>Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ fontWeight: '600' }}>{v.id}</td>
                    <td>{v.name}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn-secondary" onClick={() => startEdit(i, v)} style={{ padding: '6px 12px', marginRight: '8px' }}>Edit</button>
                      <button className="btn-secondary" onClick={() => handleDelete(i)} style={{ padding: '6px 12px', color: '#ff4d4f', borderColor: '#ff4d4f' }}>Delete</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {vendors.length === 0 && (
               <tr><td colSpan="3" style={{ textAlign: 'center', padding: '24px' }}>No vendors configured.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function App() {
  const [activeReport, setActiveReport] = useState(() => {
    return sessionStorage.getItem('activeReportTab') || 'welcome';
  });

  useEffect(() => {
    sessionStorage.setItem('activeReportTab', activeReport);
  }, [activeReport]);
  const [reportData, setReportData] = useState({});
  const rawData = reportData[activeReport] || [];
  const [filterStatus, setFilterStatus] = useState('All');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, message: '' });
  const [toastConfig, setToastConfig] = useState({ isOpen: false, message: '' });
  const toastTimeoutRef = useRef(null);

  const showToast = (message, type = 'success', duration = 4000) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastConfig({ isOpen: true, message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToastConfig({ isOpen: false, message: '', type: 'success' });
    }, duration);
  };
  const [historyList, setHistoryList] = useState([]);
  const fileInputRef = useRef(null);
  
  const [vaStartDate, setVaStartDate] = useState('');
  const [vaEndDate, setVaEndDate] = useState('');
  
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
  
  const [weighbridgeVendors, setWeighbridgeVendors] = useState(() => {
    const saved = localStorage.getItem('weighbridge_vendors_list');
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', name: 'APPLE WEIGHINFRA LIMITED' },
      { id: '2', name: 'EAGLE SCALE MANUFACTURING WORKS' },
      { id: '3', name: 'ENDEAVOUR INSTRUMENT PVT. LTD' },
      { id: '4', name: 'LEOTRONIC SCALES PVT. LTD' }
    ];
  });
  
  const handleSaveVendors = (newVendors) => {
     setWeighbridgeVendors(newVendors);
     localStorage.setItem('weighbridge_vendors_list', JSON.stringify(newVendors));
  };
  
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
  const [wbIdFilter, setWbIdFilter] = useState(null);
  const [remarksFilter, setRemarksFilter] = useState(null);
  const [imeiStatusFilter, setImeiStatusFilter] = useState(null);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);

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
    } else if (activeReport === 'weighbridge-report') {
       setReportTitle("Weighbridge Report");
    } else if (activeReport === 'sms-template') {
       setReportTitle("SMS Templates");
    } else if (activeReport === 'last-mile-imei') {
       setReportTitle("Last Mile IMEI Report");
    } else {
       setReportTitle("Godown to Miller Trips");
    }

    const storageKey = `reportConfig_${activeReport}_v3`;
    const savedConfig = localStorage.getItem(storageKey);
    let defaultConf = [...DEFAULT_GM_CONFIG];
    if (activeReport === 'first-mile-epod') defaultConf = [...DEFAULT_EPOD_CONFIG];
    else if (activeReport === 'last-mile-epod') defaultConf = [...DEFAULT_LAST_MILE_EPOD_CONFIG];
    else if (activeReport === 'last-mile-imei') defaultConf = [...DEFAULT_LAST_MILE_IMEI_CONFIG];
    else if (activeReport === 'miller-to-godown') defaultConf = [...DEFAULT_MG_CONFIG];
    else if (activeReport === 'lifting-report') defaultConf = [...DEFAULT_LIFTING_CONFIG];
    else if (activeReport === 'multi-trip-analysis') defaultConf = [...DEFAULT_MULTI_TRIP_CONFIG];
    else if (activeReport === 'eta-route') defaultConf = [...DEFAULT_ETA_ROUTE_CONFIG];
    else if (activeReport === 'vehicle-assigned') defaultConf = [...DEFAULT_VEHICLE_ASSIGNED_CONFIG];
    else if (activeReport === 'weighbridge-report') defaultConf = [...DEFAULT_WEIGHBRIDGE_CONFIG];
    
    // Inject custom dynamic columns from localStorage configuration
    try {
      const savedConfigAttrs = localStorage.getItem('customReportAttributes_v3');
      if (savedConfigAttrs) {
         const parsedConfigAttrs = JSON.parse(savedConfigAttrs);
         if (parsedConfigAttrs[activeReport]) {
             const customKeys = Object.keys(parsedConfigAttrs[activeReport]);
             const standardKeys = DEFAULT_REPORT_ATTRIBUTES[activeReport] ? Object.keys(DEFAULT_REPORT_ATTRIBUTES[activeReport]) : [];
             customKeys.forEach(key => {
                 if (!standardKeys.includes(key)) {
                     // This is a completely new custom column!
                     // Check if it's already in defaultConf to avoid duplicates just in case
                     if (!defaultConf.find(c => c.id === key)) {
                         defaultConf.push({ id: key, label: key, visible: true, isCustom: true });
                     }
                 }
             });
         }
      }
    } catch(e) {
      console.error('Error injecting dynamic custom columns', e);
    }
    
    if (savedConfig && activeReport !== 'history') {
      const parsedConfig = JSON.parse(savedConfig);
      const finalConfig = [...parsedConfig];
      let modified = false;
      defaultConf.forEach(dc => {
         if (!finalConfig.find(c => c.id === dc.id)) {
            finalConfig.push(dc); // Add at the end instead of reverse-prepending
            modified = true;
         }
      });
      const cleanConfig = finalConfig.filter(c => defaultConf.find(dc => dc.id === c.id));
      if (cleanConfig.length !== finalConfig.length) modified = true;
      
      setColumnConfig(cleanConfig);
      if (modified) {
         localStorage.setItem(storageKey, JSON.stringify(cleanConfig));
      }
    } else {
      setColumnConfig([...defaultConf]);
    }
  }, [activeReport]);

  const saveConfig = (newConfig) => {
    setColumnConfig(newConfig);
    const storageKey = `reportConfig_${activeReport}_v3`;
    localStorage.setItem(storageKey, JSON.stringify(newConfig));
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
    newConfig[index] = { ...newConfig[index], visible: !newConfig[index].visible };
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
    setProgress({ percent: 0, message: 'Reading File...' });
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      showToast('Raw Data Uploaded Successfully', 'success', 3000);
      
      setProgress({ percent: 10, message: 'Parsing Data...' });
      const arrayBuffer = evt.target.result;
      
      const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
      
      worker.onmessage = (e) => {
        if (e.data.type === 'progress') {
            setProgress({ percent: e.data.percent, message: e.data.message });
            return;
        }
        
        setIsLoading(false);
        setProgress({ percent: 100, message: 'Complete' });
        if (e.data.type === 'error' || e.data.error) {
          showToast(e.data.message || 'Error Processing File', 'error', 5000);
          if (fileInputRef.current) fileInputRef.current.value = '';
          setReportData(prev => ({ ...prev, [activeReport]: [] }));
        } else if (e.data.type === 'success' || !e.data.error) {
          if (e.data.data.length === 0) {
            showToast('No valid data found for this report type. Please check your Excel file.', 'error', 5000);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setReportData(prev => ({ ...prev, [activeReport]: [] }));
          } else {
            setReportData(prev => ({ ...prev, [activeReport]: e.data.data }));
            showToast('Data Uploaded Successfully!', 'success', 3000);
          }
        }
        worker.terminate();
      };

      worker.onerror = (err) => {
        setIsLoading(false);
        showToast('File format not supported or file is too large.', 'error', 5000);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setReportData(prev => ({ ...prev, [activeReport]: [] }));
        worker.terminate();
      };

      // Parse custom attributes to pass to worker
      let customAttrs = DEFAULT_REPORT_ATTRIBUTES;
      try {
        const saved = localStorage.getItem('customReportAttributes_v3');
        if (saved) {
           customAttrs = JSON.parse(saved);
        }
      } catch(e) {}

      worker.postMessage({ data: arrayBuffer, activeReport, etaApiKey, etaVehicleType, weighbridgeVendors, customAttributes: customAttrs });
    };
    reader.readAsArrayBuffer(file);
  };

  const handleProcessLiftingFiles = () => {
    if (!mainLiftingFile) return;
    setIsLoading(true);
    setProgress({ percent: 0, message: 'Reading Files...' });
    
    setDcMonthFilter(null);
    setDcDateFilter(null);
    setEpodStatusFilter(null);
    setTpDateFilter(null);
    setFilterStatus('All');
    
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
      showToast('Raw Data Uploaded Successfully', 'success', 3000);
      
      setProgress({ percent: 10, message: 'Parsing Data...' });
      const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
      
      worker.onmessage = (e) => {
        if (e.data.type === 'progress') {
            setProgress({ percent: e.data.percent, message: e.data.message });
            return;
        }
        
        setIsLoading(false);
        setProgress({ percent: 100, message: 'Complete' });
        if (e.data.type === 'error' || e.data.error) {
          showToast(e.data.message || 'Error Processing Files', 'error', 5000);
          setReportData(prev => ({ ...prev, [activeReport]: [] }));
        } else if (e.data.type === 'success' || !e.data.error) {
          if (e.data.data.length === 0) {
            showToast('No valid data found for this report type. Please check your Excel file.', 'error', 5000);
            setReportData(prev => ({ ...prev, [activeReport]: [] }));
          } else {
            setReportData(prev => ({ ...prev, [activeReport]: e.data.data }));
            showToast('Data Uploaded Successfully!', 'success', 3000);
          }
        }
        worker.terminate();
      };
      worker.onerror = (err) => {
        setIsLoading(false);
        showToast('File format not supported or file is too large.', 'error', 5000);
        setReportData(prev => ({ ...prev, [activeReport]: [] }));
        worker.terminate();
      };

      // Parse custom attributes to pass to worker
      let customAttrs = DEFAULT_REPORT_ATTRIBUTES;
      try {
        const saved = localStorage.getItem('customReportAttributes_v3');
        if (saved) {
           customAttrs = JSON.parse(saved);
        }
      } catch(e) {}

      worker.postMessage({ data: mainBuffer, trackingData: trackBuffer, activeReport, customAttributes: customAttrs });
    }).catch(err => {
      setIsLoading(false);
      showToast('Failed to read uploaded files.', 'error', 5000);
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
      showToast('Report saved to History successfully!', 'success', 3000);
    } catch (e) {
      showToast('Error saving to history: ' + e.message, 'error', 5000);
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
    
    ALL_DISTRICTS.forEach(d => { pivot[d] = {}; });
    
    data.forEach(row => {
      if(row.isGrandTotal || row.isSubtotal) return;
      const district = row.district;
      const date = row.tpDate;
      if(!district || !date) return;
      
      datesSet.add(date);
      if(!pivot[district]) pivot[district] = {};
      pivot[district][date] = (pivot[district][date] || 0) + 1;
    });
    
    let dates = [];
    if (vaStartDate && vaEndDate) {
       let current = new Date(vaStartDate);
       const end = new Date(vaEndDate);
       while (current <= end) {
          dates.push(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
       }
    } else {
      const sortedDates = Array.from(datesSet).sort();
      if (sortedDates.length > 0) {
        let current = new Date(sortedDates[0]);
        const end = new Date(sortedDates[sortedDates.length - 1]);
        while (current <= end) {
           dates.push(current.toISOString().split('T')[0]);
           current.setDate(current.getDate() + 1);
        }
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
  const { uniqueDcMonths, uniqueDcDates, uniqueEpodStatuses, uniqueTpDates, uniqueRemarks, uniqueWbIds, uniqueImeiStatuses } = useMemo(() => {
    if (rawData.length === 0) {
        return { uniqueDcMonths: [], uniqueDcDates: [], uniqueEpodStatuses: [], uniqueTpDates: [], uniqueRemarks: [], uniqueWbIds: [], uniqueImeiStatuses: [] };
    }
    const months = new Set();
    const dates = new Set();
    const epodStatuses = new Set();
    const tpDates = new Set();
    const remarks = new Set();
    const wbIds = new Set();
    const imeiStatuses = new Set();
    rawData.forEach(r => {
      if (r.dcMonth) months.add(r.dcMonth);
      if (r.dcCreationDate) dates.add(r.dcCreationDate);
      if (r.epodStatusRaw) epodStatuses.add(r.epodStatusRaw);
      if (r.tpDate) tpDates.add(r.tpDate);
      if (r.remarks && r.isSubtotal) remarks.add(r.remarks);
      if (r.weighbridgeId) wbIds.add(r.weighbridgeId);
      if (r.imeiStatus) imeiStatuses.add(r.imeiStatus);
    });
    return {
      uniqueDcMonths: Array.from(months).sort(),
      uniqueDcDates: Array.from(dates).sort(),
      uniqueEpodStatuses: Array.from(epodStatuses).sort(),
      uniqueTpDates: Array.from(tpDates).sort(),
      uniqueRemarks: Array.from(remarks).sort(),
      uniqueWbIds: Array.from(wbIds).sort(),
      uniqueImeiStatuses: Array.from(imeiStatuses).sort()
    };
  }, [rawData, activeReport]);

  // Filter and Group data dynamically
  const displayData = useMemo(() => {
    if (rawData.length === 0) return [];
    
    let filtered = rawData;
    
    if (globalSearchTerm) {
      const lowerSearch = globalSearchTerm.toLowerCase();
      filtered = filtered.filter(row => 
         Object.values(row).some(val => 
            String(val).toLowerCase().includes(lowerSearch)
         )
      );
    }
    
    if (activeReport === 'weighbridge-report') {
       if (tpDateFilter !== null) {
          filtered = filtered.filter(row => tpDateFilter.includes(row.tpDate));
       }
       if (wbIdFilter !== null) {
          filtered = filtered.filter(row => wbIdFilter.includes(row.weighbridgeId));
       }
       
       const pivot = {};
       filtered.forEach(row => {
          const dist = row.district || 'Unknown';
          const godown = row.destGodown || 'Unknown';
          const vendor = row.weighbridgeVendor || 'Unknown';
          
          if (!pivot[dist]) pivot[dist] = {};
          if (!pivot[dist][godown]) pivot[dist][godown] = {};
          if (!pivot[dist][godown][vendor]) {
             pivot[dist][godown][vendor] = { epodStatus: 0, weighbridgeUsed: 0, _rawTrips: 0 };
          }
          
          pivot[dist][godown][vendor].epodStatus += (row.epodStatus || 0);
          pivot[dist][godown][vendor].weighbridgeUsed += (row.weighbridgeUsed || 0);
          pivot[dist][godown][vendor]._rawTrips += 1;
       });

       const rows = [];
       let grandTotalEpod = 0;
       let grandTotalUsed = 0;
       
       Object.keys(pivot).sort().forEach(dist => {
          let distTotalEpod = 0;
          let distTotalUsed = 0;
          
          Object.keys(pivot[dist]).sort().forEach(godown => {
             Object.keys(pivot[dist][godown]).sort().forEach(vendor => {
                const stats = pivot[dist][godown][vendor];
                distTotalEpod += stats.epodStatus;
                distTotalUsed += stats.weighbridgeUsed;
                grandTotalEpod += stats.epodStatus;
                grandTotalUsed += stats.weighbridgeUsed;
                
                rows.push({
                   district: dist,
                   destGodown: godown,
                   weighbridgeVendor: vendor,
                   epodStatus: stats.epodStatus,
                   weighbridgeUsed: stats.weighbridgeUsed,
                   _rawTrips: stats._rawTrips,
                   isSubtotal: false
                });
             });
          });
          
          rows.push({
             district: dist + ' Total',
             destGodown: '',
             weighbridgeVendor: '',
             epodStatus: distTotalEpod,
             weighbridgeUsed: distTotalUsed,
             isSubtotal: true,
             isGrandTotal: false
          });
       });
       
       if (rows.length > 0) {
          rows.push({
             district: 'Grand Total',
             destGodown: '',
             weighbridgeVendor: '',
             epodStatus: grandTotalEpod,
             weighbridgeUsed: grandTotalUsed,
             isSubtotal: true,
             isGrandTotal: true
          });
       }
       return rows;
    }

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

    if (activeReport === 'eta-route') {
       return filtered;
    }

    if (activeReport === 'last-mile-epod') {
       if (dcMonthFilter !== null) {
          filtered = filtered.filter(row => dcMonthFilter.includes(row.dcMonth));
       }
       if (dcDateFilter !== null) {
          filtered = filtered.filter(row => dcDateFilter.includes(row.dcCreationDate));
       }
       if (epodStatusFilter !== null) {
          filtered = filtered.filter(row => epodStatusFilter.includes(row.epodStatusRaw));
       }
    } else if (activeReport === 'last-mile-imei') {
       if (imeiStatusFilter !== null) {
          filtered = filtered.filter(row => imeiStatusFilter.includes(row.imeiStatus));
       }
       if (epodStatusFilter !== null) {
          filtered = filtered.filter(row => epodStatusFilter.includes(row.epodStatusRaw));
       }
       if (dcDateFilter !== null) {
          filtered = filtered.filter(row => dcDateFilter.includes(row.dcCreationDate));
       }
    } else if (activeReport === 'lifting-report' || activeReport === 'vehicle-assigned' || activeReport === 'first-mile-epod') {
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
    let gtTotalTrips = 0, gtMatched = 0, gtMismatched = 0, gtMissing = 0;
    
    const liftingNumerics = ['vehicleAssigned', 'dosTpCreated', 'manualTpCreated', 'tpsGenerated', 'liftedQty', 'tripsTracked', 'untracked', 'epodDriver', 'pendingEpodDriver', 'percentEpodDriver', 'epodManager', 'pendingEpodManager', 'percentEpodManager'];

    Object.keys(distGroups).sort().forEach(dist => {
      const distRows = distGroups[dist];
      
      // Pivot Table Style Grouping
      const pivotGroups = {};
      const numericColumns = ['trips', 'deliveryChallan', 'epodComplete', 'epodPending', 'epodPendingPercent', 'totalTrips', 'matched', 'mismatched', 'missing', ...liftingNumerics];
      const pivotKeys = visibleColumns.filter(c => !numericColumns.includes(c.id)).map(c => c.id);
      
      const distTotals = { trips: 0, deliveryChallan: 0, epodComplete: 0, epodPending: 0, totalTrips: 0, matched: 0, mismatched: 0, missing: 0 };
      
      if (activeReport === 'lifting-report' && distRows.length === 0) {
         const dummyRow = { district: dist };
         const getVal = (key) => dummyRow[key] || '';
         const groupKey = pivotKeys.map(key => getVal(key)).join('|||');
         
         pivotGroups[groupKey] = {
             district: dist,
             vehicleSet: new Set()
         };
         numericColumns.forEach(metric => pivotGroups[groupKey][metric] = 0);
      }
      
      distRows.forEach(row => {
        const getVal = (key) => key === 'refNo' ? (row._ref || row.refNo || '') : (row[key] || '');
        const groupKey = pivotKeys.map(key => getVal(key)).join('|||');
        
        if (!pivotGroups[groupKey]) {
          pivotGroups[groupKey] = {
             ...row,
             refNo: getVal('refNo'),
             vehicleSet: new Set(),
             _rawTrips: 0
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
        
        pivotGroups[groupKey]._rawTrips = (pivotGroups[groupKey]._rawTrips || 0) + 1;
      });

      // Explicitly apply user formulas for Pivot Groups
      Object.keys(pivotGroups).forEach(groupKey => {
        const group = pivotGroups[groupKey];
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
         distTotals.epodPending += group.epodPending || 0;
         distTotals.totalTrips += group.totalTrips || 0;
         distTotals.matched += group.matched || 0;
         distTotals.mismatched += group.mismatched || 0;
         distTotals.missing += group.missing || 0;
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
          epodPendingPercent: percent,
          totalTrips: distTotals.totalTrips,
          matched: distTotals.matched,
          mismatched: distTotals.mismatched,
          missing: distTotals.missing
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
    } else {
       groupedData.filter(r => r.isSubtotal && !r.isGrandTotal).forEach(r => {
          gtTrips += (r.trips || 0);
          gtChallan += (r.deliveryChallan || 0);
          gtComplete += (r.epodComplete || 0);
          gtTotalTrips += (r.totalTrips || 0);
          gtMatched += (r.matched || 0);
          gtMismatched += (r.mismatched || 0);
          gtMissing += (r.missing || 0);
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
        epodPendingPercent: gtPercent,
        totalTrips: gtTotalTrips,
        matched: gtMatched,
        mismatched: gtMismatched,
        missing: gtMissing
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
  }, [rawData, filterStatus, activeReport, dcMonthFilter, dcDateFilter, epodStatusFilter, visibleColumns, globalSearchTerm, tpDateFilter, wbIdFilter, remarksFilter, imeiStatusFilter]);

  // Reset pagination when data or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [displayData.length, itemsPerPage, activeReport]);

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
         ["", "Count of Reference Number", "Column Labels"],
         ["Sr. No.", "District", ...dates, "Grand Total"]
      ];
      
      Object.keys(pivot).filter(d => d !== 'Grand Total').sort().forEach((district, index) => {
         const row = [index + 1, district];
         let districtTotal = 0;
         dates.forEach(date => {
            const val = pivot[district][date] || 0;
            row.push(val === 0 ? 0 : val);
            districtTotal += val;
         });
         row.push(districtTotal);
         wsData.push(row);
      });
      
      const grandTotalRow = ["", "Grand Total"];
      let absoluteTotal = 0;
      dates.forEach(date => {
         const colTotal = pivot['Grand Total'][date] || 0;
         grandTotalRow.push(colTotal);
         absoluteTotal += colTotal;
      });
      grandTotalRow.push(absoluteTotal);
      wsData.push(grandTotalRow);

      const wsPivot = XLSX.utils.aoa_to_sheet(wsData);
      
      const pivotColWidths = [];
      wsData.forEach(row => {
         row.forEach((cell, i) => {
             const len = cell ? String(cell).length : 0;
             if (!pivotColWidths[i]) pivotColWidths[i] = { wch: 10 };
             if (len > pivotColWidths[i].wch) {
                 pivotColWidths[i].wch = Math.min(len + 2, 30);
             }
         });
      });
      wsPivot['!cols'] = pivotColWidths;

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
    
    const colWidths = [];
    visibleColumns.forEach((col, i) => {
       let maxLen = col.label.length;
       exportData.forEach(row => {
          const val = row[col.label];
          if (val) {
             const len = String(val).length;
             if (len > maxLen) maxLen = len;
          }
       });
       colWidths[i] = { wch: Math.min(maxLen + 2, 50) };
    });
    wsRaw['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, wsRaw, "Raw Data");

    const safeTitle = (reportTitle || activeReport || 'Report').replace(/[^a-z0-9]/gi, '_');
    XLSX.writeFile(wb, `GSCSCL_${safeTitle}.xlsx`);
  };

  const exportPDF = () => {
    if (displayData.length === 0) return;

    const orientation = (activeReport === 'lifting-report' || activeReport === 'vehicle-assigned' || activeReport === 'multi-trip-analysis' || activeReport === 'last-mile-imei') ? 'landscape' : 'portrait';
    const doc = new jsPDF({ orientation, format: 'a4' });
    
    const drawHeader = () => {
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("FarEye Technologies Pvt. Ltd.", pageWidth / 2, 18, { align: 'center' });

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      const titleWidth = doc.getTextWidth(reportTitle);
      const padding = 10;
      const boxHeight = 8;
      const boxX = (pageWidth - (titleWidth + padding)) / 2;
      const boxY = 21;
      
      doc.setFillColor(240, 240, 240);
      doc.rect(boxX, boxY, titleWidth + padding, boxHeight, 'F');

      doc.setTextColor(0, 0, 0);
      doc.text(reportTitle, pageWidth / 2, 27, { align: 'center' });
      
      doc.setLineWidth(0.5);
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 32, pageWidth - 14, 32);
    };

    drawHeader();

    let headConfig = [visibleColumns.map(col => col.label)];
    if (activeReport === 'weighbridge-report') {
       headConfig = [
          [
             { content: 'District', styles: { halign: 'center', fillColor: [180, 198, 231], textColor: [0,0,0], fontStyle: 'bold' } },
             { content: 'Destination Godown', styles: { halign: 'center', fillColor: [180, 198, 231], textColor: [0,0,0], fontStyle: 'bold' } },
             { content: 'Weighbridge Vendor', styles: { halign: 'center', fillColor: [180, 198, 231], textColor: [0,0,0], fontStyle: 'bold' } },
             { content: 'Total EPOD', styles: { halign: 'center', fillColor: [180, 198, 231], textColor: [0,0,0], fontStyle: 'bold' } },
             { content: 'Total Weighbridge Used', styles: { halign: 'center', fillColor: [180, 198, 231], textColor: [0,0,0], fontStyle: 'bold' } }
          ]
       ];
    }
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
        visibleColumns.map(col => col.label),
        unitsRow,
        lettersRow
      ];
    }

    const tableRows = [];
    const maxLifted = activeReport === 'lifting-report' ? Math.max(...displayData.filter(r => !r.isSubtotal).map(r => r.liftedQty || 0), 1) : 1;

    displayData.forEach(row => {
      if (row.isSubtotal) {
        let fillColor = row.isGrandTotal ? [252, 213, 180] : [217, 217, 217];
          if (activeReport === 'weighbridge-report' && row.isGrandTotal) {
             fillColor = [180, 198, 231]; // Light blue for grand total in weighbridge
          }
        const fontSize = row.isGrandTotal ? 11 : 9;
        
        const subtotalCols = ['trips', 'deliveryChallan', 'epodComplete', 'epodPending', 'epodPendingPercent', 'vehicleAssigned', 'dosTpCreated', 'manualTpCreated', 'tpsGenerated', 'liftedQty', 'tripsTracked', 'untracked', 'epodDriver', 'pendingEpodDriver', 'percentEpodDriver', 'epodManager', 'pendingEpodManager', 'percentEpodManager', 'tripCount', 'netWeight', 'remarks', 'epodStatus', 'weighbridgeUsed', 'totalTrips', 'matched', 'mismatched', 'missing'];
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
    const numericColsList = ['trips', 'deliveryChallan', 'epodComplete', 'epodPending', 'epodPendingPercent', 'vehicleAssigned', 'dosTpCreated', 'manualTpCreated', 'tpsGenerated', 'liftedQty', 'tripsTracked', 'untracked', 'epodDriver', 'pendingEpodDriver', 'percentEpodDriver', 'epodManager', 'pendingEpodManager', 'percentEpodManager', 'epodStatus', 'weighbridgeUsed', 'hrs', 'tripCount', 'netWeight'];
    visibleColumns.forEach((c, index) => {
      if (numericColsList.includes(c.id)) {
         columnStyles[index] = { halign: 'center' };
      }
    });

    if (activeReport !== 'vehicle-assigned') {
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
    }

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
         colSpan: dates.length + 3,
         styles: { halign: 'center', fillColor: [218, 238, 243], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 11 }
      }];
      
      const pivotHeaders = ["Sr. No.", "District", ...dates, "Grand Total"];
      const pivotBody = Object.keys(pivot).filter(d => d !== 'Grand Total').sort().map((district, index) => {
         const row = [index + 1, district];
         let districtTotal = 0;
         dates.forEach(date => {
            const val = pivot[district][date] || 0;
            row.push(val === 0 ? 0 : val);
            districtTotal += val;
         });
         row.push(districtTotal);
         return row;
      });
      
      const grandTotalRow = ["", "Grand Total"];
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

  const totalPages = Math.max(1, Math.ceil(displayData.length / itemsPerPage));
  const paginatedData = displayData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
          <div className="logo-container" onClick={() => handleMenuClick('welcome')} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'center', width: '100%' }}>
            <img src="/gscscl-logo.png" alt="GSCSCL Logo" style={{ height: '45px', objectFit: 'contain' }} />
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
                <div 
                  className={`nav-item ${activeReport === 'weighbridge-report' ? 'active' : ''}`}
                  onClick={() => handleMenuClick('weighbridge-report')}
                >
                  <FileText className="nav-icon" size={16} />
                  <span>Weighbridge Report</span>
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
                <div 
                  className={`nav-item ${activeReport === 'last-mile-imei' ? 'active' : ''}`}
                  onClick={() => handleMenuClick('last-mile-imei')}
                >
                  <FileText className="nav-icon" size={16} />
                  <span>Last Mile IMEI Report</span>
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

          {/* Section: Master Data */}
          <div className="nav-section" style={{ marginTop: '12px' }}>
            <div 
              className="nav-section-header" 
              onClick={() => setTemplatesMenuOpen(!templatesMenuOpen)}
            >
              <span className="nav-section-title">Master Data</span>
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
                <div 
                  className={`nav-item ${activeReport === 'weighbridge-vendors' ? 'active' : ''}`}
                  onClick={() => handleMenuClick('weighbridge-vendors')}
                >
                  <Settings className="nav-icon" size={16} />
                  <span>Weighbridge Vendors</span>
                </div>
                <div 
                  className={`nav-item ${activeReport === 'customize-report' ? 'active' : ''}`}
                  onClick={() => handleMenuClick('customize-report')}
                >
                  <Settings className="nav-icon" size={16} />
                  <span>Customize Report</span>
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
            <span className="logo-text" onClick={() => handleMenuClick('welcome')} style={{ fontSize: '1.2rem', cursor: 'pointer' }}>GSCSCL Report</span>
          </div>
        )}
        
        {/* Render content based on active report */}
        {activeReport === 'welcome' && (
          <div className="welcome-container" style={{ padding: '60px 20px', maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
             <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'var(--bg-panel)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
                <img src="/gscscl-logo.png" alt="GSCSCL Logo" style={{ height: '80px', objectFit: 'contain' }} />
             </div>
             <h1 style={{ fontSize: '2.5rem', color: 'var(--text-main)', marginBottom: '16px', fontWeight: '700' }}>Welcome to GSCSCL Report Dashboard</h1>
             <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', marginBottom: '48px', maxWidth: '700px', margin: '0 auto 48px auto', lineHeight: '1.6' }}>
                Please select a report module from the sidebar to begin analyzing your data. Customize dynamic reporting columns in the Master Data section.
             </p>
          </div>
        )}

          {activeReport === 'customize-report' && <CustomizeReport />}

        {/* Render content based on active report */}
        {(activeReport === 'godown-to-miller' || activeReport === 'miller-to-godown' || activeReport === 'first-mile-epod' || activeReport === 'last-mile-epod' || activeReport === 'last-mile-imei' || activeReport === 'lifting-report' || activeReport === 'multi-trip-analysis' || activeReport === 'eta-route' || activeReport === 'vehicle-assigned' || activeReport === 'weighbridge-report') && (
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
                  <button className="btn-secondary" onClick={handleClearData} title="Clear Data for this report" style={{ color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.3)', fontWeight: '600' }}>
                    <Trash2 size={18} />
                    Clear Data
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
              <div style={{ textAlign: 'center', marginTop: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ 
                    fontWeight: '600', 
                    marginBottom: '1rem', 
                    color: 'var(--accent-primary)',
                    fontSize: '1.1rem',
                    letterSpacing: '0.5px'
                }}>
                    {progress.message || 'Processing Data...'}
                </div>
                
                <div style={{ 
                    width: '100%', 
                    maxWidth: '350px', 
                    height: '8px', 
                    background: 'rgba(255, 90, 31, 0.1)', 
                    borderRadius: '10px', 
                    overflow: 'hidden', 
                    marginBottom: '1rem',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
                    position: 'relative'
                }}>
                  <div style={{ 
                      width: `${progress.percent}%`, 
                      height: '100%', 
                      background: 'linear-gradient(90deg, var(--accent-primary), #ff8a5c)', 
                      borderRadius: '10px',
                      transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 0 10px rgba(255, 90, 31, 0.4)',
                      position: 'relative',
                      overflow: 'hidden'
                  }}>
                      <div className="progress-shimmer" style={{
                          position: 'absolute',
                          top: 0, left: 0, right: 0, bottom: 0,
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                          transform: 'translateX(-100%)',
                          animation: 'shimmer 1.5s infinite'
                      }}></div>
                  </div>
                </div>
                
                <div style={{ 
                    fontSize: '0.95rem', 
                    color: 'var(--text-muted)',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 2s linear infinite' }}>
                        <line x1="12" y1="2" x2="12" y2="6"></line>
                        <line x1="12" y1="18" x2="12" y2="22"></line>
                        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                        <line x1="2" y1="12" x2="6" y2="12"></line>
                        <line x1="18" y1="12" x2="22" y2="12"></line>
                        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                    </svg>
                    {progress.percent}% Completed
                </div>
              </div>
            )}

            {!isLoading && rawData.length === 0 && activeReport !== 'lifting-report' && activeReport !== 'eta-route' && (
              <div 
                className={`upload-area ${isDragging ? 'active' : ''} glass-panel`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, { customConfig: activeReport })}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={(e) => handleFileUpload(e, { customConfig: activeReport })} 
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
                  onDrop={(e) => etaApiKey && handleDrop(e, { customConfig: activeReport })}
                  onClick={() => etaApiKey && fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={(e) => handleFileUpload(e, { customConfig: activeReport })} 
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
                    
                    {/* Global Search Bar */}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Search size={16} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
                      <input 
                        type="text" 
                        placeholder="Search records..." 
                        value={globalSearchTerm}
                        onChange={(e) => setGlobalSearchTerm(e.target.value)}
                        style={{ 
                          padding: '8px 12px 8px 34px', 
                          borderRadius: '6px', 
                          border: '1px solid var(--border-color)', 
                          outline: 'none',
                          background: 'var(--bg-panel)',
                          color: 'var(--text-main)',
                          fontSize: '0.9rem',
                          width: isMobile ? '100%' : '200px',
                          transition: 'border-color 0.2s, box-shadow 0.2s'
                        }} 
                        onFocus={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                      />
                    </div>

                    <Filter size={18} style={{ color: 'var(--text-muted)' }} />
                    
                    {(activeReport === 'lifting-report' || activeReport === 'vehicle-assigned' || activeReport === 'first-mile-epod') ? (
                       <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <MultiSelectDropdown 
                          placeholder="TP Date" 
                          options={uniqueTpDates} 
                          selected={tpDateFilter} 
                          onChange={setTpDateFilter} 
                        />
                        {activeReport === 'vehicle-assigned' && (
                           <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <input type="date" value={vaStartDate} onChange={e => setVaStartDate(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-main)' }} title="Start Date" />
                              <span style={{ color: 'var(--text-muted)' }}>to</span>
                              <input type="date" value={vaEndDate} onChange={e => setVaEndDate(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-main)' }} title="End Date" />
                           </div>
                        )}
                       </div>
                    ) : activeReport === 'weighbridge-report' ? (
                       <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <MultiSelectDropdown 
                          placeholder="TP Date" 
                          options={uniqueTpDates} 
                          selected={tpDateFilter} 
                          onChange={setTpDateFilter} 
                        />
                        <MultiSelectDropdown 
                          placeholder="Weighbridge ID" 
                          options={uniqueWbIds || []} 
                          selected={wbIdFilter} 
                          onChange={setWbIdFilter} 
                        />
                       </div>
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
                    ) : activeReport === 'last-mile-imei' ? (
                      <>
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
                        <MultiSelectDropdown 
                            placeholder="IMEI Status" 
                            options={uniqueImeiStatuses} 
                            selected={imeiStatusFilter} 
                            onChange={setImeiStatusFilter} 
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

                {activeReport === 'last-mile-imei' && displayData.length > 0 && (
                  (() => {
                    const totalTrips = displayData.filter(d => !d.isSubtotal).reduce((sum, row) => sum + (Number(row.totalTrips) || 0), 0);
                    const matched = displayData.filter(d => !d.isSubtotal).reduce((sum, row) => sum + (Number(row.matched) || 0), 0);
                    const mismatched = displayData.filter(d => !d.isSubtotal).reduce((sum, row) => sum + (Number(row.mismatched) || 0), 0);
                    const missing = displayData.filter(d => !d.isSubtotal).reduce((sum, row) => sum + (Number(row.missing) || 0), 0);
                    const rate = totalTrips > 0 ? ((matched / totalTrips) * 100).toFixed(1) : '0.0';
                    return (
                      <div className="dashboard-grid">
                        <div className="kpi-card total">
                          <div className="kpi-title">Total Trips Analyzed</div>
                          <div className="kpi-value">{totalTrips}</div>
                        </div>
                        <div className="kpi-card matched">
                          <div className="kpi-title">IMEI Matched</div>
                          <div className="kpi-value">{matched}</div>
                        </div>
                        <div className="kpi-card mismatched">
                          <div className="kpi-title">IMEI Mismatched</div>
                          <div className="kpi-value">{mismatched}</div>
                        </div>
                        <div className="kpi-card missing">
                          <div className="kpi-title">Missing IMEI</div>
                          <div className="kpi-value">{missing}</div>
                        </div>
                        <div className="kpi-card rate">
                          <div className="kpi-title">Match Rate</div>
                          <div className="kpi-value">{rate}%</div>
                        </div>
                      </div>
                    );
                  })()
                )}

                {displayData.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                    <AlertCircle size={48} style={{ opacity: 0.3, margin: '0 auto 16px' }} />
                    <p style={{ fontSize: '1.1rem' }}>No trips found for the selected filter.</p>
                  </div>
                ) : activeReport === 'vehicle-assigned' ? (
                  <div className="table-container" style={{ marginTop: 0 }}>
                    <table>
                      <thead>
                        <tr>
                          <th style={{ padding: '10px' }}></th>
                          <th style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>Count of Reference Number</th>
                          <th colSpan={(() => { const { dates } = calculateVehicleAssignedPivot(displayData); return Math.max(1, dates.length); })()} style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>Column Labels</th>
                          <th></th>
                        </tr>
                        <tr style={{ background: 'var(--bg-panel-hover)', borderBottom: '2px solid var(--border-color)' }}>
                          <th style={{ padding: '10px', textAlign: 'center' }}>Sr. No.</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>District</th>
                          {(() => {
                             const { dates } = calculateVehicleAssignedPivot(displayData);
                             return dates.map(d => <th key={d} style={{ padding: '10px', textAlign: 'right' }}>{d}</th>);
                          })()}
                          <th style={{ padding: '10px', textAlign: 'right' }}>Grand Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                           const { dates, pivot } = calculateVehicleAssignedPivot(displayData);
                           const rows = [];
                           Object.keys(pivot).filter(d => d !== 'Grand Total').sort().forEach((district, index) => {
                              let districtTotal = 0;
                              const rowCells = dates.map(date => {
                                 const val = pivot[district][date] || 0;
                                 districtTotal += val;
                                 return <td key={date} style={{ padding: '10px', textAlign: 'right' }}>{val === 0 ? 0 : val}</td>;
                              });
                              rows.push(
                                <tr key={district} className="table-row-hover">
                                  <td style={{ padding: '10px', textAlign: 'center' }}>{index + 1}</td>
                                  <td style={{ padding: '10px', textAlign: 'left', fontWeight: '500' }}>{district}</td>
                                  {rowCells}
                                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>{districtTotal}</td>
                                </tr>
                              );
                           });
                           
                           let absoluteTotal = 0;
                           const gtCells = dates.map(date => {
                              const colTotal = pivot['Grand Total'][date] || 0;
                              absoluteTotal += colTotal;
                              return <td key={'gt-'+date} style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>{colTotal === 0 ? 0 : colTotal}</td>;
                           });
                           rows.push(
                              <tr key="grand-total" className="subtotal-row grand-total-row">
                                <td colSpan={2} style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>Grand Total</td>
                                {gtCells}
                                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>{absoluteTotal}</td>
                              </tr>
                           );
                           return rows;
                        })()}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <>
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
                          {paginatedData.map((row, index) => {
                            if (row.isSubtotal) {
                              lastDist = null;
                              lastSource = null;
                              const subtotalCols = ['trips', 'deliveryChallan', 'epodComplete', 'epodPending', 'epodPendingPercent', 'vehicleAssigned', 'dosTpCreated', 'manualTpCreated', 'tpsGenerated', 'liftedQty', 'tripsTracked', 'untracked', 'epodDriver', 'pendingEpodDriver', 'percentEpodDriver', 'epodManager', 'pendingEpodManager', 'percentEpodManager', 'tripCount', 'netWeight', 'remarks', 'epodStatus', 'weighbridgeUsed', 'totalTrips', 'matched', 'mismatched', 'missing'];
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
                                      return <td key={col.id} style={{ fontSize: sizeStyle, textAlign: 'center' }}>{val === 0 ? 0 : val}</td>;
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
                                    case 'totalTrips':
                                    case 'matched':
                                    case 'mismatched':
                                    case 'missing': 
                                      content = <div style={{ textAlign: 'center' }}>{row[col.id] === 0 ? 0 : row[col.id]}</div>; 
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
                                            content = <div style={{ textAlign: 'center' }}>{val === 0 ? 0 : val}</div>;
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

                    {/* Pagination Controls */}
                    {displayData.length > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '12px 16px', background: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                               Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, displayData.length)} of {displayData.length} rows ({displayData.filter(d => !d.isSubtotal).reduce((sum, d) => sum + (d._rawTrips || 1), 0)} actual trips)
                            </span>
                            <select 
                               value={itemsPerPage} 
                               onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                               style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }}
                            >
                               <option value={50}>50 per page</option>
                               <option value={100}>100 per page</option>
                               <option value={500}>500 per page</option>
                               <option value={1000}>1000 per page</option>
                            </select>
                         </div>
                         
                         <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button 
                               className="btn-secondary" 
                               disabled={currentPage === 1}
                               onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                               style={{ padding: '6px 12px', opacity: currentPage === 1 ? 0.5 : 1 }}
                            >
                               Previous
                            </button>
                            
                            <span style={{ margin: '0 8px', color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: '500' }}>
                               Page {currentPage} of {totalPages}
                            </span>
                            
                            <button 
                               className="btn-secondary" 
                               disabled={currentPage === totalPages}
                               onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                               style={{ padding: '6px 12px', opacity: currentPage === totalPages ? 0.5 : 1 }}
                            >
                               Next
                            </button>
                         </div>
                      </div>
                    )}
                  </>
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
                <button className="btn-secondary" onClick={() => {
                    let defaultConf = DEFAULT_GM_CONFIG;
                    if (activeReport === 'first-mile-epod') defaultConf = DEFAULT_EPOD_CONFIG;
                    else if (activeReport === 'last-mile-epod') defaultConf = DEFAULT_LAST_MILE_EPOD_CONFIG;
                    else if (activeReport === 'miller-to-godown') defaultConf = DEFAULT_MG_CONFIG;
                    else if (activeReport === 'lifting-report') defaultConf = DEFAULT_LIFTING_CONFIG;
                    else if (activeReport === 'multi-trip-analysis') defaultConf = DEFAULT_MULTI_TRIP_CONFIG;
                    else if (activeReport === 'eta-route') defaultConf = DEFAULT_ETA_ROUTE_CONFIG;
                    else if (activeReport === 'vehicle-assigned') defaultConf = DEFAULT_VEHICLE_ASSIGNED_CONFIG;
    else if (activeReport === 'weighbridge-report') defaultConf = DEFAULT_WEIGHBRIDGE_CONFIG;
                    saveConfig(defaultConf.map(c => ({...c})));
                  }}>Reset</button>
                <button className="btn-primary" onClick={() => setShowConfigModal(false)}>Done</button>
              </div>
            </div>
          </div>
        )}

        {activeReport === 'sms-template' && (
          <SmsTemplate />
        )}

        {activeReport === 'weighbridge-vendors' && (
          <WeighbridgeVendors vendors={weighbridgeVendors} setVendors={handleSaveVendors} />
        )}

      </div>
      
      {toastConfig.isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: toastConfig.type === 'error' ? '#ef4444' : '#10b981',
          color: '#fff',
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 9999,
          animation: 'butterflyIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}>
          {toastConfig.type === 'error' ? <AlertCircle size={24} /> : <CheckCircle size={24} />}
          <span style={{ fontWeight: '600', fontSize: '1.05rem', letterSpacing: '0.3px' }}>{toastConfig.message}</span>
          <style>{`@keyframes butterflyIn { 0% { transform: translateY(100px) scale(0.8) rotate(5deg); opacity: 0; } 100% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; } }`}</style>
        </div>
      )}
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught an error", error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', color: 'red', fontFamily: 'sans-serif' }}>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap', background: '#f8f8f8', padding: '20px', borderRadius: '8px' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.info && this.state.info.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
