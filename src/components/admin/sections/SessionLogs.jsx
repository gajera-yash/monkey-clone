import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabase';
import { useAdmin } from '../../../context/AdminContext';
import {
    FileText, Search, ChevronDown, ChevronUp, Clock, User,
    Shield, RefreshCw, Filter, AlertTriangle, Users,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

const SessionLogs = () => {
    const { adminRole } = useAdmin();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [page, setPage] = useState(0); // 0-indexed for .range()
    const PAGE_SIZE = 10;

    useEffect(() => {
        fetchLogs();
    }, [page]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('chat_logs')
                .select(`
                    *,
                    user_a:profiles!chat_logs_user1_id_fkey(id, username, email, gender, birthdate, location_country, avatar_url),
                    user_b:profiles!chat_logs_user2_id_fkey(id, username, email, gender, birthdate, location_country, avatar_url)
                `)
                .order('start_time', { ascending: false })
                .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

            if (error) throw error;

            // For each log, count reports during that session 
            const enriched = await Promise.all((data || []).map(async (log) => {
                // Safety check: if user IDs are missing, don't query reports
                if (!log.user1_id || !log.user2_id) {
                    return { ...log, reports_during_session: 0 };
                }

                const { count } = await supabase
                    .from('reports')
                    .select('id', { count: 'exact', head: true })
                    .or(`reporter_id.eq.${log.user1_id},reporter_id.eq.${log.user2_id},reported_user_id.eq.${log.user1_id},reported_user_id.eq.${log.user2_id}`)
                    .gte('created_at', log.start_time)
                    .lte('created_at', log.end_time || new Date().toISOString());

                return { ...log, reports_during_session: count || 0 };
            }));

            setLogs(enriched);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load session logs');
        }
        setLoading(false);
    };

    const calculateAge = (birthdate) => {
        if (!birthdate) return '?';
        const birth = new Date(birthdate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '0s';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    const filtered = logs.filter(log => {
        const q = search.toLowerCase();
        return (
            (log.user_a?.username || '').toLowerCase().includes(q) ||
            (log.user_b?.username || '').toLowerCase().includes(q) ||
            (log.room_id || '').toLowerCase().includes(q) ||
            (log.id || '').toLowerCase().includes(q)
        );
    });

    return (
        <div className="p-10 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800">Session Logs</h1>
                    <p className="text-slate-500 font-medium tracking-tight">Full detail of every chat session</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by username or session ID..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 w-72"
                        />
                    </div>
                    <button
                        onClick={fetchLogs}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 transition-all"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-100">
                            {['Session ID', 'User A', 'User B', 'Start Time', 'Duration', 'Disconnected By', 'Reports'].map(h => (
                                <th key={h} className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[2px]">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan={7} className="py-20 text-center">
                                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                <span className="text-slate-400 font-black text-xs uppercase tracking-widest">Loading sessions...</span>
                            </td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={7} className="py-20 text-center">
                                <FileText size={40} className="mx-auto text-slate-200 mb-3" />
                                <span className="text-slate-400 font-black text-xs uppercase tracking-widest">No sessions found</span>
                            </td></tr>
                        ) : filtered.map(log => (
                            <React.Fragment key={log.id}>
                                <tr
                                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                                >
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                                            {log.id?.slice(0, 8)}...
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-xs font-black text-indigo-600">
                                                {log.user_a?.username?.[0]?.toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <div className="font-black text-sm text-slate-700">{log.user_a?.username || 'Guest'}</div>
                                                <div className="text-xs text-slate-400">{log.user_a?.gender || '?'}, {calculateAge(log.user_a?.birthdate)}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-xs font-black text-purple-600">
                                                {log.user_b?.username?.[0]?.toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <div className="font-black text-sm text-slate-700">{log.user_b?.username || 'Guest'}</div>
                                                <div className="text-xs text-slate-400">{log.user_b?.gender || '?'}, {calculateAge(log.user_b?.birthdate)}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-slate-600 font-bold">
                                            {log.start_time ? new Date(log.start_time).toLocaleString() : '—'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-lg text-xs font-black ${
                                            log.duration > 300 ? 'bg-green-100 text-green-700' :
                                            log.duration > 60 ? 'bg-blue-100 text-blue-700' :
                                            'bg-slate-100 text-slate-500'
                                        }`}>
                                            {formatDuration(log.duration)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-lg text-xs font-black ${
                                            log.disconnected_by === 'system' ? 'bg-red-100 text-red-600' :
                                            'bg-slate-100 text-slate-600'
                                        }`}>
                                            {log.disconnected_by || 'Normal'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {log.reports_during_session > 0 ? (
                                                <span className="px-2.5 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-black">
                                                    {log.reports_during_session} report{log.reports_during_session > 1 ? 's' : ''}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 text-xs font-bold">None</span>
                                            )}
                                            {expandedId === log.id ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                                        </div>
                                    </td>
                                </tr>
                                {expandedId === log.id && (
                                    <tr className="bg-slate-50">
                                        <td colSpan={7} className="px-8 py-6">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                {/* User A Detail */}
                                                <div className="bg-white rounded-2xl p-5 border border-slate-200">
                                                    <div className="text-[10px] font-black text-indigo-500 uppercase tracking-[2px] mb-3">User A (Initiator)</div>
                                                    <div className="space-y-2 text-sm">
                                                        <div><span className="text-slate-400 font-bold">Name: </span><span className="text-slate-700 font-black">{log.user_a?.username || 'Guest'}</span></div>
                                                        <div><span className="text-slate-400 font-bold">Email: </span><span className="text-slate-700 font-bold">{log.user_a?.email || '—'}</span></div>
                                                        <div><span className="text-slate-400 font-bold">Gender: </span><span className="text-slate-700 font-bold">{log.user_a?.gender || '—'}</span></div>
                                                        <div><span className="text-slate-400 font-bold">Age: </span><span className="text-slate-700 font-bold">{calculateAge(log.user_a?.birthdate)}</span></div>
                                                        <div><span className="text-slate-400 font-bold">Location: </span><span className="text-slate-700 font-bold">{log.user_a?.location_country || '—'}</span></div>
                                                        <div className="pt-1 border-t border-slate-100 font-mono text-[10px] text-slate-400 break-all">ID: {log.user1_id}</div>
                                                    </div>
                                                </div>
                                                {/* User B Detail */}
                                                <div className="bg-white rounded-2xl p-5 border border-slate-200">
                                                    <div className="text-[10px] font-black text-purple-500 uppercase tracking-[2px] mb-3">User B (Receiver)</div>
                                                    <div className="space-y-2 text-sm">
                                                        <div><span className="text-slate-400 font-bold">Name: </span><span className="text-slate-700 font-black">{log.user_b?.username || 'Guest'}</span></div>
                                                        <div><span className="text-slate-400 font-bold">Email: </span><span className="text-slate-700 font-bold">{log.user_b?.email || '—'}</span></div>
                                                        <div><span className="text-slate-400 font-bold">Gender: </span><span className="text-slate-700 font-bold">{log.user_b?.gender || '—'}</span></div>
                                                        <div><span className="text-slate-400 font-bold">Age: </span><span className="text-slate-700 font-bold">{calculateAge(log.user_b?.birthdate)}</span></div>
                                                        <div><span className="text-slate-400 font-bold">Location: </span><span className="text-slate-700 font-bold">{log.user_b?.location_country || '—'}</span></div>
                                                        <div className="pt-1 border-t border-slate-100 font-mono text-[10px] text-slate-400 break-all">ID: {log.user2_id}</div>
                                                    </div>
                                                </div>
                                                {/* Session Detail */}
                                                <div className="bg-white rounded-2xl p-5 border border-slate-200">
                                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-[2px] mb-3">Session Detail</div>
                                                    <div className="space-y-2 text-sm">
                                                        <div><span className="text-slate-400 font-bold">Session ID: </span><span className="font-mono text-[10px] text-slate-600 break-all">{log.id}</span></div>
                                                        <div><span className="text-slate-400 font-bold">Room ID: </span><span className="font-mono text-[10px] text-slate-600 break-all">{log.room_id || '—'}</span></div>
                                                        <div><span className="text-slate-400 font-bold">Start: </span><span className="text-slate-700 font-bold">{log.start_time ? new Date(log.start_time).toLocaleString() : '—'}</span></div>
                                                        <div><span className="text-slate-400 font-bold">End: </span><span className="text-slate-700 font-bold">{log.end_time ? new Date(log.end_time).toLocaleString() : 'Ongoing'}</span></div>
                                                        <div><span className="text-slate-400 font-bold">Duration: </span><span className="text-slate-700 font-bold">{formatDuration(log.duration)}</span></div>
                                                        <div><span className="text-slate-400 font-bold">Messages: </span><span className="text-slate-700 font-bold">{log.messages_count || 0}</span></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="px-8 py-5 bg-white border border-slate-200 mt-6 rounded-[28px] flex items-center justify-between shadow-sm">
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Page {page + 1}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 disabled:opacity-50 transition-all shadow-sm"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    
                    <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={filtered.length < PAGE_SIZE}
                        className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 disabled:opacity-50 transition-all shadow-sm"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SessionLogs;
