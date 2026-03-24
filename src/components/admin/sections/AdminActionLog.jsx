import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabase';
import {
    ClipboardList, Search, RefreshCw, Shield, Ban, AlertTriangle,
    CheckCircle2, XCircle, Globe, UserX, Settings, Zap, Eye,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

const ACTION_ICONS = {
    ban: <Ban size={14} className="text-red-500" />,
    unban: <CheckCircle2 size={14} className="text-green-500" />,
    add_strike: <Zap size={14} className="text-orange-500" />,
    clear_strikes: <CheckCircle2 size={14} className="text-green-500" />,
    dismiss: <XCircle size={14} className="text-slate-400" />,
    review: <Eye size={14} className="text-blue-500" />,
    add_geo_block: <Globe size={14} className="text-red-500" />,
    remove_geo_block: <Globe size={14} className="text-green-500" />,
    enable_geo_block: <Globe size={14} className="text-blue-500" />,
    disable_geo_block: <Globe size={14} className="text-slate-400" />,
    settings_change: <Settings size={14} className="text-slate-500" />,
    permanent_ban: <UserX size={14} className="text-red-600" />,
};

const ACTION_LABELS = {
    ban: 'User Banned',
    unban: 'User Unbanned',
    add_strike: 'Strike Added',
    clear_strikes: 'Strikes Cleared',
    dismiss: 'Report Dismissed',
    review: 'Report Reviewed',
    add_geo_block: 'Country Blocked',
    remove_geo_block: 'Country Unblocked',
    enable_geo_block: 'Geo Block Enabled',
    disable_geo_block: 'Geo Block Disabled',
    settings_change: 'Settings Changed',
    permanent_ban: 'Permanent Ban Applied',
};

const ACTION_COLORS = {
    ban: 'bg-red-100 text-red-700',
    unban: 'bg-green-100 text-green-700',
    add_strike: 'bg-orange-100 text-orange-700',
    clear_strikes: 'bg-emerald-100 text-emerald-700',
    dismiss: 'bg-slate-100 text-slate-600',
    review: 'bg-blue-100 text-blue-700',
    add_geo_block: 'bg-red-100 text-red-600',
    remove_geo_block: 'bg-green-100 text-green-600',
    enable_geo_block: 'bg-blue-100 text-blue-600',
    disable_geo_block: 'bg-slate-100 text-slate-500',
    settings_change: 'bg-purple-100 text-purple-600',
    permanent_ban: 'bg-red-200 text-red-800',
};

const AdminActionLog = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [page, setPage] = useState(0); // 0-indexed for .range()
    const PAGE_SIZE = 10;

    const ACTION_TYPES = ['all', 'ban', 'add_strike', 'clear_strikes', 'add_geo_block', 'review', 'dismiss', 'settings_change'];

    useEffect(() => { fetchLogs(); }, [filterType, page]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('admin_action_logs')
                .select(`
                    *,
                    admin:profiles!admin_action_logs_admin_id_fkey(username, email, avatar_url),
                    target_user:profiles!admin_action_logs_target_user_id_fkey(username, email, avatar_url)
                `)
                .order('created_at', { ascending: false })
                .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

            if (filterType !== 'all') {
                query = query.eq('action_type', filterType);
            }

            const { data, error } = await query;
            if (error) throw error;
            setLogs(data || []);
        } catch (err) {
            toast.error('Failed to load action logs');
        }
        setLoading(false);
    };

    const filtered = logs.filter(log => {
        const q = search.toLowerCase();
        return (
            (log.admin?.username || '').toLowerCase().includes(q) ||
            (log.admin?.email || '').toLowerCase().includes(q) ||
            (log.target_user?.username || '').toLowerCase().includes(q) ||
            (log.reason || '').toLowerCase().includes(q) ||
            (log.action_type || '').toLowerCase().includes(q)
        );
    });

    return (
        <div className="p-10 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800">Admin Action Log</h1>
                    <p className="text-slate-500 font-medium tracking-tight">Complete audit trail of all admin actions</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs..." className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none w-52" />
                    </div>
                    <button onClick={fetchLogs} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 transition-all">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2 mb-8">
                {ACTION_TYPES.map(type => (
                    <button
                        key={type}
                        onClick={() => { setFilterType(type); setPage(0); }}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${filterType === type ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}
                    >
                        {ACTION_LABELS[type] || 'All Actions'}
                    </button>
                ))}
            </div>

            {/* Log Table */}
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-100">
                            {['Action', 'Admin', 'Target User', 'Reason', 'Time'].map(h => (
                                <th key={h} className="text-left px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[2px]">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan={5} className="py-20 text-center">
                                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                <span className="text-slate-400 font-black text-xs uppercase tracking-widest">Loading audit log...</span>
                            </td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={5} className="py-20 text-center">
                                <ClipboardList size={40} className="mx-auto text-slate-200 mb-3" />
                                <span className="text-slate-400 font-black text-xs uppercase tracking-widest">No actions recorded yet</span>
                            </td></tr>
                        ) : filtered.map(log => (
                            <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        {ACTION_ICONS[log.action_type] || <Shield size={14} className="text-slate-400" />}
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${ACTION_COLORS[log.action_type] || 'bg-slate-100 text-slate-600'}`}>
                                            {ACTION_LABELS[log.action_type] || log.action_type}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-xl bg-indigo-100 flex items-center justify-center text-xs font-black text-indigo-600 shrink-0 overflow-hidden">
                                            {log.admin?.avatar_url ? <img src={log.admin.avatar_url} className="w-full h-full object-cover" alt="" /> : log.admin?.username?.[0]?.toUpperCase() || 'A'}
                                        </div>
                                        <div>
                                            <div className="font-black text-sm text-slate-700 leading-none">{log.admin?.username || 'Admin'}</div>
                                            <div className="text-[10px] text-slate-400">{log.admin_email || log.admin?.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {log.target_user ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500 shrink-0 overflow-hidden">
                                                {log.target_user?.avatar_url ? <img src={log.target_user.avatar_url} className="w-full h-full object-cover" alt="" /> : log.target_user?.username?.[0]?.toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <div className="font-black text-sm text-slate-700 leading-none">{log.target_user?.username || '—'}</div>
                                                <div className="text-[10px] text-slate-400">{log.target_user?.email}</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-slate-300 text-sm font-bold">{log.target_entity_type || '—'}</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 max-w-[240px]">
                                    <p className="text-sm text-slate-600 font-medium truncate">{log.reason || '—'}</p>
                                    {log.details && Object.keys(log.details).length > 0 && (
                                        <p className="text-[10px] text-slate-300 font-bold mt-0.5 truncate">
                                            {Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                                        </p>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-xs text-slate-500 font-bold whitespace-nowrap">
                                        {new Date(log.created_at).toLocaleString()}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="px-8 py-5 bg-slate-100/50 border border-slate-200 mt-6 rounded-[24px] flex items-center justify-between">
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

export default AdminActionLog;
