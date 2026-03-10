import React, { useState } from 'react';

const DesktopSubscriptionModal = ({ onClose }) => {
    const [selectedPlan, setSelectedPlan] = useState('7-days');
    const [activeTab, setActiveTab] = useState('plus');

    const PLANS = {
        '7-days': { original: 618, discounted: 405, unit: '7days' },
        '30-days': { original: 1239, discounted: 805, unit: '30days' }
    };

    const currentPlan = PLANS[selectedPlan];

    return (
        <div className="bg-[#24213a] w-full max-w-[360px] rounded-[28px] overflow-hidden flex flex-col shadow-2xl border border-white/5 relative">
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-[200] w-10 h-10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-full flex items-center justify-center transition-all border border-white/5 backdrop-blur-md"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            {/* Header */}
            <div className="p-4">
                <h2 className="text-white text-base font-bold w-full text-center">Strangy Plus</h2>
            </div>

            <div className="px-4 pb-5 space-y-4">
                {/* Tabs */}
                <div className="bg-white/5 p-1 rounded-2xl flex items-center border border-white/5">
                    <button
                        onClick={() => setActiveTab('plus')}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'plus' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : 'text-white/40 hover:text-white/60'}`}
                    >
                        Strangy Plus
                    </button>
                    <button
                        onClick={() => setActiveTab('plus-plus')}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'plus-plus' ? 'bg-[#5143d9] text-white shadow-lg shadow-[#5143d9]/20' : 'text-white/40 hover:text-white/60'}`}
                    >
                        Strangy Plus+
                    </button>
                </div>

                {/* Comparison Table */}
                <div className="relative bg-[#1a172e] rounded-3xl p-6 border border-white/5 overflow-hidden">
                    <div className="flex items-start justify-between relative z-10">
                        {/* Labels */}
                        <div className="space-y-6 text-[10px] font-semibold text-white/60 pt-20">
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
                        <div className={`flex flex-col items-center gap-6 rounded-2xl pt-2 px-6 pb-8 transition-all duration-300 ${activeTab === 'plus' ? 'bg-yellow-400 border-4 border-yellow-400 shadow-2xl shadow-yellow-400/10' : 'opacity-30 scale-95'}`}>
                            <div className="flex flex-col items-center mb-2">
                                <span className="text-2xl mb-1">👑</span>
                                <span className={`font-extrabold text-lg ${activeTab === 'plus' ? 'text-black' : 'text-white'}`}>Plus</span>
                            </div>
                            <span className={`font-bold text-xs ${activeTab === 'plus' ? 'text-black/80' : 'text-white/40'}`}>Unlimited</span>
                            <span className={`font-bold text-xs ${activeTab === 'plus' ? 'text-black/80' : 'text-white/40'}`}>150</span>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${activeTab === 'plus' ? 'bg-black/10' : 'bg-white/5'}`}>
                                <span className={`font-extrabold ${activeTab === 'plus' ? 'text-black' : 'text-white/20'}`}>−</span>
                            </div>
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${activeTab === 'plus' ? 'bg-black' : 'bg-green-500/20'}`}>
                                <span className={`${activeTab === 'plus' ? 'text-yellow-400' : 'text-green-400'} text-[10px]`}>✔️</span>
                            </div>
                        </div>

                        {/* Plus+ Column */}
                        <div className={`flex flex-col items-center gap-6 rounded-2xl pt-2 px-6 pb-8 transition-all duration-300 ${activeTab === 'plus-plus' ? 'bg-[#5143d9] border-4 border-[#5143d9] shadow-2xl shadow-[#5143d9]/20' : 'opacity-30 scale-95'}`}>
                            <div className="flex flex-col items-center mb-2">
                                <span className="text-2xl mb-1">💎</span>
                                <span className="text-white font-extrabold text-lg">Plus+</span>
                            </div>
                            <span className="text-white font-bold text-xs">Unlimited</span>
                            <span className="text-white font-bold text-xs">Unlimited</span>
                            <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                                <span className="text-[10px]">✔️</span>
                            </div>
                            <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                                <span className="text-[10px]">✔️</span>
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
                        <span className={`font-bold ${selectedPlan === '7-days' ? 'text-black' : 'text-white'}`}>₹ {PLANS['7-days'].original}</span>
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
                        <span className={`font-bold ${selectedPlan === '30-days' ? 'text-black' : 'text-white'}`}>₹ {PLANS['30-days'].original}</span>
                    </button>
                    <p className="text-center text-[10px] text-white/40">then ₹ {currentPlan.original} every {currentPlan.unit} until canceled</p>
                </div>

                {/* Confirm Button */}
                <div className="space-y-4">
                    <button className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold py-4 rounded-3xl text-sm shadow-xl shadow-yellow-400/30 transition-all flex flex-col items-center group overflow-hidden">
                        <span className="relative z-10 group-hover:scale-105 transition-transform text-[10px] tracking-wide uppercase opacity-70">Confirm and Pay</span>
                        <div className="flex items-center gap-2 mt-0.5 relative z-10 group-hover:scale-105 transition-transform">
                            <span className="line-through text-black/40">₹ {currentPlan.original}</span>
                            <span className="text-lg">₹ {currentPlan.discounted}/{currentPlan.unit}</span>
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
