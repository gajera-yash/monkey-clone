import React from 'react';
import { useAuth } from '../../../context/AuthContext';

const DesktopSafetyModal = ({ onClose }) => {
    const { currentUser, updateSafetySettings } = useAuth();
    const settings = currentUser?.safetySettings || {
        disableFriendRequests: false,
        invisibleMode: false
    };

    const handleToggle = (key) => {
        updateSafetySettings({
            ...settings,
            [key]: !settings[key]
        });
    };

    return (
        <div className="bg-[#1a172e] w-[360px] rounded-[24px] overflow-hidden flex flex-col shadow-2xl border border-white/5 relative pointer-events-auto">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-white/5 bg-[#24213a]">
                <h2 className="text-white text-base font-bold w-full text-center">Safety Center</h2>
                <button onClick={onClose} className="absolute right-6 text-white/60 hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="p-5 space-y-5">
                {/* Disable Friend Requests */}
                <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center relative overflow-hidden transition-transform group-hover:scale-110">
                            <span className="text-2xl">👫</span>
                            <div className="absolute bottom-0 right-0 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center border border-[#1a172e]">
                                <span className="text-[8px] text-white">🚫</span>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm">Disable friend requests</h3>
                            <p className="text-white/40 text-xs mt-0.5">Turn this on to stop receiving friend requests</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleToggle('disableFriendRequests')}
                        className={`w-14 h-8 rounded-full relative transition-all duration-300 ${settings.disableFriendRequests ? 'bg-purple-600' : 'bg-white/10'}`}
                    >
                        <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-lg ${settings.disableFriendRequests ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>

                {/* Invisible Mode */}
                <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center relative overflow-hidden transition-transform group-hover:scale-110">
                            <span className="text-2xl">👤</span>
                            <div className="absolute bottom-0 right-0 bg-yellow-400 rounded-full w-4 h-4 flex items-center justify-center border border-[#1a172e]">
                                <span className="text-[8px]">🙈</span>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-sm">Invisible mode</h3>
                            <p className="text-white/40 text-xs mt-0.5 max-w-[180px]">Won't show your real identity in match history</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleToggle('invisibleMode')}
                        className={`w-14 h-8 rounded-full relative transition-all duration-300 ${settings.invisibleMode ? 'bg-purple-600' : 'bg-white/10'}`}
                    >
                        <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-lg ${settings.invisibleMode ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DesktopSafetyModal;
