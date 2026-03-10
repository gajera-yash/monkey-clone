import React, { useEffect, useState } from 'react';
import {
    Users, Video, MessageSquare, DollarSign,
    ArrowUpRight, ArrowDownRight, Activity,
    AlertCircle, Zap, TrendingUp
} from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { supabase } from '../../../supabase';

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeNow: 0,
        totalChats: 0,
        revenue: 0,
        growth: 0,
        reportsPending: 0
    });

    const [chartData, setChartData] = useState([]);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initDashboard = async () => {
            setLoading(true);
            await Promise.all([
                fetchDashboardStats(),
                fetchChartData(),
                fetchRecentActivities()
            ]);
            setLoading(false);
        };
        initDashboard();

        // Optional: Real-time subscription could be added here
    }, []);

    const fetchDashboardStats = async () => {
        try {
            // 1. Total Users
            const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

            // 2. Active Now (seen in last 5 minutes)
            const fiveMinsAgo = new Date(Date.now() - 5 * 60000).toISOString();
            const { count: activeCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gt('last_seen', fiveMinsAgo);

            // 3. Reports Pending
            const { count: reportsCount } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending');

            // 4. Chats Today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const { count: chatsToday } = await supabase.from('chat_logs').select('*', { count: 'exact', head: true }).gt('start_time', today.toISOString());

            // 5. Total Revenue (Success only)
            const { data: revData } = await supabase.from('transactions').select('amount').eq('status', 'success');
            const totalRev = revData?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;

            setStats({
                totalUsers: usersCount || 0,
                activeNow: activeCount || 0,
                totalChats: chatsToday || 0,
                revenue: totalRev,
                growth: 12.5, // Trend could be calculated by comparing with yesterday
                reportsPending: reportsCount || 0
            });
        } catch (err) {
            console.error("Dashboard Stats Error:", err);
        }
    };

    const fetchChartData = async () => {
        // Fetch last 7 days of user growth
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const data = [];
        const now = new Date();

        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const start = new Date(d.setHours(0, 0, 0, 0)).toISOString();
            const end = new Date(d.setHours(23, 59, 59, 999)).toISOString();

            const { count: uCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end);
            const { count: cCount } = await supabase.from('chat_logs').select('*', { count: 'exact', head: true }).gte('start_time', start).lte('start_time', end);

            data.push({
                name: days[new Date(start).getDay()],
                users: uCount || 0,
                chats: cCount || 0
            });
        }
        setChartData(data);
    };

    const fetchRecentActivities = async () => {
        // Fetch combined recent events
        const { data: users } = await supabase.from('profiles').select('username, created_at, is_premium').order('created_at', { ascending: false }).limit(5);
        const activityList = users?.map(u => ({
            id: u.id || Math.random(),
            type: u.is_premium ? 'Premium User Joined' : 'New User Joined',
            name: u.username || 'Guest',
            time: u.created_at,
            icon: '👤'
        })) || [];
        setActivities(activityList);
    };

    const StatCard = ({ title, value, icon: Icon, trend, color, suffix = "" }) => (
        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
            <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl ${color} bg-opacity-10 shadow-sm transition-transform group-hover:scale-110`}>
                    <Icon className={color.replace('bg-', 'text-')} size={24} />
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-xs font-black ${trend > 0 ? 'text-green-500' : 'text-red-500'} bg-slate-50 px-2 py-1 rounded-lg border border-slate-100`}>
                        {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <h3 className="text-slate-400 text-[11px] font-black uppercase tracking-[2px] mb-1">{title}</h3>
            <div className="text-3xl font-black text-slate-800 tracking-tighter">
                {typeof value === 'number' ? value.toLocaleString() : value}{suffix}
            </div>
        </div>
    );

    return (
        <div className="p-10 max-w-[1600px] mx-auto space-y-10">
            {/* Top Row - Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <StatCard
                    title="Total Platform Users"
                    value={stats.totalUsers}
                    icon={Users}
                    trend={12.5}
                    color="bg-indigo-500"
                />
                <StatCard
                    title="Active Now"
                    value={stats.activeNow}
                    icon={Activity}
                    color="bg-green-500"
                />
                <StatCard
                    title="Chats Today"
                    value={stats.totalChats}
                    icon={MessageSquare}
                    trend={-2.4}
                    color="bg-orange-500"
                />
                <StatCard
                    title="Total Revenue"
                    value={stats.revenue}
                    suffix="$"
                    icon={DollarSign}
                    trend={18.2}
                    color="bg-purple-500"
                />
            </div>

            {/* Second Row - Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Growth Analytics</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">User acquisition vs retention</p>
                        </div>
                        <select className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-500 outline-none">
                            <option>Last 30 Days</option>
                            <option>Last 7 Days</option>
                        </select>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 16px' }}
                                    itemStyle={{ fontWeight: 800, color: '#1e293b' }}
                                />
                                <Area type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorUsers)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Chat Activities</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Daily traffic distribution</p>
                        </div>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc', radius: 12 }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="chats" fill="#f59e0b" radius={[12, 12, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Third Row - Activity & Quick Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                    <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm flex items-center gap-2">
                            <Zap size={18} className="text-yellow-500 fill-yellow-500" />
                            Live Activity Feed
                        </h3>
                        <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm border border-indigo-100">Streaming Live</span>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {activities.map((act) => (
                            <div key={act.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-lg">{act.icon}</div>
                                    <div>
                                        <p className="text-sm font-black text-slate-800">{act.type}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{act.name}</p>
                                    </div>
                                </div>
                                <span className="text-[10px] text-slate-400 font-black">
                                    {new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))}
                    </div>
                    <button className="w-full py-6 text-xs font-black text-slate-400 uppercase tracking-[3px] hover:text-indigo-600 transition-colors bg-slate-50/30 border-t border-slate-50">View Full System Logs</button>
                </div>

                <div className="space-y-8">
                    <div className="bg-[#0F172A] p-10 rounded-[40px] text-white shadow-2xl shadow-indigo-500/10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-150 transition-transform duration-700">
                            <TrendingUp size={120} />
                        </div>
                        <div className="relative z-10">
                            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[4px] mb-8">Moderation Pulse</h4>
                            <div className="space-y-8">
                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-xs font-bold text-slate-400">Reports Pending</span>
                                        <span className="text-2xl font-black text-red-400">{stats.reportsPending}</span>
                                    </div>
                                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-red-500 rounded-full transition-all duration-1000"
                                            style={{ width: `${Math.min(100, (stats.reportsPending / 10) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-xs font-bold text-slate-400">Security Index</span>
                                        <span className="text-2xl font-black text-green-400">98.2%</span>
                                    </div>
                                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 rounded-full w-[98%]" />
                                    </div>
                                </div>
                            </div>
                            <button className="w-full mt-10 py-5 bg-indigo-600 hover:bg-indigo-700 rounded-2xl font-black text-xs uppercase tracking-[3px] transition-all shadow-xl shadow-indigo-600/20 active:scale-95">Open Security Panel</button>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex items-center justify-between group cursor-pointer hover:border-indigo-200 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center border border-orange-100 shadow-sm group-hover:scale-110 transition-transform">
                                <AlertCircle size={24} />
                            </div>
                            <div>
                                <h5 className="font-black text-slate-800 text-sm">System Alerts</h5>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">4 unread warnings</p>
                            </div>
                        </div>
                        <ArrowUpRight size={20} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                    </div>
                </div>
            </div>
        </div >
    );
};

export default Dashboard;
