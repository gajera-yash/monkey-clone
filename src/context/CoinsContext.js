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
    const [isSettingsLoading, setIsSettingsLoading] = useState(true);
    const [onOpenCoinStore, setOnOpenCoinStore] = useState(null);
    const [onOpenSubscription, setOnOpenSubscription] = useState(null);
    const [onOpenDailyBonus, setOnOpenDailyBonus] = useState(null);
    const [streakRewards, setStreakRewards] = useState([100, 500, 1000, 5000, 10000, 50000, 100000]); // default fallback
    const [dailyCoinsBase, setDailyCoinsBase] = useState(10);
    const [filterCosts, setFilterCosts] = useState({ gender: 5, location: 5, age: 5, standard: 0 }); // default fallback
    const [creatorMonetizationSettings, setCreatorMonetizationSettings] = useState({ 
        randomChatCoins: 15, 
        privateCallCost: 60, 
        privateCallPercentage: 50 
    });

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
        if (!currentUser?.id) {
            setIsSettingsLoading(false);
            return;
        }

        setIsSettingsLoading(true);

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

            // 2. Fetch System Settings (Streak Rewards + Filter Costs)
            const { data: settingsData, error: settingsError } = await supabase
                .from('system_settings')
                .select('*')
                .in('key', [
                    'daily_coins', 
                    'streak_rewards', 
                    'filter_cost_gender', 
                    'filter_cost_location', 
                    'filter_cost_age', 
                    'filter_cost_standard',
                    'creator_random_chat_coins',
                    'private_call_cost_per_minute',
                    'creator_private_call_percentage'
                ]);
            
            if (!settingsError && settingsData) {
                const newFilterCosts = { gender: 5, location: 5, age: 5, standard: 0 };
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
                    if (row.key === 'filter_cost_gender') newFilterCosts.gender = parseInt(row.value) || 5;
                    if (row.key === 'filter_cost_location') newFilterCosts.location = parseInt(row.value) || 5;
                    if (row.key === 'filter_cost_age') newFilterCosts.age = parseInt(row.value) || 5;
                    if (row.key === 'filter_cost_standard') newFilterCosts.standard = parseInt(row.value) || 0;
                    
                    if (row.key === 'creator_random_chat_coins') {
                        setCreatorMonetizationSettings(prev => ({ ...prev, randomChatCoins: parseInt(row.value) || 15 }));
                    }
                    if (row.key === 'private_call_cost_per_minute') {
                        setCreatorMonetizationSettings(prev => ({ ...prev, privateCallCost: parseInt(row.value) || 60 }));
                    }
                    if (row.key === 'creator_private_call_percentage') {
                        setCreatorMonetizationSettings(prev => ({ ...prev, privateCallPercentage: parseInt(row.value) || 50 }));
                    }
                });
                setFilterCosts(newFilterCosts);
            }

        } catch (error) {
            console.error("Error fetching initial data:", error);
        } finally {
            setIsSettingsLoading(false);
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

            const { data, error: updateError, count } = await supabase
                .from('profiles')
                .update({ coins: newBalance })
                .eq('id', currentUser.id)
                .select(); // select allows us to check if any row was affected

            if (updateError) throw updateError;

            // If profile doesn't exist, create it first
            if (!data || data.length === 0) {
                console.log("Profile not found in addCoins, attempting to create one...");
                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert({
                        id: currentUser.id,
                        username: currentUser.displayName || 'User',
                        avatar_url: currentUser.photoURL,
                        coins: 50 + amount
                    });
                if (insertError) throw insertError;
            }

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

            // Note: Referral commission (5%) is now handled automatically via
            // the `trigger_referral_commission` database trigger on coin_transactions.
            // No client-side logic needed here.

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

    // Get streak info from profile (Supabase)
    const getDailyStreakInfo = (userProfile) => {
        if (!userProfile || !userProfile.id) {
            return { currentDay: 1, claimedDays: [], canClaim: false, nextClaimTime: null };
        }

        const now = new Date();
        const lastClaimTimestamp = userProfile.last_reward_claim ? new Date(userProfile.last_reward_claim).getTime() : 0;
        const lastClaimDay = userProfile.reward_streak || 0;

        let canClaim = false;
        let isMissed = false;
        
        // Calculate start of today (midnight local time)
        const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        
        let nextClaimTime = todayMidnight + 24 * 60 * 60 * 1000; // Midnight tomorrow

        if (lastClaimTimestamp === 0) {
            canClaim = true;
        } else {
            const lastDate = new Date(lastClaimTimestamp);
            const lastClaimMidnight = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate()).getTime();
            
            // Days difference based on midnight-to-midnight (whole numbers only)
            const msDiff = todayMidnight - lastClaimMidnight;
            const daysDiff = Math.floor(msDiff / (24 * 60 * 60 * 1000));
            
            if (daysDiff === 0) {
                // Same day
                canClaim = false;
                nextClaimTime = lastClaimMidnight + 24 * 60 * 60 * 1000;
            } else if (daysDiff === 1) {
                // Next day!
                canClaim = true;
            } else {
                // Missed more than 1 day
                canClaim = true;
                isMissed = true;
            }
        }

        let currentDay = 1;
        if (lastClaimTimestamp === 0 || isMissed) {
            currentDay = 1;
        } else if (canClaim) {
            currentDay = Math.min(lastClaimDay + 1, 7);
        } else {
            currentDay = lastClaimDay;
        }

        // Build list of claimed days
        const claimedDays = [];
        if (!canClaim && lastClaimTimestamp !== 0) {
            // If already claimed today, mark days up to lastClaimDay as claimed
            for (let d = 1; d <= lastClaimDay; d++) claimedDays.push(d);
        } else {
            // Otherwise mark days before currentDay as claimed
            for (let d = 1; d < currentDay; d++) claimedDays.push(d);
        }

        return { currentDay, claimedDays, canClaim, nextClaimTime };
    };

    // Check if bonus is available today
    const checkDailyBonus = async () => {
        if (!currentUser?.id) return false;
        const { canClaim } = getDailyStreakInfo(currentUser);
        return canClaim;
    };

    const claimDailyBonus = async () => {
        if (!currentUser?.id) return false;

        const { canClaim } = getDailyStreakInfo(currentUser);
        if (!canClaim) {
            toast.error("Already claimed! Come back tomorrow.");
            return false;
        }

        const toastId = toast.loading("Claiming your reward...");
        
        try {
            // Call the secure RPC function instead of client-side logic
            const { data, error } = await supabase.rpc('claim_daily_bonus_secure');

            if (error) throw error;

            if (data?.success) {
                toast.success(`+${data.reward} Coins! (Day ${data.day})`, { id: toastId });
                await refreshProfile();
                return true;
            } else {
                toast.error(data?.message || "Failed to claim reward", { id: toastId });
                return false;
            }
        } catch (error) {
            console.error("Error claiming daily bonus via RPC:", error);
            toast.error("Security check failed or system error", { id: toastId });
            return false;
        }
    };

    const value = {
        coins,
        transactions,
        loading,
        isSettingsLoading,
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
        streakRewards, // Export this so the modal can use it
        filterCosts, // Admin-configurable per-match filter costs
        creatorMonetizationSettings, // Admin-configurable creator earnings
    };

    return (
        <CoinsContext.Provider value={value}>
            {children}
        </CoinsContext.Provider>
    );
};
