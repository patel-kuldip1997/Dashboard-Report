import React, { useState, useMemo, useEffect } from 'react';
import { 
  Camera, 
  Search, 
  Filter, 
  CheckSquare, 
  Square, 
  FileDown, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  X, 
  Layers, 
  ZoomIn, 
  RefreshCw, 
  Image as ImageIcon, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Truck, 
  MapPin, 
  Building2, 
  Calendar, 
  Hash, 
  Copy, 
  ExternalLink, 
  LayoutGrid, 
  List, 
  Maximize2, 
  Check, 
  RotateCcw 
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Helper to clean and validate URL string
const cleanImageUrl = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  let str = raw.trim();
  const match = str.match(/HYPERLINK\s*\(\s*["']([^"']+)["']/i);
  if (match) str = match[1].trim();
  str = str.replace(/^["']|["']$/g, '').trim();
  const lower = str.toLowerCase();
  if (!str || lower === 'n/a' || lower === 'na' || lower === 'null' || lower === 'undefined' || lower === '-' || lower === '#n/a' || lower === 'none') {
    return '';
  }
  if (!str.startsWith('http://') && !str.startsWith('https://') && !str.startsWith('data:image') && !str.startsWith('blob:')) {
    return '';
  }
  return str;
};

// Helper to convert blob to Base64 for PDF generation
const blobToBase64 = (blob) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
};

// Multi-strategy image loader to guarantee image loading in PDF without CORS issues
const getBase64ImageFromUrl = async (imageUrl) => {
  const cleanUrl = cleanImageUrl(imageUrl);
  if (!cleanUrl || cleanUrl.length < 10) return null;

  // Strategy 1: Local Vite image proxy
  try {
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(cleanUrl)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const blob = await res.blob();
      if (blob && blob.size > 100) {
        const base64 = await blobToBase64(blob);
        if (base64) return base64;
      }
    }
  } catch (e) {
    // Continue
  }

  // Strategy 2: Direct Fetch with CORS
  try {
    const res = await fetch(cleanUrl, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      if (blob && blob.size > 100) {
        const base64 = await blobToBase64(blob);
        if (base64) return base64;
      }
    }
  } catch (e) {
    // Continue
  }

  // Strategy 3: HTML Image + Canvas with crossOrigin
  try {
    const canvasResult = await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 600;
          canvas.height = img.naturalHeight || img.height || 600;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } catch (err) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = cleanUrl;
    });
    if (canvasResult) return canvasResult;
  } catch (e) {
    // Continue
  }

  // Strategy 4: High-speed weserv.nl public image CDN (adds CORS headers & converts to clean JPEG)
  try {
    const noProtocolUrl = cleanUrl.replace(/^https?:\/\//, '');
    const weservUrl = `https://images.weserv.nl/?url=${encodeURIComponent(noProtocolUrl)}&output=jpg&q=85`;
    const res = await fetch(weservUrl);
    if (res.ok) {
      const blob = await res.blob();
      if (blob && blob.size > 100) {
        const base64 = await blobToBase64(blob);
        if (base64) return base64;
      }
    }
  } catch (e) {
    // Continue
  }

  // Strategy 5: corsproxy.io fallback
  try {
    const corsProxyUrl = `https://corsproxy.io/?${encodeURIComponent(cleanUrl)}`;
    const res = await fetch(corsProxyUrl);
    if (res.ok) {
      const blob = await res.blob();
      if (blob && blob.size > 100) {
        const base64 = await blobToBase64(blob);
        if (base64) return base64;
      }
    }
  } catch (e) {
    // Continue
  }

  return null;
};

export default function EpodPhotoAnalysisDashboard({ data, rawData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('All');
  const [godownFilter, setGodownFilter] = useState('All');
  // Filters: All, Both Present, Missing Any, Missing Start, Missing EPOD, Selected Only
  const [statusFilter, setStatusFilter] = useState('All'); 
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  // Modal states
  const [previewTrip, setPreviewTrip] = useState(null); // Full trip comparison lightbox
  const [previewImage, setPreviewImage] = useState(null); // Single image view
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [showOrientationModal, setShowOrientationModal] = useState(false);
  const [pdfOrientation, setPdfOrientation] = useState('portrait'); // 'portrait' or 'landscape'

  // View Layout Modes
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [cardDensity, setCardDensity] = useState('standard'); // 'compact' | 'standard' | 'large'

  // Copy feedback toast
  const [copiedText, setCopiedText] = useState('');

  // Pagination states (Supports 2 Lakh+ rows smoothly)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(48); // 24, 48, 96, 200

  // 1. Normalize items with an IMMUTABLE _uid so selection IDs match 100% across all pages/views
  const items = useMemo(() => {
    const rawList = data || rawData || [];
    return rawList.map((item, idx) => {
      const vehicle = String(item.vehicle || item['Vehicle'] || item['Vehicle Number'] || item['Vehicle No'] || '').trim() || 'N/A';
      const refNo = String(item.refNo || item['Reference Number'] || item['DC Number'] || item['DC No'] || item['Ref No'] || item['Delivery Challan Number'] || '').trim() || 'N/A';
      const district = String(item.district || item['District'] || item['District Name'] || item['TP District'] || '').trim() || 'N/A';
      const godown = String(item.godown || item['Godown'] || item['Godown Name'] || item['GSCSCL Godown'] || item['Destination Godown'] || '').trim() || 'N/A';
      const tripDate = String(item.tripDate || item['Date of Trip'] || item['Trip Date'] || item['TP date'] || item['Created At'] || '').trim() || 'N/A';
      
      const startTripImage = cleanImageUrl(item.startTripImage || item['Start Trip Image'] || item['Start Trip Photo'] || item['Start Photo'] || item['start_trip_image'] || item['Start Image'] || '');
      const epodImage = cleanImageUrl(item.epodImage || item['EPOD Image'] || item['Delivered Photo'] || item['Delivered Image'] || item['End Trip Image'] || item['End Trip Image - EPOD'] || item['epod_image'] || item['EPOD Photo'] || '');
      
      const hasStart = Boolean(startTripImage && startTripImage.length > 10);
      const hasEpod = Boolean(epodImage && epodImage.length > 10);

      // Deterministic, immutable unique identifier
      const uid = item.id ? String(item.id) : `trip_${idx + 1}_${vehicle}_${refNo}`;

      return {
        ...item,
        _uid: uid,
        vehicle,
        refNo,
        district,
        godown,
        tripDate,
        startTripImage,
        epodImage,
        hasStart,
        hasEpod
      };
    });
  }, [data, rawData]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, districtFilter, godownFilter, statusFilter, pageSize]);

  // Unique filter options
  const uniqueDistricts = useMemo(() => {
    const set = new Set();
    const len = items.length;
    for (let i = 0; i < len; i++) {
      const d = items[i].district;
      if (d && d !== 'N/A') set.add(d);
    }
    return Array.from(set).sort();
  }, [items]);

  const uniqueGodowns = useMemo(() => {
    const set = new Set();
    const len = items.length;
    for (let i = 0; i < len; i++) {
      const g = items[i].godown;
      if (g && g !== 'N/A') set.add(g);
    }
    return Array.from(set).sort();
  }, [items]);

  // Overall Statistics (Single-pass computation)
  const stats = useMemo(() => {
    let total = items.length;
    let bothPresent = 0;
    let missingStart = 0;
    let missingEpod = 0;
    let missingAny = 0;

    for (let i = 0; i < total; i++) {
      const r = items[i];
      if (r.hasStart && r.hasEpod) bothPresent++;
      if (!r.hasStart) missingStart++;
      if (!r.hasEpod) missingEpod++;
      if (!r.hasStart || !r.hasEpod) missingAny++;
    }

    const verifiedPercent = total > 0 ? Math.round((bothPresent / total) * 100) : 0;
    return { total, bothPresent, missingStart, missingEpod, missingAny, verifiedPercent };
  }, [items]);

  // Filtered items (Optimized single-pass)
  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const hasSearch = term.length > 0;
    const hasDist = districtFilter !== 'All';
    const hasGodown = godownFilter !== 'All';
    const hasStatus = statusFilter !== 'All';

    // Fast path if no filter applied
    if (!hasSearch && !hasDist && !hasGodown && !hasStatus) {
      return items;
    }

    return items.filter((item) => {
      // Search
      if (hasSearch) {
        const matchVehicle = item.vehicle.toLowerCase().includes(term);
        const matchDistrict = item.district.toLowerCase().includes(term);
        const matchGodown = item.godown.toLowerCase().includes(term);
        const matchRefNo = item.refNo.toLowerCase().includes(term);
        const matchDate = item.tripDate.toLowerCase().includes(term);
        if (!matchVehicle && !matchDistrict && !matchGodown && !matchRefNo && !matchDate) return false;
      }

      // District
      if (hasDist && item.district !== districtFilter) return false;

      // Godown
      if (hasGodown && item.godown !== godownFilter) return false;

      // Status
      if (statusFilter === 'Both Present' && (!item.hasStart || !item.hasEpod)) return false;
      if (statusFilter === 'Missing Any' && (item.hasStart && item.hasEpod)) return false;
      if (statusFilter === 'Missing Start' && item.hasStart) return false;
      if (statusFilter === 'Missing EPOD' && item.hasEpod) return false;
      if (statusFilter === 'Selected Only' && !selectedIds.has(item._uid)) return false;

      return true;
    });
  }, [items, searchTerm, districtFilter, godownFilter, statusFilter, selectedIds]);

  // Paginated items for 60fps DOM rendering
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Toggle single selection
  const toggleSelect = (uid) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  // Select all on current page
  const handleSelectCurrentPage = () => {
    const next = new Set(selectedIds);
    paginatedItems.forEach((item) => {
      next.add(item._uid);
    });
    setSelectedIds(next);
  };

  // Select all filtered records
  const handleSelectAllFiltered = () => {
    if (filteredItems.length > 5000) {
      const confirmAll = window.confirm(`You are selecting all ${filteredItems.length.toLocaleString()} filtered records. Do you want to proceed?`);
      if (!confirmAll) return;
    }
    const next = new Set(selectedIds);
    const len = filteredItems.length;
    for (let i = 0; i < len; i++) {
      next.add(filteredItems[i]._uid);
    }
    setSelectedIds(next);
  };

  // Select missing photos in list & switch filter so user sees missing records immediately
  const handleSelectMissingFiltered = () => {
    const next = new Set(selectedIds);
    const len = items.length;
    let count = 0;
    for (let i = 0; i < len; i++) {
      const item = items[i];
      if (!item.hasStart || !item.hasEpod) {
        next.add(item._uid);
        count++;
      }
    }
    setSelectedIds(next);
    setStatusFilter('Missing Any');
    setCopiedText(`Selected ${count.toLocaleString()} trips with missing photos`);
    setTimeout(() => setCopiedText(''), 3000);
  };

  // Deselect all
  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setDistrictFilter('All');
    setGodownFilter('All');
    setStatusFilter('All');
  };

  // Copy to clipboard helper
  const handleCopyText = (text, label) => {
    if (!text || text === 'N/A') return;
    navigator.clipboard.writeText(text);
    setCopiedText(`${label}: ${text}`);
    setTimeout(() => setCopiedText(''), 2500);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportTargets = selectedIds.size > 0 
      ? items.filter((item) => selectedIds.has(item._uid))
      : filteredItems;

    if (exportTargets.length === 0) {
      alert('No records to export.');
      return;
    }

    const rows = exportTargets.map((r, i) => ({
      'Sr. No.': i + 1,
      'Vehicle Number': r.vehicle,
      'DC No / Reference Number': r.refNo,
      'District Name': r.district,
      'Godown Name': r.godown,
      'Trip Date': r.tripDate,
      'Start Photo Status': r.hasStart ? 'Available' : 'Missing',
      'EPOD Photo Status': r.hasEpod ? 'Available' : 'Missing',
      'Start Trip Image Link': r.startTripImage,
      'EPOD Image Link': r.epodImage
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 8 }, { wch: 18 }, { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 15 },
      { wch: 18 }, { wch: 18 }, { wch: 45 }, { wch: 45 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "EPOD Photos");

    // Dynamic filename: District Name - [DISTRICT] - Date - [DD-MM-YYYY].xlsx
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;

    const targetDistricts = Array.from(new Set(exportTargets.map(t => t.district).filter(Boolean)));
    const selectedDist = (districtFilter && districtFilter !== 'All') ? districtFilter : (targetDistricts.length === 1 ? targetDistricts[0] : '');
    const safeDistrict = selectedDist ? selectedDist.replace(/[/\\?%*:|"<>]/g, '_').trim() : '';

    const excelFileName = safeDistrict 
      ? `District Name - ${safeDistrict.toUpperCase()} - Date - ${formattedDate}.xlsx`
      : `District Name - ALL - Date - ${formattedDate}.xlsx`;

    XLSX.writeFile(wb, excelFileName);
  };

  // Export to PDF with selected orientation (portrait or landscape)
  const handleExportPdf = async (orientation = 'portrait') => {
    const exportTargets = selectedIds.size > 0 
      ? items.filter((item) => selectedIds.has(item._uid))
      : filteredItems;

    if (exportTargets.length === 0) {
      alert('No records selected to export.');
      return;
    }

    if (exportTargets.length > 300) {
      const proceed = window.confirm(`You are exporting ${exportTargets.length.toLocaleString()} records into a single PDF file.\n\nDownloading images and building ${exportTargets.length.toLocaleString()} PDF pages may take 1-3 minutes.\n\nRecommendation: You can filter by District to export district-wise reports quickly.\n\nDo you want to proceed with all ${exportTargets.length.toLocaleString()} records?`);
      if (!proceed) {
        setShowOrientationModal(false);
        return;
      }
    }

    setShowOrientationModal(false);
    setIsExportingPdf(true);
    setPdfProgress(0);

    try {
      const doc = new jsPDF(orientation, 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const isLandscape = orientation === 'landscape';

      const companyTitle = localStorage.getItem('companyTitle') || "FarEye Technologies Pvt. Ltd.";
      const watermarkText = companyTitle ? companyTitle.split(' ')[0] : "GSCSCL";

      const total = exportTargets.length;

      for (let index = 0; index < total; index++) {
        const item = exportTargets[index];
        setPdfProgress(Math.round(((index + 1) / total) * 100));

        if (index > 0) {
          doc.addPage();
        }

        // Header Banner
        doc.setFillColor(248, 249, 250);
        doc.rect(0, 0, pageWidth, 16, 'F');
        doc.setDrawColor(220, 220, 220);
        doc.line(0, 16, pageWidth, 16);

        // Header Title
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text(companyTitle, pageWidth / 2, 10.5, { align: 'center' });

        // Trip Info Box (2x2 table)
        // Row 1: Vehicle Number | DC No / Reference Number
        // Row 2: District Name | Godown Name
        const tableStartY = 19;
        const tableData = [
          [
            { content: `Vehicle Number:\n${item.vehicle || 'N/A'}`, styles: { fontStyle: 'bold', halign: 'center', fontSize: 10, cellPadding: isLandscape ? 2 : 3 } },
            { content: `DC No / Reference Number:\n${item.refNo || 'N/A'}`, styles: { fontStyle: 'bold', halign: 'center', fontSize: 10, cellPadding: isLandscape ? 2 : 3 } }
          ],
          [
            { content: `District Name:\n${item.district || 'N/A'}`, styles: { halign: 'center', fontSize: 9, cellPadding: isLandscape ? 2 : 3 } },
            { content: `Godown Name:\n${item.godown || 'N/A'}`, styles: { halign: 'center', fontSize: 9, cellPadding: isLandscape ? 2 : 3 } }
          ]
        ];

        autoTable(doc, {
          body: tableData,
          startY: tableStartY,
          theme: 'grid',
          styles: { 
            lineColor: [180, 180, 180], 
            lineWidth: 0.2, 
            textColor: [30, 41, 59], 
            valign: 'middle' 
          },
          columnStyles: {
            0: { cellWidth: (pageWidth - 28) / 2 },
            1: { cellWidth: (pageWidth - 28) / 2 }
          },
          margin: { left: 14, right: 14 }
        });

        const imagesStartY = doc.lastAutoTable.finalY + (isLandscape ? 6 : 8);
        const colWidth = (pageWidth - 36) / 2;
        const imgBoxHeight = isLandscape ? 130 : 172;

        // Fetch & Draw Images with multi-strategy loader
        const [startImgBase64, epodImgBase64] = await Promise.all([
          item.hasStart ? getBase64ImageFromUrl(item.startTripImage) : Promise.resolve(null),
          item.hasEpod ? getBase64ImageFromUrl(item.epodImage) : Promise.resolve(null)
        ]);

        // Left Column: Start Trip Image
        const leftX = 14;
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(leftX, imagesStartY, colWidth, imgBoxHeight, 2, 2, 'FD');

        if (startImgBase64) {
          try {
            doc.addImage(startImgBase64, 'JPEG', leftX + 2, imagesStartY + 2, colWidth - 4, imgBoxHeight - 4, undefined, 'FAST');
          } catch (err) {
            doc.setFontSize(9);
            doc.setTextColor(220, 38, 38);
            doc.text("Image Render Failed", leftX + colWidth / 2, imagesStartY + imgBoxHeight / 2, { align: 'center' });
          }
        } else {
          doc.setFontSize(10);
          doc.setTextColor(150, 150, 150);
          doc.setFont("helvetica", "bold");
          doc.text("NO PHOTO AVAILABLE", leftX + colWidth / 2, imagesStartY + imgBoxHeight / 2 - 4, { align: 'center' });
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.text("Start trip photo was not uploaded", leftX + colWidth / 2, imagesStartY + imgBoxHeight / 2 + 4, { align: 'center' });
        }

        // Caption Below Start Image
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("Start Trip Image", leftX + colWidth / 2, imagesStartY + imgBoxHeight + 6, { align: 'center' });

        // Right Column: EPOD Image
        const rightX = 14 + colWidth + 8;
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(250, 250, 250);
        doc.roundedRect(rightX, imagesStartY, colWidth, imgBoxHeight, 2, 2, 'FD');

        if (epodImgBase64) {
          try {
            doc.addImage(epodImgBase64, 'JPEG', rightX + 2, imagesStartY + 2, colWidth - 4, imgBoxHeight - 4, undefined, 'FAST');
          } catch (err) {
            doc.setFontSize(9);
            doc.setTextColor(220, 38, 38);
            doc.text("Image Render Failed", rightX + colWidth / 2, imagesStartY + imgBoxHeight / 2, { align: 'center' });
          }
        } else {
          doc.setFontSize(10);
          doc.setTextColor(150, 150, 150);
          doc.setFont("helvetica", "bold");
          doc.text("NO PHOTO AVAILABLE", rightX + colWidth / 2, imagesStartY + imgBoxHeight / 2 - 4, { align: 'center' });
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.text("Delivered EPOD photo was not uploaded", rightX + colWidth / 2, imagesStartY + imgBoxHeight / 2 + 4, { align: 'center' });
        }

        // Caption Below EPOD Image
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("End Trip Image - EPOD", rightX + colWidth / 2, imagesStartY + imgBoxHeight + 6, { align: 'center' });

        // Watermark
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.08 }));
        doc.setFontSize(isLandscape ? 75 : 65);
        doc.setTextColor(100, 100, 100);
        doc.setFont("helvetica", "bold");
        const wmWidth = doc.getTextWidth(watermarkText);
        doc.text(watermarkText, (pageWidth - wmWidth) / 2, pageHeight / 2);
        doc.restoreGraphicsState();

        // Footer
        doc.setDrawColor(220, 220, 220);
        doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(140, 140, 140);
        doc.text(`Page ${index + 1} of ${total}`, pageWidth - 14, pageHeight - 5, { align: 'right' });
      }

      // Dynamic PDF filename: District Name - [DISTRICT] - Date - [DD-MM-YYYY].pdf
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      const formattedDate = `${day}-${month}-${year}`;

      const targetDistricts = Array.from(new Set(exportTargets.map(t => t.district).filter(Boolean)));
      const selectedDist = (districtFilter && districtFilter !== 'All') ? districtFilter : (targetDistricts.length === 1 ? targetDistricts[0] : '');
      const safeDistrict = selectedDist ? selectedDist.replace(/[/\\?%*:|"<>]/g, '_').trim() : '';

      const pdfFileName = safeDistrict
        ? `District Name - ${safeDistrict.toUpperCase()} - Date - ${formattedDate}.pdf`
        : `District Name - ALL - Date - ${formattedDate}.pdf`;

      doc.save(pdfFileName);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Error generating PDF: " + (error.message || "Unknown error"));
    } finally {
      setIsExportingPdf(false);
      setPdfProgress(0);
    }
  };

  const imgHeightPx = cardDensity === 'compact' ? '180px' : cardDensity === 'large' ? '290px' : '235px';

  const renderPaginationBar = (isBottom = false) => {
    if (filteredItems.length === 0) return null;
    const startIdx = (currentPage - 1) * pageSize + 1;
    const endIdx = Math.min(currentPage * pageSize, filteredItems.length);

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '10px 18px',
        backgroundColor: 'var(--bg-panel)',
        borderRadius: '10px',
        border: '1px solid var(--border-color)',
        marginBottom: isBottom ? '24px' : '16px',
        marginTop: isBottom ? '20px' : '0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
      }}>
        {/* Left: Summary */}
        <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          Showing <strong style={{ color: 'var(--text-main)' }}>{startIdx.toLocaleString()}</strong> – <strong style={{ color: 'var(--text-main)' }}>{endIdx.toLocaleString()}</strong> of <strong style={{ color: 'var(--text-main)' }}>{filteredItems.length.toLocaleString()}</strong> trips
        </div>

        {/* Center: Quick Pagination Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className="btn-secondary"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            style={{ padding: '6px 10px', fontSize: '0.8rem', opacity: currentPage === 1 ? 0.4 : 1 }}
            title="First Page"
          >
            <ChevronsLeft size={16} />
          </button>
          
          <button
            className="btn-secondary"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', opacity: currentPage === 1 ? 0.4 : 1 }}
          >
            <ChevronLeft size={16} /> Prev
          </button>

          <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: '0 8px', fontWeight: '600' }}>
            Page {currentPage} of {totalPages}
          </span>

          <button
            className="btn-secondary"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', opacity: currentPage === totalPages ? 0.4 : 1 }}
          >
            Next <ChevronRight size={16} />
          </button>

          <button
            className="btn-secondary"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            style={{ padding: '6px 10px', fontSize: '0.8rem', opacity: currentPage === totalPages ? 0.4 : 1 }}
            title="Last Page"
          >
            <ChevronsRight size={16} />
          </button>
        </div>

        {/* Right: Page Size Selector & View Density */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Page Size:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-panel)',
                color: 'var(--text-main)',
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <option value={24}>24</option>
              <option value={48}>48</option>
              <option value={96}>96</option>
              <option value={200}>200</option>
            </select>
          </div>

          {viewMode === 'grid' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid var(--border-color)', paddingLeft: '10px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Density:</span>
              <button
                onClick={() => setCardDensity('compact')}
                style={{
                  padding: '3px 7px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  border: '1px solid',
                  borderColor: cardDensity === 'compact' ? 'var(--accent-primary)' : 'var(--border-color)',
                  background: cardDensity === 'compact' ? 'var(--accent-primary)' : 'transparent',
                  color: cardDensity === 'compact' ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                S
              </button>
              <button
                onClick={() => setCardDensity('standard')}
                style={{
                  padding: '3px 7px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  border: '1px solid',
                  borderColor: cardDensity === 'standard' ? 'var(--accent-primary)' : 'var(--border-color)',
                  background: cardDensity === 'standard' ? 'var(--accent-primary)' : 'transparent',
                  color: cardDensity === 'standard' ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                M
              </button>
              <button
                onClick={() => setCardDensity('large')}
                style={{
                  padding: '3px 7px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  border: '1px solid',
                  borderColor: cardDensity === 'large' ? 'var(--accent-primary)' : 'var(--border-color)',
                  background: cardDensity === 'large' ? 'var(--accent-primary)' : 'transparent',
                  color: cardDensity === 'large' ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                L
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-content" style={{ padding: '0 4px', maxWidth: '100%' }}>
      
      {/* Toast Notification */}
      {copiedText && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: '#1e293b',
          color: '#ffffff',
          padding: '10px 18px',
          borderRadius: '8px',
          fontSize: '0.85rem',
          fontWeight: '500',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 99999,
          animation: 'fadeIn 0.2s ease'
        }}>
          <Check size={16} style={{ color: '#10b981' }} />
          {copiedText}
        </div>
      )}

      {/* Top Header & View Toggles */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        marginBottom: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: '800', margin: 0, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              EPOD Photo Verification Hub
            </h2>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Start Trip vehicle number plates, delivered EPOD acknowledgment photos & verification report
          </p>
        </div>

        {/* View Mode Toggle (Cards Grid vs Table) */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--bg-panel)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '2px'
        }}>
          <button
            onClick={() => setViewMode('grid')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer',
              background: viewMode === 'grid' ? 'var(--accent-primary, #6366f1)' : 'transparent',
              color: viewMode === 'grid' ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            <LayoutGrid size={15} />
            Cards View
          </button>
          <button
            onClick={() => setViewMode('table')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer',
              background: viewMode === 'table' ? 'var(--accent-primary, #6366f1)' : 'transparent',
              color: viewMode === 'table' ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            <List size={15} />
            Table View
          </button>
        </div>
      </div>

      {/* Executive KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '14px',
        marginBottom: '20px'
      }}>
        {/* KPI 1: Total Trips */}
        <div 
          onClick={() => setStatusFilter('All')}
          style={{
            backgroundColor: 'var(--bg-panel)',
            borderRadius: '12px',
            padding: '16px 18px',
            border: statusFilter === 'All' ? '2px solid var(--accent-primary, #6366f1)' : '1px solid var(--border-color)',
            borderTop: '4px solid var(--accent-primary, #6366f1)',
            boxShadow: statusFilter === 'All' ? '0 8px 20px rgba(99, 102, 241, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Trips
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            {stats.total.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Across all districts
          </div>
        </div>

        {/* KPI 2: Both Present */}
        <div 
          onClick={() => setStatusFilter('Both Present')}
          style={{
            backgroundColor: 'var(--bg-panel)',
            borderRadius: '12px',
            padding: '16px 18px',
            border: statusFilter === 'Both Present' ? '2px solid #10b981' : '1px solid var(--border-color)',
            borderTop: '4px solid #10b981',
            boxShadow: statusFilter === 'Both Present' ? '0 8px 20px rgba(16, 185, 129, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Both Photos Present
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#10b981', letterSpacing: '-0.02em' }}>
            {stats.bothPresent.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '4px', fontWeight: '600' }}>
            {stats.verifiedPercent}% Verification Rate
          </div>
        </div>

        {/* KPI 3: Missing Start */}
        <div 
          onClick={() => setStatusFilter('Missing Start')}
          style={{
            backgroundColor: 'var(--bg-panel)',
            borderRadius: '12px',
            padding: '16px 18px',
            border: statusFilter === 'Missing Start' ? '2px solid #f59e0b' : '1px solid var(--border-color)',
            borderTop: '4px solid #f59e0b',
            boxShadow: statusFilter === 'Missing Start' ? '0 8px 20px rgba(245, 158, 11, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Missing Start Photo
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: stats.missingStart > 0 ? '#f59e0b' : 'var(--text-main)', letterSpacing: '-0.02em' }}>
            {stats.missingStart.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: stats.missingStart > 0 ? '#f59e0b' : 'var(--text-muted)', marginTop: '4px', fontWeight: '500' }}>
            {stats.missingStart > 0 ? 'Click to filter missing' : 'All start photos uploaded'}
          </div>
        </div>

        {/* KPI 4: Missing EPOD */}
        <div 
          onClick={() => setStatusFilter('Missing EPOD')}
          style={{
            backgroundColor: 'var(--bg-panel)',
            borderRadius: '12px',
            padding: '16px 18px',
            border: statusFilter === 'Missing EPOD' ? '2px solid #ef4444' : '1px solid var(--border-color)',
            borderTop: '4px solid #ef4444',
            boxShadow: statusFilter === 'Missing EPOD' ? '0 8px 20px rgba(239, 68, 68, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Missing EPOD Photo
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Camera size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: stats.missingEpod > 0 ? '#ef4444' : 'var(--text-main)', letterSpacing: '-0.02em' }}>
            {stats.missingEpod.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: stats.missingEpod > 0 ? '#ef4444' : 'var(--text-muted)', marginTop: '4px', fontWeight: '500' }}>
            {stats.missingEpod > 0 ? 'Click to filter missing EPOD' : 'All delivered EPODs uploaded'}
          </div>
        </div>

        {/* KPI 5: Selected For Export */}
        <div 
          onClick={() => { if (selectedIds.size > 0) setStatusFilter('Selected Only'); }}
          style={{
            backgroundColor: selectedIds.size > 0 ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-panel)',
            borderRadius: '12px',
            padding: '16px 18px',
            border: statusFilter === 'Selected Only' ? '2px solid var(--accent-primary, #6366f1)' : '1px solid var(--border-color)',
            borderTop: '4px solid var(--accent-primary, #6366f1)',
            boxShadow: selectedIds.size > 0 ? '0 8px 20px rgba(99, 102, 241, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
            cursor: selectedIds.size > 0 ? 'pointer' : 'default',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Selected For Export
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileDown size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--accent-primary, #6366f1)', letterSpacing: '-0.02em' }}>
            {selectedIds.size.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: selectedIds.size > 0 ? 'var(--accent-primary, #6366f1)' : 'var(--text-muted)', marginTop: '4px', fontWeight: '500' }}>
            {selectedIds.size > 0 ? 'Ready for PDF / Excel download' : 'Select records below'}
          </div>
        </div>
      </div>

      {/* Unified Filter & Action Toolbar */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '18px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Row 1: Search, Filter Dropdowns and Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            
            {/* Left Filter Inputs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1, minWidth: '300px' }}>
              
              {/* Search Box */}
              <div style={{ position: 'relative', minWidth: '220px', flex: '1 1 200px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search vehicle, district, DC No..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 32px 8px 36px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    outline: 'none',
                    background: 'var(--bg-panel)',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem'
                  }}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    style={{
                      position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                      background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* District Filter Dropdown */}
              <select
                className="btn-secondary"
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  fontSize: '0.88rem',
                  background: 'var(--bg-panel)',
                  color: 'var(--text-main)',
                  borderRadius: '8px',
                  fontWeight: districtFilter !== 'All' ? '600' : 'normal',
                  borderColor: districtFilter !== 'All' ? 'var(--accent-primary, #6366f1)' : undefined
                }}
              >
                <option value="All">All Districts ({uniqueDistricts.length})</option>
                {uniqueDistricts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>

              {/* Godown Filter Dropdown */}
              <select
                className="btn-secondary"
                value={godownFilter}
                onChange={(e) => setGodownFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  fontSize: '0.88rem',
                  background: 'var(--bg-panel)',
                  color: 'var(--text-main)',
                  borderRadius: '8px',
                  fontWeight: godownFilter !== 'All' ? '600' : 'normal',
                  borderColor: godownFilter !== 'All' ? 'var(--accent-primary, #6366f1)' : undefined
                }}
              >
                <option value="All">All Godowns ({uniqueGodowns.length})</option>
                {uniqueGodowns.map(g => <option key={g} value={g}>{g}</option>)}
              </select>

              {/* Status Filter Dropdown */}
              <select
                className="btn-secondary"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  fontSize: '0.88rem',
                  background: 'var(--bg-panel)',
                  color: 'var(--text-main)',
                  borderRadius: '8px',
                  fontWeight: statusFilter !== 'All' ? '600' : 'normal',
                  borderColor: statusFilter !== 'All' ? 'var(--accent-primary, #6366f1)' : undefined
                }}
              >
                <option value="All">All Statuses ({items.length})</option>
                <option value="Both Present">Both Photos Present ({stats.bothPresent})</option>
                <option value="Missing Any">Missing Any Photo ({stats.missingAny})</option>
                <option value="Missing Start">Missing Start Photo ({stats.missingStart})</option>
                <option value="Missing EPOD">Missing EPOD Photo ({stats.missingEpod})</option>
                <option value="Selected Only">Selected Only ({selectedIds.size})</option>
              </select>

              {/* Quick Reset Filters Button */}
              {(searchTerm || districtFilter !== 'All' || godownFilter !== 'All' || statusFilter !== 'All') && (
                <button
                  className="btn-secondary"
                  onClick={handleResetFilters}
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#ef4444',
                    borderRadius: '8px'
                  }}
                  title="Reset all search and filters"
                >
                  <RotateCcw size={14} />
                  Reset
                </button>
              )}
            </div>

            {/* Right Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              
              {/* Select Current Page */}
              <button 
                className="btn-secondary" 
                onClick={handleSelectCurrentPage}
                style={{ fontSize: '0.82rem', padding: '8px 12px', borderRadius: '8px' }}
                title="Select visible cards on this page"
              >
                <CheckSquare size={14} />
                Page ({paginatedItems.length})
              </button>

              {/* Select All Filtered */}
              <button 
                className="btn-secondary" 
                onClick={handleSelectAllFiltered}
                style={{ fontSize: '0.82rem', padding: '8px 12px', borderRadius: '8px' }}
                title="Select all filtered records across all pages"
              >
                <CheckSquare size={14} />
                All ({filteredItems.length.toLocaleString()})
              </button>

              {/* Select Missing Button - Selects missing photos AND filters view immediately */}
              <button 
                className="btn-secondary" 
                onClick={handleSelectMissingFiltered}
                style={{ 
                  fontSize: '0.82rem', 
                  padding: '8px 12px', 
                  borderColor: statusFilter === 'Missing Any' ? '#ef4444' : '#f59e0b', 
                  backgroundColor: statusFilter === 'Missing Any' ? 'rgba(239, 68, 68, 0.1)' : undefined,
                  color: statusFilter === 'Missing Any' ? '#ef4444' : '#f59e0b',
                  borderRadius: '8px',
                  fontWeight: '600'
                }}
                title="Select and filter all trips with missing start or EPOD photos"
              >
                <AlertTriangle size={14} />
                Missing ({stats.missingAny.toLocaleString()})
              </button>

              {/* Clear Selection */}
              {selectedIds.size > 0 && (
                <button 
                  className="btn-secondary" 
                  onClick={handleDeselectAll}
                  style={{ fontSize: '0.82rem', padding: '8px 12px', borderRadius: '8px' }}
                  title="Clear all selections"
                >
                  <Square size={14} />
                  Clear ({selectedIds.size.toLocaleString()})
                </button>
              )}

              {/* Excel Download */}
              <button 
                className="btn-secondary" 
                onClick={handleExportExcel}
                style={{ fontSize: '0.85rem', padding: '8px 14px', borderRadius: '8px' }}
              >
                <Download size={15} />
                Excel
              </button>

              {/* PDF Download with Orientation Trigger */}
              <button 
                className="btn-primary" 
                onClick={() => setShowOrientationModal(true)}
                disabled={isExportingPdf || filteredItems.length === 0}
                style={{
                  fontSize: '0.85rem',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, var(--accent-primary, #6366f1) 0%, #4f46e5 100%)',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                }}
              >
                {isExportingPdf ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    Generating PDF ({pdfProgress}%)...
                  </>
                ) : (
                  <>
                    <FileDown size={15} />
                    Download PDF ({selectedIds.size > 0 ? `${selectedIds.size.toLocaleString()} Selected` : `All ${filteredItems.length.toLocaleString()}`})
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Row 2: Quick Status Filter Pills for Instant 1-Click Filtering */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            paddingTop: '10px',
            borderTop: '1px solid var(--border-color)'
          }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600' }}>Filter View:</span>
            
            <button
              onClick={() => setStatusFilter('All')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                border: '1px solid',
                borderColor: statusFilter === 'All' ? 'var(--accent-primary, #6366f1)' : 'var(--border-color)',
                background: statusFilter === 'All' ? 'var(--accent-primary, #6366f1)' : 'var(--bg-panel)',
                color: statusFilter === 'All' ? '#ffffff' : 'var(--text-main)',
                cursor: 'pointer',
                fontWeight: statusFilter === 'All' ? '700' : 'normal'
              }}
            >
              All Records ({items.length.toLocaleString()})
            </button>

            <button
              onClick={() => setStatusFilter('Both Present')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                border: '1px solid',
                borderColor: statusFilter === 'Both Present' ? '#10b981' : 'var(--border-color)',
                background: statusFilter === 'Both Present' ? '#10b981' : 'var(--bg-panel)',
                color: statusFilter === 'Both Present' ? '#ffffff' : 'var(--text-main)',
                cursor: 'pointer',
                fontWeight: statusFilter === 'Both Present' ? '700' : 'normal'
              }}
            >
              Complete ({stats.bothPresent.toLocaleString()})
            </button>

            <button
              onClick={() => setStatusFilter('Missing Any')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                border: '1px solid',
                borderColor: statusFilter === 'Missing Any' ? '#ef4444' : 'var(--border-color)',
                background: statusFilter === 'Missing Any' ? '#ef4444' : 'var(--bg-panel)',
                color: statusFilter === 'Missing Any' ? '#ffffff' : '#ef4444',
                cursor: 'pointer',
                fontWeight: statusFilter === 'Missing Any' ? '700' : 'normal'
              }}
            >
              Missing Photos ({stats.missingAny.toLocaleString()})
            </button>

            {selectedIds.size > 0 && (
              <button
                onClick={() => setStatusFilter('Selected Only')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  border: '1px solid',
                  borderColor: statusFilter === 'Selected Only' ? 'var(--accent-primary, #6366f1)' : 'var(--border-color)',
                  background: statusFilter === 'Selected Only' ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-panel)',
                  color: 'var(--accent-primary, #6366f1)',
                  cursor: 'pointer',
                  fontWeight: '700'
                }}
              >
                Selected Trips ({selectedIds.size.toLocaleString()})
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Selected Items Notice Banner */}
      {selectedIds.size > 0 && (
        <div style={{
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '10px',
          padding: '12px 18px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '500' }}>
            <span style={{ color: 'var(--accent-primary, #6366f1)', fontWeight: 'bold' }}>{selectedIds.size.toLocaleString()}</span> records selected for export. When you click "Download PDF", only these selected trips will be included in the official PDF report.
          </span>
          <button 
            onClick={handleDeselectAll} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Top Pagination Bar */}
      {renderPaginationBar(false)}

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div style={{ textAlign: 'center', padding: '70px 20px', color: 'var(--text-muted)' }}>
          <ImageIcon size={52} style={{ opacity: 0.3, margin: '0 auto 16px' }} />
          <h4 style={{ margin: '0 0 6px', fontSize: '1.15rem', color: 'var(--text-main)' }}>No Trips Found</h4>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>Try changing the search keywords or resetting district and status filters.</p>
          <button className="btn-secondary" onClick={handleResetFilters} style={{ marginTop: '16px', fontSize: '0.85rem' }}>
            Reset Filters
          </button>
        </div>
      )}

      {/* View Mode 1: Cards Grid */}
      {viewMode === 'grid' && filteredItems.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(540px, 1fr))',
          gap: '20px'
        }}>
          {paginatedItems.map((item) => {
            const isSelected = selectedIds.has(item._uid);

            return (
              <div 
                key={item._uid}
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  borderRadius: '12px',
                  border: isSelected 
                    ? '2px solid var(--accent-primary, #6366f1)' 
                    : '1px solid var(--border-color)',
                  boxShadow: isSelected 
                    ? '0 8px 24px rgba(99, 102, 241, 0.18)' 
                    : '0 2px 10px rgba(0,0,0,0.03)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Card Top Action & Status Bar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border-color)',
                  backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.06)' : 'var(--bg-panel-hover, #f8fafc)'
                }}>
                  {/* Select Checkbox */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(item._uid)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary, #6366f1)', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: isSelected ? '700' : '500', color: isSelected ? 'var(--accent-primary, #6366f1)' : 'var(--text-main)' }}>
                      Select for PDF Export
                    </span>
                  </label>

                  {/* Status Badges & Quick Action */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Photo Availability Status Badge */}
                    {item.hasStart && item.hasEpod ? (
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#10b981'
                      }}>
                        <CheckCircle2 size={13} /> Complete
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(239, 68, 68, 0.12)',
                        color: '#ef4444'
                      }}>
                        <AlertTriangle size={13} /> {!item.hasStart && !item.hasEpod ? 'Missing Both' : !item.hasStart ? 'Missing Start' : 'Missing EPOD'}
                      </span>
                    )}

                    {/* Dual Inspector Button */}
                    <button
                      onClick={() => setPreviewTrip(item)}
                      className="btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="Open full side-by-side trip inspection lightbox"
                    >
                      <Maximize2 size={12} /> Inspect
                    </button>
                  </div>
                </div>

                {/* Card Trip Metadata Box (2x2 Grid) */}
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: 'rgba(248, 250, 252, 0.5)',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px 16px'
                }}>
                  {/* Vehicle Number */}
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Vehicle Number
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '0.02em' }}>
                        {item.vehicle || 'N/A'}
                      </span>
                      {item.vehicle && item.vehicle !== 'N/A' && (
                        <button
                          onClick={() => handleCopyText(item.vehicle, 'Vehicle Number')}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                          title="Copy Vehicle Number"
                        >
                          <Copy size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* DC No / Reference Number */}
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      DC No / Reference Number
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '0.02em' }}>
                        {item.refNo || 'N/A'}
                      </span>
                      {item.refNo && item.refNo !== 'N/A' && (
                        <button
                          onClick={() => handleCopyText(item.refNo, 'DC No')}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                          title="Copy DC Number"
                        >
                          <Copy size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* District Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} style={{ color: 'var(--accent-primary, #6366f1)', flexShrink: 0 }} />
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>District Name</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.district || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Godown Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Godown Name</div>
                      <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.godown || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Photos Comparison Area (2 Columns) */}
                <div style={{
                  padding: '16px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '14px',
                  backgroundColor: 'var(--bg-panel)'
                }}>
                  {/* Left Column: Start Trip Photo */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{
                      position: 'relative',
                      height: imgHeightPx,
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'rgba(0,0,0,0.02)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {item.hasStart ? (
                        <>
                          <img 
                            src={item.startTripImage} 
                            alt="Start Trip"
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#0f172a' }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              e.target.parentNode.innerHTML = '<div style="color:#ef4444;font-size:0.8rem;text-align:center;padding:10px;">Failed to load image</div>';
                            }}
                          />
                          <button
                            onClick={() => setPreviewImage({ url: item.startTripImage, title: 'Start Trip Image', vehicle: item.vehicle, dcNo: item.refNo })}
                            style={{
                              position: 'absolute',
                              bottom: '8px',
                              right: '8px',
                              padding: '4px 8px',
                              backgroundColor: 'rgba(15, 23, 42, 0.75)',
                              color: '#ffffff',
                              borderRadius: '6px',
                              border: 'none',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              backdropFilter: 'blur(4px)'
                            }}
                          >
                            <ZoomIn size={12} /> View
                          </button>
                        </>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                          <XCircle size={32} style={{ color: '#ef4444', opacity: 0.6, margin: '0 auto 6px' }} />
                          <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#ef4444' }}>NO PHOTO AVAILABLE</div>
                          <div style={{ fontSize: '0.72rem', marginTop: '2px' }}>Start trip photo missing</div>
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)' }}>
                      Start Trip Image
                    </div>
                  </div>

                  {/* Right Column: EPOD Delivered Photo */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{
                      position: 'relative',
                      height: imgHeightPx,
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'rgba(0,0,0,0.02)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {item.hasEpod ? (
                        <>
                          <img 
                            src={item.epodImage} 
                            alt="EPOD"
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#0f172a' }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              e.target.parentNode.innerHTML = '<div style="color:#ef4444;font-size:0.8rem;text-align:center;padding:10px;">Failed to load image</div>';
                            }}
                          />
                          <button
                            onClick={() => setPreviewImage({ url: item.epodImage, title: 'End Trip Image - EPOD', vehicle: item.vehicle, dcNo: item.refNo })}
                            style={{
                              position: 'absolute',
                              bottom: '8px',
                              right: '8px',
                              padding: '4px 8px',
                              backgroundColor: 'rgba(15, 23, 42, 0.75)',
                              color: '#ffffff',
                              borderRadius: '6px',
                              border: 'none',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              backdropFilter: 'blur(4px)'
                            }}
                          >
                            <ZoomIn size={12} /> View
                          </button>
                        </>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                          <XCircle size={32} style={{ color: '#ef4444', opacity: 0.6, margin: '0 auto 6px' }} />
                          <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#ef4444' }}>NO PHOTO AVAILABLE</div>
                          <div style={{ fontSize: '0.72rem', marginTop: '2px' }}>EPOD photo missing</div>
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)' }}>
                      End Trip Image - EPOD
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* View Mode 2: Table Analysis View */}
      {viewMode === 'table' && filteredItems.length > 0 && (
        <div style={{
          backgroundColor: 'var(--bg-panel)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-panel-hover, #f8fafc)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px', width: '50px', textAlign: 'center' }}>
                    <input 
                      type="checkbox"
                      checked={paginatedItems.length > 0 && paginatedItems.every(i => selectedIds.has(i._uid))}
                      onChange={handleSelectCurrentPage}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '12px 16px', fontWeight: '600' }}>Vehicle Number</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600' }}>DC / Ref Number</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600' }}>District</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600' }}>Godown</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'center' }}>Start Trip Photo</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'center' }}>EPOD Photo</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'center' }}>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item) => {
                  const isSelected = selectedIds.has(item._uid);

                  return (
                    <tr 
                      key={item._uid}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.05)' : undefined,
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(item._uid)}
                          style={{ cursor: 'pointer', accentColor: 'var(--accent-primary, #6366f1)' }}
                        />
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--text-main)' }}>
                        {item.vehicle || 'N/A'}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-main)' }}>
                        {item.refNo || 'N/A'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-main)' }}>
                        {item.district || 'N/A'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-main)' }}>
                        {item.godown || 'N/A'}
                      </td>
                      
                      {/* Start Photo Thumbnail */}
                      <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                        {item.hasStart ? (
                          <div 
                            style={{ width: '48px', height: '48px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)', margin: '0 auto', cursor: 'pointer' }}
                            onClick={() => setPreviewImage({ url: item.startTripImage, title: 'Start Trip Image', vehicle: item.vehicle, dcNo: item.refNo })}
                            title="Click to zoom photo"
                          >
                            <img src={item.startTripImage} alt="Start" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: '600' }}>Missing</span>
                        )}
                      </td>

                      {/* EPOD Photo Thumbnail */}
                      <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                        {item.hasEpod ? (
                          <div 
                            style={{ width: '48px', height: '48px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)', margin: '0 auto', cursor: 'pointer' }}
                            onClick={() => setPreviewImage({ url: item.epodImage, title: 'End Trip Image - EPOD', vehicle: item.vehicle, dcNo: item.refNo })}
                            title="Click to zoom photo"
                          >
                            <img src={item.epodImage} alt="EPOD" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: '600' }}>Missing</span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {item.hasStart && item.hasEpod ? (
                          <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: '600' }}>
                            Complete
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', fontWeight: '600' }}>
                            {!item.hasStart && !item.hasEpod ? 'Missing Both' : !item.hasStart ? 'Missing Start' : 'Missing EPOD'}
                          </span>
                        )}
                      </td>

                      {/* Inspect */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => setPreviewTrip(item)}
                          className="btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          <Eye size={13} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bottom Pagination Bar */}
      {renderPaginationBar(true)}

      {/* Full Trip Comparison Lightbox Modal (Side-by-Side Dual View) */}
      {previewTrip && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backdropFilter: 'blur(6px)'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-panel)',
            borderRadius: '16px',
            maxWidth: '1200px',
            width: '100%',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
            border: '1px solid var(--border-color)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-panel-hover, #f8fafc)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>
                    Trip Inspection: {previewTrip.vehicle || 'N/A'}
                  </h3>
                  <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary, #6366f1)', fontWeight: '700' }}>
                    DC: {previewTrip.refNo || 'N/A'}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  District: <strong>{previewTrip.district || 'N/A'}</strong> | Godown: <strong>{previewTrip.godown || 'N/A'}</strong> | Date: <strong>{previewTrip.tripDate || 'N/A'}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => {
                    toggleSelect(previewTrip._uid);
                  }}
                  className="btn-secondary"
                  style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                >
                  {selectedIds.has(previewTrip._uid) ? <><Check size={14} /> Selected</> : <><CheckSquare size={14} /> Select for PDF</>}
                </button>
                <button 
                  onClick={() => setPreviewTrip(null)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Modal Body: Side-by-Side Photo Comparison */}
            <div style={{
              padding: '24px',
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '24px',
              backgroundColor: 'var(--bg-panel)'
            }}>
              {/* Start Trip Inspector Box */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-main)' }}>
                    1. Start Trip Photo (Vehicle Number Plate)
                  </span>
                  {previewTrip.hasStart && (
                    <a 
                      href={previewTrip.startTripImage} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.78rem', color: 'var(--accent-primary, #6366f1)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                    >
                      <ExternalLink size={13} /> Open Original
                    </a>
                  )}
                </div>

                <div style={{
                  height: '420px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: '1px solid var(--border-color)',
                  backgroundColor: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {previewTrip.hasStart ? (
                    <img 
                      src={previewTrip.startTripImage} 
                      alt="Start Trip" 
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#ef4444' }}>
                      <AlertTriangle size={48} style={{ opacity: 0.8, margin: '0 auto 10px' }} />
                      <p style={{ fontWeight: '700', margin: 0 }}>Start Trip Photo Missing</p>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No vehicle photo uploaded at start of trip</span>
                    </div>
                  )}
                </div>
              </div>

              {/* EPOD Delivered Inspector Box */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-main)' }}>
                    2. End Trip Photo - EPOD (Stamped Acknowledgment)
                  </span>
                  {previewTrip.hasEpod && (
                    <a 
                      href={previewTrip.epodImage} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.78rem', color: 'var(--accent-primary, #6366f1)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                    >
                      <ExternalLink size={13} /> Open Original
                    </a>
                  )}
                </div>

                <div style={{
                  height: '420px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: '1px solid var(--border-color)',
                  backgroundColor: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {previewTrip.hasEpod ? (
                    <img 
                      src={previewTrip.epodImage} 
                      alt="EPOD Delivered" 
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#ef4444' }}>
                      <AlertTriangle size={48} style={{ opacity: 0.8, margin: '0 auto 10px' }} />
                      <p style={{ fontWeight: '700', margin: 0 }}>Delivered EPOD Photo Missing</p>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>No signed acknowledgment photo uploaded at delivery</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 24px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'flex-end',
              backgroundColor: 'var(--bg-panel-hover, #f8fafc)'
            }}>
              <button 
                className="btn-secondary"
                onClick={() => setPreviewTrip(null)}
                style={{ fontSize: '0.85rem', padding: '6px 16px' }}
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Zoom Image Modal */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <div style={{
              backgroundColor: '#1e293b',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '8px',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%'
            }}>
              <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>
                {previewImage.title} • {previewImage.vehicle} (DC: {previewImage.dcNo})
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <a 
                  href={previewImage.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ color: '#38bdf8', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                >
                  <ExternalLink size={14} /> Open Full URL
                </a>
                <button 
                  onClick={() => setPreviewImage(null)} 
                  style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <img 
              src={previewImage.url} 
              alt="Zoomed Preview"
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }} 
            />
          </div>
        </div>
      )}

      {/* PDF Orientation Choice Modal */}
      {showOrientationModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-panel)',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
            border: '1px solid var(--border-color)',
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>
                Select PDF Orientation
              </h3>
              <button 
                onClick={() => setShowOrientationModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ margin: '0 0 20px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Choose the page layout for exporting {selectedIds.size > 0 ? `${selectedIds.size.toLocaleString()} selected` : `${filteredItems.length.toLocaleString()} filtered`} photo report pages:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
              {/* Option 1: Portrait */}
              <div 
                onClick={() => setPdfOrientation('portrait')}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: pdfOrientation === 'portrait' ? '2px solid var(--accent-primary, #6366f1)' : '1px solid var(--border-color)',
                  backgroundColor: pdfOrientation === 'portrait' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-panel)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '36px',
                  height: '50px',
                  border: '2px solid',
                  borderColor: pdfOrientation === 'portrait' ? 'var(--accent-primary, #6366f1)' : 'var(--text-muted)',
                  borderRadius: '4px',
                  margin: '0 auto 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: pdfOrientation === 'portrait' ? 'rgba(99, 102, 241, 0.15)' : 'transparent'
                }}>
                  <ImageIcon size={16} style={{ color: pdfOrientation === 'portrait' ? 'var(--accent-primary, #6366f1)' : 'var(--text-muted)' }} />
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)' }}>
                  Portrait (ઊભી)
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Standard A4 Vertical
                </div>
              </div>

              {/* Option 2: Landscape */}
              <div 
                onClick={() => setPdfOrientation('landscape')}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: pdfOrientation === 'landscape' ? '2px solid var(--accent-primary, #6366f1)' : '1px solid var(--border-color)',
                  backgroundColor: pdfOrientation === 'landscape' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-panel)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '50px',
                  height: '36px',
                  border: '2px solid',
                  borderColor: pdfOrientation === 'landscape' ? 'var(--accent-primary, #6366f1)' : 'var(--text-muted)',
                  borderRadius: '4px',
                  margin: '7px auto 17px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: pdfOrientation === 'landscape' ? 'rgba(99, 102, 241, 0.15)' : 'transparent'
                }}>
                  <ImageIcon size={16} style={{ color: pdfOrientation === 'landscape' ? 'var(--accent-primary, #6366f1)' : 'var(--text-muted)' }} />
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)' }}>
                  Landscape (આડી)
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Wide A4 Horizontal
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                className="btn-secondary"
                onClick={() => setShowOrientationModal(false)}
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={() => handleExportPdf(pdfOrientation)}
                style={{
                  padding: '8px 20px',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, var(--accent-primary, #6366f1) 0%, #4f46e5 100%)'
                }}
              >
                <FileDown size={15} />
                Generate {pdfOrientation === 'landscape' ? 'Landscape' : 'Portrait'} PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
