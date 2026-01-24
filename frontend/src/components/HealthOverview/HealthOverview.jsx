import React from 'react';
import DashboardAnalytics from '../DashboardAnalytics/DashboardAnalytics';

const HealthOverview = ({
    user,
    history = [],
    timePeriod,
    customDateRange,
    populationAverages
}) => {
    return (
        <div className="health-overview-container">


            {/* Analytics Charts */}
            <DashboardAnalytics
                user={user}
                history={history}
                timePeriod={timePeriod}
                customDateRange={customDateRange}
                populationAverages={populationAverages}
            />
        </div>
    );
};

export default HealthOverview;
