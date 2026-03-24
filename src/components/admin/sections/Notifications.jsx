import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabase';
import {
    Bell, UserPlus, CreditCard, ShieldAlert,
    AlertCircle, CheckCircle2, Info, Clock, Trash2,
    Filter
} from 'lucide-react';
import toast from 'react-hot-toast';

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, unread, users, revenue, reports

    useEffect(() => {
        fetchNotifications();

        // Setting up a realtime subscription for a real app:
        // const channel = supabase.channel('admin_notifications')
        //     .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, payload => handleNewEvent(payload, 'user'))
        //     .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, payload => handleNewEvent(payload, 'revenue'))
        //     .subscribe();
        // return () => supabase.removeChannel(channel);
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        // Because we don't have a dedicated "admin_notifications" table in the existing schema
        // we will derive recent notifications by fetching fresh profiles, txs, and reports.
        try {
            const [usersRes, txsRes, reportsRes] = await Promise.all([
                supabase.from('profiles').select('id, username, created_at').order('created_at', { ascending: false }).limit(10),
                supabase.from('transactions').select('id, amount, type, created_at, user:profiles(username)').eq('status', 'success').order('created_at', { ascending: false }).limit(10),
                supabase.from('reports').select('id, reason, created_at, reporter:profiles!reports_reporter_id_fkey(username), reported:profiles!reports_reported_user_id_fkey(username)').order('created_at', { ascending: false }).limit(10)
            ]);

            let merged = [];

            if (usersRes.data) {
                merged = [...merged, ...usersRes.data.map(u => ({
                    id: `usr-${u.id}`,
                    type: 'user',
                    title: 'New User Registered',
                    message: `${u.username || 'A new user'} just joined the platform.`,
                    timestamp: u.created_at,
                    isRead: true
                }))];
            }

            if (txsRes.data) {
                merged = [...merged, ...txsRes.data.map(t => ({
                    id: `tx-${t.id}`,
                    type: 'revenue',
                    title: t.type === 'subscription' ? 'New Subscription' : 'Coin Purchase',
                    message: `${t.user?.username || 'Guest'} completed a $${t.amount} transaction.`,
                    timestamp: t.created_at,
                    isRead: false
                }))];
            }

            if (reportsRes.data) {
                merged = [...merged, ...reportsRes.data.map(r => ({
                    id: `rpt-${r.id}`,
                    type: 'report',
                    title: 'New Moderation Report',
                    message: `${r.reporter?.username || 'Someone'} reported ${r.reported?.username || 'a user'} for ${r.reason}.`,
                    timestamp: r.created_at,
                    isRead: false
                }))];
            }

            // Sort by recency
            merged.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setNotifications(merged);

        } catch (error) {
            console.error("Failed to load notifications:", error);
            toast.error("Failed to sync notifications");
        }
        setLoading(false);
    };

    const getIcon = (type) => {
        switch (type) {
            case 'user': return <UserPlus size={20} className="text-blue-500" />;
            case 'revenue': return <CreditCard size={20} className="text-green-500" />;
            case 'report': return <ShieldAlert size={20} className="text-red-500" />;
            default: return <Info size={20} className="text-slate-500" />;
        }
    };

    const getBgColor = (type) => {
        switch (type) {
            case 'user': return 'bg-blue-50 border-blue-100';
            case 'revenue': return 'bg-green-50 border-green-100';
            case 'report': return 'bg-red-50 border-red-100';
            default: return 'bg-slate-50 border-slate-100';
        }
    };

    const handleMarkAllRead = () => {
        setNotifications(notifications.map(n => ({ ...n, isRead: true })));
        toast.success("All caught up!");
    };

    const handleClearRead = () => {
        setNotifications(notifications.filter(n => !n.isRead));
        toast.success("Read notifications cleared");
    };

    const filtered = notifications.filter(n => {
        if (filter === 'all') return true;
        if (filter === 'unread') return !n.isRead;
        return n.type === filter;
    });

    return (
        <div className="p-10 max-w-[1600px] mx-auto space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800">Notifications Engine</h1>
                    <p className="text-slate-500 font-medium tracking-tight">System alerts and critical platform events</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleMarkAllRead}
                        className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <CheckCircle2 size={16} /> Mark All Read
                    </button>
                    <button
                        onClick={handleClearRead}
                        className="px-6 py-3 bg-red-50 border border-red-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-100 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <Trash2 size={16} /> Clear Read
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-2 flex items-center gap-2">
                        <Filter size={14} /> Filter Stream
                    </div>
                    {[
                        { id: 'all', label: 'All Alerts' },
                        { id: 'unread', label: 'Unread Only' },
                        { id: 'user', label: 'User Signups' },
                        { id: 'revenue', label: 'Revenue & Payments' },
                        { id: 'report', label: 'Moderation Reports' }
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`px-5 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-left transition-all ${filter === f.id
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                    : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-600'
                                }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 bg-white border border-slate-200 rounded-[40px] shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h2 className="text-lg font-black tracking-tight text-slate-800 flex items-center gap-3">
                            <Bell className="text-indigo-500" size={24} />
                            Activity Stream
                        </h2>
                        <span className="text-[10px] font-black text-white bg-slate-800 px-3 py-1 rounded-full uppercase tracking-widest">
                            {filtered.length} Events
                        </span>
                    </div>

                    <div className="divide-y divide-slate-50">
                        {loading ? (
                            <div className="p-20 text-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
                        ) : filtered.length === 0 ? (
                            <div className="p-20 text-center text-slate-400">
                                <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
                                <div className="font-black uppercase tracking-widest text-xs">No notifications to display</div>
                            </div>
                        ) : filtered.map((note) => (
                            <div key={note.id} className={`p-6 flex gap-6 hover:bg-slate-50/50 transition-colors ${!note.isRead ? 'bg-indigo-50/20' : ''}`}>
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${getBgColor(note.type)}`}>
                                    {getIcon(note.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={`text-sm font-black truncate tracking-tight pr-4 ${!note.isRead ? 'text-slate-900' : 'text-slate-700'}`}>
                                            {note.title}
                                        </h4>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 shrink-0 uppercase tracking-tighter">
                                            <Clock size={12} />
                                            {new Date(note.timestamp).toLocaleString()}
                                        </div>
                                    </div>
                                    <p className="text-xs font-medium text-slate-500 leading-relaxed max-w-2xl">{note.message}</p>
                                </div>
                                {!note.isRead && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0 mt-2 shadow-sm shadow-indigo-500/50"></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Notifications;
