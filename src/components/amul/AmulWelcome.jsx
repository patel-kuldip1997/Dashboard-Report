import React from 'react';
import { 
  Building2, Truck, MapPin, Route, Settings, Layers, 
  ArrowRight, ShieldCheck, CheckCircle2, Sparkles 
} from 'lucide-react';

export default function AmulWelcome({ onNavigate, kpis }) {
  const cards = [
    {
      id: 'all',
      title: 'Master KPI Dashboard',
      badge: 'All-In-One',
      desc: 'Consolidated executive view of plants, transporters, districts, and statewide fulfillment metrics.',
      icon: Layers,
      color: '#E31E24',
      action: 'Open Master Dashboard'
    },
    {
      id: 'plants',
      title: 'Plant Performance',
      badge: '3 Hubs',
      desc: 'Logistics throughput and delivery fulfillment across Banas, Kaira, and Sumul dairies.',
      icon: Building2,
      color: '#2563EB',
      action: 'View Plant Scorecard'
    },
    {
      id: 'transporters',
      title: 'Transporter SLA Scorecard',
      badge: '15 Partners',
      desc: 'Live tracking of Delivered Blocks, Pending Blocks, Delivery Ration %, and GPS compliance.',
      icon: Truck,
      color: '#059669',
      action: 'View Transporter SLA'
    },
    {
      id: 'districts',
      title: 'District-Wise Matrix',
      badge: '40 Districts',
      desc: 'Anganwadi Seja distribution mapped by Nodal Dairy (Column A) and District (Column B).',
      icon: MapPin,
      color: '#D97706',
      action: 'Explore District Matrix'
    },
    {
      id: 'routes',
      title: 'Consignment & Route Register',
      badge: '382 Routes',
      desc: 'Detailed LR-level trip register with vehicle number, transporter, block, and delivery logs.',
      icon: Route,
      color: '#7C3AED',
      action: 'Inspect Route Register'
    },
    {
      id: 'customize-columns',
      title: 'Customize Columns',
      badge: 'Settings',
      desc: 'Configure and show/hide custom columns for Route Register, Transporters, and Districts.',
      icon: Settings,
      color: '#475569',
      action: 'Customize Columns'
    }
  ];

  return (
    <div className="welcome-container" style={{ padding: '50px 20px 80px 20px', maxWidth: '1080px', margin: '0 auto', textAlign: 'center' }}>
      {/* Exact GSCSCL Style Circular Logo Container */}
      <div style={{
        display: 'inline-flex',
        padding: '16px 20px',
        borderRadius: '50%',
        background: 'var(--bg-panel, #ffffff)',
        boxShadow: 'var(--shadow-md, 0 8px 24px rgba(0, 0, 0, 0.08))',
        marginBottom: '20px',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100px',
        height: '100px'
      }}>
        <img 
          src="/amul-logo.svg" 
          alt="Amul Logo" 
          style={{ width: '82px', height: '60px', objectFit: 'contain' }} 
        />
      </div>

      {/* GSCSCL Style Version Pill */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
        <div 
          className="version-pill" 
          style={{ padding: '6px 14px', fontSize: '0.85rem', cursor: 'default' }}
        >
          <span className="version-dot"></span>
          Amul Take Home Ration (THR) Engine • v3.2.0
        </div>
      </div>

      {/* GSCSCL Style Headline */}
      <h1 style={{ 
        fontSize: '2.5rem', 
        color: 'var(--text-main, #0F172A)', 
        marginBottom: '16px', 
        fontWeight: '700',
        fontFamily: 'inherit',
        letterSpacing: '-0.02em'
      }}>
        Welcome to Amul Report Dashboard
      </h1>

      {/* GSCSCL Style Subtitle */}
      <p style={{ 
        fontSize: '1.15rem', 
        color: 'var(--text-muted, #475569)', 
        marginBottom: '44px', 
        maxWidth: '740px', 
        margin: '0 auto 44px auto', 
        lineHeight: '1.6' 
      }}>
        Please select a report module from the sidebar to begin analyzing your data. Dispatches, plant performance, transporter SLAs, and district coverage are automatically calculated.
      </p>

      {/* Minimalist Quick-Action Cards Grid matching application styling */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
        gap: '18px',
        textAlign: 'left'
      }}>
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.id}
              onClick={() => onNavigate(c.id)}
              style={{
                background: 'var(--bg-panel, #FFFFFF)',
                border: '1px solid var(--border-color, #E2E8F0)',
                borderRadius: '14px',
                padding: '22px 24px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md, 0 10px 25px -5px rgba(0,0,0,0.1))';
                e.currentTarget.style.borderColor = c.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))';
                e.currentTarget.style.borderColor = 'var(--border-color, #E2E8F0)';
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: `${c.color}15`,
                    color: c.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Icon size={20} />
                  </div>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'rgba(0, 0, 0, 0.04)',
                    color: 'var(--text-muted, #475569)'
                  }}>
                    {c.badge}
                  </span>
                </div>

                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '1.08rem',
                  fontWeight: '700',
                  color: 'var(--text-main, #0F172A)'
                }}>
                  {c.title}
                </h3>

                <p style={{
                  margin: 0,
                  fontSize: '0.84rem',
                  color: 'var(--text-muted, #475569)',
                  lineHeight: '1.5'
                }}>
                  {c.desc}
                </p>
              </div>

              <div style={{
                marginTop: '18px',
                paddingTop: '14px',
                borderTop: '1px solid var(--border-color, #F1F5F9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: c.color,
                fontSize: '0.84rem',
                fontWeight: '700'
              }}>
                <span>{c.action}</span>
                <ArrowRight size={15} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
