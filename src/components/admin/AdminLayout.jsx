import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Users as UsersIcon, MessageSquare, ShieldAlert,
    CreditCard, BarChart3, Palette, Settings,
    Lock, Bell, LifeBuoy, Menu, X, ChevronRight
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

// Placeholder Components for remaining sections
const Analytics = () => <div className="p-8"><h1 className="text-2xl font-black text-slate-800">Analytics & Insights</h1><p className="text-slate-500 mt-2">Coming soon: Advanced growth metrics and engagement tracking.</p></div>;
const AdminUsers = () => <div className="p-8"><h1 className="text-2xl font-black text-slate-800">Admin Users & Roles</h1><p className="text-slate-500 mt-2">Coming soon: Team permissions and audit logs.</p></div>;
const Notifications = () => <div className="p-8"><h1 className="text-2xl font-black text-slate-800">Notifications & Alerts</h1><p className="text-slate-500 mt-2">Coming soon: System-wide broadcasts.</p></div>;
const Support = () => <div className="p-8"><h1 className="text-2xl font-black text-slate-800">Support & Feedback</h1><p className="text-slate-500 mt-2">Coming soon: Ticket management system.</p></div>;

const AdminLayout = () => {
    const location = useLocation();
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    const menuItems = [
        { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={18} /> },
        { name: 'Users', path: '/admin/users', icon: <UsersIcon size={18} /> },
        { name: 'Chat Monitoring', path: '/admin/chats', icon: <MessageSquare size={18} /> },
        { name: 'Reports', path: '/admin/reports', icon: <ShieldAlert size={18} /> },
        { name: 'Revenue', path: '/admin/revenue', icon: <CreditCard size={18} /> },
        { name: 'Analytics', path: '/admin/analytics', icon: <BarChart3 size={18} /> },
        { name: 'Content', path: '/admin/content', icon: <Palette size={18} /> },
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
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold text-indigo-400">
                            SA
                        </div>
                        {isSidebarOpen && (
                            <div className="truncate">
                                <p className="font-bold text-sm text-white uppercase tracking-tighter">Super Admin</p>
                                <p className="text-slate-500 text-[9px] uppercase font-black tracking-widest">Full Access</p>
                            </div>
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
                        <div className="relative group mr-4">
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white">
                                4
                            </div>
                            <Bell size={20} className="text-slate-400 cursor-pointer hover:text-indigo-600 transition-colors" />
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
                        <Route path="settings" element={<SystemSettings />} />
                        <Route path="roles" element={<AdminUsers />} />
                        <Route path="alerts" element={<Notifications />} />
                        <Route path="support" element={<Support />} />

                        {/* Verifications & Creators Nested inside Content logic or direct access */}
                        <Route path="verifications" element={<Verifications />} />
                        <Route path="creators" element={<Creators />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
