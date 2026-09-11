import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import { ArrowLeft, Clock, AlertTriangle } from 'lucide-react';

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
        
        return `${day}-${month}-${year} ${pad(hours)}:${mins} ${ampm}`;
    } catch(e) {
        return dateString;
    }
};

const GpsMapPlot = ({ vehicleNo, pings, onBack }) => {
    // Ensure pings are sorted chronologically
    const sortedPings = useMemo(() => {
        return [...pings]
            .filter(p => p.lat != null && p.lng != null && !isNaN(p.lat) && !isNaN(p.lng) && p.lat !== 0 && p.lng !== 0)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [pings]);

    const positions = sortedPings.map(p => [p.lat, p.lng]);
    const center = positions.length > 0 ? positions[Math.floor(positions.length / 2)] : [22.2587, 71.1924]; // Default Gujarat

    if (sortedPings.length === 0) {
        return (
            <div style={{ padding: '24px', textAlign: 'center' }}>
                <button onClick={onBack} className="btn-secondary" style={{ marginBottom: '16px' }}><ArrowLeft size={16} /> Back to Dashboard</button>
                <h3>No GPS data available for {vehicleNo} in this time range.</h3>
            </div>
        );
    }

    const firstPing = sortedPings[0];
    const lastPing = sortedPings[sortedPings.length - 1];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={onBack} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>
                <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-main)' }}>Vehicle Tracking: {vehicleNo}</h3>
            </div>

            <div style={{ display: 'flex', background: 'var(--bg-panel)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', gap: '24px' }}>
                <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Pings</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-main)' }}>{sortedPings.length}</div>
                </div>
                <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Tracking History</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', color: 'var(--text-main)', marginTop: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#2ed573' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#2ed573' }}></div>
                            {formatDate(firstPing.timestamp)}
                        </div>
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#3b82f6' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6' }}></div>
                            {formatDate(lastPing.timestamp)}
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ height: '600px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative', marginTop: '16px' }}>
                <MapContainer center={center} zoom={10} style={{ height: '600px', width: '100%' }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    {/* Draw the connecting line between pings */}
                    <Polyline 
                        positions={positions} 
                        color="#3b82f6" 
                        weight={3} 
                        opacity={0.7} 
                        dashArray="5, 10" 
                    />

                    {/* Plot each ping as a dot */}
                    {sortedPings.map((ping, idx) => {
                        const isStart = idx === 0;
                        const isEnd = idx === sortedPings.length - 1;
                        
                        // Performance optimization: Only render markers for start, end, tampered, or 1 in every 100 points
                        const shouldRenderMarker = isStart || isEnd || ping.isTampered || (idx % 100 === 0 && sortedPings.length > 1000);
                        if (!shouldRenderMarker && sortedPings.length > 500) return null; // Fallback to plot all if < 500 pings

                        let color = '#3b82f6'; // default blue
                        let radius = 4;

                        if (ping.isTampered) {
                            color = '#ff4757'; // Red for tampering/disconnect
                            radius = 7;
                        } else if (isStart) {
                            color = '#2ed573'; // Green for start
                            radius = 8;
                        } else if (isEnd) {
                            color = '#ffa502'; // Orange for current/last position
                            radius = 8;
                        }

                        return (
                            <CircleMarker 
                                key={idx} 
                                center={[ping.lat, ping.lng]} 
                                radius={radius}
                                pathOptions={{ 
                                    color: color, 
                                    fillColor: color, 
                                    fillOpacity: 1,
                                    weight: ping.isTampered || isStart || isEnd ? 2 : 0,
                                    color: '#fff' // white stroke for prominence
                                }}
                            >
                                <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                                    <div style={{ textAlign: 'center', fontFamily: 'Outfit, sans-serif' }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{formatDate(ping.timestamp)}</div>
                                        {ping.isTampered && <div style={{ color: '#ff4757', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}><AlertTriangle size={12}/> GPS Disconnected</div>}
                                    </div>
                                </Tooltip>
                            </CircleMarker>
                        );
                    })}
                </MapContainer>
            </div>
        </div>
    );
};

export default GpsMapPlot;
