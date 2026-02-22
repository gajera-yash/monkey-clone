import React, { useState } from 'react';

const DesktopSearchModal = ({ onClose }) => {
    const [searchId, setSearchId] = useState('');

    return (
        <div className="bg-[#1a172e] w-[400px] h-[600px] rounded-[32px] overflow-hidden flex flex-col shadow-2xl border border-white/5 relative">
            {/* Header */}
            <div className="p-6 flex items-center justify-between border-b border-white/5 bg-[#24213a]">
                <h2 className="text-white text-xl font-bold w-full text-center">Search Friends</h2>
                <button onClick={onClose} className="absolute right-6 text-white/60 hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="p-6 flex-1 flex flex-col items-center">
                {/* Search Input */}
                <div className="relative w-full mb-12">
                    <input
                        type="text"
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        placeholder="Search a friend by ID"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-6 pr-12 text-white text-sm focus:outline-none focus:border-purple-500 transition-all placeholder:text-white/20"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                {/* Empty State / No Results */}
                <div className="flex-1 flex flex-col items-center justify-center text-center px-10">
                    <div className="relative w-48 h-48 mb-8">
                        {/* Grid Pattern Background */}
                        <div className="absolute inset-0 bg-[#24213a] rounded-3xl overflow-hidden opacity-50">
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
                        </div>

                        {/* Floating elements like screenshot */}
                        <div className="absolute top-4 left-4 text-white/5 text-4xl font-bold">???</div>
                        <div className="absolute bottom-4 right-4 text-white/5 text-4xl font-bold rotate-12">No!</div>

                        {/* Centered Monkey */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-32 h-32 bg-yellow-400 rounded-full flex items-center justify-center shadow-2xl relative transform -rotate-12">
                                <span className="text-6xl">🐵</span>
                                {/* Sad expression overlay? Just use a sad monkey if possible, but emojis are limited */}
                            </div>
                        </div>

                        {/* Text overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <h3 className="text-white text-5xl font-black italic tracking-tighter mix-blend-difference opacity-80">Nothing</h3>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DesktopSearchModal;
