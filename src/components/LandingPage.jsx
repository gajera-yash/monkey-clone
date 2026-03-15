import React, { useState, useEffect, useRef } from 'react';
import '../styles/LandingPage.css';

const LandingPage = ({ onStartChat }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  
  const curRef = useRef(null);
  const curRingRef = useRef(null);
  const mousePos = useRef({ mx: 0, my: 0, rx: 0, ry: 0 });

  // Custom Cursor Logic
  useEffect(() => {
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) return;

    const handleMouseMove = (e) => {
      mousePos.current.mx = e.clientX;
      mousePos.current.my = e.clientY;
      if (curRef.current) {
        curRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
      }
    };

    const loop = () => {
      const { mx, my, rx, ry } = mousePos.current;
      mousePos.current.rx += (mx - rx) * 0.12;
      mousePos.current.ry += (my - ry) * 0.12;
      
      if (curRingRef.current) {
        curRingRef.current.style.transform = `translate(${mousePos.current.rx}px, ${mousePos.current.ry}px) translate(-50%, -50%)`;
      }
      requestAnimationFrame(loop);
    };

    const animFrame = requestAnimationFrame(loop);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animFrame);
    };
  }, []);

  // Hover effect for cursor
  useEffect(() => {
    const interactiveElements = document.querySelectorAll('a, button, .fq-landing');
    const handleMouseEnter = () => {
      if (curRef.current) curRef.current.style.transform += ' scale(1.8)';
      if (curRingRef.current) curRingRef.current.style.opacity = '0.3';
    };
    const handleMouseLeave = () => {
      if (curRingRef.current) curRingRef.current.style.opacity = '1';
    };

    interactiveElements.forEach(el => {
      el.addEventListener('mouseenter', handleMouseEnter);
      el.addEventListener('mouseleave', handleMouseLeave);
    });

    return () => {
      interactiveElements.forEach(el => {
        el.removeEventListener('mouseenter', handleMouseEnter);
        el.removeEventListener('mouseleave', handleMouseLeave);
      });
    };
  }, []);

  // Scroll Reveal Logic - Enhanced for React re-renders
  const [revealedItems, setRevealedItems] = useState(new Set());

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('data-reveal-id');
          if (id) {
            setRevealedItems(prev => new Set([...prev, id]));
          }
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    const revealedElements = document.querySelectorAll('[data-reveal-id]');
    revealedElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const profilesRow1 = [
    { img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=320&h=460&fit=crop&crop=face', name: '🇺🇸 David, 29', online: true },
    { img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=320&h=460&fit=crop&crop=face', name: '🇻🇳 LNgọc Anh, 23', online: false },
    { img: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=320&h=460&fit=crop&crop=face', name: '🇰🇷 현우, 29', online: false },
    { img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=320&h=460&fit=crop&crop=face', name: '🇰🇷 지수, 23', online: true },
    { img: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=320&h=460&fit=crop&crop=face', name: '🇺🇸 Amelia, 22', online: true },
    { img: 'https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=320&h=460&fit=crop&crop=face', name: '🇺🇸 Joshua, 25', online: true },
    { img: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=320&h=460&fit=crop&crop=face', name: '🇯🇵 Yuki, 24', online: true },
    { img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=320&h=460&fit=crop&crop=face', name: '🇮🇹 Marco, 27', online: false },
    { img: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=320&h=460&fit=crop&crop=face', name: '🇧🇷 Sofia, 21', online: true },
    { img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=320&h=460&fit=crop&crop=face', name: '🇬🇧 Ethan, 26', online: false },
    { img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=320&h=460&fit=crop&crop=face', name: '🇮🇳 Priya, 22', online: true },
    { img: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=320&h=460&fit=crop&crop=face', name: '🇫🇷 Luca, 28', online: true },
  ];

  const profilesRow2 = [
    { img: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=320&h=460&fit=crop&crop=face', name: '🇩🇪 Felix, 26', online: true },
    { img: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=320&h=460&fit=crop&crop=face', name: '🇨🇳 Mei, 24', online: true },
    { img: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=320&h=460&fit=crop&crop=face', name: '🇳🇬 Kofi, 28', online: false },
    { img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=320&h=460&fit=crop&crop=face', name: '🇸🇪 Hanna, 25', online: true },
    { img: 'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=320&h=460&fit=crop&crop=face', name: '🇺🇸 Tyler, 23', online: false },
    { img: 'https://images.unsplash.com/photo-1526510747491-58f928ec870f?w=320&h=460&fit=crop&crop=face', name: '🇯🇵 Hina, 22', online: true },
    { img: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=320&h=460&fit=crop&crop=face', name: '🇲🇽 Carlos, 30', online: false },
    { img: 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=320&h=460&fit=crop&crop=face', name: '🇵🇭 Anika, 21', online: true },
    { img: 'https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=320&h=460&fit=crop&crop=face', name: '🇺🇸 Jake, 27', online: true },
    { img: 'https://images.unsplash.com/photo-1524638431109-93d95c968f03?w=320&h=460&fit=crop&crop=face', name: '🇷🇺 Natasha, 24', online: false },
    { img: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=320&h=460&fit=crop&crop=face', name: '🇹🇷 Ayse, 23', online: true },
    { img: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=320&h=460&fit=crop&crop=face', name: '🇰🇷 Minjun, 26', online: true },
  ];

  const faqItems = [
    { q: "What Is Strangy?", a: "Strangy is a spontaneous video chat platform that connects you with random strangers from around the world — face-to-face, from the comfort of your home." },
    { q: "Is It Free to Use?", a: "Yes! Strangy is completely free. Simply log in with your Google account and start chatting immediately — no hidden fees or subscriptions." },
    { q: "How Do I Start a Chat?", a: "Click \"Start Chatting\", log in with Google, and you'll be instantly matched with a stranger for a live video call. The whole process takes under 10 seconds." },
    { q: "Is It Safe?", a: "We have built-in safety features, real-time moderation, and a reporting system. You can skip or end any chat at any time with a single click." },
    { q: "Is It Available on Mobile and Desktop?", a: "Yes! Strangy works seamlessly on both mobile and desktop browsers. Dedicated apps are also available on the App Store and Google Play." }
  ];

  return (
    <div className="landing-page-wrapper">
      <div className="cur" ref={curRef}></div>
      <div className="cur-ring" ref={curRingRef}></div>

      {/* NAV */}
      <nav className="main-nav-landing">
        <a href="#" className="nav-logo-landing">
          <div className="nav-logo-box-landing">🐵</div>
          <span className="grad-text">Strangy</span>
        </a>
        <ul className="nav-links-landing">
          <li><a href="#features">Features</a></li>
          <li><a href="#how">How It Works</a></li>
          <li><a href="#faq">FAQ</a></li>
          <li><a href="#">About</a></li>
          <li><button className="btn-nav-landing" onClick={onStartChat}>Login</button></li>
        </ul>
        <button 
          className={`hamburger-landing ${isMenuOpen ? 'open' : ''}`} 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Open menu"
        >
          <span></span><span></span><span></span>
        </button>
      </nav>

      <div className={`nav-drawer-landing ${isMenuOpen ? 'open' : ''}`}>
        <a href="#features" className="dlink" onClick={() => setIsMenuOpen(false)}>Features</a>
        <a href="#how" className="dlink" onClick={() => setIsMenuOpen(false)}>How It Works</a>
        <a href="#faq" className="dlink" onClick={() => setIsMenuOpen(false)}>FAQ</a>
        <a href="#" className="dlink" onClick={() => setIsMenuOpen(false)}>About</a>
        <button className="btn-nav-landing" onClick={onStartChat}>Login</button>
      </div>

      {/* HERO */}
      <section className="hero-landing">
        <div className="orb-landing orb-a-landing"></div>
        <div className="orb-landing orb-b-landing"></div>
        <div className="grid-bg-landing"></div>
        <div className="hero-inner-landing">
          <div className="badge-landing"><span className="dot-live-landing"></span>14k+ Users Online Now</div>
          <h1>Talk to<br /><span className="shimmer-landing">Strangers.</span></h1>
          <p className="hero-sub-landing">Spontaneous video connections with people from around the globe. Just start talking.</p>
          <div className="hero-cta-landing">
            <button className="btn-primary-landing" onClick={onStartChat}>Start Chatting &nbsp;→</button>
          </div>
          <p className="hero-note-landing">Login with Google required</p>
        </div>
        
        {/* PROFILES STRIP */}
        <div className="profiles-strip-landing">
          <div className="profiles-strip-label-landing">
            <span></span> People online right now <span></span>
          </div>

          <div className="profiles-track-wrap-landing">
            <div className="profiles-track-landing">
              {[...profilesRow1, ...profilesRow1].map((p, i) => (
                <div key={i} className="pcard-landing">
                  <img src={p.img} alt="" />
                  <div className="pcard-overlay-landing"></div>
                  {p.online && <div className="pcard-online-landing"><span className="odot-landing"></span>Online</div>}
                  <div className="pcard-info-landing"><div className="pcard-name-landing">{p.name}</div></div>
                </div>
              ))}
            </div>
          </div>

          <div className="profiles-track-wrap-landing">
            <div className="profiles-track-rev-landing">
              {[...profilesRow2, ...profilesRow2].map((p, i) => (
                <div key={i} className="pcard-landing">
                  <img src={p.img} alt="" />
                  <div className="pcard-overlay-landing"></div>
                  {p.online && <div className="pcard-online-landing"><span className="odot-landing"></span>Online</div>}
                  <div className="pcard-info-landing"><div className="pcard-name-landing">{p.name}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <div className={`stats-landing reveal ${revealedItems.has('stats') ? 'in' : ''}`} data-reveal-id="stats">
        <div className="sitem-landing"><div className="snum-landing">14k+</div><div className="slbl-landing">Users Online Now</div></div>
        <div className="sitem-landing"><div className="snum-landing">180+</div><div className="slbl-landing">Countries Connected</div></div>
        <div className="sitem-landing"><div className="snum-landing">2M+</div><div className="slbl-landing">Chats Started</div></div>
        <div className="sitem-landing"><div className="snum-landing">4.9★</div><div className="slbl-landing">App Store Rating</div></div>
      </div>

      {/* FEATURES */}
      <section className="features-landing" id="features">
        <div className={`features-head-landing reveal ${revealedItems.has('feat-head') ? 'in' : ''}`} data-reveal-id="feat-head">
          <span className="section-tag">What We Offer</span>
          <h2>Meet New <span className="grad-text">People</span></h2>
          <p>Discover a world of possibilities with features designed to make connection easy.</p>
        </div>
        <div className="fgrid-landing">
          <div className={`fc-landing reveal ${revealedItems.has('feat-1') ? 'in' : ''}`} data-reveal-id="feat-1">
            <div className="ficon-landing fi-v-landing">🎥</div>
            <h3>Dynamic Video Chats</h3>
            <p>Jump into real, face-to-face conversations that feel spontaneous and genuine.</p>
          </div>
          <div className={`fc-landing reveal ${revealedItems.has('feat-2') ? 'in' : ''}`} data-reveal-id="feat-2">
            <div className="ficon-landing fi-g-landing">🌍</div>
            <h3>Global Reach</h3>
            <p>Connect with people from different backgrounds and cultures worldwide.</p>
          </div>
          <div className={`fc-landing reveal ${revealedItems.has('feat-3') ? 'in' : ''}`} data-reveal-id="feat-3">
            <div className="ficon-landing fi-s-landing">🔒</div>
            <h3>Simplicity and Security</h3>
            <p>Enjoy a smooth experience with built-in safety features and moderation.</p>
          </div>
          <div className={`fc-landing reveal ${revealedItems.has('feat-4') ? 'in' : ''}`} data-reveal-id="feat-4">
            <div className="ficon-landing fi-r-landing">🔀</div>
            <h3>Random Matching</h3>
            <p>Start conversations in seconds with fast, one-tap matching.</p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-landing" id="how">
        <div className="how-inner-landing">
          <div className={`how-head-landing reveal ${revealedItems.has('how-head') ? 'in' : ''}`} data-reveal-id="how-head">
            <span className="section-tag">Get Started</span>
            <h2>How It <span className="grad-text">Works</span></h2>
            <p>Three simple steps to start talking with someone new anywhere in the world.</p>
          </div>
          <div className="sgrid-landing">
            <div className={`sc-landing reveal ${revealedItems.has('how-1') ? 'in' : ''}`} data-reveal-id="how-1">
              <div className="sn-landing">01</div>
              <div className="si-landing">🔑</div>
              <h3>Login with Google</h3>
              <p>Sign in instantly — no extra forms, no waiting around.</p>
            </div>
            <div className={`sc-landing reveal ${revealedItems.has('how-2') ? 'in' : ''}`} data-reveal-id="how-2">
              <div className="sn-landing">02</div>
              <div className="si-landing">🎯</div>
              <h3>Get Matched</h3>
              <p>Our system instantly connects you with a random stranger worldwide.</p>
            </div>
            <div className={`sc-landing reveal ${revealedItems.has('how-3') ? 'in' : ''}`} data-reveal-id="how-3">
              <div className="sn-landing">03</div>
              <div className="si-landing">💬</div>
              <h3>Start Talking</h3>
              <p>Face-to-face video chat begins immediately. Skip anytime to meet someone new.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-landing" id="faq">
        <div className={`faq-head-landing reveal ${revealedItems.has('faq-head') ? 'in' : ''}`} data-reveal-id="faq-head">
          <span className="section-tag">Got Questions?</span>
          <h2>Frequently Asked <span className="grad-text">Questions</span></h2>
          <p>Everything you need to know about Strangy.</p>
        </div>
        {faqItems.map((item, idx) => (
          <div key={idx} className={`fitem-landing reveal ${revealedItems.has(`faq-${idx}`) ? 'in' : ''} ${activeFaq === idx ? 'open' : ''}`} data-reveal-id={`faq-${idx}`}>
            <div className="fq-landing" onClick={() => toggleFaq(idx)}>
              <span>{item.q}</span>
              <div className="fq-icon-landing">+</div>
            </div>
            <div className="fa-landing"><p>{item.a}</p></div>
          </div>
        ))}
      </section>

      {/* CTA BANNER */}
      <div className={`ctabanner-landing reveal ${revealedItems.has('cta') ? 'in' : ''}`} data-reveal-id="cta">
        <h2>Ready to Meet Someone <span className="grad-text">New?</span></h2>
        <p>Join thousands of people already connecting around the world. It's free.</p>
        <button className="btn-primary-landing" onClick={onStartChat}>Start Chatting Now &nbsp;→</button>
      </div>

      {/* FOOTER */}
      <footer className="main-footer-landing">
        <div className="footer-top-landing">
          <div className="fbrand-landing">
            <a href="#" className="nav-logo-landing">
              <div className="nav-logo-box-landing">🐵</div>
              <span className="grad-text">Strangy</span>
            </a>
            <p>Connecting people globally through spontaneous video chat.</p>
          </div>
          <div className="flinks-landing">
            <h4>Company</h4>
            <ul>
              <li><a href="#">About</a></li>
              <li><a href="#">Safety Guidelines</a></li>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">Privacy Policy</a></li>
            </ul>
          </div>
          <div className="flinks-landing">
            <h4>Support</h4>
            <ul>
              <li><a href="#">Help Center</a></li>
              <li><a href="#">Contact Us</a></li>
              <li><a href="#">Report a Bug</a></li>
              <li><a href="#">Community</a></li>
            </ul>
          </div>
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
        </div>
        <div className="footer-bottom-landing">
          <p>© 2026 Strangy. All rights reserved. &nbsp;·&nbsp;
            <a href="#" style={{ color: 'inherit', opacity: .65 }}>Safety Guidelines</a> &nbsp;·&nbsp;
            <a href="#" style={{ color: 'inherit', opacity: .65 }}>Terms of Service</a>
          </p>
          <div className="socials-landing">
            <a href="#" className="soci-landing">𝕏</a>
            <a href="#" className="soci-landing">in</a>
            <a href="#" className="soci-landing">f</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
