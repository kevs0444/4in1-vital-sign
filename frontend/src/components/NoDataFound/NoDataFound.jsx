import React from 'react';
import { motion } from 'framer-motion';
import { SearchOff, FolderOff, PersonOff, HistoryToggleOff } from '@mui/icons-material';

/**
 * Modern "No Data Found" empty state component with red theme
 * @param {string} type - Type of empty state: 'users', 'measurements', 'history', 'search', 'general'
 * @param {string} searchTerm - Optional search term to display
 * @param {string} message - Optional custom message
 * @param {boolean} compact - If true, renders a smaller inline version for tables
 */
const NoDataFound = ({
    type = 'general',
    searchTerm = '',
    message = '',
    compact = false,
    colSpan = 6
}) => {
    const configs = {
        users: {
            icon: <PersonOff style={{ fontSize: compact ? '2rem' : '3.5rem' }} />,
            title: searchTerm ? `No users found` : 'No Users Found',
            subtitle: searchTerm
                ? `No results matching "${searchTerm}"`
                : 'Try adjusting your filters or search criteria',
            hint: 'Check your filters or try a different search term'
        },
        measurements: {
            icon: <HistoryToggleOff style={{ fontSize: compact ? '2rem' : '3.5rem' }} />,
            title: 'No Measurements Yet',
            subtitle: 'Visit a kiosk to get your first health check!',
            hint: 'Your health data will appear here after your first measurement'
        },
        history: {
            icon: <HistoryToggleOff style={{ fontSize: compact ? '2rem' : '3.5rem' }} />,
            title: 'No History Found',
            subtitle: 'Try changing your filter settings',
            hint: 'Adjust the time period or other filters to see more records'
        },
        search: {
            icon: <SearchOff style={{ fontSize: compact ? '2rem' : '3.5rem' }} />,
            title: 'No Results Found',
            subtitle: searchTerm ? `Nothing matches "${searchTerm}"` : 'No matching results',
            hint: 'Try different keywords or check your spelling'
        },
        general: {
            icon: <FolderOff style={{ fontSize: compact ? '2rem' : '3.5rem' }} />,
            title: 'No Data Available',
            subtitle: message || 'There\'s nothing to display here yet',
            hint: 'Data will appear here once available'
        }
    };

    const config = configs[type] || configs.general;

    // Compact version for table rows
    if (compact) {
        return (
            <tr>
                <td colSpan={colSpan}>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '3rem 2rem',
                            background: 'linear-gradient(135deg, #fff5f5 0%, #fef2f2 100%)',
                            borderRadius: '16px',
                            margin: '1rem',
                            border: '2px dashed #fecaca'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                            style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#dc2626',
                                marginBottom: '1rem',
                                boxShadow: '0 8px 24px rgba(220, 38, 38, 0.15)'
                            }}
                        >
                            {config.icon}
                        </motion.div>
                        <h4 style={{
                            margin: '0 0 0.5rem 0',
                            fontSize: '1.1rem',
                            fontWeight: '700',
                            color: '#991b1b',
                            textAlign: 'center'
                        }}>
                            {config.title}
                        </h4>
                        <p style={{
                            margin: 0,
                            fontSize: '0.9rem',
                            color: '#b91c1c',
                            textAlign: 'center',
                            maxWidth: '300px'
                        }}>
                            {config.subtitle}
                        </p>
                    </motion.div>
                </td>
            </tr>
        );
    }

    // Full version for standalone display
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 2rem',
                background: 'linear-gradient(135deg, #fff5f5 0%, #fef2f2 100%)',
                borderRadius: '24px',
                border: '2px dashed #fecaca',
                margin: '2rem 0',
                minHeight: '300px'
            }}
        >
            {/* Animated Icon Container */}
            <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#dc2626',
                    marginBottom: '1.5rem',
                    boxShadow: '0 12px 32px rgba(220, 38, 38, 0.2), inset 0 -2px 8px rgba(220, 38, 38, 0.1)'
                }}
            >
                {config.icon}
            </motion.div>

            {/* Decorative dots */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '1.5rem'
            }}>
                {[0.3, 0.4, 0.5].map((delay, i) => (
                    <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay, type: 'spring' }}
                        style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: i === 1 ? '#dc2626' : '#fca5a5'
                        }}
                    />
                ))}
            </div>

            {/* Title */}
            <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{
                    margin: '0 0 0.75rem 0',
                    fontSize: '1.5rem',
                    fontWeight: '800',
                    color: '#991b1b',
                    textAlign: 'center'
                }}
            >
                {config.title}
            </motion.h3>

            {/* Subtitle */}
            <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                style={{
                    margin: '0 0 1rem 0',
                    fontSize: '1rem',
                    color: '#b91c1c',
                    textAlign: 'center',
                    maxWidth: '400px',
                    lineHeight: '1.5'
                }}
            >
                {config.subtitle}
            </motion.p>

            {/* Hint badge */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                style={{
                    padding: '8px 16px',
                    background: 'rgba(220, 38, 38, 0.1)',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    color: '#dc2626',
                    fontWeight: '600'
                }}
            >
                💡 {config.hint}
            </motion.div>
        </motion.div>
    );
};

export default NoDataFound;
