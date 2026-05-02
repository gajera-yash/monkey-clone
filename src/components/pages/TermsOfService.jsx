import React, { useState, useEffect } from 'react';
import SEO from '../SEO';

import { 
    Shield, Scale, UserCheck, AlertTriangle, FileText, ChevronLeft, 
    Calendar, Key, UserPlus, Ban, Coins, Crown, Camera, 
    ShieldAlert, Lock, ExternalLink, Handshake, Gavel, RefreshCw, 
    LogOut, Settings, Mail, CheckCircle, Navigation
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TermsOfService = () => {
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState('1');

    const sections = [
        {
            id: '1',
            icon: <UserCheck className="text-blue-400" />,
            title: "1. Acceptance of Terms",
            content: "Welcome to Strangy. By accessing or using our platform, you agree to be bound by these Terms of Service (\"Terms\"). Please read them carefully. By creating an account, accessing, or using Strangy's website, mobile application, or services (collectively, the \"Service\"), you agree to comply with and be bound by these Terms, our Privacy Policy, and Safety Guidelines. If you do not agree to these Terms, you must not use our Service."
        },
        {
            id: '2',
            icon: <Calendar className="text-purple-400" />,
            title: "2. Eligibility",
            subsections: [
                {
                    subtitle: "2.1 Age Requirement",
                    text: "You must be at least 18 years of age to use Strangy. By using the Service, you represent and warrant that you are 18 years or older, have the legal capacity to enter into this agreement, and are not prohibited from using the Service under applicable law."
                },
                {
                    subtitle: "2.2 Account Suspension",
                    text: "We reserve the right to verify your age at any time. Failure to provide proof of age when requested will result in immediate account suspension."
                }
            ]
        },
        {
            id: '3',
            icon: <Key className="text-pink-400" />,
            title: "3. Account Registration and Security",
            subsections: [
                {
                    subtitle: "3.1 Account Creation",
                    text: "To access certain features, you must create an account by providing a valid email address, display name, date of birth, and optional profile photo."
                },
                {
                    subtitle: "3.2 Account Security",
                    text: "You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. Notify us immediately of any unauthorized use."
                },
                {
                    subtitle: "3.3 Account Termination",
                    text: "You may delete your account at any time through account settings. We may suspend or terminate your account for violation of these Terms without prior notice."
                }
            ]
        },
        {
            id: '4',
            icon: <Ban className="text-red-400" />,
            title: "4. Prohibited Conduct",
            content: "You agree NOT to:",
            subsections: [
                {
                    subtitle: "4.1 Content Violations",
                    text: "Transmit, display, or share any content that is sexually explicit, pornographic, violent, graphic, disturbing, hateful, discriminatory, harassing, infringing on intellectual property rights, false, misleading, or fraudulent."
                },
                {
                    subtitle: "4.2 User Behavior",
                    text: "Harass, abuse, threaten, or intimidate other users; impersonate any person; solicit money/personal info; promote illegal activities; or share others' contact info without consent."
                },
                {
                    subtitle: "4.3 Technical Violations",
                    text: "Use bots/automated tools, bypass security, reverse engineer the Service, overload infrastructure, or access others' accounts without authorization."
                },
                {
                    subtitle: "4.4 Commercial Violations",
                    text: "Use the Service for unauthorized commercial purposes, advertise third-party products without permission, or scrape user data for commercial use."
                }
            ],
            footer: "Violations may result in immediate account suspension, permanent ban, and legal action."
        },
        {
            id: '5',
            icon: <Coins className="text-yellow-400" />,
            title: "5. Coin System and Payments",
            subsections: [
                {
                    subtitle: "5.1 Virtual Currency",
                    text: "Strangy uses a virtual currency system called \"Coins\" which can be purchased using real money through our payment processor (Razorpay)."
                },
                {
                    subtitle: "5.2 Coin Packages",
                    text: "Coins are sold in packages at prices displayed at time of purchase. All purchases are final and non-refundable unless required by law. Coins have no real-world monetary value and may expire after 12 months of inactivity."
                },
                {
                    subtitle: "5.3 Pricing Changes",
                    text: "We reserve the right to modify coin prices at any time. Changes apply to future purchases only."
                },
                {
                    subtitle: "5.4 Free Coins and Bonuses",
                    text: "Daily login rewards and promotional coins are granted at our discretion and may be modified or discontinued without notice."
                },
                {
                    subtitle: "5.5 Refund Policy",
                    text: "Refunds are generally not available once coins are added. They may be issued for technical errors or unauthorized charges if requested within 48 hours."
                }
            ]
        },
        {
            id: '6',
            icon: <Crown className="text-orange-400" />,
            title: "6. Subscription Plans",
            subsections: [
                {
                    subtitle: "6.1 Subscription Tiers",
                    text: "Strangy offers optional subscription plans (Bronze, Silver, Gold) with monthly or annual billing."
                },
                {
                    subtitle: "6.2 Auto-Renewal",
                    text: "Subscriptions automatically renew at the end of each billing period. Cancel anytime through account settings to avoid the next charge."
                },
                {
                    subtitle: "6.3 Cancellation",
                    text: "Cancellations take effect at the end of the current billing period. No partial refunds are provided."
                },
                {
                    subtitle: "6.4 Changes to Subscription Plans",
                    text: "We may modify subscription features or pricing with 30 days' notice to active subscribers."
                }
            ]
        },
        {
            id: '7',
            icon: <Camera className="text-emerald-400" />,
            title: "7. Creator Program",
            subsections: [
                {
                    subtitle: "7.1 Eligibility",
                    text: "To join, you must be 18+, complete identity verification (face and voice), provide valid bank info, and accept the Creator Agreement."
                },
                {
                    subtitle: "7.2 Earnings",
                    text: "Creators earn coins through calls, gifts, and private sessions. Commission rates are displayed in the dashboard."
                },
                {
                    subtitle: "7.3 Withdrawals",
                    text: "Minimum withdrawal is ₹500. Processing takes 2-5 business days. We may withhold earnings pending investigation."
                },
                {
                    subtitle: "7.4 Creator Responsibilities",
                    text: "Maintain professional conduct, honor sessions, respond to reports within 24h, and comply with all guidelines."
                },
                {
                    subtitle: "7.5 Creator Account Termination",
                    text: "Termination may occur for policy violations, fraud, poor ratings, or inactivity exceeding 60 days."
                }
            ]
        },
        {
            id: '8',
            icon: <FileText className="text-cyan-400" />,
            title: "8. Content and Intellectual Property",
            subsections: [
                {
                    subtitle: "8.1 User Content",
                    text: "You retain ownership of your content but grant Strangy a worldwide, non-exclusive, royalty-free license to host, store, display, moderate, and removal violate content."
                },
                {
                    subtitle: "8.2 Strangy's Intellectual Property",
                    text: "All software code, design elements, logos, trademarks, and text/graphics are owned by Strangy and protected by law."
                },
                {
                    subtitle: "8.3 Prohibited Uses of Our IP",
                    text: "You may not copy, modify, distribute our software, use our trademarks without permission, or create derivative works."
                }
            ]
        },
        {
            id: '9',
            icon: <ShieldAlert className="text-rose-400" />,
            title: "9. Safety and Moderation",
            subsections: [
                {
                    subtitle: "9.1 AI Content Moderation",
                    text: "We use AI to detect inappropriate content in real-time, which may result in blurring feeds, issuing strikes, or disconnecting calls."
                },
                {
                    subtitle: "9.2 Reporting System",
                    text: "Users can report violations via the report button, with screenshots or detailed descriptions."
                },
                {
                    subtitle: "9.3 Strike System",
                    text: "1st Strike: Warning; 2nd Strike: 24h suspension; 3rd Strike: Permanent ban. Severe violations may result in immediate permanent ban."
                },
                {
                    subtitle: "9.4 Appeals",
                    text: "Appeal moderation decisions by contacting support.strangy@gmail.com within 7 days."
                }
            ]
        },
        {
            id: '10',
            icon: <Lock className="text-indigo-400" />,
            title: "10. Privacy and Data Protection",
            subsections: [
                {
                    subtitle: "10.1 Data Collection",
                    text: "We collect account info, usage data, and payment info as described in our Privacy Policy."
                },
                {
                    subtitle: "10.2 Video and Audio",
                    text: "Video calls are NOT recorded. AI analyzes frames in real-time without storing them. Screenshots from reports are stored for moderation."
                },
                {
                    subtitle: "10.3 User Data Requests",
                    text: "Request access, deletion, or export of your data through settings or by contacting support.strangy@gmail.com."
                }
            ]
        },
        {
            id: '11',
            icon: <ExternalLink className="text-slate-400" />,
            title: "11. Third-Party Services",
            subsections: [
                {
                    subtitle: "11.1 Payment Processing",
                    text: "We use Razorpay. By purchasing, you agree to Razorpay's terms and privacy policy."
                },
                {
                    subtitle: "11.2 Analytics",
                    text: "We use tools like Google Analytics to improve our Service."
                },
                {
                    subtitle: "11.3 Third-Party Links",
                    text: "We are not responsible for the content or practices of linked third-party websites."
                }
            ]
        },
        {
            id: '12',
            icon: <Scale className="text-amber-400" />,
            title: "12. Disclaimers and Limitations of Liability",
            subsections: [
                {
                    subtitle: "12.1 Service \"As-Is\"",
                    text: "The Service is provided without warranties of any kind regarding fitness for purpose, uninterrupted operation, or accuracy of user info."
                },
                {
                    subtitle: "12.2 Limitation of Liability",
                    text: "Strangy shall not be liable for indirect, incidental, or consequential damages, loss of profits, or damages from user interactions."
                },
                {
                    subtitle: "12.3 Maximum Liability",
                    text: "Our total liability shall not exceed the amount you paid to Strangy in the 12 months preceding the claim."
                },
                {
                    subtitle: "12.4 User Responsibility",
                    text: "You are solely responsible for interactions, content shared/received, and compliance with local laws."
                }
            ]
        },
        {
            id: '13',
            icon: <Handshake className="text-red-400" />,
            title: "13. Indemnification",
            content: "You agree to indemnify and hold harmless Strangy, its officers, directors, employees, and agents from any claims, damages, or expenses arising from your violation of these Terms, your violation of any rights of another person, your use of the Service, or content you post or share."
        },
        {
            id: '14',
            icon: <Gavel className="text-zinc-400" />,
            title: "14. Dispute Resolution",
            subsections: [
                {
                    subtitle: "14.1 Governing Law",
                    text: "These Terms are governed by the laws of India, without regard to conflict of law principles."
                },
                {
                    subtitle: "14.2 Jurisdiction",
                    text: "Any disputes shall be resolved in the courts of Surat, Gujarat, India."
                },
                {
                    subtitle: "14.3 Arbitration",
                    text: "Before filing a lawsuit, you agree to attempt good-faith negotiation. Unsuccessful disputes may be resolved through binding arbitration under the Indian Arbitration and Conciliation Act, 1996."
                },
                {
                    subtitle: "14.4 Class Action Waiver",
                    text: "You agree to resolve disputes individually and waive the right to participate in class actions."
                }
            ]
        },
        {
            id: '15',
            icon: <RefreshCw className="text-blue-400" />,
            title: "15. Changes to Terms",
            subsections: [
                {
                    subtitle: "15.1 Modifications",
                    text: "We may modify these Terms at any time. Changes are effective immediately for new users and 30 days after notification for existing users."
                },
                {
                    subtitle: "15.2 Notification",
                    text: "We will notify you of material changes via email, prominent notice on the Service, or in-app notification."
                },
                {
                    subtitle: "15.3 Continued Use",
                    text: "Your continued use of the Service after changes take effect constitutes acceptance of the modified Terms."
                }
            ]
        },
        {
            id: '16',
            icon: <LogOut className="text-red-400" />,
            title: "16. Termination",
            subsections: [
                {
                    subtitle: "16.1 By You",
                    text: "You may terminate your account at any time by deleting it in settings or contacting support.strangy@gmail.com."
                },
                {
                    subtitle: "16.2 By Us",
                    text: "We may suspend or terminate your account immediately for violations, fraudulent activity, legal requirements, or safety protection."
                },
                {
                    subtitle: "16.3 Effect of Termination",
                    text: "Access ends immediately, unused coins are forfeited, earnings may be withheld pending investigation, and content may be deleted."
                }
            ]
        },
        {
            id: '17',
            icon: <Settings className="text-slate-400" />,
            title: "17. Miscellaneous",
            subsections: [
                {
                    subtitle: "17.1 Entire Agreement",
                    text: "These Terms, along with our Privacy Policy and Safety Guidelines, constitute the entire agreement."
                },
                {
                    subtitle: "17.2 Severability",
                    text: "If any provision is found unenforceable, the remaining provisions remain in full effect."
                },
                {
                    subtitle: "17.3 Waiver",
                    text: "Failure to enforce any right does not constitute a waiver."
                },
                {
                    subtitle: "17.4 Assignment",
                    text: "We may assign our rights to any affiliate or successor."
                },
                {
                    subtitle: "17.5 Force Majeure",
                    text: "We are not liable for delays or failures due to circumstances beyond our reasonable control."
                }
            ]
        },
        {
            id: '18',
            icon: <Mail className="text-purple-400" />,
            title: "18. Contact Information",
            content: "For questions about these Terms:",
            subsections: [
                {
                    subtitle: "Email",
                    text: "support.strangy@gmail.com"
                },
                {
                    subtitle: "Support",
                    text: "support.strangy@gmail.com"
                },
                {
                    subtitle: "Address",
                    text: "Legal Owner: GAJERA YASH VIPULBHAI. Address: Yoginagar Society, opp. Bapasitaram Society, Yogi Chowk, Puna Simada Road, Surat, Gujarat - 395010"
                }
            ]
        },
        {
            id: '19',
            icon: <Navigation className="text-orange-400" />,
            title: "19. Special Provisions for Indian Users",
            subsections: [
                {
                    subtitle: "19.1 Consumer Protection",
                    text: "These Terms comply with the Consumer Protection Act, 2019."
                },
                {
                    subtitle: "19.2 Information Technology Act",
                    text: "We comply with the Information Technology Act, 2000 and the 2021 Rules."
                },
                {
                    subtitle: "19.3 Grievance Officer",
                    text: "For complaints: grievance@strangy.com (Response: 24h, Resolution: 15 days)"
                }
            ]
        },
        {
            id: '20',
            icon: <CheckCircle className="text-emerald-400" />,
            title: "Acknowledgment",
            content: "By clicking \"I Agree,\" creating an account, or using the Service, you acknowledge that you have read and understood these Terms, agree to be bound by them, are at least 18 years old, and will comply with all applicable laws."
        }
    ];

    useEffect(() => {
        const handleScroll = () => {
            const scrollPosition = window.scrollY + 100;
            for (const section of sections) {
                const element = document.getElementById(section.id);
                if (element) {
                    const { offsetTop, offsetHeight } = element;
                    if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
                        setActiveSection(section.id);
                        break;
                    }
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            window.scrollTo({
                top: element.offsetTop - 80,
                behavior: 'smooth'
            });
            setActiveSection(id);
        }
    };

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white font-sans selection:bg-purple-500/30">
            <SEO
                title="Terms of Service — Strangy"
                description="Read Strangy's terms of service to understand the rules and guidelines for using our platform."
                canonical="https://strangy.in/terms"
                noindex={true}
            />
            {/* Background Decorations */}

            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative max-w-7xl mx-auto px-6 py-20 z-10">
                {/* Header */}
                <button 
                    onClick={() => navigate('/')}
                    className="group flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-12"
                >
                    <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium outline-none">Back to Home</span>
                </button>

                <div className="mb-16">
                    <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tighter leading-none">
                        Terms of <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-orange-500">Service</span>
                    </h1>
                    <div className="flex items-center gap-4 text-white/40 font-bold uppercase tracking-widest text-sm">
                        <span>Version 2.0</span>
                        <div className="w-1 h-1 rounded-full bg-white/20" />
                        <span>Last updated: March 25, 2026</span>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-12 mt-12 items-start h-full">
                    {/* Sticky Sidebar Navigation */}
                    <div className="lg:w-80 shrink-0 sticky top-32 self-start">
                        <div className="space-y-2 max-h-[calc(100vh-160px)] overflow-y-auto pr-4 scrollbar-hide py-4 border-r border-white/5">
                            <h4 className="px-4 text-xs font-black uppercase tracking-[0.2em] text-white/30 mb-6">Navigation</h4>
                            {sections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => scrollToSection(section.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 text-left group ${
                                        activeSection === section.id 
                                            ? 'bg-white/10 text-white translate-x-2' 
                                            : 'text-white/40 hover:text-white/70 hover:translate-x-1'
                                    }`}
                                >
                                    <div className={`p-1.5 rounded-lg border transition-all duration-300 ${
                                        activeSection === section.id 
                                            ? 'bg-white/10 border-white/20 scale-110' 
                                            : 'bg-white/5 border-white/5 group-hover:border-white/10'
                                    }`}>
                                        {React.cloneElement(section.icon, { size: 16 })}
                                    </div>
                                    <span className="text-xs font-bold truncate leading-none">{section.title}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 space-y-12">
                        {sections.map((section) => (
                            <div 
                                key={section.id} 
                                id={section.id}
                                className={`scroll-mt-24 bg-white/[0.02] backdrop-blur-3xl border rounded-[40px] p-8 md:p-12 transition-all duration-700 ${
                                    activeSection === section.id 
                                        ? 'border-white/20 bg-white/[0.04] scale-[1.01]' 
                                        : 'border-white/5'
                                }`}
                            >
                                <div className="flex items-start gap-8 mb-8">
                                    <div className={`w-16 h-16 rounded-[24px] bg-white/5 flex items-center justify-center shrink-0 border border-white/10 transition-all duration-700 ${
                                        activeSection === section.id ? 'scale-110 rotate-6 shadow-[0_0_40px_rgba(255,255,255,0.05)]' : ''
                                    }`}>
                                        {React.cloneElement(section.icon, { size: 32 })}
                                    </div>
                                    <div>
                                        <h2 className="text-3xl md:text-4xl font-black mb-1">{section.title}</h2>
                                        <div className="h-1 w-20 bg-gradient-to-r from-purple-500 to-transparent rounded-full" />
                                    </div>
                                </div>

                                {section.content && (
                                    <p className="text-white/60 leading-relaxed text-lg font-medium mb-8">
                                        {section.content}
                                    </p>
                                )}

                                {section.subsections && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {section.subsections.map((sub, sidx) => (
                                            <div key={sidx} className="bg-white/5 rounded-3xl p-6 border border-white/5 hover:border-white/10 transition-colors">
                                                <h4 className="text-lg font-bold mb-3 text-white/90">{sub.subtitle}</h4>
                                                <p className="text-white/50 text-base leading-relaxed font-medium">
                                                    {sub.text}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {section.footer && (
                                    <div className="mt-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-100 font-bold text-sm flex items-center gap-3">
                                        <ShieldAlert size={20} className="shrink-0" />
                                        <p>{section.footer}</p>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Final Footer */}
                        <div className="mt-24 text-center border-t border-white/5 pt-12">
                            <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/5 mb-8">
                                <Shield className="text-purple-400" size={16} />
                                <span className="text-xs font-black uppercase tracking-widest text-white/40">Secured & Moderated Documentation</span>
                            </div>
                            <p className="text-white/20 text-xs font-black uppercase tracking-[0.3em]">
                                © 2026 Strangy Video Chat. All rights reserved. Professional Video Chat Platform.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};

export default TermsOfService;

