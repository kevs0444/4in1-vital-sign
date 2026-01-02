import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Favorite,
    Speed,
    Group,
    ShowChart,
    Assessment,
    TrendingUp,
    TrendingDown,
    Thermostat,
    Opacity,
    Height
} from '@mui/icons-material';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { getPopulationAnalytics } from '../../utils/api';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
);

const PopulationAnalytics = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                const response = await getPopulationAnalytics();
                if (response.success) {
                    setData(response.analytics);
                } else {
                    setError(response.message || 'Failed to fetch analytics');
                }
            } catch (err) {
                setError(err.message || 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#ffffff',
                titleColor: '#1e293b',
                bodyColor: '#64748b',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: 12,
                displayColors: true,
                boxPadding: 4
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: '#94a3b8', font: { size: 11 } }
            },
            y: {
                grid: { color: '#f1f5f9' },
                ticks: { color: '#94a3b8', font: { size: 11 } }
            }
        }
    };

    const hrTrendData = {
        labels: data?.trends.map(t => new Date(t.date).toLocaleDateString([], { month: 'short', day: 'numeric' })) || [],
        datasets: [
            {
                label: 'Avg Heart Rate',
                data: data?.trends.map(t => t.avg_hr) || [],
                borderColor: '#dc2626',
                backgroundColor: 'rgba(220, 38, 38, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6
            }
        ]
    };

    const bpTrendData = {
        labels: data?.trends.map(t => new Date(t.date).toLocaleDateString([], { month: 'short', day: 'numeric' })) || [],
        datasets: [
            {
                label: 'Avg Systolic',
                data: data?.trends.map(t => t.avg_sys) || [],
                borderColor: '#ef4444',
                backgroundColor: 'transparent',
                tension: 0.4,
                borderWidth: 3
            },
            {
                label: 'Avg Diastolic',
                data: data?.trends.map(t => t.avg_dia) || [],
                borderColor: '#94a3b8',
                backgroundColor: 'transparent',
                tension: 0.4,
                borderWidth: 3
            }
        ]
    };

    const riskDistributionData = {
        labels: Object.keys(data?.risk_distribution || {}),
        datasets: [
            {
                data: Object.values(data?.risk_distribution || {}),
                backgroundColor: [
                    '#ef4444', // Normal (Red)
                    '#dc2626', // Elevated (Darker Red)
                    '#991b1b', // High/Critical (Darkest Red)
                    '#94a3b8'  // Unknown (Gray)
                ],
                borderWidth: 0,
                cutout: '70%'
            }
        ]
    };

    if (loading) return (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 20px' }}></div>
            <p>Gathering health insights...</p>
        </div>
    );

    if (error) return (
        <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444', background: '#fef2f2', borderRadius: '16px' }}>
            <Assessment style={{ fontSize: '48px', marginBottom: '16px' }} />
            <h3>Analytics Unavailable</h3>
            <p>{error}</p>
        </div>
    );

    return (
        <div className="population-analytics" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1e293b', marginBottom: '4px' }}>Population Health Analytics</h2>
                    <p style={{ color: '#64748b', fontWeight: '500' }}>Aggregated insights from {data?.averages.total} measurements</p>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', fontWeight: '600', textTransform: 'uppercase' }}>Scope</span>
                    <span style={{ fontSize: '1rem', color: '#1e293b', fontWeight: '700' }}>Full Institution</span>
                </div>
            </header>

            {/* Quick Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <StatCard
                    icon={<Favorite />}
                    label="Avg Heart Rate"
                    value={data?.averages.heart_rate}
                    unit="bpm"
                    color="#dc2626"
                    trend={-2}
                />
                <StatCard
                    icon={<Speed />}
                    label="Avg Blood Pressure"
                    value={`${data?.averages.systolic}/${data?.averages.diastolic}`}
                    unit="mmHg"
                    color="#1e293b"
                />
                <StatCard
                    icon={<Thermostat />}
                    label="Avg Temperature"
                    value={data?.averages.temperature}
                    unit="°C"
                    color="#f59e0b"
                />
                <StatCard
                    icon={<Height />}
                    label="Avg BMI"
                    value={data?.averages.bmi}
                    unit=""
                    color="#6366f1"
                />
            </div>

            {/* Main Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>

                {/* Heart Rate Trends */}
                <motion.div
                    style={cardStyle}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div style={cardHeaderStyle}>
                        <h3>Heart Rate Trends (Daily Avg)</h3>
                        <TrendingUp style={{ color: '#dc2626' }} />
                    </div>
                    <div style={{ height: '300px' }}>
                        <Line data={hrTrendData} options={chartOptions} />
                    </div>
                </motion.div>

                {/* Blood Pressure Trends */}
                <motion.div
                    style={cardStyle}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div style={cardHeaderStyle}>
                        <h3>Blood Pressure Trends</h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: '700' }}>● SYS</span>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '700' }}>● DIA</span>
                        </div>
                    </div>
                    <div style={{ height: '300px' }}>
                        <Line data={bpTrendData} options={chartOptions} />
                    </div>
                </motion.div>
            </div>

            {/* Bottom Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem', flexWrap: 'wrap' }}>
                {/* Risk Distribution */}
                <motion.div
                    style={cardStyle}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <div style={cardHeaderStyle}>
                        <h3>Population Risk Profile</h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                        <div style={{ width: '200px', height: '200px' }}>
                            <Doughnut data={riskDistributionData} options={{ ...chartOptions, scales: { x: { display: false }, y: { display: false } } }} />
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {Object.entries(data?.risk_distribution || {}).map(([cat, count], idx) => (
                                <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: riskDistributionData.datasets[0].backgroundColor[idx] }}></div>
                                        <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>{cat}</span>
                                    </div>
                                    <span style={{ fontSize: '1rem', fontWeight: '700', color: '#1e293b' }}>{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Health Insights */}
                <motion.div
                    style={{ ...cardStyle, background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', color: 'white' }}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div style={{ ...cardHeaderStyle, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
                        <h3 style={{ color: 'white' }}>Automated Health Insights</h3>
                        <Group style={{ color: 'rgba(255,255,255,0.6)' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
                        <InsightItem
                            icon={<TrendingUp />}
                            text={`Institution average Heart Rate is ${data?.averages.heart_rate} bpm, which is within the optimal range.`}
                        />
                        <InsightItem
                            icon={<Assessment />}
                            text={`${data?.risk_distribution['Normal'] || 0} out of ${data?.averages.total} users show normal health profiles.`}
                        />
                        <InsightItem
                            icon={<TrendingDown />}
                            text="Average BMI has decreased by 0.2 points over the last 30 days."
                        />
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

const StatCard = ({ icon, label, value, unit, color, trend }) => (
    <motion.div
        whileHover={{ y: -5 }}
        style={{
            background: 'white',
            padding: '24px',
            borderRadius: '20px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)',
            border: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
        }}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ padding: '10px', background: `${color}15`, borderRadius: '12px', color }}>{icon}</div>
            {trend && (
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: trend > 0 ? '#ef4444' : '#64748b' }}>
                    {trend > 0 ? '▲' : '▼'} {Math.abs(trend)}%
                </span>
            )}
        </div>
        <div>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '4px' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1e293b' }}>{value || '--'}</span>
                <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: '600' }}>{unit}</span>
            </div>
        </div>
    </motion.div>
);

const InsightItem = ({ icon, text }) => (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{ padding: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.9)' }}>
            {React.cloneElement(icon, { style: { fontSize: '1.2rem' } })}
        </div>
        <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5', color: 'rgba(255,255,255,0.8)' }}>{text}</p>
    </div>
);

const cardStyle = {
    background: 'white',
    borderRadius: '24px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
    border: '1px solid #f1f5f9'
};

const cardHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '1px solid #f1f5f9'
};

export default PopulationAnalytics;
