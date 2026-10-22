import React, { useState, useMemo } from 'react';
import { Search, Package, FileText, Camera, Scale } from 'lucide-react';

export default function LiftingCommoditySummary({ data, calculateLiftingCommoditySummary, visibleColumns }) {
  const [searchTerm, setSearchTerm] = useState('');

  const { rows, grandTotal } = useMemo(() => {
    return calculateLiftingCommoditySummary(data);
  }, [data, calculateLiftingCommoditySummary]);

  const defaultCols = [
    { id: 'district', label: 'District', visible: true },
    { id: 'commodity', label: 'Commodity', visible: true },
    { id: 'refCount', label: 'Total No. of TP generated', visible: true },
    { id: 'sumQty', label: 'Lifted Quantity(MT)', visible: true },
    { id: 'startPhotoCount', label: 'No. of trip started', visible: true },
    { id: 'endPhotoCount', label: 'No. of trip ended', visible: true }
  ];

  const cols = (visibleColumns && visibleColumns.length > 0)
    ? visibleColumns.filter(c => c.visible !== false)
    : defaultCols;

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();

    // Identify which districts have matching commodities or district names
    const matchingDistricts = new Set();
    rows.forEach(r => {
      if (!r.isSubtotal && (
        String(r.district || '').toLowerCase().includes(term) ||
        String(r.commodity || '').toLowerCase().includes(term)
      )) {
        matchingDistricts.add(r.district);
      }
    });

    return rows.filter(r => {
      if (r.isGrandTotal) return true;
      if (r.isSubtotal) {
        const cleanDist = String(r.district || '').replace(' Total', '').trim();
        return matchingDistricts.has(cleanDist);
      }
      return (
        String(r.district || '').toLowerCase().includes(term) ||
        String(r.commodity || '').toLowerCase().includes(term)
      );
    });
  }, [rows, searchTerm]);

  // Count unique districts and commodities
  const { districtCount, commodityCount } = useMemo(() => {
    const dSet = new Set();
    const cSet = new Set();
    (data || []).forEach(r => {
      if (!r.isSubtotal && !r.isGrandTotal) {
        if (r.district) dSet.add(r.district);
        if (r.commodity && r.commodity !== 'Unknown Commodity') cSet.add(r.commodity);
      }
    });
    return { districtCount: dSet.size, commodityCount: cSet.size };
  }, [data]);

  // Format quantity to match Excel display (up to 4 or 5 decimal places)
  const formatQty = (num) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    const n = Number(num);
    return Number(n.toFixed(5)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 5 });
  };

  const metricCols = ['refCount', 'sumQty', 'startPhotoCount', 'endPhotoCount'];

  return (
    <div style={{ marginTop: '8px' }}>
      {/* 5 KPI Cards Header */}
      <div className="dashboard-grid" style={{ marginBottom: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="kpi-card total" style={{ padding: '16px 20px', borderRadius: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="kpi-title" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total No. of TP generated</div>
              <div className="kpi-value" style={{ fontSize: '1.8rem', fontWeight: '700', marginTop: '4px' }}>
                {(grandTotal.refCount || 0).toLocaleString()}
              </div>
            </div>
            <div style={{ padding: '10px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <FileText size={22} />
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '16px 20px', borderRadius: '10px', borderLeft: '4px solid #10b981', background: 'var(--bg-panel)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="kpi-title" style={{ color: '#10b981', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lifted Quantity(MT)</div>
              <div className="kpi-value" style={{ color: '#10b981', fontSize: '1.8rem', fontWeight: '700', marginTop: '4px' }}>
                {formatQty(grandTotal.sumQty || 0)}
              </div>
            </div>
            <div style={{ padding: '10px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <Scale size={22} />
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '16px 20px', borderRadius: '10px', borderLeft: '4px solid #f59e0b', background: 'var(--bg-panel)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="kpi-title" style={{ color: '#f59e0b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>No. of trip started</div>
              <div className="kpi-value" style={{ color: '#f59e0b', fontSize: '1.8rem', fontWeight: '700', marginTop: '4px' }}>
                {(grandTotal.startPhotoCount || 0).toLocaleString()}
              </div>
            </div>
            <div style={{ padding: '10px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <Camera size={22} />
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '16px 20px', borderRadius: '10px', borderLeft: '4px solid #8b5cf6', background: 'var(--bg-panel)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="kpi-title" style={{ color: '#8b5cf6', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>No. of trip ended</div>
              <div className="kpi-value" style={{ color: '#8b5cf6', fontSize: '1.8rem', fontWeight: '700', marginTop: '4px' }}>
                {(grandTotal.endPhotoCount || 0).toLocaleString()}
              </div>
            </div>
            <div style={{ padding: '10px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
              <Camera size={22} />
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ padding: '16px 20px', borderRadius: '10px', borderLeft: '4px solid #06b6d4', background: 'var(--bg-panel)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="kpi-title" style={{ color: '#06b6d4', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Districts / Commodities</div>
              <div className="kpi-value" style={{ color: '#06b6d4', fontSize: '1.8rem', fontWeight: '700', marginTop: '4px' }}>
                {districtCount} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {commodityCount}</span>
              </div>
            </div>
            <div style={{ padding: '10px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4' }}>
              <Package size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ position: 'relative', minWidth: '320px', maxWidth: '420px', flex: '1' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search District or Commodity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-panel)',
              color: 'var(--text-main)',
              fontSize: '0.88rem',
              outline: 'none'
            }}
          />
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Showing <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{filteredRows.filter(r => !r.isSubtotal).length}</span> commodity items across <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{districtCount}</span> districts
        </div>
      </div>

      {/* Main Table Styled Like All Other GSCSCL Reports */}
      <div className="table-container" style={{ marginTop: 0 }}>
        <div className="table-scroll-hint">
          <span>← Swipe horizontally to see all columns →</span>
        </div>
        <table>
          <thead>
            <tr>
              {cols.map(c => (
                <th
                  key={c.id}
                  style={{
                    textAlign: metricCols.includes(c.id) ? 'center' : 'left'
                  }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={cols.length} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No matching records found.
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => {
                if (row.isGrandTotal) {
                  return (
                    <tr
                      key="grand-total-row"
                      className="subtotal-row grand-total-row"
                    >
                      {cols.map((c) => {
                        if (c.id === 'district') {
                          return (
                            <td key={c.id} style={{ fontWeight: '700' }}>
                              Grand Total
                            </td>
                          );
                        }
                        if (c.id === 'commodity') {
                          return <td key={c.id}></td>;
                        }
                        if (c.id === 'refCount') {
                          return (
                            <td key={c.id} style={{ textAlign: 'center', fontWeight: '700' }}>
                              {(row.refCount || 0).toLocaleString()}
                            </td>
                          );
                        }
                        if (c.id === 'sumQty') {
                          return (
                            <td key={c.id} style={{ textAlign: 'center', fontWeight: '700' }}>
                              {formatQty(row.sumQty || 0)}
                            </td>
                          );
                        }
                        if (c.id === 'startPhotoCount') {
                          return (
                            <td key={c.id} style={{ textAlign: 'center', fontWeight: '700' }}>
                              {(row.startPhotoCount || 0).toLocaleString()}
                            </td>
                          );
                        }
                        if (c.id === 'endPhotoCount') {
                          return (
                            <td key={c.id} style={{ textAlign: 'center', fontWeight: '700' }}>
                              {(row.endPhotoCount || 0).toLocaleString()}
                            </td>
                          );
                        }
                        return <td key={c.id} style={{ textAlign: 'center' }}>{row[c.id] ?? ''}</td>;
                      })}
                    </tr>
                  );
                }

                if (row.isSubtotal) {
                  return (
                    <tr
                      key={`subtotal-${row.district}-${idx}`}
                      className="subtotal-row"
                    >
                      {cols.map((c) => {
                        if (c.id === 'district') {
                          return (
                            <td key={c.id} style={{ fontWeight: '700' }}>
                              {row.district}
                            </td>
                          );
                        }
                        if (c.id === 'commodity') {
                          return <td key={c.id}></td>;
                        }
                        if (c.id === 'refCount') {
                          return (
                            <td key={c.id} style={{ textAlign: 'center', fontWeight: '700' }}>
                              {(row.refCount || 0).toLocaleString()}
                            </td>
                          );
                        }
                        if (c.id === 'sumQty') {
                          return (
                            <td key={c.id} style={{ textAlign: 'center', fontWeight: '700' }}>
                              {formatQty(row.sumQty || 0)}
                            </td>
                          );
                        }
                        if (c.id === 'startPhotoCount') {
                          return (
                            <td key={c.id} style={{ textAlign: 'center', fontWeight: '700' }}>
                              {(row.startPhotoCount || 0).toLocaleString()}
                            </td>
                          );
                        }
                        if (c.id === 'endPhotoCount') {
                          return (
                            <td key={c.id} style={{ textAlign: 'center', fontWeight: '700' }}>
                              {(row.endPhotoCount || 0).toLocaleString()}
                            </td>
                          );
                        }
                        return <td key={c.id} style={{ textAlign: 'center' }}>{row[c.id] ?? ''}</td>;
                      })}
                    </tr>
                  );
                }

                // Regular commodity row
                return (
                  <tr
                    key={`row-${row.district}-${row.commodity}-${idx}`}
                    className="data-row"
                  >
                    {cols.map((c) => {
                      if (c.id === 'district') {
                        return (
                          <td
                            key={c.id}
                            style={{
                              fontWeight: row.displayDistrict ? '600' : 'normal',
                              color: row.displayDistrict ? 'var(--text-main)' : 'transparent',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {row.displayDistrict || ''}
                          </td>
                        );
                      }
                      if (c.id === 'commodity') {
                        return (
                          <td key={c.id}>
                            {row.commodity}
                          </td>
                        );
                      }
                      if (c.id === 'refCount') {
                        return (
                          <td key={c.id} style={{ textAlign: 'center' }}>
                            {(row.refCount || 0).toLocaleString()}
                          </td>
                        );
                      }
                      if (c.id === 'sumQty') {
                        return (
                          <td key={c.id} style={{ textAlign: 'center' }}>
                            {formatQty(row.sumQty || 0)}
                          </td>
                        );
                      }
                      if (c.id === 'startPhotoCount') {
                        return (
                          <td key={c.id} style={{ textAlign: 'center' }}>
                            {(row.startPhotoCount || 0).toLocaleString()}
                          </td>
                        );
                      }
                      if (c.id === 'endPhotoCount') {
                        return (
                          <td key={c.id} style={{ textAlign: 'center' }}>
                            {(row.endPhotoCount || 0).toLocaleString()}
                          </td>
                        );
                      }
                      return <td key={c.id} style={{ textAlign: 'center' }}>{row[c.id] ?? ''}</td>;
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
