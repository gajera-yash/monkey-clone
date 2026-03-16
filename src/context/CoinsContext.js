import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const CoinsContext = createContext();

export const useCoins = () => useContext(CoinsContext);

export const CoinsProvider = ({ children }) => {
    const { currentUser, refreshProfile } = useAuth();
    const [coins, setCoins] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [onOpenCoinStore, setOnOpenCoinStore] = useState(null);
    const [onOpenSubscription, setOnOpenSubscription] = useState(null);
    const [onOpenDailyBonus, setOnOpenDailyBonus] = useState(null);
    const [streakRewards, setStreakRewards] = useState([100, 500, 1000, 5000, 10000, 50000, 100000]); // default fallback
    const [dailyCoinsBase, setDailyCoinsBase] = useState(10);

    // Sync coins with currentUser from AuthContext
    useEffect(() => {
        if (currentUser?.coins !== undefined) {
            setCoins(currentUser.coins);
            setLoading(false);
        } else if (!currentUser) {
            setCoins(0);
            setTransactions([]);
            setLoading(false);
        }
    }, [currentUser]);

    // Fetch initial data (transactions & settings)
    const fetchInitialData = async () => {
        if (!currentUser?.id) return;

        try {
            // 1. Fetch Transactions
            const { data: txData, error: txError } = await supabase
                .from('coin_transactions')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (!txError && txData) {
                setTransactions(txData);
            }

            // 2. Fetch System Settings (Streak Rewards)
            const { data: settingsData, error: settingsError } = await supabase
                .from('system_settings')
                .select('*')
                .in('key', ['daily_coins', 'streak_rewards']);
            
            if (!settingsError && settingsData) {
                settingsData.forEach(row => {
                    if (row.key === 'daily_coins') {
                        setDailyCoinsBase(parseInt(row.value) || 10);
                    }
                    if (row.key === 'streak_rewards') {
                        try {
                            const parsed = JSON.parse(row.value);
                            if (Array.isArray(parsed)) setStreakRewards(parsed);
                        } catch (_) {}
                    }
                });
            }

        } catch (error) {
            console.error("Error fetching initial data:", error);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, [currentUser]);

    // Add coins (earn/purchase)
    const addCoins = async (amount, reason, type = 'earn') => {
        if (!currentUser?.id) return;

        try {
            // 1. Update balance in profiles table manually instead of RPC
            const currentCoins = currentUser?.coins || 0;
            const newBalance = currentCoins + amount;

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ coins: newBalance })
                .eq('id', currentUser.id);

            if (updateError) throw updateError;

            // 2. Add transaction record
            const { error: txError } = await supabase
                .from('coin_transactions')
                .insert({
                    user_id: currentUser.id,
                    transaction_type: type === 'purchase' ? 'purchase' : 'earned',
                    coins_amount: amount,
                    coins_balance_after: newBalance,
                    description: reason,
                    payment_status: 'completed'
                });
            if (txError) {
                console.error("Error creating transaction record:", txError.message);
                throw txError;
            }

            await refreshProfile();
            toast.success(`+${amount} Coins! ${reason}`);
            return true;
        } catch (error) {
            console.error("Error adding coins:", error.message || error);
            toast.error(`Failed to add coins: ${error.message || "Unknown error"}`);
            return false;
        }
    };

    // Spend coins
    const spendCoins = async (amount, reason) => {
        if (!currentUser?.id) {
            toast.error("Please login to use coins");
            return false;
        }

        if (coins < amount) {
            toast.error(`Insufficient coins! Need ${amount - coins} more.`);
            return false;
        }

        try {
            // 1. Deduct balance in profiles table manually instead of RPC
            const currentCoins = currentUser?.coins || 0;
            const newBalance = currentCoins - amount;

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ coins: newBalance })
                .eq('id', currentUser.id);

            if (updateError) throw updateError;

            // 2. Add transaction record
            const { error: txError } = await supabase
                .from('coin_transactions')
                .insert({
                    user_id: currentUser.id,
                    transaction_type: 'spent',
                    coins_amount: -amount,
                    coins_balance_after: newBalance,
                    description: reason,
                    payment_status: 'completed'
                });
            if (txError) throw txError;

            await refreshProfile();
            return true;
        } catch (error) {
            console.error("Error spending coins:", error);
            toast.error("Transaction failed");
            return false;
        }
    };

    // Purchase function (triggers modal via callback registered from App.js)
    const purchaseCoins = async (packageId) => {
        if (onOpenCoinStore) {
            onOpenCoinStore();
        } else {
            // Fallback: old hardcoded packages
            const packages = {
                'pkg_100': { coins: 50, price: 99 },
                'pkg_500': { coins: 500, price: 449 },
                'pkg_1000': { coins: 1000, price: 799 },
                'pkg_5000': { coins: 5000, price: 3499 }
            };
            const selectedPkg = packages[packageId];
            if (!selectedPkg) return false;
            return new Promise((resolve) => {
                setTimeout(async () => {
                    const success = await addCoins(selectedPkg.coins, `Purchased ${selectedPkg.coins} Coins`, 'purchase');
                    resolve(success);
                }, 1000);
            });
        }
    };

    // Open CoinStore modal
    const openCoinStore = () => {
        if (onOpenCoinStore) onOpenCoinStore();
    };

    // Open SubscriptionPlans modal
    const openSubscription = () => {
        if (onOpenSubscription) onOpenSubscription();
    };

    // Open Daily Bonus modal
    const openDailyBonus = () => {
        if (onOpenDailyBonus) onOpenDailyBonus();
    };

    // Register modal callbacks from App.js
    const registerModalCallbacks = (coinStoreFn, subscriptionFn, dailyBonusFn) => {
        setOnOpenCoinStore(() => coinStoreFn);
        setOnOpenSubscription(() => subscriptionFn);
        setOnOpenDailyBonus(() => dailyBonusFn);
    };

    // Refresh coin balance from Supabase
    const refreshCoins = async () => {
        await refreshProfile();
    };

    // Get streak info from localStorage
    const getDailyStreakInfo = (userId) => {
        const today = new Date().toDateString();
        const lastClaimDate = localStorage.getItem(`dailyBonus_lastDate_${userId}`);
        const lastClaimDay = parseInt(localStorage.getItem(`dailyBonus_lastDay_${userId}`) || '0', 10);

        // Calculate streak continuation
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const isConsecutive = lastClaimDate === yesterday.toDateString();

        let currentDay = 1;
        if (lastClaimDate && lastClaimDate !== today) {
            currentDay = isConsecutive ? Math.min(lastClaimDay + 1, 7) : 1;
        } else if (lastClaimDate === today) {
            // Already claimed today — show next day as current
            currentDay = lastClaimDay;
        }

        // Build list of claimed days (all days before currentDay in this streak cycle)
        const claimedDays = [];
        if (lastClaimDate === today) {
            // Claimed today — mark currentDay as claimed too
            for (let d = 1; d <= lastClaimDay; d++) claimedDays.push(d);
        } else {
            for (let d = 1; d < currentDay; d++) claimedDays.push(d);
        }

        return { currentDay, claimedDays };
    };

    // Check if bonus is available today
    const checkDailyBonus = async () => {
        if (!currentUser?.id) return false;
        const today = new Date().toDateString();
        const lastClaimDate = localStorage.getItem(`dailyBonus_lastDate_${currentUser.id}`);
        return lastClaimDate !== today;
    };

    const claimDailyBonus = async () => {
        if (!currentUser?.id) return false;

        const today = new Date().toDateString();
        const lastClaimDate = localStorage.getItem(`dailyBonus_lastDate_${currentUser.id}`);

        // Prevent double claim
        if (lastClaimDate === today) return false;

        const { currentDay } = getDailyStreakInfo(currentUser.id);
        const reward = streakRewards[currentDay - 1] || dailyCoinsBase;

        const success = await addCoins(reward, `Day ${currentDay} Daily Bonus`);
        if (success) {
            localStorage.setItem(`dailyBonus_lastDate_${currentUser.id}`, today);
            localStorage.setItem(`dailyBonus_lastDay_${currentUser.id}`, currentDay.toString());
        }
        return success;
    };

    const value = {
        coins,
        transactions,
        loading,
        addCoins,
        spendCoins,
        purchaseCoins,
        openCoinStore,
        openSubscription,
        openDailyBonus,
        registerModalCallbacks,
        refreshCoins,
        checkDailyBonus,
        claimDailyBonus,
        getDailyStreakInfo,
        streakRewards // Export this so the modal can use it
    };

    return (
        <CoinsContext.Provider value={value}>
            {children}
        </CoinsContext.Provider>
    );
};
