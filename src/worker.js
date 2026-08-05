import * as XLSX from 'xlsx';

const calculatePendingDays = (dateString) => {
  if (!dateString || dateString === 'PENDING') return '';
  
  let targetDate = new Date(dateString);
  if (isNaN(targetDate.getTime())) return '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - targetDate.getTime();
  const diffDays = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
  return diffDays + ' days';
};

const formatExcelTime = (timeVal) => {
  if (timeVal === undefined || timeVal === null || timeVal === 'NaT') return '';
  if (typeof timeVal === 'number') {
    const parsed = XLSX.SSF.parse_date_code(timeVal);
    return String(parsed.H).padStart(2, '0') + ':' + String(parsed.M).padStart(2, '0');
  }
  return String(timeVal).trim().substring(0, 5);
};

const formatExcelDate = (dateVal) => {
  if (!dateVal || dateVal === 'NaT') return '';
  if (typeof dateVal === 'number') {
    const parsed = XLSX.SSF.parse_date_code(dateVal);
    return parsed.y + '-' + String(parsed.m).padStart(2, '0') + '-' + String(parsed.d).padStart(2, '0');
  }
  return String(dateVal).split(' ')[0];
};

self.onmessage = async (e) => {
  const { data, trackingData, activeReport, etaApiKey, etaVehicleType, weighbridgeVendors } = e.data;
  
  try {
    self.postMessage({ type: 'progress', percent: 20, message: 'Reading Excel File (This may take a minute for large files)...' });
    const wb = XLSX.read(data, { 
      type: 'array', 
      dense: true, 
      cellFormula: false, 
      cellHTML: false, 
      cellText: false 
    });
    
    self.postMessage({ type: 'progress', percent: 40, message: 'Extracting Data...' });
    const wsname = wb.SheetNames[0];
    const ws = wb.Sheets[wsname];
    
    const allRows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    let headersRaw = [];
    let headerRowIndex = 0;
    for (let i = 0; i < allRows.length; i++) {
        const rowData = allRows[i] || [];
        // Check if row has at least 3 valid string headers (to avoid picking up random empty/merged formatting rows)
        const validHeaders = rowData.filter(cell => cell && String(cell).trim().length > 0);
        if (validHeaders.length >= 3) {
            headersRaw = rowData;
            headerRowIndex = i;
            break;
        }
    }
    const headers = headersRaw.map(h => String(h).trim().toLowerCase());
    let isValid = true;
    let expectedColumns = '';

    if (activeReport === 'first-mile-epod') {
      if (!headers.includes('epod status') && !headers.includes('reference no') && !headers.includes('reference number') && !headers.includes('tracking')) {
        isValid = false;
        expectedColumns = 'Reference No, EPOD status, TP date';
      }
    } else if (activeReport === 'godown-to-miller') {
      if (!headers.includes('tp district') && !headers.includes('lifting location name')) {
        isValid = false;
        expectedColumns = 'TP District, Lifting Location Name, TP Destination Name';
      }
    } else if (activeReport === 'miller-to-godown') {
      if (!headers.includes('gp source name') && !headers.includes('gp destination name')) {
        isValid = false;
        expectedColumns = 'GP Source Name, GP Destination Name';
      }
    } else if (activeReport === 'lifting-report') {
      if (!headers.includes('reference number') && !headers.includes('district') && !headers.includes('tp creation mode')) {
        isValid = false;
        expectedColumns = 'Reference Number, District, TP Creation Mode, Final Quantity Allocated';
      }
    } else if (activeReport === 'last-mile-epod') {
      if (!headers.includes('dc month') && !headers.includes('dc date') && !headers.includes('dc creation date')) {
        isValid = false;
        expectedColumns = 'DC Month, DC Creation Date';
      }
    } else if (activeReport === 'eta-route') {
      if (!headers.includes('origin_lat') && !headers.includes('origin lat') && !headers.includes('origin_lat_origin_lng') && !headers.includes('origin lat origin lng') && !headers.includes('destination_lat') && !headers.includes('destination lat')) {
        isValid = false;
        expectedColumns = 'Origin_Lat, Origin_Lng, Destination_Lat, Destination_Lng, Actual_Time_Mins';
      }
    } else if (activeReport === 'vehicle-assigned') {
      if (!headers.includes('reference number') && !headers.includes('tp date') && !headers.includes('district')) {
        isValid = false;
        expectedColumns = 'Reference Number, District, TP Date';
      }
    } else if (activeReport === 'weighbridge-report') {
      if (!headers.includes('weighbridge id') && !headers.includes('weighbridge_id')) {
        isValid = false;
        expectedColumns = 'TP date, District, Destination Godown, EPOD status, Weighbridge ID';
      }
    }

    if (!isValid) {
      self.postMessage({ type: 'error', message: 'Data Not Match! You have uploaded the wrong file for this report.' });
      return;
    }

    self.postMessage({ type: 'progress', percent: 60, message: 'Processing ' + allRows.length + ' rows...' });
    
    const processed = [];
    const uniqueDcMonths = new Set();
    const uniqueDcDates = new Set();
    const uniqueEpodStatuses = new Set();

    // Parse the JSON data starting from the actual header row
    const jsonDataRaw = XLSX.utils.sheet_to_json(ws, { range: headerRowIndex });
    
    // Helper to get value case-insensitively and trim keys
    const getVal = (row, ...keys) => {
        const lowerKeys = keys.map(k => String(k).toLowerCase().trim());
        for (const k in row) {
            if (lowerKeys.includes(String(k).toLowerCase().trim())) {
                return row[k];
            }
        }
        return undefined;
    };
    
    const jsonData = jsonDataRaw;
    
    // Parse tracking data if provided
    let trackingMap = null;
    if (trackingData) {
      try {
         const wbTrack = XLSX.read(trackingData, { type: 'array' });
         const wsTrackName = wbTrack.SheetNames[0];
         const wsTrack = wbTrack.Sheets[wsTrackName];
         const trackingJson = XLSX.utils.sheet_to_json(wsTrack);
         
         trackingMap = {};
         trackingJson.forEach(row => {
            const refNo = String(getVal(row, 'Reference Number') || getVal(row, 'Reference No') || getVal(row, 'Ref No') || '').trim();
            if (refNo) {
               const rowValues = Object.values(row).map(v => String(v).toLowerCase());
               const isUntrack = rowValues.some(v => v.includes('untrack') || v === 'untracked');
               trackingMap[refNo] = isUntrack ? 'untracked' : 'tracked';
            }
         });
      } catch (err) {
         console.warn("Could not process tracking data:", err);
      }
    }

    if (activeReport === 'lifting-report') {
      jsonData.forEach(row => {
        const dist = (getVal(row, 'District') || '').trim();
        if (!dist) return;
        
        const veh = String(getVal(row, 'Vehicle Number') || getVal(row, 'Vehicle No') || '').trim();
        const createdFrom = String(getVal(row, 'TP Creation Mode') || getVal(row, 'created_from') || '').toLowerCase();
        const qty = Number(getVal(row, 'Final Quantity Allocated')) || 0;
        
        const dStatus = String(getVal(row, 'Driver Status') || '').toLowerCase();
        const isEpodDriver = (dStatus === 'end_trip' || dStatus === 'endtrip');
        
        const eStatus = String(getVal(row, 'EPOD status') || '').toLowerCase();
        const isEpodManager = (eStatus === 'deliver' || eStatus === 'delivered' || eStatus === 'completed');
        
        const refNum = String(getVal(row, 'Reference Number') || '').trim();
        if (refNum.toLowerCase().includes('_cancel')) return;
        
        let isTracked = true;
        if (trackingMap && refNum && trackingMap[refNum] === 'untracked') {
           isTracked = false;
        }

        let tpDateRaw = getVal(row, 'TP date') || getVal(row, 'TP Date') || '';
        let tpDate = String(tpDateRaw);
        if (typeof tpDateRaw === 'number') {
            const parsed = XLSX.SSF.parse_date_code(tpDateRaw);
            tpDate = parsed.y + '-' + String(parsed.m).padStart(2, '0') + '-' + String(parsed.d).padStart(2, '0');
        } else if (tpDate) {
            tpDate = tpDate.split(' ')[0];
        }

        processed.push({
           district: dist,
           tpDate: tpDate,
           vehicleAssignedRaw: veh,
           dosTpCreated: (createdFrom === 'auto' || createdFrom === 'dos') ? 1 : 0,
           manualTpCreated: (createdFrom === 'manual') ? 1 : 0,
           tpsGenerated: 1,
           liftedQty: qty,
           tripsTracked: isTracked ? 1 : 0,
           untracked: isTracked ? 0 : 1,
           epodDriver: isEpodDriver ? 1 : 0,
           epodManager: isEpodManager ? 1 : 0
        });
      });
      self.postMessage({ type: 'success', data: processed });
      return;
    } else if (activeReport === 'multi-trip-analysis') {
       const tripGroups = {};
       
       jsonData.forEach(row => {
          // Ignore rows containing _cancel
          if (JSON.stringify(row).toLowerCase().includes('_cancel')) return;

          let veh = String(getVal(row, 'Vehicle Number') || '').trim();
          if (!veh) return;
          
          let tpDateRaw = getVal(row, 'TP date') || getVal(row, 'TP Date') || '';
          let tpDate = String(tpDateRaw);
          if (typeof tpDateRaw === 'number') {
              const parsed = XLSX.SSF.parse_date_code(tpDateRaw);
              tpDate = parsed.y + '-' + String(parsed.m).padStart(2, '0') + '-' + String(parsed.d).padStart(2, '0');
          } else if (tpDate) {
              tpDate = tpDate.split(' ')[0];
          }
          if (!tpDate) return;
          
          const key = veh + '|||' + tpDate;
          if (!tripGroups[key]) tripGroups[key] = [];
          
          let hrs = '';
          let timeVal = getVal(row, 'TP Time');
          if (timeVal !== undefined && timeVal !== null) {
              if (typeof timeVal === 'number') {
                  hrs = Math.floor(timeVal * 24);
              } else {
                  let timeStr = String(timeVal).trim();
                  if (timeStr.includes(':')) {
                     hrs = parseInt(timeStr.split(':')[0], 10);
                  } else {
                     hrs = parseInt(parseFloat(timeStr), 10);
                  }
              }
              if (isNaN(hrs)) hrs = String(timeVal);
          }
          
          let qty = Number(getVal(row, 'Final Quantity Allocated'));
          if (isNaN(qty)) {
              qty = Number(getVal(row, 'Net Weight')) || 0;
          }
          
          tripGroups[key].push({
             district: getVal(row, 'District') || '',
             tpDate: tpDate,
             hrs: hrs,
             refNo: getVal(row, 'Reference Number') || '',
             vehicle: veh,
             source: getVal(row, 'Source Godown') || '',
             dest: getVal(row, 'Destination Godown') || '',
             qty: qty
          });
       });
       
       Object.values(tripGroups).forEach(group => {
           if (group.length > 1) {
               group.sort((a, b) => {
                  let ha = typeof a.hrs === 'number' ? a.hrs : 999;
                  let hb = typeof b.hrs === 'number' ? b.hrs : 999;
                  return ha - hb;
               });
               
               let totalQty = 0;
               let totalCount = group.length;
               
               group.forEach((row, idx) => {
                   totalQty += row.qty;
                   processed.push({
                       district: row.district,
                       tpDate: idx === 0 ? row.tpDate : '',
                       hrs: row.hrs,
                       refNo: row.refNo,
                       vehicle: row.vehicle,
                       source: row.source,
                       dest: row.dest,
                       tripCount: 1,
                       netWeight: row.qty,
                       remarks: '',
                       isSubtotal: false,
                       sortKey: row.district + '|||' + row.vehicle + '|||' + row.tpDate
                   });
               });
               
               const remarks = totalQty > 35 ? "Greater than 35" : "Less than or equal to 35";
               
               processed.push({
                   district: group[0].district,
                   tpDate: group[0].tpDate + ' Total',
                   hrs: '',
                   refNo: '',
                   vehicle: '',
                   source: '',
                   dest: '',
                   tripCount: totalCount,
                   netWeight: totalQty,
                   remarks: remarks,
                   isSubtotal: true,
                   sortKey: group[0].district + '|||' + group[0].vehicle + '|||' + group[0].tpDate
               });
           }
       });
       
       processed.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
       
       self.postMessage({ type: 'success', data: processed });
       return;
       self.postMessage({ type: 'success', data: processed });
       return;
    } else if (activeReport === 'eta-route') {
       if (!etaApiKey) {
           self.postMessage({ type: 'error', message: 'API Key is required.' });
           return;
       }

        // Helper to clean coordinates
        const cleanCoords = (val) => {
            if (val === undefined || val === null) return null;
            let s = String(val).replace(/\s+/g, '').toLowerCase();
            if (s === '' || s === 'nan,nan' || s === ',' || s === 'undefined,undefined' || s === 'null,null') return null;
            return s;
        };

        // Helper to parse transit time
        const parseTransitTime = (timeStr) => {
            if (timeStr === undefined || timeStr === null || String(timeStr).trim() === '') return NaN;
            if (typeof timeStr === 'number') {
                // If it's a small decimal (typical Excel time fraction), convert to minutes.
                // If it's a large number, it might be raw minutes already.
                if (timeStr < 10) return Math.round(timeStr * 24 * 60);
                return timeStr;
            }
            
            // Check for HH:MM or HH:MM:SS format
            let colonMatch = String(timeStr).trim().match(/^(\d+):(\d+)(?::(\d+))?$/);
            if (colonMatch) {
                let h = parseInt(colonMatch[1], 10);
                let m = parseInt(colonMatch[2], 10);
                return h * 60 + m;
            }

            if (!isNaN(Number(timeStr))) return Number(timeStr);
            
            let t = String(timeStr).toLowerCase();
            let days = 0, hours = 0, mins = 0;
            let dMatch = t.match(/(\d+)\s*d/);
            let hMatch = t.match(/(\d+)\s*h/);
            let mMatch = t.match(/(\d+)\s*m/);
            if (dMatch) days = parseInt(dMatch[1], 10);
            if (hMatch) hours = parseInt(hMatch[1], 10);
            if (mMatch) mins = parseInt(mMatch[1], 10);
            
            let total = days * 1440 + hours * 60 + mins;
            return total > 0 ? total : NaN;
        };

        const adjustForTruck = (carMins) => {
            if (carMins === null) return null;
            let base = carMins * 1.20;
            let breaks = Math.floor(base / 300) * 60;
            return Math.round(base + breaks);
        };

        // 1. Validate and prepare data
        let routesData = [];
        jsonData.forEach(row => {
            let routeCode = getVal(row, 'Route Code', 'Route_Code', 'Route');
            
            let originLat = getVal(row, 'Origin_Lat', 'Origin Lat');
            let originLng = getVal(row, 'Origin_Lng', 'Origin Lng');
            let combinedOrigin = getVal(row, 'Origin_Lat_Origin_Lng', 'Origin Lat Origin Lng');
            
            let destLat = getVal(row, 'Destination_Lat', 'Destination Lat');
            let destLng = getVal(row, 'Destination_Lng', 'Destination Lng');
            let combinedDest = getVal(row, 'Destination_Lat_Destination_Lng', 'Destination Lat Destination Lng');
            
            let orig = cleanCoords(combinedOrigin || ((originLat !== undefined && originLng !== undefined) ? (originLat + ',' + originLng) : null));
            let dest = cleanCoords(combinedDest || ((destLat !== undefined && destLng !== undefined) ? (destLat + ',' + destLng) : null));
           
           let actualTime = parseTransitTime(getVal(row, 'Actual_Time_Mins', 'Transit Time(hh:mm)', 'Transit Time'));
           
           if (orig && dest) {
               routesData.push({ orig, dest, actualTime, routeCode: routeCode || 'N/A', originalRow: row });
           }
       });

       if (routesData.length === 0) {
           self.postMessage({ type: 'error', message: 'No valid Origin/Destination pairs found in the data.' });
           return;
       }

       // 2. Find unique routes to minimize API calls
       const uniqueRoutes = new Set();
       routesData.forEach(r => uniqueRoutes.add(r.orig + '|||' + r.dest));
       
       const etaCache = {};
       const totalUnique = uniqueRoutes.size;
       
       // 3. Fetch ETAs sequentially
       try {
           let processedCount = 0;
           for (const routeKey of uniqueRoutes) {
               const [orig, dest] = routeKey.split('|||');
               const url = `${self.location.origin}/google-maps/maps/api/distancematrix/json?origins=${orig}&destinations=${dest}&mode=driving&departure_time=now&key=${etaApiKey}`;
               
               const response = await fetch(url);
               const data = await response.json();
               
               let mins = null, km = null;
               if (data.status === 'OK' && data.rows && data.rows[0].elements && data.rows[0].elements[0].status === 'OK') {
                   const element = data.rows[0].elements[0];
                   const durationData = element.duration_in_traffic || element.duration;
                   mins = Math.round(durationData.value / 60);
                   km = (element.distance.value / 1000).toFixed(2);
               }
               
               if (etaVehicleType === 'Truck' && mins !== null) {
                   mins = adjustForTruck(mins);
               }
               
               etaCache[routeKey] = { mins, km };
               
               processedCount++;
               let percent = 10 + Math.round((processedCount / totalUnique) * 85);
               self.postMessage({ type: 'progress', percent, message: `Fetching Route Data (${processedCount} of ${totalUnique})...` });
               
               // small delay to prevent rate limit issues
               await new Promise(r => setTimeout(r, 50));
           }
       } catch (err) {
           console.warn('API Error', err);
       }

       // 4. Map back to processed
       routesData.forEach((r, idx) => {
           const routeKey = r.orig + '|||' + r.dest;
           const cache = etaCache[routeKey] || { mins: null, km: null };
           
           let status = 'N/A (Missing Lat/Long or API Error)';
           if (cache.mins !== null) {
               if (isNaN(r.actualTime)) {
                   status = 'N/A (No Actual Time)';
               } else {
                   let diff = r.actualTime - cache.mins;
                   if (diff > 15) status = 'Delay';
                   else if (diff < -15) status = 'Early';
                   else status = 'On-Time';
               }
           }
           
            processed.push({
                routeCode: r.routeCode,
                origin: r.orig,
                destination: r.dest,
                actualTime: isNaN(r.actualTime) ? 'N/A' : r.actualTime,
                googleEta: cache.mins !== null ? cache.mins : 'N/A',
                distance: cache.km !== null ? cache.km : 'N/A',
                vehicleType: etaVehicleType,
                tripStatus: status,
                isSubtotal: false,
                sortKey: `${idx}`
            });
        });

       self.postMessage({ type: 'success', data: processed });
       return;
    }

    jsonData.forEach(row => {
      if (activeReport === 'first-mile-epod') {
         const refNoStr = String(getVal(row, 'Reference No') || getVal(row, 'Reference Number') || '');
         if (refNoStr.includes('_cancel')) return;
         
         if (getVal(row, 'TP date') === undefined || getVal(row, 'TP date') === null || String(getVal(row, 'TP date')).trim() === '') return;
         
         if (getVal(row, 'EPOD Date') !== undefined && getVal(row, 'EPOD Date') !== null && String(getVal(row, 'EPOD Date')).trim() !== '') return;

         processed.push({
           district: getVal(row, 'District') || '',
           destLoc: getVal(row, 'Destination Godown') || '',
           transporter: getVal(row, 'Transporter Name') || '',
           tpDate: formatExcelDate(getVal(row, 'TP date')),
           status: 'Pending',
           trips: 1,
           _ref: refNoStr
         });
         return;
      }

      if (activeReport === 'last-mile-epod') {
         const district = String(getVal(row, 'District') || '').trim();
         if (!district) return;

         const refNo = String(getVal(row, 'Reference Number') || getVal(row, 'Reference No') || getVal(row, 'Ref No') || '').trim();
         if (refNo.toLowerCase().includes('_cancel')) return;
         const hasRef = refNo.length > 0;

         const epodStatus = String(getVal(row, 'EPOD Status') || '').toUpperCase().trim();
         const isComplete = epodStatus === 'DELIVERED' || epodStatus === 'COMPLETED';
         
         const dcMonth = getVal(row, 'DC Month') !== undefined ? String(getVal(row, 'DC Month')).trim() : '';
         const dcDate = getVal(row, 'DC Creation Date') !== undefined ? formatExcelDate(getVal(row, 'DC Creation Date')) : '';
         const statusRaw = String(getVal(row, 'EPOD Status') || '(blank)').trim() || '(blank)';

         if (dcMonth) uniqueDcMonths.add(dcMonth);
         if (dcDate) uniqueDcDates.add(dcDate);
         uniqueEpodStatuses.add(statusRaw);

         processed.push({
           district: getVal(row, 'District') || '',
           godown: getVal(row, 'GSCSCL Godown') || '',
           transporter: getVal(row, 'Transporter Name') || '',
           deliveryChallan: hasRef ? 1 : 0,
           epodComplete: (hasRef && isComplete) ? 1 : 0,
           epodPending: (hasRef && !isComplete) ? 1 : 0,
           dcMonth: dcMonth,
           dcCreationDate: dcDate,
           epodStatusRaw: statusRaw
         });
         return;
      }
      
      if (activeReport === 'weighbridge-report') {
         const tpDateRaw = getVal(row, 'tp_date', 'tp date', 'tp date ');
         const tpDate = formatExcelDate(tpDateRaw);
         if (!tpDate) return;
         
         const district = getVal(row, 'district') || '';
         const destGodown = getVal(row, 'destination_godown', 'destination godown') || '';
         const weighbridgeId = String(getVal(row, 'weighbridge_id', 'weighbridge id') || '').trim();
         const grossWeight = String(getVal(row, 'Weigh Bridge Gross Weight') || '').trim();
         const tareWeight = String(getVal(row, 'Weigh Bridge Tare Weight') || '').trim();
         
         let weighbridgeName = getVal(row, 'weighbridge_name', 'vendor name', 'weighbridge vendor') || '';
         
         if (weighbridgeId && weighbridgeVendors) {
             const parts = weighbridgeId.split('_');
             if (parts.length > 0) {
                 const vendorCode = parts[parts.length - 1];
                 const matchedVendor = weighbridgeVendors.find(v => v.id === vendorCode);
                 if (matchedVendor) weighbridgeName = matchedVendor.name;
             }
         }
         
         if (!weighbridgeName) weighbridgeName = 'Unknown Vendor';
         
         if (tpDate.toLowerCase().includes('cancel') || district.toLowerCase().includes('cancel') || destGodown.toLowerCase().includes('cancel') || weighbridgeName.toLowerCase().includes('cancel') || weighbridgeId.toLowerCase().includes('cancel')) {
            return;
         }

         const isWbIdValid = (weighbridgeId !== '' && weighbridgeId !== '0' && weighbridgeId !== 'null' && weighbridgeId !== 'undefined' && weighbridgeId !== 'NaN');
         const isGrossValid = (grossWeight !== '' && grossWeight !== '0' && grossWeight !== 'null' && grossWeight !== 'undefined' && grossWeight !== 'NaN');
         const isTareValid = (tareWeight !== '' && tareWeight !== '0' && tareWeight !== 'null' && tareWeight !== 'undefined' && tareWeight !== 'NaN');

         let wbUsed = 0;
         if (isWbIdValid && (isGrossValid || isTareValid)) {
            wbUsed = 1;
         }

         let epodCount = 0;
         const epodVal = getVal(row, 'EPOD Status');
         if (typeof epodVal === 'number') {
            epodCount = epodVal;
         } else if (typeof epodVal === 'string') {
            if (epodVal.toLowerCase().includes('deliver')) {
               epodCount = 1;
            }
         }

         processed.push({
            tpDate: tpDate,
            district: district,
            destGodown: destGodown,
            weighbridgeVendor: weighbridgeName,
            weighbridgeId: weighbridgeId,
            epodStatus: epodCount,
            weighbridgeUsed: wbUsed
         });
         return;
      }
      
      if (activeReport === 'vehicle-assigned') {
         const refNoStr = String(getVal(row, 'Reference Number') || '');
         if (refNoStr.toLowerCase().includes('_cancel')) return;

         const district = getVal(row, 'District');
         const tpDate = formatExcelDate(getVal(row, 'TP date') || getVal(row, 'TP Date') || getVal(row, 'tp date'));
         if (!district || !tpDate) return;

         processed.push({
            refNo: refNoStr,
            district: district,
            tpDate: tpDate,
            vehicleNo: getVal(row, 'Vehicle Number') || getVal(row, 'Vehicle No.') || '',
            destGodown: getVal(row, 'Destination Godown') || '',
            transporter: getVal(row, 'Transporter Name') || ''
         });
         return;
      }

      let district = '';
      let sourceLoc = '';
      let destLoc = '';
      
      if (activeReport === 'godown-to-miller') {
         district = getVal(row, 'TP District') || '';
         sourceLoc = getVal(row, 'Lifting Location Name') || '';
         destLoc = getVal(row, 'TP Destination Name') || '';
      } else if (activeReport === 'miller-to-godown') {
         district = getVal(row, 'District') || '';
         sourceLoc = getVal(row, 'GP Source Name') || '';
         destLoc = getVal(row, 'GP Destination Name') || '';
      }
      const createdAt = getVal(row, 'Created At');

      const rawStartDate = formatExcelDate(getVal(row, 'Start Trip Date'));
      const rawStartTime = formatExcelTime(getVal(row, 'Start Trip Time'));
      const startDate = rawStartDate ? (rawStartDate + ' ' + rawStartTime).trim() : '';

      const rawEndDate = formatExcelDate(getVal(row, 'End Trip Date'));
      const rawEndTime = formatExcelTime(getVal(row, 'End Trip Time'));
      const endDate = rawEndDate ? (rawEndDate + ' ' + rawEndTime).trim() : '';
      
      const refNo = getVal(row, 'Reference Number');

      if (!district && !sourceLoc && !destLoc) return;

      let isStartPending = !startDate || startDate === 'NaT';
      let isEndPending = !endDate || endDate === 'NaT';

      let formattedStartDate = isStartPending ? 'PENDING' : startDate;
      let formattedEndDate = isEndPending ? 'PENDING' : endDate;
      
      let formattedCreatedAt = '';
      if (createdAt) {
         if (typeof createdAt === 'number') {
            const parsed = XLSX.SSF.parse_date_code(createdAt);
            formattedCreatedAt = parsed.y + '-' + String(parsed.m).padStart(2, '0') + '-' + String(parsed.d).padStart(2, '0') + ' ' + String(parsed.H).padStart(2, '0') + ':' + String(parsed.M).padStart(2, '0');
         } else {
            formattedCreatedAt = String(createdAt);
         }
      }
      
      let pendingDays = '';
      if (isStartPending || isEndPending) {
         pendingDays = calculatePendingDays(formattedCreatedAt);
      }

      let status = 'Unknown';
      if (isStartPending) {
         status = 'Start Trip Pending';
      } else if (isEndPending) {
         status = 'End Trip Pending';
      } else {
         status = 'Completed';
      }

      processed.push({
        district,
        sourceLoc,
        destLoc,
        transporter: getVal(row, 'Transporter') || '',
        tpDate: '',
        createdAt: formattedCreatedAt,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        pendingDays,
        status,
        isStartPending,
        isEndPending,
        trips: 1,
        _ref: refNo
      });
    });

    if (processed.length === 0) {
      self.postMessage({ type: 'error', message: 'Data Not Match or no valid records found for this report.' });
      return;
    }

    self.postMessage({ type: 'progress', percent: 90, message: 'Finalizing ' + processed.length + ' records...' });

    self.postMessage({ 
      type: 'success', 
      data: processed,
      filters: { 
        uniqueDcMonths: Array.from(uniqueDcMonths), 
        uniqueDcDates: Array.from(uniqueDcDates), 
        uniqueEpodStatuses: Array.from(uniqueEpodStatuses) 
      }
    });
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message || 'Error processing file' });
  }
};
