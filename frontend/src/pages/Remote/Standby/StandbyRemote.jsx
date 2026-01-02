import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    MonitorHeart,
    Psychology,
    History,
    Smartphone,
    ArrowForward,
    MedicalServices,
    Security,
    Speed
} from '@mui/icons-material';
import logo from '../../../assets/images/juan.png';
import './StandbyRemote.css';

const StandbyRemote = () => {
    const navigate = useNavigate();

    // Body scroll logic is now handled in RemoteTransition.jsx for all remote pages


    return (
        <div className="standby-container">
            {/* Navbar */}
            <nav className="landing-navbar">
                <div className="nav-logo">
                    <img src={logo} alt="Logo" />
                    <span>4-in-Juan</span>
                </div>
                <button className="nav-cta" onClick={() => navigate('/login')}>
                    Sign In
                </button>
            </nav>

            {/* Hero Section */}
            <header className="hero-section">
                <motion.div
                    className="hero-text"
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <h1 className="hero-headline">
                        Your Reliable <br />
                        <span>Health Monitoring</span><br />
                        Solution
                    </h1>
                    <p className="hero-subtext">
                        Discover the quality care you deserve through our extensive range of health monitoring services available for everyone, anywhere.
                    </p>
                    <div className="hero-buttons">
                        <button className="btn-hero-primary" onClick={() => navigate('/login')}>
                            View Dashboard
                        </button>
                        <button className="btn-hero-outline" onClick={() => navigate('/register/welcome')}>
                            Create Account
                        </button>
                    </div>
                </motion.div>

                <motion.div
                    className="hero-image-container"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    <div className="hero-blob-bg"></div>
                    <div className="hero-image-card">
                        {/* Using the logo as the main hero image for now, but styled beautifully */}
                        <div className="hero-card-inner">
                            <img src={logo} alt="Hero Visual" className="hero-logo-img" />
                        </div>
                    </div>
                </motion.div>
            </header>

            {/* Services Section (Red Block) */}
            <section id="features" className="services-section">
                <div className="services-header">
                    <h2>Discover Our Features</h2>
                    <p>Comprehensive vital sign monitoring powered by advanced AI analysis for your peace of mind.</p>
                </div>

                <div className="services-grid">
                    {/* Card 1 */}
                    <motion.div
                        className="service-card"
                        whileHover={{ y: -10 }}
                    >
                        <div className="service-icon-box">
                            <MonitorHeart />
                        </div>
                        <h3>Instant Vitals</h3>
                        <p>Get accurate readings for Blood Pressure, Heart Rate, SpO2, and Body Temperature in seconds.</p>
                        <div className="service-arrow">
                            <div className="btn-arrow-circle">
                                <ArrowForward />
                            </div>
                        </div>
                    </motion.div>

                    {/* Card 2 */}
                    <motion.div
                        className="service-card"
                        whileHover={{ y: -10 }}
                    >
                        <div className="service-icon-box">
                            <Psychology />
                        </div>
                        <h3>AI Analysis</h3>
                        <p>Our advanced AI analyzes your results instantly to provide personalized health risk assessments.</p>
                        <div className="service-arrow">
                            <div className="btn-arrow-circle">
                                <ArrowForward />
                            </div>
                        </div>
                    </motion.div>

                    {/* Card 3 */}
                    <motion.div
                        className="service-card"
                        whileHover={{ y: -10 }}
                    >
                        <div className="service-icon-box">
                            <History />
                        </div>
                        <h3>Digital Records</h3>
                        <p>Keep track of your health journey. View your complete measurement history and trends anytime.</p>
                        <div className="service-arrow">
                            <div className="btn-arrow-circle">
                                <ArrowForward />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* About Section */}
            <section className="about-section">
                <div className="about-image-wrapper">
                    <div className="about-visual-card">
                        {/* Placeholder visual for About section */}
                        <img src={logo} className="about-visual-bg-pattern" alt="Background Pattern" />
                        <div className="about-visual-text">
                            12+
                        </div>
                    </div>
                </div>

                <div className="about-content">
                    <h2>Quick Info About Us</h2>
                    <p>
                        4-in-Juan is dedicated to providing accessible and accurate health monitoring for everyone.
                        We combine improved hardware sensors with intelligent software to give you a complete picture of your health.
                    </p>

                    <div className="about-features">
                        <div className="about-feature-item">
                            <div className="about-feature-icon">
                                <MedicalServices />
                            </div>
                            <div>
                                <h4>Comprehensive Care</h4>
                                <p style={{ margin: 0, fontSize: '0.9rem' }}>All essential vitals in one device.</p>
                            </div>
                        </div>

                        <div className="about-feature-item">
                            <div className="about-feature-icon">
                                <Security />
                            </div>
                            <div>
                                <h4>Secure Data</h4>
                                <p style={{ margin: 0, fontSize: '0.9rem' }}>Your health records are encrypted and safe.</p>
                            </div>
                        </div>

                        <div className="about-feature-item">
                            <div className="about-feature-icon">
                                <Speed />
                            </div>
                            <div>
                                <h4>Fast Results</h4>
                                <p style={{ margin: 0, fontSize: '0.9rem' }}>Get analyzed results in under a minute.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Banner */}
            <section className="cta-banner">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <h2>Improve Your Health with<br />Our Monitoring Services</h2>
                    <p>
                        We provide treatment services for both adults and children, committed to delivering exceptional care to our patients.
                    </p>
                    <button className="btn-cta-white" onClick={() => navigate('/register/welcome')}>
                        Get Started Today
                    </button>
                </motion.div>
            </section>

            {/* Footer */}
            <footer className="landing-footer-main">
                <div className="footer-content">
                    <div className="footer-brand">
                        <h2>
                            <div style={{ background: 'white', borderRadius: '50%', padding: '4px', display: 'flex' }}>
                                <img src={logo} alt="Logo" style={{ height: '24px' }} />
                            </div>
                            4-in-Juan
                        </h2>
                        <p>
                            Offering a wide range of medical monitoring services. Ensuring access to healthcare that meets international standards for every individual.
                        </p>
                    </div>

                    <div className="footer-links">
                        <h4>Platform</h4>
                        <ul>
                            <a href="#">About Us</a>
                            <a href="#">Features</a>
                            <a href="#">Our Team</a>
                            <a href="#">Contact</a>
                        </ul>
                    </div>

                    <div className="footer-links">
                        <h4>Contact</h4>
                        <ul>
                            <li>P: (02) 8123-4567</li>
                            <li>E: care@4injuan.com</li>
                            <li>A: Rizal Technological University</li>
                        </ul>
                    </div>
                </div>

                <div className="footer-bottom">
                    &copy; {new Date().getFullYear()} 4-in-Juan Vital Sign Monitoring System. All Rights Reserved.
                </div>
            </footer>
        </div>
    );
};

export default StandbyRemote;
