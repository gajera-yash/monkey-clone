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

    // Fetch transaction history
    const fetchTransactions = async () => {
        if (!currentUser?.id) return;

        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            setTransactions(data);
        } catch (error) {
            console.error("Error fetching transactions:", error);
        }
    };

    useEffect(() => {
        fetchTransactions();
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
                .from('transactions')
                .insert({
                    user_id: currentUser.id,
                    amount: amount,
                    coins_amount: amount,
                    type,
                    description: reason
                });
            if (txError) {
                console.error("Error creating transaction record:", txError.message);
                throw txError;
            }

            await refreshProfile();
            toast.success(`+${amount} Coins! ${reason}`);
            return true;
        } catch (error) {
            console.error("Error adding coins:", error);
            toast.error("Failed to add coins");
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
                .from('transactions')
                .insert({
                    user_id: currentUser.id,
                    amount: -amount,
                    type: 'spend',
                    description: reason
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

    // Purchase function
    const purchaseCoins = async (packageId) => {
        const packages = {
            'pkg_100': { coins: 50, price: 99 },
            'pkg_500': { coins: 500, price: 449 },
            'pkg_1000': { coins: 1000, price: 799 },
            'pkg_5000': { coins: 5000, price: 3499 }
        };

        const selectedPkg = packages[packageId];
        if (!selectedPkg) return false;

        // Simulate API call / Payment Gateway
        return new Promise((resolve) => {
            setTimeout(async () => {
                const success = await addCoins(selectedPkg.coins, `Purchased ${selectedPkg.coins} Coins`, 'purchase');
                resolve(success);
            }, 1000);
        });
    };

    // Check for daily bonus
    const checkDailyBonus = async () => {
        if (!currentUser?.id) return;
        const today = new Date().toDateString();
        const lastBonusDate = localStorage.getItem(`dailyBonus_${currentUser.id}`);
        return lastBonusDate !== today;
    };

    const claimDailyBonus = async () => {
        if (!currentUser?.id) return;
        const success = await addCoins(50, "Daily Login Bonus");
        if (success) {
            localStorage.setItem(`dailyBonus_${currentUser.id}`, new Date().toDateString());
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
        checkDailyBonus,
        claimDailyBonus
    };

    return (
        <CoinsContext.Provider value={value}>
            {children}
        </CoinsContext.Provider>
    );
};
