import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
    MonitorHeart,
    Psychology,
    History,
    ArrowForward,
    MedicalServices,
    Security,
    Speed,
    Spa,
    Close,
    Groups,
    Code
} from '@mui/icons-material';
import logo from '../../../assets/images/juan.png';
import kevinImg from '../../../assets/images/team/kevin.jpg';
import bernieImg from '../../../assets/images/team/bernie.jpg';
import khinImg from '../../../assets/images/team/khin.jpg';
import reymartImg from '../../../assets/images/team/reymart.jpg';
import erickImg from '../../../assets/images/team/erick.jpg';
import paulImg from '../../../assets/images/team/paul.jpg';
import yuriImg from '../../../assets/images/team/yuri.jpg';
import './StandbyRemote.css';

const TEAM_MEMBERS = [
    { name: "Mar Kevin Alcantara", role: "Developer", image: kevinImg },
    { name: "Bernie Berongoy", role: "Developer", image: bernieImg },
    { name: "Khin Andrei Gamboa", role: "Developer", image: khinImg },
    { name: "Reymart Llona", role: "Developer", image: reymartImg },
    { name: "Erick Oavenada", role: "Developer", image: erickImg },
    { name: "Paul Andrew Relevo", role: "Developer", image: paulImg },
    { name: "Yuri Lorenz Sagadraca", role: "Developer", image: yuriImg }
];
// ... (existing code)

const FEATURES_DATA = [
    {
        id: 'vitals',
        icon: <MonitorHeart style={{ fontSize: 40 }} />,
        title: "Instant Vitals",
        description: "Get accurate readings for Blood Pressure, Heart Rate, SpO2, and Body Temperature in seconds.",
        details: "Our integrated sensors provide hospital-grade accuracy for your daily checkups. Within moments, you'll see your vital signs visualized in real-time on our dashboard, allowing for immediate health awareness."
    },
    {
        id: 'ai',
        icon: <Psychology style={{ fontSize: 40 }} />,
        title: "AI Analysis",
        description: "Smart algorithms detect anomalies and predict potential health risks.",
        details: "Powered by advanced machine learning, the 4-in-Juan system analyzes your historical data against medical baselines to flag potential irregularities like hypertension or arrhythmia before they become critical."
    },
    {
        id: 'records',
        icon: <History style={{ fontSize: 40 }} />,
        title: "Digital Records",
        description: "Securely store and track your medical history over time.",
        details: "Say goodbye to paper logs. All your measurements are automatically saved to your secure digital profile, making it easy to share your long-term health trends with your doctor or family members."
    }
];

const StandbyRemote = () => {
    const navigate = useNavigate();
    const [activeModal, setActiveModal] = useState(null); // 'team' | feature object | null

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2,
                delayChildren: 0.3,
            },
        },
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { type: 'spring', stiffness: 100 }
        },
    };

    const floatingVariant = {
        animate: {
            y: [0, -20, 0],
            rotate: [0, 2, -2, 0],
            transition: {
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
            }
        }
    };

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleFeatureClick = (feature) => {
        setActiveModal(feature);
    };

    const handleTeamClick = () => {
        setActiveModal('team');
    };

    const closeModal = () => {
        setActiveModal(null);
    };

    return (
        <div className="standby-wrapper">
            <div className="background-blobs">
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
                <div className="blob blob-3"></div>
            </div>

            <div className="standby-content">
                {/* Navbar */}
                <motion.nav
                    className="glass-navbar"
                    initial={{ y: -100 }}
                    animate={{ y: 0 }}
                    transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                >
                    <div className="nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ cursor: 'pointer' }}>
                        <div className="logo-container">
                            <img src={logo} alt="Logo" />
                        </div>
                        <span>4-in-Juan</span>
                    </div>
                    <motion.button
                        className="nav-btn-shine"
                        onClick={() => navigate('/login')}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Sign In
                    </motion.button>
                </motion.nav>

                {/* Hero Section */}
                <header className="hero-section">
                    <motion.div
                        className="hero-text-content"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <motion.div variants={itemVariants} className="badge-pill">
                            <Spa fontSize="small" /> <span>Next Gen Health Monitoring</span>
                        </motion.div>

                        <motion.h1 variants={itemVariants} className="hero-title">
                            Your Health, <br />
                            <span className="gradient-text">Reimagined.</span>
                        </motion.h1>

                        <motion.p variants={itemVariants} className="hero-description">
                            Experience the future of healthcare with our 4-in-1 vital sign monitoring system.
                            Accurate, fast, and accessible everywhere.
                        </motion.p>

                        <motion.div variants={itemVariants} className="hero-actions">
                            <motion.button
                                className="btn-primary-glass"
                                onClick={() => navigate('/login')}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Enter Dashboard
                            </motion.button>
                            <motion.button
                                className="btn-secondary-glass"
                                onClick={() => navigate('/register/welcome')}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Create Account
                            </motion.button>
                        </motion.div>
                    </motion.div>

                    <motion.div
                        className="hero-visual"
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <motion.div
                            className="hero-card-glass"
                            variants={floatingVariant}
                            animate="animate"
                        >
                            <div className="glow-effect"></div>
                            <img src={logo} alt="Hero Visual" className="hero-main-image" />
                            <div className="floating-card card-1">
                                <MonitorHeart className="icon-pulse" />
                                <span>Heart Rate</span>
                                <strong>72 BPM</strong>
                            </div>
                            <div className="floating-card card-2">
                                <MedicalServices className="icon-blue" />
                                <span>Status</span>
                                <strong>Optimal</strong>
                            </div>
                        </motion.div>
                    </motion.div>
                </header>

                {/* Services Section */}
                <section id="services" className="features-section">
                    <motion.div
                        className="section-header"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2>Why Choose Us?</h2>
                        <p>Advanced technology meets compassionate care. Click on a feature to learn more.</p>
                    </motion.div>

                    <motion.div
                        className="features-grid"
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                    >
                        {FEATURES_DATA.map((feature, index) => (
                            <FeatureCard
                                key={feature.id}
                                icon={feature.icon}
                                title={feature.title}
                                desc={feature.description}
                                delay={0.1 * (index + 1)}
                                onClick={() => handleFeatureClick(feature)}
                            />
                        ))}
                    </motion.div>
                </section>

                {/* About Stats Section */}
                <section className="stats-section">
                    <div className="stats-container-glass">
                        <div className="stat-item">
                            <h3>99%</h3>
                            <p>Accuracy</p>
                        </div>
                        <div className="divider"></div>
                        <div className="stat-item">
                            <h3>24/7</h3>
                            <p>Monitoring</p>
                        </div>
                        <div className="divider"></div>
                        <div className="stat-item">
                            <h3>Secure</h3>
                            <p>Encrypted Data</p>
                        </div>
                    </div>
                </section>

                {/* Info Section */}
                <section id="about" className="info-section">
                    <motion.div
                        className="info-content-glass"
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.7 }}
                        viewport={{ once: true }}
                    >
                        <div className="info-text">
                            <h2>Comprehensive Care</h2>
                            <p>
                                4-in-Juan is dedicated to providing accessible and accurate health monitoring.
                                We combine state-of-the-art hardware sensors with intelligent analysis to give you a complete picture of your health.
                            </p>
                            <ul className="feature-list">
                                <li>
                                    <Speed className="list-icon" /> Fast Results in Seconds
                                </li>
                                <li>
                                    <Security className="list-icon" /> Military-grade Encryption
                                </li>
                                <li>
                                    <MedicalServices className="list-icon" /> Professional Standards
                                </li>
                            </ul>

                            <motion.button
                                className="btn-team-glass"
                                onClick={handleTeamClick}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <Groups style={{ marginRight: 8 }} /> Meet the Developers
                            </motion.button>
                        </div>
                        <div className="info-visual-abstract">
                            <div className="circle-graphic c1"></div>
                            <div className="circle-graphic c2"></div>
                            <div className="dev-icon-float">
                                <Code style={{ fontSize: 60, color: 'rgba(234, 28, 44, 0.2)' }} />
                            </div>
                        </div>
                    </motion.div>
                </section>

                {/* CTA Section */}
                <section className="cta-section">
                    <motion.div
                        className="cta-glass-card"
                        whileHover={{ scale: 1.01 }}
                        transition={{ type: "spring", stiffness: 300 }}
                    >
                        <div className="cta-content">
                            <h2>Ready to prioritize your health?</h2>
                            <p>Join thousands of users who trust 4-in-Juan for their daily monitoring.</p>
                            <motion.button
                                className="btn-cta-large"
                                onClick={() => navigate('/register/welcome')}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                Get Started Now
                            </motion.button>
                        </div>
                    </motion.div>
                </section>

                {/* Footer */}
                <footer id="contact" className="modern-footer">
                    <div className="footer-glass-layer">
                        <div className="footer-top">
                            <div className="footer-brand-col">
                                <div className="footer-logo">
                                    <img src={logo} alt="Logo" />
                                    <span>4-in-Juan</span>
                                </div>
                                <p>Empowering health through innovation.</p>
                            </div>
                            <div className="footer-links-col">
                                <h4>Platform</h4>
                                <button onClick={() => scrollToSection('about')} className="footer-link-btn">About</button>
                                <button onClick={() => scrollToSection('services')} className="footer-link-btn">Services</button>
                                <button onClick={() => scrollToSection('contact')} className="footer-link-btn">Contact</button>
                            </div>
                            <div className="footer-contact-col">
                                <h4>Contact</h4>
                                <span>(02) 8123-4567</span>
                                <span>care@4injuan.com</span>
                            </div>
                        </div>
                        <div className="footer-copyright">
                            &copy; {new Date().getFullYear()} 4-in-Juan Vital Sign Monitoring.
                        </div>
                    </div>
                </footer>
            </div>

            {/* Global Modal Overlay */}
            <AnimatePresence>
                {activeModal && (
                    <ModalOverlay onClose={closeModal}>
                        {activeModal === 'team' ? (
                            <TeamContent />
                        ) : (
                            <FeatureContent feature={activeModal} />
                        )}
                    </ModalOverlay>
                )}
            </AnimatePresence>
        </div>
    );
};

// Sub-component for Service Cards
const FeatureCard = ({ icon, title, desc, delay, onClick }) => {
    return (
        <motion.div
            className="feature-card-glass"
            variants={{
                hidden: { y: 50, opacity: 0 },
                visible: { y: 0, opacity: 1 }
            }}
            whileHover={{ y: -10, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
            onClick={onClick}
        >
            <div className="icon-wrapper">
                {icon}
            </div>
            <h3>{title}</h3>
            <p>{desc}</p>
            <div className="card-arrow">
                <ArrowForward />
            </div>
        </motion.div>
    );
};

// Modal Components
const ModalOverlay = ({ onClose, children }) => (
    <motion.div
        className="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
    >
        <motion.div
            className="modal-content-glass"
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            onClick={(e) => e.stopPropagation()}
        >
            <button className="modal-close-btn" onClick={onClose}>
                <Close />
            </button>
            {children}
        </motion.div>
    </motion.div>
);

const FeatureContent = ({ feature }) => (
    <div className="modal-body">
        <div className="modal-icon-large">
            {feature.icon}
        </div>
        <h2>{feature.title}</h2>
        <p className="modal-desc-text">{feature.details}</p>
        <p className="modal-sub-text">{feature.description}</p>
    </div>
);

// Helper Component for Team Card
const TeamMemberCard = ({ member, index }) => (
    <motion.div
        className="team-member-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
    >
        <div className="member-profile-img">
            {member.image ? (
                <img src={member.image} alt={member.name} />
            ) : (
                <div className="placeholder-avatar">{member.name.charAt(0)}</div>
            )}
        </div>
        <div className="member-info">
            <h4>{member.name}</h4>
            <span>{member.role}</span>
        </div>
    </motion.div>
);

const TeamContent = () => {
    // Kevin is index 0, then 3 members, then 3 members
    const leader = TEAM_MEMBERS[0];
    const row2 = TEAM_MEMBERS.slice(1, 4);
    const row3 = TEAM_MEMBERS.slice(4, 7);

    return (
        <div className="modal-body">
            <div className="modal-icon-large team-icon-bg">
                <Groups style={{ fontSize: 50, color: '#fff' }} />
            </div>
            <h2>Meet the Developers</h2>
            <p className="modal-desc-text">The brilliant minds behind 4-in-Juan Vital Sign Monitoring System.</p>

            <div className="team-custom-layout">
                {/* Row 1: Kevin (Centered) */}
                <div className="team-row-centered">
                    <TeamMemberCard member={leader} index={0} />
                </div>

                {/* Row 2: 3 Members */}
                <div className="team-row-centered">
                    {row2.map((member, idx) => (
                        <TeamMemberCard key={idx} member={member} index={idx + 1} />
                    ))}
                </div>

                {/* Row 3: 3 Members */}
                <div className="team-row-centered">
                    {row3.map((member, idx) => (
                        <TeamMemberCard key={idx} member={member} index={idx + 4} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StandbyRemote;
