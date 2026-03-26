import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../../supabase';
import {
    Search, Wallet, ChevronLeft, ChevronRight, RefreshCw,
    CheckCircle2, XCircle, Clock, Banknote, Smartphone
} from 'lucide-react';
import toast from 'react-hot-toast';

const Withdrawals = () => {
    const [payouts, setPayouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        fetchPayouts();

        const channel = supabase
            .channel('admin_payouts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payouts' }, () => fetchPayouts())
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    const fetchPayouts = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('payouts')
                .select(`
                    *,
                    profiles:user_id(username, email, avatar_url, coins)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPayouts(data || []);
        } catch (err) {
            console.error('Failed to load payouts:', err);
            toast.error('Failed to load withdrawal requests');
        }
        setLoading(false);
    };

    const handleUpdateStatus = async (payout, newStatus) => {
        setProcessingId(payout.id);
        const toastId = toast.loading(newStatus === 'approved' ? 'Approving...' : 'Rejecting...');
        try {
            const { error } = await supabase
                .from('payouts')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', payout.id);

            if (error) throw error;

            toast.success(`Withdrawal ${newStatus}!`, { id: toastId });
            fetchPayouts();
        } catch (err) {
            toast.error('Action failed: ' + err.message, { id: toastId });
        }
        setProcessingId(null);
    };

    const filtered = useMemo(() => {
        return payouts.filter(p => {
            const matchesFilter = filter === 'all' || p.status === filter;
            const matchesSearch = !searchTerm ||
                p.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesFilter && matchesSearch;
        });
    }, [payouts, filter, searchTerm]);

    const { paginatedData, totalPages } = useMemo(() => {
        const total = filtered.length;
        const pages = Math.ceil(total / itemsPerPage);
        const start = (currentPage - 1) * itemsPerPage;
        const sliced = filtered.slice(start, start + itemsPerPage);
        return { paginatedData: sliced, totalPages: pages };
    }, [filtered, currentPage, itemsPerPage]);

    useEffect(() => { setCurrentPage(1); }, [filter, searchTerm]);

    const counts = {
        all: payouts.length,
        pending: payouts.filter(p => p.status === 'pending').length,
        approved: payouts.filter(p => p.status === 'approved').length,
        rejected: payouts.filter(p => p.status === 'rejected').length,
    };

    const totalPending = payouts
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + (p.amount || 0), 0);

    const totalApproved = payouts
        .filter(p => p.status === 'approved')
        .reduce((sum, p) => sum + (p.amount || 0), 0);

    const getMethodIcon = (method) => {
        if (method === 'upi') return <Smartphone size={16} className="text-purple-500" />;
        return <Banknote size={16} className="text-blue-500" />;
    };

    const getPaymentInfo = (payout) => {
        if (payout.method === 'upi') return payout.details?.upiId || '—';
        if (payout.details?.accountNumber) return `A/C: ****${payout.details.accountNumber.slice(-4)} | IFSC: ${payout.details.ifsc || '—'}`;
        return '—';
    };

    const getStatusBadge = (status) => {
        const base = 'px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1';
        switch (status) {
            case 'pending': return <span className={`${base} bg-yellow-100 text-yellow-700`}><Clock size={12} /> Pending</span>;
            case 'approved': return <span className={`${base} bg-green-100 text-green-700`}><CheckCircle2 size={12} /> Approved</span>;
            case 'rejected': return <span className={`${base} bg-red-100 text-red-700`}><XCircle size={12} /> Rejected</span>;
            default: return <span className={`${base} bg-slate-100 text-slate-500`}>{status}</span>;
        }
    };

    return (
        <div className="p-10 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800 flex items-center gap-3">
                        <Wallet className="text-emerald-500" size={32} />
                        Withdrawal Requests
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium">Manage creator payout requests</p>
                </div>
                <button
                    onClick={fetchPayouts}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                >
                    <RefreshCw size={14} />
                    Refresh
                </button>
            </div>

            {/* Metrics */}
            <div className="flex bg-white border border-slate-200 rounded-[32px] p-2 shadow-sm mb-8 w-full lg:w-auto overflow-x-auto">
                <div className="px-6 py-3 border-r border-slate-100 min-w-[160px]">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Pending Payouts</div>
                    <div className="text-2xl font-black text-yellow-600">🪙 {totalPending.toLocaleString()}</div>
                </div>
                <div className="px-6 py-3 border-r border-slate-100 min-w-[160px]">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Approved</div>
                    <div className="text-2xl font-black text-emerald-600">🪙 {totalApproved.toLocaleString()}</div>
                </div>
                <div className="px-6 py-3 min-w-[160px]">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Requests</div>
                    <div className="text-2xl font-black text-indigo-600">{payouts.length}</div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div className="relative group flex-1 md:flex-none">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search user..."
                        className="bg-white border border-slate-200 pl-11 pr-6 py-3 rounded-2xl w-full md:w-80 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-3">
                    {[
                        { id: 'pending', label: 'Pending', color: 'yellow' },
                        { id: 'approved', label: 'Approved', color: 'green' },
                        { id: 'rejected', label: 'Rejected', color: 'red' },
                        { id: 'all', label: 'All', color: 'slate' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id)}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                                filter === tab.id
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                    : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-600'
                            }`}
                        >
                            {tab.label}
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                filter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                                {counts[tab.id]}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Details</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan="7" className="py-20 text-center">
                                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                </td>
                            </tr>
                        ) : paginatedData.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                                    No {filter === 'all' ? '' : filter} withdrawal requests
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((payout) => (
                                <tr key={payout.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-slate-200 shrink-0">
                                                {payout.profiles?.avatar_url ? (
                                                    <img src={payout.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="font-black text-slate-400">{payout.profiles?.username?.charAt(0)?.toUpperCase() || '?'}</span>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-black text-slate-800 truncate">{payout.profiles?.username || 'Unknown'}</div>
                                                <div className="text-[11px] text-slate-400 truncate">{payout.profiles?.email || '—'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xl font-black text-emerald-600">🪙 {payout.amount?.toLocaleString()}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-50 border border-slate-200">
                                            {getMethodIcon(payout.method)}
                                            {payout.method === 'upi' ? 'UPI' : 'Bank'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-slate-600 font-medium">{getPaymentInfo(payout)}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(payout.status)}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                                        {new Date(payout.created_at).toLocaleDateString()}
                                        <br />
                                        <span className="text-[10px] text-slate-300">
                                            {new Date(payout.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {payout.status === 'pending' ? (
                                            <div className="flex items-center gap-2 justify-end">
                                                <button
                                                    onClick={() => handleUpdateStatus(payout, 'rejected')}
                                                    disabled={processingId === payout.id}
                                                    className="px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatus(payout, 'approved')}
                                                    disabled={processingId === payout.id}
                                                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                                                >
                                                    Approve
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400 font-bold uppercase">{payout.status}</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {!loading && filtered.length > 0 && (
                    <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
                            Showing {Math.min(filtered.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filtered.length, currentPage * itemsPerPage)} of {filtered.length}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 disabled:opacity-50 transition-all shadow-sm"
                            >
                                <ChevronLeft size={18} />
                            </button>
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

export default Withdrawals;
