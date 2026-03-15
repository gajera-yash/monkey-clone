import React from 'react';
import { Settings, Clock } from 'lucide-react';

const MaintenancePage = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-6">
            <div className="text-center max-w-md">
                {/* Animated Icon */}
                <div className="w-24 h-24 rounded-[32px] bg-indigo-600 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/30 animate-pulse">
                    <Settings size={48} className="text-white animate-spin" style={{ animationDuration: '3s' }} />
                </div>

                {/* Logo */}
                <div className="mb-6">
                    <span className="text-4xl font-black tracking-tighter text-white">STRANGY</span>
                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[6px] mt-1">Video Chat</div>
                </div>

                {/* Main Message */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-[32px] p-8 mb-6">
                    <h1 className="text-2xl font-black text-white mb-3 tracking-tight">
                        🔧 Under Maintenance
                    </h1>
                    <p className="text-slate-300 font-medium leading-relaxed">
                        We're working hard to improve your experience. The platform will be back online shortly.
                    </p>
                </div>

                {/* Status */}
                <div className="flex items-center justify-center gap-3 text-slate-400">
                    <Clock size={16} />
                    <span className="text-sm font-bold">Check back soon</span>
                </div>

              
            </div>
        </div>
    );
};

export default MaintenancePage;
