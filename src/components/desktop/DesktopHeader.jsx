import React from 'react';
import { useAuth } from '../../context/AuthContext';

const DesktopHeader = ({ onShowProfile, onShowHistory }) => {
    const { currentUser } = useAuth();

    return (
        <header className="fixed top-0 left-0 right-0 h-16 bg-transparent flex items-center justify-between px-6 z-[100]">
            {/* Left Section */}
            <div className="flex items-center gap-4">
                <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-full text-white text-sm font-medium border border-white/5 backdrop-blur-md">
                    <span>📱</span> Get App
                </button>
                <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-full text-white text-sm font-medium border border-white/5 backdrop-blur-md text-green-400">
                    <span className="bg-green-500/20 rounded-full p-1 leading-none text-[10px]">🛡️</span> Safety Center
                </button>
                <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-full text-white text-sm font-medium border border-white/5 backdrop-blur-md">
                    <span>📺</span> Theater Mode
                </button>
                <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-full text-white text-sm font-medium border border-white/5 backdrop-blur-md">
                    <span className="text-yellow-400">🎫</span> Free Coins
                </button>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-4">
                <button className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white border border-white/5 backdrop-blur-md">
                    <span className="text-xl">🔍</span>
                </button>
                <button className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white border border-white/5 backdrop-blur-md">
                    <span className="text-xl">👑</span>
                </button>
                <button
                    onClick={onShowHistory}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white border border-white/5 backdrop-blur-md"
                >
                    <span className="text-xl">🕐</span>
                </button>
                <button className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white border border-white/5 backdrop-blur-md">
                    <span className="text-xl">💬</span>
                </button>
                <button
                    onClick={onShowProfile}
                    className="flex items-center gap-2"
                >
                    {currentUser?.photoURL ? (
                        <img src={currentUser.photoURL} alt="" className="w-10 h-10 rounded-full border-2 border-accent-pink object-cover" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-accent-pink flex items-center justify-center text-sm font-bold border-2 border-white/20">
                            {currentUser?.displayName?.charAt(0)?.toUpperCase() || 'Y'}
                        </div>
                    )}
                </button>
            </div>
        </header>
    );
};

export default DesktopHeader;
