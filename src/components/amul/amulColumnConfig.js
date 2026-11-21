export const DEFAULT_AMUL_COLUMNS = {
  routes: [
    { id: 'srNo', label: 'Sr', visible: true },
    { id: 'route', label: 'Route Code / Name', visible: true },
    { id: 'plant', label: 'Nodal Dairy', visible: true },
    { id: 'district', label: 'District', visible: true },
    { id: 'block', label: 'Taluka / Block', visible: true },
    { id: 'transporter', label: 'Transporter', visible: true },
    { id: 'vehicle', label: 'Vehicle', visible: true },
    { id: 'lrNo', label: 'LR Number', visible: true },
    { id: 'sejas', label: 'Centers (Sejas)', visible: true },
    { id: 'qty', label: 'Dispatched Qty (Kg)', visible: true },
    { id: 'trackingStatus', label: 'GPS Status', visible: true },
    { id: 'deliveryStatus', label: 'Delivery Status', visible: true }
  ],
  transporters: [
    { id: 'name', label: 'Transporter Name', visible: true },
    { id: 'plant', label: 'Nodal Dairy', visible: true },
    { id: 'routes', label: 'Total Routes', visible: true },
    { id: 'sejas', label: 'Sejas', visible: true },
    { id: 'qty', label: 'Dispatched Qty (Kg)', visible: true },
    { id: 'deliveredBlocks', label: 'Delivered Blocks', visible: true },
    { id: 'pendingBlocks', label: 'Pending Blocks', visible: true },
    { id: 'deliveryRation', label: 'Delivery Ration %', visible: true },
    { id: 'tracked', label: 'Tracked', visible: true },
    { id: 'trackingRate', label: 'Tracking Rate %', visible: true },
    { id: 'slaCompliance', label: 'SLA Compliance', visible: true }
  ],
  districts: [
    { id: 'nodalDairy', label: 'Nodal Dairy (Col A)', visible: true },
    { id: 'districtName', label: 'District Name (Col B)', visible: true },
    { id: 'routes', label: 'Routes', visible: true },
    { id: 'sejas', label: 'Sejas', visible: true },
    { id: 'qty', label: 'Dispatched Qty (Kg)', visible: true },
    { id: 'deliveredSejas', label: 'Delivered Sejas', visible: true },
    { id: 'pendingSejas', label: 'Pending Sejas', visible: true },
    { id: 'sejaRate', label: 'Seja Fulfillment %', visible: true },
    { id: 'gpsTracked', label: 'GPS Tracked', visible: true },
    { id: 'gpsTrackingRate', label: 'GPS Tracking %', visible: true },
    { id: 'status', label: 'Status', visible: true }
  ]
};

export function getAmulColumnConfig() {
  try {
    const saved = localStorage.getItem('amul_column_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        routes: mergeConfig(DEFAULT_AMUL_COLUMNS.routes, parsed.routes),
        transporters: mergeConfig(DEFAULT_AMUL_COLUMNS.transporters, parsed.transporters),
        districts: mergeConfig(DEFAULT_AMUL_COLUMNS.districts, parsed.districts)
      };
    }
  } catch (e) {
    console.error('Error reading column config', e);
  }
  return DEFAULT_AMUL_COLUMNS;
}

export function saveAmulColumnConfig(config) {
  try {
    localStorage.setItem('amul_column_config', JSON.stringify(config));
  } catch (e) {
    console.error('Error saving column config', e);
  }
}

function mergeConfig(defaults, saved) {
  if (!Array.isArray(saved)) return defaults;
  return defaults.map(def => {
    const s = saved.find(item => item.id === def.id);
    return s ? { ...def, visible: s.visible !== false } : def;
  });
}
