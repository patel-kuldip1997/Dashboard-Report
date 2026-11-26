import React, { useState, useMemo, useRef } from 'react';
import { Search, Building2, CheckCircle2, AlertTriangle, UploadCloud, FileSpreadsheet, FileDown, RotateCcw, Filter, Eye, Layers, Edit3, Save } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function cleanStr(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeGodown(str) {
  if (!str) return '';
  let s = String(str).toLowerCase().trim();
  s = s.replace(/[^a-z0-9]/g, '');
  // Normalize transliterations
  s = s.replace(/sh/g, 's');
  s = s.replace(/jh/g, 'j');
  s = s.replace(/z/g, 'j');
  s = s.replace(/w/g, 'v');
  s = s.replace(/k/g, 'c');
  s = s.replace(/ee/g, 'i');
  s = s.replace(/oo/g, 'u');
  s = s.replace(/aa/g, 'a');
  return s;
}

function consonantSkeleton(str) {
  const norm = normalizeGodown(str);
  return norm.replace(/[aeiou]/g, '');
}

function isDistrictMatch(rawDist, masterDist) {
  if (!rawDist || !masterDist) return false;
  const rClean = cleanStr(rawDist);
  const mClean = cleanStr(masterDist);
  if (rClean === mClean) return true;

  // Strict separation for City vs Rural/Main District (especially AHMEDABAD vs AHMEDABAD CITY)
  const rHasCity = rClean.includes('city');
  const mHasCity = mClean.includes('city');
  if (rHasCity !== mHasCity) {
    return false; // One is City and the other is not! Never match them!
  }

  // Same city status, check base match
  const rBase = rClean.replace(/city|rural|dist|district/g, '');
  const mBase = mClean.replace(/city|rural|dist|district/g, '');
  if (rBase && mBase && rBase === mBase) return true;

  return false;
}

const ALIAS_PAIRS = [
  ['sanganikotda', 'kotdasangani'],
  ['pavijetpur', 'jetpurpavi'],
  ['bechraji', 'bahcharaji'],
  ['bechraji', 'becharaji'],
  ['paddhari', 'padathri'],
  ['padathri', 'paddhari'],
  ['surendranagar', 'surendranagercity'],
  ['surendranagarcity', 'surendranagercity'],
  ['chhotaudepur', 'chhotaudaipur'],
  ['chhotaudepur', 'chhotaudaipurcity'],
  ['vallabhipur', 'valbhipurumrala'],
  ['valbhipur', 'valbhipurumrala'],
  ['mehmedabad', 'mehmdabad'],
  ['wankaner', 'wankanar'],
  ['kutiyana', 'kutiana'],
  ['kaparada', 'kaprada'],
  ['saraswati', 'sarsvati'],
  ['shehra', 'sahera'],
  ['daskroi', 'dascroi'],
  ['jhalod', 'zalod'],
  ['jhagadia', 'jagadia'],
  ['sihor', 'shihor']
];

function isAlias(a, b) {
  for (const [x, y] of ALIAS_PAIRS) {
    if ((a === x && b === y) || (a === y && b === x)) return true;
  }
  return false;
}

// Robust match function
export function findMasterMatch(rawName, rawDist, rawId, masterList) {
  const rawClean = cleanStr(rawName);
  const rawNorm = normalizeGodown(rawName);
  const rawSkel = consonantSkeleton(rawName);
  const rawDistClean = cleanStr(rawDist);
  const rawIdClean = String(rawId || '').trim();

  // 1. Direct ID match if available
  if (rawIdClean && rawIdClean !== '0' && rawIdClean !== '-') {
    const idMatch = masterList.find(m => String(m.godownId || m.gscscl_godown_id || '').trim() === rawIdClean);
    if (idMatch) return idMatch;
  }

  // Filter master list by district if available
  let candidates = masterList;
  if (rawDistClean) {
    const distMatches = masterList.filter(m => {
      const mDistClean = cleanStr(m.district);
      return mDistClean === rawDistClean || mDistClean.includes(rawDistClean) || rawDistClean.includes(mDistClean);
    });
    if (distMatches.length > 0) {
      candidates = distMatches;
    }
  }

  // Pass 1: Exact clean match in district candidates
  for (const m of candidates) {
    const mClean = cleanStr(m.destinationGodown);
    if (rawClean === mClean) return m;
  }

  // Pass 2: Alias match in district candidates
  for (const m of candidates) {
    const mClean = cleanStr(m.destinationGodown);
    if (isAlias(rawClean, mClean)) return m;
  }

  // Pass 3: Normalized match in district candidates
  for (const m of candidates) {
    const mNorm = normalizeGodown(m.destinationGodown);
    if (rawNorm === mNorm) return m;
  }

  // Pass 4: In same district, suffix stripping & prefix/containment
  if (candidates !== masterList) {
    for (const m of candidates) {
      const mClean = cleanStr(m.destinationGodown);
      const mBase = mClean.replace(/city$|rural$|dist$|district$/g, '');
      const rawBase = rawClean.replace(/city$|rural$|dist$|district$/g, '');
      if (mBase === rawBase || mBase === rawClean || mClean === rawBase) return m;

      if (rawClean.length >= 4 && mClean.length >= 4) {
        if (mClean.startsWith(rawClean) || rawClean.startsWith(mClean) || mClean.includes(rawClean) || rawClean.includes(mClean)) return m;
      }
    }

    // Pass 4b: Consonant skeleton match in same district
    if (rawSkel.length >= 3) {
      for (const m of candidates) {
        const mSkel = consonantSkeleton(m.destinationGodown);
        if (rawSkel === mSkel) return m;
        if (mSkel.startsWith(rawSkel) || rawSkel.startsWith(mSkel)) return m;
      }
    }
  }

  // Pass 5: Fallback exact across all master
  for (const m of masterList) {
    const mClean = cleanStr(m.destinationGodown);
    if (rawClean === mClean) return m;
    if (isAlias(rawClean, mClean)) return m;
    if (normalizeGodown(m.destinationGodown) === rawNorm) return m;
  }

  return null;
}

export default function LastMileMissingGodowns({ 
  rawData = [], 
  filteredData = [], 
  godownMasterList = [], 
  onUploadMaster, 
  onResetMaster, 
  masterFileName = '',
  reportTitle = '',
  setReportTitle,
  onSaveReportTitle,
  onResetReportTitle
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [viewFilter, setViewFilter] = useState('missing'); // 'missing' | 'matched' | 'all' | 'unmatched_report'
  const [dataScope, setDataScope] = useState('raw'); // 'raw' (Full File) | 'filtered' (Top Filter Bar)
  const fileInputRef = useRef(null);

  // Determine active rows based on dataScope
  const activeRows = useMemo(() => {
    if (dataScope === 'filtered' && filteredData && filteredData.length > 0) {
      return filteredData;
    }
    return (rawData && rawData.length > 0) ? rawData : (filteredData || []);
  }, [dataScope, rawData, filteredData]);

  // Check if top filter bar has active filters
  const isTopFilterActive = useMemo(() => {
    return Boolean(filteredData && rawData && filteredData.length > 0 && filteredData.length !== rawData.length);
  }, [rawData, filteredData]);

  // 1. Extract unique raw godowns present in activeRows
  const rawGodownInfo = useMemo(() => {
    const rawMap = new Map(); // key -> { name, district, id, count }

    (activeRows || []).forEach(row => {
      // Robust column resolution
      const gName = String(
        row.godown || row.godownName || row['GSCSCL Godown'] || row['Destination Godown'] || 
        row['Godown Name'] || row['Destination Name'] || row['Taluka Godown'] || row['Taluka'] || 
        row['Location Name'] || row['Lifting Location Name'] || row.destLoc || row.dest || row.godown_name || ''
      ).trim();

      let dist = String(
        row.district || row.District || row['District'] || row['TP District'] || 
        row['Godown District'] || row.district_name || row['District Name'] || ''
      ).trim();

      // Normalize Ahmedabad City vs Ahmedabad
      const cleanD = cleanStr(dist);
      const cleanG = cleanStr(gName);
      if (cleanG.startsWith('ahmedabadcity') || cleanD === 'ahmedabadcity') {
        dist = 'AHMEDABAD CITY';
      } else if (cleanD === 'ahmedabad') {
        dist = 'AHMEDABAD';
      }

      const id = String(
        row.godownId || row.godown_id || row['gscscl_godown_id'] || row['godown_id'] || 
        row['Godown ID'] || row['Taluka Godown ID'] || ''
      ).trim();

      if (gName && gName !== 'Unknown' && gName !== '(Blank Godown)') {
        const key = `${dist}|||${gName}`;
        if (!rawMap.has(key)) {
          rawMap.set(key, { name: gName, district: dist, id, count: 1 });
        } else {
          rawMap.get(key).count += 1;
        }
      }
    });

    return { rawList: Array.from(rawMap.values()), count: rawMap.size };
  }, [activeRows]);

  // 2. Perform intelligent bidirectional matching
  const { matchedList, missingList, allList, unmatchedReportList, districtsList } = useMemo(() => {
    const matchedMasterIds = new Set();
    const matchedRawKeys = new Set();
    const rawToMasterMap = new Map();
    const masterToRawMap = new Map();

    // Match each raw godown to master list
    rawGodownInfo.rawList.forEach(rawItem => {
      const match = findMasterMatch(rawItem.name, rawItem.district, rawItem.id, godownMasterList);
      if (match) {
        const mKey = `${match.district}|||${match.destinationGodown}`;
        matchedMasterIds.add(mKey);
        matchedRawKeys.add(`${rawItem.district}|||${rawItem.name}`);
        rawToMasterMap.set(`${rawItem.district}|||${rawItem.name}`, match);
        masterToRawMap.set(mKey, rawItem);
      }
    });

    // Also match master to raw directly for any missed cases
    godownMasterList.forEach(m => {
      const mKey = `${m.district}|||${m.destinationGodown}`;
      if (!matchedMasterIds.has(mKey)) {
        for (const rawItem of rawGodownInfo.rawList) {
          const rawKey = `${rawItem.district}|||${rawItem.name}`;
          if (!matchedRawKeys.has(rawKey)) {
            const match = findMasterMatch(rawItem.name, rawItem.district, rawItem.id, [m]);
            if (match) {
              matchedMasterIds.add(mKey);
              matchedRawKeys.add(rawKey);
              rawToMasterMap.set(rawKey, match);
              masterToRawMap.set(mKey, rawItem);
              break;
            }
          }
        }
      }
    });

    const matched = [];
    const missing = [];
    const all = [];
    const districts = new Set();

    godownMasterList.forEach((mItem, index) => {
      const mName = String(mItem.destinationGodown || mItem['Destination Godown'] || mItem.godown || '').trim();
      const mDist = String(mItem.district || mItem.District || 'Unknown').trim();
      const mId = String(mItem.godownId || mItem.gscscl_godown_id || mItem.id || '').trim();
      const mKey = `${mDist}|||${mName}`;

      if (mDist && mDist !== 'Unknown') {
        districts.add(mDist);
      }

      const isMatched = matchedMasterIds.has(mKey);
      const rawMatch = masterToRawMap.get(mKey);

      const itemData = {
        srNo: mItem.srNo || (index + 1),
        district: mDist,
        destinationGodown: mName,
        godownId: mId,
        isMatched,
        matchedRawName: rawMatch ? rawMatch.name : ''
      };

      all.push(itemData);
      if (isMatched) {
        matched.push(itemData);
      } else {
        missing.push(itemData);
      }
    });

    // Unmatched raw godowns (present in report but not identified in 244 master)
    const unmatchedReport = [];
    rawGodownInfo.rawList.forEach((rawItem, idx) => {
      const rawKey = `${rawItem.district}|||${rawItem.name}`;
      if (!matchedRawKeys.has(rawKey)) {
        unmatchedReport.push({
          srNo: idx + 1,
          district: rawItem.district || 'Unknown',
          destinationGodown: rawItem.name,
          godownId: rawItem.id || '',
          isMatched: false
        });
      }
    });

    // Sort missing by District then Godown
    missing.sort((a, b) => a.district.localeCompare(b.district) || a.destinationGodown.localeCompare(b.destinationGodown));
    matched.sort((a, b) => a.district.localeCompare(b.district) || a.destinationGodown.localeCompare(b.destinationGodown));
    all.sort((a, b) => a.district.localeCompare(b.district) || a.destinationGodown.localeCompare(b.destinationGodown));

    return {
      matchedList: matched,
      missingList: missing,
      allList: all,
      unmatchedReportList: unmatchedReport,
      districtsList: Array.from(districts).sort()
    };
  }, [godownMasterList, rawGodownInfo]);

  // 3. Filter rows based on viewFilter, search, and district
  const displayRows = useMemo(() => {
    let source = missingList;
    if (viewFilter === 'matched') source = matchedList;
    else if (viewFilter === 'all') source = allList;
    else if (viewFilter === 'unmatched_report') source = unmatchedReportList;

    return source.filter(row => {
      if (selectedDistrict !== 'All' && row.district !== selectedDistrict) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesGodown = row.destinationGodown.toLowerCase().includes(term);
        const matchesDist = row.district.toLowerCase().includes(term);
        const matchesId = String(row.godownId || '').toLowerCase().includes(term);
        return matchesGodown || matchesDist || matchesId;
      }
      return true;
    });
  }, [viewFilter, missingList, matchedList, allList, unmatchedReportList, selectedDistrict, searchTerm]);

  // Export to Excel
  const handleExportExcel = () => {
    const titleText = 'GSCSCL – Missing Godowns from Last Mile Report';
    const subtitleText = `Report generated on ${new Date().toLocaleDateString('en-GB')} compared with the ${godownMasterList.length} Active Godown Master List`;
    const summaryText = `Active master godowns: ${godownMasterList.length} | Godowns in report: ${rawGodownInfo.count} | Matched: ${matchedList.length} | Missing: ${missingList.length}`;

    const rowsData = displayRows.map((r, i) => ({
      'Sr. No.': i + 1,
      'District': r.district,
      'GSCSCL Godown': r.destinationGodown,
      'Godown ID': r.godownId || '',
      ...(viewFilter === 'all' ? { 'Status': r.isMatched ? 'Matched' : 'Missing' } : {})
    }));

    const ws = XLSX.utils.json_to_sheet(rowsData, { origin: 'A5' });

    XLSX.utils.sheet_add_aoa(ws, [
      [titleText],
      [subtitleText],
      [summaryText],
      []
    ], { origin: 'A1' });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Missing Godowns');

    const fileName = `GSCSCL_Missing_Godowns_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Export to PDF (Matches Exact Format, Colors & Design from Official Last Mile Report)
  const handleExportPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 8;
    const availableWidth = pageWidth - (marginX * 2); // 194mm

    // 1. Company Header (Black bold, centered, 20pt)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    const companyTitleStr = localStorage.getItem('companyTitle');
    const finalCompanyTitle = companyTitleStr === null ? 'FarEye Technologies Pvt. Ltd.' : companyTitleStr;
    if (finalCompanyTitle.trim() !== '') {
      doc.text(finalCompanyTitle, pageWidth / 2, 17, { align: 'center' });
    }

    // 2. Report Title inside Grey Pill Box (Exact match to official report)
    const titleToUse = reportTitle && reportTitle.trim() ? reportTitle.trim() : 'GSCSCL \u2013 Missing Godowns from Last Mile Report';
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    const titleWidth = doc.getTextWidth(titleToUse);
    const padding = 10;
    const boxHeight = 8;
    const boxX = (pageWidth - (titleWidth + padding)) / 2;
    const boxY = 20;

    doc.setFillColor(240, 240, 240);
    doc.rect(boxX, boxY, titleWidth + padding, boxHeight, 'F');
    doc.setTextColor(0, 0, 0);
    doc.text(titleToUse, pageWidth / 2, 26, { align: 'center' });

    // Separator line below title
    doc.setLineWidth(0.5);
    doc.setDrawColor(200, 200, 200);
    doc.line(10, 31, pageWidth - 10, 31);

    // 3. Top Summary KPI Box (Perfect 4-column responsive grid with dividers and centered text)
    const stripY = 33;
    const stripHeight = 8;
    const colW = availableWidth / 4; // 48.5mm each

    // Background
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(marginX, stripY, availableWidth, stripHeight, 1.2, 1.2, 'F');

    // Highlight Cell 4 (Missing Godowns) in light red
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(marginX + (colW * 3), stripY, colW, stripHeight, 1.2, 1.2, 'F');

    // Outer border
    doc.setDrawColor(200, 210, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, stripY, availableWidth, stripHeight, 1.2, 1.2, 'S');

    // Vertical Divider lines
    doc.setDrawColor(215, 225, 235);
    doc.setLineWidth(0.25);
    doc.line(marginX + colW, stripY, marginX + colW, stripY + stripHeight);
    doc.line(marginX + (colW * 2), stripY, marginX + (colW * 2), stripY + stripHeight);
    doc.line(marginX + (colW * 3), stripY, marginX + (colW * 3), stripY + stripHeight);

    // Centered labels & counts
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');

    doc.setTextColor(30, 41, 59);
    doc.text(`Active Master Godowns: ${godownMasterList.length}`, marginX + (colW * 0.5), stripY + 5.2, { align: 'center' });

    doc.setTextColor(30, 41, 59);
    doc.text(`In Report: ${rawGodownInfo.count}`, marginX + (colW * 1.5), stripY + 5.2, { align: 'center' });

    doc.setTextColor(22, 101, 52); // green
    doc.text(`Matched: ${matchedList.length}`, marginX + (colW * 2.5), stripY + 5.2, { align: 'center' });

    doc.setTextColor(220, 38, 38); // red
    doc.text(`Missing Godowns: ${missingList.length}`, marginX + (colW * 3.5), stripY + 5.2, { align: 'center' });

    // 4. District Wise Subtotals Table (Properly adjusted totals and responsive layout)
    const isAllView = viewFilter === 'all';
    const headRow = isAllView 
      ? ['Sr. No.', 'District', 'GSCSCL Godown', 'Status'] 
      : ['Sr. No.', 'District', 'GSCSCL Godown'];

    const districtMap = new Map();
    displayRows.forEach(row => {
      const dist = row.district || 'Unknown';
      if (!districtMap.has(dist)) districtMap.set(dist, []);
      districtMap.get(dist).push(row);
    });

    let srNo = 1;
    const tableBody = [];

    districtMap.forEach((godowns, district) => {
      godowns.forEach(g => {
        if (isAllView) {
          tableBody.push([srNo++, district, g.destinationGodown, g.isMatched ? 'Matched' : 'Missing']);
        } else {
          tableBody.push([srNo++, district, g.destinationGodown]);
        }
      });

      // District Subtotal Row (Properly styled and right-aligned count)
      const subtotalColSpan = isAllView ? 3 : 2;
      tableBody.push([
        {
          content: `${district} Total`,
          colSpan: subtotalColSpan,
          styles: { fontStyle: 'bold', fillColor: [217, 217, 217], textColor: [0, 0, 0], halign: 'left', cellPadding: 2.5 }
        },
        {
          content: `${godowns.length} Missing`,
          styles: { fontStyle: 'bold', fillColor: [217, 217, 217], textColor: [0, 0, 0], halign: 'right', cellPadding: 2.5 }
        }
      ]);
    });

    // Grand Total Row (Peach [252, 213, 180] with right-aligned total count)
    const grandColSpan = isAllView ? 3 : 2;
    tableBody.push([
      {
        content: 'Grand Total',
        colSpan: grandColSpan,
        styles: { fontStyle: 'bold', fillColor: [252, 213, 180], textColor: [0, 0, 0], halign: 'center', cellPadding: 3 }
      },
      {
        content: `${displayRows.length} Missing Godowns`,
        styles: { fontStyle: 'bold', fillColor: [252, 213, 180], textColor: [0, 0, 0], halign: 'right', cellPadding: 3 }
      }
    ]);

    autoTable(doc, {
      startY: 43,
      head: [headRow],
      body: tableBody,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.2, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1 },
      headStyles: { fillColor: [180, 198, 231], textColor: [15, 23, 42], fontStyle: 'bold', halign: 'center', valign: 'middle' },
      columnStyles: isAllView ? {
        0: { cellWidth: 16, halign: 'center' },
        1: { cellWidth: 50, halign: 'left' },
        2: { halign: 'left' },
        3: { cellWidth: 26, halign: 'center' }
      } : {
        0: { cellWidth: 18, halign: 'center' },
        1: { cellWidth: 52, halign: 'left' },
        2: { halign: 'left' }
      },
      margin: { left: marginX, right: marginX, top: 10, bottom: 15 },
      didDrawPage: (data) => {
        // FarEye Center Watermark
        doc.setGState(new doc.GState({ opacity: 0.15 }));
        doc.setFontSize(80);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'bold');
        const defaultWatermark = companyTitleStr === null ? 'FarEye' : (companyTitleStr ? companyTitleStr.split(' ')[0] : '');
        if (defaultWatermark.trim() !== '') {
          const textWidth = doc.getTextWidth(defaultWatermark);
          const x = (pageWidth - textWidth) / 2;
          const y = pageHeight / 2;
          doc.text(defaultWatermark, x, y);
        }
        doc.setGState(new doc.GState({ opacity: 1.0 }));

        // Footer Line and Page Number
        doc.setLineWidth(0.5);
        doc.setDrawColor(200, 200, 200);
        doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Page ' + data.pageNumber, pageWidth - 14, pageHeight - 10, { align: 'right' });
      }
    });

    const safeTitle = (titleToUse).replace(/[^a-z0-9]/gi, '_');
    doc.save(`${safeTitle}.pdf`);
  };

  const handleMasterFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (onUploadMaster) {
      onUploadMaster(file);
    }
  };

  return (
    <div style={{ marginTop: '8px' }}>
      {/* Top Filter Bar Notification & Data Scope Switch */}
      {isTopFilterActive && (
        <div style={{
          marginBottom: '14px', padding: '10px 16px', borderRadius: '8px',
          background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', color: 'var(--text-main)' }}>
            <Filter size={16} style={{ color: '#3b82f6' }} />
            <span>
              Top filter bar is active (Showing {activeRows.length.toLocaleString()} of {rawData.length.toLocaleString()} raw records).
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Comparison Source:</span>
            <button
              type="button"
              onClick={() => setDataScope('raw')}
              style={{
                padding: '4px 10px', fontSize: '0.78rem', borderRadius: '4px', border: 'none', cursor: 'pointer',
                background: dataScope === 'raw' ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                color: dataScope === 'raw' ? '#fff' : 'var(--text-muted)',
                fontWeight: dataScope === 'raw' ? '600' : 'normal'
              }}
            >
              Full Raw File ({rawData.length.toLocaleString()} rows)
            </button>
            <button
              type="button"
              onClick={() => setDataScope('filtered')}
              style={{
                padding: '4px 10px', fontSize: '0.78rem', borderRadius: '4px', border: 'none', cursor: 'pointer',
                background: dataScope === 'filtered' ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                color: dataScope === 'filtered' ? '#fff' : 'var(--text-muted)',
                fontWeight: dataScope === 'filtered' ? '600' : 'normal'
              }}
            >
              Filtered Data ({filteredData.length.toLocaleString()} rows)
            </button>
          </div>
        </div>
      )}

      {/* 4 Summary KPI Cards */}
      <div className="dashboard-grid" style={{ marginBottom: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
        <div className="kpi-card" style={{ padding: '16px 20px', borderRadius: '10px', borderLeft: '4px solid #3b82f6', background: 'var(--bg-panel)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="kpi-title" style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Master Godowns</div>
              <div className="kpi-value" style={{ fontSize: '1.9rem', fontWeight: '700', marginTop: '4px', color: '#3b82f6' }}>
                {godownMasterList.length}
              </div>
            </div>
            <div style={{ padding: '10px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <Building2 size={24} />
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '16px 20px', borderRadius: '10px', borderLeft: '4px solid #06b6d4', background: 'var(--bg-panel)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="kpi-title" style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Godowns in Report</div>
              <div className="kpi-value" style={{ fontSize: '1.9rem', fontWeight: '700', marginTop: '4px', color: '#06b6d4' }}>
                {rawGodownInfo.count}
              </div>
            </div>
            <div style={{ padding: '10px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4' }}>
              <Eye size={24} />
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '16px 20px', borderRadius: '10px', borderLeft: '4px solid #10b981', background: 'var(--bg-panel)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="kpi-title" style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Matched Godowns</div>
              <div className="kpi-value" style={{ fontSize: '1.9rem', fontWeight: '700', marginTop: '4px', color: '#10b981' }}>
                {matchedList.length}
              </div>
            </div>
            <div style={{ padding: '10px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <CheckCircle2 size={24} />
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '16px 20px', borderRadius: '10px', borderLeft: '4px solid #ef4444', background: 'var(--bg-panel)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="kpi-title" style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Missing Godowns</div>
              <div className="kpi-value" style={{ fontSize: '1.9rem', fontWeight: '700', marginTop: '4px', color: '#ef4444' }}>
                {missingList.length}
              </div>
            </div>
            <div style={{ padding: '10px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <AlertTriangle size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Control Strip & Filter Bar */}
      <div className="glass-panel" style={{ padding: '14px 18px', marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Left: View Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.15)', padding: '3px', borderRadius: '8px' }}>
          <button 
            type="button"
            onClick={() => setViewFilter('missing')}
            style={{
              padding: '6px 14px', borderRadius: '6px', fontSize: '0.84rem', fontWeight: '600', border: 'none', cursor: 'pointer',
              background: viewFilter === 'missing' ? '#ef4444' : 'transparent',
              color: viewFilter === 'missing' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s ease'
            }}
          >
            Missing ({missingList.length})
          </button>
          <button 
            type="button"
            onClick={() => setViewFilter('matched')}
            style={{
              padding: '6px 14px', borderRadius: '6px', fontSize: '0.84rem', fontWeight: '600', border: 'none', cursor: 'pointer',
              background: viewFilter === 'matched' ? '#10b981' : 'transparent',
              color: viewFilter === 'matched' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s ease'
            }}
          >
            Matched ({matchedList.length})
          </button>
          <button 
            type="button"
            onClick={() => setViewFilter('all')}
            style={{
              padding: '6px 14px', borderRadius: '6px', fontSize: '0.84rem', fontWeight: '600', border: 'none', cursor: 'pointer',
              background: viewFilter === 'all' ? 'var(--primary-color)' : 'transparent',
              color: viewFilter === 'all' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s ease'
            }}
          >
            All Master ({godownMasterList.length})
          </button>
          {unmatchedReportList.length > 0 && (
            <button 
              type="button"
              onClick={() => setViewFilter('unmatched_report')}
              style={{
                padding: '6px 12px', borderRadius: '6px', fontSize: '0.84rem', fontWeight: '600', border: 'none', cursor: 'pointer',
                background: viewFilter === 'unmatched_report' ? '#f59e0b' : 'transparent',
                color: viewFilter === 'unmatched_report' ? '#fff' : '#f59e0b',
                transition: 'all 0.2s ease'
              }}
              title="Godowns found in raw report that do not match the Master list"
            >
              Extra in Report ({unmatchedReportList.length})
            </button>
          )}
        </div>

        {/* Center: Search & District Filter */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: '260px', maxWidth: '500px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text"
              placeholder="Search Godown, District..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '7px 10px 7px 32px', borderRadius: '6px',
                background: 'var(--bg-main)', border: '1px solid var(--border-color)',
                color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none'
              }}
            />
          </div>

          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            style={{
              padding: '7px 12px', borderRadius: '6px',
              background: 'var(--bg-main)', border: '1px solid var(--border-color)',
              color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer'
            }}
          >
            <option value="All">All Districts ({districtsList.length})</option>
            {districtsList.map(dist => (
              <option key={dist} value={dist}>{dist}</option>
            ))}
          </select>
        </div>

        {/* Right: Master Upload & Exports */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleMasterFileChange}
            accept=".xlsx, .xls, .csv"
            style={{ display: 'none' }}
          />

          <button
            type="button"
            className="btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            style={{ padding: '7px 12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Upload an updated GSCSCL Godown Master Excel/CSV file"
          >
            <UploadCloud size={14} />
            <span>{masterFileName ? 'Update Master' : 'Upload Master'}</span>
          </button>

          {masterFileName && onResetMaster && (
            <button
              type="button"
              className="btn-secondary"
              onClick={onResetMaster}
              style={{ padding: '7px 10px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Reset to default GSCSCL Godown Master list"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            className="btn-secondary"
            onClick={handleExportPDF}
            style={{ padding: '7px 12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px' }}
            title="Export Missing Godowns report as formatted PDF"
          >
            <FileDown size={14} />
            <span>PDF</span>
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={handleExportExcel}
            style={{ padding: '7px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '5px' }}
            title="Export table to Excel"
          >
            <FileSpreadsheet size={14} />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="table-container" style={{ marginTop: 0 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '80px', textAlign: 'center' }}>Sr. No.</th>
              <th style={{ width: '220px' }}>District</th>
              <th>GSCSCL Godown</th>
              {viewFilter === 'all' && <th style={{ width: '130px', textAlign: 'center' }}>Status</th>}
              {viewFilter === 'matched' && <th style={{ width: '220px' }}>Matched Raw Name in File</th>}
            </tr>
          </thead>
          <tbody>
            {displayRows.length === 0 ? (
              <tr>
                <td colSpan={viewFilter === 'all' || viewFilter === 'matched' ? 4 : 3} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  No godowns found matching the current search or filters.
                </td>
              </tr>
            ) : (
              displayRows.map((row, index) => (
                <tr key={`${row.district}_${row.destinationGodown}_${index}`} className="data-row">
                  <td style={{ textAlign: 'center', fontWeight: '500' }}>{index + 1}</td>
                  <td style={{ fontWeight: '600' }}>{row.district}</td>
                  <td>
                    <span style={{ fontWeight: '500' }}>{row.destinationGodown}</span>
                    {row.godownId && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                        (ID: {row.godownId})
                      </span>
                    )}
                  </td>
                  {viewFilter === 'all' && (
                    <td style={{ textAlign: 'center' }}>
                      <span 
                        style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '0.78rem',
                          fontWeight: '600',
                          background: row.isMatched ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: row.isMatched ? '#10b981' : '#ef4444'
                        }}
                      >
                        {row.isMatched ? 'Matched' : 'Missing'}
                      </span>
                    </td>
                  )}
                  {viewFilter === 'matched' && (
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {row.matchedRawName || row.destinationGodown}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Summary Bar */}
      <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <div>
          Showing <strong>{displayRows.length}</strong> of <strong>{viewFilter === 'missing' ? missingList.length : (viewFilter === 'matched' ? matchedList.length : (viewFilter === 'unmatched_report' ? unmatchedReportList.length : allList.length))}</strong> godowns
          {selectedDistrict !== 'All' && <span> in <strong>{selectedDistrict}</strong></span>}
        </div>
        <div style={{ fontWeight: '600', color: viewFilter === 'missing' ? '#ef4444' : 'var(--text-main)' }}>
          {viewFilter === 'missing' ? `Total Missing Godowns: ${missingList.length}` : `Master List: ${godownMasterList.length} Active Godowns`}
        </div>
      </div>
    </div>
  );
}
