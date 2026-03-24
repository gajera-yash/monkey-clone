import React from 'react';
import { Eye, Shield, Database, Lock, UserPlus, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
    const navigate = useNavigate();

    const sections = [
        {
            icon: <UserPlus className="text-accent-blue" />,
            title: "1. Information We Collect",
            content: "We collect information you provide directly to us: username, email (via Google login), avatar, and birthdate. We also collect usage data, such as chat logs and connection information, to improve our service."
        },
        {
            icon: <Database className="text-accent-purple" />,
            title: "2. How We Use Data",
            content: "Your data is used to facilitate video matches, manage coin transactions, and ensure platform safety. We use automated AI systems (NSFW detection) to monitor live video streams for violations of our terms."
        },
        {
            icon: <Shield className="text-accent-pink" />,
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
        <div className="min-h-screen bg-dark-950 text-white font-sans selection:bg-accent-blue/30">
            {/* Background Decorations */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-blue/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-purple/10 rounded-full blur-[120px]" />
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

                <div className="mb-16">
                    <h1 className="text-5xl md:text-6xl font-black mb-6 tracking-tight">
                        Privacy <span className="text-gradient">Policy</span>
                    </h1>
                    <p className="text-xl text-white/60 font-medium">Last updated: March 22, 2026</p>
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
                                    <h3 className="text-2xl font-bold mb-4">{section.title}</h3>
                                    <p className="text-white/60 leading-relaxed text-lg">
                                        {section.content}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Disclaimer */}
                <div className="mt-20 text-center border-t border-white/5 pt-12 text-white/40 text-sm">
                    <p>© 2026 Strangy. We prioritize your privacy and data security.</p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
