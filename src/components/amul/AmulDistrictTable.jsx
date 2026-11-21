import React, { useState, useMemo } from 'react';
import { MapPin, Search, CheckCircle2, AlertTriangle, Layers, Building } from 'lucide-react';

export default function AmulDistrictTable({ districts, totalKpi, columnConfig }) {
  const [search, setSearch] = useState('');
  const [selectedDairy, setSelectedDairy] = useState('ALL');

  const colMap = useMemo(() => {
    const map = {};
    const cols = columnConfig?.districts || [];
    cols.forEach(c => { map[c.id] = c.visible !== false; });
    return map;
  }, [columnConfig]);

  const filteredDistricts = useMemo(() => {
    if (!districts) return [];
    return districts.filter(d => {
      const matchSearch = d.districtName.toLowerCase().includes(search.toLowerCase()) ||
                          d.nodalDairy.toLowerCase().includes(search.toLowerCase());
      const matchDairy = selectedDairy === 'ALL' || d.nodalDairy.toUpperCase() === selectedDairy.toUpperCase();
      return matchSearch && matchDairy;
    });
  }, [districts, search, selectedDairy]);

  // Counts per dairy
  const dairyCounts = useMemo(() => {
    if (!districts) return { Banas: 0, Kaira: 0, Sumul: 0 };
    return {
      Banas: districts.filter(d => d.nodalDairy === 'Banas').length,
      Kaira: districts.filter(d => d.nodalDairy === 'Kaira').length,
      Sumul: districts.filter(d => d.nodalDairy === 'Sumul').length
    };
  }, [districts]);

  if (!districts || districts.length === 0) return null;

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
            background: 'rgba(217, 119, 6, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#D97706'
          }}>
            <MapPin size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-main, #0F172A)', fontFamily: 'Outfit, sans-serif' }}>
              3. District-Wise THR Distribution Matrix ({districts.length} Districts Covered)
            </h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted, #475569)' }}>
              Nodal Dairy mapping, Block coverage, and Anganwadi Seja delivery fulfillment
            </p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Nodal Dairy Grouping Tabs */}
          <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.04)', borderRadius: '8px', padding: '2px', border: '1px solid var(--border-color, #E2E8F0)' }}>
            <button
              onClick={() => setSelectedDairy('ALL')}
              style={{
                background: selectedDairy === 'ALL' ? '#E31E24' : 'transparent',
                color: selectedDairy === 'ALL' ? '#FFFFFF' : 'var(--text-muted, #475569)',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 12px',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              All ({districts.length})
            </button>
            <button
              onClick={() => setSelectedDairy('BANAS')}
              style={{
                background: selectedDairy === 'BANAS' ? '#2563EB' : 'transparent',
                color: selectedDairy === 'BANAS' ? '#FFFFFF' : 'var(--text-muted, #475569)',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 12px',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Banas ({dairyCounts.Banas})
            </button>
            <button
              onClick={() => setSelectedDairy('KAIRA')}
              style={{
                background: selectedDairy === 'KAIRA' ? '#DC2626' : 'transparent',
                color: selectedDairy === 'KAIRA' ? '#FFFFFF' : 'var(--text-muted, #475569)',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 12px',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Kaira ({dairyCounts.Kaira})
            </button>
            <button
              onClick={() => setSelectedDairy('SUMUL')}
              style={{
                background: selectedDairy === 'SUMUL' ? '#059669' : 'transparent',
                color: selectedDairy === 'SUMUL' ? '#FFFFFF' : 'var(--text-muted, #475569)',
                border: 'none',
                borderRadius: '6px',
                padding: '5px 12px',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Sumul ({dairyCounts.Sumul})
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim, #64748b)' }} />
            <input
              type="text"
              placeholder="Search district, dairy..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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

      {/* Table with Nodal Dairy in Column A, District in Column B */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
          <thead>
            <tr style={{
              background: 'rgba(0, 0, 0, 0.02)',
              borderBottom: '1px solid var(--border-color, #E2E8F0)',
              color: 'var(--text-muted, #475569)',
              fontWeight: '700'
            }}>
              {/* COLUMN A: NODAL DAIRY */}
              {colMap.nodalDairy !== false && (
                <th style={{
                  padding: '12px 16px',
                  color: '#1E3A8A',
                  fontWeight: '800',
                  background: 'rgba(30, 58, 138, 0.04)'
                }}>
                  Nodal Dairy
                </th>
              )}
              {/* COLUMN B: DISTRICT NAME */}
              {colMap.districtName !== false && <th style={{ padding: '12px 16px' }}>District Name</th>}
              
              {colMap.routes !== false && <th style={{ padding: '12px 12px', textAlign: 'center' }}>Routes</th>}
              {colMap.sejas !== false && <th style={{ padding: '12px 12px', textAlign: 'center' }}>Sejas</th>}
              {colMap.qty !== false && <th style={{ padding: '12px 16px', textAlign: 'right' }}>Dispatched Qty (Kg)</th>}
              {colMap.deliveredSejas !== false && <th style={{ padding: '12px 14px', textAlign: 'center', color: '#059669' }}>Delivered Sejas</th>}
              {colMap.pendingSejas !== false && <th style={{ padding: '12px 14px', textAlign: 'center', color: '#DC2626' }}>Pending Sejas</th>}
              {colMap.sejaRate !== false && <th style={{ padding: '12px 16px' }}>Seja Fulfillment %</th>}
              {colMap.gpsTracked !== false && <th style={{ padding: '12px 12px', textAlign: 'center' }}>GPS Tracked</th>}
              {colMap.gpsTrackingRate !== false && <th style={{ padding: '12px 16px' }}>GPS Tracking %</th>}
              {colMap.status !== false && <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>}
            </tr>
          </thead>
          <tbody>
            {filteredDistricts.map((d, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: '1px solid var(--border-color, #F1F5F9)',
                  transition: 'background 0.15s ease'
                }}
              >
                {/* COLUMN A: NODAL DAIRY */}
                {colMap.nodalDairy !== false && (
                  <td style={{
                    padding: '13px 16px',
                    fontWeight: '700',
                    background: 'rgba(30, 58, 138, 0.02)'
                  }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: '700',
                      background: d.nodalDairy === 'Banas' ? 'rgba(37,99,235,0.1)' : (d.nodalDairy === 'Kaira' ? 'rgba(227,30,36,0.1)' : 'rgba(5,150,105,0.1)'),
                      color: d.nodalDairy === 'Banas' ? '#2563EB' : (d.nodalDairy === 'Kaira' ? '#DC2626' : '#059669'),
                      border: `1px solid ${d.nodalDairy === 'Banas' ? 'rgba(37,99,235,0.25)' : (d.nodalDairy === 'Kaira' ? 'rgba(227,30,36,0.25)' : 'rgba(5,150,105,0.25)')}`
                    }}>
                      {d.nodalDairy}
                    </span>
                  </td>
                )}

                {/* COLUMN B: DISTRICT NAME */}
                {colMap.districtName !== false && (
                  <td style={{ padding: '13px 16px', fontWeight: '700', color: 'var(--text-main, #0F172A)' }}>
                    {d.districtName}
                  </td>
                )}

                {colMap.routes !== false && (
                  <td style={{ padding: '13px 12px', textAlign: 'center', fontWeight: '700' }}>{d.routes}</td>
                )}
                {colMap.sejas !== false && (
                  <td style={{ padding: '13px 12px', textAlign: 'center' }}>{d.sejas}</td>
                )}
                {colMap.qty !== false && (
                  <td style={{ padding: '13px 16px', textAlign: 'right', fontWeight: '700' }}>
                    {Number(d.qty).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </td>
                )}
                {colMap.deliveredSejas !== false && (
                  <td style={{ padding: '13px 14px', textAlign: 'center', fontWeight: '700', color: '#059669' }}>
                    {(d.deliveredSejas ?? d.delSejas ?? 0)}
                  </td>
                )}
                {colMap.pendingSejas !== false && (
                  <td style={{ padding: '13px 14px', textAlign: 'center', fontWeight: '700', color: d.pendingSejas > 0 ? '#DC2626' : '#059669' }}>
                    {(d.pendingSejas ?? d.pendSejas ?? 0)}
                  </td>
                )}
                {colMap.sejaRate !== false && (
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '6px', background: 'rgba(0, 0, 0, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(100, parseFloat(d.sejaRate ?? d.fulfillmentPct ?? 0) || 0)}%`,
                          height: '100%',
                          background: (parseFloat(d.sejaRate ?? d.fulfillmentPct ?? 0) || 0) >= 90 ? '#059669' : ((parseFloat(d.sejaRate ?? d.fulfillmentPct ?? 0) || 0) > 50 ? '#D97706' : '#DC2626'),
                          borderRadius: '3px'
                        }}></div>
                      </div>
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: '800',
                        color: (parseFloat(d.sejaRate ?? d.fulfillmentPct ?? 0) || 0) >= 90 ? '#059669' : ((parseFloat(d.sejaRate ?? d.fulfillmentPct ?? 0) || 0) > 50 ? '#D97706' : '#DC2626'),
                        minWidth: '42px'
                      }}>
                        {(d.sejaRate ?? d.fulfillmentPct ?? '0.0')}%
                      </span>
                    </div>
                  </td>
                )}
                {colMap.gpsTracked !== false && (
                  <td style={{ padding: '13px 12px', textAlign: 'center', fontWeight: '600' }}>{(d.tracked ?? d.trkSejas ?? 0)}</td>
                )}
                {colMap.gpsTrackingRate !== false && (
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{
                      fontWeight: '700',
                      color: parseFloat(d.trackingRate) >= 90 ? '#059669' : '#D97706'
                    }}>
                      {(d.trackingRate ?? d.trkPct ?? '0.0')}%
                    </span>
                  </td>
                )}
                {colMap.status !== false && (
                  <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      background: d.statusType === 'success' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                      color: d.statusType === 'success' ? '#059669' : '#D97706'
                    }}>
                      {d.statusType === 'success' ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                      {d.statusText}
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
