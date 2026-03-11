import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabase';
import {
    DollarSign, CreditCard, TrendingUp, ArrowUpRight,
    ArrowDownRight, PieChart, Activity, ShoppingBag,
    Calendar, User, ExternalLink, Download
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import toast from 'react-hot-toast';

const Revenue = () => {
    const [stats, setStats] = useState({
        totalRevenue: 0,
        mrr: 0,
        subscriptions: 0,
        avgTicket: 0
    });

    const [transactions, setTransactions] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currency, setCurrency] = useState('USD');
    const INR_RATE = 83.5;

    const formatCurrency = (amount) => {
        if (currency === 'INR') {
            return `₹${(amount * INR_RATE).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
        }
        return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    useEffect(() => {
        const initRevenue = async () => {
            setLoading(true);
            await Promise.all([
                fetchRevenueStats(),
                fetchChartData(),
                fetchTransactions()
            ]);
            setLoading(false);
        };
        initRevenue();
    }, []);

    const [segments, setSegments] = useState({
        plus_annual: 0,
        plus_monthly: 0,
        coins: 0
    });

    const fetchRevenueStats = async () => {
        try {
            // 1. Total Revenue
            const { data: revData } = await supabase.from('transactions').select('amount, type').eq('status', 'success');
            const total = revData?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;

            // 2. Active Subscriptions
            const { count: subCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_premium', true);

            // 3. Segment Calculation
            const subData = revData?.filter(t => t.type === 'subscription') || [];
            const coinData = revData?.filter(t => t.type === 'coins') || [];

            setSegments({
                plus_annual: 42, // Mocking distribution ratios for now but based on real totals soon
                plus_monthly: 35,
                coins: total > 0 ? Math.round((coinData.reduce((s, t) => s + (t.amount || 0), 0) / total) * 100) : 0
            });

            // Calculate trends (Simple mock based on last week vs previous)
            setStats({
                totalRevenue: total,
                mrr: subData.reduce((s, t) => s + (t.amount || 0), 0),
                subscriptions: subCount || 0,
                avgTicket: revData?.length ? (total / revData.length) : 0
            });
        } catch (err) {
            console.error("Revenue Stats Error:", err);
        }
    };

    const fetchChartData = async () => {
        const now = new Date();
        const data = [];
        for (let i = 3; i >= 0; i--) {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i * 7)).toISOString();
            const { data: weekRev } = await supabase.from('transactions').select('amount').eq('status', 'success').gte('created_at', start);
            const weeklyTotal = weekRev?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;
            data.push({ name: `Week ${4 - i}`, revenue: weeklyTotal });
        }
        setChartData(data);
    };

    const fetchTransactions = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('transactions')
            .select(`
                *,
                user:profiles(username, avatar_url)
            `)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error("Failed to load transactions:", error);
            toast.error("Failed to load transactions: " + error.message);
        } else {
            setTransactions(data || []);
        }
        setLoading(false);
    };

    const StatCard = ({ title, value, subtext, trend, icon: Icon, color }) => (
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
                <div className="text-3xl font-black text-slate-800 tracking-tighter">
                    {title === 'Premium Users' ? value.toLocaleString() : formatCurrency(value)}
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest">{subtext}</p>
            </div>
        </div>
    );

    return (
        <div className="p-10 max-w-[1600px] mx-auto space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800">Revenue & Management</h1>
                    <p className="text-slate-500 font-medium tracking-tight">Financial health and monetization insights</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setCurrency(currency === 'USD' ? 'INR' : 'USD')}
                        className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-indigo-600 hover:bg-slate-50 transition-all shadow-sm"
                    >
                        {currency === 'USD' ? 'Show INR (₹)' : 'Show USD ($)'}
                    </button>
                    <button className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                        <Download size={16} /> Export
                    </button>
                    <button className="px-6 py-3 bg-indigo-600 rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95">
                        Update Pricing
                    </button>
                </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <StatCard
                    title="Gross Revenue"
                    value={stats.totalRevenue}
                    subtext="Total lifetime earnings"
                    trend={14}
                    icon={DollarSign}
                    color="bg-indigo-500"
                />
                <StatCard
                    title="Monthly Recurring"
                    value={stats.mrr}
                    subtext="Active subscriptions"
                    trend={8}
                    icon={Activity}
                    color="bg-green-500"
                />
                <StatCard
                    title="Premium Users"
                    value={stats.subscriptions}
                    subtext="Total active plans"
                    trend={12}
                    icon={CreditCard}
                    color="bg-purple-500"
                />
                <StatCard
                    title="Avg Transaction"
                    value={stats.avgTicket}
                    subtext="Revenue per checkout"
                    trend={-2}
                    icon={ShoppingBag}
                    color="bg-orange-500"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-center mb-10 border-b border-slate-50 pb-8 relative z-10">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Revenue Stream</h3>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[2px] mt-1">Growth progression this month</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> Subscriptions</div>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 ml-4"><div className="w-2 h-2 rounded-full bg-slate-200"></div> Coins</div>
                        </div>
                    </div>
                    <div className="h-[400px] w-full relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '24px', border: 'none', shadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)' }}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={6} fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-[#0F172A] p-10 rounded-[40px] text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute -bottom-10 -right-10 opacity-10 group-hover:scale-150 transition-transform duration-700">
                        <PieChart size={240} />
                    </div>
                    <div className="relative z-10 h-full flex flex-col">
                        <h3 className="text-[11px] font-black text-indigo-400 uppercase tracking-[4px] mb-8">Segment Distribution</h3>

                        <div className="space-y-10 flex-1">
                            <div className="group/item">
                                <div className="flex justify-between items-end mb-3">
                                    <span className="text-xs font-bold text-slate-400 group-hover/item:text-white transition-colors">Premium Subscriptions</span>
                                    <span className="text-xl font-black text-indigo-400">{100 - segments.coins}%</span>
                                </div>
                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${100 - segments.coins}%` }} />
                                </div>
                            </div>
                            <div className="group/item">
                                <div className="flex justify-between items-end mb-3">
                                    <span className="text-xs font-bold text-slate-400 group-hover/item:text-white transition-colors">Virtual Gifts & Coins</span>
                                    <span className="text-xl font-black text-orange-400">{segments.coins}%</span>
                                </div>
                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${segments.coins}%` }} />
                                </div>
                            </div>
                        </div>

                        <button className="w-full mt-10 py-5 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-[10px] uppercase tracking-[3px] transition-all border border-white/10 active:scale-95">
                            Subscription Analysis
                        </button>
                    </div>
                </div>
            </div>

            {/* Transactions Log */}
            <div className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-sm">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-indigo-500 shadow-sm">
                            <Activity size={20} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight">Recent Transactions</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Real-time payment bridge</p>
                        </div>
                    </div>
                    <select className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 shadow-sm outline-none">
                        <option>All Types</option>
                        <option>Subscriptions</option>
                        <option>Coin Purchases</option>
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-50 italic-none">
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Subscriber</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Type</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Amount</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="5" className="p-20 text-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div></td></tr>
                            ) : transactions.length === 0 ? (
                                <tr><td colSpan="5" className="p-20 text-center font-black text-slate-300 uppercase tracking-widest text-[10px]">No recent transactions detected</td></tr>
                            ) : transactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 shrink-0 border border-slate-200 overflow-hidden">
                                                {tx.user?.avatar_url ? <img src={tx.user.avatar_url} className="w-full h-full object-cover" /> : 'U'}
                                            </div>
                                            <div className="truncate">
                                                <div className="text-[11px] font-black text-slate-700">{tx.user?.username || 'Guest'}</div>
                                                <div className="text-[9px] text-slate-400 font-bold uppercase">{new Date(tx.created_at).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{tx.type}</div>
                                        {tx.coins_amount && <div className="text-[10px] text-indigo-500 font-bold mt-0.5">+{tx.coins_amount} Coins</div>}
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="text-sm font-black text-slate-800">{formatCurrency(tx.amount)}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{currency} Currency</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${tx.status === 'success'
                                            ? 'bg-green-50 text-green-600 border-green-100'
                                            : 'bg-red-50 text-red-600 border-red-100'
                                            }`}>
                                            {tx.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button className="p-2.5 hover:bg-white hover:shadow-md rounded-xl text-slate-400 hover:text-indigo-600 border border-transparent hover:border-slate-100 transition-all">
                                            <ExternalLink size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Revenue;
