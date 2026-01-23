import React, { useState } from 'react';
import { Download, ArrowDropDown } from '@mui/icons-material';
import './ExportButton.css';

const ExportButton = ({ onExportCSV, onExportExcel, onExportPDF }) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = React.useRef(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

    const toggleDropdown = () => {
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            // Position it below the button, aligned to the right edge or left edge depending on space
            // Defaulting to left alignment or keeping it consistent with relative flow visual
            // Let's use left alignment if possible, relative to the button
            setDropdownPos({
                top: rect.bottom + 4, // 4px gap
                left: rect.left
            });
        }
        setIsOpen(!isOpen);
    };

    const handleAction = (action) => {
        setIsOpen(false);
        setTimeout(() => {
            if (action === 'csv' && onExportCSV) onExportCSV();
            if (action === 'excel' && onExportExcel) onExportExcel();
            if (action === 'pdf' && onExportPDF) onExportPDF();
        }, 100);
    };

    // Close on click outside
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (buttonRef.current && !buttonRef.current.contains(event.target) && !event.target.closest('.export-dropdown-menu')) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="export-button-container" onMouseLeave={() => setIsOpen(false)}>
            <button
                ref={buttonRef}
                className="export-btn-main"
                onClick={toggleDropdown}
                title="Export Data"
            >
                <Download fontSize="small" />
                <ArrowDropDown fontSize="small" />
            </button>

            {isOpen && (
                <div
                    className="export-dropdown-menu"
                    style={{
                        position: 'fixed',
                        top: `${dropdownPos.top}px`,
                        left: `${dropdownPos.left}px`,
                        zIndex: 9999,
                        width: '140px' // Manual width as extracted from CSS
                    }}
                >
                    <button onClick={() => handleAction('csv')}>
                        <span className="file-icon csv">TXT</span> CSV
                    </button>
                    <button onClick={() => handleAction('excel')}>
                        <span className="file-icon excel">XLS</span> Excel
                    </button>
                    <button onClick={() => handleAction('pdf')}>
                        <span className="file-icon pdf">PDF</span> PDF
                    </button>
                </div>
            )}
        </div>
    );
};

export default ExportButton;
