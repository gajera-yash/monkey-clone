import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/GlobalFooter.css';

const Footer = () => {
    return (
        <footer className="main-footer-landing">
            <div className="footer-top-landing">
                <div className="fbrand-landing">
                    <Link to="/" className="nav-logo-landing">
                        <img src="/logo.png" alt="Strangy Logo" className="h-8 md:h-10 w-auto object-contain" />
                    </Link>
                    <p>Connecting people globally through spontaneous video chat.</p>
                    <p style={{ marginTop: 10, fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.6 }}>
                        Legal Entity: <strong>Strangy Video Chat</strong><br />
                        Yoginagar Society, opp. Bapasitaram Society, Yogi Chowk, Puna Simada Road, Surat, Gujarat - 395010<br />
                        Support: <a href="mailto:support.strangy@gmail.com">support.strangy@gmail.com</a>
                    </p>
                </div>
                
                <div className="flinks-landing">
                    <h4>Company</h4>
                    <ul>
                        <li><Link to="/about">About</Link></li>
                        <li><Link to="/safety">Safety Guidelines</Link></li>
                        <li><Link to="/terms">Terms of Service</Link></li>
                        <li><Link to="/privacy">Privacy Policy</Link></li>
                    </ul>
                </div>
                
                <div className="flinks-landing">
                    <h4>Support</h4>
                    <ul>
                        <li><Link to="/help">Help Center</Link></li>
                        <li><Link to="/contact">Contact Us</Link></li>
                        <li><Link to="/report-bug">Report a Bug</Link></li>
                        <li><Link to="/community">Community</Link></li>
                    </ul>
                </div>
                
                {false && (
                    <div className="flinks-landing">
                        <h4>Get The App</h4>
                        <div className="app-btns-landing">
                            <a href="#" className="app-btn-landing">
                                <span className="app-btn-icon-landing">🍎</span>
                                <div><span>Download on the</span><strong>App Store</strong></div>
                            </a>
                            <a href="#" className="app-btn-landing">
                                <span className="app-btn-icon-landing">🤖</span>
                                <div><span>Get it on</span><strong>Google Play</strong></div>
                            </a>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="footer-bottom-landing">
                <p>© 2026 Strangy Video Chat. All rights reserved. &nbsp;·&nbsp;
                    <Link to="/safety" style={{ color: 'inherit', opacity: .65 }}>Safety Guidelines</Link> &nbsp;·&nbsp;
                    <Link to="/terms" style={{ color: 'inherit', opacity: .65 }}>Terms of Service</Link> &nbsp;·&nbsp;
                    <Link to="/privacy" style={{ color: 'inherit', opacity: .65 }}>Privacy Policy</Link>
                </p>

                <div className="socials-landing">
                    <a href="#" className="soci-landing">𝕏</a>
                    <a href="#" className="soci-landing">in</a>
                    <a href="#" className="soci-landing">f</a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
