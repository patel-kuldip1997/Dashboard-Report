import React, { useState, useEffect } from 'react';
import { sha256 } from 'js-sha256';
import { DEFAULT_REPORT_ATTRIBUTES } from '../reportAttributes';

const reportNames = {
  'first-mile-epod': 'First Mile EPOD',
  'godown-to-miller': 'Godown to Miller Trips',
  'miller-to-godown': 'Miller to Godown Trips',
  'lifting-report': 'Lifting Analysis',
  'last-mile-epod': 'Last Mile EPOD',
  'eta-route': 'ETA Route Adherence',
  'vehicle-assigned': 'Vehicle Assigned',
  'last-mile-imei': 'Last Mile IMEI',
  'multi-trip-analysis': 'Multi Trip Analysis',
  'weighbridge-report': 'Weighbridge Report'
};

// The expected username for admin access
const ADMIN_USERNAME = 'kuldipp@rbi.edu.in';
// SHA-256 hash for 'Eyecon@123'
const ADMIN_PASSWORD_HASH = 'd7e2340880afed33eb88dea1857a9328af70cfc7d57ddae66c60010451de883e';

const CustomizeReport = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [attributes, setAttributes] = useState(DEFAULT_REPORT_ATTRIBUTES);
  const [selectedReport, setSelectedReport] = useState(null);
  const [newAlias, setNewAlias] = useState('');
  const [editingAttr, setEditingAttr] = useState(null);
  
  // State for updating existing custom columns
  const [editingColumnName, setEditingColumnName] = useState(null);
  const [editedColumnNameValue, setEditedColumnNameValue] = useState('');
  
  // State for completely new custom columns
  const [isAddingNewColumn, setIsAddingNewColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  // Custom Alert State
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: 'alert', message: '', onConfirm: null });

  const showAlert = (message) => {
      setModalConfig({ isOpen: true, type: 'alert', message, onConfirm: null });
  };

  const showConfirm = (message, onConfirm) => {
      setModalConfig({ isOpen: true, type: 'confirm', message, onConfirm });
  };

  const closeModal = () => {
      setModalConfig({ ...modalConfig, isOpen: false });
  };

  // Check if already authenticated in this session
  useEffect(() => {
      const auth = sessionStorage.getItem('isAdminAuth');
      if (auth === 'true') {
          setIsAuthenticated(true);
      }
  }, []);

  const handleLogin = async (e) => {
      e.preventDefault();
      setLoginError('');
      
      if (loginUsername.trim().toLowerCase() !== ADMIN_USERNAME.toLowerCase()) {
          showAlert('Invalid username or password. Please try again.');
          return;
      }
      
      try {
          const hash = await sha256(loginPassword);
          if (hash === ADMIN_PASSWORD_HASH) {
              setIsAuthenticated(true);
              sessionStorage.setItem('isAdminAuth', 'true');
              showAlert('Login successful! You now have admin access.');
          } else {
              showAlert('Invalid username or password. Please try again.');
          }
      } catch (err) {
          showAlert('Error verifying security credentials');
      }
  };

  useEffect(() => {
    const saved = localStorage.getItem('customReportAttributes_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge saved custom attributes with default structure to ensure new standard attributes aren't lost
        const merged = { ...DEFAULT_REPORT_ATTRIBUTES };
        for (const reportKey in parsed) {
            if (merged[reportKey]) {
                for (const attrKey in parsed[reportKey]) {
                    if (merged[reportKey][attrKey]) {
                        merged[reportKey][attrKey] = parsed[reportKey][attrKey];
                    }
                }
            }
        }
        setAttributes(merged);
      } catch (e) {
        console.error('Failed to parse custom attributes', e);
      }
    }
  }, []);

  const handleSave = (updatedAttributes) => {
    setAttributes(updatedAttributes);
    localStorage.setItem('customReportAttributes_v3', JSON.stringify(updatedAttributes));
  };


  const handleReset = () => {
    showConfirm(`Are you sure you want to reset all mappings for ${reportNames[selectedReport] || selectedReport} back to their defaults?`, () => {
      const updated = {
          ...attributes,
          [selectedReport]: DEFAULT_REPORT_ATTRIBUTES[selectedReport]
      };
      handleSave(updated);
      showAlert(`${reportNames[selectedReport] || selectedReport} configuration has been reset to defaults.`);
    });
  };

  const handleAddAlias = () => {
    if (newAlias.trim()) {
        const currentAliases = attributes[selectedReport][editingAttr];
        if (currentAliases.some(a => a.toLowerCase() === newAlias.trim().toLowerCase())) {
            showAlert('This alias already exists.');
            return;
        }
        
        showConfirm(`Are you sure you want to add alias "${newAlias.trim()}" to ${editingAttr}?`, () => {
            const updated = {
                ...attributes,
                [selectedReport]: {
                    ...attributes[selectedReport],
                    [editingAttr]: [...currentAliases, newAlias.trim()]
                }
            };
            handleSave(updated);
            setEditingAttr(null);
            setNewAlias('');
        });
    }
  };

  const handleRemoveAlias = (reportKey, attr, idx) => {
    const currentAliases = attributes[reportKey][attr];
    if (currentAliases.length <= 1) {
        showAlert('You must keep at least one mapping for this attribute.');
        return;
    }
    showConfirm("Are you sure you want to remove this alias?", () => {
        const newAliases = [...currentAliases];
        newAliases.splice(idx, 1);
        const updated = {
            ...attributes,
            [reportKey]: {
                ...attributes[reportKey],
                [attr]: newAliases
            }
        };
        handleSave(updated);
    });
  };

  const handleAddNewColumn = () => {
    if (newColumnName.trim()) {
        if (attributes[selectedReport][newColumnName.trim()]) {
            showAlert('This column name already exists.');
            return;
        }
        
        showConfirm(`Are you sure you want to create a new custom column "${newColumnName.trim()}"?`, () => {
            const updated = {
                ...attributes,
                [selectedReport]: {
                    ...attributes[selectedReport],
                    [newColumnName.trim()]: [newColumnName.trim()]
                }
            };
            handleSave(updated);
            setIsAddingNewColumn(false);
            setNewColumnName('');
        });
    }
  };

  const handleDeleteColumn = (reportKey, attr) => {
    if (DEFAULT_REPORT_ATTRIBUTES[reportKey] && DEFAULT_REPORT_ATTRIBUTES[reportKey][attr]) {
        showAlert('You cannot delete a standard system attribute. You can only add/remove aliases.');
        return;
    }
    showConfirm(`Are you sure you want to completely delete the custom column "${attr}"? This action cannot be undone.`, () => {
        const updatedAttrs = { ...attributes[reportKey] };
        delete updatedAttrs[attr];
        const updated = {
            ...attributes,
            [reportKey]: updatedAttrs
        };
        handleSave(updated);
    });
  };

  const handleUpdateColumnName = (reportKey, oldAttr) => {
    if (!editedColumnNameValue.trim() || editedColumnNameValue.trim() === oldAttr) {
        setEditingColumnName(null);
        return;
    }
    const newName = editedColumnNameValue.trim();
    if (attributes[reportKey][newName]) {
        showAlert('This column name already exists.');
        return;
    }
    showConfirm(`Are you sure you want to rename "${oldAttr}" to "${newName}"?`, () => {
        const updatedAttrs = { ...attributes[reportKey] };
        
        // Copy the aliases array and replace the old exact name with the new name if it was there
        updatedAttrs[newName] = updatedAttrs[oldAttr].map(alias => alias === oldAttr ? newName : alias);
        
        // Delete the old key
        delete updatedAttrs[oldAttr];
        
        const updated = {
            ...attributes,
            [reportKey]: updatedAttrs
        };
        handleSave(updated);
        setEditingColumnName(null);
    });
  };

  if (!isAuthenticated) {
      return (
          <div style={{ padding: '60px 20px', maxWidth: '400px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              <div style={{ backgroundColor: 'var(--bg-panel, white)', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                      <div style={{ padding: '12px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#3b82f6' }}>
                          <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                      </div>
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main, #1e293b)', marginBottom: '8px' }}>Admin Login</h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted, #64748b)', marginBottom: '24px' }}>Please login to access the Master Data report customization.</p>
                  
                  <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
                      <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>Username</label>
                          <input 
                              type="text" 
                              value={loginUsername}
                              onChange={(e) => setLoginUsername(e.target.value)}
                              placeholder="e.g. admin@domain.com"
                              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', outline: 'none' }}
                              required
                          />
                      </div>
                      <div style={{ marginBottom: '24px' }}>
                          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#334155', marginBottom: '6px' }}>Password</label>
                          <input 
                              type="password" 
                              value={loginPassword}
                              onChange={(e) => setLoginPassword(e.target.value)}
                              placeholder="••••••••"
                              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', outline: 'none' }}
                              required
                          />
                      </div>
                      <button type="submit" style={{ width: '100%', backgroundColor: '#2563eb', color: 'white', padding: '10px', border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: '500', cursor: 'pointer', transition: 'background-color 0.2s' }}>
                          Login
                      </button>
                  </form>
              </div>

              {/* Butterfly Style Custom Modal for Login Screen */}
              {modalConfig.isOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, opacity: 1, animation: 'fadeIn 0.2s ease-out' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '32px', width: '90%', maxWidth: '420px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative', overflow: 'hidden', animation: 'scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                        <div style={{ position: 'absolute', top: '-40px', left: '-40px', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}></div>
                        <div style={{ position: 'absolute', bottom: '-40px', right: '-40px', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(239,68,68,0.1) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}></div>
                        
                        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', backgroundColor: modalConfig.type === 'confirm' ? '#fff1f2' : '#eff6ff', color: modalConfig.type === 'confirm' ? '#f43f5e' : '#3b82f6', marginBottom: '20px' }}>
                                <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </div>
                            
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '12px' }}>
                                Notice
                            </h3>
                            
                            <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: '1.5', marginBottom: '28px' }}>
                                {modalConfig.message}
                            </p>
                            
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                <button 
                                    onClick={closeModal} 
                                    style={{ flex: 1, padding: '10px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '12px', border: 'none', fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer', transition: 'transform 0.1s, box-shadow 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)'; }}
                                    onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                                >
                                    Okay
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
              )}
          </div>
      );
  }

  const handleLogout = () => {
    showConfirm('Are you sure you want to logout from admin access?', () => {
        sessionStorage.removeItem('isAdminAuth');
        setIsAuthenticated(false);
        showAlert('You have been successfully logged out.');
    });
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main, #1e293b)' }}>Customize Report Mappings</h2>
          <button onClick={handleLogout} style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#e2e8f0'} onMouseOut={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}>
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginRight: '6px' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
              Logout
          </button>
      </div>

      {!selectedReport ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          {Object.keys(DEFAULT_REPORT_ATTRIBUTES).map(reportKey => (
            <div 
              key={reportKey} 
              style={{ backgroundColor: 'var(--bg-panel, white)', borderRadius: '8px', padding: '24px', cursor: 'pointer', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'transform 0.2s, box-shadow 0.2s' }}
              onClick={() => setSelectedReport(reportKey)}
              onMouseOver={(e) => { e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseOut={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                 <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px' }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                 </div>
                 <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--text-main, #1e293b)', margin: 0 }}>{reportNames[reportKey] || reportKey}</h3>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted, #64748b)', margin: 0, marginTop: '8px' }}>
                 {Object.keys(attributes[reportKey]).length} Configured Columns
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ backgroundColor: 'var(--bg-panel, white)', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
             <div style={{ display: 'flex', alignItems: 'center' }}>
                 <button onClick={() => { setSelectedReport(null); setEditingAttr(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', marginRight: '16px', display: 'flex', alignItems: 'center' }}>
                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                 </button>
                 <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-main, #1e293b)', margin: 0 }}>{reportNames[selectedReport] || selectedReport} - Column Mappings</h3>
             </div>
             <button onClick={handleReset} style={{ backgroundColor: '#ef4444', color: 'white', padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '0.875rem' }}>
                 Reset Report
             </button>
          </div>
          
          <div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted, #64748b)', marginBottom: '24px' }}>
                Map your custom Excel column headers to the system attributes. The system will look for any of these exact names when you upload a file.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {Object.keys(attributes[selectedReport]).map(attr => {
                const isCustom = !(DEFAULT_REPORT_ATTRIBUTES[selectedReport] && DEFAULT_REPORT_ATTRIBUTES[selectedReport][attr]);
                return (
                <div key={attr} style={{ border: isCustom ? '1px solid #fde68a' : '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', backgroundColor: isCustom ? '#fffbeb' : '#f8fafc', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ flex: '1 1 250px' }}>
                        {editingColumnName === attr ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                                <input 
                                    type="text" 
                                    value={editedColumnNameValue} 
                                    onChange={(e) => setEditedColumnNameValue(e.target.value)} 
                                    style={{ border: '1px solid #fbbf24', borderRadius: '4px', padding: '6px', fontSize: '0.875rem', outline: 'none' }}
                                    autoFocus
                                    onKeyDown={(e) => { if(e.key === 'Enter') handleUpdateColumnName(selectedReport, attr); }}
                                />
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => handleUpdateColumnName(selectedReport, attr)} style={{ backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer' }}>Save</button>
                                    <button onClick={() => setEditingColumnName(null)} style={{ backgroundColor: 'transparent', color: '#64748b', border: 'none', padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer' }}>Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <h4 style={{ fontWeight: '600', color: 'var(--text-main, #1e293b)', margin: '0 0 4px 0' }}>{attr}</h4>
                        )}
                        
                        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: isCustom ? 'bold' : 'normal', color: isCustom ? '#d97706' : '#64748b' }}>
                            {isCustom ? 'Custom Column' : 'Standard Attribute'}
                        </span>
                        
                        {isCustom && editingColumnName !== attr && (
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button onClick={() => { setEditingColumnName(attr); setEditedColumnNameValue(attr); }} style={{ fontSize: '0.75rem', color: '#f59e0b', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                    Update Name
                                </button>
                                <button onClick={() => handleDeleteColumn(selectedReport, attr)} style={{ fontSize: '0.75rem', color: '#ef4444', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                    Delete Column
                                </button>
                            </div>
                        )}
                    </div>
                    <div style={{ flex: '2 1 400px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                            {attributes[selectedReport][attr].map((alias, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', backgroundColor: '#dbeafe', color: '#1e40af', fontSize: '0.875rem', padding: '4px 12px', borderRadius: '9999px', border: '1px solid #bfdbfe' }}>
                                    <span>{alias}</span>
                                    {attributes[selectedReport][attr].length > 1 && (
                                        <button onClick={() => handleRemoveAlias(selectedReport, attr, idx)} style={{ marginLeft: '8px', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        
                        {editingAttr === attr ? (
                            <div style={{ display: 'flex', marginTop: '8px' }}>
                                <input 
                                    type="text" 
                                    style={{ border: '1px solid #cbd5e1', borderRadius: '4px 0 0 4px', padding: '6px 12px', fontSize: '0.875rem', width: '200px', outline: 'none' }}
                                    placeholder="e.g. DC No"
                                    value={newAlias}
                                    onChange={(e) => setNewAlias(e.target.value)}
                                    onKeyDown={(e) => { if(e.key === 'Enter') handleAddAlias(); }}
                                    autoFocus
                                />
                                <button onClick={handleAddAlias} style={{ backgroundColor: '#2563eb', color: 'white', padding: '6px 16px', border: 'none', borderRadius: '0 4px 4px 0', fontSize: '0.875rem', cursor: 'pointer' }}>Add</button>
                                <button onClick={() => { setEditingAttr(null); setNewAlias(''); }} style={{ marginLeft: '12px', color: '#64748b', background: 'none', border: 'none', fontSize: '0.875rem', cursor: 'pointer' }}>Cancel</button>
                            </div>
                        ) : (
                            <button onClick={() => { setEditingAttr(attr); setNewAlias(''); }} style={{ fontSize: '0.875rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0, marginTop: '8px' }}>
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginRight: '4px' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                                Add Alias Mapping
                            </button>
                        )}
                    </div>
                </div>
                );
              })}
            </div>
            
            <div style={{ marginTop: '32px', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
                {!isAddingNewColumn ? (
                    <button onClick={() => setIsAddingNewColumn(true)} style={{ display: 'flex', alignItems: 'center', color: '#2563eb', fontWeight: '500', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginRight: '8px' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        Add New Custom Column
                    </button>
                ) : (
                    <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '16px', maxWidth: '400px' }}>
                        <h4 style={{ fontWeight: '600', color: '#1e40af', margin: '0 0 8px 0' }}>Create New Column</h4>
                        <p style={{ fontSize: '0.75rem', color: '#2563eb', margin: '0 0 12px 0' }}>This column will automatically appear in your tables and PDF exports.</p>
                        <div style={{ display: 'flex' }}>
                            <input 
                                type="text" 
                                style={{ border: '1px solid #93c5fd', borderRadius: '4px 0 0 4px', padding: '8px 12px', fontSize: '0.875rem', flex: 1, outline: 'none' }}
                                placeholder="e.g. Driver Phone Number"
                                value={newColumnName}
                                onChange={(e) => setNewColumnName(e.target.value)}
                                onKeyDown={(e) => { if(e.key === 'Enter') handleAddNewColumn(); }}
                                autoFocus
                            />
                            <button onClick={handleAddNewColumn} style={{ backgroundColor: '#2563eb', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '0 4px 4px 0', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer' }}>Create</button>
                        </div>
                        <button onClick={() => { setIsAddingNewColumn(false); setNewColumnName(''); }} style={{ marginTop: '12px', fontSize: '0.875rem', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Cancel</button>
                    </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Butterfly Style Custom Modal */}
      {modalConfig.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, opacity: 1, animation: 'fadeIn 0.2s ease-out' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '32px', width: '90%', maxWidth: '420px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative', overflow: 'hidden', animation: 'scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                {/* Decorative Butterfly Wings Background Effect */}
                <div style={{ position: 'absolute', top: '-40px', left: '-40px', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}></div>
                <div style={{ position: 'absolute', bottom: '-40px', right: '-40px', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(239,68,68,0.1) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}></div>
                
                <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', backgroundColor: modalConfig.type === 'confirm' ? '#fff1f2' : '#eff6ff', color: modalConfig.type === 'confirm' ? '#f43f5e' : '#3b82f6', marginBottom: '20px' }}>
                        {modalConfig.type === 'confirm' ? (
                            <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        ) : (
                            <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        )}
                    </div>
                    
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '12px' }}>
                        {modalConfig.type === 'confirm' ? 'Confirm Action' : 'Notice'}
                    </h3>
                    
                    <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: '1.5', marginBottom: '28px' }}>
                        {modalConfig.message}
                    </p>
                    
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        {modalConfig.type === 'confirm' && (
                            <button 
                                onClick={closeModal} 
                                style={{ flex: 1, padding: '10px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '12px', border: 'none', fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer', transition: 'background-color 0.2s' }}
                                onMouseOver={e => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                                onMouseOut={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                            >
                                Cancel
                            </button>
                        )}
                        <button 
                            onClick={() => {
                                if (modalConfig.onConfirm) modalConfig.onConfirm();
                                closeModal();
                            }} 
                            style={{ flex: 1, padding: '10px', backgroundColor: modalConfig.type === 'confirm' ? '#f43f5e' : '#3b82f6', color: 'white', borderRadius: '12px', border: 'none', fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer', transition: 'transform 0.1s, box-shadow 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)'; }}
                            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                        >
                            {modalConfig.type === 'confirm' ? 'Yes, Proceed' : 'Okay'}
                        </button>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes scaleUp {
                    0% { transform: scale(0.8); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes fadeIn {
                    0% { opacity: 0; }
                    100% { opacity: 1; }
                }
            `}</style>
        </div>
      )}
    </div>
  );
};

export default CustomizeReport;
