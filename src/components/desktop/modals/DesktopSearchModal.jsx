import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../../supabase';
import { useAuth } from '../../../context/AuthContext';
import socket from '../../../utils/socket';
import { useCoins } from '../../../context/CoinsContext';

const DesktopSearchModal = ({ onClose }) => {
    const [searchId, setSearchId] = useState('');
    const [recentSearches, setRecentSearches] = useState(() => {
        const saved = localStorage.getItem('recent_searches');
        return saved ? JSON.parse(saved) : [];
    });
    const [isSearching, setIsSearching] = useState(false);
    const { currentUser } = useAuth();
    const { coins, creatorMonetizationSettings } = useCoins();

    useEffect(() => {
        localStorage.setItem('recent_searches', JSON.stringify(recentSearches));
    }, [recentSearches]);

    useEffect(() => {
        const handleDeclined = (data) => {
            if (data?.reason === 'offline') {
                toast.error("User is currently offline or busy.");
            } else {
                toast.error("Call declined by user");
            }
        };

        socket.on('direct-call-declined', handleDeclined);

        return () => {
            socket.off('direct-call-declined', handleDeclined);
        };
    }, [onClose]);

    const handleSearch = async (e) => {
        if (e.key === 'Enter' && searchId.trim()) {
            setIsSearching(true);
            try {
                const term = searchId.trim();
                
                const { data, error } = await supabase.rpc('search_profiles_by_id_prefix', { 
                    prefix: term 
                });

                if (error) throw error;

                if (!data || data.length === 0) {
                    toast.error("User not found");
                } else {
                    const user = data.find(u => u.id === term) || 
                                 data.find(u => u.id.startsWith(term)) || 
                                 data[0];

                    const result = {
                        uid: user.id,
                        displayName: user.username || 'Stranger',
                        photoURL: user.avatar_url,
                        lastSeen: user.last_seen
                    };

                    // Add to recent, avoid duplicates (move to top)
                    setRecentSearches(prev => {
                        const filtered = prev.filter(u => u.uid !== result.uid);
                        return [result, ...filtered].slice(0, 5); // Keep last 5
                    });
                    setSearchId('');
                }
            } catch (error) {
                console.error("Search error", error);
                toast.error("Error searching user");
            } finally {
                setIsSearching(false);
            }
        }
    };

    const removeRecent = (uid) => {
        setRecentSearches(prev => prev.filter(u => u.uid !== uid));
    };

    const handleTalkNow = (user) => {
        if (!currentUser) {
            toast.error("Please login to call friends");
            return;
        }

        const callCost = creatorMonetizationSettings?.privateCallCost || 60;
        if (coins < callCost) {
            toast.error(`You need at least ${callCost} coins to start a private call`);
            return;
        }

        onClose(); // Close the modal
        
        // Navigate the user to the chat screen which will initiate the ringing
        window.location.href = `/chat?directCall=${user.uid}&name=${encodeURIComponent(user.displayName)}&photo=${encodeURIComponent(user.photoURL || '')}&gender=${encodeURIComponent(user.gender || 'Female')}`;
    };

    return (
        <div className="bg-[#1a172e] w-full h-full md:w-[320px] md:h-[520px] rounded-none md:rounded-[24px] overflow-hidden flex flex-col shadow-2xl border-none md:border md:border-white/5 relative pointer-events-auto">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-white/5 bg-[#24213a]">
                <h2 className="text-white text-base font-bold w-full text-center">Search Friends</h2>
                <button onClick={onClose} className="absolute right-6 text-white/60 hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="p-4 flex-1 flex flex-col">
                {/* Search Input */}
                <div className="relative w-full mb-6">
                    <input
                        type="text"
                        value={searchId}
                        onKeyDown={handleSearch}
                        onChange={(e) => setSearchId(e.target.value)}
                        placeholder="Search by ID or Name"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-5 pr-12 text-white text-sm focus:outline-none focus:border-purple-500 transition-all placeholder:text-white/20"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20">
                        {isSearching ? (
                            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        )}
                    </div>
                </div>

                {/* Recent Searches */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Recent Searches</span>
                        {recentSearches.length > 0 && (
                            <button 
                                onClick={() => setRecentSearches([])}
                                className="text-purple-400 text-[10px] font-bold hover:text-purple-300 transition-colors"
                            >
                                CLEAR ALL
                            </button>
                        )}
                    </div>

                    <div className="space-y-2">
                        {recentSearches.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center text-center opacity-20">
                                <span className="text-4xl mb-2">👤</span>
                                <p className="text-xs text-white">No recent searches</p>
                            </div>
                        ) : (
                            recentSearches.map((user) => {
                                const isOnline = user.lastSeen && (new Date() - new Date(user.lastSeen)) < 120000; // 2 minutes
                                
                                return (
                                    <div key={user.uid} className="group bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl p-3 flex items-center gap-3 transition-all animate-fade-in-up">
                                        <div className="relative">
                                            {user.photoURL ? (
                                                <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white">
                                                    {user.displayName.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-[#1a172e] rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`} title={isOnline ? 'Online' : 'Offline'} />
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-white text-sm font-bold truncate leading-tight">{user.displayName}</h4>
                                                {isOnline && <span className="text-[8px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter">Live</span>}
                                            </div>
                                            <p className="text-white/30 text-[10px] font-mono truncate">ID: {user.uid.slice(0, 8)}</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => handleTalkNow(user)}
                                                className={`${isOnline ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-white/10 text-white/40 cursor-not-allowed'} text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-colors`}
                                                disabled={!isOnline}
                                            >
                                                {isOnline ? 'TALK' : 'BUSY'}
                                            </button>
                                            <button 
                                                onClick={() => removeRecent(user.uid)}
                                                className="p-1.5 text-white/20 hover:text-red-400 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DesktopSearchModal;
