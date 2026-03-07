import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../../supabase';
import {
    Search, Filter, MoreVertical, UserMinus, UserCheck,
    ShieldCheck, Eye, Mail, Trash2, Calendar,
    Clock, MessageCircle, Crown, Info, X
} from 'lucide-react';
import toast from 'react-hot-toast';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // all, active, banned, premium
    const [selectedUser, setSelectedUser] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            toast.error("Failed to load users");
        } else {
            setUsers(data || []);
        }
        setLoading(false);
    };

    const handleBanUser = async (user, duration, reason) => {
        const expiry = duration === 'permanent' ? null : new Date();
        if (duration !== 'permanent') expiry.setDate(expiry.getDate() + parseInt(duration));

        const { error } = await supabase
            .from('profiles')
            .update({
                is_blocked: true,
                ban_reason: reason,
                ban_expiry: expiry ? expiry.toISOString() : null
            })
            .eq('id', user.id);

        if (error) toast.error("Ban failed");
        else {
            toast.success("User banned successfully");
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

            return matchesSearch && matchesFilter;
        });
    }, [users, searchTerm, filterStatus]);

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
                        <option value="all">All Users</option>
                        <option value="active">Active Only</option>
                        <option value="banned">Banned Only</option>
                        <option value="premium">Premium Only</option>
                    </select>
                </div>
            </div>

            {/* Table Area */}
            <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-xl shadow-slate-200/50">
                <div className="overflow-x-auto">
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
                            ) : filteredUsers.length === 0 ? (
                                <tr><td colSpan="5" className="p-20 text-center font-bold text-slate-400 uppercase tracking-widest text-xs">No records matching criteria</td></tr>
                            ) : filteredUsers.map((user) => (
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
                                                <div className="font-black text-slate-800 tracking-tight">{user.username || 'Hidden User'}</div>
                                                <div className="text-xs text-slate-500 font-medium">{user.email}</div>
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
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => { setSelectedUser(user); setIsModalOpen(true); }}
                                                className="p-2 hover:bg-white hover:shadow-md rounded-xl text-slate-500 hover:text-indigo-600 transition-all border border-transparent hover:border-slate-100"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button className="p-2 hover:bg-white hover:shadow-md rounded-xl text-slate-500 hover:text-indigo-600 transition-all border border-transparent hover:border-slate-100">
                                                <Mail size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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
                                <p className="text-slate-500 text-sm font-medium mb-8">{selectedUser.email}</p>

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
                            <div className="flex-1 p-10 overflow-y-auto">
                                <div className="flex items-center justify-between mb-8">
                                    <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">System Data</h4>
                                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X size={20} /></button>
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
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <button
                                                onClick={() => handleBanUser(selectedUser, 'permanent', 'Violated terms of service')}
                                                className="p-6 bg-slate-900 hover:bg-red-600 transition-all rounded-[32px] text-white flex flex-col items-center gap-2 group border-4 border-transparent hover:border-red-500/20"
                                            >
                                                <UserMinus size={24} className="text-red-400 group-hover:text-white transition-colors" />
                                                <span className="font-black text-xs uppercase tracking-widest mt-2">PERMANENT BAN</span>
                                            </button>
                                            <button
                                                className="p-6 bg-white hover:bg-slate-50 transition-all rounded-[32px] text-slate-800 flex flex-col items-center gap-2 border-2 border-slate-100 shadow-sm"
                                            >
                                                <ShieldCheck size={24} className="text-indigo-500" />
                                                <span className="font-black text-xs uppercase tracking-widest mt-2">VERIFY IDENTITY</span>
                                            </button>
                                        </div>
                                    )}

                                    <button className="w-full py-5 border-2 border-dashed border-slate-200 hover:border-red-400 hover:text-red-500 transition-all text-slate-400 font-black rounded-3xl flex items-center justify-center gap-3 mt-10">
                                        <Trash2 size={18} />
                                        ERASE PLAYER DATA PERMANENTLY
                                    </button>
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
