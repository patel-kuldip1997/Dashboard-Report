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
  Sparkles,
  Maximize2,
  Check,
  RotateCcw,
  SlidersHorizontal
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Helper to clean and extract valid URL string
const cleanImageUrl = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  let str = raw.trim();
  // Extract URL from HYPERLINK formula if present
  const match = str.match(/HYPERLINK\s*\(\s*["']([^"']+)["']/i);
  if (match) str = match[1].trim();
  // Remove wrapping quotes
  str = str.replace(/^["']|["']$/g, '').trim();
  return str;
};

// Helper to convert blob to Base64
const blobToBase64 = (blob) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
};

// Multi-strategy image loader to guarantee image loading without CORS issues
const getBase64ImageFromUrl = async (imageUrl) => {
  const cleanUrl = cleanImageUrl(imageUrl);
  if (!cleanUrl || cleanUrl.length < 5) return null;

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

  // Strategy 6: allorigins fallback
  try {
    const alloriginsUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`;
    const res = await fetch(alloriginsUrl);
    if (res.ok) {
      const blob = await res.blob();
      if (blob && blob.size > 100) {
        const base64 = await blobToBase64(blob);
        if (base64) return base64;
      }
    }
  } catch (e) {
    // End of fallbacks
  }

  return null;
};

export default function EpodPhotoAnalysisDashboard({ data, rawData }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('All');
  const [godownFilter, setGodownFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All'); // All, Both Present, Missing Any, Missing Start, Missing EPOD, Selected Only
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
  const [cardDensity, setCardDensity] = useState('standard'); // 'compact' (200px) | 'standard' (250px) | 'large' (300px)

  // Copy feedback toast
  const [copiedText, setCopiedText] = useState('');

  // Pagination states (Supports 2 Lakh+ rows smoothly)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(48); // 24, 48, 96, 200

  const items = useMemo(() => {
    return data || rawData || [];
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

    return items.filter((item, idx) => {
      const itemId = item.id || `${item.vehicle}_${item.tripDate}_${idx}`;
      
      // Search
      if (hasSearch) {
        const matchVehicle = (item.vehicle || '').toLowerCase().includes(term);
        const matchDistrict = (item.district || '').toLowerCase().includes(term);
        const matchGodown = (item.godown || '').toLowerCase().includes(term);
        const matchRefNo = (item.refNo || '').toLowerCase().includes(term);
        const matchDate = (item.tripDate || '').toLowerCase().includes(term);
        if (!matchVehicle && !matchDistrict && !matchGodown && !matchRefNo && !matchDate) return false;
      }

      // District
      if (hasDist && item.district !== districtFilter) return false;

      // Godown
      if (hasGodown && item.godown !== godownFilter) return false;

      // Status
      const hasStart = Boolean(item.startTripImage && String(item.startTripImage).trim().length > 5);
      const hasEpod = Boolean(item.epodImage && String(item.epodImage).trim().length > 5);

      if (statusFilter === 'Both Present' && (!hasStart || !hasEpod)) return false;
      if (statusFilter === 'Missing Any' && (hasStart && hasEpod)) return false;
      if (statusFilter === 'Missing Start' && hasStart) return false;
      if (statusFilter === 'Missing EPOD' && hasEpod) return false;
      if (statusFilter === 'Selected Only' && !selectedIds.has(itemId)) return false;

      return true;
    });
  }, [items, searchTerm, districtFilter, godownFilter, statusFilter, selectedIds]);

  // Paginated items for 60fps DOM rendering
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Statistics (single pass)
  const stats = useMemo(() => {
    let total = items.length;
    let bothPresent = 0;
    let missingStart = 0;
    let missingEpod = 0;
    let missingAny = 0;

    for (let i = 0; i < total; i++) {
      const r = items[i];
      const hasStart = Boolean(r.startTripImage && String(r.startTripImage).trim().length > 5);
      const hasEpod = Boolean(r.epodImage && String(r.epodImage).trim().length > 5);

      if (hasStart && hasEpod) bothPresent++;
      if (!hasStart) missingStart++;
      if (!hasEpod) missingEpod++;
      if (!hasStart || !hasEpod) missingAny++;
    }

    const verifiedPercent = total > 0 ? Math.round((bothPresent / total) * 100) : 0;
    return { total, bothPresent, missingStart, missingEpod, missingAny, verifiedPercent };
  }, [items]);

  // Toggle single selection
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select all on current page
  const handleSelectCurrentPage = () => {
    const next = new Set(selectedIds);
    paginatedItems.forEach((item, idx) => {
      const id = item.id || `${item.vehicle}_${item.tripDate}_${idx}`;
      next.add(id);
    });
    setSelectedIds(next);
  };

  // Select all filtered (supports 2 Lakh items)
  const handleSelectAllFiltered = () => {
    if (filteredItems.length > 5000) {
      const confirmAll = window.confirm(`You are selecting all ${filteredItems.length.toLocaleString()} filtered records. Do you want to proceed?`);
      if (!confirmAll) return;
    }
    const next = new Set(selectedIds);
    const len = filteredItems.length;
    for (let i = 0; i < len; i++) {
      const item = filteredItems[i];
      const id = item.id || `${item.vehicle}_${item.tripDate}_${i}`;
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Select missing photos in filtered
  const handleSelectMissingFiltered = () => {
    const next = new Set(selectedIds);
    const len = filteredItems.length;
    for (let i = 0; i < len; i++) {
      const item = filteredItems[i];
      const hasStart = Boolean(item.startTripImage && String(item.startTripImage).trim().length > 5);
      const hasEpod = Boolean(item.epodImage && String(item.epodImage).trim().length > 5);
      if (!hasStart || !hasEpod) {
        const id = item.id || `${item.vehicle}_${item.tripDate}_${i}`;
        next.add(id);
      }
    }
    setSelectedIds(next);
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
      ? items.filter((item, idx) => selectedIds.has(item.id || `${item.vehicle}_${item.tripDate}_${idx}`))
      : filteredItems;

    if (exportTargets.length === 0) {
      alert('No records to export.');
      return;
    }

    const rows = exportTargets.map((r, i) => ({
      'Sr. No.': i + 1,
      'Vehicle Number': r.vehicle || '',
      'DC No / Reference Number': r.refNo || '',
      'District Name': r.district || '',
      'Godown Name': r.godown || '',
      'Start Trip Image Link': cleanImageUrl(r.startTripImage),
      'EPOD Image Link': cleanImageUrl(r.epodImage),
      'Start Photo Status': (r.startTripImage && r.startTripImage.length > 5) ? 'Available' : 'Missing',
      'EPOD Photo Status': (r.epodImage && r.epodImage.length > 5) ? 'Available' : 'Missing'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 8 }, { wch: 18 }, { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 45 }, { wch: 45 }, { wch: 18 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "EPOD Photos");

    // Dynamic filename based on selected District and current Date (DD-MM-YYYY)
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
      ? items.filter((item, idx) => selectedIds.has(item.id || `${item.vehicle}_${item.tripDate}_${idx}`))
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

        // Draw Header Banner
        doc.setFillColor(248, 249, 250);
        doc.rect(0, 0, pageWidth, 16, 'F');
        doc.setDrawColor(220, 220, 220);
        doc.line(0, 16, pageWidth, 16);

        // Header Title
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text(companyTitle, pageWidth / 2, 10.5, { align: 'center' });

        // Draw Trip Info Box (2x2 table)
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
        const colWidth = (pageWidth - 36) / 2; // 2 columns with 8mm gap
        const imgBoxHeight = isLandscape ? 130 : 172;

        // Fetch & Draw Images with multi-strategy loader
        const [startImgBase64, epodImgBase64] = await Promise.all([
          getBase64ImageFromUrl(item.startTripImage),
          getBase64ImageFromUrl(item.epodImage)
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

        // Footer - removed unwanted text, kept page indicator
        doc.setDrawColor(220, 220, 220);
        doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(140, 140, 140);
        doc.text(`Page ${index + 1} of ${total}`, pageWidth - 14, pageHeight - 5, { align: 'right' });
      }

      // Dynamic PDF filename based on selected District and current Date (DD-MM-YYYY)
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

        {/* Center: Page controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className="btn-secondary"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            style={{ padding: '6px 8px', fontSize: '0.8rem', borderRadius: '6px' }}
            title="First Page"
          >
            <ChevronsLeft size={16} />
          </button>
          <button
            className="btn-secondary"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px' }}
            title="Previous Page"
          >
            <ChevronLeft size={16} /> Prev
          </button>

          <span style={{ fontSize: '0.88rem', margin: '0 8px', color: 'var(--text-main)', fontWeight: '500' }}>
            Page <strong style={{ color: 'var(--accent-primary, #6366f1)' }}>{currentPage}</strong> of <strong>{totalPages.toLocaleString()}</strong>
          </span>

          <button
            className="btn-secondary"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px' }}
            title="Next Page"
          >
            Next <ChevronRight size={16} />
          </button>
          <button
            className="btn-secondary"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            style={{ padding: '6px 8px', fontSize: '0.8rem', borderRadius: '6px' }}
            title="Last Page"
          >
            <ChevronsRight size={16} />
          </button>
        </div>

        {/* Right: Page Size & Quick Jump */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span>Cards per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-panel)',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <option value={24}>24</option>
              <option value={48}>48</option>
              <option value={96}>96</option>
              <option value={200}>200</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span>Go to:</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1 && val <= totalPages) {
                  setCurrentPage(val);
                }
              }}
              style={{
                width: '64px',
                padding: '4px 6px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-panel)',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                textAlign: 'center'
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '2px 0' }}>
      
      {/* Toast Notification when text is copied */}
      {copiedText && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 10000,
          background: 'rgba(15, 23, 42, 0.92)',
          color: '#fff',
          padding: '10px 18px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.88rem',
          backdropFilter: 'blur(6px)',
          animation: 'fadeIn 0.2s ease'
        }}>
          <Check size={16} style={{ color: '#22c55e' }} />
          <span>Copied {copiedText}</span>
        </div>
      )}

      {/* Modern Dashboard Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--accent-primary, #6366f1) 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)'
          }}>
            <Camera size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)' }}>
                EPOD Photo Analysis
              </h2>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'rgba(99, 102, 241, 0.12)',
                color: 'var(--accent-primary, #6366f1)'
              }}>
                {items.length.toLocaleString()} Total Records
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Side-by-side trip verification: Start Trip photo vs. Delivered EPOD photo
            </p>
          </div>
        </div>

        {/* View Mode & Card Density Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Card Density Toggle */}
          {viewMode === 'grid' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '2px'
            }}>
              <button
                onClick={() => setCardDensity('compact')}
                style={{
                  border: 'none',
                  background: cardDensity === 'compact' ? 'var(--bg-panel-hover, #e2e8f0)' : 'transparent',
                  color: cardDensity === 'compact' ? 'var(--text-main)' : 'var(--text-muted)',
                  padding: '5px 9px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  fontWeight: cardDensity === 'compact' ? '600' : 'normal'
                }}
                title="Compact Card View"
              >
                Compact
              </button>
              <button
                onClick={() => setCardDensity('standard')}
                style={{
                  border: 'none',
                  background: cardDensity === 'standard' ? 'var(--bg-panel-hover, #e2e8f0)' : 'transparent',
                  color: cardDensity === 'standard' ? 'var(--text-main)' : 'var(--text-muted)',
                  padding: '5px 9px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  fontWeight: cardDensity === 'standard' ? '600' : 'normal'
                }}
                title="Standard Card View"
              >
                Standard
              </button>
              <button
                onClick={() => setCardDensity('large')}
                style={{
                  border: 'none',
                  background: cardDensity === 'large' ? 'var(--bg-panel-hover, #e2e8f0)' : 'transparent',
                  color: cardDensity === 'large' ? 'var(--text-main)' : 'var(--text-muted)',
                  padding: '5px 9px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  fontWeight: cardDensity === 'large' ? '600' : 'normal'
                }}
                title="Large Card View"
              >
                Large
              </button>
            </div>
          )}

          {/* Grid vs Table View Mode */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '2px'
          }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                border: 'none',
                background: viewMode === 'grid' ? 'var(--accent-primary, #6366f1)' : 'transparent',
                color: viewMode === 'grid' ? '#ffffff' : 'var(--text-muted)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
            >
              <LayoutGrid size={15} />
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                border: 'none',
                background: viewMode === 'table' ? 'var(--accent-primary, #6366f1)' : 'transparent',
                color: viewMode === 'table' ? '#ffffff' : 'var(--text-muted)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
            >
              <List size={15} />
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Executive KPI Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        {/* KPI 1: Total */}
        <div 
          onClick={() => setStatusFilter('All')}
          style={{
            backgroundColor: 'var(--bg-panel)',
            borderRadius: '12px',
            padding: '16px 18px',
            border: statusFilter === 'All' ? '2px solid #3b82f6' : '1px solid var(--border-color)',
            borderTop: '4px solid #3b82f6',
            boxShadow: statusFilter === 'All' ? '0 8px 20px rgba(59, 130, 246, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Trips Analyzed
            </span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            {stats.total.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '4px', fontWeight: '500' }}>
            {stats.verifiedPercent}% Photo Verification Rate
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
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Complete Start & EPOD
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
            {selectedIds.size > 0 ? 'Included in PDF export' : 'Select records below'}
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
                <option value="All">All Statuses</option>
                <option value="Both Present">Both Photos Present</option>
                <option value="Missing Any">Missing Any Photo</option>
                <option value="Missing Start">Missing Start Photo</option>
                <option value="Missing EPOD">Missing EPOD Photo</option>
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

              {/* Select Missing */}
              <button 
                className="btn-secondary" 
                onClick={handleSelectMissingFiltered}
                style={{ fontSize: '0.82rem', padding: '8px 12px', borderColor: 'var(--warning, #f59e0b)', borderRadius: '8px' }}
                title="Select records with missing start or EPOD photos"
              >
                <AlertTriangle size={14} style={{ color: 'var(--warning, #f59e0b)' }} />
                Missing
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

          {/* Active Filter Tags Bar (if any applied) */}
          {(searchTerm || districtFilter !== 'All' || godownFilter !== 'All' || statusFilter !== 'All') && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              paddingTop: '10px',
              borderTop: '1px solid var(--border-color)'
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>Active Filters:</span>
              
              {districtFilter !== 'All' && (
                <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary, #6366f1)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  District: {districtFilter}
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => setDistrictFilter('All')} />
                </span>
              )}

              {godownFilter !== 'All' && (
                <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary, #6366f1)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Godown: {godownFilter}
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => setGodownFilter('All')} />
                </span>
              )}

              {statusFilter !== 'All' && (
                <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary, #6366f1)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Status: {statusFilter}
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('All')} />
                </span>
              )}

              {searchTerm && (
                <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary, #6366f1)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Query: "{searchTerm}"
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')} />
                </span>
              )}
            </div>
          )}

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
          {paginatedItems.map((item, idx) => {
            const itemId = item.id || `${item.vehicle}_${item.tripDate}_${idx}`;
            const isSelected = selectedIds.has(itemId);
            const startUrl = cleanImageUrl(item.startTripImage);
            const epodUrl = cleanImageUrl(item.epodImage);
            const hasStart = Boolean(startUrl && startUrl.length > 5);
            const hasEpod = Boolean(epodUrl && epodUrl.length > 5);

            return (
              <div 
                key={itemId}
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  borderRadius: '12px',
                  border: isSelected 
                    ? '2px solid var(--accent-primary, #6366f1)' 
                    : '1px solid var(--border-color)',
                  boxShadow: isSelected 
                    ? '0 8px 24px rgba(99, 102, 241, 0.18)' 
                    : '0 2px 10px rgba(0,0,0,0.03)',
                  padding: '18px',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                {/* Top Header Card Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  
                  {/* Select Checkbox */}
                  <label 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      cursor: 'pointer', 
                      userSelect: 'none',
                      fontWeight: '600',
                      fontSize: '0.88rem',
                      color: isSelected ? 'var(--accent-primary, #6366f1)' : 'var(--text-main)'
                    }}
                  >
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(itemId)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-primary, #6366f1)' }}
                    />
                    <span>Select for PDF Export</span>
                  </label>

                  {/* Status Pill & Inspect Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {hasStart && hasEpod ? (
                      <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={13} /> Complete
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertTriangle size={13} /> {!hasStart && !hasEpod ? 'Missing Both' : !hasStart ? 'Missing Start' : 'Missing EPOD'}
                      </span>
                    )}

                    <button
                      onClick={() => setPreviewTrip(item)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Inspect side-by-side in full view"
                    >
                      <Maximize2 size={12} /> Inspect
                    </button>
                  </div>
                </div>

                {/* 2x2 Header Table */}
                <div style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  marginBottom: '16px',
                  backgroundColor: 'var(--bg-panel-hover, rgba(0,0,0,0.02))'
                }}>
                  {/* Row 1: Vehicle & DC No */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border-color)' }}>
                    
                    {/* Vehicle */}
                    <div style={{ padding: '8px 14px', borderRight: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                        Vehicle Number
                      </div>
                      <div 
                        style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)', letterSpacing: '0.02em', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                        onClick={() => handleCopyText(item.vehicle, 'Vehicle Number')}
                        title="Click to copy vehicle number"
                      >
                        {item.vehicle || 'N/A'}
                        {item.vehicle && <Copy size={12} style={{ opacity: 0.5 }} />}
                      </div>
                    </div>

                    {/* DC No / Reference Number */}
                    <div style={{ padding: '8px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                        DC No / Reference Number
                      </div>
                      <div 
                        style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                        onClick={() => handleCopyText(item.refNo, 'DC / Ref Number')}
                        title="Click to copy DC number"
                      >
                        {item.refNo || 'N/A'}
                        {item.refNo && <Copy size={12} style={{ opacity: 0.5 }} />}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: District Name & Godown Name */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                    <div style={{ padding: '7px 14px', borderRight: '1px solid var(--border-color)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                        District Name
                      </div>
                      <div style={{ fontSize: '0.92rem', fontWeight: '600', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <MapPin size={13} style={{ color: 'var(--accent-primary, #6366f1)', opacity: 0.7 }} />
                        {item.district || 'N/A'}
                      </div>
                    </div>
                    
                    <div style={{ padding: '7px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                        Godown Name
                      </div>
                      <div style={{ fontSize: '0.92rem', fontWeight: '600', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <Building2 size={13} style={{ color: 'var(--accent-primary, #6366f1)', opacity: 0.7 }} />
                        {item.godown || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2 Photo Columns */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  
                  {/* Column 1: Start Trip Image */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div 
                      style={{
                        width: '100%',
                        height: imgHeightPx,
                        backgroundColor: 'rgba(0,0,0,0.03)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        cursor: hasStart ? 'pointer' : 'default'
                      }}
                      onClick={() => {
                        if (hasStart) setPreviewImage({ url: startUrl, title: 'Start Trip Image', vehicle: item.vehicle, dcNo: item.refNo });
                      }}
                    >
                      {hasStart ? (
                        <>
                          <img 
                            src={startUrl} 
                            alt="Start Trip" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            loading="lazy"
                            onError={(e) => {
                              if (!e.target.dataset.retried) {
                                e.target.dataset.retried = 'true';
                                e.target.src = `/api/image-proxy?url=${encodeURIComponent(startUrl)}`;
                                return;
                              }
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div style={{ display: 'none', flexDirection: 'column', alignItems: 'center', padding: '12px', textAlign: 'center' }}>
                            <AlertTriangle size={30} style={{ color: '#f59e0b', marginBottom: '6px' }} />
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Image failed to load</span>
                            <a href={startUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', marginTop: '4px' }}>Open Direct Link</a>
                          </div>
                          <div style={{
                            position: 'absolute', bottom: '8px', right: '8px',
                            background: 'rgba(15, 23, 42, 0.75)', color: '#fff',
                            borderRadius: '4px', padding: '3px 7px',
                            display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem',
                            backdropFilter: 'blur(4px)'
                          }}>
                            <ZoomIn size={12} /> View
                          </div>
                        </>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                          <XCircle size={32} style={{ opacity: 0.35, color: '#ef4444', margin: '0 auto 6px' }} />
                          <span style={{ fontSize: '0.82rem', display: 'block', fontWeight: '600', color: 'var(--text-main)' }}>No Start Photo</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Not uploaded</span>
                        </div>
                      )}
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)', textAlign: 'center' }}>
                      Start Trip Image
                    </div>
                  </div>

                  {/* Column 2: End Trip Image - EPOD */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div 
                      style={{
                        width: '100%',
                        height: imgHeightPx,
                        backgroundColor: 'rgba(0,0,0,0.03)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        cursor: hasEpod ? 'pointer' : 'default'
                      }}
                      onClick={() => {
                        if (hasEpod) setPreviewImage({ url: epodUrl, title: 'End Trip Image - EPOD', vehicle: item.vehicle, dcNo: item.refNo });
                      }}
                    >
                      {hasEpod ? (
                        <>
                          <img 
                            src={epodUrl} 
                            alt="End Trip EPOD" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            loading="lazy"
                            onError={(e) => {
                              if (!e.target.dataset.retried) {
                                e.target.dataset.retried = 'true';
                                e.target.src = `/api/image-proxy?url=${encodeURIComponent(epodUrl)}`;
                                return;
                              }
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div style={{ display: 'none', flexDirection: 'column', alignItems: 'center', padding: '12px', textAlign: 'center' }}>
                            <AlertTriangle size={30} style={{ color: '#f59e0b', marginBottom: '6px' }} />
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Image failed to load</span>
                            <a href={epodUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', marginTop: '4px' }}>Open Direct Link</a>
                          </div>
                          <div style={{
                            position: 'absolute', bottom: '8px', right: '8px',
                            background: 'rgba(15, 23, 42, 0.75)', color: '#fff',
                            borderRadius: '4px', padding: '3px 7px',
                            display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem',
                            backdropFilter: 'blur(4px)'
                          }}>
                            <ZoomIn size={12} /> View
                          </div>
                        </>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                          <XCircle size={32} style={{ opacity: 0.35, color: '#ef4444', margin: '0 auto 6px' }} />
                          <span style={{ fontSize: '0.82rem', display: 'block', fontWeight: '600', color: 'var(--text-main)' }}>No EPOD Photo</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Not uploaded</span>
                        </div>
                      )}
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)', textAlign: 'center' }}>
                      End Trip Image - EPOD
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Mode 2: Compact Table View */}
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
                      checked={paginatedItems.length > 0 && paginatedItems.every(i => selectedIds.has(i.id || `${i.vehicle}_${i.tripDate}`))}
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
                {paginatedItems.map((item, idx) => {
                  const itemId = item.id || `${item.vehicle}_${item.tripDate}_${idx}`;
                  const isSelected = selectedIds.has(itemId);
                  const startUrl = cleanImageUrl(item.startTripImage);
                  const epodUrl = cleanImageUrl(item.epodImage);
                  const hasStart = Boolean(startUrl && startUrl.length > 5);
                  const hasEpod = Boolean(epodUrl && epodUrl.length > 5);

                  return (
                    <tr 
                      key={itemId}
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
                          onChange={() => toggleSelect(itemId)}
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
                        {hasStart ? (
                          <div 
                            style={{ width: '48px', height: '48px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)', margin: '0 auto', cursor: 'pointer' }}
                            onClick={() => setPreviewImage({ url: startUrl, title: 'Start Trip Image', vehicle: item.vehicle, dcNo: item.refNo })}
                            title="Click to zoom photo"
                          >
                            <img src={startUrl} alt="Start" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: '600' }}>Missing</span>
                        )}
                      </td>

                      {/* EPOD Photo Thumbnail */}
                      <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                        {hasEpod ? (
                          <div 
                            style={{ width: '48px', height: '48px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)', margin: '0 auto', cursor: 'pointer' }}
                            onClick={() => setPreviewImage({ url: epodUrl, title: 'End Trip Image - EPOD', vehicle: item.vehicle, dcNo: item.refNo })}
                            title="Click to zoom photo"
                          >
                            <img src={epodUrl} alt="EPOD" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: '600' }}>Missing</span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {hasStart && hasEpod ? (
                          <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: '600' }}>
                            Complete
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', fontWeight: '600' }}>
                            {!hasStart && !hasEpod ? 'Missing Both' : !hasStart ? 'Missing Start' : 'Missing EPOD'}
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
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backdropFilter: 'blur(6px)'
          }}
          onClick={() => setPreviewTrip(null)}
        >
          <div 
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '1100px',
              maxHeight: '90vh',
              backgroundColor: 'var(--bg-panel)',
              borderRadius: '16px',
              padding: '20px 24px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-main)' }}>
                    Trip Photo Verification: {previewTrip.vehicle}
                  </h3>
                  <span style={{ fontSize: '0.78rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary, #6366f1)', fontWeight: '600' }}>
                    DC: {previewTrip.refNo || 'N/A'}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  District: <strong>{previewTrip.district}</strong> | Godown: <strong>{previewTrip.godown}</strong>
                </p>
              </div>

              <button 
                onClick={() => setPreviewTrip(null)} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Body: Side by Side Full Comparison */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              padding: '20px 0',
              overflowY: 'auto',
              maxHeight: 'calc(90vh - 140px)'
            }}>
              
              {/* Left: Start Photo */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-main)' }}>Start Trip Photo</span>
                  {cleanImageUrl(previewTrip.startTripImage) && (
                    <a href={cleanImageUrl(previewTrip.startTripImage)} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Open Original <ExternalLink size={12} />
                    </a>
                  )}
                </div>
                <div style={{
                  width: '100%',
                  height: '420px',
                  backgroundColor: 'rgba(0,0,0,0.04)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {cleanImageUrl(previewTrip.startTripImage) ? (
                    <img src={cleanImageUrl(previewTrip.startTripImage)} alt="Start Trip" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      <XCircle size={44} style={{ color: '#ef4444', opacity: 0.4, margin: '0 auto 8px' }} />
                      <p style={{ fontWeight: '600', margin: 0 }}>Start Trip Photo Missing</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Delivered EPOD Photo */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-main)' }}>End Trip Photo - EPOD</span>
                  {cleanImageUrl(previewTrip.epodImage) && (
                    <a href={cleanImageUrl(previewTrip.epodImage)} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Open Original <ExternalLink size={12} />
                    </a>
                  )}
                </div>
                <div style={{
                  width: '100%',
                  height: '420px',
                  backgroundColor: 'rgba(0,0,0,0.04)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {cleanImageUrl(previewTrip.epodImage) ? (
                    <img src={cleanImageUrl(previewTrip.epodImage)} alt="Delivered EPOD" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      <XCircle size={44} style={{ color: '#ef4444', opacity: 0.4, margin: '0 auto 8px' }} />
                      <p style={{ fontWeight: '600', margin: 0 }}>Delivered EPOD Photo Missing</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' }}>
                <input 
                  type="checkbox" 
                  checked={selectedIds.has(previewTrip.id || `${previewTrip.vehicle}_${previewTrip.tripDate}`)}
                  onChange={() => toggleSelect(previewTrip.id || `${previewTrip.vehicle}_${previewTrip.tripDate}`)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-primary, #6366f1)' }}
                />
                <span>Include this trip in PDF report</span>
              </label>

              <button className="btn-secondary" onClick={() => setPreviewTrip(null)} style={{ padding: '6px 16px' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Image Preview Modal */}
      {previewImage && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
          onClick={() => setPreviewImage(null)}
        >
          <div 
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              backgroundColor: 'var(--bg-panel)',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)' }}>
                  {previewImage.title}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '12px' }}>
                  Vehicle: {previewImage.vehicle} {previewImage.dcNo ? `| DC: ${previewImage.dcNo}` : ''}
                </span>
              </div>
              <button 
                onClick={() => setPreviewImage(null)} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ maxHeight: '78vh', maxWidth: '85vw', overflow: 'auto', borderRadius: '8px' }}>
              <img 
                src={previewImage.url} 
                alt="Enlarged preview" 
                style={{ maxHeight: '75vh', maxWidth: '80vw', objectFit: 'contain', display: 'block' }} 
              />
            </div>

            <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
              <a 
                href={previewImage.url} 
                target="_blank" 
                rel="noreferrer" 
                className="btn-secondary"
                style={{ fontSize: '0.85rem', padding: '6px 14px' }}
              >
                Open Original Link
              </a>
            </div>
          </div>
        </div>
      )}

      {/* PDF Orientation Selection Modal */}
      {showOrientationModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowOrientationModal(false)}
        >
          <div 
            style={{
              backgroundColor: 'var(--bg-panel, #ffffff)',
              borderRadius: '14px',
              border: '1px solid var(--border-color, #e2e8f0)',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main, #1e293b)' }}>
                  Download PDF Report
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
                  Select page orientation for {selectedIds.size > 0 ? `${selectedIds.size.toLocaleString()} selected trips` : `${filteredItems.length.toLocaleString()} trips`}
                </p>
              </div>
              <button 
                onClick={() => setShowOrientationModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: Orientation Options */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Option 1: Portrait */}
              <div 
                onClick={() => setPdfOrientation('portrait')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: pdfOrientation === 'portrait' 
                    ? '2px solid var(--accent-primary, #6366f1)' 
                    : '1px solid var(--border-color, #e2e8f0)',
                  backgroundColor: pdfOrientation === 'portrait'
                    ? 'rgba(99, 102, 241, 0.08)'
                    : 'var(--bg-panel-hover, rgba(0,0,0,0.02))',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Visual Icon representation */}
                <div style={{
                  width: '38px',
                  height: '50px',
                  borderRadius: '4px',
                  border: pdfOrientation === 'portrait' ? '2px solid var(--accent-primary, #6366f1)' : '2px solid var(--text-muted, #94a3b8)',
                  backgroundColor: pdfOrientation === 'portrait' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '4px',
                  flexShrink: 0
                }}>
                  <div style={{ width: '20px', height: '3px', background: pdfOrientation === 'portrait' ? 'var(--accent-primary, #6366f1)' : 'var(--text-muted, #94a3b8)', borderRadius: '2px' }}></div>
                  <div style={{ width: '20px', height: '22px', border: `1px dashed ${pdfOrientation === 'portrait' ? 'var(--accent-primary, #6366f1)' : 'var(--text-muted, #94a3b8)'}`, borderRadius: '2px' }}></div>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-main, #1e293b)' }}>
                      Portrait (ઊભું / Vertical)
                    </span>
                    <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary, #6366f1)', fontWeight: '600' }}>
                      Recommended
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', lineHeight: '1.3' }}>
                    Standard A4 Portrait layout. Best for single-page print and mobile/tablet reading.
                  </p>
                </div>
              </div>

              {/* Option 2: Landscape */}
              <div 
                onClick={() => setPdfOrientation('landscape')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: pdfOrientation === 'landscape' 
                    ? '2px solid var(--accent-primary, #6366f1)' 
                    : '1px solid var(--border-color, #e2e8f0)',
                  backgroundColor: pdfOrientation === 'landscape'
                    ? 'rgba(99, 102, 241, 0.08)'
                    : 'var(--bg-panel-hover, rgba(0,0,0,0.02))',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Visual Icon representation */}
                <div style={{
                  width: '50px',
                  height: '38px',
                  borderRadius: '4px',
                  border: pdfOrientation === 'landscape' ? '2px solid var(--accent-primary, #6366f1)' : '2px solid var(--text-muted, #94a3b8)',
                  backgroundColor: pdfOrientation === 'landscape' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '4px',
                  flexShrink: 0
                }}>
                  <div style={{ width: '18px', height: '22px', border: `1px dashed ${pdfOrientation === 'landscape' ? 'var(--accent-primary, #6366f1)' : 'var(--text-muted, #94a3b8)'}`, borderRadius: '2px' }}></div>
                  <div style={{ width: '18px', height: '22px', border: `1px dashed ${pdfOrientation === 'landscape' ? 'var(--accent-primary, #6366f1)' : 'var(--text-muted, #94a3b8)'}`, borderRadius: '2px' }}></div>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-main, #1e293b)' }}>
                      Landscape (આડું / Horizontal)
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', lineHeight: '1.3' }}>
                    Wide A4 Landscape layout. Best for widescreen desktop view & side-by-side comparison.
                  </p>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              backgroundColor: 'var(--bg-panel-hover, rgba(0,0,0,0.02))'
            }}>
              <button 
                className="btn-secondary" 
                onClick={() => setShowOrientationModal(false)}
                style={{ fontSize: '0.88rem', padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={() => handleExportPdf(pdfOrientation)}
                style={{ fontSize: '0.88rem', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <FileDown size={16} />
                Generate & Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
