import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Treemap
} from 'recharts';
import { 
  TrendingUp, AlertTriangle, CheckCircle, Truck, 
  MapPin, ShieldAlert, Award, Package, FileText, Sparkles, Calendar, Activity
} from 'lucide-react';

const COLORS = ['#10B981', '#0F172A', '#EF4444']; // Complete, Pending, Mismatch
const TREEMAP_COLORS = ['#E85300', '#FF7A33', '#FF9E66', '#FFC299', '#FFE0CC', '#0F172A', '#334155', '#64748B'];

export default function MonthlyOverview({ reportData }) {
  const [activeTab, setActiveTab] = useState('first-mile');

  // Extract raw data based on active tab
  const rawData = useMemo(() => {
    if (activeTab === 'first-mile') {
      return reportData['lifting-report'] || [];
    } else {
      return reportData['last-mile-epod'] || [];
    }
  }, [activeTab, reportData]);

  // Aggregate data for Executive Scorecard & Charts
  const { 
    totalPrimary, 
    totalSecondary,
    epodPending,
    epodComplete,
    mismatchTotal
  } = useMemo(() => {
    let primary = 0;
    let secondary = 0;
    let pending = 0;
    let complete = 0;
    let mismatch = 0;

    rawData.forEach(row => {
      if (row.isSubtotal || row.isGrandTotal) return;

      if (activeTab === 'first-mile') {
        primary += (Number(row.liftedQty) || 0);
        const tps = (Number(row.tpsGenerated) || Number(row.trips) || 1);
        secondary += tps;
        const comp = (Number(row.epodManager) || 0);
        complete += comp;
        // Correctly calculate Pending as TPs - Completed (Godown Manager)
        pending += (tps - comp); 
        mismatch += (Number(row.mismatched) || Number(row.missing) || 0);
      } else {
        primary += (Number(row.deliveryChallan) || 0);
        secondary += (Number(row.trips) || Number(row.totalTrips) || 1);
        complete += (Number(row.epodComplete) || Number(row.epodDriver) || 0);
        pending += (Number(row.epodPending) || Number(row.pendingEpodDriver) || 0);
        mismatch += (Number(row.mismatched) || Number(row.missing) || 0);
      }
    });

    // Ensure pending doesn't go below zero due to anomalies
    if (pending < 0) pending = 0;

    return { 
      totalPrimary: activeTab === 'first-mile' ? primary.toFixed(2) : primary, 
      totalSecondary: secondary,
      epodPending: pending,
      epodComplete: complete,
      mismatchTotal: mismatch
    };
  }, [rawData, activeTab]);

  const epodTotal = epodPending + epodComplete;
  const epodPercent = epodTotal > 0 ? Math.round((epodComplete / epodTotal) * 100) : 0;

  // Prepare District-wise Data for Bar Chart & Map
  const districtData = useMemo(() => {
    const map = new Map();
    rawData.forEach(row => {
      if (row.isSubtotal || row.isGrandTotal || !row.district) return;
      const d = row.district;
      if (!map.has(d)) map.set(d, { name: d, volume: 0, pending: 0, mismatch: 0 });
      const obj = map.get(d);
      
      if (activeTab === 'first-mile') {
        obj.volume += (Number(row.liftedQty) || 0);
        const tps = (Number(row.tpsGenerated) || Number(row.trips) || 0);
        const comp = (Number(row.epodManager) || 0);
        const calcPending = tps - comp;
        obj.pending += calcPending > 0 ? calcPending : 0;
        obj.mismatch += (Number(row.mismatched) || Number(row.missing) || 0);
      } else {
        obj.volume += (Number(row.deliveryChallan) || 0);
        obj.pending += (Number(row.epodPending) || 0);
        obj.mismatch += (Number(row.mismatched) || Number(row.missing) || 0);
      }
    });
    return Array.from(map.values())
      .map(d => ({ ...d, volume: Number(d.volume.toFixed(2)) }))
      .sort((a, b) => b.volume - a.volume);
  }, [rawData, activeTab]);

  // Prepare Daily Trend Data
  const dailyTrendData = useMemo(() => {
    const map = new Map();
    rawData.forEach(row => {
      if (row.isSubtotal || row.isGrandTotal) return;
      
      let dDate = '';
      if (activeTab === 'first-mile') {
         dDate = row.tpDate;
      } else {
         dDate = row.dcCreationDate || row.tpDate || '';
      }
      if (!dDate) return;
      
      const cleanDate = dDate.split(' ')[0];
      if (!map.has(cleanDate)) map.set(cleanDate, { date: cleanDate, volume: 0, pending: 0 });
      const obj = map.get(cleanDate);
      
      if (activeTab === 'first-mile') {
        obj.volume += (Number(row.liftedQty) || 0);
        const tps = (Number(row.tpsGenerated) || Number(row.trips) || 0);
        const comp = (Number(row.epodManager) || 0);
        const calcPending = tps - comp;
        obj.pending += calcPending > 0 ? calcPending : 0;
      } else {
        obj.volume += (Number(row.deliveryChallan) || 0);
        obj.pending += (Number(row.epodPending) || 0);
      }
    });
    return Array.from(map.values())
      .map(d => ({ ...d, volume: Number(d.volume.toFixed(2)) }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [rawData, activeTab]);

  const topDistricts = [...districtData].slice(0, 5);
  const bottomDistricts = [...districtData].sort((a, b) => b.pending - a.pending).slice(0, 5);
  const anomalyDistricts = [...districtData].filter(d => d.mismatch > 0 || d.pending > 0).sort((a, b) => (b.mismatch + b.pending) - (a.mismatch + a.pending)).slice(0, 8);

  const hasData = rawData && rawData.length > 0;

  // Pie Chart Data
  const pieData = [
    { name: 'Completed', value: epodComplete },
    { name: 'Pending', value: epodPending },
    { name: 'Mismatch', value: mismatchTotal }
  ];

  // Treemap Data
  const treeMapData = districtData.slice(0, 15).map(d => ({
    name: d.name,
    size: d.volume
  }));

  // Automated AI Insights Generator
  const generateInsights = () => {
    if (!hasData) return [];
    const insights = [];
    
    // Volume insight
    if (topDistricts.length > 0) {
      const top = topDistricts[0];
      const volType = activeTab === 'first-mile' ? 'Lifting volume' : 'Delivery volume';
      const unit = activeTab === 'first-mile' ? ' MT' : ' Challans';
      insights.push(`🏆 ${top.name} leads with the highest ${volType} (${top.volume.toLocaleString()}${unit}).`);
    }

    // Pending Insight
    if (bottomDistricts.length > 0 && bottomDistricts[0].pending > 0) {
      const worst = bottomDistricts[0];
      insights.push(`⚠️ ${worst.name} requires immediate attention due to a high backlog of ${worst.pending} pending EPODs.`);
    } else {
      insights.push(`✅ Excellent operational efficiency! There are no significant pending EPOD backlogs.`);
    }

    // Compliance Insight
    if (epodPercent === 100) {
      insights.push(`⭐ Perfect 100% EPOD compliance rate achieved across all active trips.`);
    } else if (epodPercent < 80) {
      insights.push(`📉 EPOD compliance is critical at ${epodPercent}%. Regional managers need to expedite approvals.`);
    }

    // Mismatch
    if (mismatchTotal > 0) {
      insights.push(`🚨 ${mismatchTotal} Weight Mismatches detected. Escalation required for physical verification.`);
    }

    return insights;
  };

  const insights = generateInsights();

  // Custom Treemap Content
  const CustomizedContent = (props) => {
    const { root, depth, x, y, width, height, index, payload, colors, rank, name } = props;
    return (
      <g>
        <rect
          x={x} y={y} width={width} height={height}
          style={{
            fill: depth < 2 ? colors[Math.floor((index / root.children.length) * 6)] : '#ffffff00',
            stroke: '#fff', strokeWidth: 2, cursor: 'pointer'
          }}
        />
        {width > 50 && height > 30 ? (
          <text x={x + width / 2} y={y + height / 2 + 5} textAnchor="middle" fill="#fff" fontSize={12} fontWeight="bold">
            {name}
          </text>
        ) : null}
      </g>
    );
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', animation: 'fadeIn 0.5s ease' }}>
      
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--text-main)', margin: 0, letterSpacing: '-0.5px' }}>Executive Analytics</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginTop: '4px' }}>
            AI-driven high-level operational performance insights
          </p>
        </div>
        <div style={{ background: 'linear-gradient(135deg, var(--accent-primary) 0%, #FF8C42 100%)', color: '#fff', padding: '8px 20px', borderRadius: '24px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(232, 83, 0, 0.3)' }}>
          Real-time Dashboard
        </div>
      </div>

      {/* Tabs Toggle */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', background: 'var(--bg-panel)', padding: '6px', borderRadius: '14px', border: '1px solid var(--border-color)', width: 'max-content', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <button
          onClick={() => setActiveTab('first-mile')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '10px',
            border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '1.05rem', transition: 'all 0.3s',
            background: activeTab === 'first-mile' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'first-mile' ? '#fff' : 'var(--text-muted)',
            boxShadow: activeTab === 'first-mile' ? '0 4px 12px rgba(232, 83, 0, 0.2)' : 'none'
          }}
        >
          <Truck size={22} /> First Mile (Lifting)
        </button>
        <button
          onClick={() => setActiveTab('last-mile')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '10px',
            border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '1.05rem', transition: 'all 0.3s',
            background: activeTab === 'last-mile' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'last-mile' ? '#fff' : 'var(--text-muted)',
            boxShadow: activeTab === 'last-mile' ? '0 4px 12px rgba(232, 83, 0, 0.2)' : 'none'
          }}
        >
          <Package size={22} /> Last Mile (Delivery)
        </button>
      </div>

      {!hasData ? (
        <div className="coming-soon-container" style={{ marginTop: '40px' }}>
          <FileText className="coming-soon-icon" size={64} style={{ color: 'var(--border-hover)' }} />
          <h2 className="coming-soon-title">No Data Available</h2>
          <p className="coming-soon-subtitle">
            Please upload a {activeTab === 'first-mile' ? 'Lifting Report' : 'Last Mile EPOD Report'} from the dashboard to view analytics here.
          </p>
        </div>
      ) : (
        <>
          {/* AI Insights Panel */}
          <div style={{ background: 'linear-gradient(to right, #1e293b, #0f172a)', borderRadius: '16px', padding: '24px', marginBottom: '32px', color: '#fff', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#38bdf8' }}>
              <Sparkles size={24} /> Automated Executive Insights
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              {insights.map((insight, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', borderLeft: '3px solid #38bdf8', fontSize: '1.05rem', lineHeight: '1.5' }}>
                  {insight}
                </div>
              ))}
            </div>
          </div>

          {/* KPI Scorecard */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <div className="glass-panel" style={{ padding: '24px', borderLeft: '5px solid var(--accent-primary)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {activeTab === 'first-mile' ? 'Total Lifted' : 'Delivery Challans'}
                  </p>
                  <h3 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '8px 0', color: 'var(--text-main)' }}>
                    {totalPrimary} {activeTab === 'first-mile' && <span style={{fontSize: '1.2rem', color:'var(--text-muted)'}}>MT</span>}
                  </h3>
                </div>
                <div style={{ background: '#FFF1EB', padding: '12px', borderRadius: '16px', color: 'var(--accent-primary)' }}>
                  <TrendingUp size={28} />
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px', borderLeft: '5px solid #10B981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {activeTab === 'first-mile' ? 'Total TPs' : 'Total Trips'}
                  </p>
                  <h3 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '8px 0', color: 'var(--text-main)' }}>{totalSecondary}</h3>
                </div>
                <div style={{ background: '#F1F5F9', padding: '12px', borderRadius: '16px', color: '#475569' }}>
                  <Truck size={28} />
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px', borderLeft: `5px solid ${epodPercent === 100 ? '#10B981' : '#F59E0B'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>EPOD Compliance</p>
                  <h3 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '8px 0', color: 'var(--text-main)' }}>{epodPercent}%</h3>
                </div>
                <div style={{ background: epodPercent === 100 ? '#E6FDF4' : '#FEF3C7', padding: '12px', borderRadius: '16px', color: epodPercent === 100 ? '#10B981' : '#F59E0B' }}>
                  <CheckCircle size={28} />
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                {epodPending} Pending / {epodTotal} Total
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '24px', borderLeft: `5px solid ${mismatchTotal > 0 ? '#EF4444' : '#10B981'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Weight Mismatch</p>
                  <h3 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '8px 0', color: 'var(--text-main)' }}>{mismatchTotal}</h3>
                </div>
                <div style={{ background: mismatchTotal > 0 ? '#FEE2E2' : '#E6FDF4', padding: '12px', borderRadius: '16px', color: mismatchTotal > 0 ? '#EF4444' : '#10B981' }}>
                  <ShieldAlert size={28} />
                </div>
              </div>
            </div>
          </div>

          {/* NEW SECTION: Daily Trend (Area Chart) & Exception Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr', gap: '24px', marginBottom: '24px' }}>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={24} color="var(--accent-primary)" /> 
                Daily {activeTab === 'first-mile' ? 'Lifting' : 'Delivery'} Trend
              </h3>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 12}} minTickGap={20} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)'}} />
                    <RechartsTooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)'}} />
                    <Area type="monotone" dataKey="volume" name={activeTab === 'first-mile' ? 'Lifted (MT)' : 'Challans'} stroke="var(--accent-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorVol)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px', background: 'linear-gradient(to bottom, #ffffff, #fff5f5)' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: '#EF4444' }}>
                <Activity size={24} /> 
                Exceptions Breakdown
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>Districts with the highest combined Pending & Mismatches.</p>
              <div style={{ height: '260px', width: '100%' }}>
                {anomalyDistricts.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={anomalyDistricts} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)'}} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: 'var(--text-main)', fontWeight: 600, fontSize: 12}} width={90} />
                      <RechartsTooltip cursor={{fill: 'rgba(239,68,68,0.05)'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                      <Legend iconType="circle" />
                      <Bar dataKey="pending" name="Pending EPOD" stackId="a" fill="#0F172A" radius={[0, 0, 0, 0]} barSize={20} />
                      <Bar dataKey="mismatch" name="Weight Mismatch" stackId="a" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    No exceptions detected!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Charts & Treemap Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Package size={24} color="var(--accent-primary)" /> 
                Volume Distribution Breakdown
              </h3>
              <div style={{ height: '350px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <Treemap
                    width={400}
                    height={200}
                    data={treeMapData}
                    dataKey="size"
                    aspectRatio={4 / 3}
                    stroke="#fff"
                    fill="var(--accent-primary)"
                    content={<CustomizedContent colors={TREEMAP_COLORS} />}
                  >
                    <RechartsTooltip formatter={(value) => [Number(value).toLocaleString(), 'Volume']} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                  </Treemap>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle size={24} color="#10B981" /> 
                EPOD Compliance Breakdown
              </h3>
              <div style={{ height: '350px', width: '100%', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={100}
                      outerRadius={140}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)'}} />
                    <Legend iconType="circle" verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
                
                <div style={{ position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-main)' }}>{epodPercent}%</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '600' }}>Compliance</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Award size={24} color="var(--accent-primary)" /> 
                  Comprehensive District Leaderboard
                </h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: '#F1F5F9', padding: '4px 12px', borderRadius: '12px' }}>
                  Showing all {districtData.length} districts
                </span>
              </div>
              
              <div style={{ flex: 1, background: '#F8F9FA', borderRadius: '16px', overflow: 'hidden', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', height: '400px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '60px 2fr 1.5fr 1fr 1.5fr', padding: '16px', background: '#F1F5F9', borderBottom: '2px solid #E2E8F0', fontWeight: '700', fontSize: '0.9rem', color: '#475569' }}>
                  <div style={{ textAlign: 'center' }}>Rank</div>
                  <div>District</div>
                  <div style={{ textAlign: 'right' }}>{activeTab === 'first-mile' ? 'Volume (MT)' : 'Challans'}</div>
                  <div style={{ textAlign: 'right' }}>Pending</div>
                  <div style={{ textAlign: 'center' }}>Compliance</div>
                </div>
                
                <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }} className="custom-scrollbar">
                  {districtData.length > 0 ? districtData.map((d, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '60px 2fr 1.5fr 1fr 1.5fr', padding: '12px 16px', borderBottom: '1px solid #F1F5F9', alignItems: 'center', transition: 'background 0.2s' }} className="hover-bg-light">
                      <div style={{ textAlign: 'center', fontWeight: '800', color: idx < 3 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                        #{idx + 1}
                      </div>
                      <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{d.name}</div>
                      <div style={{ textAlign: 'right', fontWeight: '700' }}>{d.volume.toLocaleString()}</div>
                      <div style={{ textAlign: 'right', fontWeight: '700', color: d.pending > 0 ? '#EF4444' : '#10B981' }}>
                        {d.pending > 0 ? d.pending : '0'}
                      </div>
                      <div style={{ paddingLeft: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ 
                              height: '100%', 
                              width: d.pending === 0 ? '100%' : (d.pending > 50 ? '20%' : '60%'), 
                              background: d.pending === 0 ? '#10B981' : (d.pending > 50 ? '#EF4444' : '#F59E0B'),
                              borderRadius: '3px'
                            }}></div>
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: d.pending === 0 ? '#10B981' : (d.pending > 50 ? '#EF4444' : '#F59E0B') }}>
                            {d.pending === 0 ? 'Good' : (d.pending > 50 ? 'Poor' : 'Avg')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No district data available.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Top Defaulters List */}
            <div className="glass-panel" style={{ padding: '24px', background: 'linear-gradient(to bottom, #ffffff, #fff5f5)' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '20px', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={24} /> 
                Action Required (Pending)
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '20px' }}>
                Districts with the highest number of pending EPODs requiring immediate follow-up.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {bottomDistricts.length > 0 && bottomDistricts[0].pending > 0 ? bottomDistricts.map((d, i) => d.pending > 0 && (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#fff', borderRadius: '12px', border: '1px solid #FEE2E2', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.05)', transition: 'transform 0.2s', cursor: 'pointer' }} className="hover-lift">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FEE2E2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1rem' }}>
                        {i+1}
                      </div>
                      <span style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-main)' }}>{d.name}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#EF4444', fontWeight: '800', fontSize: '1.2rem' }}>{d.pending}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600' }}>Pending</div>
                    </div>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', background: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
                    <CheckCircle size={48} color="#10B981" style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-main)' }}>No Action Required</h4>
                    <p style={{ margin: 0 }}>All EPODs are successfully completed. Great job! 🎉</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
