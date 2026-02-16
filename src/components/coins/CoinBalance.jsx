import React, { useState, useEffect } from 'react';
import { useCoins } from '../../context/CoinsContext';
import { useAuth } from '../../context/AuthContext';

const CoinBalance = ({ onOpenStore }) => {
    const { coins, loading } = useCoins();
    const { currentUser } = useAuth();
    const [animatedCoins, setAnimatedCoins] = useState(0);

    // Animate coin count changes
    useEffect(() => {
        if (loading) return;

        let start = animatedCoins;
        const end = coins;
        if (start === end) return;

        const duration = 1000;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (easeOutQuad)
            const ease = 1 - (1 - progress) * (1 - progress);

            const current = Math.floor(start + (end - start) * ease);
            setAnimatedCoins(current);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [coins, loading]);

    if (!currentUser) return null;

    return (
        <div className="flex items-center gap-2 bg-dark-800/50 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 transition-all hover:bg-dark-800">
            <div className="w-6 h-6 flex items-center justify-center bg-yellow-500 rounded-full shadow-lg shadow-yellow-500/20 text-xs font-bold text-dark-900 border border-yellow-300">
                💰
            </div>

            <div className="flex flex-col leading-none">
                <span className="text-sm font-bold text-white tabular-nums">
                    {loading ? '...' : animatedCoins.toLocaleString()}
                </span>
            </div>

            <button
                onClick={onOpenStore}
                className="ml-1 w-5 h-5 flex items-center justify-center bg-accent-purple text-white rounded-full text-xs hover:bg-accent-purple/80 transition-colors"
                title="Get Coins"
            >
                +
            </button>
        </div>
    );
};

export default CoinBalance;
