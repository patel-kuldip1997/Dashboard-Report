import React, { useState, useMemo } from 'react';
import { Search, Truck, FileText, CheckCircle2, Clock, Building, Users } from 'lucide-react';

export default function LastMileDcSummary({ data, calculateLastMileDcSummary, visibleColumns }) {
  const [searchTerm, setSearchTerm] = useState('');

  const { rows, grandTotal } = useMemo(() => {
    return calculateLastMileDcSummary(data);
  }, [data, calculateLastMileDcSummary]);

  const defaultCols = [
    { id: 'srNo', label: 'Sr. No.', visible: true },
    { id: 'district', label: 'District', visible: true },
    { id: 'godown', label: 'GSCSCL Godown', visible: true },
    { id: 'transporter', label: 'Transporter Name', visible: true },
    { id: 'tripCreated', label: 'Trip Created', visible: true },
    { id: 'dcNumber', label: 'DC Number', visible: true },
    { id: 'epod', label: 'EPOD', visible: true },
    { id: 'endTrip', label: 'End Trip', visible: true }
  ];

  const cols = (visibleColumns && visibleColumns.length > 0)
    ? visibleColumns.filter(c => c.visible !== false)
    : defaultCols;

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();

    const matchingDistricts = new Set();
    rows.forEach(r => {
      if (!r.isSubtotal && (
        String(r.district || '').toLowerCase().includes(term) ||
        String(r.godown || r.godownName || '').toLowerCase().includes(term) ||
        String(r.transporter || r.transporterName || '').toLowerCase().includes(term)
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
        String(r.godown || r.godownName || '').toLowerCase().includes(term) ||
        String(r.transporter || r.transporterName || '').toLowerCase().includes(term)
      );
    });
  }, [rows, searchTerm]);

  let srCounter = 1;
  let prevDistrict = null;

  const metricCols = ['tripCreated', 'dcNumber', 'epod', 'endTrip'];
  const firstMetricIndex = cols.findIndex(c => metricCols.includes(c.id));
  const leadingColSpan = firstMetricIndex > 0 ? firstMetricIndex : (firstMetricIndex === -1 ? cols.length : 1);

  return (
    <div style={{ marginTop: '8px' }}>
      {/* 4 KPI Cards Header */}
      <div className="dashboard-grid" style={{ marginBottom: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="kpi-card total" style={{ padding: '16px 20px', borderRadius: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="kpi-title" style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trip Created</div>
              <div className="kpi-value" style={{ fontSize: '1.9rem', fontWeight: '700', marginTop: '4px' }}>
                {grandTotal.tripCreated.toLocaleString()}
              </div>
            </div>
            <div style={{ padding: '10px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <Truck size={24} />
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '16px 20px', borderRadius: '10px', borderLeft: '4px solid #f59e0b', background: 'var(--bg-panel)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="kpi-title" style={{ color: '#f59e0b', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DC Number</div>
              <div className="kpi-value" style={{ color: '#f59e0b', fontSize: '1.9rem', fontWeight: '700', marginTop: '4px' }}>
                {grandTotal.dcNumber.toLocaleString()}
              </div>
            </div>
            <div style={{ padding: '10px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <FileText size={24} />
            </div>
          </div>
        </div>

        <div className="kpi-card rate" style={{ padding: '16px 20px', borderRadius: '10px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="kpi-title" style={{ color: '#10b981', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>EPOD Completed</div>
              <div className="kpi-value" style={{ color: '#10b981', fontSize: '1.9rem', fontWeight: '700', marginTop: '4px' }}>
                {grandTotal.epod.toLocaleString()}
              </div>
            </div>
            <div style={{ padding: '10px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <CheckCircle2 size={24} />
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '16px 20px', borderRadius: '10px', borderLeft: '4px solid #8b5cf6', background: 'var(--bg-panel)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="kpi-title" style={{ color: '#8b5cf6', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>End Trip</div>
              <div className="kpi-value" style={{ color: '#8b5cf6', fontSize: '1.9rem', fontWeight: '700', marginTop: '4px' }}>
                {grandTotal.endTrip.toLocaleString()}
              </div>
            </div>
            <div style={{ padding: '10px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
              <Clock size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Filter / Search within Table */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building size={18} style={{ color: 'var(--accent-primary)' }} />
          <span>Trip Summary (DC Wise Report)</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>
            ({rows.filter(r => !r.isSubtotal).length} Godowns & Transporters)
          </span>
        </div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search District / Godown / Transporter..."
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
              width: '280px'
            }}
          />
        </div>
      </div>

      {/* DC Wise Trips Table */}
      <div className="table-container" style={{ marginTop: 0, overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <div className="table-scroll-hint">
          <span>← Swipe horizontally to see all columns →</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-panel-hover)', borderBottom: '2px solid var(--border-color)' }}>
              {cols.map(col => {
                let align = 'left';
                let widthStyle = {};
                if (col.id === 'srNo') {
                  align = 'center';
                  widthStyle = { width: '60px' };
                } else if (col.id === 'district') {
                  widthStyle = { width: '18%' };
                } else if (col.id === 'godown') {
                  widthStyle = { width: '18%' };
                } else if (col.id === 'transporter') {
                  widthStyle = { width: '22%' };
                } else if (metricCols.includes(col.id)) {
                  align = 'center';
                  widthStyle = { width: '10%' };
                }
                return (
                  <th
                    key={col.id}
                    style={{
                      padding: col.id === 'srNo' ? '12px 10px' : '12px 14px',
                      textAlign: align,
                      fontWeight: '600',
                      ...widthStyle
                    }}
                  >
                    {col.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={cols.length} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No records found matching your search.
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => {
                if (row.isGrandTotal) {
                  if (firstMetricIndex > 0) {
                    return (
                      <tr key={`gt-${idx}`} className="subtotal-row grand-total-row" style={{ fontWeight: 'bold', borderTop: '2px solid var(--border-color)', background: 'var(--bg-panel)' }}>
                        <td colSpan={leadingColSpan} style={{ padding: '14px', textAlign: 'center', fontSize: '1.05rem', letterSpacing: '0.5px' }}>
                          GRAND TOTAL
                        </td>
                        {cols.slice(firstMetricIndex).map(col => {
                          let val = row[col.id] ?? 0;
                          let colorStyle = {};
                          if (col.id === 'tripCreated') colorStyle = { color: 'var(--text-main)' };
                          if (col.id === 'dcNumber') colorStyle = { color: '#f59e0b' };
                          if (col.id === 'epod') colorStyle = { color: '#10b981' };
                          if (col.id === 'endTrip') colorStyle = { color: '#8b5cf6' };
                          return (
                            <td key={col.id} style={{ padding: '14px', textAlign: 'center', fontSize: '1.05rem', fontWeight: '700', ...colorStyle }}>
                              {Number(val).toLocaleString()}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  } else {
                    return (
                      <tr key={`gt-${idx}`} className="subtotal-row grand-total-row" style={{ fontWeight: 'bold', borderTop: '2px solid var(--border-color)', background: 'var(--bg-panel)' }}>
                        {cols.map(col => {
                          if (col.id === 'district' || (col.id === 'srNo' && !cols.some(c => c.id === 'district'))) {
                            return <td key={col.id} style={{ padding: '14px', textAlign: 'center', fontSize: '1.05rem', letterSpacing: '0.5px' }}>GRAND TOTAL</td>;
                          }
                          let val = row[col.id] ?? 0;
                          let colorStyle = {};
                          if (col.id === 'tripCreated') colorStyle = { color: 'var(--text-main)' };
                          if (col.id === 'dcNumber') colorStyle = { color: '#f59e0b' };
                          if (col.id === 'epod') colorStyle = { color: '#10b981' };
                          if (col.id === 'endTrip') colorStyle = { color: '#8b5cf6' };
                          return (
                            <td key={col.id} style={{ padding: '14px', textAlign: 'center', fontSize: '1.05rem', fontWeight: '700', ...colorStyle }}>
                              {metricCols.includes(col.id) ? Number(val).toLocaleString() : ''}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  }
                }

                if (row.isSubtotal) {
                  prevDistrict = null;
                  if (firstMetricIndex > 0) {
                    return (
                      <tr key={`sub-${idx}`} className="subtotal-row" style={{ fontWeight: '600', background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-color)' }}>
                        <td colSpan={leadingColSpan} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '700', color: 'var(--primary-color)' }}>
                          {row.district}
                        </td>
                        {cols.slice(firstMetricIndex).map(col => {
                          let val = row[col.id] ?? 0;
                          let colorStyle = {};
                          if (col.id === 'dcNumber') colorStyle = { color: '#f59e0b' };
                          if (col.id === 'epod') colorStyle = { color: '#10b981' };
                          if (col.id === 'endTrip') colorStyle = { color: '#8b5cf6' };
                          return (
                            <td key={col.id} style={{ padding: '12px', textAlign: 'center', fontWeight: '700', ...colorStyle }}>
                              {Number(val).toLocaleString()}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  } else {
                    return (
                      <tr key={`sub-${idx}`} className="subtotal-row" style={{ fontWeight: '600', background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-color)' }}>
                        {cols.map(col => {
                          if (col.id === 'district' || (col.id === 'srNo' && !cols.some(c => c.id === 'district'))) {
                            return (
                              <td key={col.id} style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '700', color: 'var(--primary-color)' }}>
                                {row.district}
                              </td>
                            );
                          }
                          let val = row[col.id] ?? 0;
                          let colorStyle = {};
                          if (col.id === 'dcNumber') colorStyle = { color: '#f59e0b' };
                          if (col.id === 'epod') colorStyle = { color: '#10b981' };
                          if (col.id === 'endTrip') colorStyle = { color: '#8b5cf6' };
                          return (
                            <td key={col.id} style={{ padding: '12px', textAlign: 'center', fontWeight: '700', ...colorStyle }}>
                              {metricCols.includes(col.id) ? Number(val).toLocaleString() : ''}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  }
                }

                const isDistrictFirst = prevDistrict !== row.district;
                prevDistrict = row.district;
                const currentSr = srCounter++;

                return (
                  <tr key={`row-${idx}`} className="data-row" style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {cols.map(col => {
                      if (col.id === 'srNo') {
                        return (
                          <td key={col.id} style={{ padding: '10px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            {currentSr}
                          </td>
                        );
                      }
                      if (col.id === 'district') {
                        return (
                          <td key={col.id} style={{ padding: '10px 14px', fontWeight: isDistrictFirst ? '600' : 'normal', color: isDistrictFirst ? 'var(--text-main)' : 'var(--text-muted)' }}>
                            {isDistrictFirst ? row.district : ''}
                          </td>
                        );
                      }
                      if (col.id === 'godown') {
                        return (
                          <td key={col.id} style={{ padding: '10px 14px', fontWeight: '500' }}>
                            {row.godown || row.godownName}
                          </td>
                        );
                      }
                      if (col.id === 'transporter') {
                        return (
                          <td key={col.id} style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                            {row.transporter || row.transporterName}
                          </td>
                        );
                      }
                      if (col.id === 'tripCreated') {
                        return (
                          <td key={col.id} style={{ padding: '10px', textAlign: 'center', fontWeight: '600' }}>
                            {row.tripCreated}
                          </td>
                        );
                      }
                      if (col.id === 'dcNumber') {
                        return (
                          <td key={col.id} style={{ padding: '10px', textAlign: 'center', fontWeight: '600', color: '#f59e0b' }}>
                            {row.dcNumber}
                          </td>
                        );
                      }
                      if (col.id === 'epod') {
                        return (
                          <td key={col.id} style={{ padding: '10px', textAlign: 'center', fontWeight: '600', color: '#10b981' }}>
                            {row.epod}
                          </td>
                        );
                      }
                      if (col.id === 'endTrip') {
                        return (
                          <td key={col.id} style={{ padding: '10px', textAlign: 'center', fontWeight: '600', color: '#8b5cf6' }}>
                            {row.endTrip}
                          </td>
                        );
                      }
                      return (
                        <td key={col.id} style={{ padding: '10px', textAlign: 'center' }}>
                          {row[col.id] ?? ''}
                        </td>
                      );
                    })}
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
