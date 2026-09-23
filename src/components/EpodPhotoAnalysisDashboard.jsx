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
  XCircle, 
  Eye, 
  X, 
  Layers,
  ZoomIn,
  RefreshCw,
  Image as ImageIcon
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
    // Continue to next strategy
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
    // Continue to next strategy
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
  const [previewImage, setPreviewImage] = useState(null); // { url, title, vehicle }
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [showOrientationModal, setShowOrientationModal] = useState(false);
  const [pdfOrientation, setPdfOrientation] = useState('portrait'); // 'portrait' or 'landscape'

  const items = useMemo(() => {
    return data || rawData || [];
  }, [data, rawData]);

  // Unique filter options
  const uniqueDistricts = useMemo(() => {
    const set = new Set();
    items.forEach(r => { if (r.district && r.district !== 'N/A') set.add(r.district); });
    return Array.from(set).sort();
  }, [items]);

  const uniqueGodowns = useMemo(() => {
    const set = new Set();
    items.forEach(r => { if (r.godown && r.godown !== 'N/A') set.add(r.godown); });
    return Array.from(set).sort();
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item, idx) => {
      const itemId = item.id || `${item.vehicle}_${item.tripDate}_${idx}`;
      
      // Search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchVehicle = (item.vehicle || '').toLowerCase().includes(term);
        const matchDistrict = (item.district || '').toLowerCase().includes(term);
        const matchGodown = (item.godown || '').toLowerCase().includes(term);
        const matchRefNo = (item.refNo || '').toLowerCase().includes(term);
        const matchDate = (item.tripDate || '').toLowerCase().includes(term);
        if (!matchVehicle && !matchDistrict && !matchGodown && !matchRefNo && !matchDate) return false;
      }

      // District
      if (districtFilter !== 'All' && item.district !== districtFilter) return false;

      // Godown
      if (godownFilter !== 'All' && item.godown !== godownFilter) return false;

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

  // Statistics
  const stats = useMemo(() => {
    let total = items.length;
    let bothPresent = 0;
    let missingStart = 0;
    let missingEpod = 0;
    let missingAny = 0;

    items.forEach(r => {
      const hasStart = Boolean(r.startTripImage && String(r.startTripImage).trim().length > 5);
      const hasEpod = Boolean(r.epodImage && String(r.epodImage).trim().length > 5);

      if (hasStart && hasEpod) bothPresent++;
      if (!hasStart) missingStart++;
      if (!hasEpod) missingEpod++;
      if (!hasStart || !hasEpod) missingAny++;
    });

    return { total, bothPresent, missingStart, missingEpod, missingAny };
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

  // Select all filtered
  const handleSelectAllFiltered = () => {
    const next = new Set(selectedIds);
    filteredItems.forEach((item, idx) => {
      const id = item.id || `${item.vehicle}_${item.tripDate}_${idx}`;
      next.add(id);
    });
    setSelectedIds(next);
  };

  // Select only missing photos in filtered
  const handleSelectMissingFiltered = () => {
    const next = new Set(selectedIds);
    filteredItems.forEach((item, idx) => {
      const hasStart = Boolean(item.startTripImage && String(item.startTripImage).trim().length > 5);
      const hasEpod = Boolean(item.epodImage && String(item.epodImage).trim().length > 5);
      if (!hasStart || !hasEpod) {
        const id = item.id || `${item.vehicle}_${item.tripDate}_${idx}`;
        next.add(id);
      }
    });
    setSelectedIds(next);
  };

  // Deselect all
  const handleDeselectAll = () => {
    setSelectedIds(new Set());
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
      ? `District name - ${safeDistrict} - Date - ${formattedDate}.xlsx`
      : `District name - All - Date - ${formattedDate}.xlsx`;

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
        ? `District name - ${safeDistrict} - Date - ${formattedDate}.pdf`
        : `District name - All - Date - ${formattedDate}.pdf`;

      doc.save(pdfFileName);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Error generating PDF: " + (error.message || "Unknown error"));
    } finally {
      setIsExportingPdf(false);
      setPdfProgress(0);
    }
  };

  return (
    <div style={{ padding: '4px 0' }}>
      {/* KPI Cards Row */}
      <div className="dashboard-grid" style={{ marginBottom: '20px' }}>
        <div className="kpi-card total">
          <div className="kpi-title">Total Trips Analyzed</div>
          <div className="kpi-value">{stats.total}</div>
        </div>
        <div className="kpi-card matched">
          <div className="kpi-title">Both Photos Present</div>
          <div className="kpi-value">{stats.bothPresent}</div>
        </div>
        <div className="kpi-card mismatched" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('Missing Start')} title="Click to filter">
          <div className="kpi-title">Missing Start Photo</div>
          <div className="kpi-value">{stats.missingStart}</div>
        </div>
        <div className="kpi-card missing" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter('Missing EPOD')} title="Click to filter">
          <div className="kpi-title">Missing EPOD Photo</div>
          <div className="kpi-value">{stats.missingEpod}</div>
        </div>
        <div 
          className="kpi-card" 
          style={{ 
            borderLeft: '4px solid var(--accent-primary, #6366f1)',
            backgroundColor: selectedIds.size > 0 ? 'rgba(99, 102, 241, 0.08)' : undefined
          }}
        >
          <div className="kpi-title">Selected For Export</div>
          <div className="kpi-value" style={{ color: 'var(--accent-primary, #6366f1)' }}>{selectedIds.size}</div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* Left: Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
            {/* Search */}
            <div style={{ position: 'relative', minWidth: '220px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search vehicle, district, godown..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  outline: 'none',
                  background: 'var(--bg-panel)',
                  color: 'var(--text-main)',
                  fontSize: '0.88rem'
                }}
              />
            </div>

            {/* District Filter */}
            <select
              className="btn-secondary"
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              style={{ padding: '8px 12px', fontSize: '0.88rem', background: 'var(--bg-panel)', color: 'var(--text-main)' }}
            >
              <option value="All">All Districts ({uniqueDistricts.length})</option>
              {uniqueDistricts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            {/* Godown Filter */}
            <select
              className="btn-secondary"
              value={godownFilter}
              onChange={(e) => setGodownFilter(e.target.value)}
              style={{ padding: '8px 12px', fontSize: '0.88rem', background: 'var(--bg-panel)', color: 'var(--text-main)' }}
            >
              <option value="All">All Godowns ({uniqueGodowns.length})</option>
              {uniqueGodowns.map(g => <option key={g} value={g}>{g}</option>)}
            </select>

            {/* Photo Status Filter */}
            <select
              className="btn-secondary"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', fontSize: '0.88rem', background: 'var(--bg-panel)', color: 'var(--text-main)' }}
            >
              <option value="All">All Statuses</option>
              <option value="Both Present">Both Photos Present</option>
              <option value="Missing Any">Missing Any Photo</option>
              <option value="Missing Start">Missing Start Photo</option>
              <option value="Missing EPOD">Missing EPOD Photo</option>
              <option value="Selected Only">Selected Only ({selectedIds.size})</option>
            </select>
          </div>

          {/* Right: Selection and Export Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              className="btn-secondary" 
              onClick={handleSelectAllFiltered}
              style={{ fontSize: '0.85rem', padding: '8px 12px' }}
              title="Select all currently visible records"
            >
              <CheckSquare size={16} />
              Select All ({filteredItems.length})
            </button>

            <button 
              className="btn-secondary" 
              onClick={handleSelectMissingFiltered}
              style={{ fontSize: '0.85rem', padding: '8px 12px', borderColor: 'var(--warning, #f59e0b)' }}
              title="Select all records with missing photos"
            >
              <AlertTriangle size={16} style={{ color: 'var(--warning, #f59e0b)' }} />
              Select Missing
            </button>

            {selectedIds.size > 0 && (
              <button 
                className="btn-secondary" 
                onClick={handleDeselectAll}
                style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                title="Clear all selections"
              >
                <Square size={16} />
                Deselect All
              </button>
            )}

            <button 
              className="btn-secondary" 
              onClick={handleExportExcel}
              style={{ fontSize: '0.85rem', padding: '8px 14px' }}
            >
              <Download size={16} />
              Excel
            </button>

            <button 
              className="btn-primary" 
              onClick={() => setShowOrientationModal(true)}
              disabled={isExportingPdf || filteredItems.length === 0}
              style={{ fontSize: '0.85rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {isExportingPdf ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Generating PDF ({pdfProgress}%)...
                </>
              ) : (
                <>
                  <FileDown size={16} />
                  Download PDF ({selectedIds.size > 0 ? `${selectedIds.size} Selected` : `All ${filteredItems.length}`})
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Selected Items Notice Banner */}
      {selectedIds.size > 0 && (
        <div style={{
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '8px',
          padding: '10px 16px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '500' }}>
            <span style={{ color: 'var(--accent-primary, #6366f1)', fontWeight: 'bold' }}>{selectedIds.size}</span> records selected for export. When you click "Download PDF", only these selected trips will be included in the official PDF report.
          </span>
          <button 
            onClick={handleDeselectAll} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <ImageIcon size={48} style={{ opacity: 0.3, margin: '0 auto 16px' }} />
          <p style={{ fontSize: '1.1rem' }}>No trips found matching the selected filters.</p>
        </div>
      )}

      {/* Trip Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(540px, 1fr))',
        gap: '24px'
      }}>
        {filteredItems.map((item, idx) => {
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
                borderRadius: '10px',
                border: isSelected 
                  ? '2px solid var(--accent-primary, #6366f1)' 
                  : '1px solid var(--border-color)',
                boxShadow: isSelected 
                  ? '0 6px 20px rgba(99, 102, 241, 0.15)' 
                  : '0 2px 8px rgba(0,0,0,0.04)',
                padding: '20px',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              {/* Top Header Card Bar with Selection Checkbox */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <label 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    cursor: 'pointer', 
                    userSelect: 'none',
                    fontWeight: '600',
                    fontSize: '0.9rem',
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

                <div style={{ display: 'flex', gap: '6px' }}>
                  {hasStart && hasEpod ? (
                    <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', background: 'rgba(46, 213, 115, 0.15)', color: '#2ed573', fontWeight: '600' }}>
                      Complete
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', background: 'rgba(255, 71, 87, 0.15)', color: '#ff4757', fontWeight: '600' }}>
                      {!hasStart && !hasEpod ? 'Missing Both' : !hasStart ? 'Missing Start' : 'Missing EPOD'}
                    </span>
                  )}
                </div>
              </div>

              {/* 2x2 Header Table */}
              <div style={{
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                overflow: 'hidden',
                marginBottom: '16px',
                backgroundColor: 'var(--bg-panel-hover, rgba(255,255,255,0.02))'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ padding: '10px 14px', borderRight: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                      Vehicle Number
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)', letterSpacing: '0.02em' }}>
                      {item.vehicle || 'N/A'}
                    </div>
                  </div>
                  <div style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                      DC No / Reference Number
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)' }}>
                      {item.refNo || 'N/A'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  <div style={{ padding: '8px 14px', borderRight: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                      District Name
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-main)' }}>
                      {item.district || 'N/A'}
                    </div>
                  </div>
                  <div style={{ padding: '8px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                      Godown Name
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-main)' }}>
                      {item.godown || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2 Photo Columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                
                {/* Column 1: Start Trip Image */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div 
                    style={{
                      width: '100%',
                      height: '240px',
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
                      if (hasStart) setPreviewImage({ url: startUrl, title: 'Start Trip Image', vehicle: item.vehicle });
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
                            // Try loading via image proxy if direct fails
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
                          <AlertTriangle size={32} style={{ color: '#f59e0b', marginBottom: '8px' }} />
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Image failed to load</span>
                          <a href={startUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', marginTop: '4px' }}>Open Link</a>
                        </div>
                        <div style={{
                          position: 'absolute', bottom: '8px', right: '8px',
                          background: 'rgba(0,0,0,0.6)', color: 'white',
                          borderRadius: '4px', padding: '4px 6px',
                          display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem'
                        }}>
                          <ZoomIn size={12} /> View
                        </div>
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                        <XCircle size={32} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
                        <span style={{ fontSize: '0.85rem', display: 'block', fontWeight: '500' }}>No Start Photo</span>
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-main)', textAlign: 'center' }}>
                    Start Trip Image
                  </div>
                </div>

                {/* Column 2: End Trip Image - EPOD */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div 
                    style={{
                      width: '100%',
                      height: '240px',
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
                      if (hasEpod) setPreviewImage({ url: epodUrl, title: 'End Trip Image - EPOD', vehicle: item.vehicle });
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
                          <AlertTriangle size={32} style={{ color: '#f59e0b', marginBottom: '8px' }} />
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Image failed to load</span>
                          <a href={epodUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', marginTop: '4px' }}>Open Link</a>
                        </div>
                        <div style={{
                          position: 'absolute', bottom: '8px', right: '8px',
                          background: 'rgba(0,0,0,0.6)', color: 'white',
                          borderRadius: '4px', padding: '4px 6px',
                          display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem'
                        }}>
                          <ZoomIn size={12} /> View
                        </div>
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                        <XCircle size={32} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
                        <span style={{ fontSize: '0.85rem', display: 'block', fontWeight: '500' }}>No EPOD Photo</span>
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-main)', textAlign: 'center' }}>
                    End Trip Image - EPOD
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox / Image Preview Modal */}
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
                  Vehicle: {previewImage.vehicle}
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
              borderRadius: '12px',
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
                  Select page orientation for {selectedIds.size > 0 ? `${selectedIds.size} selected trips` : `${filteredItems.length} trips`}
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
