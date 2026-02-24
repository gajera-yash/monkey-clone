import React, { useState } from 'react';

const DesktopSubscriptionModal = ({ onClose }) => {
    const [selectedPlan, setSelectedPlan] = useState('7-days');
    const [activeTab, setActiveTab] = useState('plus');

    return (
        <div className="bg-[#24213a] w-[380px] rounded-[28px] overflow-hidden flex flex-col shadow-2xl border border-white/5 relative">
            {/* Close Button */}
            <button onClick={onClose} className="absolute top-6 right-6 text-white/60 hover:text-white transition-colors z-[200]">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            {/* Header */}
            <div className="p-4">
                <h2 className="text-white text-base font-bold w-full text-center">Monkey Plus</h2>
            </div>

            <div className="px-4 pb-5 space-y-4">
                {/* Tabs */}
                <div className="bg-white/5 p-1 rounded-2xl flex items-center border border-white/5">
                    <button
                        onClick={() => setActiveTab('plus')}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'plus' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : 'text-white/40 hover:text-white/60'}`}
                    >
                        Monkey Plus
                    </button>
                    <button
                        onClick={() => setActiveTab('plus-plus')}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'plus-plus' ? 'bg-[#24213a] text-white border border-white/5 shadow-xl' : 'text-white/40 hover:text-white/60'}`}
                    >
                        Monkey Plus+
                    </button>
                </div>

                {/* Comparison Table */}
                <div className="relative bg-[#1a172e] rounded-3xl p-6 border border-white/5 overflow-hidden">
                    <div className="flex items-start justify-between relative z-10">
                        {/* Labels */}
                        <div className="space-y-6 text-xs font-semibold text-white pt-20">
                            <div className="flex items-center gap-2">
                                <span className="w-4 h-4 flex items-center justify-center text-[10px] text-white/40 border border-white/20 rounded-full">i</span>
                                <span>Filter-Both</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-4 h-4 flex items-center justify-center text-[10px] text-white/40 border border-white/20 rounded-full">i</span>
                                <span>Filter-Gender</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-4 h-4 flex items-center justify-center text-[10px] text-white/40 border border-white/20 rounded-full">i</span>
                                <span>Match Preference</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-4 h-4 flex items-center justify-center text-[10px] text-white/40 border border-white/20 rounded-full">i</span>
                                <span>No Ads</span>
                            </div>
                        </div>

                        {/* Plus Column */}
                        <div className="flex flex-col items-center gap-6 bg-yellow-400 rounded-2xl pt-2 px-6 pb-8 border-4 border-yellow-400 shadow-2xl shadow-yellow-400/10">
                            <div className="flex flex-col items-center mb-2">
                                <span className="text-3xl mb-1">👑</span>
                                <span className="text-black font-extrabold text-xl">Plus</span>
                            </div>
                            <span className="text-black/80 font-bold text-sm">Unlimited</span>
                            <span className="text-black/80 font-bold text-sm">150</span>
                            <div className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center">
                                <span className="text-black font-extrabold">−</span>
                            </div>
                            <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center">
                                <span className="text-yellow-400 text-xs">✔️</span>
                            </div>
                        </div>

                        {/* Plus+ Column */}
                        <div className="flex flex-col items-center gap-6 pt-2 px-6 pb-8 opacity-60">
                            <div className="flex flex-col items-center mb-2">
                                <span className="text-3xl mb-1">💎</span>
                                <span className="text-white font-extrabold text-xl">Plus+</span>
                            </div>
                            <span className="text-white font-bold text-sm">Unlimited</span>
                            <span className="text-white font-bold text-sm">Unlimited</span>
                            <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                                <span className="text-xs">✔️</span>
                            </div>
                            <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                                <span className="text-xs">✔️</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Plan Selection */}
                <div className="space-y-3">
                    <button
                        onClick={() => setSelectedPlan('7-days')}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all relative overflow-hidden ${selectedPlan === '7-days' ? 'bg-white border-white' : 'bg-[#1a172e] border-white/5 hover:border-white/20'}`}
                    >
                        <div className="absolute top-0 left-0 bg-[#5143d9] text-[8px] text-white px-2 py-0.5 font-bold rounded-br-lg">30% OFF</div>
                        <div className="flex items-center gap-4">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === '7-days' ? 'border-black bg-black' : 'border-white/20'}`}>
                                {selectedPlan === '7-days' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                            </div>
                            <span className={`font-bold ${selectedPlan === '7-days' ? 'text-black' : 'text-white'}`}>7 days</span>
                        </div>
                        <span className={`font-bold ${selectedPlan === '7-days' ? 'text-black' : 'text-white'}`}>₹ 618</span>
                    </button>

                    <button
                        onClick={() => setSelectedPlan('30-days')}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedPlan === '30-days' ? 'bg-white border-white' : 'bg-[#1a172e] border-white/5 hover:border-white/20'}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === '30-days' ? 'border-black bg-black' : 'border-white/20'}`}>
                                {selectedPlan === '30-days' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                            </div>
                            <span className={`font-bold ${selectedPlan === '30-days' ? 'text-black' : 'text-white'}`}>30 days</span>
                        </div>
                        <span className={`font-bold ${selectedPlan === '30-days' ? 'text-black' : 'text-white'}`}>₹ 1239</span>
                    </button>
                    <p className="text-center text-[10px] text-white/40">then ₹ 618 every 7 days until canceled</p>
                </div>

                {/* Confirm Button */}
                <div className="space-y-4">
                    <button className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold py-4 rounded-3xl text-sm shadow-xl shadow-yellow-400/30 transition-all flex flex-col items-center group overflow-hidden">
                        <span className="relative z-10 group-hover:scale-105 transition-transform">Discount on your first subscription</span>
                        <div className="flex items-center gap-2 mt-0.5 relative z-10 group-hover:scale-105 transition-transform">
                            <span className="line-through text-black/40">₹ 618</span>
                            <span className="text-lg">₹ 405/7days</span>
                        </div>
                    </button>
                    <div className="flex flex-col items-center gap-1 text-[10px] text-white/40">
                        <span>Recurring billing, cancel anytime.</span>
                        <span>The discount price is only applicable for the initial subscription</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DesktopSubscriptionModal;
