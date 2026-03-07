import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabase';
import {
    ShieldAlert, Filter, CheckCircle2, XCircle,
    MoreHorizontal, Eye, ExternalLink, TriangleAlert,
    Clock, User, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

const Reports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('pending'); // pending, reviewed, dismissed

    useEffect(() => {
        fetchReports();
    }, [filterStatus]);

    const fetchReports = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('reports')
            .select(`
                *,
                reporter:profiles!reports_reporter_id_fkey(username, avatar_url, email),
                reported:profiles!reports_reported_id_fkey(username, avatar_url, email, is_blocked)
            `)
            .eq('status', filterStatus)
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
            toast.error("Failed to load reports");
        } else {
            setReports(data || []);
        }
        setLoading(false);
    };

    const handleAction = async (reportId, action, reportedId) => {
        const { error: reportError } = await supabase
            .from('reports')
            .update({
                status: action === 'dismiss' ? 'dismiss' : 'reviewed',
                reviewed_at: new Date().toISOString()
            })
            .eq('id', reportId);

        if (action === 'ban' && !reportError) {
            const { error: banError } = await supabase
                .from('profiles')
                .update({ is_blocked: true, ban_reason: 'Reported by community and reviewed by admin' })
                .eq('id', reportedId);

            if (banError) toast.error("Report reviewed but ban failed");
            else toast.success("User banned and report resolved");
        } else if (!reportError) {
            toast.success(`Report marked as ${action === 'dismiss' ? 'dismissed' : 'reviewed'}`);
        }

        fetchReports();
    };

    return (
        <div className="p-10 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800">Moderation Queue</h1>
                    <p className="text-slate-500 font-medium tracking-tight">Protecting the community from toxic behavior</p>
                </div>

                <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm shrink-0">
                    {['pending', 'reviewed', 'dismissed'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterStatus === status
                                    ? 'bg-[#0F172A] text-white shadow-lg'
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {loading ? (
                    <div className="p-20 text-center bg-white rounded-[40px] border border-slate-100 italic-none">
                        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Scanning Reports...</p>
                    </div>
                ) : reports.length === 0 ? (
                    <div className="p-20 text-center bg-white rounded-[40px] border border-slate-100">
                        <ShieldCheck size={48} className="text-green-500 mx-auto mb-4 opacity-20" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Inbox Zero - Community is safe</p>
                    </div>
                ) : reports.map((report) => (
                    <div key={report.id} className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
                        <div className="flex flex-col lg:flex-row">
                            {/* Priority Indicator */}
                            <div className={`w-2 h-auto ${report.priority > 5 ? 'bg-red-500' : 'bg-orange-400'}`}></div>

                            {/* Report Header */}
                            <div className="flex-1 p-8">
                                <div className="flex flex-wrap items-center justify-between gap-6 mb-8">
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-slate-400 shrink-0">
                                                {report.reporter?.avatar_url ? <img src={report.reporter.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" /> : 'A'}
                                            </div>
                                            <div className="truncate max-w-[120px]">
                                                <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Reporter</div>
                                                <div className="text-sm font-black text-slate-700">{report.reporter?.username || 'Citizen'}</div>
                                            </div>
                                        </div>

                                        <div className="w-8 flex items-center justify-center">
                                            <TriangleAlert size={16} className="text-slate-300" />
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center font-black text-red-400 shrink-0 shadow-sm shadow-red-500/10">
                                                {report.reported?.avatar_url ? <img src={report.reported.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" /> : 'T'}
                                            </div>
                                            <div className="truncate max-w-[120px]">
                                                <div className="text-[10px] text-red-400 font-black uppercase tracking-widest mb-0.5">Target</div>
                                                <div className="text-sm font-black text-red-900">{report.reported?.username || 'Target'}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                                        <Clock size={16} className="text-slate-400" />
                                        <span className="text-xs font-bold text-slate-600">{new Date(report.created_at).toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    <div>
                                        <div className="text-[11px] font-black text-slate-400 uppercase tracking-[2px] mb-4">Reason & Description</div>
                                        <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl">
                                            <div className="inline-block px-3 py-1 bg-red-100 text-red-600 rounded-lg text-[10px] font-black uppercase mb-3 shadow-sm border border-red-200">
                                                {report.reason}
                                            </div>
                                            <p className="text-slate-600 font-medium leading-relaxed">{report.description || 'No description provided.'}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-[11px] font-black text-slate-400 uppercase tracking-[2px] mb-4">Evidence & Artifacts</div>
                                        <div className="flex flex-wrap gap-3">
                                            {report.evidence_urls && report.evidence_urls.length > 0 ? report.evidence_urls.map((url, i) => (
                                                <a key={i} href={url} target="_blank" rel="noreferrer" className="w-24 h-24 bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden relative group/img">
                                                    <img src={url} alt="" className="w-full h-full object-cover opacity-80 group-hover/img:opacity-100 transition-opacity" />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                                        <ExternalLink size={16} className="text-white" />
                                                    </div>
                                                </a>
                                            )) : (
                                                <div className="w-full p-10 border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center text-slate-400 italic-none">
                                                    <Eye size={24} className="mb-2 opacity-50" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-center">No visual artifacts found</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Report Actions */}
                            <div className="lg:w-80 bg-slate-50 border-l border-slate-200 p-8 flex flex-col justify-center gap-3 shrink-0">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Moderator Actions</h5>
                                <button
                                    onClick={() => handleAction(report.id, 'ban', report.reported_id)}
                                    className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <ShieldAlert size={16} />
                                    Ban Target
                                </button>
                                <button
                                    onClick={() => handleAction(report.id, 'ignore', report.reported_id)}
                                    className="w-full py-4 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 size={16} />
                                    Review Done
                                </button>
                                <button
                                    onClick={() => handleAction(report.id, 'dismiss', report.reported_id)}
                                    className="w-full py-4 bg-slate-200 hover:bg-slate-300 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <XCircle size={16} />
                                    Dismiss Report
                                </button>

                                <div className="mt-4 pt-4 border-t border-slate-200 italic-none">
                                    <button className="w-full flex items-center justify-between text-xs font-bold text-slate-400 hover:text-indigo-500 transition-colors">
                                        View History <Eye size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Reports;
