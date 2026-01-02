import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Favorite,
    Thermostat,
    MonitorWeight,
    Opacity,
    Speed,
    ArrowForward,
    Height,
    DateRange,
    Close,
    Air
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
    ArcElement
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

// Shared Time Period Filter Component - can be used anywhere
export const TimePeriodFilter = ({ timePeriod, setTimePeriod, customDateRange, setCustomDateRange, showCustom = true }) => {
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [tempStartDate, setTempStartDate] = useState(customDateRange?.start || '');
    const [tempEndDate, setTempEndDate] = useState(customDateRange?.end || '');

    const applyCustomDate = () => {
        if (tempStartDate && tempEndDate) {
            setCustomDateRange({ start: tempStartDate, end: tempEndDate });
            setTimePeriod('custom');
            setShowDatePicker(false);
        }
    };

    const clearCustomDate = () => {
        setCustomDateRange(null);
        setTimePeriod('weekly');
        setShowDatePicker(false);
        setTempStartDate('');
        setTempEndDate('');
    };

    return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {[
                { id: 'daily', label: 'Daily' },
                { id: 'weekly', label: 'Weekly' },
                { id: 'monthly', label: 'Monthly' },
                { id: 'annually', label: 'Annually' }
            ].map(period => (
                <button
                    key={period.id}
                    onClick={() => {
                        setTimePeriod(period.id);
                        setCustomDateRange(null);
                    }}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        border: timePeriod === period.id ? 'none' : '1px solid #e2e8f0',
                        background: timePeriod === period.id ? '#dc2626' : 'white',
                        color: timePeriod === period.id ? 'white' : '#64748b',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    {period.label}
                </button>
            ))}

            {showCustom && (
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            border: timePeriod === 'custom' ? 'none' : '1px solid #e2e8f0',
                            background: timePeriod === 'custom' ? '#dc2626' : 'white',
                            color: timePeriod === 'custom' ? 'white' : '#64748b',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <DateRange style={{ fontSize: '1rem' }} />
                        {timePeriod === 'custom' && customDateRange
                            ? `${new Date(customDateRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(customDateRange.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                            : 'Custom'}
                    </button>

                    {showDatePicker && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            marginTop: '8px',
                            background: 'white',
                            borderRadius: '12px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                            padding: '16px',
                            zIndex: 100,
                            minWidth: '280px',
                            border: '1px solid #fee2e2'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.95rem' }}>Select Date Range</span>
                                <button onClick={() => setShowDatePicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                    <Close fontSize="small" />
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Start Date</label>
                                    <input
                                        type="date"
                                        value={tempStartDate}
                                        onChange={(e) => setTempStartDate(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #e2e8f0',
                                            fontSize: '0.9rem',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>End Date</label>
                                    <input
                                        type="date"
                                        value={tempEndDate}
                                        onChange={(e) => setTempEndDate(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #e2e8f0',
                                            fontSize: '0.9rem',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                    <button
                                        onClick={applyCustomDate}
                                        disabled={!tempStartDate || !tempEndDate}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: tempStartDate && tempEndDate ? '#dc2626' : '#e2e8f0',
                                            color: tempStartDate && tempEndDate ? 'white' : '#94a3b8',
                                            fontWeight: '600',
                                            cursor: tempStartDate && tempEndDate ? 'pointer' : 'not-allowed'
                                        }}
                                    >
                                        Apply
                                    </button>
                                    {timePeriod === 'custom' && (
                                        <button
                                            onClick={clearCustomDate}
                                            style={{
                                                padding: '10px 16px',
                                                borderRadius: '8px',
                                                border: '1px solid #e2e8f0',
                                                background: 'white',
                                                color: '#64748b',
                                                fontWeight: '600',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Helper function to filter history by time period - can be used anywhere
export const filterHistoryByTimePeriod = (history, timePeriod, customDateRange) => {
    if (!history || history.length === 0) return [];

    const now = new Date();
    let cutoffDate = new Date();

    if (timePeriod === 'custom' && customDateRange?.start && customDateRange?.end) {
        const startDate = new Date(customDateRange.start);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(customDateRange.end);
        endDate.setHours(23, 59, 59, 999);

        return history.filter(h => {
            const recordDate = new Date(h.created_at);
            return recordDate >= startDate && recordDate <= endDate;
        }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    switch (timePeriod) {
        case 'daily':
            cutoffDate.setHours(0, 0, 0, 0);
            break;
        case 'weekly':
            cutoffDate.setDate(now.getDate() - 7);
            break;
        case 'monthly':
            cutoffDate.setMonth(now.getMonth() - 1);
            break;
        case 'annually':
            cutoffDate.setFullYear(now.getFullYear() - 1);
            break;
        default:
            cutoffDate.setDate(now.getDate() - 7);
    }

    return history.filter(h => new Date(h.created_at) >= cutoffDate)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
};

const DashboardAnalytics = ({ user, history, timePeriod: externalTimePeriod, customDateRange: externalCustomDateRange }) => {
    // Use external state if provided, otherwise use internal state
    const [internalTimePeriod, setInternalTimePeriod] = useState('weekly');
    const [internalCustomDateRange, setInternalCustomDateRange] = useState(null);

    const timePeriod = externalTimePeriod || internalTimePeriod;
    const customDateRange = externalCustomDateRange !== undefined ? externalCustomDateRange : internalCustomDateRange;

    // Filter history based on time period
    const filteredHistory = useMemo(() => {
        return filterHistoryByTimePeriod(history, timePeriod, customDateRange);
    }, [history, timePeriod, customDateRange]);

    // Process data from filtered history
    const analyticsData = useMemo(() => {
        if (!filteredHistory || filteredHistory.length === 0) return null;

        const recent = filteredHistory.slice(-10);

        const calcAvg = (arr) => {
            const validValues = arr.filter(v => v && !isNaN(v));
            if (validValues.length === 0) return null;
            return Math.round(validValues.reduce((a, b) => a + parseFloat(b), 0) / validValues.length);
        };

        const heartRates = filteredHistory.map(h => parseFloat(h.heart_rate)).filter(v => v && !isNaN(v));
        const avgHR = calcAvg(heartRates);
        const latestHR = heartRates[heartRates.length - 1] || null;

        const systolicValues = filteredHistory.map(h => parseFloat(h.systolic)).filter(v => v && !isNaN(v));
        const diastolicValues = filteredHistory.map(h => parseFloat(h.diastolic)).filter(v => v && !isNaN(v));
        const avgSystolic = calcAvg(systolicValues);
        const avgDiastolic = calcAvg(diastolicValues);

        const spo2Values = filteredHistory.map(h => parseFloat(h.spo2)).filter(v => v && !isNaN(v));
        const avgSpO2 = calcAvg(spo2Values);

        const tempValues = filteredHistory.map(h => parseFloat(h.temperature)).filter(v => v && !isNaN(v));
        const avgTemp = tempValues.length > 0 ? (tempValues.reduce((a, b) => a + b, 0) / tempValues.length).toFixed(1) : null;

        const weightValues = filteredHistory.map(h => parseFloat(h.weight)).filter(v => v && !isNaN(v));
        const avgWeight = weightValues.length > 0 ? (weightValues.reduce((a, b) => a + b, 0) / weightValues.length).toFixed(1) : null;

        const heightValues = filteredHistory.map(h => parseFloat(h.height)).filter(v => v && !isNaN(v));
        const avgHeight = heightValues.length > 0 ? (heightValues.reduce((a, b) => a + b, 0) / heightValues.length).toFixed(1) : null;

        const bmiValues = filteredHistory.map(h => parseFloat(h.bmi)).filter(v => v && !isNaN(v) && v > 0);
        const avgBMI = bmiValues.length > 0 ? (bmiValues.reduce((a, b) => a + b, 0) / bmiValues.length).toFixed(1) : null;

        const rrValues = filteredHistory.map(h => parseFloat(h.respiratory_rate)).filter(v => v && !isNaN(v));
        const avgRR = calcAvg(rrValues);

        const labels = recent.map(h => {
            const date = new Date(h.created_at);
            if (timePeriod === 'daily') {
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else if (timePeriod === 'annually') {
                return date.toLocaleDateString([], { month: 'short' });
            } else {
                return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
            }
        });

        return {
            heartRate: {
                labels,
                data: recent.map(h => parseFloat(h.heart_rate) || 0),
                avg: avgHR,
                latest: latestHR
            },
            bloodPressure: {
                labels,
                systolicData: recent.map(h => parseFloat(h.systolic) || 0),
                diastolicData: recent.map(h => parseFloat(h.diastolic) || 0),
                avgSystolic,
                avgDiastolic
            },
            spo2: { avg: avgSpO2 },
            temperature: { avg: avgTemp },
            weight: { avg: avgWeight, latest: weightValues[weightValues.length - 1]?.toFixed(1) || null },
            height: { avg: avgHeight, latest: heightValues[heightValues.length - 1]?.toFixed(1) || null },
            bmi: { avg: avgBMI },
            respiratoryRate: { avg: avgRR },
            totalRecords: filteredHistory.length
        };
    }, [filteredHistory, timePeriod]);

    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#1e293b',
                bodyColor: '#64748b',
                borderColor: '#fecaca',
                borderWidth: 1,
                padding: 12,
                displayColors: false,
            }
        },
        scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#94a3b8' } },
            y: { display: false, min: 40, max: 140 }
        },
        elements: {
            line: { tension: 0.4 },
            point: { radius: 0, hoverRadius: 6 }
        }
    };

    const getHeartStatus = () => {
        if (!analyticsData?.heartRate.avg) return { status: 'No Data', color: '#64748b' };
        const hr = analyticsData.heartRate.avg;
        if (hr < 60) return { status: 'Bradycardia', color: '#f59e0b' };
        if (hr > 100) return { status: 'Tachycardia', color: '#dc2626' };
        return { status: 'Normal Rhythm', color: '#10b981' };
    };

    const heartStatus = getHeartStatus();

    const weightData = {
        labels: ['Weight', 'Remaining'],
        datasets: [{
            data: [analyticsData?.weight.latest || 0, 120 - (analyticsData?.weight.latest || 0)],
            backgroundColor: ['#dc2626', '#fee2e2'],
            borderWidth: 0,
            cutout: '80%',
        }]
    };

    return (
        <div className="dashboard-analytics-container" style={{ padding: '0 0 20px 0' }}>
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1e293b', marginBottom: '4px' }}>Health Overview</h2>
                <p style={{ fontSize: '1rem', color: '#64748b', fontWeight: '500', marginBottom: '16px' }}>
                    {analyticsData?.totalRecords || 0} measurements in selected period
                </p>
                {/* Only show filter if not using external state */}
                {!externalTimePeriod && (
                    <TimePeriodFilter
                        timePeriod={internalTimePeriod}
                        setTimePeriod={setInternalTimePeriod}
                        customDateRange={internalCustomDateRange}
                        setCustomDateRange={setInternalCustomDateRange}
                    />
                )}
            </div>

            <div className="analytics-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
                alignItems: 'start'
            }}>

                {/* Heart Condition Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        gridRow: 'span 2',
                        background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                        borderRadius: '24px',
                        padding: '28px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        position: 'relative',
                        minHeight: '380px'
                    }}
                >
                    <div style={{
                        width: '180px',
                        height: '180px',
                        background: 'linear-gradient(135deg, #f87171, #dc2626)',
                        borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%',
                        boxShadow: '0 20px 50px -10px rgba(220, 38, 38, 0.5)',
                        marginBottom: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Favorite style={{ fontSize: '90px', color: 'rgba(255,255,255,0.9)' }} />
                    </div>

                    <div style={{
                        background: 'rgba(255,255,255,0.9)',
                        backdropFilter: 'blur(12px)',
                        padding: '20px',
                        borderRadius: '20px',
                        width: '100%',
                        boxShadow: '0 10px 30px -5px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b' }}>Condition Detected</span>
                            <ArrowForward fontSize="small" style={{ color: '#dc2626' }} />
                        </div>
                        <h4 style={{ fontSize: '1.2rem', fontWeight: '800', color: heartStatus.color, marginBottom: '4px' }}>
                            {heartStatus.status}
                        </h4>
                        <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0 }}>
                            Avg Heart Rate: <strong style={{ color: '#1e293b' }}>{analyticsData?.heartRate.avg ? `${analyticsData.heartRate.avg} bpm` : 'Not Measured'}</strong>
                        </p>
                    </div>
                </motion.div>

                {/* Heart Rate Chart Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '20px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)',
                        border: '1px solid #fee2e2'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <div style={{ padding: '8px', background: '#fef2f2', borderRadius: '10px', color: '#dc2626' }}>
                                <Favorite fontSize="small" />
                            </div>
                            <span style={{ fontWeight: '700', color: '#1e293b' }}>Heart Rate</span>
                        </div>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '2px' }}>Average</p>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ fontSize: '1.8rem', fontWeight: '800', color: '#dc2626' }}>{analyticsData?.heartRate.avg || 'N/A'}</span>
                            {analyticsData?.heartRate.avg && <span style={{ fontSize: '0.9rem', color: '#64748b' }}>bpm</span>}
                        </div>
                    </div>
                    <div style={{ height: '70px' }}>
                        {analyticsData?.heartRate.data?.some(d => d > 0) ? (
                            <Line
                                data={{
                                    labels: analyticsData.heartRate.labels,
                                    datasets: [{
                                        data: analyticsData.heartRate.data,
                                        borderColor: '#dc2626',
                                        borderWidth: 2,
                                        pointBackgroundColor: '#fff',
                                        pointBorderColor: '#dc2626',
                                        fill: true,
                                        backgroundColor: (context) => {
                                            const ctx = context.chart.ctx;
                                            const gradient = ctx.createLinearGradient(0, 0, 0, 150);
                                            gradient.addColorStop(0, 'rgba(220, 38, 38, 0.2)');
                                            gradient.addColorStop(1, 'rgba(220, 38, 38, 0)');
                                            return gradient;
                                        },
                                    }]
                                }}
                                options={lineChartOptions}
                            />
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                                No data available
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Blood Pressure Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '20px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)',
                        border: '1px solid #fee2e2'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <div style={{ padding: '8px', background: '#fef2f2', borderRadius: '10px', color: '#dc2626' }}>
                                <Speed fontSize="small" />
                            </div>
                            <span style={{ fontWeight: '700', color: '#1e293b' }}>Blood Pressure</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '12px' }}>
                        <div>
                            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>Avg Systolic</p>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#dc2626' }}>{analyticsData?.bloodPressure.avgSystolic || 'N/A'}</span>
                                {analyticsData?.bloodPressure.avgSystolic && <span style={{ fontSize: '0.8rem', color: '#64748b' }}>mmHg</span>}
                            </div>
                        </div>
                        <div>
                            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '2px' }}>Avg Diastolic</p>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#b91c1c' }}>{analyticsData?.bloodPressure.avgDiastolic || 'N/A'}</span>
                                {analyticsData?.bloodPressure.avgDiastolic && <span style={{ fontSize: '0.8rem', color: '#64748b' }}>mmHg</span>}
                            </div>
                        </div>
                    </div>
                    <div style={{ height: '70px' }}>
                        {analyticsData?.bloodPressure.systolicData?.some(d => d > 0) ? (
                            <Bar
                                data={{
                                    labels: analyticsData.bloodPressure.labels,
                                    datasets: [
                                        { label: 'Systolic', data: analyticsData.bloodPressure.systolicData, backgroundColor: '#dc2626', borderRadius: 4, barThickness: 6 },
                                        { label: 'Diastolic', data: analyticsData.bloodPressure.diastolicData, backgroundColor: '#fca5a5', borderRadius: 4, barThickness: 6 }
                                    ]
                                }}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false } },
                                    scales: { x: { grid: { display: false }, ticks: { display: false } }, y: { display: false } }
                                }}
                            />
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                                No data available
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* SpO2 Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '20px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)',
                        border: '1px solid #fee2e2',
                        textAlign: 'center'
                    }}
                >
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ padding: '8px', background: '#fef2f2', borderRadius: '10px', color: '#dc2626' }}>
                            <Opacity fontSize="small" />
                        </div>
                        <span style={{ fontWeight: '700', color: '#1e293b' }}>Blood Oxygen (SpO2)</span>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                        <span style={{ fontSize: '2.5rem', fontWeight: '800', color: '#dc2626' }}>{analyticsData?.spo2.avg || 'N/A'}</span>
                        {analyticsData?.spo2.avg && <span style={{ fontSize: '1.2rem', color: '#64748b', marginLeft: '4px' }}>%</span>}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>{analyticsData?.spo2.avg ? 'Average Oxygen Saturation' : 'Not Measured'}</p>
                    <div style={{ marginTop: '12px', height: '8px', background: '#fee2e2', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                            width: `${Math.min((analyticsData?.spo2.avg || 0), 100)}%`,
                            height: '100%',
                            background: analyticsData?.spo2.avg >= 95 ? '#10b981' : analyticsData?.spo2.avg >= 90 ? '#f59e0b' : '#dc2626',
                            borderRadius: '4px',
                            transition: 'width 0.5s'
                        }}></div>
                    </div>
                </motion.div>

                {/* Temperature Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '20px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)',
                        border: '1px solid #fee2e2',
                        textAlign: 'center'
                    }}
                >
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ padding: '8px', background: '#fef2f2', borderRadius: '10px', color: '#dc2626' }}>
                            <Thermostat fontSize="small" />
                        </div>
                        <span style={{ fontWeight: '700', color: '#1e293b' }}>Body Temperature</span>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                        <span style={{ fontSize: '2.5rem', fontWeight: '800', color: '#dc2626' }}>{analyticsData?.temperature.avg || 'N/A'}</span>
                        {analyticsData?.temperature.avg && <span style={{ fontSize: '1.2rem', color: '#64748b', marginLeft: '4px' }}>°C</span>}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>{analyticsData?.temperature.avg ? 'Average Temperature' : 'Not Measured'}</p>
                </motion.div>

                {/* Weight Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '20px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)',
                        border: '1px solid #fee2e2',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}
                >
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <div style={{ padding: '8px', background: '#fef2f2', borderRadius: '10px', color: '#dc2626' }}>
                                <MonitorWeight fontSize="small" />
                            </div>
                            <span style={{ fontWeight: '700', color: '#1e293b' }}>Weight</span>
                        </div>
                    </div>
                    <div style={{ width: '120px', height: '70px', position: 'relative', marginBottom: '8px' }}>
                        <Doughnut
                            data={weightData}
                            options={{
                                maintainAspectRatio: false,
                                cutout: '80%',
                                plugins: { tooltip: { enabled: false }, legend: { display: false } },
                                rotation: 270,
                                circumference: 180
                            }}
                        />
                        <div style={{ position: 'absolute', bottom: '0', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
                            <span style={{ fontSize: '1.3rem', fontWeight: '800', color: '#dc2626', lineHeight: 1 }}>{analyticsData?.weight.avg || 'N/A'}</span>
                            <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>{analyticsData?.weight.avg ? 'kg (avg)' : 'Not Measured'}</span>
                        </div>
                    </div>
                </motion.div>

                {/* BMI Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '20px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)',
                        border: '1px solid #fee2e2',
                        textAlign: 'center'
                    }}
                >
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ padding: '8px', background: '#fef2f2', borderRadius: '10px', color: '#dc2626' }}>
                            <Height fontSize="small" />
                        </div>
                        <span style={{ fontWeight: '700', color: '#1e293b' }}>BMI</span>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                        <span style={{ fontSize: '2.5rem', fontWeight: '800', color: '#dc2626' }}>{analyticsData?.bmi.avg || 'N/A'}</span>
                    </div>
                    <p style={{
                        fontSize: '0.8rem',
                        color: analyticsData?.bmi.avg
                            ? (analyticsData.bmi.avg < 18.5 ? '#f59e0b' : analyticsData.bmi.avg < 25 ? '#10b981' : analyticsData.bmi.avg < 30 ? '#f59e0b' : '#dc2626')
                            : '#64748b',
                        fontWeight: '600',
                        margin: 0
                    }}>
                        {analyticsData?.bmi.avg
                            ? (analyticsData.bmi.avg < 18.5 ? 'Underweight' : analyticsData.bmi.avg < 25 ? 'Normal' : analyticsData.bmi.avg < 30 ? 'Overweight' : 'Obese')
                            : 'Not Measured'}
                    </p>
                </motion.div>

                {/* Height Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '20px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)',
                        border: '1px solid #fee2e2',
                        textAlign: 'center'
                    }}
                >
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ padding: '8px', background: '#fef2f2', borderRadius: '10px', color: '#dc2626' }}>
                            <Height fontSize="small" />
                        </div>
                        <span style={{ fontWeight: '700', color: '#1e293b' }}>Height</span>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                        <span style={{ fontSize: '2.5rem', fontWeight: '800', color: '#dc2626' }}>{analyticsData?.height.avg || 'N/A'}</span>
                        {analyticsData?.height.avg && <span style={{ fontSize: '1.2rem', color: '#64748b', marginLeft: '4px' }}>cm</span>}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>{analyticsData?.height.avg ? 'Average Height' : 'Not Measured'}</p>
                </motion.div>

                {/* Respiratory Rate Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '20px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)',
                        border: '1px solid #fee2e2',
                        textAlign: 'center'
                    }}
                >
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ padding: '8px', background: '#fef2f2', borderRadius: '10px', color: '#dc2626' }}>
                            <Air fontSize="small" />
                        </div>
                        <span style={{ fontWeight: '700', color: '#1e293b' }}>Respiratory Rate</span>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                        <span style={{ fontSize: '2.5rem', fontWeight: '800', color: '#dc2626' }}>{analyticsData?.respiratoryRate.avg || 'N/A'}</span>
                        {analyticsData?.respiratoryRate.avg && <span style={{ fontSize: '1.2rem', color: '#64748b', marginLeft: '4px' }}>bpm</span>}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>{analyticsData?.respiratoryRate.avg ? 'Average Breaths/Min' : 'Not Measured'}</p>
                </motion.div>

            </div>
        </div>
    );
};

export default DashboardAnalytics;
