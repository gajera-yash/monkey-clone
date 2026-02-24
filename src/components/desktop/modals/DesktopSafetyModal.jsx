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
        <div className="bg-[#1a172e] w-[450px] rounded-[32px] overflow-hidden flex flex-col shadow-2xl border border-white/5 relative pointer-events-auto">
            {/* Header */}
            <div className="p-6 flex items-center justify-between border-b border-white/5 bg-[#24213a]">
                <h2 className="text-white text-xl font-bold w-full text-center">Safety Center</h2>
                <button onClick={onClose} className="absolute right-6 text-white/60 hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="p-8 space-y-8">
                {/* Disable Friend Requests */}
                <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center relative overflow-hidden transition-transform group-hover:scale-110">
                            <span className="text-4xl">👫</span>
                            <div className="absolute bottom-1 right-1 bg-red-500 rounded-full w-6 h-6 flex items-center justify-center border-2 border-[#1a172e]">
                                <span className="text-[10px] text-white">🚫</span>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">Disable friend requests</h3>
                            <p className="text-white/40 text-sm mt-0.5">Turn this on to stop receiving friend requests</p>
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
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center relative overflow-hidden transition-transform group-hover:scale-110">
                            <span className="text-4xl">👤</span>
                            <div className="absolute bottom-1 right-1 bg-yellow-400 rounded-full w-6 h-6 flex items-center justify-center border-2 border-[#1a172e]">
                                <span className="text-[10px]">🙈</span>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg">Invisible mode</h3>
                            <p className="text-white/40 text-sm mt-0.5 max-w-[220px]">Once enabled, the other person won't see your real identity in match history</p>
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
