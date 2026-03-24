import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabase';
import { useAdmin } from '../../../context/AdminContext';
import { useAuth } from '../../../context/AuthContext';
import {
    AlertTriangle, Shield, User, Search, RefreshCw,
    Clock, Ban, CheckCircle2, XCircle, AlertCircle, Zap,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

const STRIKE_ACTIONS = {
    1: { label: 'Warning', color: 'text-yellow-600 bg-yellow-100', banHours: 0 },
    2: { label: '24hr Ban', color: 'text-orange-600 bg-orange-100', banHours: 24 },
    3: { label: 'Permanent Ban', color: 'text-red-600 bg-red-100', banHours: -1 },
};

const StrikeSystem = () => {
    const { adminRole } = useAdmin();
    const { currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStrikes, setFilterStrikes] = useState('all');
    const [addingStrike, setAddingStrike] = useState({});
    const [strikeReason, setStrikeReason] = useState('');
    const [showReasonInput, setShowReasonInput] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    useEffect(() => {
        fetchUsers();
    }, [filterStrikes]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('profiles')
                .select('id, username, email, avatar_url, gender, strike_count, is_blocked, ban_expiry, last_strike_at, created_at')
                .order('strike_count', { ascending: false })
                .limit(100);

            if (filterStrikes === '1') query = query.eq('strike_count', 1);
            else if (filterStrikes === '2') query = query.eq('strike_count', 2);
            else if (filterStrikes === '3+') query = query.gte('strike_count', 3);
            else if (filterStrikes === 'banned') query = query.eq('is_blocked', true);
            else query = query.gt('strike_count', 0);

            const { data, error } = await query;
            if (error) throw error;
            setUsers(data || []);
        } catch (err) {
            toast.error('Failed to load users');
        }
        setLoading(false);
    };

    const logAdminAction = async (actionType, targetUserId, reason, details = {}) => {
        try {
            await supabase.from('admin_action_logs').insert({
                admin_id: currentUser?.id,
                admin_email: currentUser?.email,
                action_type: actionType,
                target_user_id: targetUserId,
                target_entity_type: 'profile',
                reason,
                details,
            });
        } catch (e) { console.warn('Could not log admin action', e); }
    };

    const addStrike = async (user) => {
        if (!strikeReason.trim()) {
            toast.error('Please enter a reason for the strike');
            return;
        }
        setAddingStrike(prev => ({ ...prev, [user.id]: true }));
        try {
            const newStrikeCount = (user.strike_count || 0) + 1;
            const action = STRIKE_ACTIONS[Math.min(newStrikeCount, 3)];

            // Calculate ban expiry
            let ban_expiry = null;
            let is_blocked = user.is_blocked;
            if (action.banHours === 24) {
                ban_expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                is_blocked = true;
            } else if (action.banHours === -1) {
                ban_expiry = null;
                is_blocked = true;
            }

            // Update profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    strike_count: newStrikeCount,
                    last_strike_at: new Date().toISOString(),
                    is_blocked,
                    ban_expiry,
                    ban_reason: `Strike ${newStrikeCount}: ${strikeReason}`
                })
                .eq('id', user.id);

            if (profileError) throw profileError;

            // Insert into user_strikes
            await supabase.from('user_strikes').insert({
                user_id: user.id,
                strike_number: newStrikeCount,
                reason: strikeReason,
                admin_id: currentUser?.id,
                action_taken: action.banHours === 0 ? 'warning' : action.banHours === 24 ? '24hr_ban' : 'permanent_ban',
                expires_at: ban_expiry,
            });

            // Log admin action
            await logAdminAction('add_strike', user.id, strikeReason, { strike_number: newStrikeCount, action: action.label });

            toast.success(`Strike ${newStrikeCount} added — ${action.label}`);
            setShowReasonInput(null);
            setStrikeReason('');
            fetchUsers();
        } catch (err) {
            console.error(err);
            toast.error('Failed to add strike');
        }
        setAddingStrike(prev => ({ ...prev, [user.id]: false }));
    };

    const clearStrikes = async (user) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    strike_count: 0,
                    is_blocked: false,
                    ban_expiry: null,
                    ban_reason: null,
                    last_strike_at: null
                })
                .eq('id', user.id);

            if (error) throw error;
            await logAdminAction('clear_strikes', user.id, 'Admin manually cleared strikes', {});
            toast.success('Strikes cleared — user unbanned');
            fetchUsers();
        } catch (err) {
            toast.error('Failed to clear strikes');
        }
    };

    const filtered = users.filter(u =>
        (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase())
    );

    // Pagination Logic
    const { paginatedUsers, totalPages } = React.useMemo(() => {
        const total = filtered.length;
        const pages = Math.ceil(total / itemsPerPage);
        const start = (currentPage - 1) * itemsPerPage;
        const sliced = filtered.slice(start, start + itemsPerPage);
        return { paginatedUsers: sliced, totalPages: pages };
    }, [filtered, currentPage, itemsPerPage]);

    // Reset to page 1 when search or filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [search, filterStrikes]);

    const StrikeBadge = ({ count }) => {
        const n = Math.min(count, 3);
        const cfg = STRIKE_ACTIONS[n] || STRIKE_ACTIONS[1];
        return (
            <span className={`px-3 py-1 rounded-lg text-xs font-black ${cfg.color}`}>
                {count} Strike{count !== 1 ? 's' : ''} — {cfg.label}
            </span>
        );
    };

    return (
        <div className="p-10 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800">Strike System</h1>
                    <p className="text-slate-500 font-medium tracking-tight">Track and manage user violations</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                        {['all', '1', '2', '3+', 'banned'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilterStrikes(f)}
                                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStrikes === f ? 'bg-[#0F172A] text-white shadow' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {f === 'all' ? 'All Flagged' : f === 'banned' ? 'Banned' : `${f} Strike${f === '1' ? '' : 's'}`}
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search user..." className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 w-48" />
                    </div>
                    <button onClick={fetchUsers} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 transition-all">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Strike Rules Info */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                    { strikes: '1 Strike', action: 'Warning', desc: 'User gets a warning notification', icon: <AlertCircle size={20} />, color: 'yellow' },
                    { strikes: '2 Strikes', action: '24hr Ban', desc: 'User is banned for 24 hours', icon: <Clock size={20} />, color: 'orange' },
                    { strikes: '3+ Strikes', action: 'Permanent Ban', desc: 'User is permanently banned', icon: <Ban size={20} />, color: 'red' },
                ].map(rule => (
                    <div key={rule.strikes} className={`bg-white rounded-[24px] border border-${rule.color}-200 p-6 shadow-sm`}>
                        <div className={`text-${rule.color}-500 mb-3`}>{rule.icon}</div>
                        <div className={`text-xs font-black uppercase tracking-widest text-${rule.color}-500 mb-1`}>{rule.strikes}</div>
                        <div className="font-black text-slate-800">{rule.action}</div>
                        <div className="text-xs text-slate-400 font-medium mt-1">{rule.desc}</div>
                    </div>
                ))}
            </div>

            {/* Users List */}
            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="py-20 text-center bg-white rounded-[32px] border border-slate-100">
                        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Loading violations...</p>
                    </div>
                ) : paginatedUsers.length === 0 ? (
                    <div className="py-20 text-center bg-white rounded-[32px] border border-slate-100">
                        <Shield size={48} className="text-green-300 mx-auto mb-4" />
                        <p className="text-slate-400 font-black text-xs uppercase tracking-widest">No violations found</p>
                    </div>
                ) : paginatedUsers.map(user => (
                    <div key={user.id} className="bg-white rounded-[28px] border border-slate-200 shadow-sm hover:shadow-lg transition-all p-6 flex flex-col lg:flex-row items-start lg:items-center gap-6">
                        {/* User Info */}
                        <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-500 text-lg shrink-0 overflow-hidden">
                                {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" alt="" /> : user.username?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                                <div className="font-black text-slate-800">{user.username || 'Unknown'}</div>
                                <div className="text-xs text-slate-400 font-bold">{user.email}</div>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <StrikeBadge count={user.strike_count || 0} />
                                    {user.is_blocked && (
                                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-red-100 text-red-600">
                                            {user.ban_expiry ? `Banned until ${new Date(user.ban_expiry).toLocaleDateString()}` : 'Permanently Banned'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Last strike date */}
                        {user.last_strike_at && (
                            <div className="text-xs text-slate-400 font-bold shrink-0">
                                Last strike: {new Date(user.last_strike_at).toLocaleDateString()}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                            {showReasonInput === user.id ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={strikeReason}
                                        onChange={e => setStrikeReason(e.target.value)}
                                        placeholder="Reason for strike..."
                                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 w-52"
                                        onKeyDown={e => { if (e.key === 'Enter') addStrike(user); }}
                                    />
                                    <button
                                        onClick={() => addStrike(user)}
                                        disabled={addingStrike[user.id]}
                                        className="py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-600/20 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        Confirm
                                    </button>
                                    <button
                                        onClick={() => { setShowReasonInput(null); setStrikeReason(''); }}
                                        className="py-2 px-3 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setShowReasonInput(user.id)}
                                        className="py-2.5 px-5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-600/20 transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        <Zap size={14} />
                                        Add Strike
                                    </button>
                                    <button
                                        onClick={() => clearStrikes(user)}
                                        className="py-2.5 px-5 bg-green-100 hover:bg-green-200 text-green-700 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        <CheckCircle2 size={14} />
                                        Clear All
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination Controls */}
            {!loading && filtered.length > 0 && (
                <div className="px-8 py-5 bg-white border border-slate-200 mt-6 rounded-[28px] flex items-center justify-between shadow-sm">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        Showing {Math.min(filtered.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filtered.length, currentPage * itemsPerPage)} of {filtered.length} records
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 disabled:opacity-50 transition-all shadow-sm"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div className="flex items-center gap-1">
                            {[...Array(totalPages)].map((_, i) => {
                                const page = i + 1;
                                if (totalPages > 7 && Math.abs(page - currentPage) > 2 && page !== 1 && page !== totalPages) {
                                    if (Math.abs(page - currentPage) === 3) return <span key={page} className="px-2 text-slate-300">...</span>;
                                    return null;
                                }
                                return (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${currentPage === page ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'bg-white border border-slate-200 text-slate-500 hover:border-indigo-300'}`}
                                    >
                                        {page}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 disabled:opacity-50 transition-all shadow-sm"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StrikeSystem;
