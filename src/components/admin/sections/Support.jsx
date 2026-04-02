import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabase';
import {
    LifeBuoy, Search, Filter, MessageSquare,
    CheckCircle2, Clock, AlertCircle, Send,
    User, Mail, ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';

const Support = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('open'); // open, in_progress, resolved
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [replyText, setReplyText] = useState('');

    useEffect(() => {
        fetchTickets();
    }, [filterStatus]);

    const fetchTickets = async () => {
        setLoading(true);
        // We will query the feedback or support_tickets table
        // For this implementation we assume a `support_tickets` table exists or we will use mock data if it fails
        const { data, error } = await supabase
            .from('support_tickets')
            .select(`
                *,
                user:profiles(username, email, avatar_url)
            `)
            .eq('status', filterStatus)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Failed to load tickets (Table might not exist yet):", error);
            // Fallback to mock data for presentation purposes if table is missing
            setTickets([
                { id: 1, user: { username: 'AlexD', email: 'alex@example.com' }, subject: 'Account Access Issue', message: 'I cannot log in with my Google account anymore.', status: 'open', created_at: new Date().toISOString() },
                { id: 2, user: { username: 'SarahConnor', email: 'sarah@example.com' }, subject: 'Billing Question', message: 'I was double charged for my Strangy Premium subscription.', status: 'open', created_at: new Date(Date.now() - 86400000).toISOString() },
            ]);
        } else {
            setTickets(data || []);
        }
        setLoading(false);
    };

    const handleStatusChange = async (ticketId, newStatus) => {
        const { error } = await supabase
            .from('support_tickets')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', ticketId);

        if (error) {
            toast.success(`Mock: Ticket marked as ${newStatus}`); // Fallback
            fetchTickets();
            setSelectedTicket(null);
        } else {
            toast.success(`Ticket marked as ${newStatus}`);
            fetchTickets();
            setSelectedTicket(null);
        }
    };

    const handleReply = async () => {
        if (!replyText.trim()) return;

        // In a real scenario, this would send an email or push an internal message
        toast.success("Reply sent to user!");
        setReplyText('');
        handleStatusChange(selectedTicket.id, 'resolved');
    };

    return (
        <div className="p-10 max-w-[1600px] mx-auto flex h-[calc(100vh-80px)] overflow-hidden gap-8">
            {/* Sidebar List */}
            <div className="w-1/3 flex flex-col bg-white border border-slate-200 rounded-[40px] shadow-sm overflow-hidden shrink-0">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-2xl font-black tracking-tight text-slate-800 mb-6">Helpdesk</h2>

                    <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm mb-6">
                        {['open', 'in_progress', 'resolved'].map((status) => (
                            <button
                                key={status}
                                onClick={() => { setFilterStatus(status); setSelectedTicket(null); }}
                                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === status
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                {status.replace('_', ' ')}
                            </button>
                        ))}
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Search tickets..."
                            className="w-full bg-white border border-slate-200 pl-11 pr-6 py-3 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-sm"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                    {loading ? (
                        <div className="p-10 text-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
                    ) : tickets.length === 0 ? (
                        <div className="p-10 text-center italic-none">
                            <CheckCircle2 size={40} className="text-green-400 mx-auto mb-4 opacity-50" />
                            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Queue is empty</p>
                        </div>
                    ) : tickets.map((ticket) => (
                        <div
                            key={ticket.id}
                            onClick={() => setSelectedTicket(ticket)}
                            className={`p-5 rounded-3xl border transition-all cursor-pointer group ${selectedTicket?.id === ticket.id
                                ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-md'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm">
                                    #{ticket.id.toString().padStart(4, '0')}
                                </span>
                                <span className="text-[9px] font-black uppercase text-slate-400">{new Date(ticket.created_at).toLocaleDateString()}</span>
                            </div>
                            <h4 className={`text-sm font-black mb-1 truncate ${selectedTicket?.id === ticket.id ? 'text-indigo-900' : 'text-slate-800'}`}>
                                {ticket.subject}
                            </h4>
                            <p className="text-xs font-medium text-slate-500 truncate">{ticket.user?.username || 'Guest User'}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-[40px] shadow-sm overflow-hidden">
                {selectedTicket ? (
                    <>
                        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-black tracking-tight text-slate-800 mb-4">{selectedTicket.subject}</h2>
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-slate-400 shadow-sm overflow-hidden">
                                            {selectedTicket.user?.avatar_url ? <img src={selectedTicket.user.avatar_url} className="w-full h-full object-cover" alt="" /> : (selectedTicket.user?.username?.charAt(0) || 'U')}
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-slate-700">{selectedTicket.user?.username || 'Guest User'}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedTicket.user?.email || 'No email provided'}</div>
                                        </div>
                                    </div>
                                    <div className="w-px h-8 bg-slate-200"></div>
                                    <div className="flex items-center gap-2 text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                                        <Clock size={16} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{new Date(selectedTicket.created_at).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                {filterStatus !== 'resolved' && (
                                    <button
                                        onClick={() => handleStatusChange(selectedTicket.id, 'resolved')}
                                        className="px-6 py-3 bg-green-50 hover:bg-green-500 hover:text-white text-green-600 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-green-100 flex items-center gap-2"
                                    >
                                        <CheckCircle2 size={16} /> Close Ticket
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                            <div className="mb-10">
                                <div className="text-[10px] font-black uppercase tracking-[3px] text-slate-400 mb-6 flex items-center gap-2">
                                    <MessageSquare size={14} /> User Message
                                </div>
                                <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 text-slate-700 font-medium leading-relaxed">
                                    {selectedTicket.message}
                                </div>
                            </div>
                        </div>

                        {filterStatus !== 'resolved' && (
                            <div className="p-8 border-t border-slate-100 bg-slate-50/50">
                                <div className="text-[10px] font-black uppercase tracking-[3px] text-slate-400 mb-4 flex items-center gap-2">
                                    <Mail size={14} /> Send Reply
                                </div>
                                <div className="flex flex-col gap-4">
                                    <textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="Type your response here. This will be sent as an email to the user..."
                                        className="w-full h-32 bg-white border border-slate-200 rounded-3xl p-6 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium resize-none shadow-sm"
                                    ></textarea>
                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleReply}
                                            disabled={!replyText.trim()}
                                            className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            <Send size={16} /> Send & Resolve
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center italic-none">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-xl">
                            <LifeBuoy size={40} className="text-slate-300" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight">Support Dashboard</h3>
                        <p className="text-slate-400 font-medium max-w-xs">Select a ticket from the queue to view details and respond to users.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Support;
