import React from 'react';
import { Eye, Shield, Database, Lock, UserPlus, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
    const navigate = useNavigate();

    const sections = [
        {
            icon: <UserPlus className="text-[#3b82f6]" />,
            title: "1. Information We Collect",
            content: "We collect information you provide directly to us: username, email (via Google login), avatar, and birthdate. We also collect usage data, such as chat logs and connection information, to improve our service."
        },
        {
            icon: <Database className="text-[#8b5cf6]" />,
            title: "2. How We Use Data",
            content: "Your data is used to facilitate video matches, manage coin transactions, and ensure platform safety. We use automated AI systems (NSFW detection) to monitor live video streams for violations of our terms."
        },
        {
            icon: <Shield className="text-[#ec4899]" />,
            title: "3. Data Sharing",
            content: "We do not sell your personal data to third parties. We may share information with service providers (Supabase, Razorpay) only to the extent necessary to provide the service. Public profile data (username, avatar) is visible to matched users."
        },
        {
            icon: <Lock className="text-yellow-500" />,
            title: "4. Security",
            content: "We implement industry-standard security measures to protect your data. However, no method of transmission over the Internet is 100% secure. You are encouraged to use strong passwords and avoid sharing sensitive personal data in video chats."
        },
        {
            icon: <Eye className="text-green-500" />,
            title: "5. Your Rights",
            content: "You have the right to access, update, or delete your personal information. You can manage your profile settings within the dashboard. For complete account deletion, please contact our support team."
        }
    ];

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
            {/* Background Decorations */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />
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
                        Privacy <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">Policy</span>
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
                    <p>© 2026 Strangy. We prioritize your privacy and data security.</p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
