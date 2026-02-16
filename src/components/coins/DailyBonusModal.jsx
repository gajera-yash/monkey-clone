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
            toast.success("Bonus Claimed!");
            onClose();
        } else {
            toast.error("Failed to claim bonus. Try again later.");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-dark-900 border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in-up text-center">

                <div className="p-8">
                    <div className="w-24 h-24 bg-yellow-400/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                        <span className="text-6xl filter drop-shadow-xl">🎁</span>
                    </div>

                    <h2 className="text-3xl font-bold text-white mb-2">Daily Bonus!</h2>
                    <p className="text-gray-400 mb-6">Come back every day for free coins.</p>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
                        <div className="text-sm text-gray-400 mb-1">YOUR REWARD</div>
                        <div className="text-4xl font-bold text-yellow-400 flex items-center justify-center gap-2">
                            <span>+10</span>
                            <span className="text-2xl">🪙</span>
                        </div>
                    </div>

                    <button
                        onClick={handleClaim}
                        disabled={loading}
                        className="w-full bg-yellow-500 hover:bg-yellow-400 text-dark-900 font-bold py-3 rounded-xl transition-all shadow-lg shadow-yellow-500/20 transform hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Claiming...' : 'CLAIM REWARD'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default DailyBonusModal;
