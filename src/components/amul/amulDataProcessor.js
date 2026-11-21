import * as XLSX from 'xlsx';
import { AMUL_PLANTS, AMUL_DISTRICTS, getDairyForDistrict } from './amulConstants';

/**
 * Standardize column mapping to tolerate variations in Raw Data exports
 */
export function normalizeHeaders(headerRow) {
  const map = {};
  if (!Array.isArray(headerRow)) return map;

  headerRow.forEach((col, idx) => {
    if (!col) return;
    const str = String(col).trim().toLowerCase().replace(/[\s_\-\/]+/g, '');
    
    if (str.includes('dispatchdate') || str.includes('tpdate') || str.includes('createdat') || str === 'date' || str === 'datetime') {
      if (map.dispatchDate === undefined) map.dispatchDate = idx;
    } else if (str.includes('reference') || str.includes('refno') || str === 'ref') {
      if (map.referenceNumber === undefined) map.referenceNumber = idx;
    } else if (str.includes('lrno') || str.includes('lrnumber') || str.includes('lr') || str.includes('consignment')) {
      if (map.lrNo === undefined) map.lrNo = idx;
    } else if (str.includes('route') || str.includes('trip') || str.includes('challan')) {
      if (map.route === undefined) map.route = idx;
    } else if (str.includes('plant') || str.includes('dairy') || str.includes('source') || str.includes('nodal')) {
      if (map.plantName === undefined) map.plantName = idx;
    } else if (str.includes('district') || str.includes('dist')) {
      if (map.districtName === undefined) map.districtName = idx;
    } else if (str.includes('block') || str.includes('taluka') || str.includes('tehsil')) {
      if (map.blockName === undefined) map.blockName = idx;
    } else if (str.includes('seja') || str.includes('center') || str.includes('fps') || str.includes('destination')) {
      if (map.sejaName === undefined) map.sejaName = idx;
    } else if (str.includes('transporter') || str.includes('carrier') || str.includes('vendor')) {
      if (map.transporter === undefined) map.transporter = idx;
    } else if (str.includes('order') || str.includes('mdo') || str.includes('cycle') || str.includes('scheme')) {
      if (map.orderNo === undefined) map.orderNo = idx;
    } else if (str.includes('vehicle') || str.includes('truck') || str.includes('vehicleno')) {
      if (map.vehicle === undefined) map.vehicle = idx;
    } else if (str.includes('totalqty') || str.includes('qty') || str.includes('weight') || str.includes('quantity')) {
      if (map.totalQty === undefined) map.totalQty = idx;
    } else if (str.includes('tracking') || str.includes('gps') || str.includes('tracked')) {
      if (map.trackingStatus === undefined) map.trackingStatus = idx;
    } else if (str.includes('deliverystatus') || str.includes('epodstatus') || str.includes('status')) {
      if (map.deliveryStatus === undefined) map.deliveryStatus = idx;
    } else if (str.includes('state') || str.includes('currentstate')) {
      if (map.currentState === undefined) map.currentState = idx;
    } else if (str.includes('endlocation') || str.includes('destloc')) {
      if (map.endLocation === undefined) map.endLocation = idx;
    }
  });

  return map;
}

/**
 * Parse an Excel/CSV file ArrayBuffer or raw rows into standardized records
 */
export function parseAmulRawData(data) {
  let workbook;
  if (Array.isArray(data)) {
    return processAmulRecords(data);
  }

  workbook = XLSX.read(data, { type: 'array', cellDates: true });
  
  // Find raw sheet
  let targetSheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('raw')) ||
                        workbook.SheetNames.find(n => n.toLowerCase().includes('data')) ||
                        workbook.SheetNames[workbook.SheetNames.length - 1];
  
  const sheet = workbook.Sheets[targetSheetName] || workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (!rows || rows.length < 2) {
    throw new Error('No valid records found in the uploaded file.');
  }

  // Find header row (first row with multiple string values)
  let headerIdx = 0;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const r = rows[i];
    if (r && r.filter(c => typeof c === 'string' && c.trim().length > 0).length >= 5) {
      headerIdx = i;
      break;
    }
  }

  const headerMap = normalizeHeaders(rows[headerIdx]);
  const records = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;

    const lrVal = headerMap.lrNo !== undefined ? String(r[headerMap.lrNo] || '').trim() : String(r[2] || '').trim();
    const routeVal = headerMap.route !== undefined ? String(r[headerMap.route] || '').trim() : String(r[3] || '').trim();
    const refVal = headerMap.referenceNumber !== undefined ? String(r[headerMap.referenceNumber] || '').trim() : String(r[1] || '').trim();

    if (!lrVal && !routeVal && !refVal) continue;

    const rawDistrict = headerMap.districtName !== undefined ? String(r[headerMap.districtName] || '').trim() : String(r[5] || '').trim();
    let rawPlant = headerMap.plantName !== undefined ? String(r[headerMap.plantName] || '').trim() : String(r[4] || '').trim();
    
    // Normalize Plant name
    if (!rawPlant || rawPlant.toLowerCase() === 'unknown') {
      rawPlant = getDairyForDistrict(rawDistrict);
    } else {
      const pl = rawPlant.toLowerCase();
      if (pl.includes('banas')) rawPlant = 'Banas';
      else if (pl.includes('kaira') || pl.includes('anand') || pl.includes('amul')) rawPlant = 'Kaira';
      else if (pl.includes('sumul') || pl.includes('surat')) rawPlant = 'Sumul';
    }

    const rawTracking = headerMap.trackingStatus !== undefined ? String(r[headerMap.trackingStatus] || '').trim().toLowerCase() : String(r[14] || '').trim().toLowerCase();
    const rawDelivery = headerMap.deliveryStatus !== undefined ? String(r[headerMap.deliveryStatus] || '').trim().toLowerCase() : String(r[15] || '').trim().toLowerCase();
    const rawState = headerMap.currentState !== undefined ? String(r[headerMap.currentState] || '').trim().toLowerCase() : String(r[12] || '').trim().toLowerCase();

    const isTracked = rawTracking === 'tracked' || rawTracking === 'gps tracked' || rawTracking === 'active' || rawTracking === '1' || rawTracking.includes('track');
    const isDelivered = rawDelivery.includes('deliver') || 
                        rawDelivery.includes('complet') || 
                        rawDelivery.includes('success') || 
                        rawDelivery.includes('drop') || 
                        rawDelivery === 'done' || 
                        rawDelivery === 'closed' ||
                        (!rawDelivery && (rawState.includes('deliver') || rawState.includes('complet') || rawState.includes('success') || rawState.includes('closed')));

    const qtyVal = headerMap.totalQty !== undefined ? parseFloat(r[headerMap.totalQty]) || 0 : parseFloat(r[11]) || 0;

    let dispatchDateStr = headerMap.dispatchDate !== undefined ? String(r[headerMap.dispatchDate] || '').trim() : String(r[0] || '').trim();
    if (r[headerMap.dispatchDate] instanceof Date) {
      dispatchDateStr = r[headerMap.dispatchDate].toISOString().replace('T', ' ').substring(0, 19);
    }

    records.push({
      dispatchDate: dispatchDateStr,
      referenceNumber: refVal,
      lrNo: lrVal,
      route: routeVal || lrVal,
      plantName: rawPlant,
      districtName: rawDistrict.toUpperCase(),
      blockName: headerMap.blockName !== undefined ? String(r[headerMap.blockName] || '').trim() : String(r[6] || '').trim(),
      sejaName: headerMap.sejaName !== undefined ? String(r[headerMap.sejaName] || '').trim() : String(r[7] || '').trim(),
      transporter: headerMap.transporter !== undefined ? String(r[headerMap.transporter] || '').trim() : String(r[8] || '').trim(),
      orderNo: headerMap.orderNo !== undefined ? String(r[headerMap.orderNo] || '').trim() : String(r[9] || '').trim(),
      vehicle: headerMap.vehicle !== undefined ? String(r[headerMap.vehicle] || '').trim() : String(r[10] || '').trim(),
      totalQty: qtyVal,
      currentState: headerMap.currentState !== undefined ? String(r[headerMap.currentState] || '').trim() : String(r[12] || '').trim(),
      endLocation: headerMap.endLocation !== undefined ? String(r[headerMap.endLocation] || '').trim() : String(r[13] || '').trim(),
      trackingStatus: isTracked ? 'tracked' : 'untracked',
      deliveryStatus: isDelivered ? 'Delivered' : 'Pending'
    });
  }

  return processAmulRecords(records);
}

/**
 * Process array of standardized Amul records and produce full dashboard metrics
 */
export function processAmulRecords(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return {
      records: [],
      kpis: getEmptyKpis(),
      plants: [],
      transporters: [],
      districts: [],
      routes: []
    };
  }

  const seenLR = new Set();
  const seenRoutes = new Set();
  const seenVehicles = new Set();
  const seenDates = new Set();
  let totalQty = 0;

  const plantMap = {
    Banas: { id: 'Banas', name: 'Banas Dairy', lrs: new Set(), routes: new Set(), sejas: 0, qty: 0, delRoutes: new Set(), pendRoutes: new Set(), trkRoutes: new Set(), untrkRoutes: new Set() },
    Kaira: { id: 'Kaira', name: 'Kaira Dairy', lrs: new Set(), routes: new Set(), sejas: 0, qty: 0, delRoutes: new Set(), pendRoutes: new Set(), trkRoutes: new Set(), untrkRoutes: new Set() },
    Sumul: { id: 'Sumul', name: 'Sumul Dairy', lrs: new Set(), routes: new Set(), sejas: 0, qty: 0, delRoutes: new Set(), pendRoutes: new Set(), trkRoutes: new Set(), untrkRoutes: new Set() }
  };

  const transMap = {};
  const distMap = {};
  const routeMap = {};

  records.forEach(r => {
    const lr = r.lrNo;
    const rt = r.route;
    const plant = r.plantName || getDairyForDistrict(r.districtName);
    const dist = (r.districtName || 'UNKNOWN').trim().toUpperCase();
    const block = r.blockName || '';
    const trans = (r.transporter || 'Unassigned Transporter').trim();
    const veh = r.vehicle || 'Unknown';
    const qty = parseFloat(r.totalQty) || 0;
    const trk = r.trackingStatus === 'tracked';
    const del = r.deliveryStatus === 'Delivered';

    if (lr) seenLR.add(lr);
    if (rt) seenRoutes.add(rt);
    if (veh && veh !== 'Unknown') seenVehicles.add(veh);
    if (r.dispatchDate) seenDates.add(r.dispatchDate.substring(0, 10));
    totalQty += qty;

    // Plant map
    if (plantMap[plant]) {
      const pm = plantMap[plant];
      if (lr) pm.lrs.add(lr);
      if (rt) {
        pm.routes.add(rt);
        if (del) pm.delRoutes.add(rt);
        else pm.pendRoutes.add(rt);
        if (trk) pm.trkRoutes.add(rt);
        else pm.untrkRoutes.add(rt);
      }
      pm.sejas++;
      pm.qty += qty;
    }

    // Transporter map
    if (!transMap[trans]) {
      transMap[trans] = {
        name: trans,
        plant,
        routes: new Set(),
        sejas: 0,
        qty: 0,
        delRoutes: new Set(),
        pendRoutes: new Set(),
        trkRoutes: new Set(),
        untrkRoutes: new Set()
      };
    }
    const tm = transMap[trans];
    if (rt) {
      tm.routes.add(rt);
      if (del) tm.delRoutes.add(rt);
      else tm.pendRoutes.add(rt);
      if (trk) tm.trkRoutes.add(rt);
      else tm.untrkRoutes.add(rt);
    }
    tm.sejas++;
    tm.qty += qty;

    // District map
    if (!distMap[dist]) {
      distMap[dist] = {
        name: dist,
        dairy: getDairyForDistrict(dist) || plant,
        routes: new Set(),
        delRoutes: new Set(),
        pendRoutes: new Set(),
        sejas: 0,
        qty: 0,
        delSejas: 0,
        pendSejas: 0,
        trkSejas: 0,
        untrkSejas: 0
      };
    }
    const dm = distMap[dist];
    if (rt) {
      dm.routes.add(rt);
      if (del) dm.delRoutes.add(rt);
      else dm.pendRoutes.add(rt);
    }
    dm.sejas++;
    dm.qty += qty;
    if (del) dm.delSejas++;
    else dm.pendSejas++;
    if (trk) dm.trkSejas++;
    else dm.untrkSejas++;

    // Route map
    if (rt && !routeMap[rt]) {
      routeMap[rt] = {
        route: rt,
        plant,
        vehicle: veh,
        lrNo: lr,
        district: dist,
        block,
        transporter: trans,
        dispatchDate: r.dispatchDate,
        trackingStatus: r.trackingStatus,
        deliveryStatus: r.deliveryStatus,
        currentState: r.currentState,
        sejas: 0,
        qty: 0
      };
    }
    if (rt) {
      routeMap[rt].sejas++;
      routeMap[rt].qty += qty;
      if (r.trackingStatus !== 'tracked') routeMap[rt].trackingStatus = 'untracked';
      if (r.deliveryStatus !== 'Delivered') routeMap[rt].deliveryStatus = 'Pending';
    }
  });

  // Calculate Route level counts
  let deliveredRoutesCount = 0;
  let pendingRoutesCount = 0;
  let trackedRoutesCount = 0;
  let untrackedRoutesCount = 0;

  Object.values(routeMap).forEach(r => {
    if (r.deliveryStatus === 'Delivered') deliveredRoutesCount++;
    else pendingRoutesCount++;
    if (r.trackingStatus === 'tracked') trackedRoutesCount++;
    else untrackedRoutesCount++;
  });

  const totalRoutes = seenRoutes.size;
  const totalSejas = records.length;
  let deliveredSejasCount = 0;
  let pendingSejasCount = 0;
  records.forEach(r => {
    if (r.deliveryStatus === 'Delivered') deliveredSejasCount++;
    else pendingSejasCount++;
  });

  const deliveryRate = totalRoutes > 0 ? (deliveredRoutesCount / totalRoutes) * 100 : 0;
  const trackingRate = totalRoutes > 0 ? (trackedRoutesCount / totalRoutes) * 100 : 0;
  const sejaRate = totalSejas > 0 ? (deliveredSejasCount / totalSejas) * 100 : 0;

  const sortedDates = [...seenDates].sort();
  const dateRangeStr = sortedDates.length > 0 
    ? (sortedDates[0] === sortedDates[sortedDates.length - 1] ? sortedDates[0] : `${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}`)
    : 'All Dispatches';

  const mdoCycle = records[0]?.orderNo || 'THR MDO November 2026';

  const kpis = {
    totalQty,
    totalQtyMt: (totalQty / 1000).toFixed(2),
    totalTrips: seenLR.size,
    totalRoutes,
    totalVehicles: seenVehicles.size,
    totalSejas,
    deliveredRoutes: deliveredRoutesCount,
    pendingRoutes: pendingRoutesCount,
    deliveryRate: deliveryRate.toFixed(1),
    trackedRoutes: trackedRoutesCount,
    untrackedRoutes: untrackedRoutesCount,
    trackingRate: trackingRate.toFixed(1),
    deliveredSejas: deliveredSejasCount,
    pendingSejas: pendingSejasCount,
    sejaRate: sejaRate.toFixed(1),
    dateRange: dateRangeStr,
    mdoCycle
  };

  // Format Plant Performance List
  const plants = AMUL_PLANTS.map(p => {
    const pm = plantMap[p.id] || { lrs: new Set(), routes: new Set(), sejas: 0, qty: 0, delRoutes: new Set(), pendRoutes: new Set(), trkRoutes: new Set(), untrkRoutes: new Set() };
    const rCount = pm.routes.size;
    const delCount = pm.delRoutes.size;
    const pendCount = rCount - delCount;
    const trkCount = pm.trkRoutes.size;
    const untrkCount = rCount - trkCount;
    const delPct = rCount > 0 ? (delCount / rCount) * 100 : 0;
    const trkPct = rCount > 0 ? (trkCount / rCount) * 100 : 0;
    
    let statusText = 'Target Achieved';
    let statusType = 'success';
    if (delPct < 100 && trkPct < 90) {
      statusText = 'GPS Untracked (Action Needed)';
      statusType = 'danger';
    } else if (delPct < 100) {
      statusText = 'In Transit (Tracked)';
      statusType = 'warning';
    }

    return {
      id: p.id,
      name: p.name,
      code: p.code,
      location: p.location,
      color: p.color,
      bg: p.bg,
      border: p.border,
      trips: pm.lrs.size,
      routes: rCount,
      sejas: pm.sejas,
      qty: pm.qty,
      delRoutes: delCount,
      pendRoutes: pendCount,
      delPct: delPct.toFixed(1),
      trkRoutes: trkCount,
      untrkRoutes: untrkCount,
      trkPct: trkPct.toFixed(1),
      statusText,
      statusType
    };
  });

  // Format Transporters Scorecard with user requested columns:
  // Delivered Blocks, Pending Blocks, Delivery Ration %
  const transporters = Object.values(transMap).map(t => {
    const rCount = t.routes.size;
    const delCount = t.delRoutes.size;
    const pendCount = rCount - delCount;
    const trkCount = t.trkRoutes.size;
    const untrkCount = rCount - trkCount;
    const delPct = rCount > 0 ? (delCount / rCount) * 100 : 0;
    const trkPct = rCount > 0 ? (trkCount / rCount) * 100 : 0;

    let statusText = 'Target Achieved';
    let statusType = 'success';
    if (rCount === 0) {
      statusText = 'No Dispatches';
      statusType = 'muted';
    } else if (delPct < 100) {
      if (trkPct < 90) {
        statusText = 'Non-Compliant (Track < 90%)';
        statusType = 'danger';
      } else {
        statusText = 'Compliant (In Transit)';
        statusType = 'info';
      }
    }

    return {
      name: t.name,
      plant: t.plant,
      routes: rCount,
      sejas: t.sejas,
      qty: t.qty,
      // User and internal aliases for delivery & tracking
      deliveredBlocks: delCount,
      deliveredRoutes: delCount,
      delRoutes: delCount,
      pendingBlocks: pendCount,
      pendingRoutes: pendCount,
      pendRoutes: pendCount,
      deliveryRatioPct: delPct.toFixed(1),
      deliveryRate: delPct.toFixed(1),
      delPct: delPct.toFixed(1),
      tracked: trkCount,
      trkRoutes: trkCount,
      untracked: untrkCount,
      untrkRoutes: untrkCount,
      trackingRate: trkPct.toFixed(1),
      trackingPct: trkPct.toFixed(1),
      trkPct: trkPct.toFixed(1),
      statusText,
      statusType
    };
  }).sort((a, b) => b.qty - a.qty);

  // Format District Matrix with Nodal Dairy in Column A, District in Column B
  const districts = AMUL_DISTRICTS.map(d => {
    const dm = distMap[d.name] || {
      routes: new Set(),
      delRoutes: new Set(),
      pendRoutes: new Set(),
      sejas: 0,
      qty: 0,
      delSejas: 0,
      pendSejas: 0,
      trkSejas: 0,
      untrkSejas: 0
    };

    const rCount = dm.routes.size;
    const sejas = dm.sejas;
    const delSejas = dm.delSejas;
    const pendSejas = sejas - delSejas;
    const trkSejas = dm.trkSejas;
    const untrkSejas = sejas - trkSejas;
    const delPct = sejas > 0 ? (delSejas / sejas) * 100 : 0;
    const trkPct = sejas > 0 ? (trkSejas / sejas) * 100 : 0;

    let statusText = 'Completed';
    let statusType = 'success';
    if (rCount === 0) {
      statusText = 'No Dispatches';
      statusType = 'muted';
    } else if (delPct < 100) {
      if (trkPct < 90) {
        statusText = 'Untracked Sejas';
        statusType = 'danger';
      } else {
        statusText = 'In Transit';
        statusType = 'info';
      }
    }

    return {
      order: d.order,
      nodalDairy: d.dairy,
      districtName: d.name,
      routes: rCount,
      sejas,
      qty: dm.qty,
      // Comprehensive aliases for delivery, fulfillment and tracking
      delSejas,
      deliveredSejas: delSejas,
      deliveredBlocks: delSejas,
      pendSejas,
      pendingSejas: pendSejas,
      pendingBlocks: pendSejas,
      fulfillmentPct: delPct.toFixed(1),
      sejaRate: delPct.toFixed(1),
      deliveryRate: delPct.toFixed(1),
      deliveryRatioPct: delPct.toFixed(1),
      delPct: delPct.toFixed(1),
      tracked: trkSejas,
      trkSejas,
      untracked: untrkSejas,
      untrkSejas,
      trackingRate: trkPct.toFixed(1),
      trackingPct: trkPct.toFixed(1),
      trkPct: trkPct.toFixed(1),
      statusText,
      statusType
    };
  });

  const routes = Object.values(routeMap).sort((a, b) => b.qty - a.qty);

  return {
    records,
    kpis,
    plants,
    transporters,
    districts,
    routes
  };
}

function getEmptyKpis() {
  return {
    totalQty: 0,
    totalQtyMt: '0.00',
    totalTrips: 0,
    totalRoutes: 0,
    totalVehicles: 0,
    totalSejas: 0,
    deliveredRoutes: 0,
    pendingRoutes: 0,
    deliveryRate: '0.0',
    trackedRoutes: 0,
    untrackedRoutes: 0,
    trackingRate: '0.0',
    deliveredSejas: 0,
    pendingSejas: 0,
    sejaRate: '0.0',
    dateRange: 'No Data',
    mdoCycle: 'THR MDO'
  };
}
