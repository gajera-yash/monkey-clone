import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabase';
import { Activity, Cpu, Server, Users, RefreshCw } from 'lucide-react';

const SystemHealth = () => {
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchHealth = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No active session");

            // For development fallback to 3001 if backend runs locally
            const serverUrl = process.env.REACT_APP_SERVER_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : '');
            
            const response = await fetch(`${serverUrl}/api/admin/system-health`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to fetch system health");
            }
            const data = await response.json();
            setHealth(data);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 15000); // refresh every 15s
        return () => clearInterval(interval);
    }, []);

    const formatMemory = (bytes) => {
        if (!bytes) return '0 MB';
        return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    };

    const formatUptime = (seconds) => {
        if (!seconds) return '0s';
        const d = Math.floor(seconds / (3600*24));
        const h = Math.floor(seconds % (3600*24) / 3600);
        const m = Math.floor(seconds % 3600 / 60);
        return `${d}d ${h}h ${m}m`;
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">System Health</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Live monitoring of server performance and sockets.</p>
                </div>
                <button 
                    onClick={fetchHealth} 
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 shadow-sm transition-all"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    <span className="text-sm font-bold">Refresh</span>
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm font-bold">
                    {error}
                </div>
            )}

            {health && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Activity size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Uptime</p>
                            <p className="text-xl font-black text-slate-800 mt-1">{formatUptime(health.uptime)}</p>
                        </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                            <Server size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Free Memory</p>
                            <p className="text-xl font-black text-slate-800 mt-1">{formatMemory(health.osFreeMem)}</p>
                            <p className="text-xs text-slate-400 mt-1">Total: {formatMemory(health.osTotalMem)}</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                            <Cpu size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Node Memory Usage</p>
                            <p className="text-xl font-black text-slate-800 mt-1">{formatMemory(health.memoryUsage?.heapUsed)}</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Sockets</p>
                            <p className="text-xl font-black text-slate-800 mt-1">{health.socketStats?.totalConnections || 0}</p>
                            <p className="text-xs text-slate-400 mt-1">{health.socketStats?.activeRooms || 0} Rooms Active</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SystemHealth;
