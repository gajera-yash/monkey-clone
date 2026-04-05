import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import socket from '../../utils/socket';
import toast from 'react-hot-toast';
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

    // Transactions Menu State
    const [showTransactions, setShowTransactions] = useState(false);
    const [activeTab, setActiveTab] = useState('earnings');
    const [isFetchingLists, setIsFetchingLists] = useState(false);
    const [earningsList, setEarningsList] = useState([]);
    const [withdrawalsList, setWithdrawalsList] = useState([]);
    
    // Referral Data State
    const [showReferrals, setShowReferrals] = useState(false);
    const [referralStats, setReferralStats] = useState({ totalUsers: 0, totalEarned: 0 });
    const [referralList, setReferralList] = useState([]);
    const [isFetchingReferrals, setIsFetchingReferrals] = useState(false);

    // Gifts Data State
    const [showGifts, setShowGifts] = useState(false);
    const [giftsList, setGiftsList] = useState([]);
    const [isFetchingGifts, setIsFetchingGifts] = useState(false);

    const fetchTransactionLists = async () => {
        if (!currentUser?.id) return;
        setIsFetchingLists(true);
        try {
            // Fetch Earnings
            const { data: eData } = await supabase
                .from('coin_transactions')
                .select('*')
                .eq('user_id', currentUser.id)
                .eq('transaction_type', 'earned')
                .order('created_at', { ascending: false });
            
            setEarningsList(eData || []);

            // Fetch Withdrawals
            const { data: wData } = await supabase
                .from('payouts')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });

            setWithdrawalsList(wData || []);
        } catch (err) {
            console.error("Error fetching transaction lists:", err);
        } finally {
            setIsFetchingLists(false);
        }
    };

    const fetchReferralData = async () => {
        if (!currentUser?.id) return;
        setIsFetchingReferrals(true);
        try {
            // 1. Fetch total users referred
            const { count, error: countError } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('referred_by', currentUser.id);
            
            // 2. Fetch total coins earned from referrals
            const { data: earningsData, error: earningsError } = await supabase
                .from('referral_earnings')
                .select('amount, referred_user_id, created_at, profiles:referred_user_id(username, avatar_url)')
                .eq('referrer_id', currentUser.id)
                .order('created_at', { ascending: false });
            
            const totalEarned = (earningsData || []).reduce((sum, item) => sum + (item.amount || 0), 0);
            
            setReferralStats({
                totalUsers: count || 0,
                totalEarned: totalEarned
            });
            setReferralList(earningsData || []);
        } catch (err) {
            console.error("Error fetching referral data:", err);
        } finally {
            setIsFetchingReferrals(false);
        }
    };

    const fetchGiftsData = async () => {
        if (!currentUser?.id) return;
        setIsFetchingGifts(true);
        try {
            const { data, error } = await supabase
                .from('coin_transactions')
                .select('*, sender:profiles!coin_transactions_sender_id_fkey(username, avatar_url)')
                .eq('user_id', currentUser.id)
                .eq('transaction_type', 'earned')
                .ilike('description', '%gift%')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setGiftsList(data || []);
        } catch (err) {
            console.error("Error fetching gifts data:", err);
            toast.error("Failed to load gifts.");
        } finally {
            setIsFetchingGifts(false);
        }
    };

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

                {/* 5. QUICK ACTIONS & TRANSACTIONS */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <button onClick={() => navigate('/creator/withdraw')} className="bg-dark-800 hover:bg-white/5 transition-colors p-6 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-3 text-center group">
                        <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">🏦</div>
                        <span className="font-semibold text-sm">Withdraw Funds</span>
                    </button>
                    <button 
                        onClick={() => {
                            setShowGifts(true);
                            fetchGiftsData();
                        }}
                        className="bg-dark-800 hover:bg-white/5 transition-colors p-6 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-3 text-center group"
                    >
                        <div className="w-12 h-12 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">🎁</div>
                        <span className="font-semibold text-sm">My Gifts</span>
                    </button>
                    <button 
                        onClick={() => {
                            setShowTransactions(true);
                            fetchTransactionLists();
                        }}
                        className="bg-dark-800 hover:bg-white/5 transition-colors p-6 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-3 text-center group"
                    >
                        <div className="w-12 h-12 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">📜</div>
                        <span className="font-semibold text-sm">Transactions</span>
                    </button>
                    <button 
                        onClick={() => {
                            setShowReferrals(true);
                            fetchReferralData();
                        }}
                        className="bg-dark-800 hover:bg-white/5 transition-colors p-6 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-3 text-center group"
                    >
                        <div className="w-12 h-12 rounded-full bg-accent-pink/20 text-accent-pink flex items-center justify-center text-xl group-hover:scale-110 transition-transform">🔗</div>
                        <span className="font-semibold text-sm">Referral Program</span>
                    </button>
                    <button onClick={() => navigate('/creator/settings')} className="bg-dark-800 hover:bg-white/5 transition-colors p-6 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-3 text-center group">
                        <div className="w-12 h-12 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">⚙️</div>
                        <span className="font-semibold text-sm">Creator Settings</span>
                    </button>
                </div>

                {/* 6. REFERRAL PROGRAM MODAL */}
                {showReferrals && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-fade-in">
                        <div className="bg-dark-800 border border-white/10 rounded-[32px] w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
                            {/* Modal Header */}
                            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-dark-800/50">
                                <h2 className="text-2xl font-black flex items-center gap-4">
                                    <span className="w-12 h-12 rounded-2xl bg-accent-pink/20 flex items-center justify-center text-2xl text-accent-pink shadow-lg shadow-pink-500/10">🔗</span>
                                    Refer & Earn 5%
                                </h2>
                                <button 
                                    onClick={() => setShowReferrals(false)}
                                    className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all hover:rotate-90"
                                >
                                    <span className="text-xl">✕</span>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin scrollbar-thumb-white/10">
                                {/* Referral Statistics */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-dark-900 border border-white/5 p-6 rounded-3xl text-center group">
                                        <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2">Total Reffered Users</p>
                                        <h3 className="text-4xl font-black text-white group-hover:scale-110 transition-transform">{referralStats.totalUsers}</h3>
                                    </div>
                                    <div className="bg-dark-900 border border-white/5 p-6 rounded-3xl text-center group">
                                        <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2">Total Coins Earned</p>
                                        <h3 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 group-hover:scale-110 transition-transform">🪙 {referralStats.totalEarned.toLocaleString()}</h3>
                                    </div>
                                </div>

                                {/* Referral Link Card */}
                                <div className="bg-gradient-to-br from-accent-purple/20 to-accent-pink/10 border border-white/10 p-8 rounded-[32px] relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl -mr-16 -mt-16 rounded-full group-hover:bg-white/10 transition-colors"></div>
                                    <h4 className="text-lg font-bold mb-3 flex items-center gap-2">
                                        Your Referral Link
                                    </h4>
                                    <p className="text-white/60 text-sm mb-6 max-w-sm">
                                        Invite other creators to Strangy. You'll receive a <span className="text-accent-pink font-bold">5% commission</span> from all their coin earnings forever!
                                    </p>
                                    <div className="flex flex-col sm:flex-row items-center gap-3">
                                        <div className="flex-1 w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 font-mono text-sm text-gray-300 truncate">
                                            {`${window.location.origin}/ref/${currentUser?.referral_code || currentUser?.uid?.substring(0, 8)}`}
                                        </div>
                                        <button 
                                            onClick={() => {
                                                const link = `${window.location.origin}/ref/${currentUser?.referral_code || currentUser?.uid?.substring(0, 8)}`;
                                                navigator.clipboard.writeText(link);
                                                toast.success("Referral link copied!");
                                            }}
                                            className="w-full sm:w-auto px-8 py-4 bg-white text-dark-900 rounded-2xl font-black hover:bg-gray-200 transition-all active:scale-95 shadow-xl shadow-white/5"
                                        >
                                            COPY
                                        </button>
                                    </div>
                                </div>

                                {/* Referral Activity List */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-black text-gray-500 uppercase tracking-[0.2em] px-2 flex items-center justify-between">
                                        Recent Earning Activity
                                        <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full font-bold">{referralList.length} LOGS</span>
                                    </h4>

                                    {isFetchingReferrals ? (
                                        <div className="py-20 flex flex-col items-center justify-center text-gray-500 gap-4">
                                            <div className="w-10 h-10 border-2 border-accent-pink border-t-white rounded-full animate-spin"></div>
                                            <p className="text-xs font-bold uppercase tracking-widest">Updating stats...</p>
                                        </div>
                                    ) : referralList.length === 0 ? (
                                        <div className="bg-dark-900 border border-white/5 rounded-[32px] p-20 text-center flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-3xl">📭</div>
                                            <div className="space-y-1">
                                                <p className="text-gray-400 font-bold">No activity yet</p>
                                                <p className="text-gray-600 text-xs">Share your link to start earning commissions!</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {referralList.map((ref, idx) => (
                                                <div key={idx} className="bg-dark-900 border border-white/5 p-5 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-all hover:bg-dark-800">
                                                    <div className="flex items-center gap-4">
                                                        <img 
                                                            src={ref.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${ref.profiles?.username}&background=random`} 
                                                            alt="" 
                                                            className="w-10 h-10 rounded-full object-cover shadow-lg border border-white/5"
                                                        />
                                                        <div>
                                                            <p className="font-bold text-sm">{ref.profiles?.username || 'Unknown User'}</p>
                                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Registration Event</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-black text-green-400">🪙 {ref.amount}</p>
                                                        <p className="text-[10px] text-gray-500 font-medium">{new Date(ref.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 6. TRANSACTIONS MODAL/SECTION */}
                {showTransactions && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
                        <div className="bg-dark-800 border border-white/10 rounded-[32px] w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
                            {/* Modal Header */}
                            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                                <h2 className="text-xl font-bold flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-lg text-orange-500">📜</span>
                                    My Transactions
                                </h2>
                                <button 
                                    onClick={() => setShowTransactions(false)}
                                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                                >
                                    <span className="text-xl">✕</span>
                                </button>
                            </div>

                            {/* Tab Switcher */}
                            <div className="flex p-2 gap-2 bg-dark-900 mx-6 mt-6 rounded-2xl border border-white/5">
                                <button 
                                    onClick={() => setActiveTab('earnings')}
                                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${activeTab === 'earnings' ? 'bg-accent-purple text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    💰 Earnings
                                </button>
                                <button 
                                    onClick={() => setActiveTab('withdrawals')}
                                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${activeTab === 'withdrawals' ? 'bg-accent-purple text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    🏦 Withdrawals
                                </button>
                            </div>

                            {/* List Content */}
                            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10">
                                {isFetchingLists ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                                        <div className="w-12 h-12 border-4 border-accent-purple border-t-white rounded-full animate-spin"></div>
                                        <p>Fetching your records...</p>
                                    </div>
                                ) : activeTab === 'earnings' ? (
                                    <div className="space-y-3">
                                        {earningsList.length === 0 ? (
                                            <div className="text-center py-20 text-gray-500">No earnings found yet</div>
                                        ) : (
                                            earningsList.map((tx, idx) => (
                                                <div key={idx} className="bg-dark-900 border border-white/5 p-4 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-colors">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">🪙</div>
                                                        <div>
                                                            <p className="font-bold text-sm">{tx.description || 'Earnings from Session'}</p>
                                                            <p className="text-[10px] text-gray-500">{new Date(tx.created_at).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-black text-green-400">+{tx.coins_amount?.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {withdrawalsList.length === 0 ? (
                                            <div className="text-center py-20 text-gray-500">No withdrawal requests found</div>
                                        ) : (
                                            withdrawalsList.map((tx, idx) => (
                                                <div key={idx} className="bg-dark-900 border border-white/5 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-white/10 transition-colors">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-xl">🏦</div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-bold text-sm">Withdrawal ₹{tx.amount?.toFixed(2)}</p>
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                                                    tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                                                                    tx.status === 'completed' || tx.status === 'approved' ? 'bg-green-500/20 text-green-500 border border-green-500/30' :
                                                                    'bg-red-500/20 text-red-500 border border-red-500/30'
                                                                }`}>
                                                                    {tx.status}
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] text-gray-500">{new Date(tx.created_at).toLocaleString()} • 🪙 {tx.coins_redeemed?.toLocaleString()} coins</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-left sm:text-right">
                                                        <p className="text-[10px] text-gray-500 mb-0.5 uppercase font-bold tracking-widest">Detail</p>
                                                        <p className="text-xs font-mono text-gray-300">
                                                            {tx.method === 'upi' ? tx.details?.upiId : `${tx.details?.accountNumber?.slice(-4).padStart(8, 'X')}`}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 7. MY GIFTS MODAL */}
                {showGifts && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 animate-fade-in">
                        <div className="bg-dark-800 border border-white/10 rounded-[32px] w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
                            {/* Modal Header */}
                            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-dark-800/50">
                                <h2 className="text-2xl font-black flex items-center gap-4">
                                    <span className="w-12 h-12 rounded-2xl bg-pink-500/20 flex items-center justify-center text-2xl text-pink-400 shadow-lg shadow-pink-500/10">🎁</span>
                                    My Gifts
                                </h2>
                                <button 
                                    onClick={() => setShowGifts(false)}
                                    className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all hover:rotate-90"
                                >
                                    <span className="text-xl">✕</span>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-white/10">
                                {isFetchingGifts ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                                        <div className="w-12 h-12 border-4 border-pink-500 border-t-white rounded-full animate-spin"></div>
                                        <p className="text-xs font-bold uppercase tracking-widest">Unwrapping your gifts...</p>
                                    </div>
                                ) : giftsList.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center gap-6 py-20">
                                        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center text-5xl">💝</div>
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-bold text-white">No gifts yet!</h3>
                                            <p className="text-gray-500 max-w-xs mx-auto">Gifts from users during your video chats will appear here. Go live to start receiving!</p>
                                        </div>
                                        <button 
                                            onClick={() => { setShowGifts(false); setIsOnline(true); navigate('/chat'); }}
                                            className="px-8 py-3 bg-accent-pink rounded-xl font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform"
                                        >
                                            Go Live Now
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4">
                                        {giftsList.map((gift, idx) => (
                                            <div key={idx} className="bg-dark-900 border border-white/5 p-5 rounded-3xl flex items-center justify-between group hover:border-white/10 transition-all hover:bg-dark-800">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-pink-500/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                                        {gift.description?.includes('Rose') ? '🌹' : 
                                                         gift.description?.includes('Heart') ? '❤️' :
                                                         gift.description?.includes('Diamond') ? '💎' :
                                                         gift.description?.includes('Crown') ? '👑' : '🎁'}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-white mb-0.5">{gift.description?.replace('Received gift: ', '') || 'Special Gift'}</h4>
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
                                                            From {gift.sender?.username || 'Stranger'} • {new Date(gift.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl font-black text-pink-400">🪙 {gift.coins_amount?.toLocaleString()}</p>
                                                    <p className="text-[10px] text-green-500 font-bold uppercase">Added to Balance</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-8 bg-dark-900/50 border-t border-white/5 text-center">
                                <p className="text-gray-500 text-xs">Total Gifts Received: <span className="text-white font-bold">{giftsList.length}</span></p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreatorDashboard;
