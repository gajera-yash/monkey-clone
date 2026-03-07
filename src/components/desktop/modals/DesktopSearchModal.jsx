import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

const DesktopSearchModal = ({ onClose }) => {
    const [searchId, setSearchId] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async (e) => {
        if (e.key === 'Enter' && searchId.trim()) {
            setIsSearching(true);
            setSearchResult(null);
            try {
                const userRef = doc(db, 'users', searchId.trim());
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    setSearchResult(userSnap.data());
                } else {
                    toast.error("User not found");
                }
            } catch (error) {
                console.error("Search error", error);
                toast.error("Error searching user");
            } finally {
                setIsSearching(false);
            }
        }
    };

    return (
        <div className="bg-[#1a172e] w-[320px] h-[460px] rounded-[24px] overflow-hidden flex flex-col shadow-2xl border border-white/5 relative pointer-events-auto">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-white/5 bg-[#24213a]">
                <h2 className="text-white text-base font-bold w-full text-center">Search Friends</h2>
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
                        onKeyDown={handleSearch}
                        onChange={(e) => setSearchId(e.target.value)}
                        placeholder="Search a friend by full ID"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-6 pr-12 text-white text-sm focus:outline-none focus:border-purple-500 transition-all placeholder:text-white/20"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                {/* Results Area */}
                <div className="flex-1 flex flex-col items-center justify-center text-center w-full relative">
                    {isSearching ? (
                        <div className="animate-pulse flex flex-col items-center">
                            <span className="text-4xl mb-4">🔍</span>
                            <p className="text-white/60 font-medium">Searching...</p>
                        </div>
                    ) : searchResult ? (
                        <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center animate-fade-in-up">
                            <div className="relative mb-4">
                                {searchResult.photoURL ? (
                                    <img src={searchResult.photoURL} alt="User" className="w-24 h-24 rounded-full object-cover border-4 border-purple-500 shadow-xl" />
                                ) : (
                                    <div className="w-24 h-24 rounded-full bg-indigo-500 flex items-center justify-center text-3xl font-bold text-white border-4 border-indigo-400 shadow-xl">
                                        {searchResult.displayName?.charAt(0)?.toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <h3 className="text-white text-xl font-bold mb-0.5">{searchResult.displayName}</h3>
                            <p className="text-white/40 text-xs mb-6 font-mono tracking-wide">ID: {searchResult.uid?.slice(0, 8)}</p>

                            <button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity shadow-[0_4px_15px_rgba(124,58,237,0.3)]">
                                Talk Now
                            </button>
                        </div>
                    ) : (
                        <div className="relative w-full flex flex-col items-center">
                            <div className="relative w-64 h-64 mb-4 flex items-center justify-center">
                                {/* Dot Grid Pattern in background */}
                                <div className="absolute inset-0 opacity-10"
                                    style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                                {/* Big Italic Nothing Text */}
                                <h3 className="text-white text-7xl font-black italic tracking-tighter opacity-10 select-none uppercase">Nothing</h3>

                                {/* Floating elements like screenshot */}
                                <span className="absolute top-4 left-4 text-white/10 text-4xl font-black italic rotate-[-15deg]">???</span>
                                <span className="absolute bottom-10 right-4 text-white/10 text-4xl font-black italic rotate-[15deg]">No!</span>

                                {/* Centered Yellow Monkey Circle */}
                                <div className="relative z-10 w-40 h-40 bg-yellow-400 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(250,204,21,0.3)] transform -rotate-[10deg]">
                                    <span className="text-8xl">🐵</span>
                                </div>
                            </div>

                            <div className="space-y-1 mt-4">
                                <h4 className="text-white font-bold text-xl">Nothing found</h4>
                                <p className="text-white/40 text-sm">Make sure ID you entered is correct</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DesktopSearchModal;
