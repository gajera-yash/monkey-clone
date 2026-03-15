import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabase';
import { Coins, Save, RefreshCw, Gift, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const STREAK_REWARDS_DEFAULT = [100, 500, 1000, 5000, 10000, 50000, 100000];

const CoinRewards = () => {
    const [dailyCoins, setDailyCoins] = useState(10);
    const [streakRewards, setStreakRewards] = useState(STREAK_REWARDS_DEFAULT);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('system_settings')
            .select('*')
            .in('key', ['daily_coins', 'streak_rewards']);

        if (!error && data) {
            data.forEach(row => {
                if (row.key === 'daily_coins') {
                    setDailyCoins(parseInt(row.value) || 10);
                }
                if (row.key === 'streak_rewards') {
                    try {
                        const parsed = JSON.parse(row.value);
                        if (Array.isArray(parsed)) setStreakRewards(parsed);
                    } catch (_) {}
                }
            });
        }
        setLoading(false);
    };

    const saveSetting = async (key, value) => {
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        const { error } = await supabase.from('system_settings').upsert(
            { key, value: stringValue, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
        );
        if (error) throw error;
    };

    const handleSaveDailyCoins = async () => {
        setSaving(true);
        try {
            await saveSetting('daily_coins', dailyCoins);
            toast.success('Daily coin reward saved!');
        } catch (err) {
            toast.error('Failed to save: ' + err.message);
        }
        setSaving(false);
    };

    const handleSaveStreakRewards = async () => {
        setSaving(true);
        try {
            await saveSetting('streak_rewards', streakRewards);
            toast.success('Streak rewards saved!');
        } catch (err) {
            toast.error('Failed to save: ' + err.message);
        }
        setSaving(false);
    };

    const updateStreak = (index, val) => {
        const updated = [...streakRewards];
        updated[index] = parseInt(val) || 0;
        setStreakRewards(updated);
    };

    return (
        <div className="p-10 max-w-[1000px] mx-auto space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800 flex items-center gap-3">
                        <Coins size={32} className="text-yellow-500" />
                        Coin Rewards
                    </h1>
                    <p className="text-slate-500 font-medium tracking-tight mt-1">Configure daily bonus and streak rewards for users</p>
                </div>
                <button onClick={fetchSettings} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all">
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {loading ? (
                <div className="text-center py-16">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
            ) : (
                <>
                    {/* Daily Login Coins */}
                    <div className="bg-white border border-slate-200 rounded-[40px] p-10 shadow-sm">
                        <div className="flex items-start gap-6 mb-8">
                            <div className="p-4 rounded-2xl bg-yellow-50 text-yellow-500 border border-yellow-100 shadow-sm">
                                <Gift size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Daily Login Reward</h3>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                                    Base coins awarded when a user logs in each day
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200 w-fit mb-6">
                            <button
                                onClick={() => setDailyCoins(v => Math.max(1, v - 1))}
                                className="w-12 h-12 bg-white rounded-xl shadow-sm font-black text-slate-400 text-xl hover:bg-slate-100 transition-colors"
                            >-</button>
                            <input
                                type="number"
                                value={dailyCoins}
                                onChange={e => setDailyCoins(Math.max(0, parseInt(e.target.value) || 0))}
                                className="text-2xl font-black text-slate-800 w-20 text-center bg-transparent outline-none"
                            />
                            <button
                                onClick={() => setDailyCoins(v => v + 1)}
                                className="w-12 h-12 bg-white rounded-xl shadow-sm font-black text-indigo-500 text-xl hover:bg-indigo-50 transition-colors"
                            >+</button>
                            <span className="text-sm font-black text-slate-400 uppercase tracking-widest ml-2">Coins / Day</span>
                        </div>

                        <button
                            onClick={handleSaveDailyCoins}
                            disabled={saving}
                            className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
                        >
                            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                            Save Daily Reward
                        </button>
                    </div>

                    {/* 7-Day Streak Rewards */}
                    <div className="bg-white border border-slate-200 rounded-[40px] p-10 shadow-sm">
                        <div className="flex items-start gap-6 mb-8">
                            <div className="p-4 rounded-2xl bg-orange-50 text-orange-500 border border-orange-100 shadow-sm">
                                <Coins size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">7-Day Streak Rewards</h3>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                                    Coins rewarded for consecutive daily logins
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-7 gap-3 mb-6">
                            {streakRewards.map((coins, i) => (
                                <div key={i} className="flex flex-col items-center gap-2">
                                    <div className={`w-full text-center py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${i === 6 ? 'bg-yellow-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        Day {i + 1}
                                    </div>
                                    <input
                                        type="number"
                                        value={coins}
                                        onChange={e => updateStreak(i, e.target.value)}
                                        className={`w-full text-center border-2 rounded-xl px-2 py-3 text-sm font-black outline-none focus:ring-2 focus:ring-indigo-300 ${i === 6 ? 'border-yellow-300 bg-yellow-50 text-yellow-700' : 'border-slate-200 bg-white'}`}
                                    />
                                    <span className="text-[9px] text-slate-400 font-bold uppercase">Coins</span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleSaveStreakRewards}
                            disabled={saving}
                            className="flex items-center gap-2 px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-50"
                        >
                            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                            Save Streak Rewards
                        </button>
                    </div>

                    {/* Info */}
                    <div className="p-8 bg-indigo-600 rounded-[40px] text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10 scale-150 rotate-12">
                            <Coins size={200} />
                        </div>
                        <div className="relative z-10">
                            <h2 className="text-xl font-black tracking-tight mb-2">How Rewards Apply</h2>
                            <ul className="text-indigo-100 font-medium space-y-1 text-sm list-disc list-inside">
                                <li>Daily coin reward = base coins given on each login day</li>
                                <li>Streak rewards override the base amount on consecutive login days</li>
                                <li>Day 7 = biggest reward (jackpot day)</li>
                                <li>Changes apply instantly on the next user login</li>
                            </ul>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default CoinRewards;
