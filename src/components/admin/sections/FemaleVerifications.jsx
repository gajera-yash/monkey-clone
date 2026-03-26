import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabase';
import { FiCheck, FiX, FiEye, FiClock, FiUser, FiMail, FiMic, FiCamera, FiExternalLink, FiSearch } from 'react-icons/fi';
import { ShieldCheck, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const FemaleVerifications = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending'); // pending, approved, rejected, all
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    useEffect(() => {
        fetchRequests();

        // Real-time subscription for new verifications
        const channel = supabase
            .channel('female_verifications')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'verifications'
            }, () => {
                fetchRequests();
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('verifications')
            .select(`
                *,
                profiles (
                    id,
                    username,
                    email,
                    gender,
                    avatar_url,
                    account_status,
                    is_verified,
                    created_at
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Failed to load verifications:', error);
            toast.error('Failed to load verifications');
        } else {
            // Filter to only female users
            const femaleRequests = (data || []).filter(r => {
                const g = r.profiles?.gender?.toLowerCase()?.trim();
                return g === 'female';
            });
            setRequests(femaleRequests);
        }
        setLoading(false);
    };

    const handleApprove = async (req) => {
        const toastId = toast.loading('Approving...');
        try {
            // Update verification status
            const { error: verErr } = await supabase
                .from('verifications')
                .update({ status: 'approved' })
                .eq('id', req.id);

            if (verErr) throw verErr;

            // Update profile: verified + active
            const { error: profErr } = await supabase
                .from('profiles')
                .update({ is_verified: true, account_status: 'active' })
                .eq('id', req.user_id);

            if (profErr) throw profErr;

            toast.success('Profile approved!', { id: toastId });
            setSelectedRequest(null);
            fetchRequests();
        } catch (err) {
            toast.error('Approval failed: ' + err.message, { id: toastId });
        }
    };

    const handleReject = async (req) => {
        const toastId = toast.loading('Rejecting...');
        try {
            // Update verification status
            const { error: verErr } = await supabase
                .from('verifications')
                .update({ status: 'rejected' })
                .eq('id', req.id);

            if (verErr) throw verErr;

            // Update profile account_status
            const { error: profErr } = await supabase
                .from('profiles')
                .update({ account_status: 'rejected', is_verified: false })
                .eq('id', req.user_id);

            if (profErr) throw profErr;

            toast.success('Profile rejected.', { id: toastId });
            setSelectedRequest(null);
            fetchRequests();
        } catch (err) {
            toast.error('Rejection failed: ' + err.message, { id: toastId });
        }
    };

    const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

    // Pagination Logic
    const { paginatedData, totalPages } = React.useMemo(() => {
        const total = filtered.length;
        const pages = Math.ceil(total / itemsPerPage);
        const start = (currentPage - 1) * itemsPerPage;
        const sliced = filtered.slice(start, start + itemsPerPage);
        return { paginatedData: sliced, totalPages: pages };
    }, [filtered, currentPage, itemsPerPage]);

    // Reset to page 1 when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filter]);

    const getStatusBadge = (status, notes = '') => {
        const isAuto = notes?.includes('Auto-approved');
        const base = 'px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1';
        
        if (status === 'approved' && isAuto) {
            return (
                <span className={`${base} bg-indigo-100 text-indigo-700`}>
                    <span className="text-[12px]">🤖</span> AI Approved
                </span>
            );
        }

        switch (status) {
            case 'pending': return <span className={`${base} bg-yellow-100 text-yellow-700`}>Pending</span>;
            case 'approved': return <span className={`${base} bg-green-100 text-green-700`}>Approved</span>;
            case 'rejected': return <span className={`${base} bg-red-100 text-red-700`}>Rejected</span>;
            default: return <span className={`${base} bg-slate-100 text-slate-500`}>{status}</span>;
        }
    };

    const counts = {
        all: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length,
    };

    return (
        <div className="p-10 max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800 flex items-center gap-3">
                        <ShieldCheck className="text-pink-500" size={32} />
                        Female Profile Verifications
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium">Review face & voice verification requests from female users</p>
                </div>
                <button
                    onClick={fetchRequests}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                >
                    <RefreshCw size={14} />
                    Refresh
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-3 mb-8">
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

            {/* Table View */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">User Identity</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Level</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Submitted</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan="5" className="py-20 text-center">
                                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                                    No {filter === 'all' ? '' : filter} verifications found
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((req) => (
                                <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center overflow-hidden border-2 border-pink-200 shrink-0">
                                                {req.profiles?.avatar_url ? (
                                                    <img src={req.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <FiUser className="text-pink-500" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-black text-slate-800 truncate">{req.profiles?.username || 'Unknown'}</div>
                                                <div className="text-[11px] text-slate-400 truncate">{req.profiles?.email || '—'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-pink-50 text-pink-600 border border-pink-100 uppercase tracking-wider">
                                            {req.voice_url ? 'Face + Voice' : 'Face Only'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(req.status, req.ai_notes)}
                                        {req.ai_confidence > 0 && (
                                            <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                                                AI Confidence: {Math.round(req.ai_confidence * 100)}%
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                                        {new Date(req.created_at).toLocaleDateString()}
                                        <br />
                                        <span className="text-[10px] text-slate-300">{new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => setSelectedRequest(req)}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all active:scale-95"
                                        >
                                            <FiEye size={14} />
                                            Review
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination Controls */}
                {!loading && filtered.length > 0 && (
                    <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                        <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
                            Showing {Math.min(filtered.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filtered.length, currentPage * itemsPerPage)} of {filtered.length} records
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

            {/* Detail Review Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
                    <div 
                        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm animate-fade-in"
                        onClick={() => setSelectedRequest(null)}
                    />
                    
                    <div className="relative w-full max-w-4xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-scale-up max-h-[90vh]">
                        {/* Media Section */}
                        <div className="w-full md:w-1/2 bg-slate-900 flex flex-col p-8 gap-6 overflow-y-auto">
                            <div className="flex items-center justify-between text-white/50 text-[10px] font-black uppercase tracking-widest">
                                <span>Verification Evidence</span>
                                <span className="bg-pink-500/20 text-pink-400 px-3 py-1 rounded-full border border-pink-500/30">
                                    Requested by {selectedRequest.profiles?.username}
                                </span>
                            </div>

                            {/* Photo */}
                            <div className="relative group rounded-3xl overflow-hidden border border-white/10 aspect-[4/5] bg-slate-800">
                                {selectedRequest.face_url ? (
                                    <img 
                                        src={selectedRequest.face_url} 
                                        alt="Face" 
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-white/20">
                                        <FiCamera size={48} />
                                        <span className="mt-4 font-black">No Face Photo</span>
                                    </div>
                                )}
                            </div>

                            {/* Voice */}
                            {selectedRequest.voice_url && (
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                                    <div className="flex items-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-widest">
                                        <FiMic size={14} /> Voice Sample
                                    </div>
                                    <audio controls className="w-full h-10 accent-pink-500">
                                        <source src={selectedRequest.voice_url} type="audio/webm" />
                                        <source src={selectedRequest.voice_url} type="audio/mpeg" />
                                    </audio>
                                </div>
                            )}
                        </div>

                        {/* Info & Actions Section */}
                        <div className="flex-1 p-10 flex flex-col bg-white">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h2 className="text-3xl font-black text-slate-800">Review Identity</h2>
                                    <p className="text-slate-400 font-medium">Verification ID: {selectedRequest.id.split('-')[0].toUpperCase()}</p>
                                </div>
                                <button 
                                    onClick={() => setSelectedRequest(null)}
                                    className="p-2 border border-slate-200 rounded-xl text-slate-400 hover:bg-slate-50 transition-colors"
                                >
                                    <FiX size={20} />
                                </button>
                            </div>

                            <div className="space-y-6 flex-1">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                        <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest block mb-1">Username</span>
                                        <span className="font-black text-slate-800">{selectedRequest.profiles?.username}</span>
                                    </div>
                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                        <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest block mb-1">Email</span>
                                        <span className="font-bold text-slate-600 truncate block">{selectedRequest.profiles?.email}</span>
                                    </div>
                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                        <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest block mb-1">Gender</span>
                                        <span className="font-black text-pink-500 capitalize">{selectedRequest.profiles?.gender}</span>
                                    </div>
                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                        <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest block mb-1">Joined</span>
                                        <span className="font-black text-slate-800">{new Date(selectedRequest.profiles?.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                {selectedRequest.ai_notes && (
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                                            {selectedRequest.ai_notes.includes('Auto-approved') ? '✨' : '🤖'}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-indigo-900 font-black text-xs uppercase tracking-widest">AI Audit Data</span>
                                                {selectedRequest.ai_confidence > 0 && (
                                                    <span className="bg-white/50 px-2 py-0.5 rounded text-[10px] font-black text-indigo-500 border border-indigo-100">
                                                        {Math.round(selectedRequest.ai_confidence * 100)}% SURE
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-indigo-700 text-sm font-medium mt-0.5">{selectedRequest.ai_notes}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-slate-800 rounded-2xl p-5 text-white">
                                    <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                                        <ShieldCheck size={14} className="text-green-400" /> Review Checklist
                                    </h4>
                                    <ul className="space-y-2 text-xs font-medium text-slate-300">
                                        <li className="flex items-center gap-2">🔹 Is the face photo clear and real?</li>
                                        <li className="flex items-center gap-2">🔹 Does the voice sound natural and female?</li>
                                        <li className="flex items-center gap-2">🔹 Photo matches profile data?</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Final Actions */}
                            {selectedRequest.status === 'pending' ? (
                                <div className="mt-10 flex gap-4">
                                    <button
                                        onClick={() => handleReject(selectedRequest)}
                                        className="flex-1 h-14 border-2 border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleApprove(selectedRequest)}
                                        className="flex-[2] h-14 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/30 active:scale-95 flex items-center justify-center gap-3"
                                    >
                                        <FiCheck size={20} /> Approve & Verify
                                    </button>
                                </div>
                            ) : (
                                <div className={`mt-10 h-14 rounded-2xl flex items-center justify-center font-black text-sm uppercase tracking-widest border-2 ${
                                    selectedRequest.status === 'approved' 
                                        ? 'bg-green-50 text-green-600 border-green-100'
                                        : 'bg-red-50 text-red-600 border-red-100'
                                }`}>
                                    Verification {selectedRequest.status}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Simple Image Lightbox (From original code) */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative max-w-lg w-full">
                        <img src={selectedImage} alt="Verification" className="w-full rounded-3xl shadow-2xl" />
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute -top-4 -right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-xl text-slate-700 hover:bg-slate-100"
                        >
                            <FiX />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FemaleVerifications;
