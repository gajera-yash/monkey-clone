import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import socket from '../../utils/socket';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#3b82f6'];

const CreatorDashboard = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [isOnline, setIsOnline] = useState(false);

    // Earnings Data State
    const [earningsData, setEarningsData] = useState({ today: 0, weekly: 0, monthly: 0, lifetime: 0 });
    const [chartData, setChartData] = useState([]);
    const [sourceData, setSourceData] = useState([]);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [incomingCallData, setIncomingCallData] = useState(null);

    // Handle Direct Calls via Socket
    useEffect(() => {
        if (!socket.connected) socket.connect();

        if (isOnline) {
            socket.emit('creator-online', {
                uid: currentUser?.uid,
                name: currentUser?.displayName,
                photoURL: currentUser?.photoURL,
                gender: currentUser?.gender || 'Female'
            });
            console.log("Emitted creator-online");
        } else {
            socket.emit('creator-offline', currentUser?.uid);
        }

        const handleIncomingCall = (data) => {
            console.log("Incoming direct call:", data);
            setIncomingCallData(data);
        };

        socket.on('incoming-call', handleIncomingCall);

        return () => {
            socket.off('incoming-call', handleIncomingCall);
            // Also turn them offline when unmounting the dashboard to prevent ghost calls
            socket.emit('creator-offline', currentUser?.uid);
        };
    }, [isOnline, currentUser]);

    const handleAcceptCall = () => {
        if (incomingCallData) {
            socket.emit('accept-direct-call', {
                callerSocketId: incomingCallData.callerSocketId,
                callerData: incomingCallData.callerData,
                creatorData: {
                    uid: currentUser?.uid,
                    name: currentUser?.displayName,
                    photoURL: currentUser?.photoURL,
                    gender: currentUser?.gender || 'Female'
                }
            });
            // The matches are emitted instantly by the server, 
            // when we navigate to chat we should join the active matched session automatically!
            setIncomingCallData(null);
            navigate('/chat');
        }
    };

    const handleDeclineCall = () => {
        if (incomingCallData) {
            socket.emit('decline-direct-call', { callerSocketId: incomingCallData.callerSocketId });
            setIncomingCallData(null);
        }
    };

    useEffect(() => {
        if (!currentUser?.id) return;

        const fetchEarnings = async () => {
            setIsLoadingStats(true);
            try {
                // Fetch all earned transactions
                const { data: txs, error } = await supabase
                    .from('coin_transactions')
                    .select('coins_amount, description, created_at')
                    .eq('user_id', currentUser.id)
                    .eq('transaction_type', 'earned');

                if (error) throw error;

                const now = new Date();
                const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const weekAgo = new Date(todayMidnight);
                weekAgo.setDate(todayMidnight.getDate() - 7);
                const monthAgo = new Date(todayMidnight);
                monthAgo.setMonth(todayMidnight.getMonth() - 1);

                let todayEarned = 0;
                let weeklyEarned = 0;
                let monthlyEarned = 0;
                let lifetimeEarned = 0;

                const dailyMap = {};
                // Initialize last 7 days keys
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(todayMidnight);
                    d.setDate(d.getDate() - i);
                    const dateStr = d.toLocaleDateString('en-US', { weekday: 'short' });
                    dailyMap[dateStr] = 0;
                }

                const sources = {};

                (txs || []).forEach(tx => {
                    const txDate = new Date(tx.created_at);
                    const amount = tx.coins_amount || 0;
                    
                    lifetimeEarned += amount;

                    if (txDate >= todayMidnight) todayEarned += amount;
                    if (txDate >= weekAgo) {
                        weeklyEarned += amount;
                        // For chart
                        const dayStr = txDate.toLocaleDateString('en-US', { weekday: 'short' });
                        if (dailyMap[dayStr] !== undefined) {
                            dailyMap[dayStr] += amount;
                        }
                    }
                    if (txDate >= monthAgo) monthlyEarned += amount;

                    // Source pie chart
                    let source = 'Other';
                    const desc = tx.description?.toLowerCase() || '';
                    if (desc.includes('video chat') || desc.includes('direct call')) source = 'Video Chat';
                    else if (desc.includes('gift')) source = 'Gifts';
                    else if (desc.includes('subscription')) source = 'Subscriptions';
                    else if (desc.includes('tip')) source = 'Tips';

                    sources[source] = (sources[source] || 0) + amount;
                });

                setEarningsData({
                    today: todayEarned,
                    weekly: weeklyEarned,
                    monthly: monthlyEarned,
                    lifetime: lifetimeEarned
                });

                setChartData(Object.keys(dailyMap).map(k => ({ name: k, earnings: dailyMap[k] })));
                
                const pieData = Object.keys(sources).map(k => ({ name: k, value: sources[k] }));
                if (pieData.length === 0) pieData.push({ name: 'No Earnings Yet', value: 1 }); // fallback
                setSourceData(pieData);

            } catch (err) {
                console.error("Failed to fetch earnings:", err);
            } finally {
                setIsLoadingStats(false);
            }
        };

        fetchEarnings();
    }, [currentUser]);

    // If still pending admin approval
    if (currentUser?.accountStatus === 'pending') {
        return (
            <div className="min-h-screen bg-dark-900 text-white flex flex-col items-center justify-center p-6 text-center">
                <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6">
                    <span className="text-5xl">⏳</span>
                </div>
                <h1 className="text-3xl font-black mb-4">Verification Pending</h1>
                <p className="text-gray-400 max-w-md">
                    Your face and voice verification have been submitted successfully. Our team is reviewing your application. You will be notified once you are approved!
                </p>
                <button
                    onClick={() => navigate('/')}
                    className="mt-8 px-6 py-3 bg-dark-800 rounded-xl hover:bg-white/5 transition-colors border border-white/10"
                >
                    Return Home
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-900 text-white p-4 md:p-8 relative">
            
            {/* INCOMING CALL MODAL */}
            {incomingCallData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
                    <div className="bg-dark-800 border border-white/10 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl animate-pulse">
                        <img 
                            src={incomingCallData.callerData?.photoURL || `https://ui-avatars.com/api/?name=${incomingCallData.callerData?.name || 'User'}`} 
                            alt="Caller" 
                            className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-accent-pink shadow-[0_0_20px_#ec4899]"
                        />
                        <h2 className="text-2xl font-bold mb-1">{incomingCallData.callerData?.name || 'Stranger'}</h2>
                        <p className="text-gray-400 mb-8 animate-pulse">is calling you for private chat...</p>
                        
                        <div className="flex justify-center gap-6">
                            <button 
                                onClick={handleDeclineCall}
                                className="w-16 h-16 rounded-full bg-red-500 flex flex-col items-center justify-center hover:bg-red-600 transition-transform hover:scale-110 shadow-lg shadow-red-500/20"
                            >
                                <span className="text-2xl">❌</span>
                            </button>
                            <button 
                                onClick={handleAcceptCall}
                                className="w-16 h-16 rounded-full bg-green-500 flex flex-col items-center justify-center hover:bg-green-600 transition-transform hover:scale-110 shadow-lg shadow-green-500/20 animate-bounce"
                            >
                                <span className="text-2xl">📞</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto space-y-6">

                {/* 1. PROFILE HEADER CARD */}
                <div className="bg-dark-800 border border-white/5 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent-purple/5 blur-3xl -mr-20 -mt-20 rounded-full pointer-events-none"></div>

                    <div className="flex flex-col md:flex-row items-center gap-6 z-10 w-full md:w-auto">
                        <img
                            src={currentUser?.photoURL || `https://ui-avatars.com/api/?name=${currentUser?.displayName}&background=random`}
                            alt="Profile"
                            className="w-24 h-24 rounded-full border-4 border-dark-900 shadow-[0_0_0_2px_#ec4899] object-cover"
                        />
                        <div className="text-center md:text-left">
                            <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                                <h1 className="text-2xl font-black">{currentUser?.displayName}</h1>
                                <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    Tier {currentUser?.currentTier || 1}
                                </span>
                            </div>
                            <p className="text-gray-400 text-sm font-mono mb-3">ID: {currentUser?.uid?.slice(0, 8).toUpperCase()}</p>

                            <div className="flex items-center gap-4 justify-center md:justify-start">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>
                                    <span className="text-sm font-medium text-green-400">Verified Creator</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 z-10 w-full md:w-auto">
                        {/* Status Toggle */}
                        <div className="flex items-center justify-between w-full sm:w-auto bg-dark-900 px-4 py-3 rounded-2xl border border-white/5 gap-4">
                            <span className="text-sm font-medium text-gray-300">Accepting Calls</span>
                            <button
                                onClick={() => setIsOnline(!isOnline)}
                                className={`w-14 h-7 rounded-full transition-colors relative ${isOnline ? 'bg-green-500' : 'bg-gray-600'}`}
                            >
                                <div className={`absolute top-1 transform transition-transform duration-300 w-5 h-5 bg-white rounded-full ${isOnline ? 'left-8' : 'left-1'}`}></div>
                            </button>
                        </div>

                        <button
                            onClick={() => navigate('/chat')}
                            disabled={!isOnline}
                            className={`w-full sm:w-auto px-8 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${isOnline
                                    ? 'bg-gradient-to-r from-accent-pink to-accent-purple text-white shadow-accent-purple/20 hover:scale-105 hover:shadow-accent-purple/40'
                                    : 'bg-dark-900 text-gray-500 border border-white/5 cursor-not-allowed'
                                }`}
                        >
                            <span>📹</span>
                            Go Live
                        </button>
                    </div>
                </div>

                {/* 2. EARNINGS OVERVIEW */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-dark-800 p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl group-hover:scale-110 transition-transform">💰</div>
                        <p className="text-gray-400 text-sm font-medium mb-1 relative z-10">Today's Earnings</p>
                        <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 relative z-10">
                            {isLoadingStats ? '...' : `🪙 ${earningsData.today.toLocaleString()}`}
                        </h2>
                    </div>

                    <div className="bg-dark-800 p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl group-hover:scale-110 transition-transform">📅</div>
                        <p className="text-gray-400 text-sm font-medium mb-1 relative z-10">Weekly Earnings</p>
                        <h2 className="text-3xl font-bold text-white relative z-10">
                            {isLoadingStats ? '...' : `🪙 ${earningsData.weekly.toLocaleString()}`}
                        </h2>
                    </div>

                    <div className="bg-dark-800 p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl group-hover:scale-110 transition-transform">📈</div>
                        <p className="text-gray-400 text-sm font-medium mb-1 relative z-10">Monthly Earnings</p>
                        <h2 className="text-3xl font-bold text-white relative z-10">
                            {isLoadingStats ? '...' : `🪙 ${earningsData.monthly.toLocaleString()}`}
                        </h2>
                    </div>

                    <div className="bg-dark-800 p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl group-hover:scale-110 transition-transform">🏆</div>
                        <p className="text-gray-400 text-sm font-medium mb-1 relative z-10">Lifetime Earnings</p>
                        <h2 className="text-3xl font-bold text-yellow-400 relative z-10">
                            {isLoadingStats ? '...' : `🪙 ${earningsData.lifetime.toLocaleString()}`}
                        </h2>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 3. LINE CHART (7 Days) */}
                    <div className="lg:col-span-2 bg-dark-800 border border-white/5 rounded-3xl p-6">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-bold">Earnings Last 7 Days</h3>
                        </div>
                        <div className="h-72 w-full text-xs">
                            {isLoadingStats ? (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">Loading chart data...</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                        <XAxis dataKey="name" stroke="#ffffff50" tick={{ fill: '#ffffff50' }} tickLine={false} axisLine={false} />
                                        <YAxis
                                            stroke="#ffffff50"
                                            tick={{ fill: '#ffffff50' }}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => `🪙${value}`}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px' }}
                                            itemStyle={{ color: '#fff' }}
                                            formatter={(value) => [`🪙${value}`, 'Earnings']}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="earnings"
                                            stroke="#8b5cf6"
                                            strokeWidth={4}
                                            dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                                            activeDot={{ r: 6, fill: '#ec4899' }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* 4. PIE CHART (Sources) */}
                    <div className="bg-dark-800 border border-white/5 rounded-3xl p-6 flex flex-col">
                        <h3 className="text-lg font-bold mb-6">Earnings by Source</h3>
                        <div className="h-56 w-full flex-grow">
                            {isLoadingStats ? (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">Loading sources...</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={sourceData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {sourceData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                                            formatter={(value) => `🪙${value}`}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={36}
                                            iconType="circle"
                                            formatter={(value, entry, index) => <span className="text-gray-400 text-xs ml-1">{value}</span>}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>

                {/* 5. QUICK ACTIONS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button onClick={() => navigate('/creator/withdraw')} className="bg-dark-800 hover:bg-white/5 transition-colors p-6 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-3 text-center group">
                        <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">🏦</div>
                        <span className="font-semibold text-sm">Withdraw Funds</span>
                    </button>
                    <button className="bg-dark-800 hover:bg-white/5 transition-colors p-6 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-3 text-center group">
                        <div className="w-12 h-12 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">🎁</div>
                        <span className="font-semibold text-sm">My Gifts</span>
                    </button>
                    <button className="bg-dark-800 hover:bg-white/5 transition-colors p-6 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-3 text-center group">
                        <div className="w-12 h-12 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">⭐</div>
                        <span className="font-semibold text-sm">Subscribers</span>
                    </button>
                    <button className="bg-dark-800 hover:bg-white/5 transition-colors p-6 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-3 text-center group">
                        <div className="w-12 h-12 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">⚙️</div>
                        <span className="font-semibold text-sm">Creator Settings</span>
                    </button>
                </div>

            </div>
        </div>
    );
};

export default CreatorDashboard;
