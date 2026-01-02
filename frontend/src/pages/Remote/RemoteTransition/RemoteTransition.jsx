import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

const RemoteTransition = ({ children }) => {
    useEffect(() => {
        // Enforce scrolling for remote pages
        const originalOverflow = document.body.style.overflow;
        const originalOverflowX = document.body.style.overflowX;
        const originalOverflowY = document.body.style.overflowY;
        const originalHeight = document.body.style.height;

        // Also capture html styles
        const originalHtmlOverflow = document.documentElement.style.overflow;
        const originalHtmlHeight = document.documentElement.style.height;

        // Apply to body
        document.body.style.overflow = 'auto'; // Allow native scrolling
        document.body.style.overflowX = 'hidden'; // Prevent horizontal scroll
        document.body.style.overflowY = 'auto'; // Explicitly allow Y scroll
        document.body.style.height = 'auto'; // Let height grow

        // Apply to html (crucial for some mobile browsers/setups)
        document.documentElement.style.overflow = 'auto';
        document.documentElement.style.height = 'auto';

        return () => {
            // Cleanup: Restore original styles
            document.body.style.overflow = originalOverflow;
            document.body.style.overflowX = originalOverflowX;
            document.body.style.overflowY = originalOverflowY;
            document.body.style.height = originalHeight;

            document.documentElement.style.overflow = originalHtmlOverflow;
            document.documentElement.style.height = originalHtmlHeight;
        };
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ width: '100%', minHeight: '100vh', position: 'relative' }}
        >
            {children}
        </motion.div>
    );
};

export default RemoteTransition;
