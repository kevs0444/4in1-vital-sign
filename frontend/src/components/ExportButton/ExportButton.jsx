import React, { useState } from 'react';
import { Download, ArrowDropDown } from '@mui/icons-material';
import './ExportButton.css';

const ExportButton = ({ onExportCSV, onExportExcel, onExportPDF }) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleDropdown = () => setIsOpen(!isOpen);

    const handleAction = (action) => {
        setIsOpen(false);
        // Small timeout to allow UI to close
        setTimeout(() => {
            if (action === 'csv' && onExportCSV) onExportCSV();
            if (action === 'excel' && onExportExcel) onExportExcel();
            if (action === 'pdf' && onExportPDF) onExportPDF();
        }, 100);
    };

    // Click outside handler could be added here for robustness, 
    // but for now a simple blur or mouseleave might suffice if kept simple.
    // Using a simple conditional render for the menu.

    return (
        <div className="export-button-container" onMouseLeave={() => setIsOpen(false)}>
            <button
                className="export-btn-main"
                onClick={toggleDropdown}
                title="Export Data"
            >
                <Download fontSize="small" />
                <ArrowDropDown fontSize="small" />
            </button>

            {isOpen && (
                <div className="export-dropdown-menu">
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
