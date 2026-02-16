import React from 'react';
import { usePremium } from '../../context/PremiumContext';

const PremiumBadge = ({ size = 'md', showText = false }) => {
    const { isPremium } = usePremium();

    if (!isPremium) return null;

    const sizeClasses = {
        sm: 'w-4 h-4 text-[10px]',
        md: 'w-5 h-5 text-xs',
        lg: 'w-8 h-8 text-base',
    };

    return (
        <div className="inline-flex items-center gap-1" title="Premium V.I.P Member">
            <div className={`relative flex items-center justify-center bg-gradient-to-br from-yellow-300 via-orange-400 to-yellow-500 rounded-full shadow-lg ${sizeClasses[size]}`}>
                <span className="text-white font-bold drop-shadow-sm">💎</span>
                <div className="absolute inset-0 rounded-full bg-white/30 animate-pulse"></div>
            </div>
            {showText && (
                <span className="text-yellow-400 font-bold text-xs tracking-wider uppercase drop-shadow-sm">
                    VIP
                </span>
            )}
        </div>
    );
};

export default PremiumBadge;
