import * as XLSX from 'xlsx';

/**
 * Export Amul THR KPI Dashboard to Standard Professional Master Excel (.xlsx)
 * Uses native 'xlsx' library (zero external dependencies) to guarantee 100% compatibility across all environments.
 * 
 * @param {Object} data Processed Amul data (kpis, plants, transporters, districts, routes, records)
 * @param {string} customTitle Optional customized title with date
 */
export function exportAmulExcel(data, customTitle = '') {
  const { records = [], kpis = {}, plants = [], transporters = [], districts = [], routes = [] } = data;

  const wb = XLSX.utils.book_new();

  // =========================================================================
  // SHEET 1: KPI DASHBOARD (EXECUTIVE VIEW)
  // =========================================================================
  const finalTitle = (customTitle && customTitle.trim())
    ? customTitle.trim().toUpperCase()
    : `AMUL TAKE HOME RATION (THR) LOGISTICS & DISPATCH KPI DASHBOARD - ${kpis.dateRange || 'ALL DISPATCHES'}`;

  const kpiRows = [
    // Row 1: Header Banner
    ['GOVERNMENT OF GUJARAT   |   WOMEN & CHILD DEVELOPMENT DEPARTMENT (ICDS)   |   GCMMF (AMUL)'],
    // Row 2: Title
    [finalTitle],
    // Row 3: Subtitle
    [`Logistics Cycle: ${kpis.mdoCycle || 'THR MDO November 2026'}   |   Covered Plants: Banas, Kaira, Sumul   |   Statewide THR Monitoring`],
    // Row 4: Tagline
    ['ALL-IN-ONE MASTER KPI DASHBOARD   |   Real-Time Delivery Verification & GPS Telemetry Scorecard'],
    // Row 5: Spacer
    [],
    // Rows 6-8: 6 Executive Summary KPI Cards
    [
      'DISPATCHED QUANTITY', '',
      'CONSIGNMENTS / TRIPS', '',
      'DISTRIBUTION ROUTES', '',
      'ANGANWADI CENTERS', '',
      'GPS TRACKING SLA', '',
      'PENDING ROUTES', ''
    ],
    [
      `${Number(kpis.totalQty || 0).toLocaleString('en-IN')} Kg`, '',
      `${kpis.totalTrips || 0} LRs`, '',
      `${kpis.totalRoutes || 0} Routes`, '',
      `${kpis.totalSejas || 0} Sejas`, '',
      `${kpis.trackingRate || '0.0'}%`, '',
      `${kpis.pendingRoutes || 0} Routes`, ''
    ],
    [
      `Volume: ${kpis.totalQtyMt || 0} MT`, '',
      `${kpis.totalVehicles || 0} Dedicated Trucks`, '',
      `${kpis.deliveredRoutes || 0} Delivered (${kpis.deliveryRate || '0.0'}%)`, '',
      `${kpis.deliveredSejas || 0} Delivered (${kpis.sejaRate || '0.0'}%)`, '',
      `${kpis.trackedRoutes || 0} Tracked / ${kpis.untrackedRoutes || 0} Untracked`, '',
      `${(100 - parseFloat(kpis.deliveryRate || 0)).toFixed(1)}% In Transit`, ''
    ],
    // Row 9: Spacer
    [],
    // Table 1: Plant Performance Header
    ['1. PLANT-LEVEL DISPATCH & DELIVERY PERFORMANCE SUMMARY'],
    [
      'Plant / Nodal Dairy', 'Manufacturing Location', 'Trips (LRs)', 'Routes', 'Sejas',
      'Dispatched Qty (Kg)', 'Delivered Routes', 'Pending Routes', 'Delivery Rate %',
      'GPS Tracked', 'Tracking %', 'Operational Status'
    ]
  ];

  // Table 1: Data Rows
  plants.forEach(p => {
    kpiRows.push([
      p.name,
      p.location || 'Gujarat Hub',
      p.trips ?? 0,
      p.routes ?? 0,
      p.sejas ?? 0,
      p.qty ?? 0,
      p.delRoutes ?? 0,
      p.pendRoutes ?? 0,
      `${p.delPct ?? '0.0'}%`,
      p.trkRoutes ?? 0,
      `${p.trkPct ?? '0.0'}%`,
      p.statusText || 'In Transit'
    ]);
  });

  // Table 1: Grand Total
  kpiRows.push([
    'Grand Total', 'All 3 Plants', kpis.totalTrips || 0, kpis.totalRoutes || 0, kpis.totalSejas || 0,
    kpis.totalQty || 0, kpis.deliveredRoutes || 0, kpis.pendingRoutes || 0,
    `${kpis.deliveryRate || '0.0'}%`, kpis.trackedRoutes || 0,
    `${kpis.trackingRate || '0.0'}%`, 'Statewide Operations'
  ]);

  // Spacer
  kpiRows.push([]);

  // Table 2: Transporter SLA Scorecard Header
  const t2TitleRowIdx = kpiRows.length;
  kpiRows.push([`2. TRANSPORTER SLA & MONITORING SCORECARD (${transporters.length} ACTIVE LOGISTICS PARTNERS)`]);
  kpiRows.push([
    'Transporter Partner Name', 'Nodal Dairy', 'Total Routes', 'Sejas Drops', 'Dispatched Qty (Kg)',
    'Delivered Blocks', 'Pending Blocks', 'Delivery Ration %', 'GPS Tracked', 'Untracked Routes',
    'Tracking %', 'SLA Compliance Status'
  ]);

  // Table 2: Data Rows
  transporters.forEach(t => {
    const delBlocks = t.deliveredBlocks ?? t.deliveredRoutes ?? 0;
    const pendBlocks = t.pendingBlocks ?? t.pendingRoutes ?? 0;
    const delRatio = t.deliveryRatioPct ?? t.deliveryRate ?? '0.0';
    const trkRatio = t.trackingRate ?? t.trkPct ?? '0.0';

    kpiRows.push([
      t.name,
      t.plant,
      t.routes ?? 0,
      t.sejas ?? 0,
      t.qty ?? 0,
      delBlocks,
      pendBlocks,
      `${delRatio}%`,
      t.tracked ?? t.trkRoutes ?? 0,
      t.untracked ?? t.untrkRoutes ?? 0,
      `${trkRatio}%`,
      t.statusText || 'Compliant'
    ]);
  });

  // Table 2: Grand Total
  kpiRows.push([
    'Grand Total', 'All Transporters', kpis.totalRoutes || 0, kpis.totalSejas || 0, kpis.totalQty || 0,
    kpis.deliveredRoutes || 0, kpis.pendingRoutes || 0, `${kpis.deliveryRate || '0.0'}%`,
    kpis.trackedRoutes || 0, kpis.untrackedRoutes || 0, `${kpis.trackingRate || '0.0'}%`,
    'Fleet Audited'
  ]);

  // Spacer
  kpiRows.push([]);

  // Table 3: District Matrix Header
  const t3TitleRowIdx = kpiRows.length;
  kpiRows.push([`3. DISTRICT-WISE THR DISTRIBUTION MATRIX (${districts.length} DISTRICTS COVERED)`]);
  kpiRows.push([
    'Nodal Dairy (Col A)', 'District Name (Col B)', 'Routes Covered', 'Sejas Covered', 'Dispatched Qty (Kg)',
    'Delivered Sejas', 'Pending Sejas', 'Seja Fulfillment %', 'GPS Tracked Sejas', 'Untracked Sejas',
    'GPS Tracking %', 'District Status'
  ]);

  // Table 3: Data Rows
  districts.forEach(d => {
    const delSejasVal = d.deliveredSejas ?? d.delSejas ?? 0;
    const pendSejasVal = d.pendingSejas ?? d.pendSejas ?? 0;
    const fulVal = d.sejaRate ?? d.fulfillmentPct ?? '0.0';
    const trkVal = d.trackingRate ?? d.trkPct ?? '0.0';

    kpiRows.push([
      d.nodalDairy,
      d.districtName,
      d.routes ?? 0,
      d.sejas ?? 0,
      d.qty ?? 0,
      delSejasVal,
      pendSejasVal,
      `${fulVal}%`,
      d.tracked ?? d.trkSejas ?? 0,
      d.untracked ?? d.untrkSejas ?? 0,
      `${trkVal}%`,
      d.statusText || 'In Transit'
    ]);
  });

  // Table 3: Grand Total
  kpiRows.push([
    'Statewide Total', `${districts.length} Districts`, kpis.totalRoutes || 0, kpis.totalSejas || 0, kpis.totalQty || 0,
    kpis.deliveredSejas || 0, kpis.pendingSejas || 0, `${kpis.sejaRate || '0.0'}%`,
    kpis.trackedRoutes || 0, kpis.untrackedRoutes || 0, `${kpis.trackingRate || '0.0'}%`,
    'Statewide Matrix'
  ]);

  const wsKpi = XLSX.utils.aoa_to_sheet(kpiRows);

  // Apply Merges for Banners & KPI Cards
  wsKpi['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 11 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 11 } },
    // 6 KPI Cards
    { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } }, { s: { r: 6, c: 0 }, e: { r: 6, c: 1 } }, { s: { r: 7, c: 0 }, e: { r: 7, c: 1 } },
    { s: { r: 5, c: 2 }, e: { r: 5, c: 3 } }, { s: { r: 6, c: 2 }, e: { r: 6, c: 3 } }, { s: { r: 7, c: 2 }, e: { r: 7, c: 3 } },
    { s: { r: 5, c: 4 }, e: { r: 5, c: 5 } }, { s: { r: 6, c: 4 }, e: { r: 6, c: 5 } }, { s: { r: 7, c: 4 }, e: { r: 7, c: 5 } },
    { s: { r: 5, c: 6 }, e: { r: 5, c: 7 } }, { s: { r: 6, c: 6 }, e: { r: 6, c: 7 } }, { s: { r: 7, c: 6 }, e: { r: 7, c: 7 } },
    { s: { r: 5, c: 8 }, e: { r: 5, c: 9 } }, { s: { r: 6, c: 8 }, e: { r: 6, c: 9 } }, { s: { r: 7, c: 8 }, e: { r: 7, c: 9 } },
    { s: { r: 5, c: 10 }, e: { r: 5, c: 11 } }, { s: { r: 6, c: 10 }, e: { r: 6, c: 11 } }, { s: { r: 7, c: 10 }, e: { r: 7, c: 11 } },
    // Section headers merges
    { s: { r: 9, c: 0 }, e: { r: 9, c: 11 } },
    { s: { r: t2TitleRowIdx, c: 0 }, e: { r: t2TitleRowIdx, c: 11 } },
    { s: { r: t3TitleRowIdx, c: 0 }, e: { r: t3TitleRowIdx, c: 11 } }
  ];

  // Generous column widths
  wsKpi['!cols'] = [
    { wch: 24 }, // Plant / Dairy
    { wch: 28 }, // District / Location
    { wch: 14 }, // Trips
    { wch: 14 }, // Routes
    { wch: 14 }, // Sejas
    { wch: 22 }, // Qty (Kg)
    { wch: 16 }, // Delivered
    { wch: 16 }, // Pending
    { wch: 18 }, // Delivery %
    { wch: 16 }, // Tracked
    { wch: 16 }, // Tracking %
    { wch: 28 }  // Status
  ];

  XLSX.utils.book_append_sheet(wb, wsKpi, 'KPI Dashboard');

  // =========================================================================
  // SHEET 2: DISTRIBUTION ROUTES REGISTER (382+ ROUTES)
  // =========================================================================
  const routeHeaders = [
    'Sr No', 'Route Code / Challan', 'Nodal Dairy', 'District', 'Block / Taluka',
    'Transporter Name', 'Vehicle No', 'LR Number', 'Centers (Sejas)',
    'Dispatched Qty (Kg)', 'GPS Tracking', 'Delivery Status'
  ];

  const routeRows = [routeHeaders];
  routes.forEach((r, idx) => {
    routeRows.push([
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
      r.trackingStatus === 'tracked' ? 'Tracked' : 'Untracked',
      r.deliveryStatus || 'Pending'
    ]);
  });

  const wsRoutes = XLSX.utils.aoa_to_sheet(routeRows);
  wsRoutes['!cols'] = [
    { wch: 8 },  // Sr No
    { wch: 34 }, // Route
    { wch: 14 }, // Plant
    { wch: 22 }, // District
    { wch: 22 }, // Block
    { wch: 28 }, // Transporter
    { wch: 16 }, // Vehicle
    { wch: 28 }, // LR
    { wch: 14 }, // Centers
    { wch: 18 }, // Qty
    { wch: 16 }, // GPS
    { wch: 18 }  // Delivery Status
  ];

  if (routes.length > 0) {
    wsRoutes['!autofilter'] = { ref: `A1:L${routes.length + 1}` };
  }

  XLSX.utils.book_append_sheet(wb, wsRoutes, 'Distribution Routes');

  // =========================================================================
  // SHEET 3: RAW DATA RECORDS
  // =========================================================================
  if (records && records.length > 0) {
    const rawHeaders = [
      'Dispatch Date / Time', 'Reference Number', 'LR No', 'Route', 'Plant Name',
      'District Name 1', 'Block Name 1', 'Seja Name 1', 'Transporter', 'Order No',
      'Vehicle', 'Total Qty', 'Current State', 'End Location', 'Tracking Status',
      'Delivery Status'
    ];

    const rawRows = [rawHeaders];
    records.forEach(rec => {
      rawRows.push([
        rec.dispatchDate, rec.referenceNumber, rec.lrNo, rec.route, rec.plantName,
        rec.districtName, rec.blockName, rec.sejaName, rec.transporter, rec.orderNo,
        rec.vehicle, rec.totalQty, rec.currentState, rec.endLocation, rec.trackingStatus,
        rec.deliveryStatus
      ]);
    });

    const wsRaw = XLSX.utils.aoa_to_sheet(rawRows);
    wsRaw['!cols'] = rawHeaders.map(() => ({ wch: 22 }));
    wsRaw['!autofilter'] = { ref: `A1:P${records.length + 1}` };
    XLSX.utils.book_append_sheet(wb, wsRaw, 'Raw Data Records');
  }

  // Trigger Download
  const safeDateStr = new Date().toISOString().substring(0, 10);
  const cleanTitle = (customTitle && customTitle.trim())
    ? customTitle.trim().replace(/[^a-zA-Z0-9_\-]/g, '_')
    : `Amul_THR_Daily_KPI_Dashboard_${safeDateStr}`;

  const fileName = `${cleanTitle}.xlsx`;
  XLSX.writeFile(wb, fileName);
  return fileName;
}
