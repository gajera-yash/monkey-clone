import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import { Mail, Calendar, User, AlignLeft, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminContactMessages = () => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('contact_messages')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMessages(data || []);
        } catch (error) {
            console.error('Error fetching contact messages:', error);
            toast.error('Failed to load contact messages');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Contact Messages</h1>
                    <p className="text-slate-500 mt-1 uppercase text-xs font-bold tracking-widest">
                        User inquiries & support requests
                    </p>
                </div>
                <button
                    onClick={fetchMessages}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold transition-colors"
                >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">User</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Subject</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Message</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-slate-400 font-bold">Loading messages...</td>
                                </tr>
                            ) : messages.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No messages found</td>
                                </tr>
                            ) : (
                                messages.map((msg) => (
                                    <tr key={msg.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                                                    <User size={18} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800 text-sm">{msg.name}</div>
                                                    <div className="text-xs text-slate-400 font-medium">{msg.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600">
                                                <Mail size={12} />
                                                {msg.subject || 'No Subject'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="max-w-sm">
                                                <p className="text-sm text-slate-600 line-clamp-2 md:line-clamp-none whitespace-pre-wrap">{msg.message}</p>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-end gap-1.5">
                                                <Calendar size={12} />
                                                {new Date(msg.created_at).toLocaleDateString()}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminContactMessages;
