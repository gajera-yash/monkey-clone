import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useAuth } from '../../context/AuthContext';
import { useCoins } from '../../context/CoinsContext';
import toast from 'react-hot-toast';

const avatarColors = ['bg-orange-500', 'bg-green-500', 'bg-purple-500', 'bg-blue-500', 'bg-pink-500', 'bg-teal-500', 'bg-red-500'];
const getColor = (name) => avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length];

const MatchHistoryMobile = ({ onClose }) => {
    const { currentUser } = useAuth();
    const { coins, creatorMonetizationSettings } = useCoins();
    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser?.id) return;

        const fetchHistory = async () => {
            try {
                const { data, error } = await supabase
                    .from('chat_logs')
                    .select(`
                        id,
                        start_time,
                        duration,
                        user1_id,
                        user2_id,
                        user1:profiles!chat_logs_user1_id_fkey (
                            id,
                            username,
                            avatar_url,
                            gender,
                            last_seen
                        ),
                        user2:profiles!chat_logs_user2_id_fkey (
                            id,
                            username,
                            avatar_url,
                            gender,
                            last_seen
                        )
                    `)
                    .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
                    .order('start_time', { ascending: false })
                    .limit(50);

                if (error) throw error;

                const formatted = data.map(item => {
                    const isUser1 = item.user1_id === currentUser.id;
                    const partner = isUser1 ? item.user2 : item.user1;
                    const isOnline = partner?.last_seen && (new Date() - new Date(partner.last_seen)) < 120000;
                    
                    return {
                        id: item.id,
                        uid: partner?.id,
                        name: partner?.username || 'Stranger',
                        avatar: partner?.avatar_url,
                        time: new Date(item.start_time).toLocaleString(),
                        duration: item.duration ? `${Math.floor(item.duration / 60)}m ${item.duration % 60}s` : null,
                        gender: partner?.gender || 'Female',
                        isOnline,
                    };
                });
                setHistoryData(formatted);
            } catch (err) {
                console.error('Error fetching history:', err);
                toast.error('Could not load history');
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [currentUser]);

    const handleDelete = async (id) => {
        try {
            const { error } = await supabase.from('chat_logs').delete().eq('id', id);
            if (error) throw error;
            setHistoryData(prev => prev.filter(item => item.id !== id));
            toast.success('Record deleted');
        } catch {
            toast.error('Failed to delete');
        }
    };

    const handleCallAgain = (item) => {
        if (!item.uid) { toast.error('User not found'); return; }
        const callCost = creatorMonetizationSettings?.privateCallCost || 60;
        if (coins < callCost) {
            toast.error(`You need at least ${callCost} coins for a private call`);
            return;
        }
        onClose();
        window.location.href = `/chat?directCall=${item.uid}&name=${encodeURIComponent(item.name)}&photo=${encodeURIComponent(item.avatar || '')}&gender=${encodeURIComponent(item.gender || 'Female')}`;
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-dark-900/95 backdrop-blur-xl animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/10">
                <h2 className="text-xl font-bold">Match History</h2>
                <button
                    onClick={onClose}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-lg"
                >
                    ✕
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-3 pt-3">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-white/30 gap-3">
                        <div className="w-10 h-10 border-4 border-white/10 border-t-white/40 rounded-full animate-spin" />
                        <p className="text-sm">Loading history...</p>
                    </div>
                ) : !historyData || historyData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                        <span className="text-5xl mb-4">📭</span>
                        <p>No match history yet</p>
                    </div>
                ) : (
                    historyData.map((match) => (
                        <div key={match.id} className="bg-dark-800 border border-white/10 rounded-2xl p-4">
                            {/* Top info row */}
                            <div className="flex items-center justify-between mb-3 text-xs text-gray-500">
                                <span>{match.time}</span>
                                <div className="flex items-center gap-2">
                                    {match.duration && (
                                        <span className="flex items-center gap-1">📹 {match.duration}</span>
                                    )}
                                    <button
                                        onClick={() => handleDelete(match.id)}
                                        className="text-lg hover:scale-110 transition-transform"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>

                            {/* User row */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {/* Avatar */}
                                    <div className="relative">
                                        {match.avatar && match.avatar !== 'null' && match.avatar !== 'undefined' ? (
                                            <img 
                                                src={match.avatar} 
                                                alt={match.name} 
                                                className="w-12 h-12 rounded-full object-cover shadow-lg shrink-0" 
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(match.name || 'User')}&background=random`;
                                                }}
                                            />
                                        ) : (
                                            <div className={`w-12 h-12 rounded-full ${getColor(match.name)} flex items-center justify-center text-lg font-bold text-white shadow-lg shrink-0`}>
                                                {match.name?.charAt(0)?.toUpperCase() || 'U'}
                                            </div>
                                        )}
                                        {/* Online dot */}
                                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-dark-800 rounded-full ${match.isOnline ? 'bg-green-500' : 'bg-gray-600'}`} />
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-semibold text-white">{match.name}</span>
                                            {match.isOnline && (
                                                <span className="text-[8px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter">Live</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                            <span>{match.gender === 'female' ? '👩' : '👤'}</span>
                                            <span className="capitalize">{match.gender || 'Unknown'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Call Again button */}
                                <button
                                    onClick={() => handleCallAgain(match)}
                                    disabled={!match.uid}
                                    className={`w-11 h-11 rounded-full flex items-center justify-center text-xl shadow-lg transition-all ${match.isOnline
                                        ? 'bg-yellow-400 shadow-yellow-400/20 hover:scale-110 active:scale-95'
                                        : 'bg-white/10 cursor-not-allowed opacity-50'
                                        }`}
                                    title={match.isOnline ? 'Call Again' : 'User Offline'}
                                >
                                    📞
                                </button>
                            </div>
                        </div>
                    ))
                )}

                {historyData && historyData.length > 0 && (
                    <p className="text-center text-gray-500 text-sm pt-2">
                        Showing records from the past month
                    </p>
                )}
            </div>
        </div>
    );
};

export default MatchHistoryMobile;
