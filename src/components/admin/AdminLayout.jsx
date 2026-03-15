import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabase';
import {
    LayoutDashboard, Users as UsersIcon, MessageSquare, ShieldAlert,
    CreditCard, BarChart3, Palette, Settings,
    Lock, Bell, LifeBuoy, Menu, X, ChevronRight, LogOut, Coins
} from 'lucide-react';

// Real Section Imports
import Dashboard from './sections/Dashboard';
import Reports from './sections/Reports';
import Users from './sections/Users';
import Verifications from './sections/Verifications';
import Creators from './sections/Creators';
import Chats from './sections/Chats';
import Revenue from './sections/Revenue';
import Content from './sections/Content';
import SystemSettings from './sections/Settings';
import SubscriptionPlansAdmin from './sections/SubscriptionPlansAdmin';
import CoinRewards from './sections/CoinRewards';

import Analytics from './sections/Analytics';
import AdminUsers from './sections/AdminUsers';
import Support from './sections/Support';
import Notifications from './sections/Notifications';

const AdminLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { currentUser, logout } = useAuth();
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
        if (data) {
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.is_read).length);
        }
    };


    const menuItems = [
        { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={18} /> },
        { name: 'Users', path: '/admin/users', icon: <UsersIcon size={18} /> },
        { name: 'Chat Monitoring', path: '/admin/chats', icon: <MessageSquare size={18} /> },
        { name: 'Reports', path: '/admin/reports', icon: <ShieldAlert size={18} /> },
        { name: 'Revenue', path: '/admin/revenue', icon: <CreditCard size={18} /> },
        { name: 'Analytics', path: '/admin/analytics', icon: <BarChart3 size={18} /> },
        { name: 'Content', path: '/admin/content', icon: <Palette size={18} /> },
        { name: 'Plans', path: '/admin/plans', icon: <CreditCard size={18} /> },
        { name: 'Coin Rewards', path: '/admin/coin-rewards', icon: <Coins size={18} /> },
        { name: 'Settings', path: '/admin/settings', icon: <Settings size={18} /> },
        { name: 'Admins', path: '/admin/roles', icon: <Lock size={18} /> },
        { name: 'Notifications', path: '/admin/alerts', icon: <Bell size={18} /> },
        { name: 'Support', path: '/admin/support', icon: <LifeBuoy size={18} /> },
    ];

    return (
        <div className="flex h-screen bg-[#F1F5F9] text-[#1E293B] font-sans overflow-hidden">
            {/* Sidebar */}
            <aside className={`${isSidebarOpen ? 'w-[280px]' : 'w-[80px]'} bg-[#0F172A] text-white transition-all duration-300 flex flex-col z-30 shadow-2xl shrink-0`}>
                <div className="h-20 flex items-center px-6 border-b border-white/5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center font-black text-white shadow-lg shadow-indigo-500/20 shrink-0">
                        M
                    </div>
                    {isSidebarOpen && (
                        <div className="ml-3 truncate">
                            <span className="font-black tracking-tighter text-xl text-white">MONKEY</span>
                            <span className="text-[10px] block text-indigo-400 font-bold -mt-1 uppercase tracking-widest">Admin Panel</span>
                        </div>
                    )}
                </div>

                <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar uppercase italic-none">
                    {menuItems.map((item) => {
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
                                {menuItems.find(m => m.path === location.pathname)?.name || 'Dashboard'}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative mr-4">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
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

                <div className="flex-1 overflow-y-auto bg-[#F8FAFC]">
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
                        <Route path="settings" element={<SystemSettings />} />
                        <Route path="roles" element={<AdminUsers />} />
                        <Route path="alerts" element={<Notifications />} />
                        <Route path="support" element={<Support />} />

                        {/* Verifications & Creators */}
                        <Route path="verifications" element={<Verifications />} />
                        <Route path="creators" element={<Creators />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
