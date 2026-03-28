import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase';
import { Bug, Calendar, Smartphone, Globe, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminBugReports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('bug_reports')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReports(data || []);
        } catch (error) {
            console.error('Error fetching bug reports:', error);
            toast.error('Failed to load bug reports');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Bug Reports</h1>
                    <p className="text-slate-500 mt-1 uppercase text-xs font-bold tracking-widest">
                        User reported technical issues
                    </p>
                </div>
                <button
                    onClick={fetchReports}
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
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Issue</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Device Info</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Description & Steps</th>
                                <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-slate-400 font-bold">Loading reports...</td>
                                </tr>
                            ) : reports.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No bug reports found</td>
                                </tr>
                            ) : (
                                reports.map((report) => (
                                    <tr key={report.id} className="hover:bg-slate-50/50 transition-colors align-top">
                                        <td className="p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                                                    <Bug size={18} />
                                                </div>
                                                <div className="font-bold text-slate-800 text-sm pt-2">{report.title}</div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="space-y-2 pt-2">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600">
                                                    <Smartphone size={12} />
                                                    {report.device || 'N/A'}
                                                </span>
                                                <br/>
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600">
                                                    <Globe size={12} />
                                                    {report.browser || 'N/A'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="max-w-md pt-2">
                                                <p className="text-sm text-slate-800 font-medium mb-2">{report.description}</p>
                                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-500 font-mono whitespace-pre-wrap">
                                                    <div className="font-bold uppercase tracking-widest text-[10px] text-slate-400 mb-1 font-sans">Steps to reproduce:</div>
                                                    {report.steps}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-end gap-1.5 pt-2">
                                                <Calendar size={12} />
                                                {new Date(report.created_at).toLocaleDateString()}
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

export default AdminBugReports;
