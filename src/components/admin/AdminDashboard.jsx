import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { toast } from 'react-hot-toast';

const AdminDashboard = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const { data, error } = await supabase
                .from('reports')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            setReports(data.map(r => ({
                ...r,
                reportedUserId: r.reported_user_id,
                reporterId: r.reporter_id,
                timestamp: { seconds: new Date(r.created_at).getTime() / 1000 } // Compatibility
            })));
        } catch (error) {
            console.error("Error fetching reports:", error);
            toast.error("Failed to fetch reports");
        } finally {
            setLoading(false);
        }
    };

    const handleBanUser = async (report) => {
        if (!report.reported_user_id) return;
        if (!window.confirm(`Are you sure you want to BAN user ${report.reported_user_id}?`)) return;

        try {
            // 1. Ban user in 'profiles' table
            const { error: banError } = await supabase
                .from('profiles')
                .update({ account_status: 'banned' })
                .eq('id', report.reported_user_id);

            if (banError) throw banError;

            // 2. Update report status
            const { error: reportError } = await supabase
                .from('reports')
                .update({ status: 'resolved_banned' })
                .eq('id', report.id);

            if (reportError) throw reportError;

            toast.success("User has been BANNED.");
            fetchReports();
        } catch (error) {
            console.error("Error banning user:", error);
            toast.error("Failed to ban user");
        }
    };

    const handleDismiss = async (reportId) => {
        try {
            const { error } = await supabase
                .from('reports')
                .update({ status: 'dismissed' })
                .eq('id', reportId);

            if (error) throw error;
            toast.success("Report dismissed.");
            fetchReports();
        } catch (error) {
            console.error(error);
            toast.error("Error dismissing report");
        }
    };

    if (loading) return <div className="p-10 text-white text-center">Loading Dashboard...</div>;

    return (
        <div className="min-h-screen bg-dark-900 p-8 text-white">
            <h1 className="text-3xl font-bold mb-8 text-gradient">Admin Dashboard</h1>

            <div className="bg-dark-800 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-gray-400 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Reason</th>
                            <th className="px-6 py-4">Description</th>
                            <th className="px-6 py-4">Reported User ID</th>
                            <th className="px-6 py-4">Reporter</th>
                            <th className="px-6 py-4">Time</th>
                            <th className="px-6 py-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {reports.map((report) => (
                            <tr key={report.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                                        report.status === 'dismissed' ? 'bg-gray-500/20 text-gray-500' :
                                            'bg-green-500/20 text-green-500'
                                        }`}>
                                        {report.status || 'pending'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-medium text-red-400">{report.reason}</td>
                                <td className="px-6 py-4 text-gray-300 max-w-xs truncate">{report.description || '-'}</td>
                                <td className="px-6 py-4 text-gray-400 font-mono text-xs">{report.reportedUserId}</td>
                                <td className="px-6 py-4 text-gray-500 font-mono text-xs">{report.reporterId}</td>
                                <td className="px-6 py-4 text-gray-500 text-sm">
                                    {report.timestamp?.seconds ? new Date(report.timestamp.seconds * 1000).toLocaleString() : 'Just now'}
                                </td>
                                <td className="px-6 py-4 flex gap-2">
                                    {report.status === 'pending' && (
                                        <>
                                            <button
                                                onClick={() => handleBanUser(report)}
                                                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors"
                                            >
                                                Ban User
                                            </button>
                                            <button
                                                onClick={() => handleDismiss(report.id)}
                                                className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
                                            >
                                                Dismiss
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {reports.length === 0 && (
                            <tr>
                                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">No reports found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminDashboard;
