import ExcelJS from 'exceljs';

/**
 * Export Amul THR KPI Dashboard to Beautifully Styled, Colorful Master Excel (.xlsx)
 * Matches the exact executive design, color scheme, and typography of the PDF Report.
 * 
 * @param {Object} data Processed Amul data (kpis, plants, transporters, districts, routes, records)
 * @param {string} customTitle Optional customized title with date
 */
export async function exportAmulExcel(data, customTitle = '') {
  const { records = [], kpis = {}, plants = [], transporters = [], districts = [], routes = [] } = data;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'GCMMF Amul THR Intelligence Portal';
  wb.lastModifiedBy = 'GCMMF Amul THR Intelligence Portal';
  wb.created = new Date();
  wb.modified = new Date();

  // Color Palette matching PDF Report
  const C_NAVY = 'FF1A365D';       // Deep Navy #1A365D
  const C_BLUE = 'FF1E3A8A';       // Brand Blue #1E3A8A
  const C_AMUL_RED = 'FFE31E24';   // Amul Red #E31E24
  const C_WHITE = 'FFFFFFFF';
  const C_BORDER = 'FFE2E8F0';     // Slate border #E2E8F0
  const C_TEXT_DARK = 'FF0F172A';  // Slate-900 #0F172A
  const C_TEXT_MUTED = 'FF475569'; // Slate-600 #475569
  const C_TEXT_DIM = 'FF64748B';   // Slate-500 #64748B
  const C_ZEBRA = 'FFF8FAFC';      // Soft gray row fill
  const C_TOTAL = 'FFF1F5F9';      // Totals row fill

  // Badges & Accent fills
  const C_GREEN_BG = 'FFECFDF5';
  const C_GREEN_TXT = 'FF059669';
  const C_RED_BG = 'FFFEF2F2';
  const C_RED_TXT = 'FFDC2626';
  const C_AMBER_BG = 'FFFEF3C7';
  const C_AMBER_TXT = 'FFD97706';
  const C_BLUE_BG = 'FFEFF6FF';
  const C_BLUE_TXT = 'FF2563EB';

  const thinBorder = {
    top: { style: 'thin', color: { argb: C_BORDER } },
    left: { style: 'thin', color: { argb: C_BORDER } },
    bottom: { style: 'thin', color: { argb: C_BORDER } },
    right: { style: 'thin', color: { argb: C_BORDER } }
  };

  const headerBorder = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'medium', color: { argb: 'FF94A3B8' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
  };

  const totalBorder = {
    top: { style: 'thin', color: { argb: 'FF94A3B8' } },
    left: { style: 'thin', color: { argb: C_BORDER } },
    bottom: { style: 'double', color: { argb: 'FF1E293B' } },
    right: { style: 'thin', color: { argb: C_BORDER } }
  };

  // =========================================================================
  // SHEET 1: KPI DASHBOARD (EXECUTIVE VIEW)
  // =========================================================================
  const ws1 = wb.addWorksheet('KPI Dashboard', {
    views: [{ showGridLines: true }]
  });

  ws1.columns = [
    { key: 'colA', width: 22 }, // Plant / Dairy
    { key: 'colB', width: 26 }, // District / Location
    { key: 'colC', width: 14 }, // Trips
    { key: 'colD', width: 14 }, // Routes
    { key: 'colE', width: 14 }, // Sejas
    { key: 'colF', width: 22 }, // Qty (Kg)
    { key: 'colG', width: 16 }, // Delivered
    { key: 'colH', width: 16 }, // Pending
    { key: 'colI', width: 18 }, // Delivery %
    { key: 'colJ', width: 16 }, // Tracked
    { key: 'colK', width: 16 }, // Tracking %
    { key: 'colL', width: 28 }  // Status
  ];

  // 1. Top Government Header Banner
  ws1.mergeCells('A1:L1');
  const cellA1 = ws1.getCell('A1');
  cellA1.value = 'GOVERNMENT OF GUJARAT   |   WOMEN & CHILD DEVELOPMENT DEPARTMENT (ICDS)   |   GCMMF (AMUL)';
  cellA1.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C_WHITE } };
  cellA1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_NAVY } };
  cellA1.alignment = { horizontal: 'center', vertical: 'middle' };
  ws1.getRow(1).height = 26;

  // 2. Title with Custom Title & Date
  const finalTitle = (customTitle && customTitle.trim())
    ? customTitle.trim().toUpperCase()
    : `AMUL TAKE HOME RATION (THR) LOGISTICS & DISPATCH KPI DASHBOARD - ${kpis.dateRange || 'ALL DISPATCHES'}`;
  
  ws1.mergeCells('A2:L2');
  const cellA2 = ws1.getCell('A2');
  cellA2.value = finalTitle;
  cellA2.font = { name: 'Calibri', size: 14, bold: true, color: { argb: C_NAVY } };
  cellA2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws1.getRow(2).height = 28;

  // 3. Subtitle Row
  ws1.mergeCells('A3:L3');
  const cellA3 = ws1.getCell('A3');
  cellA3.value = `Logistics Cycle: ${kpis.mdoCycle || 'THR MDO November 2026'}   |   Covered Plants: Banas, Kaira, Sumul   |   Statewide THR Monitoring`;
  cellA3.font = { name: 'Calibri', size: 9.5, italic: true, color: { argb: C_TEXT_DIM } };
  cellA3.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws1.getRow(3).height = 20;

  // 4. Notice Banner
  ws1.mergeCells('A4:L4');
  const cellA4 = ws1.getCell('A4');
  cellA4.value = '📊 ALL-IN-ONE MASTER KPI DASHBOARD   |   Real-Time Delivery Verification & GPS Telemetry Scorecard';
  cellA4.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: C_BLUE_TXT } };
  cellA4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_BLUE_BG } };
  cellA4.alignment = { horizontal: 'center', vertical: 'middle' };
  cellA4.border = thinBorder;
  ws1.getRow(4).height = 22;

  // Row 5: Spacer
  ws1.getRow(5).height = 10;

  // 5. Executive KPI Summary Cards (Rows 6 to 8)
  const kpiCards = [
    { title: 'DISPATCHED QUANTITY', val: `${Number(kpis.totalQty || 0).toLocaleString('en-IN')} Kg`, sub: `${kpis.totalQtyMt || 0} Metric Tonnes`, bg: C_BLUE_BG, tc: C_BLUE_TXT },
    { title: 'CONSIGNMENTS / TRIPS', val: `${kpis.totalTrips || 0} LRs`, sub: `${kpis.totalVehicles || 0} Dedicated Trucks`, bg: 'FFF5F3FF', tc: 'FF6D28D9' },
    { title: 'DISTRIBUTION ROUTES', val: `${kpis.totalRoutes || 0} Routes`, sub: `${kpis.deliveredRoutes || 0} Delivered (${kpis.deliveryRate || 0}%)`, bg: 'FFECFEFF', tc: 'FF0E7490' },
    { title: 'ANGANWADI CENTERS', val: `${kpis.totalSejas || 0} Sejas`, sub: `${kpis.deliveredSejas || 0} Centers Delivered`, bg: C_GREEN_BG, tc: C_GREEN_TXT },
    { title: 'GPS TRACKING SLA', val: `${kpis.trackingRate || 0}%`, sub: `${kpis.trackedRoutes || 0} Tracked / ${kpis.untrackedRoutes || 0} Untracked`, bg: 'FFF0FDF4', tc: 'FF15803D' },
    { title: 'PENDING ROUTES', val: `${kpis.pendingRoutes || 0} Routes`, sub: `${(100 - parseFloat(kpis.deliveryRate || 0)).toFixed(1)}% Delivery In Transit`, bg: C_RED_BG, tc: C_RED_TXT }
  ];

  // Render 6 cards across columns (A:B, C:D, E:F, G:H, I:J, K:L)
  const cardCols = [
    { start: 'A', end: 'B' },
    { start: 'C', end: 'D' },
    { start: 'E', end: 'F' },
    { start: 'G', end: 'H' },
    { start: 'I', end: 'J' },
    { start: 'K', end: 'L' }
  ];

  cardCols.forEach((cols, i) => {
    const card = kpiCards[i];
    // Card Title (Row 6)
    ws1.mergeCells(`${cols.start}6:${cols.end}6`);
    const cTitle = ws1.getCell(`${cols.start}6`);
    cTitle.value = card.title;
    cTitle.font = { name: 'Calibri', size: 8, bold: true, color: { argb: C_TEXT_MUTED } };
    cTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: card.bg } };
    cTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    cTitle.border = { top: thinBorder.top, left: thinBorder.left, right: thinBorder.right };

    // Card Value (Row 7)
    ws1.mergeCells(`${cols.start}7:${cols.end}7`);
    const cVal = ws1.getCell(`${cols.start}7`);
    cVal.value = card.val;
    cVal.font = { name: 'Calibri', size: 14, bold: true, color: { argb: card.tc } };
    cVal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: card.bg } };
    cVal.alignment = { horizontal: 'center', vertical: 'middle' };
    cVal.border = { left: thinBorder.left, right: thinBorder.right };

    // Card Subtitle (Row 8)
    ws1.mergeCells(`${cols.start}8:${cols.end}8`);
    const cSub = ws1.getCell(`${cols.start}8`);
    cSub.value = card.sub;
    cSub.font = { name: 'Calibri', size: 8, color: { argb: C_TEXT_DIM } };
    cSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: card.bg } };
    cSub.alignment = { horizontal: 'center', vertical: 'middle' };
    cSub.border = { bottom: thinBorder.bottom, left: thinBorder.left, right: thinBorder.right };
  });

  ws1.getRow(6).height = 18;
  ws1.getRow(7).height = 24;
  ws1.getRow(8).height = 18;

  // Row 9: Spacer
  ws1.getRow(9).height = 12;

  // =========================================================================
  // TABLE 1: PLANT / COOPERATIVE UNION PERFORMANCE SUMMARY
  // =========================================================================
  let currentRow = 10;
  ws1.mergeCells(`A${currentRow}:L${currentRow}`);
  const t1Head = ws1.getCell(`A${currentRow}`);
  t1Head.value = '1. PLANT-LEVEL DISPATCH & DELIVERY PERFORMANCE SUMMARY';
  t1Head.font = { name: 'Calibri', size: 11, bold: true, color: { argb: C_WHITE } };
  t1Head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_NAVY } };
  t1Head.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws1.getRow(currentRow).height = 24;

  currentRow++;
  const t1Cols = [
    'Plant / Nodal Dairy', 'Manufacturing Location', 'Trips (LRs)', 'Routes', 'Sejas',
    'Dispatched Qty (Kg)', 'Delivered Routes', 'Pending Routes', 'Delivery Rate %',
    'GPS Tracked', 'Tracking %', 'Operational Status'
  ];

  const t1HeaderRow = ws1.getRow(currentRow);
  t1HeaderRow.height = 24;
  t1Cols.forEach((colTitle, idx) => {
    const cell = t1HeaderRow.getCell(idx + 1);
    cell.value = colTitle;
    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: C_WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_BLUE } };
    cell.alignment = { horizontal: (idx === 0 || idx === 1) ? 'left' : (idx === 5 ? 'right' : 'center'), vertical: 'middle' };
    cell.border = headerBorder;
  });

  // Table 1 Data Rows
  plants.forEach((p, idx) => {
    currentRow++;
    const row = ws1.getRow(currentRow);
    row.height = 21;
    const isZebra = idx % 2 === 1;
    const rowBg = isZebra ? C_ZEBRA : C_WHITE;

    const delVal = p.delRoutes ?? 0;
    const pendVal = p.pendRoutes ?? 0;
    const delPctVal = parseFloat(p.delPct ?? 0) / 100;
    const trkPctVal = parseFloat(p.trkPct ?? 0) / 100;

    row.values = [
      p.name,
      p.location || 'Gujarat Hub',
      p.trips ?? 0,
      p.routes ?? 0,
      p.sejas ?? 0,
      p.qty ?? 0,
      delVal,
      pendVal,
      delPctVal,
      p.trkRoutes ?? 0,
      trkPctVal,
      p.statusText || 'In Transit'
    ];

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 9.5, color: { argb: C_TEXT_DARK } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cell.border = thinBorder;
      cell.alignment = { vertical: 'middle', horizontal: (colNumber <= 2) ? 'left' : (colNumber === 6 ? 'right' : 'center') };

      // Number formatting
      if (colNumber === 6) cell.numFmt = '#,##0.0';
      if (colNumber === 7) cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: C_GREEN_TXT } };
      if (colNumber === 8) cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: pendVal > 0 ? C_RED_TXT : C_GREEN_TXT } };
      if (colNumber === 9 || colNumber === 11) cell.numFmt = '0.0%';

      // Status Badge Cell
      if (colNumber === 12) {
        const isTarget = delPctVal >= 1;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isTarget ? C_GREEN_BG : (trkPctVal < 0.9 ? C_RED_BG : C_AMBER_BG) } };
        cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: isTarget ? C_GREEN_TXT : (trkPctVal < 0.9 ? C_RED_TXT : C_AMBER_TXT) } };
      }
    });
  });

  // Table 1 Total Row
  currentRow++;
  const t1TotRow = ws1.getRow(currentRow);
  t1TotRow.height = 22;
  t1TotRow.values = [
    'Grand Total', 'All 3 Plants', kpis.totalTrips || 0, kpis.totalRoutes || 0, kpis.totalSejas || 0,
    kpis.totalQty || 0, kpis.deliveredRoutes || 0, kpis.pendingRoutes || 0,
    parseFloat(kpis.deliveryRate || 0) / 100, kpis.trackedRoutes || 0,
    parseFloat(kpis.trackingRate || 0) / 100, 'Statewide Operations'
  ];

  t1TotRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: C_TEXT_DARK } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_TOTAL } };
    cell.border = totalBorder;
    cell.alignment = { vertical: 'middle', horizontal: (colNumber <= 2) ? 'left' : (colNumber === 6 ? 'right' : 'center') };
    if (colNumber === 6) cell.numFmt = '#,##0.0';
    if (colNumber === 7) cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: C_GREEN_TXT } };
    if (colNumber === 8) cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: kpis.pendingRoutes > 0 ? C_RED_TXT : C_GREEN_TXT } };
    if (colNumber === 9 || colNumber === 11) cell.numFmt = '0.0%';
  });

  // Spacer
  currentRow++;
  ws1.getRow(currentRow).height = 14;

  // =========================================================================
  // TABLE 2: TRANSPORTER SLA & MONITORING SCORECARD
  // =========================================================================
  currentRow++;
  ws1.mergeCells(`A${currentRow}:L${currentRow}`);
  const t2Head = ws1.getCell(`A${currentRow}`);
  t2Head.value = `2. TRANSPORTER SLA & MONITORING SCORECARD (${transporters.length} ACTIVE LOGISTICS PARTNERS)`;
  t2Head.font = { name: 'Calibri', size: 11, bold: true, color: { argb: C_WHITE } };
  t2Head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_NAVY } };
  t2Head.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws1.getRow(currentRow).height = 24;

  currentRow++;
  const t2Cols = [
    'Transporter Partner Name', 'Nodal Dairy', 'Total Routes', 'Sejas Drops', 'Dispatched Qty (Kg)',
    'Delivered Blocks', 'Pending Blocks', 'Delivery Ration %', 'GPS Tracked', 'Untracked Routes',
    'Tracking %', 'SLA Compliance Status'
  ];

  const t2HeaderRow = ws1.getRow(currentRow);
  t2HeaderRow.height = 24;
  t2Cols.forEach((colTitle, idx) => {
    const cell = t2HeaderRow.getCell(idx + 1);
    cell.value = colTitle;
    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: C_WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_BLUE } };
    cell.alignment = { horizontal: (idx === 0) ? 'left' : (idx === 4 ? 'right' : 'center'), vertical: 'middle' };
    cell.border = headerBorder;
  });

  // Table 2 Data Rows
  transporters.forEach((t, idx) => {
    currentRow++;
    const row = ws1.getRow(currentRow);
    row.height = 20;
    const isZebra = idx % 2 === 1;
    const rowBg = isZebra ? C_ZEBRA : C_WHITE;

    const delBlocks = t.deliveredBlocks ?? t.deliveredRoutes ?? 0;
    const pendBlocks = t.pendingBlocks ?? t.pendingRoutes ?? 0;
    const delRatioVal = parseFloat(t.deliveryRatioPct ?? t.deliveryRate ?? 0) / 100;
    const trkRatioVal = parseFloat(t.trackingRate ?? t.trkPct ?? 0) / 100;

    row.values = [
      t.name,
      t.plant,
      t.routes ?? 0,
      t.sejas ?? 0,
      t.qty ?? 0,
      delBlocks,
      pendBlocks,
      delRatioVal,
      t.tracked ?? t.trkRoutes ?? 0,
      t.untracked ?? t.untrkRoutes ?? 0,
      trkRatioVal,
      t.statusText || 'Compliant'
    ];

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 9.5, color: { argb: C_TEXT_DARK } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cell.border = thinBorder;
      cell.alignment = { vertical: 'middle', horizontal: (colNumber === 1) ? 'left' : (colNumber === 5 ? 'right' : 'center') };

      if (colNumber === 5) cell.numFmt = '#,##0.0';
      
      // User Requested Columns: Delivered Blocks & Pending Blocks & Delivery Ration %
      if (colNumber === 6) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_GREEN_BG } };
        cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: C_GREEN_TXT } };
      }
      if (colNumber === 7) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: pendBlocks > 0 ? C_RED_BG : C_GREEN_BG } };
        cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: pendBlocks > 0 ? C_RED_TXT : C_GREEN_TXT } };
      }
      if (colNumber === 8) {
        cell.numFmt = '0.0%';
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_BLUE_BG } };
        cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: C_BLUE_TXT } };
      }
      if (colNumber === 11) cell.numFmt = '0.0%';

      // Status Badge
      if (colNumber === 12) {
        const isComp = delRatioVal >= 1;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isComp ? C_GREEN_BG : (trkRatioVal < 0.9 ? C_RED_BG : C_AMBER_BG) } };
        cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: isComp ? C_GREEN_TXT : (trkRatioVal < 0.9 ? C_RED_TXT : C_AMBER_TXT) } };
      }
    });
  });

  // Table 2 Total Row
  currentRow++;
  const t2TotRow = ws1.getRow(currentRow);
  t2TotRow.height = 22;
  t2TotRow.values = [
    'Grand Total', 'All Transporters', kpis.totalRoutes || 0, kpis.totalSejas || 0, kpis.totalQty || 0,
    kpis.deliveredRoutes || 0, kpis.pendingRoutes || 0, parseFloat(kpis.deliveryRate || 0) / 100,
    kpis.trackedRoutes || 0, kpis.untrackedRoutes || 0, parseFloat(kpis.trackingRate || 0) / 100,
    'Fleet Audited'
  ];

  t2TotRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: C_TEXT_DARK } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_TOTAL } };
    cell.border = totalBorder;
    cell.alignment = { vertical: 'middle', horizontal: (colNumber === 1) ? 'left' : (colNumber === 5 ? 'right' : 'center') };
    if (colNumber === 5) cell.numFmt = '#,##0.0';
    if (colNumber === 6) cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: C_GREEN_TXT } };
    if (colNumber === 7) cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: kpis.pendingRoutes > 0 ? C_RED_TXT : C_GREEN_TXT } };
    if (colNumber === 8 || colNumber === 11) cell.numFmt = '0.0%';
  });

  // Spacer
  currentRow++;
  ws1.getRow(currentRow).height = 14;

  // =========================================================================
  // TABLE 3: DISTRICT-WISE THR DISTRIBUTION MATRIX
  // =========================================================================
  currentRow++;
  ws1.mergeCells(`A${currentRow}:L${currentRow}`);
  const t3Head = ws1.getCell(`A${currentRow}`);
  t3Head.value = `3. DISTRICT-WISE THR DISTRIBUTION MATRIX (${districts.length} DISTRICTS COVERED)`;
  t3Head.font = { name: 'Calibri', size: 11, bold: true, color: { argb: C_WHITE } };
  t3Head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_NAVY } };
  t3Head.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws1.getRow(currentRow).height = 24;

  currentRow++;
  const t3Cols = [
    'Nodal Dairy (Col A)', 'District Name (Col B)', 'Routes Covered', 'Sejas Covered', 'Dispatched Qty (Kg)',
    'Delivered Sejas', 'Pending Sejas', 'Seja Fulfillment %', 'GPS Tracked Sejas', 'Untracked Sejas',
    'GPS Tracking %', 'District Status'
  ];

  const t3HeaderRow = ws1.getRow(currentRow);
  t3HeaderRow.height = 24;
  t3Cols.forEach((colTitle, idx) => {
    const cell = t3HeaderRow.getCell(idx + 1);
    cell.value = colTitle;
    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: C_WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_BLUE } };
    cell.alignment = { horizontal: (idx <= 1) ? 'left' : (idx === 4 ? 'right' : 'center'), vertical: 'middle' };
    cell.border = headerBorder;
  });

  // Table 3 Data Rows
  districts.forEach((d, idx) => {
    currentRow++;
    const row = ws1.getRow(currentRow);
    row.height = 20;
    const isZebra = idx % 2 === 1;
    const rowBg = isZebra ? C_ZEBRA : C_WHITE;

    const delSejasVal = d.deliveredSejas ?? d.delSejas ?? 0;
    const pendSejasVal = d.pendingSejas ?? d.pendSejas ?? 0;
    const fulVal = parseFloat(d.sejaRate ?? d.fulfillmentPct ?? 0) / 100;
    const trkVal = parseFloat(d.trackingRate ?? d.trkPct ?? 0) / 100;

    row.values = [
      d.nodalDairy,
      d.districtName,
      d.routes ?? 0,
      d.sejas ?? 0,
      d.qty ?? 0,
      delSejasVal,
      pendSejasVal,
      fulVal,
      d.tracked ?? d.trkSejas ?? 0,
      d.untracked ?? d.untrkSejas ?? 0,
      trkVal,
      d.statusText || 'In Transit'
    ];

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 9.5, color: { argb: C_TEXT_DARK } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cell.border = thinBorder;
      cell.alignment = { vertical: 'middle', horizontal: (colNumber <= 2) ? 'left' : (colNumber === 5 ? 'right' : 'center') };

      // Highlight Column A: Nodal Dairy with Dairy Color
      if (colNumber === 1) {
        const dairyColor = d.nodalDairy === 'Banas' ? C_BLUE_TXT : (d.nodalDairy === 'Kaira' ? C_AMUL_RED : C_GREEN_TXT);
        cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: dairyColor } };
      }

      if (colNumber === 5) cell.numFmt = '#,##0.0';
      if (colNumber === 6) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_GREEN_BG } };
        cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: C_GREEN_TXT } };
      }
      if (colNumber === 7) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: pendSejasVal > 0 ? C_RED_BG : C_GREEN_BG } };
        cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: pendSejasVal > 0 ? C_RED_TXT : C_GREEN_TXT } };
      }
      if (colNumber === 8 || colNumber === 11) cell.numFmt = '0.0%';

      // Status Badge
      if (colNumber === 12) {
        const isDone = fulVal >= 1;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isDone ? C_GREEN_BG : (trkVal < 0.9 ? C_RED_BG : C_AMBER_BG) } };
        cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: isDone ? C_GREEN_TXT : (trkVal < 0.9 ? C_RED_TXT : C_AMBER_TXT) } };
      }
    });
  });

  // Table 3 Total Row
  currentRow++;
  const t3TotRow = ws1.getRow(currentRow);
  t3TotRow.height = 22;
  t3TotRow.values = [
    'Statewide Total', `${districts.length} Districts`, kpis.totalRoutes || 0, kpis.totalSejas || 0, kpis.totalQty || 0,
    kpis.deliveredSejas || 0, kpis.pendingSejas || 0, parseFloat(kpis.sejaRate || 0) / 100,
    kpis.trackedRoutes || 0, kpis.untrackedRoutes || 0, parseFloat(kpis.trackingRate || 0) / 100,
    'Statewide Matrix'
  ];

  t3TotRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: C_TEXT_DARK } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_TOTAL } };
    cell.border = totalBorder;
    cell.alignment = { vertical: 'middle', horizontal: (colNumber <= 2) ? 'left' : (colNumber === 5 ? 'right' : 'center') };
    if (colNumber === 5) cell.numFmt = '#,##0.0';
    if (colNumber === 6) cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: C_GREEN_TXT } };
    if (colNumber === 7) cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: kpis.pendingSejas > 0 ? C_RED_TXT : C_GREEN_TXT } };
    if (colNumber === 8 || colNumber === 11) cell.numFmt = '0.0%';
  });

  // =========================================================================
  // SHEET 2: DISTRIBUTION ROUTES REGISTER (382+ ROUTES)
  // =========================================================================
  const ws2 = wb.addWorksheet('Distribution Routes', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1, showGridLines: true }]
  });

  ws2.columns = [
    { key: 'srNo', width: 8 },
    { key: 'route', width: 34 },
    { key: 'plant', width: 14 },
    { key: 'district', width: 22 },
    { key: 'block', width: 22 },
    { key: 'transporter', width: 28 },
    { key: 'vehicle', width: 16 },
    { key: 'lrNo', width: 30 },
    { key: 'sejas', width: 12 },
    { key: 'qty', width: 18 },
    { key: 'trackingStatus', width: 16 },
    { key: 'deliveryStatus', width: 18 }
  ];

  const r2Header = ws2.getRow(1);
  r2Header.height = 26;
  const routeHeaders = ['Sr No', 'Route Code / Challan', 'Nodal Dairy', 'District', 'Block / Taluka', 'Transporter Name', 'Vehicle No', 'LR Number', 'Centers', 'Qty (Kg)', 'GPS Tracking', 'Delivery Status'];
  
  routeHeaders.forEach((th, idx) => {
    const c = r2Header.getCell(idx + 1);
    c.value = th;
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C_WHITE } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_NAVY } };
    c.alignment = { horizontal: (idx === 0 || idx === 8 || idx === 10 || idx === 11) ? 'center' : (idx === 9 ? 'right' : 'left'), vertical: 'middle' };
    c.border = headerBorder;
  });

  routes.forEach((r, idx) => {
    const rRow = ws2.getRow(idx + 2);
    rRow.height = 19;
    const isZebra = idx % 2 === 1;
    const rBg = isZebra ? C_ZEBRA : C_WHITE;
    const isDel = r.deliveryStatus === 'Delivered';
    const isTrk = r.trackingStatus === 'tracked';

    rRow.values = [
      idx + 1,
      r.route,
      r.plant,
      r.district,
      r.block,
      r.transporter,
      r.vehicle,
      r.lrNo,
      r.sejas,
      r.qty,
      isTrk ? 'Tracked' : 'Untracked',
      isDel ? 'Delivered' : 'Pending'
    ];

    rRow.eachCell({ includeEmpty: true }, (c, colNum) => {
      c.font = { name: 'Calibri', size: 9, color: { argb: C_TEXT_DARK } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rBg } };
      c.border = thinBorder;
      c.alignment = { vertical: 'middle', horizontal: (colNum === 1 || colNum === 9 || colNum === 11 || colNum === 12) ? 'center' : (colNum === 10 ? 'right' : 'left') };

      if (colNum === 10) c.numFmt = '#,##0.0';

      // GPS Status
      if (colNum === 11) {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isTrk ? C_BLUE_BG : C_AMBER_BG } };
        c.font = { name: 'Calibri', size: 9, bold: true, color: { argb: isTrk ? C_BLUE_TXT : C_AMBER_TXT } };
      }

      // Delivery Status
      if (colNum === 12) {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isDel ? C_GREEN_BG : C_RED_BG } };
        c.font = { name: 'Calibri', size: 9, bold: true, color: { argb: isDel ? C_GREEN_TXT : C_RED_TXT } };
      }
    });
  });

  ws2.autoFilter = { from: 'A1', to: `L${routes.length + 1}` };

  // =========================================================================
  // SHEET 3: RAW DISPATCH RECORDS
  // =========================================================================
  if (records && records.length > 0) {
    const ws3 = wb.addWorksheet('Raw Data Records', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1, showGridLines: true }]
    });

    const rawHeaders = [
      'Dispatch Date / Time', 'Reference Number', 'LR No', 'Route', 'Plant Name',
      'District Name 1', 'Block Name 1', 'Seja Name 1', 'Transporter', 'Order No',
      'Vehicle', 'Total Qty', 'Current State', 'End Location', 'Tracking Status',
      'Delivery Status'
    ];

    ws3.columns = rawHeaders.map(() => ({ width: 22 }));

    const r3Head = ws3.getRow(1);
    r3Head.height = 24;
    rawHeaders.forEach((rh, i) => {
      const c = r3Head.getCell(i + 1);
      c.value = rh;
      c.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: C_WHITE } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C_BLUE } };
      c.alignment = { horizontal: 'left', vertical: 'middle' };
      c.border = headerBorder;
    });

    records.forEach((rec, idx) => {
      const r = ws3.getRow(idx + 2);
      r.height = 18;
      const isZ = idx % 2 === 1;
      r.values = [
        rec.dispatchDate, rec.referenceNumber, rec.lrNo, rec.route, rec.plantName,
        rec.districtName, rec.blockName, rec.sejaName, rec.transporter, rec.orderNo,
        rec.vehicle, rec.totalQty, rec.currentState, rec.endLocation, rec.trackingStatus,
        rec.deliveryStatus
      ];
      r.eachCell({ includeEmpty: true }, (c, col) => {
        c.font = { name: 'Calibri', size: 9, color: { argb: C_TEXT_DARK } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isZ ? C_ZEBRA : C_WHITE } };
        c.border = thinBorder;
        c.alignment = { vertical: 'middle', horizontal: col === 12 ? 'right' : 'left' };
        if (col === 12) c.numFmt = '#,##0.0';
      });
    });

    ws3.autoFilter = { from: 'A1', to: `P${records.length + 1}` };
  }

  // Generate binary buffer and trigger browser download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  
  const safeDateStr = new Date().toISOString().substring(0, 10);
  const cleanTitle = (customTitle && customTitle.trim())
    ? customTitle.trim().replace(/[^a-zA-Z0-9_\-]/g, '_')
    : `Amul_THR_Daily_KPI_Dashboard_${safeDateStr}`;
  
  a.download = `${cleanTitle}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
