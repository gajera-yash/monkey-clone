import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCoins } from '../context/CoinsContext';
import { usePremium } from '../context/PremiumContext';
import CoinBalance from './coins/CoinBalance';
import CoinStoreModal from './coins/CoinStoreModal';
import PremiumModal from './premium/PremiumModal';
import PremiumBadge from './premium/PremiumBadge';

const Header = ({ onStartChat }) => {
    const { currentUser, logout } = useAuth();
    const { isPremium } = usePremium();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isStoreOpen, setIsStoreOpen] = useState(false);
    const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);

        return () => window.removeEventListener('scroll', handleScroll);
    }, [currentUser]);

    return (
        <header
            className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 border-b ${isScrolled
                ? 'bg-dark-900/80 backdrop-blur-md border-white/5 py-3 shadow-lg'
                : 'bg-transparent border-transparent py-5'
                }`}
        >
            <div className="container mx-auto px-6 flex justify-between items-center">
                {/* Logo */}
                <div
                    className="flex items-center space-x-3 cursor-pointer group"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                    <div className="relative">
                        <span className="text-3xl filter drop-shadow-lg group-hover:scale-110 transition-transform duration-200 inline-block">
                            🐵
                        </span>
                        <div className="absolute inset-0 bg-accent-purple/20 blur-lg rounded-full opacity-50"></div>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold tracking-tight leading-none text-white">
                            Strangy
                        </h1>
                        {isPremium && <span className="text-[10px] text-yellow-400 font-bold tracking-widest uppercase">Premium</span>}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex items-center space-x-4 md:space-x-6">
                    {currentUser ? (
                        <>
                            {!isPremium && (
                                <button
                                    onClick={() => setIsPremiumModalOpen(true)}
                                    className="hidden md:flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-dark-900 px-4 py-1.5 rounded-full font-bold text-xs hover:shadow-lg hover:shadow-orange-500/20 transition-all hover:scale-105"
                                >
                                    <span>💎</span>
                                    <span>GO PREMIUM</span>
                                </button>
                            )}

                            <CoinBalance onOpenStore={() => setIsStoreOpen(true)} />

                            <div className="relative">
                                <button
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="flex items-center space-x-3 focus:outline-none"
                                >
                                    <div className="relative">
                                        <img
                                            src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName}&background=random`}
                                            alt="User"
                                            className={`w-10 h-10 rounded-full border-2 ${isPremium ? 'border-yellow-400' : 'border-accent-purple'}`}
                                        />
                                        {isPremium && (
                                            <div className="absolute -bottom-1 -right-1 bg-dark-900 rounded-full p-0.5">
                                                <PremiumBadge size="sm" />
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-white font-medium hidden md:block">{currentUser.displayName}</span>
                                </button>

                                {/* Dropdown */}
                                {isMenuOpen && (
                                    <div className="absolute right-0 mt-3 w-48 bg-dark-800 border border-white/10 rounded-xl shadow-xl py-2 animate-fade-in z-50">
                                        <div className="px-4 py-2 border-b border-white/5">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm text-gray-400">Signed in as</p>
                                                {isPremium && <PremiumBadge size="sm" showText />}
                                            </div>
                                            <p className="text-white font-medium truncate">{currentUser.email || 'Guest'}</p>
                                        </div>

                                        {!isPremium && (
                                            <button
                                                onClick={() => { setIsPremiumModalOpen(true); setIsMenuOpen(false); }}
                                                className="w-full text-left px-4 py-2 text-yellow-400 hover:bg-white/5 transition-colors font-bold flex items-center gap-2"
                                            >
                                                <span>💎</span> Go Premium
                                            </button>
                                        )}

                                        <button
                                            onClick={logout}
                                            className="w-full text-left px-4 py-2 text-red-400 hover:bg-white/5 transition-colors"
                                        >
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <button
                                className="text-gray-300 hover:text-white font-medium transition-colors duration-200 text-sm hidden md:block"
                            >
                                About
                            </button>
                            <button
                                onClick={onStartChat}
                                className="bg-white/10 hover:bg-white/20 text-white border border-white/10 px-6 py-2 rounded-full font-medium transition-all duration-200 hover:scale-105 backdrop-blur-sm"
                            >
                                Login
                            </button>
                        </>
                    )}
                </nav>
            </div>

            <CoinStoreModal isOpen={isStoreOpen} onClose={() => setIsStoreOpen(false)} />
            <PremiumModal isOpen={isPremiumModalOpen} onClose={() => setIsPremiumModalOpen(false)} />
        </header>
    );
};

export default Header;
