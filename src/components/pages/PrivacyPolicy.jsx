import React, { useState, useEffect } from 'react';
import { 
    Shield, Eye, Database, Lock, UserPlus, ChevronLeft, 
    User, HardDrive, CreditCard, Mail, Globe, Settings, 
    Bell, ShieldAlert, Key, HelpCircle, Info, CheckCircle, 
    ExternalLink, Share2, Trash2, Clock, Monitor, PenTool,
    RefreshCw, Scale
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState('1');

    const sections = [
        {
            id: '1',
            icon: <Info className="text-blue-400" />,
            title: "1. Information We Collect",
            subsections: [
                {
                    subtitle: "1.1 Information You Provide Directly",
                    text: "**Account Info:** Email, Display name, DOB, Profile photo, Gender, Location. **Creator Info:** Full legal name, ID verification, Face/Voice samples, Bank details, PAN (India). **Payments:** Processed by Razorpay; we only receive confirmations."
                },
                {
                    subtitle: "1.2 Information Collected Automatically",
                    text: "**Usage Data:** Pages visited, time spent, device info, IP address. **Technical Data:** Browser type, resolution, language, cookies. **Video Metadata:** Call duration, participants, gifts sent. *We do NOT record video/audio.*"
                },
                {
                    subtitle: "1.3 Information from Third Parties",
                    text: "**Social Login:** Basic profile from Google/Facebook. **Analytics Providers:** Aggregated patterns via Google Analytics (non-PII)."
                }
            ]
        },
        {
            id: '2',
            icon: <Settings className="text-purple-400" />,
            title: "2. How We Use Your Information",
            subsections: [
                {
                    subtitle: "2.1 Service Provision",
                    text: "Manage accounts, enable matching, process payments, and provide support."
                },
                {
                    subtitle: "2.2 Safety and Security",
                    text: "Verify age, prevent fraud, enforce terms, and monitor via AI moderation."
                },
                {
                    subtitle: "2.3 Communication",
                    text: "Send account notifications, support responses, and promotional offers (opt-in)."
                },
                {
                    subtitle: "2.4 Creator Program",
                    text: "Verify eligibility, calculate earnings, and provide analytics."
                }
            ]
        },
        {
            id: '3',
            icon: <Share2 className="text-pink-400" />,
            title: "3. How We Share Your Information",
            subsections: [
                {
                    subtitle: "3.1 With Other Users",
                    text: "Display name and photo are visible to matched users and in match history."
                },
                {
                    subtitle: "3.2 With Service Providers",
                    text: "Razorpay (Payments), Supabase (Storage), Google Analytics (Statistics)."
                },
                {
                    subtitle: "3.3 Legal and Business",
                    text: "Disclosed if required by law, legal process, or during business transfers/mergers."
                }
            ]
        },
        {
            id: '4',
            icon: <Shield className="text-emerald-400" />,
            title: "4. Data Security",
            subsections: [
                {
                    subtitle: "4.1 Security Measures",
                    text: "Encryption in transit (TLS) and at rest, secure access controls, and peer-to-peer WebRTC connections (no video storage)."
                },
                {
                    subtitle: "4.2 User Responsibility",
                    text: "Keep passwords confidential, do not share accounts, and notify us of unauthorized access."
                },
                {
                    subtitle: "4.3 Data Breaches",
                    text: "We notify affected users and authorities within 72 hours of a confirmed breach."
                }
            ]
        },
        {
            id: '5',
            icon: <Clock className="text-orange-400" />,
            title: "5. Data Retention",
            subsections: [
                {
                    subtitle: "5.1 Active/Inactive Accounts",
                    text: "Retained while active. Inactive for 12 months may lead to archiving/coin expiration."
                },
                {
                    subtitle: "5.2 Deleted Accounts",
                    text: "Profile deleted within 30 days. Transaction records kept up to 7 years for legal reasons."
                },
                {
                    subtitle: "5.3 Creator Data",
                    text: "ID documents kept for account life + 2 years; earnings info kept for 7 years."
                }
            ]
        },
        {
            id: '6',
            icon: <Key className="text-cyan-400" />,
            title: "6. Your Privacy Rights",
            subsections: [
                {
                    subtitle: "6.1 Access and Deletion",
                    text: "Request a copy of data, update info, or delete your account through settings."
                },
                {
                    subtitle: "6.2 Marketing Opt-Out",
                    text: "Unsubscribe from promotional emails or disable notifications in settings."
                },
                {
                    subtitle: "6.3 Special Rights (India)",
                    text: "Right to confirm, access, portability, and to be forgotten. Response within 15 days."
                }
            ]
        },
        {
            id: '7',
            icon: <Database className="text-yellow-400" />,
            title: "7. Cookies and Tracking",
            subsections: [
                {
                    subtitle: "7.1 Types of Cookies",
                    text: "Essential (login), Analytics (Google), Preference (theme), and Advertising (targeted)."
                },
                {
                    subtitle: "7.2 Management",
                    text: "Manage via browser settings or privacy mode. Disabling may affect features."
                }
            ]
        },
        {
            id: '8',
            icon: <User className="text-rose-400" />,
            title: "8. Children's Privacy",
            content: "Strangy is strictly for users 18 years and older. We do not knowingly collect info from minors. Minor accounts discovered are immediately terminated and data is deleted."
        },
        {
            id: '9',
            icon: <Globe className="text-indigo-400" />,
            title: "9. International Data Transfers",
            content: "Data is primarily stored in India but may be transferred globally for backups and delivery. We use Standard Contractual Clauses (SCCs) and encryption for cross-border transfers."
        },
        {
            id: '10',
            icon: <ExternalLink className="text-slate-400" />,
            title: "10. Third-Party Links",
            content: "We are not responsible for privacy practices or content of third-party websites linked through our service. Please review their policies independently."
        },
        {
            id: '11',
            icon: <RefreshCw className="text-blue-400" />,
            title: "11. Changes to This Policy",
            content: "We may update this policy periodically. Material changes will be notified via email or in-app notice 30 days before taking effect."
        },
        {
            id: '12',
            icon: <Scale className="text-amber-400" />,
            title: "12. Compliance with Laws",
            content: "We comply with Indian laws (IT Act, Digital Personal Data Protection Act 2023) and strive to follow international data protection principles."
        },
        {
            id: '13',
            icon: <Mail className="text-purple-400" />,
            title: "13. Contact Us",
            subsections: [
                {
                    subtitle: "Privacy & Support",
                    text: "Email: privacy@strangy.com / support.strangy@gmail.com. Response within 48 hours."
                },
                {
                    subtitle: "Grievance Officer (India)",
                    text: "Email: grievance@strangy.com. Response within 24 hours; resolution within 15 days."
                },
                {
                    subtitle: "Registered Entity & Address",
                    text: "Legal Owner: GAJERA YASH VIPULBHAI. Address: Yoginagar Society, opp. Bapasitaram Society, Yogi Chowk, Puna Simada Road, Surat, Gujarat - 395010"
                }
            ]
        },
        {
            id: '14',
            icon: <CheckCircle className="text-emerald-400" />,
            title: "14. Your Consent",
            content: "By using Strangy, you consent to the collection, use, and transfer of information as described. You may withdraw consent at any time by deleting your account."
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
        <div className="min-h-screen bg-[#0a0a0c] text-white font-sans selection:bg-blue-500/30">
            {/* Background Decorations */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px]" />
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
                        Privacy <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500">Policy</span>
                    </h1>
                    <div className="flex items-center gap-4 text-white/40 font-bold uppercase tracking-widest text-sm">
                        <span>Version 3.0</span>
                        <div className="w-1 h-1 rounded-full bg-white/20" />
                        <span>Last updated: March 25, 2026</span>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-12 mt-12 items-start h-full">
                    {/* Sticky Sidebar Navigation */}
                    <div className="lg:w-80 shrink-0 sticky top-32 self-start">
                        <div className="space-y-2 max-h-[calc(100vh-160px)] overflow-y-auto pr-4 scrollbar-hide py-4 border-r border-white/5">
                            <h4 className="px-4 text-xs font-black uppercase tracking-[0.2em] text-white/30 mb-6">Contents</h4>
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
                                className={`scroll-mt-24 bg-white/[0.01] backdrop-blur-3xl border rounded-[40px] p-8 md:p-12 transition-all duration-700 ${
                                    activeSection === section.id 
                                        ? 'border-white/20 bg-white/[0.03] scale-[1.01]' 
                                        : 'border-white/5'
                                }`}
                            >
                                <div className="flex items-start gap-8 mb-8">
                                    <div className={`w-16 h-16 rounded-[24px] bg-white/5 flex items-center justify-center shrink-0 border border-white/10 transition-all duration-700 ${
                                        activeSection === section.id ? 'scale-110 -rotate-3 bg-blue-500/10 shadow-[0_0_40px_rgba(59,130,246,0.1)]' : ''
                                    }`}>
                                        {React.cloneElement(section.icon, { size: 32 })}
                                    </div>
                                    <div>
                                        <h2 className="text-3xl md:text-4xl font-black mb-1">{section.title}</h2>
                                        <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-transparent rounded-full" />
                                    </div>
                                </div>

                                {section.content && (
                                    <p className="text-white/60 leading-relaxed text-lg font-medium mb-8">
                                        {section.content}
                                    </p>
                                )}

                                {section.subsections && (
                                    <div className="grid grid-cols-1 gap-6">
                                        {section.subsections.map((sub, sidx) => (
                                            <div key={sidx} className="bg-white/[0.03] rounded-3xl p-6 border border-white/5 hover:border-white/10 transition-colors">
                                                <h4 className="text-lg font-bold mb-3 text-blue-400">{sub.subtitle}</h4>
                                                <div className="text-white/50 text-base leading-relaxed font-medium prose prose-invert max-w-none">
                                                    {sub.text.split('\n').map((line, i) => (
                                                        <p key={i} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white/80">$1</strong>') }} />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Transparency Commitment */}
                        <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-[40px] p-12 border border-blue-500/20 text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                            <Shield className="mx-auto mb-6 text-blue-400" size={48} />
                            <h2 className="text-3xl font-black mb-6">Transparency Commitment</h2>
                            <ul className="grid md:grid-cols-2 gap-4 text-left text-white/70 font-medium">
                                <li className="flex items-center gap-3">
                                    <CheckCircle size={18} className="text-blue-400 shrink-0" />
                                    <span>Never sell your personal information</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <CheckCircle size={18} className="text-blue-400 shrink-0" />
                                    <span>Never record your video or audio calls</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <CheckCircle size={10} className="text-blue-400 shrink-0" />
                                    <span>Ask for consent before new data uses</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <CheckCircle size={10} className="text-blue-400 shrink-0" />
                                    <span>Respond promptly to privacy requests</span>
                                </li>
                            </ul>
                        </div>

                        {/* Final Footer */}
                        <div className="mt-24 text-center border-t border-white/5 pt-12">
                            <p className="text-white/20 text-xs font-black uppercase tracking-[0.3em]">
                                © 2026 Strangy Video Chat. Prioritizing your data security and privacy.
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

export default PrivacyPolicy;

