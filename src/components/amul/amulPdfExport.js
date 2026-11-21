import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generate Professional Amul THR Daily KPI PDF Report
 * @param {Object} data Processed Amul data (kpis, plants, transporters, districts, routes)
 * @param {boolean} includeRoutes Whether to include Table 4 (Route Register)
 */
export function exportAmulPdf(data, includeRoutes = false, customTitle = '') {
  const { kpis, plants, transporters, districts, routes } = data;

  // Initialize jsPDF in Landscape A4 (297 x 210 mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const brandNavy = [26, 54, 93];       // #1a365d
  const brandRed = [220, 38, 38];       // #dc2626
  const textDark = [30, 41, 59];        // #1e293b
  const borderGray = [226, 232, 240];   // #e2e8f0

  // Helper: Draw Header on a page
  const drawPageHeader = (pageTitle, subTitle) => {
    // Top banner
    doc.setFillColor(brandNavy[0], brandNavy[1], brandNavy[2]);
    doc.rect(10, 8, pageWidth - 20, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('GOVERNMENT OF GUJARAT   |   WOMEN & CHILD DEVELOPMENT DEPARTMENT (ICDS)   |   GCMMF (AMUL)', pageWidth / 2, 14.5, { align: 'center' });

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(brandNavy[0], brandNavy[1], brandNavy[2]);
    doc.text(pageTitle, 10, 24);

    // Subtitle & Date
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(subTitle, 10, 29);

    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.3);
    doc.line(10, 31, pageWidth - 10, 31);
  };

  // Helper: Draw Footer
  const drawPageFooter = (pageNum, totalPagesEst) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    doc.text(`GCMMF Amul THR Logistics Intelligence Portal   |   Generated: ${dateStr}`, 10, pageHeight - 6);
    doc.text(`Page ${pageNum}`, pageWidth - 10, pageHeight - 6, { align: 'right' });
  };

  const headerMainTitle = (customTitle && customTitle.trim())
    ? customTitle.trim().toUpperCase()
    : `AMUL TAKE HOME RATION (THR) LOGISTICS & DISPATCH KPI DASHBOARD - ${kpis.dateRange}`;

  // ================= PAGE 1 =================
  drawPageHeader(
    headerMainTitle,
    `Cycle: ${kpis.mdoCycle}   |   Plants: Banas, Kaira, Sumul   |   Statewide Executive Summary`
  );

  // Top KPI Summary Cards Row
  const cardY = 34;
  const cardW = (pageWidth - 20 - 24) / 7;
  const cardH = 15;

  const kpiItems = [
    { label: 'Dispatched Qty', val: `${Number(kpis.totalQty).toLocaleString('en-IN')} Kg`, sub: `${kpis.totalQtyMt} MT` },
    { label: 'Active Plants', val: '3 Plants', sub: 'Banas, Kaira, Sumul' },
    { label: 'Total Trips / LRs', val: `${kpis.totalTrips} LRs`, sub: `${kpis.totalVehicles} Trucks` },
    { label: 'Delivery Routes', val: `${kpis.totalRoutes} Routes`, sub: `${kpis.deliveredRoutes} Delivered` },
    { label: 'Anganwadi Sejas', val: `${kpis.totalSejas} Centers`, sub: `${kpis.deliveredSejas} Delivered` },
    { label: 'Delivery Rate', val: `${kpis.deliveryRate}%`, sub: `${kpis.pendingRoutes} Pending Routes` },
    { label: 'GPS Compliance', val: `${kpis.trackingRate}%`, sub: `${kpis.trackedRoutes} Tracked` }
  ];

  kpiItems.forEach((c, idx) => {
    const x = 10 + idx * (cardW + 4);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, cardY, cardW, cardH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(c.label.toUpperCase(), x + cardW / 2, cardY + 4, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(brandNavy[0], brandNavy[1], brandNavy[2]);
    doc.text(c.val, x + cardW / 2, cardY + 9, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text(c.sub, x + cardW / 2, cardY + 13, { align: 'center' });
  });

  // Table 1: Plant Performance Breakdown
  const t1Head = [
    ['Plant / Nodal Dairy', 'Location', 'Trips (LRs)', 'Routes', 'Sejas', 'Dispatched Qty (Kg)', 'Delivered Routes', 'Pending Routes', 'Delivery %', 'Tracked Routes', 'Untracked Routes', 'Tracking %', 'Operational Status']
  ];
  const t1Body = plants.map(p => [
    p.name,
    p.location,
    p.trips,
    p.routes,
    p.sejas,
    Number(p.qty).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    p.delRoutes,
    p.pendRoutes,
    `${p.delPct}%`,
    p.trkRoutes,
    p.untrkRoutes,
    `${p.trkPct}%`,
    p.statusText
  ]);

  // Add Grand Total row for Plants
  t1Body.push([
    'TOTAL / STATEWIDE',
    'All Regions',
    kpis.totalTrips,
    kpis.totalRoutes,
    kpis.totalSejas,
    Number(kpis.totalQty).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    kpis.deliveredRoutes,
    kpis.pendingRoutes,
    `${kpis.deliveryRate}%`,
    kpis.trackedRoutes,
    kpis.untrackedRoutes,
    `${kpis.trackingRate}%`,
    kpis.deliveryRate >= 95 ? 'Compliant' : 'In Progress'
  ]);

  autoTable(doc, {
    head: t1Head,
    body: t1Body,
    startY: cardY + cardH + 4,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.5, textColor: textDark, lineColor: [203, 213, 225], lineWidth: 0.2 },
    headStyles: { fillColor: brandNavy, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'left', cellWidth: 26 },
      1: { halign: 'left', cellWidth: 24 },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'right', cellWidth: 28 },
      6: { halign: 'center', cellWidth: 22 },
      7: { halign: 'center', cellWidth: 22 },
      8: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      9: { halign: 'center', cellWidth: 20 },
      10: { halign: 'center', cellWidth: 22 },
      11: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      12: { halign: 'center', cellWidth: 29 }
    },
    didParseCell: (data) => {
      if (data.row.index === t1Body.length - 1) {
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  // Table 2: Transporter SLA & Monitoring Scorecard
  const t2Head = [
    ['Transporter Name', 'Nodal Dairy', 'Total Routes', 'Total Sejas', 'Dispatched Qty (Kg)', 'Delivered Blocks', 'Pending Blocks', 'Delivery Ration %', 'Tracked Routes', 'Untracked Routes', 'Tracking %', 'SLA Compliance Status']
  ];
  const t2Body = transporters.map(t => [
    t.name,
    t.plant,
    t.routes,
    t.sejas,
    Number(t.qty).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    t.deliveredBlocks,
    t.pendingBlocks,
    `${t.deliveryRatioPct}%`,
    t.trkRoutes,
    t.untrkRoutes,
    `${t.trkPct}%`,
    t.statusText
  ]);

  // Grand Total for Transporters
  t2Body.push([
    `TOTAL (${transporters.length} LOGISTICS PARTNERS)`,
    'All Dairies',
    kpis.totalRoutes,
    kpis.totalSejas,
    Number(kpis.totalQty).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    kpis.deliveredRoutes,
    kpis.pendingRoutes,
    `${kpis.deliveryRate}%`,
    kpis.trackedRoutes,
    kpis.untrackedRoutes,
    `${kpis.trackingRate}%`,
    kpis.deliveryRate >= 95 ? 'Compliant' : 'Action Needed'
  ]);

  autoTable(doc, {
    head: t2Head,
    body: t2Body,
    startY: doc.lastAutoTable.finalY + 5,
    theme: 'grid',
    styles: { fontSize: 6.5, cellPadding: 1.2, textColor: textDark, lineColor: [203, 213, 225], lineWidth: 0.2 },
    headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'left', cellWidth: 42 },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'right', cellWidth: 26 },
      5: { halign: 'center', cellWidth: 22 },
      6: { halign: 'center', cellWidth: 22 },
      7: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
      8: { halign: 'center', cellWidth: 20 },
      9: { halign: 'center', cellWidth: 20 },
      10: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      11: { halign: 'center', cellWidth: 33 }
    },
    didParseCell: (data) => {
      if (data.row.index === t2Body.length - 1) {
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  drawPageFooter(1, includeRoutes ? 'Multi-page' : 2);

  // ================= PAGE 2 =================
  doc.addPage();
  drawPageHeader(
    '3. DISTRICT-WISE THR DISTRIBUTION MATRIX (40 DISTRICTS COVERED)',
    'Official GCMMF Nodal Dairy Distribution & Anganwadi Center Delivery Reconciliation'
  );

  // Table 3: District-Wise Distribution Matrix
  const t3Head = [
    ['Nodal Dairy', 'District Name', 'Routes Covered', 'Sejas Covered', 'Dispatched Qty (Kg)', 'Delivered Sejas', 'Pending Sejas', 'Seja Fulfillment %', 'GPS Tracked Sejas', 'Untracked Sejas', 'GPS Tracking %', 'District Status']
  ];
  const t3Body = districts.map(d => [
    d.nodalDairy,
    d.districtName,
    d.routes,
    d.sejas,
    Number(d.qty).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    d.delSejas,
    d.pendSejas,
    `${d.fulfillmentPct}%`,
    d.trkSejas,
    d.untrkSejas,
    `${d.trackingPct}%`,
    d.statusText
  ]);

  // Grand Total for Districts
  t3Body.push([
    'STATEWIDE TOTAL',
    '40 Districts',
    kpis.totalRoutes,
    kpis.totalSejas,
    Number(kpis.totalQty).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    kpis.deliveredSejas,
    kpis.pendingSejas,
    `${kpis.sejaRate}%`,
    kpis.trackedRoutes,
    kpis.untrackedRoutes,
    `${kpis.trackingRate}%`,
    'Operational'
  ]);

  autoTable(doc, {
    head: t3Head,
    body: t3Body,
    startY: 34,
    theme: 'grid',
    styles: { fontSize: 6.2, cellPadding: 1.1, textColor: textDark, lineColor: [203, 213, 225], lineWidth: 0.2 },
    headStyles: { fillColor: brandNavy, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'center', cellWidth: 22 },
      1: { fontStyle: 'bold', halign: 'left', cellWidth: 36 },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'right', cellWidth: 28 },
      5: { halign: 'center', cellWidth: 20 },
      6: { halign: 'center', cellWidth: 20 },
      7: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
      8: { halign: 'center', cellWidth: 22 },
      9: { halign: 'center', cellWidth: 20 },
      10: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
      11: { halign: 'center', cellWidth: 29 }
    },
    didParseCell: (data) => {
      if (data.row.index === t3Body.length - 1) {
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  drawPageFooter(2, includeRoutes ? 'Multi-page' : 2);

  // ================= OPTIONAL TABLE 4: ROUTE REGISTER =================
  if (includeRoutes && routes.length > 0) {
    let currentPage = 3;
    const routesPerPage = 32;
    const totalRoutePages = Math.ceil(routes.length / routesPerPage);

    for (let pIdx = 0; pIdx < totalRoutePages; pIdx++) {
      doc.addPage();
      const startIdx = pIdx * routesPerPage;
      const endIdx = Math.min(startIdx + routesPerPage, routes.length);
      const pageRoutes = routes.slice(startIdx, endIdx);

      drawPageHeader(
        `4. CONSIGNMENT & ROUTE MONITORING REGISTER (${routes.length} UNIQUE ROUTES)`,
        `Part ${pIdx + 1} of ${totalRoutePages} (Routes ${startIdx + 1} to ${endIdx})   |   Real-Time GPS Tracking & EPOD Register`
      );

      const t4Head = [
        ['Sr', 'Route Code / Name', 'Nodal Dairy', 'District', 'Taluka / Block', 'Transporter', 'Vehicle', 'LR No', 'Centers', 'Qty (Kg)', 'GPS Status', 'Delivery Status']
      ];
      const t4Body = pageRoutes.map((r, i) => [
        startIdx + i + 1,
        r.route,
        r.plant,
        r.district,
        r.block,
        r.transporter,
        r.vehicle,
        r.lrNo,
        r.sejas,
        Number(r.qty).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
        r.trackingStatus === 'tracked' ? 'GPS Tracked' : 'Untracked',
        r.deliveryStatus
      ]);

      autoTable(doc, {
        head: t4Head,
        body: t4Body,
        startY: 34,
        theme: 'grid',
        styles: { fontSize: 6.2, cellPadding: 1.1, textColor: textDark, lineColor: [203, 213, 225], lineWidth: 0.2 },
        headStyles: { fillColor: brandNavy, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { fontStyle: 'bold', halign: 'left', cellWidth: 46 },
          2: { halign: 'center', cellWidth: 18 },
          3: { halign: 'left', cellWidth: 26 },
          4: { halign: 'left', cellWidth: 26 },
          5: { halign: 'left', cellWidth: 32 },
          6: { halign: 'center', cellWidth: 20 },
          7: { halign: 'left', cellWidth: 26 },
          8: { halign: 'center', cellWidth: 14 },
          9: { halign: 'right', cellWidth: 18 },
          10: { halign: 'center', cellWidth: 18 },
          11: { halign: 'center', cellWidth: 23 }
        }
      });

      drawPageFooter(currentPage++, 2 + totalRoutePages);
    }
  }

  // Save the PDF
  const safeDate = String(kpis.dateRange || 'Report').replace(/[\s\:]+/g, '_');
  const filename = includeRoutes
    ? `Amul_THR_Daily_KPI_Report_Complete_${safeDate}.pdf`
    : `Amul_THR_Daily_KPI_Executive_Summary_${safeDate}.pdf`;

  doc.save(filename);
  return filename;
}
