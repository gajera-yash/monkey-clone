import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../../supabase';
import {
    Search, Filter, Receipt, ArrowUpRight, ArrowDownRight,
    TrendingUp, BadgeIndianRupee, Zap, Gift, Download,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

const Transactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('all'); // all, purchase, spent, earned, gift
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    
    // Metrics
    const [metrics, setMetrics] = useState({
        totalRevenue: 0,
        totalPurchased: 0,
        totalSpent: 0
    });

    useEffect(() => {
        fetchTransactions();

        window.addEventListener('focus', fetchTransactions);
        return () => window.removeEventListener('focus', fetchTransactions);
    }, []);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            // First get all transactions joined with user profile
            const { data, error } = await supabase
                .from('coin_transactions')
                .select(`
                    *,
                    user:profiles!coin_transactions_user_id_fkey(username, avatar_url, email)
                `)
                .order('created_at', { ascending: false })
                .limit(500);

            if (error) throw error;
            
            setTransactions(data || []);
            
            // Calculate metrics (ideally done via RPC or server, simulating here for speed on last 500)
            let rev = 0; let purch = 0; let spent = 0;
            data?.forEach(t => {
                if (t.transaction_type === 'purchase') {
                    purch += t.coins_amount;
                    if (t.metadata?.amount_paid) rev += Number(t.metadata.amount_paid);
                } else if (t.transaction_type === 'spent') {
                    spent += Math.abs(t.coins_amount);
                }
            });
            
            setMetrics({
                totalRevenue: rev,
                totalPurchased: purch,
                totalSpent: spent
            });

        } catch (error) {
            console.error("Failed to load transactions:", error);
            toast.error("Failed to load transactions.");
        }
        setLoading(false);
    };

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const matchesSearch = 
                tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                tx.payment_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                tx.user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                tx.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesFilter = filterType === 'all' || tx.transaction_type === filterType;
            return matchesSearch && matchesFilter;
        });
    }, [transactions, searchTerm, filterType]);

    // Pagination Logic
    const { paginatedTransactions, totalPages } = useMemo(() => {
        const total = filteredTransactions.length;
        const pages = Math.ceil(total / itemsPerPage);
        const start = (currentPage - 1) * itemsPerPage;
        const sliced = filteredTransactions.slice(start, start + itemsPerPage);
        return { paginatedTransactions: sliced, totalPages: pages };
    }, [filteredTransactions, currentPage, itemsPerPage]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterType]);

    // Icon lookup based on transaction type
    const getTxIcon = (type) => {
        switch (type) {
            case 'purchase': return <BadgeIndianRupee size={20} className="text-emerald-500" />;
            case 'spent': return <Zap size={20} className="text-rose-500" />;
            case 'earned': return <TrendingUp size={20} className="text-amber-500" />;
            case 'gift': return <Gift size={20} className="text-indigo-500" />;
            default: return <Receipt size={20} className="text-slate-400" />;
        }
    };

    return (
        <div className="p-10 max-w-[1600px] mx-auto">
            {/* Header & Metrics */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-10">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800">Financial Ledger</h1>
                    <p className="text-slate-500 font-medium">Platform economy & coin transaction history</p>
                </div>

                <div className="flex bg-white border border-slate-200 rounded-[32px] p-2 shadow-sm shrink-0 w-full lg:w-auto overflow-x-auto custom-scrollbar">
                    <div className="px-6 py-3 border-r border-slate-100 last:border-0 min-w-[160px]">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Gross Revenue</div>
                        <div className="text-2xl font-black text-emerald-600">₹{metrics.totalRevenue.toLocaleString()}</div>
                    </div>
                    <div className="px-6 py-3 border-r border-slate-100 last:border-0 min-w-[160px]">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Coins Minted</div>
                        <div className="text-2xl font-black text-indigo-600">{metrics.totalPurchased.toLocaleString()}</div>
                    </div>
                    <div className="px-6 py-3 min-w-[160px]">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Coins Burned</div>
                        <div className="text-2xl font-black text-rose-600">{metrics.totalSpent.toLocaleString()}</div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div className="relative group flex-1 md:flex-none">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search user, description, or payment ID..."
                        className="bg-white border border-slate-200 pl-11 pr-6 py-3 rounded-2xl w-full md:w-96 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto w-full md:w-auto hide-scrollbar">
                        {['all', 'purchase', 'spent', 'earned', 'gift'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                    filterType === type
                                        ? 'bg-[#0F172A] text-white shadow-md'
                                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                }`}
                            >
                                {type === 'all' ? 'All Types' : type}
                            </button>
                        ))}
                    </div>
                    <button className="hidden md:flex p-3 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-2xl transition-colors shadow-sm">
                        <Download size={20} />
                    </button>
                </div>
            </div>

            {/* Transactions Ledger */}
            <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-xl shadow-slate-200/50">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 italic-none">
                                <th className="px-8 py-5 text-[11px] font-black uppercase tracking-[2px] text-slate-400">Timestamp</th>
                                <th className="px-8 py-5 text-[11px] font-black uppercase tracking-[2px] text-slate-400">User Details</th>
                                <th className="px-8 py-5 text-[11px] font-black uppercase tracking-[2px] text-slate-400">Transaction</th>
                                <th className="px-8 py-5 text-[11px] font-black uppercase tracking-[2px] text-slate-400 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="4" className="p-20 text-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Querying Ledger...</p></td></tr>
                            ) : paginatedTransactions.length === 0 ? (
                                <tr><td colSpan="4" className="p-20 text-center font-bold text-slate-400 uppercase tracking-widest text-xs">No transactions match the criteria</td></tr>
                            ) : paginatedTransactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="text-sm font-bold text-slate-700">{new Date(tx.created_at).toLocaleDateString()}</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                                            {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 overflow-hidden shrink-0 border border-slate-200">
                                                {tx.user?.avatar_url ? <img src={tx.user.avatar_url} alt="" className="w-full h-full object-cover" /> : tx.user?.username?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-700">{tx.user?.username || 'Unknown User'}</div>
                                                <div className="text-[10px] md:text-xs text-slate-500 font-medium truncate max-w-[150px] md:max-w-xs">{tx.user?.email || tx.user_id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                                                tx.transaction_type === 'purchase' ? 'bg-emerald-50 border-emerald-100' :
                                                tx.transaction_type === 'spent' ? 'bg-rose-50 border-rose-100' :
                                                tx.transaction_type === 'earned' ? 'bg-amber-50 border-amber-100' :
                                                'bg-indigo-50 border-indigo-100'
                                            }`}>
                                                {getTxIcon(tx.transaction_type)}
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-700 text-sm">{tx.description}</div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[9px] font-black uppercase tracking-[1px] px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 bg-white">
                                                        {tx.transaction_type}
                                                    </span>
                                                    {tx.payment_id && (
                                                        <span className="text-[9px] font-mono text-slate-400">
                                                            ID: {tx.payment_id.slice(0, 15)}...
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <div className={`text-xl font-black ${
                                                tx.coins_amount > 0 ? 'text-emerald-500' : 'text-rose-500'
                                            }`}>
                                                {tx.coins_amount > 0 ? '+' : ''}{tx.coins_amount}
                                            </div>
                                            {tx.coins_amount > 0 ? <ArrowUpRight size={16} className="text-emerald-500" /> : <ArrowDownRight size={16} className="text-rose-500" />}
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-400 mt-1 tracking-widest uppercase">
                                            Bal: {tx.coins_balance_after}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {!loading && filteredTransactions.length > 0 && (
                    <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
                            Showing {Math.min(filteredTransactions.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredTransactions.length, currentPage * itemsPerPage)} of {filteredTransactions.length} records
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
                                            className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${currentPage === page ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white border border-slate-200 text-slate-500 hover:border-indigo-300'}`}
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
        </div>
    );
};

export default Transactions;
