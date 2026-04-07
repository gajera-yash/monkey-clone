import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import { useAuth } from '../../../context/AuthContext';
import { useCoins } from '../../../context/CoinsContext';
import toast from 'react-hot-toast';

const DesktopHistoryModal = ({ onClose }) => {
    const { currentUser } = useAuth();
    const { coins, creatorMonetizationSettings } = useCoins();
    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser?.id) return;

        const fetchHistory = async () => {
            try {
                // Fetch matches where user is user1 or user2
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
                            gender
                        ),
                        user2:profiles!chat_logs_user2_id_fkey (
                            id,
                            username,
                            avatar_url,
                            gender
                        )
                    `)
                    .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
                    .order('start_time', { ascending: false })
                    .limit(50);

                if (error) throw error;

                const formatted = data.map(item => {
                    const isUser1 = item.user1_id === currentUser.id;
                    const partner = isUser1 ? item.user2 : item.user1;
                    
                    return {
                        id: item.id,
                        uid: partner?.id,
                        name: partner?.username || 'Stranger',
                        avatar: partner?.avatar_url,
                        time: new Date(item.start_time).toLocaleString(),
                        duration: item.duration ? `${Math.floor(item.duration / 60)}m ${item.duration % 60}s` : null,
                        location: 'Global',
                        gender: partner?.gender || 'Both'
                    };
                });
                setHistoryData(formatted);
            } catch (error) {
                console.error("Error fetching history:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [currentUser]);

    const handleDelete = async (id) => {
        try {
            const { error } = await supabase
                .from('chat_logs')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setHistoryData(prev => prev.filter(item => item.id !== id));
            toast.success("Record deleted");
        } catch (error) {
            toast.error("Failed to delete");
        }
    };

    const handleCallUser = (item) => {
        if (!item.uid) return;
        
        const callCost = creatorMonetizationSettings?.privateCallCost || 60;
        if (coins < callCost) {
            toast.error(`You need at least ${callCost} coins for a private call`);
            return;
        }

        onClose();
        window.location.href = `/chat?directCall=${item.uid}&name=${encodeURIComponent(item.name)}&photo=${encodeURIComponent(item.avatar || '')}&gender=${encodeURIComponent(item.gender || 'Female')}`;
    };

    const avatarColors = [
        'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-red-500',
        'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];

    return (
        <div className="bg-[#24213a] w-[360px] max-h-[560px] rounded-[24px] overflow-hidden flex flex-col shadow-2xl border border-white/5 pointer-events-auto">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-white/5">
                <h2 className="text-white text-base font-bold w-full text-center">Match History</h2>
                <button onClick={onClose} className="absolute right-6 text-white/60 hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center text-white/20">
                        <div className="w-10 h-10 border-4 border-white/10 border-t-white/40 rounded-full animate-spin mb-4"></div>
                        <span>Loading history...</span>
                    </div>
                ) : historyData.length === 0 ? (
                    <div className="py-20 text-center text-white/20">
                        <span className="text-4xl block mb-4">📭</span>
                        <p>No matches yet</p>
                    </div>
                ) : (
                    historyData.map((item, index) => (
                        <div key={item.id} className="bg-[#1a172e] rounded-3xl p-4 border border-white/5 hover:border-white/10 transition-all group">
                            {/* Top Info */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2 text-[10px] text-white/40 font-medium">
                                    <span>{item.time}</span>
                                    {item.duration && (
                                        <div className="flex items-center gap-1">
                                            <span>📹</span>
                                            <span>{item.duration}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button className="w-7 h-7 rounded-full bg-[#ff2d55]/20 flex items-center justify-center text-[10px] text-[#ff2d55] border border-[#ff2d55]/30 hover:bg-[#ff2d55]/40 transition-colors">
                                        👮
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[10px] text-white/40 border border-white/10 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>

                            {/* User Profile */}
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg overflow-hidden ${item.avatarColor || avatarColors[index % avatarColors.length]}`}>
                                        {item.avatar && item.avatar !== 'null' && item.avatar !== 'undefined' ? (
                                            <img 
                                                src={item.avatar} 
                                                alt={item.name} 
                                                className="w-full h-full object-cover" 
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'User')}&background=random`;
                                                }}
                                            />
                                        ) : (
                                            item.name?.charAt(0) || '?'
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-white font-bold text-lg truncate pr-2">{item.name}</h4>
                                        <div className="flex items-center gap-1 text-white/40 text-xs mt-0.5">
                                            <span>📍</span>
                                            <span className="truncate pr-2">{item.location}</span>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleCallUser(item)}
                                    className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center text-2xl shadow-lg shadow-yellow-400/20 transform hover:scale-110 active:scale-95 transition-all flex-shrink-0"
                                    title="Call again"
                                >
                                    📞
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default DesktopHistoryModal;
