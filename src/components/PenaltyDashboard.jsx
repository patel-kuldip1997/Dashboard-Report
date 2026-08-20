import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AlertCircle, Clock, CheckCircle, Target, FileText, AlertTriangle, Download, ChevronDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
export default function PenaltyDashboard({ data }) {
  const [activeTab, setActiveTab] = useState('summary');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const generateExportData = (isSplit) => {
    const exportRows = [];
    filteredData.forEach(row => {
      const dcs = (row.dcNo || '').split(',').map(s => s.trim()).filter(s => s);
      if (!isSplit || dcs.length <= 1) {
         exportRows.push({
           'Reference Number': row.refNo,
           'Penalty Hours': row.penaltyHours,
           'Calculated Penalty': typeof row.finalPenalty === 'number' ? row.finalPenalty : '',
           'Start_Trip': row.startTripStr,
           'end_trip': row.endTripStr,
           'DC No.': row.dcNo,
           'Total Time': row.totalTime,
           'Final Penalty': row.finalPenalty
         });
      } else {
         dcs.forEach((dc, idx) => {
            if (idx === 0) {
               exportRows.push({
                 'Reference Number': row.refNo,
                 'Penalty Hours': row.penaltyHours,
                 'Calculated Penalty': typeof row.finalPenalty === 'number' ? row.finalPenalty : '',
                 'Start_Trip': row.startTripStr,
                 'end_trip': row.endTripStr,
                 'DC No.': dc,
                 'Total Time': row.totalTime,
                 'Final Penalty': row.finalPenalty
               });
            } else {
               exportRows.push({
                 'Reference Number': '',
                 'Penalty Hours': '',
                 'Calculated Penalty': '',
                 'Start_Trip': '',
                 'end_trip': '',
                 'DC No.': dc,
                 'Total Time': '',
                 'Final Penalty': ''
               });
            }
         });
      }
    });
    return exportRows;
  };

  const handleExport = (type, isSplit) => {
    setExportMenuOpen(false);
    const exportRows = generateExportData(isSplit);
    if (exportRows.length === 0) return;
    
    const suffix = isSplit ? 'Split_View' : 'Grouped_View';
    
    if (type === 'excel') {
      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Penalty Data");
      XLSX.writeFile(wb, `Penalty_Report_${suffix}.xlsx`);
    } else if (type === 'pdf') {
      const doc = new jsPDF('landscape');
      const headers = Object.keys(exportRows[0] || {});
      const dataRows = exportRows.map(row => headers.map(h => row[h] !== undefined ? String(row[h]) : ''));
      autoTable(doc, {
        head: [headers],
        body: dataRows,
        styles: { fontSize: 8 },
        theme: 'grid'
      });
      doc.save(`Penalty_Report_${suffix}.pdf`);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter(row => {
      const matchSearch = row.refNo?.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchFilter = true;
      if (filterType === 'Time Error') matchFilter = row.finalPenalty === 'Time Error';
      else if (filterType === 'Data Error') matchFilter = row.finalPenalty === 'Data Error';
      else if (filterType === 'Valid') matchFilter = row.finalPenalty !== 'Time Error' && row.finalPenalty !== 'Data Error';
      else if (filterType === 'Penalty') matchFilter = typeof row.finalPenalty === 'number' && row.finalPenalty > 0;
      
      return matchSearch && matchFilter;
    });
  }, [data, searchTerm, filterType]);

  const stats = useMemo(() => {
    let totalPenalty = 0;
    let timeErrors = 0;
    let dataErrors = 0;
    let blankTrips = 0;
    let totalValid = 0;
    let penaltyTrips = 0;
    let cleanTrips = 0;

    data.forEach(row => {
      if (row.finalPenalty === 'Time Error') timeErrors++;
      else if (row.finalPenalty === 'Data Error') dataErrors++;
      else if (row.finalPenalty === '' || row.finalPenalty === null) blankTrips++;
      else {
        totalValid++;
        const p = Number(row.finalPenalty) || 0;
        totalPenalty += p;
        if (p > 0) penaltyTrips++;
        else cleanTrips++;
      }
    });

    return { totalPenalty, timeErrors, dataErrors, blankTrips, totalValid, penaltyTrips, cleanTrips, totalRows: data.length };
  }, [data]);

  const penaltyByHoursData = useMemo(() => {
    const buckets = { '0': 0, '1-5': 0, '6-10': 0, '11-20': 0, '20+': 0 };
    data.forEach(row => {
      const p = Number(row.finalPenalty) || 0;
      if (p > 0 && !isNaN(row.totalTime)) {
         const overHours = Math.max(0, row.totalTime - (Number(row.penaltyHours) || 16));
         if (overHours === 0) buckets['0']++;
         else if (overHours <= 5) buckets['1-5']++;
         else if (overHours <= 10) buckets['6-10']++;
         else if (overHours <= 20) buckets['11-20']++;
         else buckets['20+']++;
      }
    });
    return Object.entries(buckets).map(([k, v]) => ({ name: k + ' Hrs', count: v }));
  }, [data]);

  if (!data || data.length === 0) return null;

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <button 
          onClick={() => setActiveTab('summary')}
          className={activeTab === 'summary' ? 'btn-primary' : 'btn-secondary'}
        >
          Data Summary (Table)
        </button>
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}
        >
          Visual Analytics (Dashboard)
        </button>
      </div>

      {activeTab === 'summary' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ margin: 0, color: 'var(--text-main)' }}>Penalty Data Table</h2>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input 
                type="text" 
                placeholder="Search Ref Number..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-main)', minWidth: '200px' }}
              />
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-main)', cursor: 'pointer' }}
              >
                <option value="All">All Status</option>
                <option value="Valid">Valid Records</option>
                <option value="Penalty">With Penalty</option>
                <option value="Time Error">Time Errors</option>
                <option value="Data Error">Data Errors</option>
              </select>
              
              <div style={{ position: 'relative' }} ref={exportMenuRef}>
                <button 
                  onClick={() => setExportMenuOpen(!exportMenuOpen)}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Download size={16} />
                  Export Data
                  <ChevronDown size={16} />
                </button>
                
                {exportMenuOpen && (
                  <div style={{ 
                    position: 'absolute', top: '100%', right: 0, marginTop: '8px', 
                    background: 'var(--bg-panel)', border: '1px solid var(--border-color)', 
                    borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10,
                    minWidth: '220px', overflow: 'hidden'
                  }}>
                    <div style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.05)' }}>
                      Download as Excel
                    </div>
                    <div className="nav-item" onClick={() => handleExport('excel', false)} style={{ padding: '10px 16px', cursor: 'pointer' }}>
                      Grouped View (One row per trip)
                    </div>
                    <div className="nav-item" onClick={() => handleExport('excel', true)} style={{ padding: '10px 16px', cursor: 'pointer' }}>
                      Split View (Original DC rows)
                    </div>
                    
                    <div style={{ padding: '8px 12px', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.05)' }}>
                      Download as PDF
                    </div>
                    <div className="nav-item" onClick={() => handleExport('pdf', false)} style={{ padding: '10px 16px', cursor: 'pointer' }}>
                      Grouped View (One row per trip)
                    </div>
                    <div className="nav-item" onClick={() => handleExport('pdf', true)} style={{ padding: '10px 16px', cursor: 'pointer' }}>
                      Split View (Original DC rows)
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Sr No.</th>
                  <th>Reference Number</th>
                  <th>DC No.</th>
                  <th>Penalty Hours Limit</th>
                  <th>Start Trip</th>
                  <th>End Trip</th>
                  <th>Total Time (Hrs)</th>
                  <th>Final Penalty (₹)</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, idx) => (
                  <tr key={idx} className="table-row-hover">
                    <td>{idx + 1}</td>
                    <td style={{ fontWeight: '500' }}>{row.refNo}</td>
                    <td>{row.dcNo}</td>
                    <td>{row.penaltyHours}</td>
                    <td>{row.startTripStr}</td>
                    <td>{row.endTripStr}</td>
                    <td style={{ color: row.totalTime === 'Time Error' ? '#ef4444' : 'inherit' }}>
                      {typeof row.totalTime === 'number' ? row.totalTime.toFixed(2) : row.totalTime}
                    </td>
                    <td style={{ 
                      fontWeight: 'bold', 
                      color: row.finalPenalty === 'Time Error' || row.finalPenalty === 'Data Error' ? '#ef4444' : (row.finalPenalty > 0 ? 'var(--accent-primary)' : '#10b981')
                    }}>
                      {row.finalPenalty === 'Time Error' || row.finalPenalty === 'Data Error' 
                        ? <span className="status-badge status-error">{row.finalPenalty}</span> 
                        : (row.finalPenalty > 0 ? `₹${row.finalPenalty.toLocaleString()}` : '₹0')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <>
          <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
            <div className="kpi-card" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0) 100%)', borderLeft: '4px solid #ef4444' }}>
              <div className="kpi-title" style={{ color: '#ef4444' }}>Total Penalty Amount</div>
              <div className="kpi-value">₹{stats.totalPenalty.toLocaleString()}</div>
              <div className="kpi-trend">From {stats.penaltyTrips} delayed trips</div>
            </div>
            
            <div className="kpi-card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0) 100%)', borderLeft: '4px solid #10b981' }}>
              <div className="kpi-title" style={{ color: '#10b981' }}>Clean Trips (No Penalty)</div>
              <div className="kpi-value">{stats.cleanTrips}</div>
              <div className="kpi-trend">{((stats.cleanTrips / Math.max(1, stats.totalValid)) * 100).toFixed(1)}% of valid trips</div>
            </div>

            <div className="kpi-card" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0) 100%)', borderLeft: '4px solid #f59e0b' }}>
              <div className="kpi-title" style={{ color: '#f59e0b' }}>Calculation Errors</div>
              <div className="kpi-value">{stats.timeErrors + stats.dataErrors}</div>
              <div className="kpi-trend">{stats.timeErrors} Time, {stats.dataErrors} Data Errors</div>
            </div>

            <div className="kpi-card" style={{ background: 'linear-gradient(135deg, rgba(107, 114, 128, 0.1) 0%, rgba(107, 114, 128, 0) 100%)', borderLeft: '4px solid #6b7280' }}>
              <div className="kpi-title" style={{ color: 'var(--text-main)' }}>Blank / Grouped Rows</div>
              <div className="kpi-value">{stats.blankTrips}</div>
              <div className="kpi-trend">No timestamps provided</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ marginBottom: '16px' }}>Penalty Trips by Overtime Hours</h3>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={penaltyByHoursData}>
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                    <Bar dataKey="count" fill="var(--accent-primary)" radius={[4, 4, 0, 0]}>
                      {penaltyByHoursData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.count > 0 ? 'var(--accent-primary)' : 'var(--border-color)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px' }}>
               <h3 style={{ marginBottom: '16px' }}>Data Quality Breakdown</h3>
               <div style={{ height: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', padding: '12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
                     <CheckCircle size={24} color="#10b981" style={{ marginRight: '16px' }} />
                     <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#10b981' }}>Valid Records</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{stats.totalValid} out of {stats.totalRows} trips</div>
                     </div>
                     <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{((stats.totalValid / stats.totalRows) * 100).toFixed(1)}%</div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', padding: '12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px' }}>
                     <AlertTriangle size={24} color="#f59e0b" style={{ marginRight: '16px' }} />
                     <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#f59e0b' }}>Calculation Errors</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Time Errors ({stats.timeErrors}) and Data Errors ({stats.dataErrors})</div>
                     </div>
                     <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.timeErrors + stats.dataErrors}</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', padding: '12px', background: 'rgba(107, 114, 128, 0.1)', borderRadius: '8px' }}>
                     <FileText size={24} color="var(--text-muted)" style={{ marginRight: '16px' }} />
                     <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-main)' }}>Blank / Grouped Rows</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Rows with only DC Number</div>
                     </div>
                     <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.blankTrips}</div>
                  </div>
               </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
