import React from 'react';
import { RiVidiconLine, RiMicLine, RiShieldLine, RiRefreshLine } from 'react-icons/ri';

const PermissionModal = ({ isOpen, onGrant, error }) => {
    if (!isOpen) return null;

    const isSecureContextError = error && (
        error.includes('navigator.mediaDevices is undefined') ||
        error.toString().includes('TypeError') ||
        !window.isSecureContext
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fade-in">
            <div className="bg-dark-800 border border-white/10 rounded-[40px] max-w-lg w-full p-10 shadow-2xl relative overflow-hidden animate-slide-up">
                {/* Decorative backgrounds */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent-purple/10 blur-[100px] -mr-32 -mt-32 rounded-full pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-pink/10 blur-[100px] -ml-32 -mb-32 rounded-full pointer-events-none"></div>

                <div className="text-center relative z-10">
                    <div className="w-24 h-24 bg-gradient-to-tr from-accent-purple to-accent-pink rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-purple-500/20 rotate-12 transition-transform hover:rotate-0">
                        <RiVidiconLine className="text-5xl text-white -rotate-12" />
                    </div>

                    <h2 className="text-3xl font-black text-white mb-4 tracking-tight leading-tight">
                        Enable Your Camera & Microphone
                    </h2>
                    
                    <p className="text-gray-400 mb-10 text-lg leading-relaxed">
                        To match and video chat with strangers instantly, we need permission to access your media devices.
                    </p>

                    {error && (
                        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-left">
                            <span className="text-xl shrink-0">⚠️</span>
                            <div>
                                <p className="text-red-400 font-bold text-sm mb-1">Access Denied/Failed</p>
                                <p className="text-red-300/70 text-xs">{error}</p>
                            </div>
                        </div>
                    )}

                    {isSecureContextError && (
                        <div className="mb-8 bg-yellow-500/5 border border-yellow-500/20 p-5 rounded-2xl text-left">
                            <h4 className="text-yellow-400 font-bold text-sm mb-3 flex items-center gap-2">
                                <RiShieldLine className="text-lg" /> Connection Security Issue
                            </h4>
                            <p className="text-yellow-100/60 text-xs leading-relaxed">
                                Browsers block camera access on insecure connections (http). Please use <strong className="text-yellow-200">localhost</strong> or <strong className="text-yellow-200">HTTPS</strong>.
                            </p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <button
                            onClick={onGrant}
                            className="w-full py-5 bg-gradient-to-r from-accent-purple to-accent-pink hover:scale-[1.02] active:scale-95 text-white rounded-2xl font-black text-lg transition-all shadow-xl shadow-purple-500/30"
                        >
                            {error ? "RETRY ACCESS" : "GRANT PERMISSION"}
                        </button>
                        
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-4 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                        >
                            <RiRefreshLine className="text-xl" /> REFRESH PAGE
                        </button>
                    </div>

                    <p className="mt-8 text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em]">
                        YOUR PRIVACY IS PROTECTED by our safety filters
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PermissionModal;

