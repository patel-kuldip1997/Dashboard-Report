import React, { useState } from 'react';
import { Settings, CheckCircle2, RotateCcw, Save, Eye, Layers, Truck, MapPin, Route } from 'lucide-react';
import { DEFAULT_AMUL_COLUMNS, getAmulColumnConfig, saveAmulColumnConfig } from './amulColumnConfig';

export default function AmulCustomizeColumns({ onSave, showToast }) {
  const [config, setConfig] = useState(() => getAmulColumnConfig());
  const [activeSection, setActiveSection] = useState('routes');

  const toggleColumn = (section, id) => {
    setConfig(prev => ({
      ...prev,
      [section]: prev[section].map(col => 
        col.id === id ? { ...col, visible: !col.visible } : col
      )
    }));
  };

  const handleSelectAll = (section, selectAll) => {
    setConfig(prev => ({
      ...prev,
      [section]: prev[section].map(col => ({ ...col, visible: selectAll }))
    }));
  };

  const handleResetSection = (section) => {
    setConfig(prev => ({
      ...prev,
      [section]: DEFAULT_AMUL_COLUMNS[section]
    }));
  };

  const handleSave = () => {
    saveAmulColumnConfig(config);
    if (onSave) onSave(config);
    if (showToast) showToast('Column customization saved successfully!', 'success');
  };

  const sections = [
    { id: 'routes', label: 'Route Register Columns', icon: Route, count: config.routes.filter(c => c.visible).length, total: config.routes.length },
    { id: 'transporters', label: 'Transporter Scorecard Columns', icon: Truck, count: config.transporters.filter(c => c.visible).length, total: config.transporters.length },
    { id: 'districts', label: 'District Matrix Columns', icon: MapPin, count: config.districts.filter(c => c.visible).length, total: config.districts.length }
  ];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 20px', color: 'var(--text-main, #0F172A)' }}>
      {/* Header */}
      <div style={{
        background: 'var(--bg-panel, #FFFFFF)',
        border: '1px solid var(--border-color, #E2E8F0)',
        borderLeft: '5px solid #E31E24',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: 'var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.04))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(227, 30, 36, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#E31E24'
          }}>
            <Settings size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', fontFamily: 'Outfit, sans-serif' }}>
              Customize Report Columns
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #475569)' }}>
              Choose which columns to show or hide across Amul THR tables. Preferences are saved automatically.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          style={{
            background: '#E31E24',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '0.88rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(227, 30, 36, 0.25)',
            transition: 'all 0.15s ease'
          }}
        >
          <Save size={16} /> Save Column Preferences
        </button>
      </div>

      {/* Section Tabs */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        {sections.map(s => {
          const Icon = s.icon;
          const isActive = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{
                background: isActive ? '#E31E24' : 'var(--bg-panel, #FFFFFF)',
                color: isActive ? '#FFFFFF' : 'var(--text-muted, #475569)',
                border: isActive ? '1px solid #E31E24' : '1px solid var(--border-color, #E2E8F0)',
                borderRadius: '10px',
                padding: '10px 18px',
                fontSize: '0.85rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: isActive ? '0 4px 12px rgba(227, 30, 36, 0.25)' : 'var(--shadow-sm)',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} />
              <span>{s.label}</span>
              <span style={{
                fontSize: '0.72rem',
                padding: '2px 6px',
                borderRadius: '4px',
                background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.05)',
                color: isActive ? '#FFFFFF' : 'var(--text-muted)'
              }}>
                {s.count}/{s.total}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Section Column Card */}
      <div style={{
        background: 'var(--bg-panel, #FFFFFF)',
        border: '1px solid var(--border-color, #E2E8F0)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: 'var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.04))'
      }}>
        {/* Quick Toolbar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          paddingBottom: '14px',
          borderBottom: '1px solid var(--border-color, #F1F5F9)',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main, #0F172A)' }}>
              {sections.find(s => s.id === activeSection)?.label}
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #475569)' }}>
              Toggle visibility for individual columns in this table
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handleSelectAll(activeSection, true)}
              style={{
                background: 'rgba(5, 150, 105, 0.08)',
                color: '#059669',
                border: '1px solid rgba(5, 150, 105, 0.2)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Select All
            </button>
            <button
              onClick={() => handleSelectAll(activeSection, false)}
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                color: '#DC2626',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Deselect All
            </button>
            <button
              onClick={() => handleResetSection(activeSection)}
              style={{
                background: 'rgba(0, 0, 0, 0.04)',
                color: 'var(--text-muted, #475569)',
                border: '1px solid var(--border-color, #E2E8F0)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <RotateCcw size={13} /> Reset
            </button>
          </div>
        </div>

        {/* Column Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '12px'
        }}>
          {config[activeSection].map((col) => (
            <label
              key={col.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '10px',
                border: `1px solid ${col.visible ? 'rgba(227, 30, 36, 0.3)' : 'var(--border-color, #E2E8F0)'}`,
                background: col.visible ? 'rgba(227, 30, 36, 0.04)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{
                fontSize: '0.85rem',
                fontWeight: col.visible ? '700' : '500',
                color: col.visible ? 'var(--text-main, #0F172A)' : 'var(--text-muted, #64748B)'
              }}>
                {col.label}
              </span>
              <input
                type="checkbox"
                checked={col.visible}
                onChange={() => toggleColumn(activeSection, col.id)}
                style={{
                  width: '18px',
                  height: '18px',
                  accentColor: '#E31E24',
                  cursor: 'pointer'
                }}
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
