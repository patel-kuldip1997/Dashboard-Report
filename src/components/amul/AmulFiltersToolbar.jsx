import React, { useMemo } from 'react';
import { Filter, Search, RotateCcw, Building2, MapPin, Truck, CheckCircle2, Navigation, Layers } from 'lucide-react';

export default function AmulFiltersToolbar({ 
  records, 
  filters, 
  setFilters, 
  filteredCount, 
  totalCount,
  onReset
}) {
  // Extract unique options from records
  const { districts, transporters } = useMemo(() => {
    if (!records || records.length === 0) return { districts: [], transporters: [] };
    const distSet = new Set();
    const transSet = new Set();
    records.forEach(r => {
      if (r.districtName) distSet.add(r.districtName.trim().toUpperCase());
      if (r.transporter && r.transporter !== 'Unassigned Transporter') transSet.add(r.transporter.trim());
    });
    return {
      districts: Array.from(distSet).sort(),
      transporters: Array.from(transSet).sort()
    };
  }, [records]);

  const hasActiveFilters = 
    filters.dairy !== 'ALL' || 
    filters.district !== 'ALL' || 
    filters.transporter !== 'ALL' || 
    filters.deliveryStatus !== 'ALL' || 
    filters.trackingStatus !== 'ALL' || 
    filters.search.trim() !== '';

  if (!records || records.length === 0) return null;

  return (
    <div style={{
      background: 'var(--bg-panel, #FFFFFF)',
      border: '1px solid var(--border-color, #E2E8F0)',
      borderRadius: '14px',
      padding: '16px 20px',
      marginBottom: '20px',
      boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.04))'
    }}>
      {/* Top row: Title and Badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '14px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: 'rgba(227, 30, 36, 0.1)',
            color: '#E31E24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Filter size={15} />
          </div>
          <span style={{ fontWeight: '800', fontSize: '0.92rem', color: 'var(--text-main, #0F172A)', letterSpacing: '-0.01em' }}>
            Dashboard Filters
          </span>
          <span style={{
            fontSize: '0.74rem',
            background: hasActiveFilters ? 'rgba(227, 30, 36, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            color: hasActiveFilters ? '#E31E24' : 'var(--text-muted, #64748B)',
            padding: '2px 8px',
            borderRadius: '12px',
            fontWeight: '700'
          }}>
            Showing {Number(filteredCount).toLocaleString('en-IN')} of {Number(totalCount).toLocaleString('en-IN')} rows
          </span>
        </div>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              color: '#DC2626',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.76rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <RotateCcw size={12} /> Reset Filters
          </button>
        )}
      </div>

      {/* Filter Controls Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '12px',
        alignItems: 'center'
      }}>
        {/* 1. Nodal Dairy */}
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted, #64748B)', marginBottom: '4px', textTransform: 'uppercase' }}>
            Nodal Dairy
          </label>
          <select
            value={filters.dairy}
            onChange={(e) => setFilters(prev => ({ ...prev, dairy: e.target.value }))}
            style={{
              width: '100%',
              background: 'var(--bg-panel, #FFFFFF)',
              border: '1px solid var(--border-color, #CBD5E1)',
              borderRadius: '8px',
              padding: '7px 10px',
              fontSize: '0.82rem',
              color: 'var(--text-main, #0F172A)',
              fontWeight: '600',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Dairies (Banas, Kaira, Sumul)</option>
            <option value="BANAS">Banas Dairy (Palanpur)</option>
            <option value="KAIRA">Kaira Dairy (Anand)</option>
            <option value="SUMUL">Sumul Dairy (Surat)</option>
          </select>
        </div>

        {/* 2. District */}
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted, #64748B)', marginBottom: '4px', textTransform: 'uppercase' }}>
            District ({districts.length})
          </label>
          <select
            value={filters.district}
            onChange={(e) => setFilters(prev => ({ ...prev, district: e.target.value }))}
            style={{
              width: '100%',
              background: 'var(--bg-panel, #FFFFFF)',
              border: '1px solid var(--border-color, #CBD5E1)',
              borderRadius: '8px',
              padding: '7px 10px',
              fontSize: '0.82rem',
              color: 'var(--text-main, #0F172A)',
              fontWeight: '600',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Districts ({districts.length})</option>
            {districts.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* 3. Transporter */}
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted, #64748B)', marginBottom: '4px', textTransform: 'uppercase' }}>
            Transporter ({transporters.length})
          </label>
          <select
            value={filters.transporter}
            onChange={(e) => setFilters(prev => ({ ...prev, transporter: e.target.value }))}
            style={{
              width: '100%',
              background: 'var(--bg-panel, #FFFFFF)',
              border: '1px solid var(--border-color, #CBD5E1)',
              borderRadius: '8px',
              padding: '7px 10px',
              fontSize: '0.82rem',
              color: 'var(--text-main, #0F172A)',
              fontWeight: '600',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Transporters ({transporters.length})</option>
            {transporters.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* 4. Delivery Status */}
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted, #64748B)', marginBottom: '4px', textTransform: 'uppercase' }}>
            Delivery Status
          </label>
          <select
            value={filters.deliveryStatus}
            onChange={(e) => setFilters(prev => ({ ...prev, deliveryStatus: e.target.value }))}
            style={{
              width: '100%',
              background: 'var(--bg-panel, #FFFFFF)',
              border: '1px solid var(--border-color, #CBD5E1)',
              borderRadius: '8px',
              padding: '7px 10px',
              fontSize: '0.82rem',
              color: 'var(--text-main, #0F172A)',
              fontWeight: '600',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Delivery Statuses</option>
            <option value="Delivered">Delivered</option>
            <option value="Pending">Delivery Pending</option>
          </select>
        </div>

        {/* 5. GPS Tracking */}
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted, #64748B)', marginBottom: '4px', textTransform: 'uppercase' }}>
            GPS Status
          </label>
          <select
            value={filters.trackingStatus}
            onChange={(e) => setFilters(prev => ({ ...prev, trackingStatus: e.target.value }))}
            style={{
              width: '100%',
              background: 'var(--bg-panel, #FFFFFF)',
              border: '1px solid var(--border-color, #CBD5E1)',
              borderRadius: '8px',
              padding: '7px 10px',
              fontSize: '0.82rem',
              color: 'var(--text-main, #0F172A)',
              fontWeight: '600',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All GPS Statuses</option>
            <option value="tracked">Tracked</option>
            <option value="untracked">Untracked</option>
          </select>
        </div>

        {/* 6. Quick Search */}
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted, #64748B)', marginBottom: '4px', textTransform: 'uppercase' }}>
            Search Keyword
          </label>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted, #94A3B8)' }} />
            <input
              type="text"
              placeholder="LR, Route, Vehicle, Block..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              style={{
                width: '100%',
                background: 'var(--bg-panel, #FFFFFF)',
                border: '1px solid var(--border-color, #CBD5E1)',
                borderRadius: '8px',
                padding: '7px 10px 7px 30px',
                fontSize: '0.82rem',
                color: 'var(--text-main, #0F172A)',
                outline: 'none'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
