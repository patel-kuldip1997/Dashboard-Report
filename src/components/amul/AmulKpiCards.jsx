import React from 'react';
import { Package, Truck, MapPin, CheckCircle2, Navigation, AlertTriangle, Building2, Calendar } from 'lucide-react';

export default function AmulKpiCards({ kpis }) {
  if (!kpis) return null;

  const totalRoutesNum = parseInt(kpis.totalRoutes || 0, 10);
  const isBlank = totalRoutesNum === 0 && (parseInt(kpis.totalQty || 0, 10) === 0);

  const cards = [
    {
      title: 'Dispatched Quantity',
      value: `${Number(kpis.totalQty || 0).toLocaleString('en-IN')} Kg`,
      sub: `${kpis.totalQtyMt || '0.00'} Metric Tonnes (MT)`,
      icon: Package,
      color: '#1E3A8A',
      accentColor: '#2563EB',
      bg: 'rgba(37, 99, 235, 0.08)',
      topBorder: '#2563EB'
    },
    {
      title: 'Consignments / LRs',
      value: `${kpis.totalTrips || 0} LRs`,
      sub: `${kpis.totalVehicles || 0} Dedicated Vehicles`,
      icon: Truck,
      color: '#7C3AED',
      accentColor: '#7C3AED',
      bg: 'rgba(124, 58, 237, 0.08)',
      topBorder: '#7C3AED'
    },
    {
      title: 'Distribution Routes',
      value: `${kpis.totalRoutes || 0} Routes`,
      sub: `${kpis.deliveredRoutes || 0} Delivered (${kpis.deliveryRate || '0.0'}%)`,
      icon: MapPin,
      color: '#0284C7',
      accentColor: '#0284C7',
      bg: 'rgba(2, 132, 199, 0.08)',
      topBorder: '#0284C7'
    },
    {
      title: 'Anganwadi Centers (Sejas)',
      value: `${Number(kpis.totalSejas || 0).toLocaleString('en-IN')}`,
      sub: `${kpis.deliveredSejas || 0} Delivered (${kpis.sejaRate || '0.0'}%)`,
      icon: Building2,
      color: '#059669',
      accentColor: '#059669',
      bg: 'rgba(5, 150, 105, 0.08)',
      topBorder: '#059669'
    },
    {
      title: 'GPS Tracking Compliance',
      value: `${kpis.trackingRate || '0.0'}%`,
      sub: `${kpis.trackedRoutes || 0} Tracked / ${kpis.untrackedRoutes || 0} Untracked`,
      icon: Navigation,
      color: parseFloat(kpis.trackingRate || 0) >= 90 ? '#059669' : '#D97706',
      accentColor: parseFloat(kpis.trackingRate || 0) >= 90 ? '#059669' : '#D97706',
      bg: parseFloat(kpis.trackingRate || 0) >= 90 ? 'rgba(5, 150, 105, 0.08)' : 'rgba(217, 119, 6, 0.08)',
      topBorder: parseFloat(kpis.trackingRate || 0) >= 90 ? '#059669' : '#D97706'
    },
    {
      title: 'Pending Routes',
      value: `${kpis.pendingRoutes || 0}`,
      sub: isBlank ? 'No dispatches loaded' : `Delivery Pending (${(100 - parseFloat(kpis.deliveryRate || 0)).toFixed(1)}%)`,
      icon: AlertTriangle,
      color: (kpis.pendingRoutes || 0) > 0 ? '#E31E24' : '#059669',
      accentColor: (kpis.pendingRoutes || 0) > 0 ? '#E31E24' : '#059669',
      bg: (kpis.pendingRoutes || 0) > 0 ? 'rgba(227, 30, 36, 0.08)' : 'rgba(5, 150, 105, 0.08)',
      topBorder: (kpis.pendingRoutes || 0) > 0 ? '#E31E24' : '#059669'
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    }}>
      {cards.map((c, i) => {
        const IconComp = c.icon;
        return (
          <div
            key={i}
            style={{
              background: 'var(--bg-panel, #FFFFFF)',
              border: '1px solid var(--border-color, #E2E8F0)',
              borderTop: `4px solid ${c.topBorder}`,
              borderRadius: '14px',
              padding: '18px 20px',
              boxShadow: 'var(--shadow-sm, 0 2px 6px rgba(0,0,0,0.04))',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted, #475569)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                {c.title}
              </span>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: c.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: c.accentColor
              }}>
                <IconComp size={18} />
              </div>
            </div>

            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main, #0F172A)', letterSpacing: '-0.02em', fontFamily: 'Outfit, sans-serif' }}>
                {c.value}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #475569)', marginTop: '4px', fontWeight: '500' }}>
                {c.sub}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
