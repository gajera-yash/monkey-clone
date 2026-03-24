import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabase';
import {
    Video, MessageSquare, Clock, ShieldAlert,
    XCircle, Play, Users, Globe, Search, Eye, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

const Chats = () => {
    const [activeChats, setActiveChats] = useState([]);
    const [chatHistory, setChatHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState('active'); // active, history
    const [searchTerm, setSearchTerm] = useState('');
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (activeView === 'active') {
            fetchActiveChats();
        } else {
            fetchChatHistory();
        }
    }, [activeView]);

    // Real-time subscription for live updates without manual refresh
    useEffect(() => {
        const channel = supabase
            .channel('chats-realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'chat_logs'
            }, () => {
                if (activeView === 'active') {
                    fetchActiveChats();
                } else {
                    fetchChatHistory();
                }
            })
            .subscribe();

        // Also poll every 20s to prevent data freeze
        const pollInterval = setInterval(() => {
            if (activeView === 'active') fetchActiveChats();
        }, 20000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(pollInterval);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeView]);

    const fetchActiveChats = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('chat_logs')
            .select(`
                *,
                user1:profiles!chat_logs_user1_id_fkey(username, avatar_url, gender, location_city, location_country),
                user2:profiles!chat_logs_user2_id_fkey(username, avatar_url, gender, location_city, location_country)
            `)
            .is('end_time', null)
            .order('start_time', { ascending: false });

        if (error) {
            console.error('Failed to load active chats:', error);
            toast.error('Failed to load active chats: ' + error.message);
        } else {
            setActiveChats(data || []);
        }
        setLoading(false);
    };

    const fetchChatHistory = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('chat_logs')
            .select(`
                *,
                user1:profiles!chat_logs_user1_id_fkey(username, avatar_url, gender, location_city, location_country),
                user2:profiles!chat_logs_user2_id_fkey(username, avatar_url, gender, location_city, location_country)
            `)
            .not('end_time', 'is', null)
            .order('end_time', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Failed to load history:', error);
            toast.error('Failed to load history: ' + error.message);
        } else {
            setChatHistory(data || []);
        }
        setLoading(false);
    };

    const handleTerminate = async (chatId) => {
        const now = new Date().toISOString();
        const chat = activeChats.find(c => c.id === chatId);
        const durationSec = chat
            ? Math.floor((new Date(now) - new Date(chat.start_time)) / 1000)
            : 0;

        const { error } = await supabase
            .from('chat_logs')
            .update({
                end_time: now,
                duration: durationSec
            })
            .eq('id', chatId);

        if (error) toast.error('Termination failed: ' + error.message);
        else {
            toast.success('Chat terminated');
            fetchActiveChats();
        }
    };

    const handleCleanup = async () => {
        const confirm = window.confirm("Are you sure you want to mark all sessions older than 2 hours as finished? This will clean up any 'stuck' live sessions.");
        if (!confirm) return;

        try {
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
            
            // Note: We can't easily calculate duration in a bulk update without a DB function
            // so we'll just set end_time to match start_time + some default if we really needed it, 
            // but setting end_time is enough to move them to history.
            const { error } = await supabase
                .from('chat_logs')
                .update({ 
                    end_time: new Date().toISOString(),
                    duration: 3600 // Default 1 hour if ended by cleanup
                })
                .is('end_time', null)
                .lt('start_time', twoHoursAgo);

            if (error) throw error;
            toast.success("Cleanup successful. Old 'stuck' sessions have been closed.");
            fetchActiveChats();
        } catch (error) {
            console.error('Cleanup failed:', error);
            toast.error('Cleanup failed: ' + error.message);
        }
    };

    const filteredHistory = chatHistory.filter(log => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            log.user1?.username?.toLowerCase().includes(term) ||
            log.user2?.username?.toLowerCase().includes(term) ||
            log.room_id?.toLowerCase().includes(term)
        );
    });

    const formatLocation = (profile) => {
        if (profile?.location_city && profile?.location_country)
            return `${profile.location_city}, ${profile.location_country}`;
        if (profile?.location_country) return profile.location_country;
        return 'Unknown';
    };

    return (
        <div className="p-10 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800">Chat Monitoring</h1>
                    <p className="text-slate-500 font-medium tracking-tight">Real-time surveillance of platform interactions</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => activeView === 'active' ? fetchActiveChats() : fetchChatHistory()}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>

                    <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm shrink-0">
                        <button
                            onClick={() => setActiveView('active')}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeView === 'active'
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            <div className={`w-2 h-2 rounded-full ${activeView === 'active' ? 'bg-white animate-pulse' : 'bg-slate-300'}`}></div>
                            Live Now ({activeChats.length})
                        </button>
                        <button
                            onClick={() => setActiveView('history')}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeView === 'history'
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            Chat Logs
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-xl shadow-slate-200/50">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Filter by user name or room ID..."
                            className="bg-white border border-slate-200 pl-11 pr-6 py-2.5 rounded-xl w-80 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                            {activeView === 'active' ? `Active Streams: ${activeChats.length}` : `Stored Logs: ${chatHistory.length}`}
                        </span>
                        {activeView === 'active' && activeChats.length > 0 && (
                            <button 
                                onClick={handleCleanup}
                                className="px-4 py-2 bg-orange-50 text-orange-600 border border-orange-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all flex items-center gap-2"
                            >
                                <RefreshCw size={14} /> Cleanup Inactive
                            </button>
                        )}
                        <button className="px-6 py-2.5 bg-slate-900 border border-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all">Export</button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-50">
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Participants</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Room / Session ID</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Duration</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status / msgs</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="5" className="p-20 text-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div></td></tr>
                            ) : (activeView === 'active' ? activeChats : filteredHistory).length === 0 ? (
                                <tr><td colSpan="5" className="p-16 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No matching activities found</td></tr>
                            ) : (activeView === 'active' ? activeChats : filteredHistory).map((chat) => (
                                <tr key={chat.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="flex -space-x-4">
                                                <div className="w-9 h-9 rounded-xl bg-slate-100 border-2 border-white shadow-sm overflow-hidden shrink-0">
                                                    {chat.user1?.avatar_url && <img src={chat.user1.avatar_url} className="w-full h-full object-cover" alt="" />}
                                                </div>
                                                <div className="w-9 h-9 rounded-xl bg-slate-200 border-2 border-white shadow-sm overflow-hidden shrink-0">
                                                    {chat.user2?.avatar_url && <img src={chat.user2.avatar_url} className="w-full h-full object-cover" alt="" />}
                                                </div>
                                            </div>
                                            <div className="truncate">
                                                <div className="text-[11px] font-black text-slate-700">{chat.user1?.username || 'Guest'} ↔ {chat.user2?.username || 'Guest'}</div>
                                                <div className="text-[9px] text-slate-400 font-bold uppercase">{new Date(chat.start_time).toLocaleString()}</div>
                                                <div className="text-[8px] text-slate-300 font-bold uppercase mt-1">
                                                    {chat.user1?.gender || 'Unknown'} / {formatLocation(chat.user1)} ↔ {chat.user2?.gender || 'Unknown'} / {formatLocation(chat.user2)}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="font-mono text-[10px] text-slate-500 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100 flex flex-col gap-0.5 max-w-[150px]">
                                            <span className="text-[8px] text-slate-300 font-black uppercase">Room</span>
                                            <span className="truncate">{chat.room_id || 'System Room'}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className={`text-sm font-black ${chat.end_time ? 'text-slate-600' : 'text-indigo-600'}`}>
                                            {chat.end_time ? (
                                                `${Math.floor(chat.duration / 60)}m ${chat.duration % 60}s`
                                            ) : (
                                                `${Math.floor((now - new Date(chat.start_time)) / 60000)}m ${Math.floor(((now - new Date(chat.start_time)) % 60000) / 1000)}s`
                                            )}
                                        </div>
                                        {!chat.end_time && (
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${((now - new Date(chat.start_time)) / 60000) > 30 ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                                                <span className={`text-[8px] font-black uppercase ${((now - new Date(chat.start_time)) / 60000) > 30 ? 'text-orange-600' : 'text-green-600'}`}>
                                                    {((now - new Date(chat.start_time)) / 60000) > 30 ? 'POTENTIALLY STUCK' : `Live Since ${new Date(chat.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col gap-1.5">
                                            {chat.end_time ? (
                                                <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200 inline-block w-fit">Finished</span>
                                            ) : (
                                                <span className="px-2.5 py-1 bg-green-50 text-green-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-green-100 inline-block w-fit">Streaming</span>
                                            )}
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">{chat.messages_count || 0} messages</div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {!chat.end_time ? (
                                                <button 
                                                    onClick={() => handleTerminate(chat.id)}
                                                    className="p-2.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl transition-all border border-rose-100"
                                                    title="Terminate Session"
                                                >
                                                    <XCircle size={16} />
                                                </button>
                                            ) : (
                                                <button className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all">
                                                    <Eye size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Chats;
