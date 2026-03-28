import React from 'react';
import { Shield, Scale, UserCheck, AlertTriangle, FileText, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TermsOfService = () => {
    const navigate = useNavigate();

    const sections = [
        {
            icon: <UserCheck className="text-accent-blue" />,
            title: "1. Acceptance of Terms",
            content: "By accessing and using Strangy, you agree to be bound by these Terms of Service. If you do not agree, please do not use the service. Use of the platform is restricted to individuals aged 18 or older."
        },
        {
            icon: <Scale className="text-accent-purple" />,
            title: "2. Community Guidelines",
            content: "We maintain a high standard for our community. Prohibited behaviors include: nudity or sexually explicit content (monitored by AI), harassment, hate speech, bullying, and underage usage. Violations result in immediate strikes or permanent bans."
        },
        {
            icon: <Shield className="text-accent-pink" />,
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
        <div className="min-h-screen bg-dark-950 text-white font-sans selection:bg-accent-purple/30">
            {/* Background Decorations */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-purple/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-blue/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative max-w-4xl mx-auto px-6 py-20">
                {/* Header */}
                <button 
                    onClick={() => navigate('/')}
                    className="group flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-12"
                >
                    <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium">Back to Home</span>
                </button>

                <div className="mb-16 mt-8 md:mt-0">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 tracking-tight">
                        Terms of <span className="text-gradient">Service</span>
                    </h1>
                    <p className="text-lg md:text-xl text-white/60 font-medium">Last updated: March 22, 2026</p>
                </div>

                {/* Content Sections */}
                <div className="space-y-8">
                    {sections.map((section, idx) => (
                        <div key={idx} className="glass-card p-8 group hover:border-white/10 transition-all duration-500">
                            <div className="flex items-start gap-6">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5 group-hover:scale-110 transition-transform duration-500">
                                    {section.icon}
                                </div>
                                <div>
                                    <h3 className="text-xl md:text-2xl font-bold mb-4">{section.title}</h3>
                                    <p className="text-white/60 leading-relaxed text-base md:text-lg">
                                        {section.content}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Disclaimer */}
                <div className="mt-20 text-center border-t border-white/5 pt-12 text-white/40 text-sm">
                    <p>© 2026 Strangy. All rights reserved. Professional video chat platform.</p>
                </div>
            </div>
        </div>
    );
};

export default TermsOfService;
