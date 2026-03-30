import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAdmin } from '../../context/AdminContext';
import { supabase } from '../../supabase';
import toast from 'react-hot-toast';
import {
    LayoutDashboard, Users as UsersIcon, MessageSquare, ShieldAlert,
    CreditCard, BarChart3, Palette, Settings,
    Lock, Bell, LifeBuoy, Menu, X, ChevronRight, LogOut, Coins, ShieldCheck, Wallet,
    FileText, Zap, Globe, ClipboardList, Receipt
} from 'lucide-react';

// Real Section Imports
import Dashboard from './sections/Dashboard';
import Reports from './sections/Reports';
import Users from './sections/Users';
import Verifications from './sections/Verifications';
import FemaleVerifications from './sections/FemaleVerifications';
import Creators from './sections/Creators';
import Chats from './sections/Chats';
import Revenue from './sections/Revenue';
import Content from './sections/Content';
import SystemSettings from './sections/Settings';
import SubscriptionPlansAdmin from './sections/SubscriptionPlansAdmin';
import CoinRewards from './sections/CoinRewards';
import SessionLogs from './sections/SessionLogs';
import StrikeSystem from './sections/StrikeSystem';
import GeoBlocking from './sections/GeoBlocking';
import AdminActionLog from './sections/AdminActionLog';
import Transactions from './sections/Transactions';
import Withdrawals from './sections/Withdrawals';

import Analytics from './sections/Analytics';
import AdminUsers from './sections/AdminUsers';
import Support from './sections/Support';
import Notifications from './sections/Notifications';
import AdminContactMessages from './sections/AdminContactMessages';
import AdminBugReports from './sections/AdminBugReports';

const AdminLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { currentUser, logout } = useAuth();
    const { adminPermissions, adminRole } = useAdmin();
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const handleNewNotification = (notif) => {
        setNotifications(prev => {
            const match = prev.find(n => n.id === notif.id);
            if(match) return prev;
            return [notif, ...prev].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
        });
        setUnreadCount(prev => prev + 1);
    };

    useEffect(() => {
        if (!adminRole) return;

        fetchNotifications();

        // 1. OneSignal Initialization & Prompt for Admins
        if (window.OneSignalDeferred) {
            window.OneSignalDeferred.push(async function(OneSignal) {
                if (currentUser?.id) {
                    await OneSignal.login(currentUser.id);
                }
                await OneSignal.User.addTag("role", "admin");
                // Ask for permission directly!
                await OneSignal.Slidedown.promptPush();
            });
        }

        // 2. Supabase Realtime for In-App Popups
        const channel = supabase.channel('admin_notifications');

        channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, (payload) => {
            const user = payload.new;
            const msg = `New user joined: ${user.username || 'Unknown'}`;
            handleNewNotification({ id: `usr-${user.id}`, type: 'user', message: msg, created_at: user.created_at || new Date().toISOString(), is_read: false });
            toast(msg, { icon: '👋' });
        });

        channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payouts' }, (payload) => {
            const payout = payload.new;
            const msg = `New withdrawal request: ₹${payout.amount}`;
            handleNewNotification({ id: `pay-${payout.id}`, type: 'revenue', message: msg, created_at: payout.created_at || new Date().toISOString(), is_read: false });
            toast.success(msg, { icon: '💸', duration: 5000 });
        });

        channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, (payload) => {
            const report = payload.new;
            const msg = `New user report received!`;
            handleNewNotification({ id: `rpt-${report.id}`, type: 'report', message: msg, created_at: report.created_at || new Date().toISOString(), is_read: false });
            toast.error(msg, { icon: '🚨', duration: 5000 });
        });

        channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'verifications' }, (payload) => {
            const v = payload.new;
            const msg = `New identity verification submitted.`;
            handleNewNotification({ id: `ver-${v.id}`, type: 'verification', message: msg, created_at: v.created_at || new Date().toISOString(), is_read: false });
            toast(msg, { icon: '✅', duration: 5000 });
        });

        channel.subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [adminRole, currentUser]);

    const fetchNotifications = async () => {
        try {
            const lastSeen = localStorage.getItem('admin_notif_last_seen');
            const lastSeenDate = lastSeen ? new Date(lastSeen) : new Date(Date.now() - 24 * 60 * 60 * 1000);

            const [usersRes, txsRes, reportsRes, verRes] = await Promise.all([
                supabase.from('profiles').select('id, username, email, gender, created_at').order('created_at', { ascending: false }).limit(5),
                supabase.from('transactions').select('id, amount, type, created_at, user:profiles(username)').eq('status', 'success').order('created_at', { ascending: false }).limit(5),
                supabase.from('reports').select('id, reason, created_at, reporter:profiles!reports_reporter_id_fkey(username), reported:profiles!reports_reported_user_id_fkey(username)').order('created_at', { ascending: false }).limit(5),
                supabase.from('verifications').select('id, status, created_at, user_id, profiles(username, email, gender)').order('created_at', { ascending: false }).limit(5),
            ]);

            let merged = [];

            if (usersRes.data) merged = [...merged, ...usersRes.data.map(u => ({
                id: `usr-${u.id}`, type: 'user',
                message: `New user: ${u.username || u.email || 'Unknown'}${u.gender === 'Female' ? ' 👩 (Female)' : ''}`,
                created_at: u.created_at, is_read: new Date(u.created_at) <= lastSeenDate
            }))];

            if (txsRes.data) merged = [...merged, ...txsRes.data.map(t => ({
                id: `tx-${t.id}`, type: 'revenue',
                message: `${t.user?.username || 'Guest'} — ₹${t.amount} ${t.type}`,
                created_at: t.created_at, is_read: new Date(t.created_at) <= lastSeenDate
            }))];

            if (reportsRes.data) merged = [...merged, ...reportsRes.data.map(r => ({
                id: `rpt-${r.id}`, type: 'report',
                message: `Report: ${r.reporter?.username || 'Someone'} reported a user — ${r.reason}`,
                created_at: r.created_at, is_read: new Date(r.created_at) <= lastSeenDate
            }))];

            if (verRes.data) merged = [...merged, ...verRes.data
                .filter(v => {
                    const g = v.profiles?.gender?.toLowerCase()?.trim();
                    return g === 'female';
                })
                .map(v => ({
                    id: `ver-${v.id}`, type: 'verification',
                    message: `Female verification ${v.status}: ${v.profiles?.username || v.profiles?.email || 'Unknown'}`,
                    created_at: v.created_at, is_read: new Date(v.created_at) <= lastSeenDate
                }))];

            merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            const top5 = merged.slice(0, 5);
            setNotifications(top5);
            setUnreadCount(top5.filter(n => !n.is_read).length);
        } catch (e) {
            console.error('Failed to fetch header notifications:', e);
        }
    };

    const menuSections = [
        {
            title: 'Overview',
            items: [
                { name: 'Dashboard', path: '/admin', id: 'dashboard', icon: <LayoutDashboard size={18} /> },
                { name: 'Analytics', path: '/admin/analytics', id: 'revenue', icon: <BarChart3 size={18} /> },
            ]
        },
        {
            title: 'User Management',
            items: [
                { name: 'Users', path: '/admin/users', id: 'users', icon: <UsersIcon size={18} /> },
                { name: 'Female Verifications', path: '/admin/female-verifications', id: 'users', icon: <ShieldCheck size={18} /> },
                { name: 'Creators', path: '/admin/creators', id: 'users', icon: <ShieldCheck size={18} /> },
            ]
        },
        {
            title: 'Moderation & Safety',
            items: [
                { name: 'Chat Monitoring', path: '/admin/chats', id: 'chats', icon: <MessageSquare size={18} /> },
                { name: 'Reports', path: '/admin/reports', id: 'reports', icon: <ShieldAlert size={18} /> },
                { name: 'Session Logs', path: '/admin/session-logs', id: 'reports', icon: <FileText size={18} /> },
                { name: 'Strike System', path: '/admin/strikes', id: 'reports', icon: <Zap size={18} /> },
            ]
        },
        {
            title: 'Economy & Billing',
            items: [
                { name: 'Revenue', path: '/admin/revenue', id: 'revenue', icon: <CreditCard size={18} /> },
                { name: 'Plans', path: '/admin/plans', id: 'revenue', icon: <CreditCard size={18} /> },
                { name: 'Withdrawals', path: '/admin/withdrawals', id: 'revenue', icon: <Wallet size={18} /> },
                { name: 'Coin Rewards', path: '/admin/coin-rewards', id: 'revenue', icon: <Coins size={18} /> },
                { name: 'Coin Transactions', path: '/admin/transactions', id: 'revenue', icon: <Receipt size={18} /> },
            ]
        },
        {
            title: 'Platform System',
            items: [
                { name: 'Content', path: '/admin/content', id: 'content', icon: <Palette size={18} /> },
                { name: 'Settings', path: '/admin/settings', id: 'settings', icon: <Settings size={18} /> },
                { name: 'Admins', path: '/admin/roles', id: 'settings', icon: <Lock size={18} /> },
                { name: 'Geo Blocking', path: '/admin/geo-blocking', id: 'settings', icon: <Globe size={18} /> },
                { name: 'Action Log', path: '/admin/action-log', id: 'settings', icon: <ClipboardList size={18} /> },
            ]
        },
        {
            title: 'Support & Alerts',
            items: [
                { name: 'Notifications', path: '/admin/alerts', id: 'reports', icon: <Bell size={18} /> },
                { name: 'Support', path: '/admin/support', id: 'reports', icon: <LifeBuoy size={18} /> },
                { name: 'Contact Msgs', path: '/admin/contact-messages', id: 'reports', icon: <MessageSquare size={18} /> },
                { name: 'Bug Reports', path: '/admin/bug-reports', id: 'reports', icon: <ShieldAlert size={18} /> },
            ]
        }
    ];

    const filteredSections = menuSections.map(section => ({
        ...section,
        items: adminRole === 'admin' 
            ? section.items 
            : section.items.filter(item => {
                if (item.id === 'dashboard') return true;
                if (adminPermissions) return adminPermissions[item.id];
                return false;
            })
    })).filter(section => section.items.length > 0);

    return (
        <div className="flex h-screen bg-[#F1F5F9] text-[#1E293B] font-sans overflow-hidden">
            {/* Sidebar */}
            <aside className={`${isSidebarOpen ? 'w-[280px]' : 'w-[80px]'} bg-[#0F172A] text-white transition-all duration-300 flex flex-col z-30 shadow-2xl shrink-0`}>
                <div className="h-20 flex items-center px-6 border-b border-white/5">
                    <img src="/logo.png" alt="Strangy Logo" className={`h-8 w-auto object-contain transition-all ${isSidebarOpen ? '' : 'mx-auto'}`} />
                    {isSidebarOpen && (
                        <div className="ml-3 truncate">
                            <span className="text-[10px] block text-indigo-400 font-bold uppercase tracking-widest">Admin Panel</span>
                        </div>
                    )}
                </div>

                <nav className="flex-1 px-3 py-6 space-y-8 overflow-y-auto custom-scrollbar uppercase italic-none">
                    {filteredSections.map((section) => (
                        <div key={section.title}>
                            {isSidebarOpen && (
                                <div className="px-4 mb-3 text-[10px] font-black text-indigo-400 uppercase tracking-[2px] opacity-70">
                                    {section.title}
                                </div>
                            )}
                            <div className="space-y-1">
                                {section.items.map((item) => {
                                    const isActive = location.pathname === item.path || (item.path === '/admin' && (location.pathname === '/admin/' || location.pathname === '/admin'));
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all group ${isActive
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                                }`}
                                        >
                                            <span className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'}`}>
                                                {item.icon}
                                            </span>
                                            {isSidebarOpen && <span className="text-[11px] tracking-widest">{item.name}</span>}
                                            {isSidebarOpen && isActive && <ChevronRight size={14} className="ml-auto opacity-50" />}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="p-4 mt-auto border-t border-white/5 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold text-indigo-400 capitalize overflow-hidden">
                            {currentUser?.avatar_url ? <img src={currentUser.avatar_url} className="w-full h-full object-cover" alt="" /> : (currentUser?.username?.charAt(0) || 'A')}
                        </div>
                        {isSidebarOpen && (
                            <div className="truncate flex-1">
                                <p className="font-bold text-sm text-white uppercase tracking-tighter truncate">{currentUser?.username || 'Admin'}</p>
                                <p className="text-slate-500 text-[9px] uppercase font-black tracking-widest">{currentUser?.role || 'Full Access'}</p>
                            </div>
                        )}
                        {isSidebarOpen && (
                            <button
                                onClick={async () => {
                                    await logout();
                                    window.location.href = '/';
                                }}
                                className="p-2 text-slate-400 hover:text-white hover:bg-red-500/20 rounded-xl transition-colors"
                                title="Logout"
                            >
                                <LogOut size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 h-full">
                <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0 z-20">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setSidebarOpen(!isSidebarOpen)}
                            className="p-2.5 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors border border-slate-200 shadow-sm"
                        >
                            {isSidebarOpen ? <Menu size={20} /> : <X size={20} />}
                        </button>
                        <div className="h-6 w-[1px] bg-slate-200"></div>
                        <div>
                            <h2 className="font-black text-slate-800 text-lg tracking-tight uppercase">
                                {filteredSections.flatMap(s => s.items).find(m => m.path === location.pathname)?.name || 
                                 (location.pathname === '/admin' ? 'Dashboard' : '')}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative mr-4">
                            <button
                                onClick={() => {
                                    setShowNotifications(!showNotifications);
                                    if (!showNotifications) {
                                        // Mark as seen when opening
                                        localStorage.setItem('admin_notif_last_seen', new Date().toISOString());
                                        setUnreadCount(0);
                                    }
                                }}
                                className="relative p-2 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                <Bell size={20} className="text-slate-400 hover:text-indigo-600 transition-colors" />
                                {unreadCount > 0 && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </div>
                                )}
                            </button>
                            {showNotifications && (
                                <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                                        <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest">Notifications</h4>
                                        <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full">{unreadCount} NEW</span>
                                    </div>
                                    <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-6 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No notifications</div>
                                        ) : notifications.map((n) => (
                                            <div key={n.id} className={`px-5 py-3 hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-indigo-50/30' : ''}`}>
                                                <p className="text-sm font-bold text-slate-700 truncate">{n.message || n.type || 'System Notification'}</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-3 border-t border-slate-100">
                                        <button
                                            onClick={() => { navigate('/admin/alerts'); setShowNotifications(false); }}
                                            className="w-full py-2.5 text-xs font-black text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors uppercase tracking-widest"
                                        >
                                            View All Notifications
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-600 font-black text-[10px] tracking-widest transition-all">
                            LIVE STATUS
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto bg-[#F8FAFC] custom-scrollbar">
                    <Routes>
                        <Route index element={<Dashboard />} />
                        <Route path="users" element={<Users />} />
                        <Route path="chats" element={<Chats />} />
                        <Route path="reports" element={<Reports />} />
                        <Route path="revenue" element={<Revenue />} />
                        <Route path="analytics" element={<Analytics />} />
                        <Route path="content" element={<Content />} />
                        <Route path="plans" element={<SubscriptionPlansAdmin />} />
                        <Route path="coin-rewards" element={<CoinRewards />} />
                        <Route path="transactions" element={<Transactions />} />
                        <Route path="withdrawals" element={<Withdrawals />} />
                        <Route path="settings" element={<SystemSettings />} />
                        <Route path="roles" element={<AdminUsers />} />
                        <Route path="alerts" element={<Notifications />} />
                        <Route path="support" element={<Support />} />
                        <Route path="contact-messages" element={<AdminContactMessages />} />
                        <Route path="bug-reports" element={<AdminBugReports />} />

                        {/* Verifications & Creators */}
                        <Route path="verifications" element={<Verifications />} />
                        <Route path="female-verifications" element={<FemaleVerifications />} />
                        <Route path="creators" element={<Creators />} />

                        {/* Security Features */}
                        <Route path="session-logs" element={<SessionLogs />} />
                        <Route path="strikes" element={<StrikeSystem />} />
                        <Route path="geo-blocking" element={<GeoBlocking />} />
                        <Route path="action-log" element={<AdminActionLog />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
