import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabase';
import { useAuth } from '../../../context/AuthContext';
import {
    ShieldAlert, Filter, CheckCircle2, XCircle,
    MoreHorizontal, Eye, ExternalLink, TriangleAlert,
    Clock, User, ShieldCheck, Zap,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

const Reports = () => {
    const { currentUser } = useAuth();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('pending'); // pending, reviewed, dismissed
    const [addingStrike, setAddingStrike] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

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
                reported:profiles!reports_reported_user_id_fkey(username, avatar_url, email, is_blocked, strike_count)
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

    // Pagination Logic
    const { paginatedReports, totalPages } = React.useMemo(() => {
        const total = reports.length;
        const pages = Math.ceil(total / itemsPerPage);
        const start = (currentPage - 1) * itemsPerPage;
        const sliced = reports.slice(start, start + itemsPerPage);
        return { paginatedReports: sliced, totalPages: pages };
    }, [reports, currentPage, itemsPerPage]);

    // Reset to page 1 when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filterStatus]);

    const logAdminAction = async (actionType, targetUserId, reason, details = {}) => {
        try {
            await supabase.from('admin_action_logs').insert({
                admin_id: currentUser?.id,
                admin_email: currentUser?.email,
                action_type: actionType,
                target_user_id: targetUserId,
                target_entity_id: null,
                target_entity_type: 'profile',
                reason,
                details,
            });
        } catch (e) { console.warn('Could not log admin action:', e); }
    };

    const handleAction = async (reportId, action, reportedId, reportedUser) => {
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
            else {
                toast.success("User banned and report resolved");
                await logAdminAction('ban', reportedId, 'Reported by community and reviewed by admin', { report_id: reportId });
            }
        } else if (!reportError) {
            toast.success(`Report marked as ${action === 'dismiss' ? 'dismissed' : 'reviewed'}`);
            if (action === 'dismiss') await logAdminAction('dismiss', reportedId, 'Report dismissed', { report_id: reportId });
            else await logAdminAction('review', reportedId, 'Report reviewed without ban', { report_id: reportId });
        }

        fetchReports();
    };

    const handleAddStrike = async (report) => {
        const reportedId = report.reported_id;
        const reportedUser = report.reported;
        setAddingStrike(prev => ({ ...prev, [report.id]: true }));

        try {
            const currentStrikes = reportedUser?.strike_count || 0;
            const newStrikeCount = currentStrikes + 1;

            let is_blocked = reportedUser?.is_blocked;
            let ban_expiry = null;
            let action_taken = 'warning';

            if (newStrikeCount === 2) {
                ban_expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                is_blocked = true;
                action_taken = '24hr_ban';
            } else if (newStrikeCount >= 3) {
                is_blocked = true;
                ban_expiry = null;
                action_taken = 'permanent_ban';
            }

            const { error: profileErr } = await supabase.from('profiles').update({
                strike_count: newStrikeCount,
                last_strike_at: new Date().toISOString(),
                is_blocked,
                ban_expiry,
                ban_reason: `Strike ${newStrikeCount}: ${report.reason}`
            }).eq('id', reportedId);

            if (profileErr) throw profileErr;

            await supabase.from('user_strikes').insert({
                user_id: reportedId,
                strike_number: newStrikeCount,
                reason: report.reason,
                report_id: report.id,
                admin_id: currentUser?.id,
                action_taken,
                expires_at: ban_expiry,
            });

            // Mark report reviewed
            await supabase.from('reports').update({ status: 'reviewed', reviewed_at: new Date().toISOString() }).eq('id', report.id);

            await logAdminAction('add_strike', reportedId, `Strike ${newStrikeCount} for: ${report.reason}`, {
                strike_number: newStrikeCount, action: action_taken, report_id: report.id
            });

            const actionMsg = action_taken === 'warning' ? 'Warning issued' : action_taken === '24hr_ban' ? '24hr ban applied' : 'Permanent ban applied';
            toast.success(`Strike ${newStrikeCount} — ${actionMsg}`);
            fetchReports();
        } catch (err) {
            console.error(err);
            toast.error('Failed to add strike');
        }
        setAddingStrike(prev => ({ ...prev, [report.id]: false }));
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
                ) : paginatedReports.length === 0 ? (
                    <div className="p-20 text-center bg-white rounded-[40px] border border-slate-100">
                        <ShieldCheck size={48} className="text-green-500 mx-auto mb-4 opacity-20" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Inbox Zero - Community is safe</p>
                    </div>
                ) : paginatedReports.map((report) => (
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
                                                {(report.reported?.strike_count > 0) && (
                                                    <div className="text-[10px] text-orange-500 font-black">{report.reported.strike_count} strike{report.reported.strike_count !== 1 ? 's' : ''}</div>
                                                )}
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
                                            {report.evidence_url ? (
                                                <a href={report.evidence_url} target="_blank" rel="noreferrer" className="w-24 h-24 bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden relative group/img">
                                                    <img src={report.evidence_url} alt="" className="w-full h-full object-cover opacity-80 group-hover/img:opacity-100 transition-opacity" />
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                                        <ExternalLink size={16} className="text-white" />
                                                    </div>
                                                </a>
                                            ) : report.evidence_urls && report.evidence_urls.length > 0 ? report.evidence_urls.map((url, i) => (
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
                                    onClick={() => handleAction(report.id, 'ban', report.reported_id, report.reported)}
                                    className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <ShieldAlert size={16} />
                                    Ban Target
                                </button>
                                <button
                                    onClick={() => handleAddStrike(report)}
                                    disabled={addingStrike[report.id]}
                                    className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <Zap size={16} />
                                    {addingStrike[report.id] ? 'Adding...' : 'Add Strike'}
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

            {/* Pagination Controls */}
            {!loading && reports.length > 0 && (
                <div className="px-8 py-5 bg-white border border-slate-200 mt-8 rounded-[32px] flex items-center justify-between shadow-sm">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        Showing {Math.min(reports.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(reports.length, currentPage * itemsPerPage)} of {reports.length} records
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
                                        className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${currentPage === page ? 'bg-[#0F172A] text-white shadow-lg shadow-slate-900/20' : 'bg-white border border-slate-200 text-slate-500 hover:border-indigo-300'}`}
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
    );
};

export default Reports;
