import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

const AdminDashboard = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const q = query(collection(db, "reports"), orderBy("timestamp", "desc"));
            const querySnapshot = await getDocs(q);
            const reportsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setReports(reportsData);
        } catch (error) {
            console.error("Error fetching reports:", error);
            toast.error("Failed to fetch reports");
        } finally {
            setLoading(false);
        }
    };

    const handleBanUser = async (report) => {
        if (!window.confirm(`Are you sure you want to BAN user ${report.reportedUserId}?`)) return;

        try {
            // 1. Ban user in 'users' collection
            const userRef = doc(db, "users", report.reportedUserId);
            await updateDoc(userRef, { isBanned: true });

            // 2. Update report status
            const reportRef = doc(db, "reports", report.id);
            await updateDoc(reportRef, { status: "resolved_banned" });

            toast.success("User has been BANNED.");
            fetchReports();
        } catch (error) {
            console.error("Error banning user:", error);
            toast.error("Failed to ban user");
        }
    };

    const handleDismiss = async (reportId) => {
        try {
            const reportRef = doc(db, "reports", reportId);
            await updateDoc(reportRef, { status: "dismissed" });
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
