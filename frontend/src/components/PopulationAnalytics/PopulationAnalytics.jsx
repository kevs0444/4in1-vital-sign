import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Favorite,
    Speed,
    Group,
    TrendingUp,
    TrendingDown,
    Thermostat,
    Height,
    Assessment,
    Timeline,
    InfoOutlined
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
import { Line, Doughnut } from 'react-chartjs-2';
import { getPopulationAnalytics } from '../../utils/api';
import './PopulationAnalytics.css';

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
    const [selectedRole, setSelectedRole] = useState('Full Institution');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                const roleParam = selectedRole === 'Full Institution' ? 'all' : selectedRole;
                const response = await getPopulationAnalytics(roleParam);
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
    }, [selectedRole]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#1e293b',
                bodyColor: '#64748b',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: 14,
                displayColors: true,
                boxPadding: 6,
                cornerRadius: 12,
                titleFont: { family: "'Inter', sans-serif", size: 13, weight: 700 },
                bodyFont: { family: "'Inter', sans-serif", size: 12 }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: '#94a3b8', font: { size: 11, family: "'Inter', sans-serif" } }
            },
            y: {
                grid: { color: '#f1f5f9', borderDash: [4, 4] },
                ticks: { color: '#94a3b8', font: { size: 11, family: "'Inter', sans-serif" } },
                border: { display: false }
            }
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
    };

    const hrTrendData = {
        labels: data?.trends.map(t => new Date(t.date).toLocaleDateString([], { month: 'short', day: 'numeric' })) || [],
        datasets: [
            {
                label: 'Avg Heart Rate',
                data: data?.trends.map(t => t.avg_hr) || [],
                borderColor: '#ef4444',
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                    gradient.addColorStop(0, 'rgba(239, 68, 68, 0.2)');
                    gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
                    return gradient;
                },
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointBackgroundColor: '#ef4444',
                pointBorderColor: '#fff',
                pointBorderWidth: 3
            }
        ]
    };

    const bpTrendData = {
        labels: data?.trends.map(t => new Date(t.date).toLocaleDateString([], { month: 'short', day: 'numeric' })) || [],
        datasets: [
            {
                label: 'Avg Systolic',
                data: data?.trends.map(t => t.avg_sys) || [],
                borderColor: '#0f172a',
                backgroundColor: 'transparent',
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 0,
                pointHoverRadius: 6
            },
            {
                label: 'Avg Diastolic',
                data: data?.trends.map(t => t.avg_dia) || [],
                borderColor: '#94a3b8',
                backgroundColor: 'transparent',
                tension: 0.4,
                borderWidth: 3,
                borderDash: [5, 5],
                pointRadius: 0,
                pointHoverRadius: 6
            }
        ]
    };

    const riskColors = {
        'Normal': '#10b981',
        'Low Risk': '#10b981',
        'Moderate Risk': '#f59e0b',
        'High Risk': '#ef4444',
        'Critical Risk': '#dc2626',
        'Unknown': '#cbd5e1'
    };

    const riskDistributionData = {
        labels: Object.keys(data?.risk_distribution || {}),
        datasets: [
            {
                data: Object.values(data?.risk_distribution || {}),
                backgroundColor: Object.keys(data?.risk_distribution || {}).map(k => riskColors[k] || '#cbd5e1'),
                borderWidth: 0,
                cutout: '75%',
                hoverOffset: 10
            }
        ]
    };

    if (loading) return (
        <div className="pop-loading">
            <div className="loading-spinner" style={{ width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: '#ef4444' }}></div>
            <p style={{ marginTop: '20px', fontWeight: '500' }}>Analyzing population data...</p>
        </div>
    );

    if (error) return (
        <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444', background: '#fef2f2', borderRadius: '24px', border: '1px solid #fee2e2' }}>
            <Assessment style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.8 }} />
            <h3 style={{ margin: '0 0 8px 0' }}>Analytics Unavailable</h3>
            <p style={{ margin: 0, opacity: 0.8 }}>{error}</p>
        </div>
    );

    const roles = ['Full Institution', 'Student', 'Employee', 'Doctor', 'Nurse'];

    // Use portal for dropdown if needed, but relative works well inside this header usually

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                type: "spring",
                stiffness: 100,
                damping: 10
            }
        }
    };

    return (
        <motion.div
            className="pop-analytics-container"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header Section */}
            <header className="pop-header">
                <motion.div variants={itemVariants}>
                    <h2>Population Health Analytics</h2>
                    <p>Insights derived from {data?.averages.total} measurement records</p>
                </motion.div>

                <motion.div variants={itemVariants} style={{ position: 'relative' }} className="pop-scope-wrapper">
                    <button
                        className="pop-scope-btn"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                        <div>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>Analyzing Scope</span>
                            <span style={{ fontSize: '1rem', color: '#1e293b', fontWeight: '700' }}>{selectedRole}</span>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                    </button>

                    {isDropdownOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            style={{
                                position: 'absolute',
                                top: '110%',
                                right: 0,
                                background: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '16px',
                                boxShadow: '0 20px 40px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                                width: '240px',
                                padding: '8px',
                                zIndex: 100,
                                transformOrigin: 'top right'
                            }}
                        >
                            {roles.map(role => (
                                <div
                                    key={role}
                                    onClick={() => {
                                        setSelectedRole(role);
                                        setIsDropdownOpen(false);
                                    }}
                                    style={{
                                        padding: '12px 16px',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        background: selectedRole === role ? '#fef2f2' : 'transparent',
                                        color: selectedRole === role ? '#dc2626' : '#475569',
                                        fontWeight: selectedRole === role ? '700' : '500',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (selectedRole !== role) e.currentTarget.style.background = '#f8fafc';
                                    }}
                                    onMouseLeave={(e) => {
                                        if (selectedRole !== role) e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    {role}
                                    {selectedRole === role && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626' }} />}
                                </div>
                            ))}
                        </motion.div>
                    )}
                </motion.div>
            </header>

            {/* Quick Stats Grid */}
            <motion.div className="pop-stats-grid" variants={containerVariants}>
                <StatCard
                    icon={<Favorite />}
                    label="Avg Heart Rate"
                    value={data?.averages.heart_rate}
                    unit="bpm"
                    color="#ef4444"
                    bgColor="#fef2f2"
                />
                <StatCard
                    icon={<Speed />}
                    label="Avg BP"
                    value={`${data?.averages.systolic}/${data?.averages.diastolic}`}
                    unit="mmHg"
                    color="#0f172a"
                    bgColor="#f8fafc"
                />
                <StatCard
                    icon={<Thermostat />}
                    label="Avg Temp"
                    value={data?.averages.temperature}
                    unit="°C"
                    color="#f59e0b"
                    bgColor="#fffbeb"
                />
                <StatCard
                    icon={<Height />}
                    label="Avg BMI"
                    value={data?.averages.bmi}
                    color="#6366f1"
                    bgColor="#eef2ff"
                />
            </motion.div>

            {/* Main Content Grid */}
            <motion.div className="pop-main-grid" variants={containerVariants}>
                {/* Left Column: Charts */}
                <div className="pop-charts-column">
                    {/* Heart Rate Chart */}
                    <motion.div
                        className="pop-chart-card"
                        variants={itemVariants}
                    >
                        <div className="pop-card-header">
                            <h3><Timeline style={{ color: '#ef4444' }} /> Heart Rate Trends</h3>
                            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#94a3b8', background: '#f8fafc', padding: '4px 12px', borderRadius: '20px' }}>
                                Last 30 Days
                            </div>
                        </div>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <Line data={hrTrendData} options={chartOptions} />
                        </div>
                    </motion.div>

                    {/* Blood Pressure Chart */}
                    <motion.div
                        className="pop-chart-card"
                        variants={itemVariants}
                    >
                        <div className="pop-card-header">
                            <h3><Assessment style={{ color: '#0f172a' }} /> Blood Pressure Trends</h3>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: '600', color: '#0f172a' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0f172a' }}></div> Systolic
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: '600', color: '#94a3b8' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94a3b8' }}></div> Diastolic
                                </div>
                            </div>
                        </div>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <Line data={bpTrendData} options={chartOptions} />
                        </div>
                    </motion.div>
                </div>

                {/* Right Column: Risk & Insights */}
                <div className="pop-side-column">

                    {/* Risk Distribution Card */}
                    <motion.div
                        className="pop-risk-card"
                        variants={itemVariants}
                    >
                        <div className="pop-card-header">
                            <h3>Health Risk Profile</h3>
                        </div>

                        <div style={{ position: 'relative', height: '200px', width: '200px', margin: '0 auto' }}>
                            <Doughnut data={riskDistributionData} options={{ maintainAspectRatio: false, cutout: '75%', plugins: { legend: { display: false }, tooltip: chartOptions.plugins.tooltip } }} />
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1e293b', lineHeight: 1 }}>
                                    <CountUp end={String(data?.averages.total || 0)} />
                                </div>
                                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#94a3b8' }}>TOTAL</div>
                            </div>
                        </div>

                        <div className="pop-risk-legend">
                            {Object.entries(data?.risk_distribution || {}).map(([cat, count], idx) => (
                                <div key={cat} className="pop-risk-item">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: riskColors[cat] || '#cbd5e1' }}></div>
                                        <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: '600' }}>{cat}</span>
                                    </div>
                                    <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b' }}>
                                        <CountUp end={count} /> <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: '400' }}>({Math.round(count / (data?.averages.total || 1) * 100)}%)</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Insights Card */}
                    <motion.div
                        className="pop-insights-card"
                        variants={itemVariants}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <div style={{ padding: '8px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', color: '#60a5fa' }}>
                                <Group fontSize="small" />
                            </div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>Smart Insights</h3>
                        </div>

                        <div className="pop-insight-list">
                            <InsightItem
                                icon={<TrendingUp />}
                                text={<span>Total checks increased by <b>12%</b> this week.</span>}
                            />
                            <InsightItem
                                icon={<Assessment />}
                                text={<span><b>{Math.round((data?.risk_distribution['Normal'] || 0) / (data?.averages.total || 1) * 100)}%</b> of users are in the healthy range.</span>}
                            />
                            <InsightItem
                                icon={<InfoOutlined />}
                                text="Avg Heart Rate is robust at optimal levels."
                            />
                        </div>
                    </motion.div>

                </div>
            </motion.div>
        </motion.div>
    );
};

const StatCard = ({ icon, label, value, unit, color, bgColor }) => {
    const isComplex = String(value).includes('/');

    return (
        <motion.div
            className="pop-stat-card"
            variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
            }}
        >
            <div className="pop-stat-icon-wrapper" style={{ background: bgColor, color: color }}>
                {icon}
            </div>
            <span className="pop-stat-label">{label}</span>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span className="pop-stat-value">
                    {isComplex ? (
                        <>
                            <CountUp end={value.split('/')[0]} />
                            <span style={{ fontSize: '0.8em', opacity: 0.7 }}>/</span>
                            <CountUp end={value.split('/')[1]} />
                        </>
                    ) : (
                        <CountUp end={value} />
                    )}
                </span>
                {unit && <span className="pop-stat-unit">{unit}</span>}
            </div>

            {/* Background decoration */}
            <div style={{
                position: 'absolute',
                right: '-20px',
                bottom: '-20px',
                width: '100px',
                height: '100px',
                background: color,
                borderRadius: '50%',
                opacity: 0.05,
                pointerEvents: 'none'
            }} />
        </motion.div>
    );
};

const InsightItem = ({ icon, text }) => (
    <div className="pop-insight-item">
        <div className="pop-insight-icon" style={{ color: '#fff', fontSize: '1rem' }}>
            {React.cloneElement(icon, { fontSize: 'small' })}
        </div>
        <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5', color: 'rgba(255,255,255,0.9)' }}>
            {text}
        </p>
    </div>
);

const CountUp = ({ end, duration = 2 }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime;
        let animationFrame;
        const startValue = 0;
        const isFloat = String(end).includes('.');
        const endVal = parseFloat(end) || 0;

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / (duration * 1000), 1);

            // Easing function: easeOutExpo
            const ease = percentage === 1 ? 1 : 1 - Math.pow(2, -10 * percentage);

            const currentVal = startValue + (endVal - startValue) * ease;

            setCount(isFloat ? currentVal.toFixed(1) : Math.floor(currentVal));

            if (percentage < 1) {
                animationFrame = requestAnimationFrame(animate);
            } else {
                setCount(end); // Ensure final value is exact string/number as passed
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [end, duration]);

    return <span>{count}</span>;
}

export default PopulationAnalytics;
