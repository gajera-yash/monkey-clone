import React, { useState, useEffect } from 'react';
import { useCoins } from '../../context/CoinsContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const DailyBonusModal = ({ isOpen, onClose }) => {
    const { claimDailyBonus, getDailyStreakInfo, streakRewards, isSettingsLoading } = useCoins();
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [streakInfo, setStreakInfo] = useState({ currentDay: 1, claimedDays: [] });

    useEffect(() => {
        if (isOpen && currentUser?.id && currentUser?.role !== 'admin') {
            const info = getDailyStreakInfo(currentUser);
            setStreakInfo(info);
        }
    }, [isOpen, currentUser, getDailyStreakInfo]);

    if (!isOpen || currentUser?.role === 'admin') return null;


    const { currentDay, claimedDays, canClaim, nextClaimTime } = streakInfo;

    const handleClaim = async () => {
        if (currentUser?.isAnonymous) {
            toast.error('Please login with Google to claim daily coins!');
            return;
        }
        if (!canClaim) return;

        setLoading(true);
        try {
            const success = await claimDailyBonus();
            if (success) {
                toast.success('Daily Bonus Claimed! 🎉');
                // Refresh local streak info
                const info = getDailyStreakInfo(currentUser);
                setStreakInfo(info);
            }
        } catch (error) {
            toast.error('Error claiming bonus. Try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatCoins = (n) => {
        if (n >= 100000) return `${(n / 100000).toFixed(0)} L`;
        if (n >= 1000) return `${(n / 1000).toFixed(0)},000`;
        return `${n}`;
    };

    const isAlreadyClaimed = !canClaim && claimedDays.includes(currentDay);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-fade-in-up"
                style={{ background: 'linear-gradient(160deg, #f59e0b 0%, #d97706 100%)' }}>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 z-10 w-9 h-9 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center font-black text-lg transition-colors shadow-lg"
                >
                    ✕
                </button>

                {/* Header */}
                <div className="text-center py-6 px-6">
                    <h2 className="text-3xl font-black text-white drop-shadow-md tracking-wide">Daily Reward</h2>
                    <p className="text-yellow-100 text-sm mt-1 font-medium">
                        {isAlreadyClaimed 
                            ? `Next reward available at ${new Date(nextClaimTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                            : 'Come back every day to get better rewards!'}
                    </p>
                </div>

                {/* 7-Day Grid */}
                {isSettingsLoading ? (
                    <div className="mx-4 mb-4 rounded-2xl p-12 flex justify-center items-center" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' }}>
                        <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' }}>
                        <div className="grid grid-cols-7 gap-2">
                            {streakRewards.map((coins, index) => {
                            const day = index + 1;
                            const isClaimed = claimedDays.includes(day);
                            const isCurrent = day === currentDay;
                            const isLocked = !isClaimed && !isCurrent;

                            return (
                                <div
                                    key={day}
                                    className={`relative flex flex-col items-center justify-between rounded-xl p-2 min-h-[90px] transition-all
                                        ${isCurrent && !isClaimed
                                            ? 'border-2 border-yellow-300 shadow-lg shadow-yellow-400/30 scale-105 z-10'
                                            : 'border border-white/10'
                                        }`}
                                    style={{
                                        background: isCurrent && !isClaimed
                                            ? 'linear-gradient(160deg, #f59e0b, #d97706)'
                                            : isClaimed
                                                ? 'rgba(255,255,255,0.08)'
                                                : 'rgba(255,255,255,0.05)',
                                    }}
                                >
                                    {/* Burst rays for current */}
                                    {isCurrent && !isClaimed && (
                                        <div className="absolute inset-0 rounded-xl pointer-events-none"
                                            style={{
                                                background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
                                            }} />
                                    )}

                                    <span className="text-[10px] font-bold text-white/70 relative z-10">Day {day}</span>

                                    <div className="relative z-10 text-xl my-1">
                                        {isClaimed ? '✅' : isCurrent ? '🪙' : isLocked ? '🔒' : '🪙'}
                                    </div>

                                    <div className="relative z-10 text-center">
                                        {isClaimed ? (
                                            <span className="text-green-300 text-[9px] font-black">Claimed</span>
                                        ) : (
                                            <>
                                                <span className={`text-[11px] font-black ${isCurrent ? 'text-yellow-900' : 'text-white'}`}>
                                                    {formatCoins(coins)}
                                                </span>
                                                <br />
                                                <span className={`text-[8px] font-medium ${isCurrent ? 'text-yellow-800' : 'text-white/60'}`}>
                                                    Coins
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                )}

                {/* Claim Button */}
                <div className="pb-6 px-4 flex justify-center">
                    <button
                        onClick={handleClaim}
                        disabled={loading || isAlreadyClaimed || isSettingsLoading}
                        className={`px-24 py-3.5 font-black text-xl rounded-2xl transition-all shadow-lg tracking-widest border-b-4 
                            ${isAlreadyClaimed || isSettingsLoading
                                ? 'bg-gray-400 text-gray-700 border-gray-500 cursor-not-allowed' 
                                : 'bg-gradient-to-b from-yellow-300 to-yellow-500 hover:from-yellow-200 hover:to-yellow-400 text-yellow-950 shadow-yellow-600/40 hover:-translate-y-0.5 active:scale-95 border-yellow-600'
                            }`}
                    >
                        {isSettingsLoading ? 'LOADING...' : loading ? 'CLAIMING...' : isAlreadyClaimed ? 'CLAIMED' : 'CLAIM'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DailyBonusModal;
