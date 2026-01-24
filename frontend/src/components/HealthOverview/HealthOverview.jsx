import React from 'react';
import { motion } from 'framer-motion';
import DashboardAnalytics from '../DashboardAnalytics/DashboardAnalytics';
import './HealthOverview.css';

const HealthOverview = ({
    user,
    history = [],
    timePeriod,
    customDateRange,
    populationAverages
}) => {
    return (
        <motion.div
            className="health-overview-container"
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1], // Custom easing for premium feel
                delay: 0.1
            }}
        >
            <DashboardAnalytics
                user={user}
                history={history}
                timePeriod={timePeriod}
                customDateRange={customDateRange}
                populationAverages={populationAverages}
            />
        </motion.div>
    );
};

export default HealthOverview;
