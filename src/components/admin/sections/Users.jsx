import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../../supabase';
import { Search, Filter, UserMinus, ShieldCheck, Eye, Mail, Trash2, Calendar, Clock, Crown, X, ChevronLeft, ChevronRight, Users as UsersIcon, User, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';

const StatCard = ({ icon: Icon, label, value, colorClass, iconColorClass }) => (
    <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm hover:shadow-md transition-all group flex-1 min-w-[200px]">
        <div className="flex justify-between items-start mb-6">
            <div className={`p-4 rounded-3xl ${colorClass} transition-colors group-hover:scale-110 duration-300`}>
                <Icon size={24} className={iconColorClass} />
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live</span>
            </div>
        </div>
        <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[2px] mb-2">{label}</p>
            <h3 className="text-4xl font-black text-slate-800 tracking-tighter tabular-nums">{value}</h3>
        </div>
    </div>
);

const Users = () => {
    const location = useLocation();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const search = params.get('search');
        if (search) {
            setSearchTerm(search);
        }
    }, [location.search]);

    const [filterStatus, setFilterStatus] = useState('all'); // all, active, banned, premium
    const [filterGender, setFilterGender] = useState('all'); // all, Male, Female, Other
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [banReason, setBanReason] = useState('');
    const [banDuration, setBanDuration] = useState('5');
    const [modalTab, setModalTab] = useState('overview'); // overview, transactions
    const [userTransactions, setUserTransactions] = useState([]);
    const [txLoading, setTxLoading] = useState(false);

    const hasLoadedOnce = React.useRef(false);

    useEffect(() => {
        fetchUsers(true); // Initial load with spinner

        // Silently refresh on tab focus (no spinner, data stays visible)
        const handleFocus = () => {
            if (hasLoadedOnce.current) fetchUsers(false);
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    useEffect(() => {
        if (isModalOpen && selectedUser && modalTab === 'transactions') {
            fetchUserTransactions(selectedUser.id);
        }
    }, [isModalOpen, selectedUser, modalTab]);

    const fetchUserTransactions = async (userId) => {
        setTxLoading(true);
        try {
            // 1. Fetch from coin_transactions (internal coin movements)
            const { data: coinTxs, error: coinErr } = await supabase
                .from('coin_transactions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (coinErr) console.warn("coin_transactions query failed:", coinErr);

            // 2. Also fetch from transactions (purchases/payments)
            const { data: payTxs, error: payErr } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (payErr) console.warn("transactions query failed:", payErr);

            // 3. Merge both — normalize payment transactions to match coin format
            const normalizedPayTxs = (payTxs || []).map(tx => ({
                id: `pay-${tx.id}`,
                user_id: tx.user_id,
                coins_amount: tx.coins_amount || tx.amount || 0,
                coins_balance_after: tx.coins_after || null,
                transaction_type: tx.type || 'purchase',
                description: tx.description || `${tx.type || 'Purchase'} — ₹${tx.amount || 0}`,
                created_at: tx.created_at
            }));

            // Merge and sort by date (newest first)
            const merged = [...(coinTxs || []), ...normalizedPayTxs]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            setUserTransactions(merged);
        } catch (error) {
            console.error("Failed to load user transactions:", error);
            toast.error("Failed to load user transactions.");
        }
        setTxLoading(false);
    };

    const fetchUsers = async (showSpinner = true) => {
        // Only show loader on first load — prevents data disappearing on tab switch
        if (showSpinner && !hasLoadedOnce.current) setLoading(true);
        
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .not('role', 'in', '("admin","moderator","support")')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Failed to load users:", error);
            if (!hasLoadedOnce.current) toast.error("Failed to load users: " + error.message);
        } else {
            setUsers(data || []);
        }
        setLoading(false);
        hasLoadedOnce.current = true;
    };

    const handleBanUser = async (user) => {
        if (!banReason.trim()) { toast.error('Please enter a ban reason'); return; }
        const duration = banDuration;
        const expiry = duration === 'permanent' ? null : new Date();
        if (duration !== 'permanent') expiry.setDate(expiry.getDate() + parseInt(duration));

        const { error } = await supabase
            .from('profiles')
            .update({
                is_blocked: true,
                ban_reason: banReason,
                ban_expiry: expiry ? expiry.toISOString() : null
            })
            .eq('id', user.id);

        if (error) toast.error("Ban failed");
        else {
            toast.success("User banned successfully");
            setBanReason('');
            setBanDuration('5');
            fetchUsers();
            setIsModalOpen(false);
        }
    };

    const handleUnban = async (userId) => {
        const { error } = await supabase
            .from('profiles')
            .update({ is_blocked: false, ban_reason: null, ban_expiry: null })
            .eq('id', userId);

        if (error) toast.error("Unban failed");
        else {
            toast.success("User unbanned");
            fetchUsers();
            setIsModalOpen(false);
        }
    };

    const togglePremium = async (user) => {
        const newStatus = !user.is_premium;
        const { error } = await supabase
            .from('profiles')
            .update({ is_premium: newStatus })
            .eq('id', user.id);

        if (error) toast.error("Failed to update premium status");
        else {
            toast.success(newStatus ? "Premium granted" : "Premium removed");
            fetchUsers();
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("CRITICAL: Are you sure you want to PERMANENTLY delete this user? This action cannot be undone.")) return;

        setLoading(true);
        try {
            // Delete dependent records first to resolve foreign key constraints
            await supabase.from('transactions').delete().eq('user_id', userId);
            await supabase.from('notifications').delete().eq('user_id', userId);
            await supabase.from('messages').delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
            await supabase.from('chat_logs').delete().or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
            await supabase.from('reports').delete().or(`reporter_id.eq.${userId},reported_id.eq.${userId}`);

            const { error } = await supabase.from('profiles').delete().eq('id', userId);
            if (error) throw error;

            toast.success("User permanently removed");
            fetchUsers();
            setIsModalOpen(false);
        } catch (error) {
            console.error("Delete Error:", error);
            toast.error("Delete failed: " + error.message);
        }
        setLoading(false);
    };

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchesSearch =
                user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesFilter =
                filterStatus === 'all' ||
                (filterStatus === 'active' && !user.is_blocked) ||
                (filterStatus === 'banned' && user.is_blocked) ||
                (filterStatus === 'premium' && user.is_premium);

            const matchesGender = 
                filterGender === 'all' || 
                user.gender === filterGender;

            return matchesSearch && matchesFilter && matchesGender;
        });
    }, [users, searchTerm, filterStatus, filterGender]);
    
    const stats = useMemo(() => {
        return {
            total: users.length,
            male: users.filter(u => u.gender === 'Male').length,
            female: users.filter(u => u.gender === 'Female').length,
            purchasers: users.filter(u => (u.total_coins_purchased || 0) > 0).length
        };
    }, [users]);

    // Pagination Logic
    const { paginatedUsers, totalPages } = useMemo(() => {
        const total = filteredUsers.length;
        const pages = Math.ceil(total / itemsPerPage);
        const start = (currentPage - 1) * itemsPerPage;
        const sliced = filteredUsers.slice(start, start + itemsPerPage);
        return { paginatedUsers: sliced, totalPages: pages };
    }, [filteredUsers, currentPage, itemsPerPage]);

    const totalEarned = useMemo(() => {
        return userTransactions
            .filter(tx => tx.transaction_type === 'earned' || tx.transaction_type === 'gift')
            .reduce((sum, tx) => sum + (tx.coins_amount || 0), 0);
    }, [userTransactions]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterStatus, filterGender]);

    return (
        <div className="p-10 max-w-[1600px] mx-auto">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800">User Management</h1>
                    <p className="text-slate-500 font-medium">Monitoring {users.length} total platform accounts</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            className="bg-white border border-slate-200 pl-11 pr-6 py-3 rounded-2xl w-80 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="bg-white border border-slate-200 px-4 py-3 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm font-bold text-slate-600 appearance-none pr-10 cursor-pointer"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active Only</option>
                        <option value="banned">Banned Only</option>
                        <option value="premium">Premium Only</option>
                    </select>

                    <select
                        value={filterGender}
                        onChange={(e) => setFilterGender(e.target.value)}
                        className="bg-white border border-slate-200 px-4 py-3 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm font-bold text-slate-600 appearance-none pr-10 cursor-pointer"
                    >
                        <option value="all">All Genders</option>
                        <option value="Male">Male Only</option>
                        <option value="Female">Female Only</option>
                        <option value="Other">Other Only</option>
                    </select>
                </div>
            </div>
            
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard 
                    icon={UsersIcon}
                    label="All Users"
                    value={stats.total}
                    colorClass="bg-indigo-50"
                    iconColorClass="text-indigo-500"
                />
                <StatCard 
                    icon={User}
                    label="Male Users"
                    value={stats.male}
                    colorClass="bg-blue-50"
                    iconColorClass="text-blue-500"
                />
                <StatCard 
                    icon={User}
                    label="Female Users"
                    value={stats.female}
                    colorClass="bg-pink-50"
                    iconColorClass="text-pink-500"
                />
                <StatCard 
                    icon={CreditCard}
                    label="Paying Users"
                    value={stats.purchasers}
                    colorClass="bg-emerald-50"
                    iconColorClass="text-emerald-500"
                />
            </div>

            {/* Table Area */}
            <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-xl shadow-slate-200/50">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 italic-none">
                                <th className="px-8 py-5 text-[11px] font-black uppercase tracking-[2px] text-slate-400">User Profile</th>
                                <th className="px-8 py-5 text-[11px] font-black uppercase tracking-[2px] text-slate-400">Join Date</th>
                                <th className="px-8 py-5 text-[11px] font-black uppercase tracking-[2px] text-slate-400">Engagement</th>
                                <th className="px-8 py-5 text-[11px] font-black uppercase tracking-[2px] text-slate-400">Status</th>
                                <th className="px-8 py-5 text-[11px] font-black uppercase tracking-[2px] text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="5" className="p-20 text-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Fetching Records...</p></td></tr>
                            ) : paginatedUsers.length === 0 ? (
                                <tr><td colSpan="5" className="p-20 text-center font-bold text-slate-400 uppercase tracking-widest text-xs">No records matching criteria</td></tr>
                            ) : paginatedUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-indigo-50/30 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 overflow-hidden border border-slate-200 shadow-sm">
                                                    {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : user.username?.charAt(0).toUpperCase()}
                                                </div>
                                                {user.is_premium && <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-lg flex items-center justify-center text-[10px] shadow-sm border-2 border-white"><Crown size={10} className="text-white fill-white" /></div>}
                                            </div>
                                    <div>
                                        <div className="font-black text-slate-800 tracking-tight">{user.username || 'Hidden User'}
                                            {user.gender && (
                                                <span className={`ml-2 text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${user.gender === 'Female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                                                    {user.gender}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-500 font-medium">{user.email || user.auth_email || '—'}</div>
                                    </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="text-sm font-bold text-slate-600">{new Date(user.created_at).toLocaleDateString()}</div>
                                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-tighter mt-0.5">{new Date(user.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Total Chats</div>
                                                <div className="font-black text-indigo-600 text-sm">{user.total_chats || 0}</div>
                                            </div>
                                            <div className="h-8 w-[1px] bg-slate-100"></div>
                                            <div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Avg Dur.</div>
                                                <div className="font-black text-slate-700 text-sm">{user.avg_chat_duration || 0}s</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        {user.is_blocked ? (
                                            <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-100 shadow-sm">Banned</span>
                                        ) : (
                                            <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-100 shadow-sm">Active</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => { setSelectedUser(user); setIsModalOpen(true); }}
                                                className="p-2 hover:bg-white hover:shadow-md rounded-xl text-slate-500 hover:text-indigo-600 transition-all border border-transparent hover:border-slate-100"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button className="p-2 hover:bg-white hover:shadow-md rounded-xl text-slate-500 hover:text-indigo-600 transition-all border border-transparent hover:border-slate-100">
                                                <Mail size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(user.id)}
                                                className="p-2 hover:bg-white hover:shadow-md rounded-xl text-slate-500 hover:text-red-500 transition-all border border-transparent hover:border-red-100"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {!loading && filteredUsers.length > 0 && (
                    <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
                            Showing {Math.min(filteredUsers.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredUsers.length, currentPage * itemsPerPage)} of {filteredUsers.length} records
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

            {/* Details Modal */}
            {isModalOpen && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col md:flex-row h-[70vh]">
                            {/* Modal Sidebar */}
                            <div className="w-full md:w-80 bg-slate-50 border-r border-slate-100 p-8 flex flex-col items-center">
                                <div className="w-32 h-32 rounded-[40px] bg-white shadow-xl flex items-center justify-center text-4xl font-black text-indigo-500 border-4 border-white overflow-hidden mb-6">
                                    {selectedUser.avatar_url ? <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" /> : selectedUser.username?.charAt(0)}
                                </div>
                                <h3 className="text-xl font-black text-slate-800 text-center">{selectedUser.username}</h3>
                                <p className="text-slate-500 text-sm font-medium mb-1">{selectedUser.email || '—'}</p>
                                <p className="text-[10px] font-mono text-slate-400 mb-8 truncate max-w-full px-2">{selectedUser.id?.slice(0, 16)}...</p>

                                <div className="w-full space-y-3">
                                    <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Subscription</div>
                                        <div className="flex items-center justify-between">
                                            <span className={`text-sm font-black ${selectedUser.is_premium ? 'text-indigo-600' : 'text-slate-400'}`}>
                                                {selectedUser.is_premium ? 'Premium' : 'Free Plan'}
                                            </span>
                                            <button
                                                onClick={() => togglePremium(selectedUser)}
                                                className={`p-2 rounded-xl transition-all ${selectedUser.is_premium ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-100 text-slate-400'}`}
                                            >
                                                <Crown size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</div>
                                        <div className="flex items-center justify-between">
                                            <span className={`text-sm font-black ${selectedUser.is_blocked ? 'text-red-600' : 'text-green-600'}`}>
                                                {selectedUser.is_blocked ? 'Banned' : 'Operational'}
                                            </span>
                                            <span className={`w-3 h-3 rounded-full ${selectedUser.is_blocked ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}></span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto w-full pt-8">
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="w-full py-4 bg-slate-200 hover:bg-slate-300 transition-colors rounded-2xl font-black text-slate-600 text-sm"
                                    >
                                        CLOSE VIEW
                                    </button>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto bg-white flex flex-col custom-scrollbar">
                                {/* Tabs */}
                                <div className="flex items-center border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-10 px-4">
                                    <div className="flex flex-1">
                                        <button 
                                            onClick={() => setModalTab('overview')}
                                            className={`flex-1 py-5 text-sm font-black uppercase tracking-widest transition-colors ${modalTab === 'overview' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            System Data
                                        </button>
                                        <button 
                                            onClick={() => setModalTab('transactions')}
                                            className={`flex-1 py-5 text-sm font-black uppercase tracking-widest transition-colors ${modalTab === 'transactions' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Coin History
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => setIsModalOpen(false)}
                                        className="p-2 ml-4 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="p-10">
                                {modalTab === 'overview' ? (
                                    <>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Gender</div>
                                        <div className="font-bold text-slate-700">
                                            {selectedUser.gender
                                                ? <span className={`px-2 py-0.5 rounded-lg text-sm font-black ${selectedUser.gender === 'Female' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'}`}>{selectedUser.gender}</span>
                                                : <span className="text-slate-400">Not Specified</span>}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Birth Date</div>
                                        <div className="font-bold text-slate-700">
                                            {selectedUser.birthdate
                                                ? new Date(selectedUser.birthdate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
                                                : <span className="text-slate-400">Not Provided</span>}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Location</div>
                                        <div className="font-bold text-slate-700">
                                            {(selectedUser.location_city || selectedUser.location_country)
                                                ? [selectedUser.location_city, selectedUser.location_country].filter(Boolean).join(', ')
                                                : <span className="text-slate-400">Not Available</span>}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 col-span-2 md:col-span-3">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Email Address</div>
                                        <div className="font-bold text-slate-700 break-all">
                                            {selectedUser.email || <span className="text-slate-400">Not Available</span>}
                                        </div>
                                    </div>
                                </div>


                                <div className="grid grid-cols-2 gap-6 mb-10">
                                    <div className="p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100/50">
                                        <div className="flex items-center gap-3 text-indigo-500 mb-3">
                                            <Calendar size={18} />
                                            <span className="text-[11px] font-black uppercase tracking-widest">Account Born</span>
                                        </div>
                                        <div className="text-lg font-black text-indigo-900">{new Date(selectedUser.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                                        <div className="flex items-center gap-3 text-slate-400 mb-3">
                                            <Clock size={18} />
                                            <span className="text-[11px] font-black uppercase tracking-widest">Last Detection</span>
                                        </div>
                                        <div className="text-lg font-black text-slate-700">{new Date(selectedUser.last_seen || selectedUser.created_at).toLocaleDateString()}</div>
                                    </div>
                                </div>

                                <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[3px] mb-6 border-b border-slate-100 pb-2">Administrative Actions</h5>
                                <div className="space-y-4">
                                    {selectedUser.is_blocked ? (
                                        <div className="p-6 bg-red-50 border border-red-100 rounded-3xl">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
                                                    <ShieldCheck size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-black text-red-900">Account Terminated</div>
                                                    <div className="text-xs text-red-500 font-bold uppercase tracking-widest">Reason: {selectedUser.ban_reason || 'Administrative Decision'}</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleUnban(selectedUser.id)}
                                                className="w-full py-4 bg-white hover:bg-red-600 hover:text-white border-2 border-red-500 text-red-600 transition-all rounded-2xl font-black text-sm uppercase tracking-widest"
                                            >
                                                Restore Account Access
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Ban Reason</label>
                                                <input
                                                    type="text"
                                                    value={banReason}
                                                    onChange={(e) => setBanReason(e.target.value)}
                                                    placeholder="e.g. Violated terms of service"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-400"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Ban Duration</label>
                                                <select
                                                    value={banDuration}
                                                    onChange={(e) => setBanDuration(e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                                                >
                                                    <option value="1">1 Day</option>
                                                    <option value="3">3 Days</option>
                                                    <option value="5">5 Days</option>
                                                    <option value="7">7 Days</option>
                                                    <option value="14">14 Days</option>
                                                    <option value="30">30 Days</option>
                                                    <option value="permanent">Permanent</option>
                                                </select>
                                            </div>
                                            <button
                                                onClick={() => handleBanUser(selectedUser)}
                                                className="w-full p-4 bg-slate-900 hover:bg-red-600 transition-all rounded-2xl text-white flex items-center justify-center gap-2 group border-4 border-transparent hover:border-red-500/20"
                                            >
                                                <UserMinus size={20} className="text-red-400 group-hover:text-white transition-colors" />
                                                <span className="font-black text-xs uppercase tracking-widest">Apply Ban</span>
                                            </button>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => handleDeleteUser(selectedUser.id)}
                                        className="w-full py-5 border-2 border-dashed border-slate-200 hover:border-red-400 hover:text-red-500 transition-all text-slate-400 font-black rounded-3xl flex items-center justify-center gap-3 mt-10"
                                    >
                                        <Trash2 size={18} />
                                        ERASE PLAYER DATA PERMANENTLY
                                    </button>
                                </div>
                                </>
                            ) : (
                                <>
                                    {/* Coin History Tab */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10 text-center">
                                            <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
                                                <div className="text-[10px] font-black uppercase text-amber-500 tracking-widest mb-1">Current Balance</div>
                                                <div className="text-2xl font-black text-amber-600">{selectedUser.coins || 0}</div>
                                            </div>
                                            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                                                <div className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-1">Total Purchased</div>
                                                <div className="text-2xl font-black text-emerald-600">{selectedUser.total_coins_purchased || 0}</div>
                                            </div>
                                            <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                                                <div className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1">Total Claimed</div>
                                                <div className="text-2xl font-black text-indigo-600">{totalEarned.toLocaleString()}</div>
                                            </div>
                                            <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100">
                                                <div className="text-[10px] font-black uppercase text-rose-500 tracking-widest mb-1">Total Spent</div>
                                                <div className="text-2xl font-black text-rose-600">{selectedUser.total_coins_spent || 0}</div>
                                            </div>
                                        </div>

                                        <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[3px] mb-6 border-b border-slate-100 pb-2">Transaction Log</h5>
                                        
                                        {txLoading ? (
                                            <div className="p-10 text-center text-slate-400 text-sm font-bold animate-pulse">Loading Ledger...</div>
                                        ) : userTransactions.length === 0 ? (
                                            <div className="p-16 border-2 border-dashed border-slate-200 rounded-[32px] text-center text-slate-400 italic-none">
                                                <span className="text-[10px] font-black uppercase tracking-widest">No coin transactions found</span>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {userTransactions.map(tx => (
                                                    <div key={tx.id} className="flex items-center justify-between p-5 bg-slate-50 border border-slate-100 rounded-3xl">
                                                        <div>
                                                            <div className="font-bold text-slate-700">{tx.description}</div>
                                                            <div className="flex items-center gap-3 mt-1">
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{new Date(tx.created_at).toLocaleString()}</span>
                                                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500">{tx.transaction_type}</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className={`text-xl font-black ${tx.coins_amount > 0 ? 'text-green-500' : 'text-rose-500'}`}>
                                                                {tx.coins_amount > 0 ? '+' : ''}{tx.coins_amount}
                                                            </div>
                                                            <div className="text-[10px] font-bold text-slate-400">Bal: {tx.coins_balance_after}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Users;
