import React from 'react';
import { Building2, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

export default function AmulPlantTable({ plants, totalKpi }) {
  if (!plants || plants.length === 0) return null;

  return (
    <div style={{
      background: 'var(--bg-panel, #FFFFFF)',
      border: '1px solid var(--border-color, #E2E8F0)',
      borderRadius: '16px',
      overflow: 'hidden',
      marginBottom: '28px',
      boxShadow: 'var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.05))'
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-color, #E2E8F0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0, 0, 0, 0.01)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(37, 99, 235, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2563EB'
          }}>
            <Building2 size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-main, #0F172A)', fontFamily: 'Outfit, sans-serif' }}>
              1. Plant-Level Dispatch & Delivery Performance Summary
            </h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted, #475569)' }}>
              Comparative logistics scorecard across GCMMF manufacturing hubs (Banas, Kaira, Sumul)
            </p>
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
          <thead>
            <tr style={{
              background: 'rgba(0, 0, 0, 0.02)',
              borderBottom: '1px solid var(--border-color, #E2E8F0)',
              color: 'var(--text-muted, #475569)',
              fontWeight: '700'
            }}>
              <th style={{ padding: '12px 16px' }}>Plant / Nodal Dairy</th>
              <th style={{ padding: '12px 16px' }}>Location</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>Trips (LRs)</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>Routes</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>Sejas</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Dispatched Qty (Kg)</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>Delivered</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>Pending</th>
              <th style={{ padding: '12px 16px' }}>Delivery Rate %</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>Tracked</th>
              <th style={{ padding: '12px 16px' }}>Tracking Rate %</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {plants.map((p, idx) => (
              <tr
                key={idx}
                style={{
                  borderBottom: '1px solid var(--border-color, #F1F5F9)',
                  transition: 'background 0.15s ease'
                }}
              >
                <td style={{ padding: '14px 16px', fontWeight: '800', color: p.color }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: p.color
                    }}></span>
                    {p.name}
                  </div>
                </td>
                <td style={{ padding: '14px 16px', color: 'var(--text-muted, #475569)' }}>{p.location}</td>
                <td style={{ padding: '14px 14px', textAlign: 'center', fontWeight: '600' }}>{p.trips}</td>
                <td style={{ padding: '14px 14px', textAlign: 'center', fontWeight: '600' }}>{p.routes}</td>
                <td style={{ padding: '14px 14px', textAlign: 'center', color: 'var(--text-dim, #64748b)' }}>{p.sejas}</td>
                <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '700' }}>
                  {Number(p.qty).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </td>
                <td style={{ padding: '14px 14px', textAlign: 'center', color: '#059669', fontWeight: '700' }}>{p.delRoutes}</td>
                <td style={{ padding: '14px 14px', textAlign: 'center', color: p.pendRoutes > 0 ? '#DC2626' : 'var(--text-dim)', fontWeight: '700' }}>
                  {p.pendRoutes}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      flex: 1,
                      height: '6px',
                      background: 'rgba(0,0,0,0.06)',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${Math.min(100, parseFloat(p.delPct) || 0)}%`,
                        height: '100%',
                        background: '#059669',
                        borderRadius: '3px'
                      }}></div>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', width: '42px', color: '#059669' }}>{p.delPct}%</span>
                  </div>
                </td>
                <td style={{ padding: '14px 14px', textAlign: 'center', color: '#2563EB', fontWeight: '600' }}>
                  {p.trkRoutes} <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>/{p.routes}</span>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      flex: 1,
                      height: '6px',
                      background: 'rgba(0,0,0,0.06)',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${Math.min(100, parseFloat(p.trkPct) || 0)}%`,
                        height: '100%',
                        background: parseFloat(p.trkPct) >= 90 ? '#2563EB' : '#D97706',
                        borderRadius: '3px'
                      }}></div>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', width: '42px', color: '#2563EB' }}>{p.trkPct}%</span>
                  </div>
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.74rem',
                    fontWeight: '700',
                    background: p.statusType === 'success' ? 'rgba(5, 150, 105, 0.1)' : (p.statusType === 'danger' ? 'rgba(227, 30, 36, 0.1)' : 'rgba(37, 99, 235, 0.1)'),
                    color: p.statusType === 'success' ? '#059669' : (p.statusType === 'danger' ? '#DC2626' : '#2563EB'),
                    border: `1px solid ${p.statusType === 'success' ? 'rgba(5, 150, 105, 0.25)' : (p.statusType === 'danger' ? 'rgba(227, 30, 36, 0.25)' : 'rgba(37, 99, 235, 0.25)')}`
                  }}>
                    {p.statusText}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          {totalKpi && (
            <tfoot>
              <tr style={{
                background: 'rgba(0, 0, 0, 0.03)',
                fontWeight: '800',
                borderTop: '2px solid var(--border-color, #CBD5E1)'
              }}>
                <td style={{ padding: '14px 16px', color: 'var(--text-main, #0F172A)' }}>TOTAL / STATEWIDE</td>
                <td style={{ padding: '14px 16px', color: 'var(--text-dim, #64748b)' }}>All Regions</td>
                <td style={{ padding: '14px 14px', textAlign: 'center' }}>{totalKpi.totalTrips}</td>
                <td style={{ padding: '14px 14px', textAlign: 'center' }}>{totalKpi.totalRoutes}</td>
                <td style={{ padding: '14px 14px', textAlign: 'center' }}>{totalKpi.totalSejas}</td>
                <td style={{ padding: '14px 16px', textAlign: 'right', color: '#1E3A8A' }}>
                  {Number(totalKpi.totalQty).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </td>
                <td style={{ padding: '14px 14px', textAlign: 'center', color: '#059669' }}>{totalKpi.deliveredRoutes}</td>
                <td style={{ padding: '14px 14px', textAlign: 'center', color: totalKpi.pendingRoutes > 0 ? '#DC2626' : '#059669' }}>
                  {totalKpi.pendingRoutes}
                </td>
                <td style={{ padding: '14px 16px', fontWeight: '800', color: '#059669' }}>{totalKpi.deliveryRate}%</td>
                <td style={{ padding: '14px 14px', textAlign: 'center', color: '#2563EB' }}>{totalKpi.trackedRoutes}</td>
                <td style={{ padding: '14px 16px', fontWeight: '800', color: '#2563EB' }}>{totalKpi.trackingRate}%</td>
                <td style={{ padding: '14px 16px', textAlign: 'center', color: '#059669' }}>Operational</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
