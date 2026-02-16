import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    doc,
    updateDoc,
    increment,
    collection,
    addDoc,
    serverTimestamp,
    onSnapshot,
    query,
    orderBy,
    limit,
    getDoc,
    setDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const CoinsContext = createContext();

export const useCoins = () => useContext(CoinsContext);

export const CoinsProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [coins, setCoins] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Listen to real-time coin balance
    useEffect(() => {
        if (!currentUser?.uid) {
            setCoins(0);
            setTransactions([]);
            setLoading(false);
            return;
        }

        const userRef = doc(db, 'users', currentUser.uid);

        const unsubscribe = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setCoins(data.coins || 0);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // Fetch transaction history
    const fetchTransactions = async () => {
        if (!currentUser?.uid) return;

        try {
            const q = query(
                collection(db, `users/${currentUser.uid}/transactions`),
                orderBy('timestamp', 'desc'),
                limit(20)
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const txs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setTransactions(txs);
            });

            return unsubscribe; // allow cleanup if needed
        } catch (error) {
            console.error("Error fetching transactions:", error);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, [currentUser]);

    // Add coins (earn/purchase)
    const addCoins = async (amount, reason, type = 'earn') => {
        if (!currentUser?.uid) return;

        try {
            const userRef = doc(db, 'users', currentUser.uid);
            const txRef = collection(db, `users/${currentUser.uid}/transactions`);

            // 1. Update balance
            await updateDoc(userRef, {
                coins: increment(amount)
            });

            // 2. Add transaction record
            await addDoc(txRef, {
                amount,
                type,
                description: reason,
                timestamp: serverTimestamp()
            });

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
        if (!currentUser?.uid) {
            toast.error("Please login to use coins");
            return false;
        }

        if (coins < amount) {
            toast.error(`Insufficient coins! Need ${amount - coins} more.`);
            return false;
        }

        try {
            const userRef = doc(db, 'users', currentUser.uid);
            const txRef = collection(db, `users/${currentUser.uid}/transactions`);

            // 1. Deduct balance
            await updateDoc(userRef, {
                coins: increment(-amount)
            });

            // 2. Add transaction record
            await addDoc(txRef, {
                amount: -amount,
                type: 'spend',
                description: reason,
                timestamp: serverTimestamp()
            });

            return true;
        } catch (error) {
            console.error("Error spending coins:", error);
            toast.error("Transaction failed");
            return false;
        }
    };

    // Mock purchase function
    const purchaseCoins = async (packageId) => {
        const packages = {
            'pkg_100': { coins: 100, price: 99 },
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
        if (!currentUser?.uid) return;

        const today = new Date().toDateString();
        const lastBonusDate = localStorage.getItem(`dailyBonus_${currentUser.uid}`);

        if (lastBonusDate !== today) {
            // It's a new day!
            return true;
        }
        return false;
    };

    const claimDailyBonus = async () => {
        if (!currentUser?.uid) return;

        const success = await addCoins(10, "Daily Login Bonus");
        if (success) {
            localStorage.setItem(`dailyBonus_${currentUser.uid}`, new Date().toDateString());
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
