import React, { useState } from 'react';
import { Check, Crown, X, Sparkles, Zap, Star } from 'lucide-react';

const PLANS = {
    'plus': {
        label: 'Strangy Plus',
        emoji: '👑',
        color: '#f59e0b',
        glow: 'rgba(245,158,11,0.25)',
        badge: 'popular',
        features: [
            { text: 'Filter-Both', plus: 'Unlimited', plusplus: 'Unlimited' },
            { text: 'Filter-Gender', plus: '150 / day', plusplus: 'Unlimited' },
            { text: 'Match Preference', plus: false, plusplus: true },
            { text: 'No Ads', plus: true, plusplus: true },
        ],
        durations: {
            '7-days': { original: 618, discounted: 405 },
            '30-days': { original: 1239, discounted: 805 },
        }
    },
    'plus-plus': {
        label: 'Strangy Plus+',
        emoji: '💎',
        color: '#7c3aed',
        glow: 'rgba(124,58,237,0.25)',
        badge: 'premium',
        features: [
            { text: 'Filter-Both', plus: 'Unlimited', plusplus: 'Unlimited' },
            { text: 'Filter-Gender', plus: '150 / day', plusplus: 'Unlimited' },
            { text: 'Match Preference', plus: false, plusplus: true },
            { text: 'No Ads', plus: true, plusplus: true },
        ],
        durations: {
            '7-days': { original: 899, discounted: 629 },
            '30-days': { original: 1799, discounted: 1099 },
        }
    }
};

const DesktopSubscriptionModal = ({ onClose }) => {
    const [selectedDuration, setSelectedDuration] = useState('7-days');
    const [activeTab, setActiveTab] = useState('plus');

    const plan = PLANS[activeTab];
    const pricing = plan.durations[selectedDuration];

    const FeatureCheck = ({ value }) => {
        if (value === false) {
            return (
                <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    <span className="text-white/20 text-xs font-black">—</span>
                </div>
            );
        }
        if (value === true) {
            return (
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <Check size={12} className="text-emerald-400" strokeWidth={3} />
                </div>
            );
        }
        return (
            <span className="text-xs font-black text-white/80">{value}</span>
        );
    };

    return (
        <div
            className="relative w-full max-w-[380px] rounded-[32px] overflow-hidden flex flex-col shadow-2xl border border-white/8"
            style={{ background: 'linear-gradient(145deg, #1c1829 0%, #12101e 100%)' }}
        >
            {/* Glow effect */}
            <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full blur-3xl opacity-30 pointer-events-none transition-all duration-500"
                style={{ background: plan.color }}
            />

            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-20 w-9 h-9 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-full flex items-center justify-center transition-all border border-white/8 backdrop-blur-md active:scale-90"
            >
                <X size={16} strokeWidth={2.5} />
            </button>

            {/* Header + Tab Switcher */}
            <div className="relative z-10 px-5 pt-6 pb-4">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={16} className="text-yellow-400" />
                    <h2 className="text-white/90 text-base font-black tracking-tight">Go Premium</h2>
                </div>

                {/* Tabs */}
                <div className="bg-black/30 p-1 rounded-2xl flex items-center gap-1 border border-white/5 backdrop-blur-md">
                    {Object.entries(PLANS).map(([key, p]) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`flex-1 py-2.5 rounded-xl font-black text-xs tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 ${
                                activeTab === key
                                    ? 'text-black shadow-lg'
                                    : 'text-white/40 hover:text-white/60'
                            }`}
                            style={activeTab === key ? {
                                background: p.color,
                                boxShadow: `0 4px 20px ${p.glow}`
                            } : {}}
                        >
                            <span>{p.emoji}</span>
                            <span>{key === 'plus' ? 'Plus' : 'Plus+'}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Feature Comparison Card */}
            <div className="relative z-10 mx-5 rounded-3xl overflow-hidden border border-white/5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                {/* Column Headers */}
                <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-5 py-3 border-b border-white/5">
                    <span className="text-[9px] font-black uppercase tracking-[2px] text-white/30">Feature</span>
                    <div className="flex flex-col items-center w-16">
                        <span className="text-[8px] font-black uppercase tracking-wider text-yellow-400/80">Plus</span>
                    </div>
                    <div className="flex flex-col items-center w-16">
                        <span className="text-[8px] font-black uppercase tracking-wider text-violet-400/80">Plus+</span>
                    </div>
                </div>
                {/* Rows */}
                {plan.features.map((feature, i) => (
                    <div
                        key={i}
                        className={`grid grid-cols-[1fr_auto_auto] gap-3 items-center px-5 py-3 ${i < plan.features.length - 1 ? 'border-b border-white/5' : ''}`}
                    >
                        <span className="text-[10px] font-bold text-white/50">{feature.text}</span>
                        <div className="flex justify-center items-center w-16">
                            <FeatureCheck value={feature.plus} />
                        </div>
                        <div className="flex justify-center items-center w-16">
                            <FeatureCheck value={feature.plusplus} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Duration Selector */}
            <div className="relative z-10 px-5 pt-5 space-y-2">
                {['7-days', '30-days'].map(duration => {
                    const p = plan.durations[duration];
                    const isSelected = selectedDuration === duration;
                    const discount = Math.round((1 - p.discounted / p.original) * 100);
                    return (
                        <button
                            key={duration}
                            onClick={() => setSelectedDuration(duration)}
                            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                                isSelected
                                    ? 'border-white/20 bg-white/8'
                                    : 'border-white/5 bg-white/2 hover:border-white/10'
                            }`}
                        >
                            {duration === '7-days' && (
                                <div
                                    className="absolute top-0 left-0 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-br-lg text-white"
                                    style={{ background: plan.color }}
                                >
                                    {discount}% OFF
                                </div>
                            )}
                            <div className="flex items-center gap-3 mt-1">
                                <div
                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-white' : 'border-white/20'}`}
                                >
                                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                                <div className="text-left">
                                    <span className="font-black text-sm text-white">{duration === '7-days' ? '7 Days' : '30 Days'}</span>
                                    <p className="text-[9px] font-bold text-white/30">
                                        {duration === '7-days' ? 'Weekly plan' : 'Monthly plan'}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right mt-1">
                                <div className="text-[10px] text-white/30 line-through">₹{p.original}</div>
                                <div className="font-black text-base text-white">₹{p.discounted}</div>
                            </div>
                        </button>
                    );
                })}
                <p className="text-center text-[9px] text-white/25 pt-1 pb-0">
                    Recurring billing. Cancel anytime.
                </p>
            </div>

            {/* Confirm Button */}
            <div className="relative z-10 px-5 pt-4 pb-6">
                <button
                    className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[2px] transition-all active:scale-[0.98] flex flex-col items-center gap-1 shadow-xl"
                    style={{ background: plan.color, boxShadow: `0 8px 32px ${plan.glow}` }}
                >
                    <span className="opacity-70 text-black text-[9px]">Confirm & Subscribe</span>
                    <div className="flex items-center gap-2">
                        <span className="text-black/40 line-through text-sm">₹{pricing.original}</span>
                        <span className="text-black text-xl">₹{pricing.discounted}</span>
                        <span className="text-black/60 text-[9px]">/ {selectedDuration}</span>
                    </div>
                </button>
            </div>
        </div>
    );
};

export default DesktopSubscriptionModal;
