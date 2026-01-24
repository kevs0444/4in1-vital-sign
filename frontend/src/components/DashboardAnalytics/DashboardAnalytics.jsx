import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

// ============================================================================
// REUSABLE MULTI-SELECT DROPDOWN COMPONENT
// Consistent styling with TimePeriodFilter for all dashboard dropdowns
// Handles: ESC key, scroll, resize, sidebar, tab changes, click outside
// ============================================================================
export const MultiSelectDropdown = ({
    label,
    selectedItems,
    options,
    onToggle,
    allLabel = 'All',
    icon = null,
    minWidth = '160px',
    singleSelect = false,
    compact = false,
    style = {},
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = React.useRef(null);
    const dropdownId = React.useRef(`dropdown-${Math.random().toString(36).substr(2, 9)}`);

    // Comprehensive close handlers
    useEffect(() => {
        const handleCloseDropdowns = (e) => {
            if (e.detail && e.detail.except === dropdownId.current) return;
            setIsOpen(false);
        };

        const handleResize = () => {
            if (window.innerWidth <= 1024) setIsOpen(false);
        };

        const handleClickOutside = (event) => {
            if (buttonRef.current && buttonRef.current.contains(event.target)) return;
            if (dropdownRef.current && dropdownRef.current.contains(event.target)) return;
            setIsOpen(false);
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setIsOpen(false);
        };

        const handleScroll = () => {
            setIsOpen(false);
        };

        window.addEventListener('closeAllDropdowns', handleCloseDropdowns);
        window.addEventListener('resize', handleResize);
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('keydown', handleKeyDown);

        const contentWrapper = document.querySelector('.dashboard-content-wrapper');
        if (contentWrapper) contentWrapper.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('closeAllDropdowns', handleCloseDropdowns);
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('keydown', handleKeyDown);
            if (contentWrapper) contentWrapper.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const buttonRef = React.useRef(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

    // When this dropdown opens, close all others
    const handleToggle = () => {
        if (!isOpen) {
            // Close all other dropdowns first, except this one
            window.dispatchEvent(new CustomEvent('closeAllDropdowns', {
                detail: { except: dropdownId.current }
            }));

            // Calculate fixed position
            if (buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                setDropdownPos({
                    top: rect.bottom,
                    left: rect.left
                });
            }
        }
        setIsOpen(!isOpen);
    };

    const getDisplayLabel = () => {
        if (selectedItems.includes('All') || selectedItems.includes('all')) return allLabel;

        if (selectedItems.length > 0) {
            if (singleSelect) {
                const selectedId = selectedItems[0];
                const option = options.find(o => (typeof o === 'object' ? o.id === selectedId : o === selectedId));
                return typeof option === 'object' ? option.label : option;
            }
            return `${selectedItems.length} Selected`;
        }
        return label;
    };

    const displayLabel = getDisplayLabel();



    return (
        <div style={{ position: 'relative', display: 'inline-block', ...style }} className={className}>
            <button
                ref={buttonRef}
                onClick={handleToggle}
                style={{
                    padding: compact ? '6px 10px' : '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    color: '#1e293b',
                    fontWeight: '600',
                    fontSize: compact ? '0.8rem' : '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: compact ? '4px' : '8px',
                    minWidth: compact ? 'auto' : minWidth,
                    justifyContent: 'space-between',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s ease',
                    height: compact ? '32px' : 'auto',
                    width: '100%'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {icon && <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center' }}>{icon}</span>}
                    <span>{displayLabel}</span>
                </div>
                <span style={{
                    fontSize: '0.7rem',
                    color: '#64748b',
                    transform: isOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s'
                }}>▼</span>
            </button>

            {isOpen && createPortal(
                <motion.div
                    ref={dropdownRef}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        position: 'fixed', // Fixed to viewport since we calculated rect
                        top: dropdownPos.top + 4, // Add slight offset
                        left: dropdownPos.left,
                        zIndex: 9999, // High z-index to be safe above modals
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                        width: '220px',
                        padding: '6px',
                        maxHeight: '300px',
                        overflowY: 'auto'
                    }}
                >
                    {options.map(option => {
                        const optionId = typeof option === 'object' ? option.id : option;
                        const optionLabel = typeof option === 'object' ? option.label : option;
                        const isSelected = selectedItems.includes(optionId);

                        return (
                            <div
                                key={optionId}
                                onClick={() => {
                                    onToggle(optionId);
                                    if (singleSelect) {
                                        setIsOpen(false);
                                    }
                                }}
                                style={{
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    color: isSelected ? '#dc2626' : '#475569',
                                    background: isSelected ? '#fff1f2' : 'transparent',
                                    fontWeight: isSelected ? '700' : '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    transition: 'all 0.1s'
                                }}
                            >
                                <div style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: singleSelect ? '50%' : '4px',
                                    border: `2px solid ${isSelected ? '#dc2626' : '#cbd5e1'}`,
                                    background: isSelected ? '#dc2626' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    transition: 'all 0.15s ease'
                                }}>
                                    {isSelected && (
                                        singleSelect ? (
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} />
                                        ) : (
                                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                                <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )
                                    )}
                                </div>
                                {optionLabel}
                            </div>
                        );
                    })}
                </motion.div>,
                document.body
            )}

            {/* Click outside logic is handled by global listeners in useEffect above, 
                but we might need a transparent overlay if logic is flaky? 
                Actually the global click listener is NOT in the useEffect I see above.
                It relies on 'closeAllDropdowns' and specific events.
                Wait, line 60-110 only closes on specialized events.
                It seems I might be missing a generic click-outside listener.
                But the component had one in line 273-284 overlay.
            */}

        </div>
    );
};


// Shared Time Period Filter Component - can be used anywhere
// Handles: ESC key, scroll, resize, sidebar, tab changes, click outside
export const TimePeriodFilter = ({ timePeriod, setTimePeriod, customDateRange, setCustomDateRange, showCustom = true, variant = 'pills', compact = false, style = {}, className = '' }) => {
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [tempStartDate, setTempStartDate] = useState(customDateRange?.start || '');
    const [tempEndDate, setTempEndDate] = useState(customDateRange?.end || '');
    const dropdownRef = React.useRef(null);
    const datePickerRef = React.useRef(null);
    const dropdownId = React.useRef(`timeperiod-${Math.random().toString(36).substr(2, 9)}`);

    // Comprehensive close handlers
    useEffect(() => {
        const handleCloseDropdowns = (e) => {
            if (e.detail && e.detail.except === dropdownId.current) return;
            setShowDropdown(false);
            setShowDatePicker(false);
        };

        const handleResize = () => {
            if (window.innerWidth <= 1024) {
                setShowDropdown(false);
                setShowDatePicker(false);
            }
        };

        const handleClickOutside = (event) => {
            if (buttonRef.current && buttonRef.current.contains(event.target)) return;
            if (dropdownRef.current && dropdownRef.current.contains(event.target)) return;
            if (datePickerRef.current && datePickerRef.current.contains(event.target)) return;

            setShowDropdown(false);
            if (!datePickerRef.current || !datePickerRef.current.contains(event.target)) {
                // Only close date picker if click is completely outside
                // But wait, if I clicked outside button and outside dropdown, I might have clicked IN datepicker
                // so logic: if not in button, not in dropdown, not in datepicker -> close all
                setShowDatePicker(false);
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setShowDropdown(false);
                setShowDatePicker(false);
            }
        };

        const handleScroll = () => {
            setShowDropdown(false);
            setShowDatePicker(false);
        };

        window.addEventListener('closeAllDropdowns', handleCloseDropdowns);
        window.addEventListener('resize', handleResize);
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('keydown', handleKeyDown);

        const contentWrapper = document.querySelector('.dashboard-content-wrapper');
        if (contentWrapper) contentWrapper.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('closeAllDropdowns', handleCloseDropdowns);
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('keydown', handleKeyDown);
            if (contentWrapper) contentWrapper.removeEventListener('scroll', handleScroll);
        };
    }, []);

    // When this dropdown opens, close all others
    const buttonRef = React.useRef(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

    const handleToggle = () => {
        if (!showDropdown) {
            // Close all other dropdowns first, except this one
            window.dispatchEvent(new CustomEvent('closeAllDropdowns', {
                detail: { except: dropdownId.current }
            }));

            // Calculate fixed position
            if (buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                setDropdownPos({
                    top: rect.bottom,
                    left: rect.left
                });
            }
        }
        setShowDropdown(!showDropdown);
    };

    const periods = [
        { id: 'daily', label: 'Daily' },
        { id: 'weekly', label: 'Weekly' },
        { id: 'monthly', label: 'Monthly' },
        { id: 'annually', label: 'Annually' }
    ];

    const currentLabel = periods.find(p => p.id === timePeriod)?.label || (timePeriod === 'custom' ? 'Custom Range' : 'Select Period');

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

    if (variant === 'dropdown') {
        return (
            <div style={{ position: 'relative', display: 'inline-block', ...style }} className={className}>
                <button
                    ref={buttonRef}
                    onClick={handleToggle}
                    style={{
                        padding: compact ? '6px 10px' : '10px 16px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        background: 'white',
                        color: '#1e293b',
                        fontWeight: '600',
                        fontSize: compact ? '0.8rem' : '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: compact ? '4px' : '8px',
                        minWidth: compact ? 'auto' : '160px',
                        justifyContent: 'space-between',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        height: compact ? '32px' : 'auto',
                        width: '100%'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <DateRange style={{ fontSize: '1.1rem', color: '#dc2626' }} />
                        <span>{currentLabel}</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', transform: showDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                </button>

                {showDropdown && createPortal(
                    <motion.div
                        ref={dropdownRef}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            position: 'fixed',
                            top: dropdownPos.top,
                            left: dropdownPos.left,
                            zIndex: 9999,
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                            width: '200px',
                            padding: '6px',
                            marginTop: '8px'
                        }}
                    >
                        {periods.map(period => (
                            <div
                                key={period.id}
                                onClick={() => {
                                    setTimePeriod(period.id);
                                    setCustomDateRange(null);
                                    setShowDropdown(false);
                                }}
                                style={{
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    color: timePeriod === period.id ? '#dc2626' : '#475569',
                                    background: timePeriod === period.id ? '#fff1f2' : 'transparent',
                                    fontWeight: timePeriod === period.id ? '700' : '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    transition: 'all 0.1s'
                                }}
                            >
                                <div style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '4px',
                                    border: `2px solid ${timePeriod === period.id ? '#dc2626' : '#cbd5e1'}`,
                                    background: timePeriod === period.id ? '#dc2626' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    {timePeriod === period.id && <Close style={{ fontSize: '12px', color: 'white' }} />}
                                </div>
                                {period.label}
                            </div>
                        ))}

                        {showCustom && (
                            <>
                                <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }}></div>
                                <div
                                    onClick={() => {
                                        setShowDatePicker(true);
                                        setShowDropdown(false);
                                    }}
                                    style={{
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        color: timePeriod === 'custom' ? '#dc2626' : '#475569',
                                        background: timePeriod === 'custom' ? '#fff1f2' : 'transparent',
                                        fontWeight: timePeriod === 'custom' ? '700' : '500',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px'
                                    }}
                                >
                                    <DateRange style={{ fontSize: '1.2rem' }} />
                                    Custom Range
                                </div>
                            </>
                        )}
                    </motion.div>,
                    document.body
                )}

                {showDatePicker && createPortal(
                    <motion.div
                        ref={datePickerRef}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                            position: 'fixed', // Use fixed since we want to position relative to viewport or anchor
                            // Calculate position based on dropdownPos or button, but since dropdown is closed, use button pos?
                            // Actually, let's overlap it slightly or center it if on mobile? 
                            // For simplicity let's use the same anchor as dropdown
                            top: dropdownPos.top,
                            left: dropdownPos.left,
                            // Adjust if we want it to check for edge collision, but fixed is simple for now

                            marginTop: '12px',
                            background: 'white',
                            borderRadius: '16px',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                            padding: '24px',
                            zIndex: 9999,
                            minWidth: '320px',
                            border: '1px solid #fee2e2'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '1.1rem' }}>Custom Date Range</span>
                            <button onClick={() => setShowDatePicker(false)} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Close fontSize="small" />
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Start Date</label>
                                <input
                                    type="date"
                                    value={tempStartDate}
                                    onChange={(e) => setTempStartDate(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '10px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>End Date</label>
                                <input
                                    type="date"
                                    value={tempEndDate}
                                    onChange={(e) => setTempEndDate(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '10px',
                                        border: '1px solid #e2e8f0',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button
                                    onClick={applyCustomDate}
                                    disabled={!tempStartDate || !tempEndDate}
                                    style={{
                                        flex: 2,
                                        padding: '12px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: tempStartDate && tempEndDate ? '#dc2626' : '#e2e8f0',
                                        color: 'white',
                                        fontWeight: '700',
                                        cursor: tempStartDate && tempEndDate ? 'pointer' : 'not-allowed',
                                        boxShadow: tempStartDate && tempEndDate ? '0 4px 12px rgba(220, 38, 38, 0.2)' : 'none'
                                    }}
                                >
                                    Apply Range
                                </button>
                                {timePeriod === 'custom' && (
                                    <button
                                        onClick={clearCustomDate}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            borderRadius: '10px',
                                            border: '1px solid #e2e8f0',
                                            background: '#f8fafc',
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
                    </motion.div>,
                    document.body
                )}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {periods.map(period => (
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
        case 'all':
        default:
            // Return all records without time filtering
            return history.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    return history.filter(h => new Date(h.created_at) >= cutoffDate)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
};

const DashboardAnalytics = ({ user, history, timePeriod: externalTimePeriod, customDateRange: externalCustomDateRange, populationAverages }) => {
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
            legend: {
                display: true,
                align: 'end',
                labels: {
                    boxWidth: 10,
                    usePointStyle: true
                }
            },
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
            point: {
                radius: 0,
                hoverRadius: 8,
                hoverBorderWidth: 4,
                hoverBackgroundColor: '#fff',
                hoverBorderColor: '#dc2626'
            }
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
        <div className="dashboard-analytics-container">
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

            {/* Premium Summary Bar */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                    borderRadius: '24px',
                    padding: '24px 32px',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '20px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '2px solid #ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ef4444',
                        boxShadow: '0 0 15px rgba(239, 68, 68, 0.3)'
                    }}>
                        <Favorite style={{ fontSize: '32px' }} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0 }}>Health Analytics Dashboard</h2>
                        <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.6)', fontWeight: '500', fontSize: '0.9rem' }}>
                            {filteredHistory.length} measurements analyzed in this period
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '24px' }}>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>Current Risk</span>
                        <span style={{
                            fontSize: '1.2rem',
                            fontWeight: '800',
                            color: filteredHistory.length > 0 ? (filteredHistory[filteredHistory.length - 1].risk_category?.toLowerCase().includes('low') ? '#10b981' : '#ef4444') : '#94a3b8'
                        }}>
                            {filteredHistory.length > 0 ? (filteredHistory[filteredHistory.length - 1].risk_category || 'NORMAL') : '--'}
                        </span>
                    </div>
                    <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.1)' }}></div>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>Wellness Score</span>
                        <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff' }}>94/100</span>
                    </div>
                </div>
            </motion.div>

            {/* Summary Cards Row */}
            <div className="dashboard-summary-row">
                {/* Total Checkups Card */}
                <motion.div
                    className="dashboard-card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
                        borderLeft: '6px solid #dc2626',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}
                >
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                        Total Checkups
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#1e293b', lineHeight: 1, marginBottom: '4px' }}>
                        {analyticsData?.totalRecords || 0}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '500' }}>
                        Measurements Taken
                    </div>
                </motion.div>

                {/* Latest Status Card */}
                <motion.div
                    className="dashboard-card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}
                >
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                        Latest Status
                    </div>
                    <div style={{
                        fontSize: '2rem',
                        fontWeight: '800',
                        color: filteredHistory.length > 0 && (filteredHistory[filteredHistory.length - 1].risk_category?.toLowerCase().includes('normal') || filteredHistory[filteredHistory.length - 1].risk_category?.toLowerCase().includes('optimal')) ? '#10b981' : '#dc2626',
                        lineHeight: 1.2,
                        marginBottom: '4px'
                    }}>
                        {filteredHistory.length > 0 ? (filteredHistory[filteredHistory.length - 1].risk_category || 'Unknown') : 'No Data'}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: '500' }}>
                        {filteredHistory.length > 0 ? new Date(filteredHistory[filteredHistory.length - 1].created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No measurements yet'}
                    </div>
                </motion.div>
            </div>

            <div className="dashboard-analytics-grid">

                {/* Heart Condition Card */}
                <motion.div
                    className="dashboard-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02, boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.25)' }}
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
                    className="dashboard-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02, boxShadow: '0 20px 40px -10px rgba(220, 38, 38, 0.15)' }}
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
                        {populationAverages?.heart_rate && analyticsData?.heartRate.avg && (
                            <div style={{ fontSize: '0.75rem', marginTop: '4px', fontWeight: '600' }}>
                                <span style={{ color: '#64748b' }}>School Avg: </span>
                                <span style={{ color: '#1e293b' }}>{populationAverages.heart_rate} bpm</span>
                                <span style={{
                                    marginLeft: '8px',
                                    color: analyticsData.heartRate.avg > populationAverages.heart_rate ? '#dc2626' : '#94a3b8'
                                }}>
                                    ({analyticsData.heartRate.avg > populationAverages.heart_rate ? '+' : ''}{analyticsData.heartRate.avg - populationAverages.heart_rate})
                                </span>
                            </div>
                        )}
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
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', fontSize: '0.85rem', background: 'linear-gradient(135deg, #fff5f5 0%, #fef2f2 100%)', borderRadius: '8px', fontWeight: '500' }}>
                                📊 No data available
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Blood Pressure Card */}
                <motion.div
                    className="dashboard-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02, boxShadow: '0 20px 40px -10px rgba(220, 38, 38, 0.15)' }}
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
                    {populationAverages?.systolic && analyticsData?.bloodPressure.avgSystolic && (
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '600', marginBottom: '12px' }}>
                            School Avg: {populationAverages.systolic}/{populationAverages.diastolic} mmHg
                        </div>
                    )}
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
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', fontSize: '0.85rem', background: 'linear-gradient(135deg, #fff5f5 0%, #fef2f2 100%)', borderRadius: '8px', fontWeight: '500' }}>
                                📊 No data available
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* SpO2 Card */}
                <motion.div
                    className="dashboard-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02, boxShadow: '0 20px 40px -10px rgba(220, 38, 38, 0.15)' }}
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
                            background: analyticsData?.spo2.avg >= 95 ? '#ef4444' : analyticsData?.spo2.avg >= 90 ? '#94a3b8' : '#7f1d1d',
                            borderRadius: '4px',
                            transition: 'width 0.5s'
                        }}></div>
                    </div>
                </motion.div>

                {/* Temperature Card */}
                <motion.div
                    className="dashboard-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02, boxShadow: '0 20px 40px -10px rgba(220, 38, 38, 0.15)' }}
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
                    className="dashboard-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02, boxShadow: '0 20px 40px -10px rgba(220, 38, 38, 0.15)' }}
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
                                plugins: {
                                    tooltip: { enabled: false },
                                    legend: {
                                        display: true,
                                        position: 'bottom',
                                        labels: { boxWidth: 10, font: { size: 10 } }
                                    }
                                },
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
                    className="dashboard-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02, boxShadow: '0 20px 40px -10px rgba(220, 38, 38, 0.15)' }}
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
                            ? (analyticsData.bmi.avg < 18.5 ? '#94a3b8' : analyticsData.bmi.avg < 25 ? '#ef4444' : analyticsData.bmi.avg < 30 ? '#dc2626' : '#991b1b')
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
                    className="dashboard-card"
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
                    className="dashboard-card"
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
