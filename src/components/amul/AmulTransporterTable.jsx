import React, { useState, useMemo } from 'react';
import { Truck, Search, CheckCircle2, AlertTriangle, ShieldCheck, Filter } from 'lucide-react';

export default function AmulTransporterTable({ transporters, totalKpi, columnConfig }) {
  const [search, setSearch] = useState('');
  const [dairyFilter, setDairyFilter] = useState('ALL');

  const colMap = useMemo(() => {
    const map = {};
    const cols = columnConfig?.transporters || [];
    cols.forEach(c => { map[c.id] = c.visible !== false; });
    return map;
  }, [columnConfig]);

  const filteredTransporters = useMemo(() => {
    if (!transporters) return [];
    return transporters.filter(t => {
      const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
                          t.plant.toLowerCase().includes(search.toLowerCase());
      const matchDairy = dairyFilter === 'ALL' || t.plant.toUpperCase() === dairyFilter.toUpperCase();
      return matchSearch && matchDairy;
    });
  }, [transporters, search, dairyFilter]);

  if (!transporters || transporters.length === 0) return null;

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
            background: 'rgba(227, 30, 36, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#E31E24'
          }}>
            <Truck size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-main, #0F172A)', fontFamily: 'Outfit, sans-serif' }}>
              2. Transporter SLA & Monitoring Scorecard ({transporters.length} Active Logistics Partners)
            </h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted, #475569)' }}>
              Real-time delivery verification, pending block tracking, and GPS telemetry SLA scorecard
            </p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Dairy Filter Pills */}
          <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.04)', borderRadius: '8px', padding: '2px', border: '1px solid var(--border-color, #E2E8F0)' }}>
            {['ALL', 'BANAS', 'KAIRA', 'SUMUL'].map(d => (
              <button
                key={d}
                onClick={() => setDairyFilter(d)}
                style={{
                  background: dairyFilter === d ? '#E31E24' : 'transparent',
                  color: dairyFilter === d ? '#FFFFFF' : 'var(--text-muted, #475569)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim, #64748b)' }} />
            <input
              type="text"
              placeholder="Search transporter..."
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

      {/* Table with User's requested columns & Column Visibility */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
          <thead>
            <tr style={{
              background: 'rgba(0, 0, 0, 0.02)',
              borderBottom: '1px solid var(--border-color, #E2E8F0)',
              color: 'var(--text-muted, #475569)',
              fontWeight: '700'
            }}>
              {colMap.name !== false && <th style={{ padding: '12px 16px' }}>Transporter Name</th>}
              {colMap.plant !== false && <th style={{ padding: '12px 12px', textAlign: 'center' }}>Nodal Dairy</th>}
              {colMap.routes !== false && <th style={{ padding: '12px 12px', textAlign: 'center' }}>Total Routes</th>}
              {colMap.sejas !== false && <th style={{ padding: '12px 12px', textAlign: 'center' }}>Sejas</th>}
              {colMap.qty !== false && <th style={{ padding: '12px 16px', textAlign: 'right' }}>Dispatched Qty (Kg)</th>}
              
              {/* USER HIGHLIGHTED COLUMNS */}
              {colMap.deliveredBlocks !== false && (
                <th style={{
                  padding: '12px 14px',
                  textAlign: 'center',
                  background: 'rgba(16, 185, 129, 0.08)',
                  color: '#059669',
                  fontWeight: '800',
                  borderLeft: '1px solid rgba(16, 185, 129, 0.2)'
                }}>
                  Delivered Blocks
                </th>
              )}
              {colMap.pendingBlocks !== false && (
                <th style={{
                  padding: '12px 14px',
                  textAlign: 'center',
                  background: 'rgba(227, 30, 36, 0.08)',
                  color: '#DC2626',
                  fontWeight: '800'
                }}>
                  Pending Blocks
                </th>
              )}
              {colMap.deliveryRation !== false && (
                <th style={{
                  padding: '12px 16px',
                  background: 'rgba(37, 99, 235, 0.08)',
                  color: '#1D4ED8',
                  fontWeight: '800',
                  borderRight: '1px solid rgba(37, 99, 235, 0.2)'
                }}>
                  Delivery Ration %
                </th>
              )}

              {colMap.tracked !== false && <th style={{ padding: '12px 12px', textAlign: 'center' }}>Tracked</th>}
              {colMap.trackingRate !== false && <th style={{ padding: '12px 16px' }}>Tracking Rate %</th>}
              {colMap.slaCompliance !== false && <th style={{ padding: '12px 16px', textAlign: 'center' }}>SLA Compliance</th>}
            </tr>
          </thead>
          <tbody>
            {filteredTransporters.map((t, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: '1px solid var(--border-color, #F1F5F9)',
                  transition: 'background 0.15s ease'
                }}
              >
                {colMap.name !== false && (
                  <td style={{ padding: '13px 16px', fontWeight: '700', color: 'var(--text-main, #0F172A)' }}>
                    {t.name}
                  </td>
                )}
                {colMap.plant !== false && (
                  <td style={{ padding: '13px 12px', textAlign: 'center' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: '700',
                      background: t.plant === 'Banas' ? 'rgba(37, 99, 235, 0.1)' : (t.plant === 'Kaira' ? 'rgba(227, 30, 36, 0.1)' : 'rgba(5, 150, 105, 0.1)'),
                      color: t.plant === 'Banas' ? '#2563EB' : (t.plant === 'Kaira' ? '#DC2626' : '#059669')
                    }}>
                      {t.plant}
                    </span>
                  </td>
                )}
                {colMap.routes !== false && (
                  <td style={{ padding: '13px 12px', textAlign: 'center', fontWeight: '700' }}>{t.routes}</td>
                )}
                {colMap.sejas !== false && (
                  <td style={{ padding: '13px 12px', textAlign: 'center' }}>{t.sejas}</td>
                )}
                {colMap.qty !== false && (
                  <td style={{ padding: '13px 16px', textAlign: 'right', fontWeight: '700' }}>
                    {Number(t.qty).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </td>
                )}
                
                {/* USER COLUMNS */}
                {colMap.deliveredBlocks !== false && (
                  <td style={{
                    padding: '13px 14px',
                    textAlign: 'center',
                    fontWeight: '800',
                    color: '#059669',
                    background: 'rgba(16, 185, 129, 0.03)',
                    borderLeft: '1px solid rgba(16, 185, 129, 0.1)'
                  }}>
                    {(t.deliveredBlocks ?? t.deliveredRoutes ?? t.delRoutes ?? 0)}
                  </td>
                )}
                {colMap.pendingBlocks !== false && (
                  <td style={{
                    padding: '13px 14px',
                    textAlign: 'center',
                    fontWeight: '800',
                    color: t.pendingRoutes > 0 ? '#DC2626' : '#059669',
                    background: 'rgba(227, 30, 36, 0.03)'
                  }}>
                    {(t.pendingBlocks ?? t.pendingRoutes ?? t.pendRoutes ?? 0)}
                  </td>
                )}
                {colMap.deliveryRation !== false && (
                  <td style={{
                    padding: '13px 16px',
                    background: 'rgba(37, 99, 235, 0.03)',
                    borderRight: '1px solid rgba(37, 99, 235, 0.1)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '6px', background: 'rgba(0, 0, 0, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(100, parseFloat(t.deliveryRatioPct ?? t.deliveryRate ?? 0) || 0)}%`,
                          height: '100%',
                          background: (parseFloat(t.deliveryRatioPct ?? t.deliveryRate ?? 0) || 0) >= 90 ? '#059669' : ((parseFloat(t.deliveryRatioPct ?? t.deliveryRate ?? 0) || 0) > 50 ? '#D97706' : '#DC2626'),
                          borderRadius: '3px'
                        }}></div>
                      </div>
                      <span style={{
                        fontSize: '0.78rem',
                        fontWeight: '800',
                        color: (parseFloat(t.deliveryRatioPct ?? t.deliveryRate ?? 0) || 0) >= 90 ? '#059669' : ((parseFloat(t.deliveryRatioPct ?? t.deliveryRate ?? 0) || 0) > 50 ? '#D97706' : '#DC2626'),
                        minWidth: '42px'
                      }}>
                        {(t.deliveryRatioPct ?? t.deliveryRate ?? '0.0')}%
                      </span>
                    </div>
                  </td>
                )}

                {colMap.tracked !== false && (
                  <td style={{ padding: '13px 12px', textAlign: 'center', fontWeight: '600' }}>{(t.tracked ?? t.trkRoutes ?? 0)}</td>
                )}
                {colMap.trackingRate !== false && (
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{
                      fontWeight: '700',
                      color: parseFloat(t.trackingRate) >= 90 ? '#059669' : '#D97706'
                    }}>
                      {(t.trackingRate ?? t.trkPct ?? '0.0')}%
                    </span>
                  </td>
                )}
                {colMap.slaCompliance !== false && (
                  <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      background: t.statusType === 'success' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                      color: t.statusType === 'success' ? '#059669' : '#D97706'
                    }}>
                      {t.statusType === 'success' ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                      {t.statusText}
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
