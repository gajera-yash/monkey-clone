import React from 'react';
import { ShieldCheck, VideoOff, Headphones, UserMinus } from 'lucide-react';

const SafetyInfoModal = ({ onClose }) => {

    const features = [
        {
            icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
            iconBg: "bg-emerald-400/20",
            iconBorder: "border-emerald-400/40",
            title: "Keeping it clean",
            desc: "Real-time automatic moderation"
        },
        {
            icon: <VideoOff className="w-6 h-6 text-orange-400" />,
            iconBg: "bg-orange-400/20",
            iconBorder: "border-orange-400/40",
            title: "Screen recordings",
            desc: "No recording without consent"
        },
        {
            icon: <Headphones className="w-6 h-6 text-blue-400" />,
            iconBg: "bg-blue-400/20",
            iconBorder: "border-blue-400/40",
            title: "24/7 Support",
            desc: "Reports are reviewed around the clock"
        },
        {
            icon: <UserMinus className="w-6 h-6 text-red-400" />,
            iconBg: "bg-red-400/20",
            iconBorder: "border-red-400/40",
            title: "18+ Only",
            desc: "Minors are not allowed to use Strangy"
        }
    ];

    return (
        <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in pointer-events-auto">
            <div className="bg-[#111111] w-full md:w-[420px] rounded-t-[32px] md:rounded-[32px] overflow-hidden flex flex-col shadow-2xl relative animate-fade-in-up border border-white/5">
                
                {/* Mobile Drag Handle */}
                <div className="w-full flex justify-center pt-4 pb-2 md:hidden">
                    <div className="w-12 h-1.5 bg-white/20 rounded-full"></div>
                </div>

                <div className="p-6 md:p-8 pt-2 md:pt-8 flex flex-col h-full overflow-y-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h2 className="text-white text-3xl font-black leading-tight tracking-tight">Stay safe and have<br/>fun!</h2>
                    </div>

                    {/* Feature Rows */}
                    <div className="space-y-6 mb-8">
                        {features.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-full ${item.iconBg} border ${item.iconBorder} flex items-center justify-center shrink-0`}>
                                    {item.icon}
                                </div>
                                <div className="pt-1">
                                    <h3 className="text-white font-bold text-lg leading-tight mb-1">{item.title}</h3>
                                    <p className="text-gray-400 text-sm leading-snug">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bottom Info Box */}
                    <div className="bg-[#1a1a1a] rounded-2xl p-4 mb-6 relative">
                        <h4 className="text-white font-bold text-sm mb-1">Meet even more people!</h4>
                        <p className="text-gray-400 text-xs leading-relaxed">
                            Your profile may appear on our partner services to help you meet more people. You can turn this off anytime in Settings. <button className="text-gray-300 underline font-medium">Learn more</button>
                        </p>
                    </div>

                    {/* Button */}
                    <button 
                        onClick={onClose}
                        className="w-full bg-[#1ed760] hover:bg-[#1fdf64] text-black font-extrabold text-lg py-4 rounded-full transition-colors mb-6 shadow-lg shadow-[#1ed760]/20"
                    >
                        Got it
                    </button>

                    {/* Footer Link */}
                    <div className="text-center pb-2">
                        <p className="text-gray-400 text-sm">
                            Strangy <button className="text-gray-300 underline font-medium">Community Guidelines</button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SafetyInfoModal;
