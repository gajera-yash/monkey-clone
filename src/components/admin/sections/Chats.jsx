import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../../supabase';
import {
    Video, MessageSquare, Clock, ShieldAlert,
    XCircle, Play, Users, Globe, Filter, Search, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';

const Chats = () => {
    const [activeChats, setActiveChats] = useState([]);
    const [chatHistory, setChatHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState('active'); // active, history
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (activeView === 'active') {
            fetchActiveChats();
        } else {
            fetchChatHistory();
        }
    }, [activeView]);

    const fetchActiveChats = async () => {
        setLoading(true);
        // In a real app, this would use Supabase Presence or a 'rooms' table with status='active'
        const { data, error } = await supabase
            .from('chat_logs')
            .select(`
                *,
                user1:profiles!chat_logs_user1_id_fkey(username, avatar_url, gender),
                user2:profiles!chat_logs_user2_id_fkey(username, avatar_url, gender)
            `)
            .is('end_time', null)
            .order('start_time', { ascending: false });

        if (error) toast.error("Failed to load active chats");
        else setActiveChats(data || []);
        setLoading(false);
    };

    const fetchChatHistory = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('chat_logs')
            .select(`
                *,
                user1:profiles!chat_logs_user1_id_fkey(username, avatar_url),
                user2:profiles!chat_logs_user2_id_fkey(username, avatar_url)
            `)
            .not('end_time', 'is', null)
            .order('end_time', { ascending: false })
            .limit(50);

        if (error) toast.error("Failed to load history");
        else setChatHistory(data || []);
        setLoading(false);
    };

    const handleTerminate = async (chatId) => {
        const { error } = await supabase
            .from('chat_logs')
            .update({ end_time: new Date().toISOString() })
            .eq('id', chatId);

        if (error) toast.error("Termination failed");
        else {
            toast.success("Chat terminated");
            fetchActiveChats();
        }
    };

    return (
        <div className="p-10 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800">Chat Monitoring</h1>
                    <p className="text-slate-500 font-medium tracking-tight">Real-time surveillance of platform interactions</p>
                </div>

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

            {activeView === 'active' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {loading ? (
                        <div className="col-span-full p-20 text-center bg-white rounded-[40px] border border-slate-100 italic-none">
                            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Connecting to streams...</p>
                        </div>
                    ) : activeChats.length === 0 ? (
                        <div className="col-span-full p-20 text-center bg-white rounded-[40px] border border-slate-100">
                            <Video size={48} className="text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No active video chats right now</p>
                        </div>
                    ) : activeChats.map((chat) => (
                        <div key={chat.id} className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm hover:shadow-xl transition-all group">
                            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Globe size={14} className="text-indigo-500" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Room</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                    <span className="text-[10px] font-black text-green-600 uppercase">Live</span>
                                </div>
                            </div>

                            <div className="p-8 relative">
                                <div className="flex items-center justify-between gap-4 mb-8">
                                    <div className="flex flex-col items-center gap-3 flex-1 min-w-0">
                                        <div className="w-16 h-16 rounded-[24px] bg-slate-100 p-0.5 border border-slate-200 shadow-sm overflow-hidden">
                                            {chat.user1?.avatar_url ? <img src={chat.user1.avatar_url} alt="" className="w-full h-full object-cover rounded-[22px]" /> : <div className="w-full h-full flex items-center justify-center font-black text-slate-400">?</div>}
                                        </div>
                                        <span className="text-sm font-black text-slate-800 truncate w-full text-center">{chat.user1?.username || 'Guest'}</span>
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${chat.user1?.gender === 'female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>{chat.user1?.gender || 'Unknown'}</span>
                                    </div>

                                    <div className="flex flex-col items-center gap-2">
                                        <div className="h-px w-12 bg-slate-200"></div>
                                        <Clock size={16} className="text-slate-300" />
                                        <div className="h-px w-12 bg-slate-200"></div>
                                    </div>

                                    <div className="flex flex-col items-center gap-3 flex-1 min-w-0">
                                        <div className="w-16 h-16 rounded-[24px] bg-slate-100 p-0.5 border border-slate-200 shadow-sm overflow-hidden">
                                            {chat.user2?.avatar_url ? <img src={chat.user2.avatar_url} alt="" className="w-full h-full object-cover rounded-[22px]" /> : <div className="w-full h-full flex items-center justify-center font-black text-slate-400">?</div>}
                                        </div>
                                        <span className="text-sm font-black text-slate-800 truncate w-full text-center">{chat.user2?.username || 'Guest'}</span>
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${chat.user2?.gender === 'female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>{chat.user2?.gender || 'Unknown'}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100 justify-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration:</span>
                                    <span className="text-sm font-black text-indigo-600">
                                        {Math.floor((new Date() - new Date(chat.start_time)) / 60000)}m {Math.floor(((new Date() - new Date(chat.start_time)) % 60000) / 1000)}s
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button className="py-3 bg-slate-100 hover:bg-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 transition-all flex items-center justify-center gap-2">
                                        <Play size={14} /> Listen
                                    </button>
                                    <button
                                        onClick={() => handleTerminate(chat.id)}
                                        className="py-3 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-red-100"
                                    >
                                        <XCircle size={14} /> Terminate
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-xl shadow-slate-200/50">
                    <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Filter by user ID or name..."
                                className="bg-white border border-slate-200 pl-11 pr-6 py-2.5 rounded-xl w-80 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className="px-6 py-2.5 bg-slate-900 border border-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all">Export Logs</button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-50 italic-none">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Participants</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Duration</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Ended By</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr><td colSpan="5" className="p-20 text-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div></td></tr>
                                ) : chatHistory.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="flex -space-x-4">
                                                    <div className="w-9 h-9 rounded-xl bg-slate-100 border-2 border-white shadow-sm overflow-hidden shrink-0">
                                                        {log.user1?.avatar_url && <img src={log.user1.avatar_url} className="w-full h-full object-cover" />}
                                                    </div>
                                                    <div className="w-9 h-9 rounded-xl bg-slate-200 border-2 border-white shadow-sm overflow-hidden shrink-0">
                                                        {log.user2?.avatar_url && <img src={log.user2.avatar_url} className="w-full h-full object-cover" />}
                                                    </div>
                                                </div>
                                                <div className="truncate">
                                                    <div className="text-[11px] font-black text-slate-700">{log.user1?.username || 'Guest'} ↔ {log.user2?.username || 'Guest'}</div>
                                                    <div className="text-[9px] text-slate-400 font-bold uppercase">{new Date(log.start_time).toLocaleString()}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 capitalize">
                                            <div className="text-sm font-black text-slate-700">{log.duration ? `${Math.floor(log.duration / 60)}m ${log.duration % 60}s` : 'Short'}</div>
                                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{log.messages_count || 0} messages</div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="text-xs font-bold text-slate-500">
                                                {log.ended_by === log.user1_id ? 'User 1' : log.ended_by === log.user2_id ? 'User 2' : 'System'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            {log.was_reported ? (
                                                <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-red-100">Reported</span>
                                            ) : (
                                                <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-200">Normal</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button className="p-2.5 hover:bg-white hover:shadow-md rounded-xl text-slate-400 hover:text-indigo-600 border border-transparent hover:border-slate-100 transition-all">
                                                <Eye size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chats;
