import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import {
    BarChart3, TrendingUp, Users, Activity,
    Calendar, Download, ArrowUpRight, ArrowDownRight,
    PieChart, Clock, Zap
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, BarChart, Bar,
    LineChart, Line
} from 'recharts';

const Analytics = () => {
    const [timeframe, setTimeframe] = useState('7D'); // Today, 7D, 30D, All
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeNow: 0,
        matchesMade: 0,
        reportRate: 0
    });

    // Abstract chart data 
    const [activityData, setActivityData] = useState([]);

    useEffect(() => {
        fetchAnalytics();
    }, [timeframe]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            // Get total users 
            const { count: userCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            // Mock Active Now (Would normally query presence or active chat logs)
            const activeNow = Math.floor(Math.random() * 50) + 10;

            // Get match count (simulate or query real matches)
            const { count: matchCount } = await supabase
                .from('matches')
                .select('*', { count: 'exact', head: true });

            // Generate mock activity data depending on timeframe
            const days = timeframe === '7D' ? 7 : timeframe === '30D' ? 30 : 12; // 12 months for All
            const data = [];
            let currentUsers = Math.floor(userCount * 0.5) || 100;

            for (let i = days; i >= 0; i--) {
                const step = timeframe === 'All' ? 'Month' : 'Day';
                const growth = Math.floor(Math.random() * 20) - 5;
                currentUsers += growth;

                data.push({
                    name: `${step} ${days - i}`,
                    users: currentUsers > 0 ? currentUsers : 10,
                    matches: Math.floor(currentUsers * 1.5)
                });
            }

            setActivityData(data);
            setStats({
                totalUsers: userCount || 0,
                activeNow,
                matchesMade: matchCount || 0,
                reportRate: 1.2
            });

        } catch (error) {
            console.error("Analytics Error:", error);
        }
        setLoading(false);
    };

    const StatCard = ({ title, value, trend, icon: Icon, color }) => (
        <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-500`}>
                <Icon size={80} className={color.replace('bg-', 'text-')} />
            </div>
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div className={`p-4 rounded-2xl ${color} bg-opacity-10 shadow-sm`}>
                        <Icon className={color.replace('bg-', 'text-')} size={24} />
                    </div>
                    {trend && (
                        <div className={`flex items-center gap-1 text-[10px] font-black ${trend > 0 ? 'text-green-500' : 'text-red-500'} bg-slate-50 px-2 py-1 rounded-lg border border-slate-100`}>
                            {trend}%
                        </div>
                    )}
                </div>
                <h3 className="text-slate-400 text-[11px] font-black uppercase tracking-[2px] mb-1">{title}</h3>
                <div className="text-3xl font-black text-slate-800 tracking-tighter">{value.toLocaleString()}</div>
            </div>
        </div>
    );

    return (
        <div className="p-10 max-w-[1600px] mx-auto space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800">Analytics & Insights</h1>
                    <p className="text-slate-500 font-medium tracking-tight">Platform growth and user engagement metrics</p>
                </div>
                <div className="flex gap-3">
                    <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm shrink-0">
                        {['Today', '7D', '30D', 'All'].map((t) => (
                            <button
                                key={t}
                                onClick={() => setTimeframe(t)}
                                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${timeframe === t
                                    ? 'bg-[#0F172A] text-white shadow-lg'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                    <button className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                        <Download size={16} /> Export
                    </button>
                </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <StatCard title="Total Users" value={stats.totalUsers} trend={12} icon={Users} color="bg-indigo-500" />
                <StatCard title="Active Now" value={stats.activeNow} trend={5} icon={Activity} color="bg-green-500" />
                <StatCard title="Total Matches" value={stats.matchesMade} trend={24} icon={Zap} color="bg-orange-500" />
                <StatCard title="Report Rate" value={`${stats.reportRate}%`} trend={-2} icon={PieChart} color="bg-red-500" />
            </div>

            {/* Main Chart */}
            <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-center mb-10 border-b border-slate-50 pb-8 relative z-10">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">User Acquisition & Engagement</h3>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[2px] mt-1">Users vs Matches over {timeframe}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> Total Users</div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 ml-4"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Matches Made</div>
                    </div>
                </div>
                <div className="h-[400px] w-full relative z-10">
                    {loading ? (
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={activityData}>
                                <defs>
                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorMatches" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} />
                                <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', shadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)' }} />
                                <Area type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorUsers)" />
                                <Area type="monotone" dataKey="matches" stroke="#f97316" strokeWidth={4} fillOpacity={1} fill="url(#colorMatches)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Analytics;
