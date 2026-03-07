import React, { useState } from 'react';
import { useCoins } from '../../context/CoinsContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const DailyBonusModal = ({ isOpen, onClose }) => {
    const { claimDailyBonus } = useCoins();
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleClaim = async () => {
        setLoading(true);
        const success = await claimDailyBonus();
        setLoading(false);

        if (success) {
            toast.success("Awesome! Daily Bonus Claimed 🎉");
            onClose();
        } else {
            toast.error("Failed to claim bonus. Try again later.");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div className="bg-[#1a172e] border border-purple-500/30 rounded-3xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.15)] animate-fade-in-up text-center relative">

                {/* Background effects */}
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-purple-600/20 to-transparent blur-2xl -z-10" />

                <div className="p-8 pb-10">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="relative w-32 h-32 mx-auto mb-6 mt-4">
                        <div className="absolute inset-0 bg-yellow-400/20 rounded-full blur-xl animate-pulse" />
                        <div className="w-full h-full bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full flex items-center justify-center shadow-lg transform transition-transform hover:scale-110">
                            <span className="text-6xl drop-shadow-xl select-none">🎁</span>
                        </div>
                    </div>

                    <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500 mb-2">
                        Daily Reward!
                    </h2>
                    <p className="text-purple-200/80 mb-8 font-medium">Log in every day to collect free coins.</p>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 backdrop-blur-sm relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/5 to-yellow-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        <div className="text-sm text-purple-200/60 font-semibold mb-2 tracking-wider">TODAY'S REWARD</div>
                        <div className="text-5xl font-black text-white flex items-center justify-center gap-3">
                            <span>+50</span>
                            <span className="text-4xl drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">🪙</span>
                        </div>
                    </div>

                    <button
                        onClick={handleClaim}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-yellow-500 to-yellow-400 hover:from-yellow-400 hover:to-yellow-300 text-yellow-950 font-black text-lg py-4 rounded-2xl transition-all shadow-[0_10px_30px_rgba(234,179,8,0.3)] transform hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-700 ease-in-out" />
                        {loading ? 'Claiming...' : 'CLAIM NOW'}
                    </button>

                    <p className="text-white/30 text-xs mt-4">Come back tomorrow for another reward!</p>
                </div>

            </div>
        </div>
    );
};

export default DailyBonusModal;
