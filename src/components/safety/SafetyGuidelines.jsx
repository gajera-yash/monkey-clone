import React, { useState, useEffect } from 'react';
import { 
    Shield, ShieldCheck, ShieldAlert, AlertTriangle, Eye, Lock, 
    UserCheck, Ban, Info, ChevronLeft, Flag, Users, Heart, 
    Camera, Mic, Zap, MessageSquare, Phone, MapPin, Search,
    CheckCircle, XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SafetyGuidelines = () => {
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState('overview');

    const sections = [
        { id: 'overview', icon: <ShieldCheck size={16} />, title: "Safety Overview" },
        { id: 'age', icon: <Users size={16} />, title: "Age Verification" },
        { id: 'behavior', icon: <Ban size={16} />, title: "Prohibited Behavior" },
        { id: 'personal', icon: <Heart size={16} />, title: "Personal Safety" },
        { id: 'reporting', icon: <Flag size={16} />, title: "Reporting Abuse" },
        { id: 'mental', icon: <Zap size={16} />, title: "Well-being" }
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

    const safetyTips = [
        { icon: <ShieldCheck className="text-emerald-400" />, text: "AI-Powered Real-time Moderation" },
        { icon: <UserCheck className="text-blue-400" />, text: "Verified Creator Program" },
        { icon: <Flag className="text-rose-400" />, text: "Instant Reporting with Evidence" },
        { icon: <Lock className="text-purple-400" />, text: "End-to-End Encrypted Calls" }
    ];

    return (
        <div className="min-h-screen bg-[#08080a] text-white font-sans selection:bg-rose-500/30">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-rose-600/5 rounded-full blur-[140px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/5 rounded-full blur-[140px]" />
            </div>

            <div className="relative max-w-7xl mx-auto px-6 py-20 z-10">
                {/* Back Button */}
                <button 
                    onClick={() => navigate('/')}
                    className="group flex items-center gap-2 text-white/40 hover:text-white transition-all mb-12 bg-white/5 px-4 py-2 rounded-full border border-white/5 hover:border-white/10"
                >
                    <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold text-sm tracking-tight">Back to Home</span>
                </button>

                {/* Hero section */}
                <div id="overview" className="grid lg:grid-cols-2 gap-16 items-center mb-24 scroll-mt-24">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 mb-6 font-black text-[10px] uppercase tracking-[0.2em] text-rose-400">
                            <ShieldAlert size={12} />
                            <span>Safety First Protocol</span>
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter leading-none italic">
                            Safety <span className="text-rose-500">Guidelines</span>
                        </h1>
                        <p className="text-xl text-white/50 font-medium leading-relaxed mb-12 max-w-lg">
                            Your well-being is our top priority. We've built a multi-layered security system to ensure every connection on Strangy is respectful and secure.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            {safetyTips.map((tip, idx) => (
                                <div key={idx} className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                                    <div className="shrink-0">{tip.icon}</div>
                                    <span className="text-xs font-bold text-white/70 leading-tight">{tip.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative">
                        <div className="aspect-square rounded-[60px] bg-gradient-to-br from-rose-500/20 to-blue-600/20 border border-white/10 p-8 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                            <div className="relative z-10 h-full flex flex-col justify-center items-center text-center">
                                <ShieldCheck size={120} className="text-rose-500 mb-8 animate-pulse" />
                                <h3 className="text-3xl font-black mb-4 uppercase tracking-tighter italic">Always Protected</h3>
                                <p className="text-white/40 font-bold text-sm uppercase tracking-widest leading-relaxed">
                                    AI-DRIVEN MODERATION <br /> RUNNING IN REAL TIME
                                </p>
                            </div>
                            {/* Decorative scanning line */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-50 animate-scan pointer-events-none"></div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-12 items-start h-full">
                    {/* Sticky Sidebar Navigation */}
                    <div className="lg:w-72 shrink-0 sticky top-32 self-start">
                        <div className="space-y-1 bg-white/[0.02] backdrop-blur-3xl border border-white/5 p-4 rounded-[32px]">
                            <h4 className="px-4 text-[10px] font-black uppercase tracking-[0.3em] text-rose-500 mb-6 py-2 border-b border-rose-500/10">Navigation</h4>
                            {sections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => scrollToSection(section.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 text-left group ${
                                        activeSection === section.id 
                                            ? 'bg-rose-500/10 text-rose-400 translate-x-2' 
                                            : 'text-white/30 hover:text-white/70 hover:translate-x-1'
                                    }`}
                                >
                                    <div className={`transition-all duration-300 ${
                                        activeSection === section.id 
                                            ? 'scale-110 text-rose-400' 
                                            : 'opacity-40 group-hover:opacity-100'
                                    }`}>
                                        {section.icon}
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-widest truncate">{section.title}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 space-y-32">
                        {/* section 1: Age */}
                        <section id="age" className="scroll-mt-24">
                            <div className="flex items-center gap-6 mb-12">
                                <span className={`text-7xl font-black italic transition-colors duration-500 ${activeSection === 'age' ? 'text-rose-500' : 'text-white/5'}`}>01</span>
                                <div>
                                    <h2 className="text-4xl font-black italic uppercase tracking-tight">Age Verification</h2>
                                    <div className="h-1.5 w-12 bg-rose-500 rounded-full mt-2" />
                                </div>
                            </div>
                            <div className="grid md:grid-cols-3 gap-8">
                                <div className="bg-white/5 p-10 rounded-[40px] border border-white/5 hover:border-rose-500/30 transition-all">
                                    <Users size={40} className="text-rose-400 mb-6" />
                                    <h4 className="text-xl font-black mb-4">18+ Requirement</h4>
                                    <p className="text-white/40 font-medium leading-relaxed font-bold uppercase text-xs tracking-wider">
                                        Strangy is strictly for adults. This ensures a mature environment and protects minors from inappropriate content.
                                    </p>
                                </div>
                                <div className="bg-white/5 p-10 rounded-[40px] border border-white/5 hover:border-rose-500/30 transition-all">
                                    <Search size={40} className="text-blue-400 mb-6" />
                                    <h4 className="text-xl font-black mb-4">Strict Enforcement</h4>
                                    <p className="text-white/40 font-medium leading-relaxed font-bold uppercase text-xs tracking-wider">
                                        We verify age via random document checks, AI pattern detection, and community reports.
                                    </p>
                                </div>
                                <div className="bg-white/5 p-10 rounded-[40px] border border-white/5 hover:border-rose-500/30 transition-all">
                                    <AlertTriangle size={40} className="text-orange-400 mb-6" />
                                    <h4 className="text-xl font-black mb-4">Minor Protection</h4>
                                    <p className="text-white/40 font-medium leading-relaxed font-bold uppercase text-xs tracking-wider">
                                        If you encounter a minor, report them immediately. We investigate within 1 hour and delete illegal accounts.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* section 2: behavior */}
                        <section id="behavior" className="scroll-mt-24">
                            <div className="flex items-center gap-6 mb-12">
                                <span className={`text-7xl font-black italic transition-colors duration-500 ${activeSection === 'behavior' ? 'text-blue-500' : 'text-white/5'}`}>02</span>
                                <div>
                                    <h2 className="text-4xl font-black italic uppercase tracking-tight">Prohibited Behavior</h2>
                                    <div className="h-1.5 w-12 bg-blue-500 rounded-full mt-2" />
                                </div>
                            </div>
                            <div className="grid lg:grid-cols-2 gap-8">
                                <div className={`p-12 rounded-[50px] border transition-all duration-700 ${activeSection === 'behavior' ? 'bg-rose-500/10 border-rose-500/30' : 'bg-rose-500/5 border-rose-500/10'}`}>
                                    <div className="flex items-center gap-4 mb-8">
                                        <Ban className="text-rose-500" size={32} />
                                        <h3 className="text-2xl font-black underline decoration-rose-500/30 underline-offset-8">Zero Tolerance</h3>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="flex gap-4">
                                            <XCircle className="text-rose-500 shrink-0 mt-1" size={20} />
                                            <p className="text-white/70 font-bold text-sm uppercase italic tracking-tight"><strong className="text-white">NSFW Content:</strong> Nudity, sexual acts, or lewd poses trigger an instant ban by our AI moderation.</p>
                                        </div>
                                        <div className="flex gap-4">
                                            <XCircle className="text-rose-500 shrink-0 mt-1" size={20} />
                                            <p className="text-white/70 font-bold text-sm uppercase italic tracking-tight"><strong className="text-white">Harassment:</strong> Verbal abuse, hate speech, or persistent unwanted contact is strictly forbidden.</p>
                                        </div>
                                        <div className="flex gap-4">
                                            <XCircle className="text-rose-500 shrink-0 mt-1" size={20} />
                                            <p className="text-white/70 font-bold text-sm uppercase italic tracking-tight"><strong className="text-white">Illegal Acts:</strong> Drug promotion, weapon display, and scammers result in immediate bans.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className={`p-12 rounded-[50px] border transition-all duration-700 ${activeSection === 'behavior' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-500/5 border-blue-500/10'}`}>
                                    <div className="flex items-center gap-4 mb-8">
                                        <Zap className="text-blue-500" size={32} />
                                        <h3 className="text-2xl font-black underline decoration-blue-500/30 underline-offset-8">Strike System</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Strike 01</span>
                                            <p className="text-white/50 text-[10px] font-black uppercase">Formal Warning</p>
                                        </div>
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                                            <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Strike 02</span>
                                            <p className="text-white/50 text-[10px] font-black uppercase">24-Hr Suspension</p>
                                        </div>
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                                            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Strike 03</span>
                                            <p className="text-white/50 text-[10px] font-black uppercase">Permanent Ban</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* section 3: personal safety */}
                        <section id="personal" className="scroll-mt-24">
                            <div className="flex items-center gap-6 mb-12">
                                <span className={`text-7xl font-black italic transition-colors duration-500 ${activeSection === 'personal' ? 'text-purple-500' : 'text-white/5'}`}>03</span>
                                <div>
                                    <h2 className="text-4xl font-black italic uppercase tracking-tight">Personal Safety</h2>
                                    <div className="h-1.5 w-12 bg-purple-500 rounded-full mt-2" />
                                </div>
                            </div>
                            <div className="bg-white/5 backdrop-blur-3xl p-12 rounded-[80px] border border-white/10 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                                    <Heart size={300} />
                                </div>
                                <div className="grid md:grid-cols-2 gap-16 relative z-10">
                                    <div>
                                        <h4 className="text-2xl font-black mb-10 italic uppercase tracking-tighter text-rose-500 underline underline-offset-[12px]">Never Share</h4>
                                        <ul className="space-y-6">
                                            {['Full name or Government ID', 'Precise live location', 'Personal phone or email', 'Financial or bank details'].map((item, i) => (
                                                <li key={i} className="flex items-center gap-4 text-white/40 font-black uppercase tracking-[0.05em] text-xs">
                                                    <XCircle size={18} className="text-rose-500/50" />
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="border-l border-white/5 pl-16">
                                        <h4 className="text-2xl font-black mb-10 italic uppercase tracking-tighter text-blue-500 underline underline-offset-[12px]">Stay Vigilant</h4>
                                        <ul className="space-y-6">
                                            {['Trust your core instinct', 'Watch for red flag behavior', 'Ignore money requests', 'Stay on-platform only'].map((item, i) => (
                                                <li key={i} className="flex items-center gap-4 text-white/40 font-black uppercase tracking-[0.05em] text-xs">
                                                    <CheckCircle size={18} className="text-blue-500/50" />
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* section 4: Reporting */}
                        <section id="reporting" className="scroll-mt-24">
                            <div className="bg-gradient-to-br from-rose-600 to-rose-900 rounded-[80px] p-20 text-center relative overflow-hidden group shadow-[0_0_120px_rgba(225,29,72,0.15)]">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                                <ShieldAlert size={100} className="mx-auto mb-10 text-white group-hover:scale-110 transition-transform duration-700" />
                                <h2 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter mb-10 leading-none">Emergency Report</h2>
                                <p className="text-3xl text-white/90 font-black italic leading-[1.2] mb-16 max-w-3xl mx-auto uppercase">
                                    Click the <span className="text-black bg-white px-4 py-1 rounded-2xl not-italic">REPORT</span> button immediately. 
                                    <br />
                                    <span className="text-xl text-white/60">Priority investigation within 60 minutes.</span>
                                </p>
                                <div className="flex flex-wrap justify-center gap-8">
                                    <div className="flex items-center gap-4 bg-white/10 px-8 py-5 rounded-[32px] backdrop-blur-2xl border border-white/20 hover:bg-white/20 transition-all cursor-pointer">
                                        <MessageSquare size={24} className="text-white" />
                                        <span className="font-black text-sm uppercase tracking-[0.2em]">safety@strangy.com</span>
                                    </div>
                                    <div className="flex items-center gap-4 bg-white/10 px-8 py-5 rounded-[32px] backdrop-blur-2xl border border-white/20 hover:bg-white/20 transition-all cursor-pointer">
                                        <Phone size={24} className="text-white" />
                                        <span className="font-black text-sm uppercase tracking-[0.2em]">Police (IN): 100</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* section 5: mental */}
                        <section id="mental" className="text-center py-20 pb-0 scroll-mt-24">
                            <Heart size={64} className={`mx-auto mb-10 transition-all duration-700 ${activeSection === 'mental' ? 'text-rose-500 scale-125' : 'text-white/10'}`} />
                            <h2 className="text-5xl font-black italic uppercase tracking-tighter mb-10">Well-being</h2>
                            <p className="text-white/30 font-black uppercase text-sm tracking-widest leading-relaxed max-w-2xl mx-auto mb-20 italic">
                                Your peace of mind matters more than our platform. Block liberally. Take breaks. 
                                <br />
                                <span className="text-rose-400/50 mt-4 block">wellbeing@strangy.com</span>
                            </p>
                            <div className="flex justify-center flex-wrap gap-8 text-[10px] font-black uppercase tracking-[0.4em] opacity-20 border-t border-white/5 pt-12">
                                <span>Updated: March 25, 2026</span>
                                <span>•</span>
                                <span>Secure Platform</span>
                                <span>•</span>
                                <span>© 2026 Strangy</span>
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes scan {
                    from { transform: translateY(0); }
                    to { transform: translateY(1000%); }
                }
                .animate-scan {
                    animation: scan 2s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default SafetyGuidelines;

