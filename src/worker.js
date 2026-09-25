let FM_TRANSPORT_MAPPING = {};

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

self.onmessage = async (e) => {
  const { data, trackingData, fmMasterData, activeReport, etaApiKey, etaVehicleType, weighbridgeVendors, customAttributes } = e.data;

  // Clear previous mapping to avoid stale state if multiple files are processed
  FM_TRANSPORT_MAPPING = {};

  if (fmMasterData) {
      try {
          const wb2 = XLSX.read(fmMasterData, { type: 'array' });
          const masterJson = XLSX.utils.sheet_to_json(wb2.Sheets[wb2.SheetNames[0]], { raw: true, defval: '' });
          masterJson.forEach(row => {
              let tid = '';
              let dist = '';
              let transp = '';
              
              for (const key in row) {
                  const cleanKey = String(key).trim().toLowerCase();
                  if (cleanKey === 'trans id and district code' || cleanKey === 'trans id' || cleanKey === 'trans_id') {
                      tid = row[key];
                  } else if (cleanKey === 'district') {
                      dist = row[key];
                  } else if (cleanKey === 'transporter name' || cleanKey === 'transporter' || cleanKey === 'transport' || cleanKey === 'tran') {
                      transp = row[key];
                  }
              }
              
              if (tid) {
                  // Keep string to be safe
                  tid = String(tid).trim();
                  FM_TRANSPORT_MAPPING['fm' + tid] = { district: dist, transporter: transp };
                  FM_TRANSPORT_MAPPING[tid] = { district: dist, transporter: transp };
              }
          });
      } catch(err) {
          console.error("Failed to parse fmMasterData", err);
      }
  }
  
  // Helper to get dynamically resolved aliases for an attribute
  const getAliases = (attributeName) => {
     if (customAttributes && customAttributes[activeReport] && customAttributes[activeReport][attributeName]) {
         return customAttributes[activeReport][attributeName];
     }
     // Fallback for internal lookups if not found in customAttributes
     return [attributeName];
  };
  
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
    
    let allJsonDataRaw = [];
    let firstHeadersRaw = [];
    let totalRowsCount = 0;

    wb.SheetNames.forEach((wsname, idx) => {
        const ws = wb.Sheets[wsname];
        const allRows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (allRows.length === 0) return;
        
        let headersRaw = [];
        let headerRowIndex = 0;
        for (let i = 0; i < allRows.length; i++) {
            const rowData = allRows[i] || [];
            // Check if row has at least 2 valid string headers
            const validHeaders = rowData.filter(cell => cell && String(cell).trim().length > 0);
            if (validHeaders.length >= 2) {
                headersRaw = rowData;
                headerRowIndex = i;
                break; // Stop at the very first header row!
            }
        }
        
        if (idx === 0) {
            firstHeadersRaw = headersRaw;
            const jsonDataRaw = XLSX.utils.sheet_to_json(ws, { range: headerRowIndex });
            allJsonDataRaw = allJsonDataRaw.concat(jsonDataRaw);
        } else {
            let isSameHeader = true;
            for(let i=0; i<Math.max(headersRaw.length, firstHeadersRaw.length); i++) {
                if (String(headersRaw[i] || '').trim().toLowerCase() !== String(firstHeadersRaw[i] || '').trim().toLowerCase()) {
                    isSameHeader = false;
                    break;
                }
            }
            
            let jsonDataRaw;
            if (isSameHeader) {
                jsonDataRaw = XLSX.utils.sheet_to_json(ws, { range: headerRowIndex });
            } else {
                // Subsequent sheet does not repeat the header, it's just raw data
                jsonDataRaw = XLSX.utils.sheet_to_json(ws, { header: firstHeadersRaw, range: 0 });
            }
            allJsonDataRaw = allJsonDataRaw.concat(jsonDataRaw);
        }
        
        totalRowsCount += allRows.length;
    });

    const headers = firstHeadersRaw.map(h => String(h).trim().toLowerCase());
    let isValid = true;
    let expectedColumns = '';

    // Dynamic Validation Check based on customAttributes
    if (customAttributes && customAttributes[activeReport]) {
        const requiredAttributes = Object.keys(customAttributes[activeReport]);
        // Special case loose validation for some reports
        if (activeReport === 'first-mile-vehicle-registered') {
            const hasTruck = headers.includes('truck number') || headers.includes('vehicle number') || headers.includes('truck_number') || headers.includes('vehiclenumber');
            if (!hasTruck) {
                isValid = false;
                expectedColumns = "truck number or vehicle number";
            }
        } else if (activeReport === 'first-mile-epod') {
            const hasStatus = getAliases('EPOD status').some(alias => headers.includes(alias.toLowerCase()));
            const hasRef = getAliases('Reference Number').some(alias => headers.includes(alias.toLowerCase()));
            const hasTrack = headers.includes('tracking');
            if (!hasStatus && !hasRef && !hasTrack) {
                isValid = false;
                expectedColumns = requiredAttributes.join(', ');
            }
        } else if (activeReport === 'epod-photo-analysis') {
            // Very lenient validation for EPOD photo analysis
            isValid = true;
        } else {
            // Strict check: At least ONE standard attribute must have a matching header
            let matchCount = 0;
            for (const attr of requiredAttributes) {
                const aliases = getAliases(attr);
                if (aliases.some(alias => headers.includes(alias.toLowerCase()))) {
                    matchCount++;
                }
            }
            if (matchCount === 0) {
                isValid = false;
                expectedColumns = requiredAttributes.join(', ') + ". Found headers: " + headers.slice(0, 10).join(', ');
            }
        }
    } else {
       // Fallback to original validation if customAttributes are somehow missing
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
       } else if (activeReport === 'last-mile-vehicle-assigned') {
         if (!headers.includes('reference number') && !headers.includes('lr number')) {
           isValid = false;
           expectedColumns = 'Reference Number, LR Number';
         }
       } else if (activeReport === 'multi-trip-analysis') {
         if (!headers.includes('vehicle number') && !headers.includes('vehicle no')) {
           isValid = false;
           expectedColumns = 'Vehicle Number';
         }
       } else if (activeReport === 'weighbridge-report') {
         if (!headers.includes('weighbridge id') && !headers.includes('weighbridge_id')) {
           isValid = false;
           expectedColumns = 'TP date, District, Destination Godown, EPOD status, Weighbridge ID';
         }
       } else if (activeReport === 'penalty-epod') {
         if (!headers.includes('start_trip') && !headers.includes('start trip')) {
           isValid = false;
           expectedColumns = 'Reference Number, Penalty Hours, Start_Trip, end_trip';
         }
       } else if (activeReport === 'epod-photo-analysis') {
         isValid = true;
       }
    }

    if (!isValid) {
      self.postMessage({ type: 'error', message: 'Data Not Match! Expected cols: ' + expectedColumns });
      return;
    }

    self.postMessage({ type: 'progress', percent: 60, message: 'Processing ' + totalRowsCount + ' rows...' });
    
    const processed = [];
    const uniqueDcMonths = new Set();
    const uniqueDcDates = new Set();
    const uniqueEpodStatuses = new Set();
    const uniqueImeiStatuses = new Set();
    const uniqueTpDates = new Set();

    // Use the combined data from all sheets
    const jsonDataRaw = allJsonDataRaw;
    
    // Helper to get value case-insensitively and trim keys
    // Helper to get value using custom resolved aliases
    const getVal = (row, standardAttribute, ...fallbackAliases) => {
        let aliases = [standardAttribute];
        if (customAttributes && customAttributes[activeReport] && customAttributes[activeReport][standardAttribute]) {
           aliases = customAttributes[activeReport][standardAttribute];
        }

        if (fallbackAliases && fallbackAliases.length > 0) {
           aliases.push(...fallbackAliases);
        }

        const cleanStr = (s) => String(s).toLowerCase().replace(/[\s_]+/g, '');
        const lowerKeys = aliases.map(cleanStr);
        
        for (const k in row) {
            if (lowerKeys.includes(cleanStr(k))) {
                return row[k];
            }
        }
        return undefined;
    };
    const extractDynamicColumns = (row) => {
        const dynamicProps = {};
        if (customAttributes && customAttributes[activeReport]) {
            Object.keys(customAttributes[activeReport]).forEach(attr => {
                dynamicProps[attr] = getVal(row, attr) || '';
            });
        }
        return dynamicProps;
    };
    
    const jsonData = jsonDataRaw;
    
    // Parse tracking data if provided
    let trackingMap = null;
    let distanceMap = null;
    if (trackingData) {
      try {
         const wbTrack = XLSX.read(trackingData, { type: 'array' });
         const wsTrackName = wbTrack.SheetNames[0];
         const wsTrack = wbTrack.Sheets[wsTrackName];
         const trackingJson = XLSX.utils.sheet_to_json(wsTrack);
         
         trackingMap = {};
         distanceMap = {};
         trackingJson.forEach(row => {
            const refNo = String(getVal(row, 'Reference Number') || getVal(row, 'Reference No') || getVal(row, 'Ref No') || '').trim();
            if (refNo) {
               const rowValues = Object.values(row).map(v => String(v).toLowerCase());
               const isUntrack = rowValues.some(v => v.includes('untrack') || v === 'untracked');
               trackingMap[refNo.toLowerCase()] = isUntrack ? 'untracked' : 'tracked';
            }
            if (activeReport === 'last-mile-commodity') {
               const invoiceNo = String(getVal(row, 'Invoice No.') || row['Invoice No.'] || row['Invoice No'] || '').trim().toLowerCase();
               const distRaw = getVal(row, 'Distance(Km)') || row['Distance(Km)'] || row['Distance (Km)'];
               if (invoiceNo && distRaw !== undefined && distRaw !== null && distRaw !== '') {
                  const num = Number(distRaw);
                  if (!isNaN(num) && num > 0) {
                      if (!distanceMap[invoiceNo] || num > distanceMap[invoiceNo]) {
                          distanceMap[invoiceNo] = num;
                      }
                  }
               }
            }
         });
      } catch (err) {
         console.warn("Could not process tracking data:", err);
      }
    }

    if (activeReport === 'lifting-report') {
      let lastFmVehicleNo = '';
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
        if (trackingMap && refNum && trackingMap[refNum.toLowerCase()] === 'untracked') {
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

        processed.push({ ...row, ...extractDynamicColumns(row),
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
       
       let lastFmVehicleNo = '';
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
          
          tripGroups[key].push({ ...extractDynamicColumns(row),
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
                   processed.push({ ...row,
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
               
               processed.push({ ...group[0],
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
                if (timeStr < 10) return Math.round(timeStr * 24 * 60);
                return timeStr;
            }
            
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
               routesData.push({ ...extractDynamicColumns(row), orig, dest, actualTime, routeCode: routeCode || 'N/A', originalRow: row });
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
               self.postMessage({ type: 'progress', percent, message: `Fetching ETAs for ${routesData.length} Rows (API ${processedCount} of ${totalUnique})...` });
               
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
           
            processed.push({ ...r.originalRow, ...extractDynamicColumns(r.originalRow),
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

    if (activeReport === 'epod-photo-analysis') {
      const totalRows = jsonData.length;
      const sampleRow = jsonData[0] || {};
      const allKeys = Object.keys(sampleRow);

      const findKey = (priorityList, fallbackCheck) => {
        for (const p of priorityList) {
          const match = allKeys.find(k => k && k.trim().toLowerCase() === p.toLowerCase());
          if (match) return match;
        }
        if (fallbackCheck) {
          const match = allKeys.find(k => k && fallbackCheck(k.toLowerCase()));
          if (match) return match;
        }
        return null;
      };

      const districtKey = findKey(
        ['District', 'District Name', 'TP District', 'Godown District', 'district_name', 'district'],
        k => k.includes('district')
      );

      const godownKey = findKey(
        ['GSCSCL Godown', 'Godown Name', 'Godown', 'Destination Godown', 'Lifting Location Name', 'Source Godown', 'godown_name', 'godown'],
        k => k.includes('godown') || k.includes('destination') || k.includes('location')
      );

      const vehicleKey = findKey(
        ['Vehicle', 'Vehicle Number', 'Vehicle No', 'Truck Number', 'vehicle_number', 'truck_number', 'Truck No', 'vehicle', 'Truck'],
        k => k.includes('vehicle') || k.includes('truck')
      );

      const startImgKey = findKey(
        ['Start Trip Image', 'Start Trip Photo', 'Start Photo', 'Start Image', 'start_trip_image', 'start_trip_photo', 'Start Trip Photos', 'start trip photo', 'start trip image', 'Start Trip', 'Start Trip Link', 'start_trip_link', 'start_photo', 'start_image'],
        k => k.includes('start') && (k.includes('image') || k.includes('photo') || k.includes('link') || k.includes('pic') || k.includes('url') || k.includes('img'))
      );

      const epodImgKey = findKey(
        ['EPOD Image', 'Delivered Photo', 'Delivered Image', 'Delivered Photos', 'delivered_photo', 'end_trip_image', 'End Trip Image', 'EPOD Photo', 'delivered image', 'Delivered Image', 'epod_image', 'End Trip Image - EPOD', 'EPOD Photos', 'EPOD Link', 'epod_link', 'End Trip Photo', 'Delivered Link', 'delivered_image', 'epod_photo'],
        k => (k.includes('epod') || k.includes('deliver') || k.includes('end')) && (k.includes('image') || k.includes('photo') || k.includes('link') || k.includes('pic') || k.includes('url') || k.includes('img'))
      );

      const refNoKey = findKey(
        ['Reference Number', 'DC Number', 'Reference No', 'Ref No', 'DC No', 'DC No.', 'Delivery Challan Number', 'Delivery Challan No', 'ref_no', 'dc_no', 'DC', 'Invoice No', 'Invoice Number'],
        k => k.includes('dc') || k.includes('reference') || k.includes('challan') || k.includes('invoice') || k.includes('ref')
      );

      const dateKey = findKey(
        ['Date of Trip', 'Trip Date', 'TP date', 'TP Date', 'DC Creation Date', 'Created At', 'Date', 'Start Trip Date', 'trip_date'],
        k => k.includes('date') || k.includes('time')
      );

      let lastReportTime = Date.now();

      for (let i = 0; i < totalRows; i++) {
        const row = jsonData[i];
        if (!row) continue;

        const vehicle = vehicleKey ? String(row[vehicleKey] || '').trim() : '';
        const district = districtKey ? String(row[districtKey] || '').trim() : '';
        const godown = godownKey ? String(row[godownKey] || '').trim() : '';
        const refNo = refNoKey ? String(row[refNoKey] || '').trim() : '';
        const startTripImage = startImgKey ? cleanImageUrl(String(row[startImgKey] || '')) : '';
        const epodImage = epodImgKey ? cleanImageUrl(String(row[epodImgKey] || '')) : '';

        let tripDate = '';
        if (dateKey && row[dateKey]) {
          tripDate = formatExcelDate(row[dateKey]) || String(row[dateKey]).split(' ')[0];
        }

        // Only skip if row is entirely empty
        if (!vehicle && !district && !godown && !refNo && !startTripImage && !epodImage) {
          continue;
        }

        processed.push({
          id: `${vehicle || 'V'}_${refNo || tripDate || i}_${i + 1}`,
          district: district || 'N/A',
          godown: godown || 'N/A',
          vehicle: vehicle || 'N/A',
          refNo: refNo || 'N/A',
          startTripImage: startTripImage || '',
          epodImage: epodImage || '',
          tripDate: tripDate || 'N/A'
        });

        // Periodic progress reporting for large datasets (e.g., 2 Lakh rows)
        if (i % 25000 === 0 || Date.now() - lastReportTime > 600) {
          lastReportTime = Date.now();
          const percent = 60 + Math.round((i / totalRows) * 38);
          self.postMessage({
            type: 'progress',
            percent,
            message: `Processing EPOD Photos (${i.toLocaleString()} of ${totalRows.toLocaleString()} rows)...`
          });
        }
      }

      self.postMessage({ type: 'progress', percent: 99, message: 'Finalizing EPOD Data...' });
      self.postMessage({ type: 'success', data: processed });
      return;
    }

    let lmDist = '';
    let lmRefNo = '';
    let lmLrNo = '';
    let lmFpsArea = '';
    let lmFpsId = '';
    let lmFpsName = '';
    let lmTransporter = '';

    let lastFmVehicleNo = '';
    jsonData.forEach(row => {

      if (activeReport === 'penalty-epod') {
         const refNoStr = String(getVal(row, 'Reference Number') || getVal(row, 'Reference No') || '').trim();
         const currentDcNo = String(getVal(row, 'DC No.', 'DC No') || '').trim();
         
         if (refNoStr === '' && currentDcNo !== '') {
             if (processed.length > 0) {
                 const prev = processed[processed.length - 1];
                 if (prev.dcNo) {
                     prev.dcNo += ', ' + currentDcNo;
                 } else {
                     prev.dcNo = currentDcNo;
                 }
             }
             return;
         }
         
         const penaltyHoursRaw = getVal(row, 'Penalty Hours');
         let penaltyHours = 16;
         if (penaltyHoursRaw !== undefined && penaltyHoursRaw !== null && penaltyHoursRaw !== '') {
            penaltyHours = Number(penaltyHoursRaw) || 16;
         }

         const startTripRaw = getVal(row, 'Start_Trip', 'Start Trip', 'start trip');
         const endTripRaw = getVal(row, 'end_trip', 'End_Trip', 'End Trip', 'end trip');
         
         const formatPenaltyTime = (t) => {
             if (t === undefined || t === null || t === '') return '';
             if (typeof t === 'number') {
                 const parsed = XLSX.SSF.parse_date_code(t);
                 return `${parsed.y}-${String(parsed.m).padStart(2,'0')}-${String(parsed.d).padStart(2,'0')} ${String(parsed.H).padStart(2,'0')}:${String(parsed.M).padStart(2,'0')}`;
             }
             return String(t);
         };

         const startTripStr = formatPenaltyTime(startTripRaw);
         const endTripStr = formatPenaltyTime(endTripRaw);
         
         let totalTime = '';
         let finalPenalty = '';
         
         if (startTripRaw === '' || endTripRaw === '' || startTripRaw === undefined || endTripRaw === undefined) {
             totalTime = '';
             finalPenalty = '';
         } else if (typeof startTripRaw === 'number' && typeof endTripRaw === 'number') {
             if (endTripRaw < startTripRaw) {
                 totalTime = 'Time Error';
                 finalPenalty = 'Time Error';
             } else {
                 const diffDays = endTripRaw - startTripRaw;
                 const diffHours = diffDays * 24;
                 totalTime = diffHours;
                 
                 if (diffHours > penaltyHours) {
                     const extraHours = Math.ceil(diffHours - penaltyHours);
                     finalPenalty = extraHours * 2000;
                 } else {
                     finalPenalty = 0;
                 }
             }
         } else {
            const dStart = new Date(startTripStr);
            const dEnd = new Date(endTripStr);
            if (!isNaN(dStart.getTime()) && !isNaN(dEnd.getTime())) {
                if (dEnd < dStart) {
                   totalTime = 'Time Error';
                   finalPenalty = 'Time Error';
                } else {
                   const diffHours = (dEnd.getTime() - dStart.getTime()) / (1000 * 60 * 60);
                   totalTime = diffHours;
                   if (diffHours > penaltyHours) {
                       const extraHours = Math.ceil(diffHours - penaltyHours);
                       finalPenalty = extraHours * 2000;
                   } else {
                       finalPenalty = 0;
                   }
                }
            } else {
                totalTime = 'Data Error';
                finalPenalty = 'Data Error';
            }
         }

         processed.push({ ...row, ...extractDynamicColumns(row),
           refNo: refNoStr,
           penaltyHours: penaltyHours,
           startTripStr: startTripStr,
           endTripStr: endTripStr,
           dcNo: currentDcNo,
           totalTime: totalTime,
           finalPenalty: finalPenalty,
           isSubtotal: false,
           district: 'Penalty Data',
           sortKey: refNoStr
         });
         return;
      }

      if (activeReport === 'ro-allocation-dsm') {
         const roIdVal = getVal(row, 'RO ID');
         const roNumVal = getVal(row, 'RO Number');
         if (!roIdVal && !roNumVal) return;

         const dateRaw = getVal(row, 'Created At') || getVal(row, 'Pick Up Date') || getVal(row, 'Lifting Target Date') || getVal(row, 'RO date');
         if (dateRaw) {
             const dtStr = formatExcelDate(dateRaw);
             if (dtStr) uniqueTpDates.add(dtStr);
         }
         
         processed.push({
            ...row,
            district: getVal(row, 'district_name') || getVal(row, 'District') || '',
            roId: getVal(row, 'RO ID') || '',
            roNumber: getVal(row, 'RO Number') || '',
            refNo: getVal(row, 'Reference Number') || getVal(row, 'Reference No') || '',
            destLoc: getVal(row, 'Destination Godown') || '',
            targetQty: getVal(row, 'Lifting Target Qty Allocated') || 0,
            finalQty: getVal(row, 'final_quan_allocated_obj') || 0,
            tpDate: formatExcelDate(dateRaw),
            createDate: formatExcelDate(dateRaw),
            createMonth: formatExcelDate(dateRaw) ? (function(d){ return d.toLocaleString('default', { month: 'short' }) + ' ' + d.getFullYear() })(new Date(formatExcelDate(dateRaw))) : '',
            isSubtotal: false
         });
         return;
      }

      if (activeReport === 'first-mile-epod') {
         const refNoStr = String(getVal(row, 'Reference No') || getVal(row, 'Reference Number') || '');
         if (refNoStr.includes('_cancel')) return;
         
         if (getVal(row, 'TP date') === undefined || getVal(row, 'TP date') === null || String(getVal(row, 'TP date')).trim() === '') return;
         
         const tpDateRaw = getVal(row, 'TP date');
         if (tpDateRaw) {
             const dtStr = formatExcelDate(tpDateRaw);
             if (dtStr) uniqueTpDates.add(dtStr);
         }

         const epodDateRaw = getVal(row, 'EPOD Date');
         const epodStatusVal = String(getVal(row, 'EPOD status') || '').toUpperCase().trim();
         const isCompleted = (epodDateRaw !== undefined && epodDateRaw !== null && String(epodDateRaw).trim() !== '') || epodStatusVal === 'COMPLETED' || epodStatusVal === 'DELIVERED';

         processed.push({ ...row, ...extractDynamicColumns(row),
           district: getVal(row, 'District') || '',
           destLoc: getVal(row, 'Destination Godown') || '',
           transporter: getVal(row, 'Transporter Name') || '',
           tpDate: formatExcelDate(getVal(row, 'TP date')),
           status: isCompleted ? 'Completed' : 'Pending',
           epodComplete: isCompleted ? 1 : 0,
           epodPending: isCompleted ? 0 : 1,
           trips: isCompleted ? 0 : 1,
           totalTps: 1,
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

         processed.push({ ...row, ...extractDynamicColumns(row),
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
      
      if (activeReport === 'last-mile-commodity') {
         let district = String(getVal(row, 'District') || '').trim();
         let refNo = String(getVal(row, 'Reference Number') || '').trim();
         
         const commodity = String(getVal(row, 'Commodity') || '').trim();
         const schemeName = String(getVal(row, 'Scheme name') || getVal(row, 'Scheme Name') || getVal(row, 'Scheme key/Name') || '').trim();
         
         if (!district && !refNo && !commodity && !schemeName) {
             return; 
         }
         
         const isFirstRowOfDC = Boolean(refNo);
         
         if (district) lmDist = district; else district = lmDist;
         if (refNo) lmRefNo = refNo; else refNo = lmRefNo;
         
         let lrNo = String(getVal(row, 'LR Number') || '').trim();
         const isFirstRowOfLR = Boolean(lrNo);
         if (lrNo) lmLrNo = lrNo; else lrNo = lmLrNo;
         
         let fpsAreaId = String(getVal(row, 'FPS Area ID') || '').trim();
         if (fpsAreaId) lmFpsArea = fpsAreaId; else fpsAreaId = lmFpsArea;
         
         let fpsId = String(getVal(row, 'FPS id') || '').trim();
         if (fpsId) lmFpsId = fpsId; else fpsId = lmFpsId;
         
         let fpsName = String(getVal(row, 'FPS Name') || '').trim();
         if (fpsName) lmFpsName = fpsName; else fpsName = lmFpsName;
         
         let transporterName = String(getVal(row, 'Transporter Name') || '').trim();
         if (transporterName) lmTransporter = transporterName; else transporterName = lmTransporter;
         
         const qtyRaw = getVal(row, 'Quantity') || 0;
         const qty = Number(qtyRaw) || 0;
         
         let distance = 0;
         if (distanceMap && lrNo && distanceMap[lrNo.toLowerCase()] !== undefined) {
             distance = distanceMap[lrNo.toLowerCase()];
         }
         
         row['District'] = district;
         row['Reference Number'] = refNo;
         row['LR Number'] = lrNo;
         row['FPS Area ID'] = fpsAreaId;
         row['FPS id'] = fpsId;
         row['FPS Name'] = fpsName;
         row['Transporter Name'] = transporterName;

         processed.push({ ...row, ...extractDynamicColumns(row),
           district: district,
           refNo: refNo,
           lrNo: lrNo,
           fpsAreaId: fpsAreaId,
           fpsId: fpsId,
           fpsName: fpsName,
           transporterName: transporterName,
           commodity: commodity,
           quantity: qty,
           tripCount: lrNo ? 1 : 0,
           distance: distance
         });
         return;
      }
      
       if (activeReport === 'gps-analysis') {
          const vehicleNo = String(getVal(row, 'vehicle_no') || '').trim();
          const imei = String(getVal(row, 'imei') || '').trim();
          if (!vehicleNo && !imei) return;
          
          const timestampRaw = getVal(row, 'ist_timestamp');
          let timestamp = timestampRaw;
          if (typeof timestampRaw === 'number') {
             const date = new Date(Math.round((timestampRaw - 25569) * 86400 * 1000));
             timestamp = date.toISOString();
          } else if (timestampRaw) {
             timestamp = String(timestampRaw);
          }
          
          const lat = getVal(row, 'latitude');
          const lng = getVal(row, 'longitude');
          const extraData = String(getVal(row, 'extra_data') || '').toLowerCase();
          const isTampered = extraData.includes('"tampering": true') || extraData.includes('"tampering":true');
          
          processed.push({
             vehicleNo: vehicleNo || imei,
             imei: imei,
             timestamp: timestamp,
             lat: lat,
             lng: lng,
             isTampered: isTampered,
             extraData: extraData
          });
          return;
       }
       
      if (activeReport === 'last-mile-imei') {
         const district = String(getVal(row, 'District', 'TP District', 'Godown District') || '').trim();
         if (!district) return;
         
         const refNo = String(getVal(row, 'Reference Number', 'Delivery Challan Number', 'DC No', 'Reference No') || '').trim();
         if (refNo.toLowerCase().includes('_cancel')) return;
         const hasRef = refNo.length > 0;
         if (!hasRef) return;
         
         const startIMEI = String(getVal(row, 'IMEI At Start', 'Start IMEI', 'IMEI_Start') || '').trim();
         const endIMEI = String(getVal(row, 'IMEI At End', 'End IMEI', 'IMEI_End') || '').trim();
         
         const rawDcDate = getVal(row, 'DC Creation Date', 'DC Date', 'Creation Date');
         const dcDate = formatExcelDate(rawDcDate) || '';
         
         let statusRaw = String(getVal(row, 'EPOD Status', 'Status') || '').trim();
         if (!statusRaw || statusRaw.toLowerCase() === '(blank)' || statusRaw.toLowerCase() === 'blank') {
            statusRaw = 'PENDING';
         } else if (statusRaw.toLowerCase() === 'delivered') {
            statusRaw = 'DELIVERED';
         }
         uniqueEpodStatuses.add(statusRaw);
         
         let imeiStatus = 'Missing Both IMEIs';
         let matched = 0, mismatched = 0, missing = 0;
         
         if (!startIMEI && !endIMEI) {
            imeiStatus = 'Missing Both IMEIs';
            missing = 1;
         } else if (!startIMEI) {
            imeiStatus = 'Missing Start IMEI';
            missing = 1;
         } else if (!endIMEI) {
            imeiStatus = 'Missing End IMEI';
            missing = 1;
         } else if (startIMEI === endIMEI) {
            imeiStatus = 'IMEI Matched';
            matched = 1;
         } else {
            imeiStatus = 'IMEI Mismatched';
            mismatched = 1;
         }
         
         uniqueImeiStatuses.add(imeiStatus);
         
         processed.push({ ...row, ...extractDynamicColumns(row),
            district,
            godown: getVal(row, 'GSCSCL Godown', 'Godown') || '',
            transporter: getVal(row, 'Transporter Name', 'Transporter', 'DSD Transporter Name') || '',
            vehicleNo: getVal(row, 'Vehicle Number User', 'Vehicle Number', 'Vehicle No') || '',
            refNo,
            dcCreationDate: dcDate,
            epodStatusRaw: statusRaw,
            startIMEI,
            endIMEI,
            imeiStatus,
            totalTrips: 1,
            matched,
            mismatched,
            missing
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

         processed.push({ ...row, ...extractDynamicColumns(row),
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
      
      if (activeReport === 'first-mile-vehicle-registered') {
         let vehicleNo = getVal(row, 'Vehicle Number', 'Vehicle No', 'Truck Number', 'truck number');
         if (vehicleNo !== undefined && vehicleNo !== null && String(vehicleNo).trim() !== '') {
             lastFmVehicleNo = String(vehicleNo).trim();
         } else {
             vehicleNo = lastFmVehicleNo;
         }
         
         if (!vehicleNo || String(vehicleNo).trim() === '') return;

         let district = getVal(row, 'District');
         let transporter = getVal(row, 'Transporter Name', 'Transporter', 'Transport', 'Tran', 'gps vendor', 'vendor') || '';

         let branchCode = getVal(row, 'trans ID') || getVal(row, 'branch') || getVal(row, 'User Mapping$Branch') || getVal(row, 'User_Mapping$Branch');
         
         if (!branchCode && district && String(district).toLowerCase().startsWith('fm')) {
             branchCode = district;
         }

         if (branchCode) {
             const mapping = FM_TRANSPORT_MAPPING[branchCode] || FM_TRANSPORT_MAPPING['fm' + branchCode];
             if (mapping) {
                 if (mapping.district && String(mapping.district).trim() !== '') {
                     district = mapping.district;
                 }
                 if (mapping.transporter && String(mapping.transporter).trim() !== '') {
                     transporter = mapping.transporter;
                 }
             }
         }

         processed.push({ ...row, ...extractDynamicColumns(row),
            vehicleNo: vehicleNo,
            district: district || '',
            transporter: transporter || '',
            capacity: getVal(row, 'Capacity', 'capacity(mt)', 'truck type') || ''
         });
         return;
      }

      if (activeReport === 'vehicle-assigned') {
         const refNoStr = String(getVal(row, 'Reference Number') || '');
         if (refNoStr.toLowerCase().includes('_cancel')) return;

         let district = getVal(row, 'District');
         const tpDate = formatExcelDate(getVal(row, 'TP date') || getVal(row, 'TP Date') || getVal(row, 'tp date') || getVal(row, 'Created At'));

         processed.push({ ...row, ...extractDynamicColumns(row),
            refNo: refNoStr,
            district: district || '',
            tpDate: tpDate || '',
            vehicleNo: getVal(row, 'Vehicle Number') || getVal(row, 'Vehicle No.') || getVal(row, 'Truck Number') || '',
            destGodown: getVal(row, 'Destination Godown') || '',
            transporter: getVal(row, 'Transporter Name') || ''
         });
         return;
      }
      
      if (activeReport === 'last-mile-vehicle-assigned') {
         const refNoStr = String(getVal(row, 'Reference Number') || '');
         const lrNoStr = String(getVal(row, 'LR Number') || '');
         
         const rawQty = getVal(row, 'Total DC Qty(Kg)');
         let qtyKg = 0;
         let qtyMt = 0;
         if (rawQty) {
             const parsed = parseFloat(rawQty);
             if (!isNaN(parsed)) {
                 qtyKg = parsed;
                 qtyMt = parseFloat((parsed / 1000).toFixed(3));
             }
         }

         let epodStatus = getVal(row, 'EPOD Status') || '(Blanks)';
         if (epodStatus) uniqueEpodStatuses.add(epodStatus);

         processed.push({ ...row, ...extractDynamicColumns(row),
            refNo: refNoStr,
            dcCreationDate: formatExcelDate(getVal(row, 'DC Creation Date') || ''),
            createdAt: getVal(row, 'Created At') || '',
            district: getVal(row, 'District') || '',
            lrNumber: lrNoStr,
            fpsName: getVal(row, 'FPS Name') || '',
            areaIdFpsName: getVal(row, 'Area ID/FPS Name') || '',
            gscsclGodown: getVal(row, 'GSCSCL Godown') || '',
            transporterName: getVal(row, 'Transporter Name') || '',
            vehicleNumberUser: getVal(row, 'Vehicle Number User') || '',
            epodStatus: epodStatus,
            qtyKg: qtyKg,
            qtyMt: qtyMt,
            timeOfStartTrip: getVal(row, 'time_of_start_trip') || '',
            timeOfDelivery: getVal(row, 'Time of Delivery') || '',
            updateDeliverDateTime: getVal(row, 'update_deliver_date_time1') || ''
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

      let createMonth = '';
      let createDate = '';
      if (formattedCreatedAt && formattedCreatedAt.length >= 10) {
         createDate = formattedCreatedAt.substring(0, 10);
         createMonth = formattedCreatedAt.substring(0, 7);
         uniqueDcMonths.add(createMonth);
         uniqueDcDates.add(createDate);
      }

      processed.push({ ...row, ...extractDynamicColumns(row),
        district,
        sourceLoc,
        destLoc,
        transporter: getVal(row, 'Transporter') || '',
        tpDate: '',
        createdAt: formattedCreatedAt,
        createDate: createDate,
        createMonth: createMonth,
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

    if (activeReport === 'first-mile-vehicle-registered') {
        const vCounts = {};
        processed.forEach(r => {
            const v = (r.vehicleNo || '').trim().toUpperCase();
            if (v) vCounts[v] = (vCounts[v] || 0) + 1;
        });
        processed.forEach(r => {
            const v = (r.vehicleNo || '').trim().toUpperCase();
            r.isMultipleMapping = (v && vCounts[v] > 1) ? 'Yes' : 'No';
        });
    }

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
        uniqueEpodStatuses: Array.from(uniqueEpodStatuses),
        uniqueImeiStatuses: Array.from(uniqueImeiStatuses)
      }
    });
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message || 'Error processing file' });
  }
};
