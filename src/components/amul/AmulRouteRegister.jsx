import React, { useState, useMemo } from 'react';
import { Route, Search, ChevronLeft, ChevronRight, CheckCircle2, Clock, Navigation, AlertTriangle, Filter } from 'lucide-react';

export default function AmulRouteRegister({ routes, columnConfig }) {
  const [search, setSearch] = useState('');
  const [dairyFilter, setDairyFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const colMap = useMemo(() => {
    const map = {};
    const cols = columnConfig?.routes || [];
    cols.forEach(c => { map[c.id] = c.visible !== false; });
    return map;
  }, [columnConfig]);

  const filteredRoutes = useMemo(() => {
    if (!routes) return [];
    return routes.filter(r => {
      const q = search.toLowerCase();
      const matchSearch = r.route.toLowerCase().includes(q) ||
                          r.vehicle.toLowerCase().includes(q) ||
                          r.transporter.toLowerCase().includes(q) ||
                          r.lrNo.toLowerCase().includes(q) ||
                          r.district.toLowerCase().includes(q) ||
                          r.block.toLowerCase().includes(q);
      const matchDairy = dairyFilter === 'ALL' || r.plant.toUpperCase() === dairyFilter.toUpperCase();
      
      let matchStatus = true;
      if (statusFilter === 'DELIVERED') matchStatus = r.deliveryStatus === 'Delivered';
      else if (statusFilter === 'PENDING') matchStatus = r.deliveryStatus === 'Pending';
      else if (statusFilter === 'TRACKED') matchStatus = r.trackingStatus === 'tracked';
      else if (statusFilter === 'UNTRACKED') matchStatus = r.trackingStatus !== 'tracked';

      return matchSearch && matchDairy && matchStatus;
    });
  }, [routes, search, dairyFilter, statusFilter]);

  const totalPages = Math.ceil(filteredRoutes.length / pageSize) || 1;
  const currentPage = Math.min(page, totalPages);
  const pagedRoutes = filteredRoutes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (!routes || routes.length === 0) return null;

  return (
    <div style={{
      background: 'var(--bg-panel, #FFFFFF)',
      border: '1px solid var(--border-color, #E2E8F0)',
      borderRadius: '16px',
      overflow: 'hidden',
      marginBottom: '28px',
      boxShadow: 'var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.05))'
    }}>
      {/* Header and Controls */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-color, #E2E8F0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        background: 'rgba(0, 0, 0, 0.01)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(124, 58, 237, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#7C3AED'
          }}>
            <Route size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-main, #0F172A)', fontFamily: 'Outfit, sans-serif' }}>
              4. Consignment & Route Monitoring Register ({routes.length} Unique Routes)
            </h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted, #475569)' }}>
              LR-level dispatch tracking, vehicle telemetry, and Anganwadi delivery confirmation
            </p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Dairy Tabs */}
          <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.04)', borderRadius: '8px', padding: '2px', border: '1px solid var(--border-color, #E2E8F0)' }}>
            {['ALL', 'BANAS', 'KAIRA', 'SUMUL'].map(d => (
              <button
                key={d}
                onClick={() => { setDairyFilter(d); setPage(1); }}
                style={{
                  background: dairyFilter === d ? '#E31E24' : 'transparent',
                  color: dairyFilter === d ? '#FFFFFF' : 'var(--text-muted, #475569)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Status Tabs */}
          <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.04)', borderRadius: '8px', padding: '2px', border: '1px solid var(--border-color, #E2E8F0)' }}>
            {[
              { id: 'ALL', label: 'All' },
              { id: 'DELIVERED', label: 'Delivered' },
              { id: 'PENDING', label: 'Pending' },
              { id: 'TRACKED', label: 'GPS Tracked' }
            ].map(s => (
              <button
                key={s.id}
                onClick={() => { setStatusFilter(s.id); setPage(1); }}
                style={{
                  background: statusFilter === s.id ? '#1E3A8A' : 'transparent',
                  color: statusFilter === s.id ? '#FFFFFF' : 'var(--text-muted, #475569)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim, #64748b)' }} />
            <input
              type="text"
              placeholder="Search route, LR, vehicle..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{
                background: 'var(--bg-panel, #FFFFFF)',
                border: '1px solid var(--border-color, #CBD5E1)',
                borderRadius: '8px',
                padding: '6px 10px 6px 30px',
                color: 'var(--text-main, #0F172A)',
                fontSize: '0.8rem',
                outline: 'none',
                width: '180px'
              }}
            />
          </div>
        </div>
      </div>

      {/* Table with Customizable Columns */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{
              background: 'rgba(0, 0, 0, 0.02)',
              borderBottom: '1px solid var(--border-color, #E2E8F0)',
              color: 'var(--text-muted, #475569)',
              fontWeight: '700'
            }}>
              {colMap.srNo !== false && <th style={{ padding: '12px 14px', width: '50px', textAlign: 'center' }}>Sr</th>}
              {colMap.route !== false && <th style={{ padding: '12px 16px' }}>Route Code / Name</th>}
              {colMap.plant !== false && <th style={{ padding: '12px 12px', textAlign: 'center' }}>Dairy</th>}
              {colMap.district !== false && <th style={{ padding: '12px 14px' }}>District</th>}
              {colMap.block !== false && <th style={{ padding: '12px 14px' }}>Taluka / Block</th>}
              {colMap.transporter !== false && <th style={{ padding: '12px 14px' }}>Transporter</th>}
              {colMap.vehicle !== false && <th style={{ padding: '12px 12px', textAlign: 'center' }}>Vehicle</th>}
              {colMap.lrNo !== false && <th style={{ padding: '12px 14px' }}>LR Number</th>}
              {colMap.sejas !== false && <th style={{ padding: '12px 12px', textAlign: 'center' }}>Centers</th>}
              {colMap.qty !== false && <th style={{ padding: '12px 14px', textAlign: 'right' }}>Qty (Kg)</th>}
              {colMap.trackingStatus !== false && <th style={{ padding: '12px 14px', textAlign: 'center' }}>GPS Status</th>}
              {colMap.deliveryStatus !== false && <th style={{ padding: '12px 14px', textAlign: 'center' }}>Delivery Status</th>}
            </tr>
          </thead>
          <tbody>
            {pagedRoutes.map((r, idx) => {
              const srNo = (currentPage - 1) * pageSize + idx + 1;
              return (
                <tr
                  key={idx}
                  style={{
                    borderBottom: '1px solid var(--border-color, #F1F5F9)',
                    transition: 'background 0.15s ease'
                  }}
                >
                  {colMap.srNo !== false && (
                    <td style={{ padding: '11px 14px', textAlign: 'center', color: 'var(--text-dim, #64748b)' }}>{srNo}</td>
                  )}
                  {colMap.route !== false && (
                    <td style={{ padding: '11px 16px', fontWeight: '700', color: 'var(--text-main, #0F172A)' }}>
                      {r.route}
                    </td>
                  )}
                  {colMap.plant !== false && (
                    <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 7px',
                        borderRadius: '5px',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        background: r.plant === 'Banas' ? 'rgba(37,99,235,0.1)' : (r.plant === 'Kaira' ? 'rgba(227,30,36,0.1)' : 'rgba(5,150,105,0.1)'),
                        color: r.plant === 'Banas' ? '#2563EB' : (r.plant === 'Kaira' ? '#DC2626' : '#059669')
                      }}>
                        {r.plant}
                      </span>
                    </td>
                  )}
                  {colMap.district !== false && (
                    <td style={{ padding: '11px 14px', color: 'var(--text-muted, #475569)' }}>{r.district}</td>
                  )}
                  {colMap.block !== false && (
                    <td style={{ padding: '11px 14px', color: 'var(--text-dim, #64748b)' }}>{r.block}</td>
                  )}
                  {colMap.transporter !== false && (
                    <td style={{ padding: '11px 14px', fontWeight: '600', color: 'var(--text-main, #0F172A)' }}>{r.transporter}</td>
                  )}
                  {colMap.vehicle !== false && (
                    <td style={{ padding: '11px 12px', textAlign: 'center', fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: '600' }}>{r.vehicle}</td>
                  )}
                  {colMap.lrNo !== false && (
                    <td style={{ padding: '11px 14px', color: 'var(--text-dim, #64748b)', fontSize: '0.78rem' }}>{r.lrNo}</td>
                  )}
                  {colMap.sejas !== false && (
                    <td style={{ padding: '11px 12px', textAlign: 'center', fontWeight: '700' }}>{r.sejas}</td>
                  )}
                  {colMap.qty !== false && (
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: '700' }}>
                      {Number(r.qty).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </td>
                  )}
                  {colMap.trackingStatus !== false && (
                    <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        background: r.trackingStatus === 'tracked' ? 'rgba(37, 99, 235, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                        color: r.trackingStatus === 'tracked' ? '#2563EB' : '#D97706'
                      }}>
                        <Navigation size={11} />
                        {r.trackingStatus === 'tracked' ? 'Tracked' : 'Untracked'}
                      </span>
                    </td>
                  )}
                  {colMap.deliveryStatus !== false && (
                    <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        background: r.deliveryStatus === 'Delivered' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: r.deliveryStatus === 'Delivered' ? '#059669' : '#DC2626'
                      }}>
                        {r.deliveryStatus === 'Delivered' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                        {r.deliveryStatus}
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div style={{
        padding: '14px 20px',
        borderTop: '1px solid var(--border-color, #E2E8F0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        background: 'rgba(0, 0, 0, 0.01)'
      }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #475569)' }}>
          Showing <strong>{((currentPage - 1) * pageSize) + 1}</strong> to <strong>{Math.min(currentPage * pageSize, filteredRoutes.length)}</strong> of <strong>{filteredRoutes.length}</strong> routes
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #CBD5E1)',
              background: 'var(--bg-panel, #FFFFFF)',
              color: currentPage === 1 ? 'var(--text-dim, #94a3b8)' : 'var(--text-main, #0F172A)',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.78rem',
              fontWeight: '600'
            }}
          >
            <ChevronLeft size={14} /> Previous
          </button>

          <span style={{ fontSize: '0.78rem', fontWeight: '700', padding: '0 8px' }}>
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #CBD5E1)',
              background: 'var(--bg-panel, #FFFFFF)',
              color: currentPage === totalPages ? 'var(--text-dim, #94a3b8)' : 'var(--text-main, #0F172A)',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.78rem',
              fontWeight: '600'
            }}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
