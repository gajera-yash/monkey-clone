import React from 'react';
import { Shield, Scale, UserCheck, AlertTriangle, FileText, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TermsOfService = () => {
    const navigate = useNavigate();

    const sections = [
        {
            icon: <UserCheck className="text-[#6c3fcf]" />,
            title: "1. Acceptance of Terms",
            content: "By accessing and using Strangy, you agree to be bound by these Terms of Service. If you do not agree, please do not use the service. Use of the platform is restricted to individuals aged 18 or older."
        },
        {
            icon: <Scale className="text-[#a855f7]" />,
            title: "2. Community Guidelines",
            content: "We maintain a high standard for our community. Prohibited behaviors include: nudity or sexually explicit content (monitored by AI), harassment, hate speech, bullying, and underage usage. Violations result in immediate strikes or permanent bans."
        },
        {
            icon: <Shield className="text-[#ec4899]" />,
            title: "3. User Responsibilities",
            content: "Users are responsible for their interactions. While we use AI to detect NSFW content and offer reporting tools, you use the service at your own risk. Do not share personal information (address, phone numbers, financial data) during video calls."
        },
        {
            icon: <FileText className="text-yellow-500" />,
            title: "4. Monetization & Coins",
            content: "Coins purchased on the platform are non-refundable. They have no cash value outside the platform. We reserve the right to change pricing or discontinue coin packages at any time. Subscriptions are billed periodically and can be cancelled in settings."
        },
        {
            icon: <AlertTriangle className="text-red-500" />,
            title: "5. Termination",
            content: "We reserve the right to terminate or suspend your account at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users of the service, us, or third parties."
        }
    ];

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white font-sans selection:bg-purple-500/30 overflow-x-hidden">
            {/* Background Decorations */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative max-w-4xl mx-auto px-6 py-20">
                {/* Header */}
                <button 
                    onClick={() => navigate('/')}
                    className="group flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-12"
                >
                    <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium outline-none">Back to Home</span>
                </button>

                <div className="mb-16">
                    <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter">
                        Terms of <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">Service</span>
                    </h1>
                    <p className="text-xl text-white/40 font-medium">Last updated: March 22, 2026</p>
                </div>

                {/* Content Sections */}
                <div className="space-y-6">
                    {sections.map((section, idx) => (
                        <div key={idx} className="bg-white/5 backdrop-blur-xl border border-white/5 rounded-[32px] p-8 group hover:bg-white/[0.07] transition-all duration-500">
                            <div className="flex flex-col md:flex-row items-start gap-6">
                                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                                    {section.icon}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-2xl font-black mb-3 text-white/90">{section.title}</h3>
                                    <p className="text-white/50 leading-relaxed text-lg font-medium">
                                        {section.content}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Disclaimer */}
                <div className="mt-20 text-center border-t border-white/5 pt-12 text-white/20 text-xs font-black uppercase tracking-widest">
                    <p>© 2026 Strangy. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
};

export default TermsOfService;
