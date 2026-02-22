import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import DesktopProfileModal from './modals/DesktopProfileModal';
import DesktopHistoryModal from './modals/DesktopHistoryModal';
import DesktopSubscriptionModal from './modals/DesktopSubscriptionModal';
import DesktopSearchModal from './modals/DesktopSearchModal';

const DesktopHeader = () => {
    const { currentUser } = useAuth();
    const [activeModal, setActiveModal] = useState(null);

    const toggleModal = (name) => {
        setActiveModal(prev => prev === name ? null : name);
    };

    return (
        <>
            {/* Backdrop */}
            {activeModal && (
                <div className="fixed inset-0 z-[99]" onClick={() => setActiveModal(null)} />
            )}

            <header className="fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-6 z-[100]">
                {/* Left - Logo */}
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-purple-700 flex items-center justify-center border-2 border-purple-400/50">
                        <span className="text-white font-black text-sm">M</span>
                    </div>
                    <span className="text-white font-extrabold text-lg tracking-wide">MONKEY</span>
                </div>

                {/* Center - Navigation */}
                <div className="flex items-center gap-2">
                    <button className="px-5 py-2 rounded-full text-white/80 text-sm font-medium hover:bg-white/10 transition-colors">
                        Get App
                    </button>
                    <button className="px-5 py-2 rounded-full text-white/80 text-sm font-medium hover:bg-white/10 transition-colors">
                        Safety Center
                    </button>
                    <button className="px-5 py-2 rounded-full text-white/80 text-sm font-medium hover:bg-white/10 transition-colors">
                        Theater Mode
                    </button>
                    <button
                        onClick={() => toggleModal('subscription')}
                        className="px-5 py-2 rounded-full bg-purple-800/80 text-yellow-400 text-sm font-semibold border border-purple-600/50 hover:bg-purple-700/80 transition-colors"
                    >
                        Free Coins
                    </button>
                </div>

                {/* Right - Actions */}
                <div className="flex items-center gap-3">
                    {/* Coin Balance */}
                    <div className="relative">
                        <button
                            onClick={() => toggleModal('subscription')}
                            className="flex items-center gap-2 bg-purple-800/60 border border-purple-600/40 rounded-full px-4 py-2 hover:bg-purple-700/60 transition-colors"
                        >
                            <span className="text-base">🪙</span>
                            <span className="text-yellow-400 font-bold text-sm">2,450</span>
                        </button>
                        {activeModal === 'subscription' && (
                            <div className="absolute top-14 right-0 z-[110]">
                                <DesktopSubscriptionModal onClose={() => setActiveModal(null)} />
                            </div>
                        )}
                    </div>

                    {/* Settings */}
                    <div className="relative">
                        <button
                            onClick={() => toggleModal('search')}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${activeModal === 'search' ? 'bg-yellow-400 text-black' : 'bg-purple-800/60 border border-purple-600/40 text-white/80 hover:bg-purple-700/60'}`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                        {activeModal === 'search' && (
                            <div className="absolute top-14 right-0 z-[110]">
                                <DesktopSearchModal onClose={() => setActiveModal(null)} />
                            </div>
                        )}
                    </div>

                    {/* Profile */}
                    <div className="relative">
                        <button
                            onClick={() => toggleModal('profile')}
                            className="flex items-center"
                        >
                            {currentUser?.photoURL ? (
                                <img src={currentUser.photoURL} alt="" className={`w-10 h-10 rounded-full object-cover border-2 ${activeModal === 'profile' ? 'border-yellow-400' : 'border-purple-400/50'}`} />
                            ) : (
                                <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white border-2 ${activeModal === 'profile' ? 'border-yellow-400' : 'border-purple-400/50'}`}>
                                    {currentUser?.displayName?.charAt(0)?.toUpperCase() || 'Y'}
                                </div>
                            )}
                        </button>
                        {activeModal === 'profile' && (
                            <div className="absolute top-14 right-0 z-[110]">
                                <DesktopProfileModal onClose={() => setActiveModal(null)} />
                            </div>
                        )}
                    </div>
                </div>
            </header>
        </>
    );
};

export default DesktopHeader;
