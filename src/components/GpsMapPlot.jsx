import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup, Tooltip, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import { ArrowLeft, Clock, AlertTriangle, Navigation } from 'lucide-react';

const originIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="#2ed573" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 3px 3px rgba(0,0,0,0.4));"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3" fill="white" stroke="none"></circle></svg>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
});

const destIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="#ff4757" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 3px 3px rgba(0,0,0,0.4));"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3" fill="white" stroke="none"></circle></svg>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
});

const truckIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: #3b82f6; color: white; border-radius: 4px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.4);"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-9h-4V5h-4v12h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
});

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

const extractDetails = (ping) => {
    let speed = '0 Km/hr';
    let vehicleStatus = 'unknown';
    let temp = 'N/A';
    let landmark = `Lat: ${ping.lat.toFixed(4)}, Lng: ${ping.lng.toFixed(4)}`;

    if (ping.extraData) {
        try {
            const parsed = typeof ping.extraData === 'string' ? JSON.parse(ping.extraData) : ping.extraData;
            if (parsed.speed !== undefined) speed = `${parsed.speed} Km/hr`;
            if (parsed.vehicle_status) vehicleStatus = parsed.vehicle_status;
            else if (parsed.engine_status) vehicleStatus = parsed.engine_status;
            if (parsed.temperature !== undefined) temp = `${parsed.temperature} °C`;
            if (parsed.address) landmark = parsed.address;
            else if (parsed.landmark) landmark = parsed.landmark;
        } catch (e) {
            // silent fallback
        }
    }
    return { speed, vehicleStatus, temp, landmark };
};

const GpsMapPlot = ({ vehicleNo, pings, onBack }) => {
    const [localStartDate, setLocalStartDate] = useState('');
    const [localEndDate, setLocalEndDate] = useState('');
    const [tempLocalStartDate, setTempLocalStartDate] = useState('');
    const [tempLocalEndDate, setTempLocalEndDate] = useState('');

    // Ensure pings are sorted chronologically and filtered by local date selection
    const sortedPings = useMemo(() => {
        const start = localStartDate ? new Date(localStartDate).getTime() : 0;
        const end = localEndDate ? new Date(localEndDate).getTime() : Infinity;

        return [...pings]
            .filter(p => p.lat != null && p.lng != null && !isNaN(p.lat) && !isNaN(p.lng) && p.lat !== 0 && p.lng !== 0)
            .filter(p => {
                const time = new Date(p.timestamp).getTime();
                return time >= start && time <= end;
            })
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [pings, localStartDate, localEndDate]);

    const [playbackIndex, setPlaybackIndex] = useState(0);

    // Reset playback index if vehicle or filter changes
    useEffect(() => {
        setPlaybackIndex(sortedPings.length > 0 ? sortedPings.length - 1 : 0);
    }, [sortedPings.length]);

    const validPlaybackIndex = sortedPings.length > 0 ? Math.min(Math.max(0, playbackIndex), sortedPings.length - 1) : 0;

    const displayedPings = sortedPings.slice(0, validPlaybackIndex + 1);
    const positions = displayedPings.map(p => [p.lat, p.lng]);
    const center = sortedPings.length > 0 ? [sortedPings[Math.floor(sortedPings.length / 2)].lat, sortedPings[Math.floor(sortedPings.length / 2)].lng] : [22.2587, 71.1924];

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

            <div style={{ display: 'flex', background: 'var(--bg-panel)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Pings</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-main)' }}>{sortedPings.length}</div>
                </div>
                <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Tracking History</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', color: 'var(--text-main)', marginTop: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#2ed573' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#2ed573' }}></div>
                            {firstPing ? formatDate(firstPing.timestamp) : '--'}
                        </div>
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#3b82f6' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6' }}></div>
                            {lastPing ? formatDate(lastPing.timestamp) : '--'}
                        </div>
                    </div>
                </div>
                
                <div style={{ flex: '1', display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.85rem', color: '#4b5563', fontWeight: '500' }}>Start Date & Time</label>
                        <input 
                            type="datetime-local" 
                            value={tempLocalStartDate} 
                            onChange={(e) => setTempLocalStartDate(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', color: '#1f2937', outline: 'none', fontSize: '0.9rem', width: '220px', fontFamily: 'monospace' }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.85rem', color: '#4b5563', fontWeight: '500' }}>End Date & Time</label>
                        <input 
                            type="datetime-local" 
                            value={tempLocalEndDate} 
                            onChange={(e) => setTempLocalEndDate(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', color: '#1f2937', outline: 'none', fontSize: '0.9rem', width: '220px', fontFamily: 'monospace' }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            className="btn-primary"
                            onClick={() => { setLocalStartDate(tempLocalStartDate); setLocalEndDate(tempLocalEndDate); }}
                            style={{ padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold' }}
                        >
                            Filter Trip
                        </button>
                        <button 
                            className="btn-secondary"
                            onClick={() => { setTempLocalStartDate(''); setTempLocalEndDate(''); setLocalStartDate(''); setLocalEndDate(''); }}
                            style={{ padding: '8px 16px', borderRadius: '6px', background: '#fff', border: '1px solid #d1d5db', color: '#374151', fontWeight: '500' }}
                        >
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginTop: '16px', height: '600px' }}>
                {/* Map Area */}
                <div style={{ flex: '1', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
                    <MapContainer center={center} zoom={10} style={{ height: '100%', width: '100%' }}>
                        <LayersControl position="topright">
                            <LayersControl.BaseLayer checked name="OpenStreetMap.Mapnik">
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                            </LayersControl.BaseLayer>
                            <LayersControl.BaseLayer name="Google Maps Roads">
                                <TileLayer
                                    attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
                                    url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                                />
                            </LayersControl.BaseLayer>
                            <LayersControl.BaseLayer name="Google Maps Terrain">
                                <TileLayer
                                    attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
                                    url="https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}"
                                />
                            </LayersControl.BaseLayer>
                            <LayersControl.BaseLayer name="Google Maps Satellite">
                                <TileLayer
                                    attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
                                    url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                                />
                            </LayersControl.BaseLayer>
                            <LayersControl.BaseLayer name="Google Maps Hybrid">
                                <TileLayer
                                    attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
                                    url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                                />
                            </LayersControl.BaseLayer>
                        </LayersControl>
                        
                        {/* Draw the connecting line for completed path */}
                        <Polyline 
                            positions={sortedPings.slice(0, validPlaybackIndex + 1).map(p => [p.lat, p.lng])} 
                            color="#f97316" // Orange like the screenshot
                            weight={3} 
                            opacity={0.8} 
                            dashArray="5, 10" 
                        />
                        {/* Draw the remaining path in a lighter color */}
                        {validPlaybackIndex < sortedPings.length - 1 && (
                            <Polyline 
                                positions={sortedPings.slice(validPlaybackIndex).map(p => [p.lat, p.lng])} 
                                color="#94a3b8" 
                                weight={3} 
                                opacity={0.4} 
                                dashArray="5, 10" 
                            />
                        )}

                        {/* Always draw fixed Origin and Destination */}
                        {sortedPings.length > 0 && (
                            <>
                                <Marker position={[sortedPings[0].lat, sortedPings[0].lng]} icon={originIcon}>
                                    <Tooltip direction="top" offset={[0, -15]} opacity={1} permanent>
                                        <div style={{ textAlign: 'center', fontFamily: 'Outfit, sans-serif' }}>
                                            <div style={{ fontWeight: 'bold', color: '#2ed573', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px', fontSize: '0.75rem' }}>Origin</div>
                                            <div style={{ fontWeight: '500', fontSize: '0.85rem' }}>{formatDate(sortedPings[0].timestamp)}</div>
                                        </div>
                                    </Tooltip>
                                </Marker>
                                {sortedPings.length > 1 && (
                                    <Marker position={[sortedPings[sortedPings.length - 1].lat, sortedPings[sortedPings.length - 1].lng]} icon={destIcon}>
                                        <Tooltip direction="top" offset={[0, -15]} opacity={1} permanent>
                                            <div style={{ textAlign: 'center', fontFamily: 'Outfit, sans-serif' }}>
                                                <div style={{ fontWeight: 'bold', color: '#ff4757', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px', fontSize: '0.75rem' }}>Destination</div>
                                                <div style={{ fontWeight: '500', fontSize: '0.85rem' }}>{formatDate(sortedPings[sortedPings.length - 1].timestamp)}</div>
                                            </div>
                                        </Tooltip>
                                    </Marker>
                                )}
                            </>
                        )}

                        {/* Moving Truck Icon */}
                        {validPlaybackIndex > 0 && validPlaybackIndex < sortedPings.length - 1 && (
                            <Marker position={[sortedPings[validPlaybackIndex].lat, sortedPings[validPlaybackIndex].lng]} icon={truckIcon}>
                                <Tooltip direction="top" offset={[0, -15]} opacity={1} permanent>
                                    <div style={{ textAlign: 'center', fontFamily: 'Outfit, sans-serif' }}>
                                        <div style={{ fontWeight: 'bold', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px', fontSize: '0.75rem' }}>Current</div>
                                        <div style={{ fontWeight: '500', fontSize: '0.85rem' }}>{formatDate(sortedPings[validPlaybackIndex].timestamp)}</div>
                                    </div>
                                </Tooltip>
                            </Marker>
                        )}

                        {/* Plot each ping as a dot */}
                        {sortedPings.map((ping, idx) => {
                            // Hide the first and last dots because they have the big markers
                            if (idx === 0 || idx === sortedPings.length - 1) return null;
                            
                            // To prevent lag, only render dots up to the playbackIndex, and skip some if there are too many
                            if (idx > validPlaybackIndex) return null;

                            const shouldRenderMarker = ping.isTampered || (idx % 20 === 0 && sortedPings.length > 500);
                            if (!shouldRenderMarker && sortedPings.length > 300) return null; 

                            let color = '#f97316'; // orange to match the line
                            let radius = 4;

                            if (ping.isTampered) {
                                color = '#ff4757'; 
                                radius = 7;
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
                                        weight: ping.isTampered ? 2 : 0,
                                        color: '#fff' 
                                    }}
                                >
                                    <Popup className="custom-popup">
                                        <div style={{ fontFamily: 'Outfit, sans-serif', padding: '4px', minWidth: '200px' }}>
                                            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Tracking Details</h4>
                                            
                                            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px', fontSize: '0.8rem', marginBottom: '4px' }}>
                                                <span style={{ fontWeight: '600' }}>Landmark:</span> <span>{extractDetails(ping).landmark}</span>
                                                <span style={{ fontWeight: '600' }}>Speed:</span> <span>{extractDetails(ping).speed}</span>
                                                <span style={{ fontWeight: '600' }}>Vehicle Status:</span> <span style={{textTransform: 'capitalize'}}>{extractDetails(ping).vehicleStatus}</span>
                                                <span style={{ fontWeight: '600' }}>Tampering:</span> <span style={{ color: ping.isTampered ? '#ff4757' : 'inherit', fontWeight: ping.isTampered ? 'bold' : 'normal' }}>{ping.isTampered ? 'true' : 'false'}</span>
                                                <span style={{ fontWeight: '600' }}>Temperature:</span> <span>{extractDetails(ping).temp}</span>
                                                <span style={{ fontWeight: '600' }}>Time:</span> <span>{formatDate(ping.timestamp)}</span>
                                            </div>
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            );
                        })}
                    </MapContainer>
                </div>

                {/* Timeline Sidebar Area */}
                <div style={{ width: '450px', background: 'var(--bg-panel)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    
                    {/* Time Range Slider */}
                    <div style={{ padding: '20px 24px', background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                            <div>{formatDate(firstPing.timestamp)}</div>
                            <div>{formatDate(lastPing.timestamp)}</div>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max={sortedPings.length - 1} 
                            value={playbackIndex} 
                            onChange={(e) => setPlaybackIndex(parseInt(e.target.value))}
                            style={{ width: '100%', cursor: 'pointer', accentColor: '#3b82f6' }}
                        />
                        <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: '#3b82f6' }}>
                            Scrubbing: {formatDate(sortedPings[validPlaybackIndex].timestamp)}
                        </div>
                    </div>

                    <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={18} style={{ color: '#3b82f6' }}/> Tracking History
                        </div>
                    </div>
                    
                    {/* Header Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px', gap: '12px', padding: '12px 16px 8px 36px', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                        <div>LandMark</div>
                        <div>Source</div>
                        <div>Time</div>
                    </div>

                    <div style={{ flex: '1', overflowY: 'auto', padding: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {displayedPings.map((ping, idx) => {
                                const isStart = idx === 0;
                                const isEnd = idx === displayedPings.length - 1;
                                
                                // To prevent DOM lag on massive trips, filter the timeline too
                                const shouldRenderItem = isStart || isEnd || ping.isTampered || (idx % 20 === 0 && displayedPings.length > 500);
                                if (!shouldRenderItem && displayedPings.length > 300) return null;

                                let dotColor = '#ccc';
                                if (isStart) dotColor = '#2ed573';
                                else if (isEnd) dotColor = '#3b82f6';
                                else if (ping.isTampered) dotColor = '#ff4757';

                                const details = extractDetails(ping);
                                const timeStr = formatDate(ping.timestamp);
                                const [timePart, datePart] = timeStr.includes(' ') ? [timeStr.split(' ').slice(1).join(' '), timeStr.split(' ')[0]] : [timeStr, ''];

                                return (
                                    <div key={idx} style={{ display: 'flex', gap: '12px', position: 'relative', paddingBottom: isEnd ? '0' : '20px' }}>
                                        {/* Vertical line connector */}
                                        {!isEnd && (
                                            <div style={{ position: 'absolute', left: '6px', top: '20px', bottom: '0', width: '2px', background: '#e2e8f0', zIndex: 1 }}></div>
                                        )}
                                        {/* Dot */}
                                        <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'white', border: `3px solid ${dotColor}`, marginTop: '2px', position: 'relative', zIndex: 2, flexShrink: 0 }}></div>
                                        
                                        {/* Content Grid */}
                                        <div style={{ flex: '1', display: 'grid', gridTemplateColumns: '1fr 80px 100px', gap: '12px', alignItems: 'start', fontSize: '0.8rem' }}>
                                            <div style={{ color: 'var(--text-main)', lineHeight: '1.4' }}>
                                                {details.landmark}
                                                {ping.isTampered && (
                                                    <div style={{ color: '#ff4757', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                                        <AlertTriangle size={12}/> GPS Disconnected / Tampered
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ color: 'var(--text-muted)' }}>Third Party</div>
                                            <div style={{ color: 'var(--text-main)', textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: '600' }}>{timePart}</span>
                                                <span style={{ color: 'var(--text-muted)' }}>{datePart}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GpsMapPlot;
