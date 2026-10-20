import React, { useState, useMemo } from 'react';
import { Search, Truck, CheckCircle2, Clock, MapPin, Building } from 'lucide-react';

export default function LastMileTripsSummary({ data, calculateLastMileGodownTrips }) {
  const [searchTerm, setSearchTerm] = useState('');

  const { rows, grandTotal } = useMemo(() => {
    return calculateLastMileGodownTrips(data);
  }, [data, calculateLastMileGodownTrips]);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    
    // Find matching districts or godowns
    const matchingDistricts = new Set();
    rows.forEach(r => {
      if (!r.isSubtotal && (
        String(r.district || '').toLowerCase().includes(term) ||
        String(r.godownName || '').toLowerCase().includes(term)
      )) {
        matchingDistricts.add(r.district);
      }
    });

    return rows.filter(r => {
      if (r.isGrandTotal) return true;
      if (r.isSubtotal) {
        const cleanDist = r.district.replace(' Total', '');
        return matchingDistricts.has(cleanDist);
      }
      return (
        String(r.district || '').toLowerCase().includes(term) ||
        String(r.godownName || '').toLowerCase().includes(term)
      );
    });
  }, [rows, searchTerm]);

  let srCounter = 1;
  let prevDistrict = null;

  return (
    <div style={{ marginTop: '8px' }}>
      {/* KPI Cards Header */}
      <div className="dashboard-grid" style={{ marginBottom: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="kpi-card total" style={{ padding: '16px 20px', borderRadius: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="kpi-title" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Trips</div>
              <div className="kpi-value" style={{ fontSize: '2rem', fontWeight: '700', marginTop: '4px' }}>{grandTotal.totalTrips.toLocaleString()}</div>
            </div>
            <div style={{ padding: '10px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <Truck size={24} />
            </div>
          </div>
        </div>

        <div className="kpi-card matched" style={{ padding: '16px 20px', borderRadius: '10px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="kpi-title" style={{ color: '#f59e0b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Trips (In-transit)</div>
              <div className="kpi-value" style={{ color: '#f59e0b', fontSize: '2rem', fontWeight: '700', marginTop: '4px' }}>{grandTotal.activeTrips.toLocaleString()}</div>
            </div>
            <div style={{ padding: '10px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <Clock size={24} />
            </div>
          </div>
        </div>

        <div className="kpi-card rate" style={{ padding: '16px 20px', borderRadius: '10px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="kpi-title" style={{ color: '#10b981', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Closed Trips</div>
              <div className="kpi-value" style={{ color: '#10b981', fontSize: '2rem', fontWeight: '700', marginTop: '4px' }}>{grandTotal.closedTrips.toLocaleString()}</div>
            </div>
            <div style={{ padding: '10px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <CheckCircle2 size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Filter / Search within Table */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building size={18} style={{ color: 'var(--accent-primary)' }} />
          <span>Godown Wise Trips Summary</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>
            ({rows.filter(r => !r.isSubtotal).length} Godowns)
          </span>
        </div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search District / Godown..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '6px 12px 6px 32px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-main)',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              outline: 'none',
              width: '230px'
            }}
          />
        </div>
      </div>

      {/* Godown Wise Trips Table */}
      <div className="table-container" style={{ marginTop: 0, overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-panel-hover)', borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '12px 10px', textAlign: 'center', width: '65px', fontWeight: '600' }}>Sr. No.</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '600', width: '22%' }}>District</th>
              <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '600' }}>Godown Name</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '600', width: '15%' }}>Total Trips</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '600', width: '18%' }}>Active Trips (In-transit)</th>
              <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: '600', width: '15%' }}>Closed Trips</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No godown trips found matching your filter.
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => {
                if (row.isGrandTotal) {
                  return (
                    <tr key={`gt-${idx}`} className="subtotal-row grand-total-row" style={{ fontWeight: 'bold', borderTop: '2px solid var(--border-color)', background: 'var(--bg-panel)' }}>
                      <td colSpan={3} style={{ padding: '14px', textAlign: 'center', fontSize: '1.05rem', letterSpacing: '0.5px' }}>
                        GRAND TOTAL
                      </td>
                      <td style={{ padding: '14px', textAlign: 'center', fontSize: '1.05rem', fontWeight: '700' }}>
                        {row.totalTrips.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px', textAlign: 'center', fontSize: '1.05rem', fontWeight: '700', color: '#f59e0b' }}>
                        {row.activeTrips.toLocaleString()}
                      </td>
                      <td style={{ padding: '14px', textAlign: 'center', fontSize: '1.05rem', fontWeight: '700', color: '#10b981' }}>
                        {row.closedTrips.toLocaleString()}
                      </td>
                    </tr>
                  );
                }

                if (row.isSubtotal) {
                  prevDistrict = null;
                  return (
                    <tr key={`sub-${idx}`} className="subtotal-row" style={{ fontWeight: 'bold', background: 'rgba(255, 90, 31, 0.04)', borderBottom: '1px solid var(--border-color)' }}>
                      <td colSpan={3} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.95rem' }}>
                        {row.district}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: '0.95rem', fontWeight: '700' }}>
                        {row.totalTrips}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: '0.95rem', fontWeight: '700', color: '#f59e0b' }}>
                        {row.activeTrips}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: '0.95rem', fontWeight: '700', color: '#10b981' }}>
                        {row.closedTrips}
                      </td>
                    </tr>
                  );
                }

                const showDistrict = prevDistrict !== row.district;
                prevDistrict = row.district;

                return (
                  <tr key={`row-${idx}`} className="data-row table-row-hover" style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '9px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {srCounter++}
                    </td>
                    <td style={{ padding: '9px 14px', fontWeight: showDistrict ? '600' : '500', color: 'var(--text-main)' }}>
                      {showDistrict ? row.district : row.district}
                    </td>
                    <td style={{ padding: '9px 14px', fontWeight: '500' }}>
                      {row.godownName}
                    </td>
                    <td style={{ padding: '9px 14px', textAlign: 'center', fontWeight: '600' }}>
                      {row.totalTrips}
                    </td>
                    <td style={{ padding: '9px 14px', textAlign: 'center' }}>
                      <span 
                        className={`status-badge ${row.activeTrips > 0 ? 'status-warning' : ''}`}
                        style={{
                          minWidth: '38px',
                          display: 'inline-block',
                          fontWeight: '600',
                          backgroundColor: row.activeTrips > 0 ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                          color: row.activeTrips > 0 ? '#f59e0b' : 'var(--text-muted)',
                          border: row.activeTrips > 0 ? '1px solid rgba(245, 158, 11, 0.3)' : 'none',
                          borderRadius: '12px',
                          padding: '2px 8px'
                        }}
                      >
                        {row.activeTrips}
                      </span>
                    </td>
                    <td style={{ padding: '9px 14px', textAlign: 'center' }}>
                      <span 
                        className={`status-badge ${row.closedTrips > 0 ? 'status-success' : ''}`}
                        style={{
                          minWidth: '38px',
                          display: 'inline-block',
                          fontWeight: '600',
                          backgroundColor: row.closedTrips > 0 ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                          color: row.closedTrips > 0 ? '#10b981' : 'var(--text-muted)',
                          border: row.closedTrips > 0 ? '1px solid rgba(16, 185, 129, 0.3)' : 'none',
                          borderRadius: '12px',
                          padding: '2px 8px'
                        }}
                      >
                        {row.closedTrips}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
