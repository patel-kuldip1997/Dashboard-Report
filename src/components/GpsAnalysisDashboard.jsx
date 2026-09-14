import React, { useState, useMemo } from 'react';
import { Truck, AlertTriangle, Activity, MapPin, Search } from 'lucide-react';
import GpsMapPlot from './GpsMapPlot';

const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        
        const pad = (n) => n.toString().padStart(2, '0');
        const day = pad(d.getDate());
        const month = pad(d.getMonth() + 1);
        const year = d.getFullYear();
        
        let hours = d.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; 
        const mins = pad(d.getMinutes());
        const secs = pad(d.getSeconds());
        
        return `${year}-${month}-${day} ${pad(hours)}:${mins}:${secs} ${ampm}`;
    } catch(e) {
        return dateString;
    }
};

const GpsAnalysisDashboard = ({ data }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('vehicles');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [tempStartDate, setTempStartDate] = useState('');
    const [tempEndDate, setTempEndDate] = useState('');
    const [selectedMapVehicle, setSelectedMapVehicle] = useState(null);

    const processedData = useMemo(() => {
        if (!data || data.length === 0) return { vehicles: [], alerts: [], summary: {} };

        const vehicleMap = {};
        const alerts = [];
        let totalPings = 0;
        let totalDisconnects = 0;

        const start = startDate ? new Date(startDate).getTime() : 0;
        const end = endDate ? new Date(endDate).getTime() : Infinity;

        data.forEach(ping => {
            const pingTime = new Date(ping.timestamp).getTime();
            if (pingTime < start || pingTime > end) return;
            
            totalPings++;
            
            if (!vehicleMap[ping.vehicleNo]) {
                vehicleMap[ping.vehicleNo] = {
                    vehicleNo: ping.vehicleNo,
                    imeiSet: new Set([ping.imei]),
                    pingCount: 0,
                    duplicatePingCount: 0,
                    seenTimestamps: new Set(),
                    disconnectCount: 0,
                    firstPing: ping.timestamp,
                    lastPing: ping.timestamp,
                    lastLat: ping.lat,
                    lastLng: ping.lng
                };
            }

            const v = vehicleMap[ping.vehicleNo];
            v.pingCount++;
            
            if (ping.imei) v.imeiSet.add(ping.imei);
            if (v.seenTimestamps.has(ping.timestamp)) {
                v.duplicatePingCount++;
            } else {
                v.seenTimestamps.add(ping.timestamp);
            }
            
            // Keep track of latest known ping time
            if (ping.timestamp > v.lastPing) {
                v.lastPing = ping.timestamp;
                v.lastLat = ping.lat;
                v.lastLng = ping.lng;
            }
            if (ping.timestamp < v.firstPing) {
                v.firstPing = ping.timestamp;
            }

            if (ping.isTampered) {
                totalDisconnects++;
                v.disconnectCount++;
                alerts.push({
                    vehicleNo: ping.vehicleNo,
                    imei: ping.imei,
                    timestamp: ping.timestamp,
                    lat: ping.lat,
                    lng: ping.lng
                });
            }
        });

        // Sort alerts by timestamp descending
        alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        const vehicleList = Object.values(vehicleMap).sort((a, b) => b.disconnectCount - a.disconnectCount);

        return {
            vehicles: vehicleList,
            alerts: alerts,
            summary: {
                totalPings,
                totalDisconnects,
                totalVehicles: vehicleList.length,
                vehiclesWithDisconnects: vehicleList.filter(v => v.disconnectCount > 0).length
            }
        };
    }, [data]);

    const filteredVehicles = useMemo(() => {
        if (!searchTerm) return processedData.vehicles;
        const lowerSearch = searchTerm.toLowerCase();
        return processedData.vehicles.filter(v => 
            String(v.vehicleNo).toLowerCase().includes(lowerSearch) || 
            Array.from(v.imeiSet).some(imei => String(imei).toLowerCase().includes(lowerSearch))
        );
    }, [processedData.vehicles, searchTerm]);
    
    const filteredAlerts = useMemo(() => {
        if (!searchTerm) return processedData.alerts;
        const lowerSearch = searchTerm.toLowerCase();
        return processedData.alerts.filter(a => 
            String(a.vehicleNo).toLowerCase().includes(lowerSearch) || 
            String(a.imei).toLowerCase().includes(lowerSearch)
        );
    }, [processedData.alerts, searchTerm]);

    if (!data || data.length === 0) return null;

    const { summary } = processedData;

    if (selectedMapVehicle) {
        const vehiclePings = data.filter(p => p.vehicleNo === selectedMapVehicle);
        // also apply date filter
        const start = startDate ? new Date(startDate).getTime() : 0;
        const end = endDate ? new Date(endDate).getTime() : Infinity;
        const filteredPings = vehiclePings.filter(ping => {
            const pt = new Date(ping.timestamp).getTime();
            return pt >= start && pt <= end;
        });

        return <GpsMapPlot vehicleNo={selectedMapVehicle} pings={filteredPings} onBack={() => setSelectedMapVehicle(null)} />;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', animation: 'fadeIn 0.5s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>GPS Data Analytics Dashboard</h2>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.85rem', color: '#4b5563', fontWeight: '500' }}>Start Date & Time</label>
                        <input 
                            type="datetime-local" 
                            value={tempStartDate} 
                            onChange={(e) => setTempStartDate(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', color: '#1f2937', outline: 'none', fontSize: '0.9rem', width: '220px', fontFamily: 'monospace' }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.85rem', color: '#4b5563', fontWeight: '500' }}>End Date & Time</label>
                        <input 
                            type="datetime-local" 
                            value={tempEndDate} 
                            onChange={(e) => setTempEndDate(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', color: '#1f2937', outline: 'none', fontSize: '0.9rem', width: '220px', fontFamily: 'monospace' }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                        <button 
                            className="btn-primary"
                            onClick={() => { setStartDate(tempStartDate); setEndDate(tempEndDate); }}
                            style={{ padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold' }}
                        >
                            Submit
                        </button>
                        <button 
                            className="btn-secondary"
                            onClick={() => { setTempStartDate(''); setTempEndDate(''); setStartDate(''); setEndDate(''); }}
                            style={{ padding: '8px 16px', borderRadius: '6px', background: '#fff', border: '1px solid #d1d5db', color: '#374151', fontWeight: '500' }}
                        >
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: '4px solid #3b82f6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                        <Truck size={18} color="#3b82f6" />
                        <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Total Vehicles</span>
                    </div>
                    <span style={{ fontSize: '2.4rem', fontWeight: '700', color: 'var(--text-main)', lineHeight: '1' }}>{summary.totalVehicles}</span>
                </div>
                
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: '4px solid #2ed573' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                        <Activity size={18} color="#2ed573" />
                        <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Total Pings</span>
                    </div>
                    <span style={{ fontSize: '2.4rem', fontWeight: '700', color: 'var(--text-main)', lineHeight: '1' }}>{summary.totalPings.toLocaleString()}</span>
                </div>
                
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: '4px solid #ff4757' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                        <AlertTriangle size={18} color="#ff4757" />
                        <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Tampering/Disconnects</span>
                    </div>
                    <span style={{ fontSize: '2.4rem', fontWeight: '700', color: '#ff4757', lineHeight: '1' }}>{summary.totalDisconnects.toLocaleString()}</span>
                </div>
                
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: '4px solid #ffa502' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                        <AlertTriangle size={18} color="#ffa502" />
                        <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Vehicles with Alerts</span>
                    </div>
                    <span style={{ fontSize: '2.4rem', fontWeight: '700', color: 'var(--text-main)', lineHeight: '1' }}>{summary.vehiclesWithDisconnects}</span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                            className={`btn-${activeTab === 'vehicles' ? 'primary' : 'secondary'}`} 
                            onClick={() => setActiveTab('vehicles')}
                            style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.95rem' }}
                        >
                            Vehicle Summary
                        </button>
                        <button 
                            className={`btn-${activeTab === 'alerts' ? 'primary' : 'secondary'}`} 
                            onClick={() => setActiveTab('alerts')}
                            style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.95rem', display: 'flex', gap: '6px', alignItems: 'center' }}
                        >
                            Disconnection Alerts
                            {summary.totalDisconnects > 0 && (
                                <span style={{ background: '#ff4757', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                    {summary.totalDisconnects}
                                </span>
                            )}
                        </button>
                    </div>

                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                            type="text" 
                            placeholder="Search Vehicle No or IMEI..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', outline: 'none' }}
                        />
                    </div>
                </div>

                <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap' }}>
                        <thead style={{ background: 'var(--bg-secondary)', position: 'sticky', top: 0, zIndex: 1 }}>
                            {activeTab === 'vehicles' ? (
                                <tr>
                                    <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border-color)', fontWeight: '600', color: 'var(--text-muted)' }}>Vehicle No</th>
                                    <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border-color)', fontWeight: '600', color: 'var(--text-muted)' }}>IMEI(s)</th>
                                    <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border-color)', fontWeight: '600', color: 'var(--text-muted)' }}>Total Pings</th>
                                    <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border-color)', fontWeight: '600', color: 'var(--text-muted)' }}>Duplicate Pings</th>
                                    <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border-color)', fontWeight: '600', color: 'var(--text-muted)' }}>GPS Disconnects</th>
                                    <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border-color)', fontWeight: '600', color: 'var(--text-muted)' }}>First Ping</th>
                                    <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border-color)', fontWeight: '600', color: 'var(--text-muted)' }}>Last Ping</th>
                                    <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border-color)', fontWeight: '600', color: 'var(--text-muted)' }}>Last Location</th>
                                </tr>
                            ) : (
                                <tr>
                                    <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border-color)', fontWeight: '600', color: 'var(--text-muted)' }}>Timestamp</th>
                                    <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border-color)', fontWeight: '600', color: 'var(--text-muted)' }}>Vehicle No</th>
                                    <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border-color)', fontWeight: '600', color: 'var(--text-muted)' }}>IMEI</th>
                                    <th style={{ padding: '12px 16px', borderBottom: '2px solid var(--border-color)', fontWeight: '600', color: 'var(--text-muted)' }}>Location</th>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {activeTab === 'vehicles' ? (
                                filteredVehicles.length > 0 ? (
                                    filteredVehicles.map((v, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)', background: v.disconnectCount > 0 ? 'rgba(255, 71, 87, 0.05)' : 'transparent' }}>
                                            <td style={{ padding: '12px 16px', fontWeight: '600' }}>{v.vehicleNo}</td>
                                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                                                {Array.from(v.imeiSet).map((imei, idx) => (
                                                    <div key={idx}>{imei}</div>
                                                ))}
                                                {v.imeiSet.size > 1 && <div style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', marginTop: '4px' }}>({v.imeiSet.size} IMEIs)</div>}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>{v.pingCount}</td>
                                            <td style={{ padding: '12px 16px', color: v.duplicatePingCount > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                                                {v.duplicatePingCount}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                {v.disconnectCount > 0 ? (
                                                    <span style={{ color: '#ff4757', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <AlertTriangle size={14} /> {v.disconnectCount}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)' }}>0</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{formatDate(v.firstPing)}</td>
                                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{formatDate(v.lastPing)}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <button onClick={() => setSelectedMapVehicle(v.vehicleNo)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem', padding: 0 }}>
                                                    <MapPin size={14} /> View Map Route
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>No vehicles found matching search.</td>
                                    </tr>
                                )
                            ) : (
                                filteredAlerts.length > 0 ? (
                                    filteredAlerts.map((a, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '12px 16px', fontWeight: '600', color: '#ff4757' }}>{formatDate(a.timestamp)}</td>
                                            <td style={{ padding: '12px 16px', fontWeight: '600' }}>{a.vehicleNo}</td>
                                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{a.imei}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', gap: '12px' }}>
                                                    <button onClick={() => setSelectedMapVehicle(a.vehicleNo)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem', padding: 0 }}>
                                                        <MapPin size={14} /> View Route
                                                    </button>
                                                    <a href={`https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}`} target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                                                        (Google Maps)
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            {searchTerm ? 'No alerts found matching search.' : 'No tampering/disconnection alerts detected in this dataset! ??'}
                                        </td>
                                    </tr>
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default GpsAnalysisDashboard;
