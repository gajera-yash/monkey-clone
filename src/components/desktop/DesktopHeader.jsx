import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import DesktopProfileModal from './modals/DesktopProfileModal';
import DesktopHistoryModal from './modals/DesktopHistoryModal';
import DesktopSubscriptionModal from './modals/DesktopSubscriptionModal';
import DesktopSearchModal from './modals/DesktopSearchModal';
import DesktopSafetyModal from './modals/DesktopSafetyModal';
import DesktopMatchPreferenceModal from './modals/DesktopMatchPreferenceModal';
import { useCoins } from '../../context/CoinsContext';

const DesktopHeader = () => {
    const { currentUser } = useAuth();
    const { coins } = useCoins();
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
                    <button
                        onClick={() => toggleModal('safety')}
                        className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${activeModal === 'safety' ? 'bg-yellow-400 text-black' : 'text-white/80 hover:bg-white/10'}`}
                    >
                        Safety Center
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
                            <span className="text-yellow-400 font-bold text-sm">{coins?.toLocaleString() || 0}</span>
                        </button>
                        {activeModal === 'subscription' && (
                            <div className="absolute top-14 right-0 z-[110]">
                                <DesktopSubscriptionModal onClose={() => setActiveModal(null)} />
                            </div>
                        )}
                    </div>

                    {/* Match History */}
                    <div className="relative">
                        <button
                            onClick={() => toggleModal('history')}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${activeModal === 'history' ? 'bg-yellow-400 text-black' : 'bg-purple-800/60 border border-purple-600/40 text-white/80 hover:bg-purple-700/60'}`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>
                        {activeModal === 'history' && (
                            <div className="absolute top-14 right-0 z-[110]">
                                <DesktopHistoryModal onClose={() => setActiveModal(null)} />
                            </div>
                        )}
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <button
                            onClick={() => toggleModal('search')}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${activeModal === 'search' ? 'bg-yellow-400 text-black' : 'bg-purple-800/60 border border-purple-600/40 text-white/80 hover:bg-purple-700/60'}`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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

                    {/* New Modals */}
                    {activeModal === 'safety' && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
                            <div className="pointer-events-auto">
                                <DesktopSafetyModal onClose={() => setActiveModal(null)} />
                            </div>
                        </div>
                    )}
                    {activeModal === 'preferences' && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
                            <div className="pointer-events-auto">
                                <DesktopMatchPreferenceModal onClose={() => setActiveModal(null)} />
                            </div>
                        </div>
                    )}
                </div>
            </header>
        </>
    );
};

export default DesktopHeader;
