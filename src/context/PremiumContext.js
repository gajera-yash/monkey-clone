import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const PremiumContext = createContext();

export const usePremium = () => useContext(PremiumContext);

export const PremiumProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [isPremium, setIsPremium] = useState(false);
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser?.uid) {
            setIsPremium(false);
            setSubscription(null);
            setLoading(false);
            return;
        }

        const userRef = doc(db, 'users', currentUser.uid);

        const unsubscribe = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                const now = new Date();

                // Check if premium is active and not expired
                if (data.isPremium && data.premiumExpiry) {
                    const expiryDate = data.premiumExpiry.toDate();
                    if (expiryDate > now) {
                        setIsPremium(true);
                        setSubscription({
                            plan: data.subscriptionPlan,
                            expiry: expiryDate
                        });
                    } else {
                        // Expired
                        setIsPremium(false);
                        setSubscription(null);
                    }
                } else {
                    setIsPremium(false);
                    setSubscription(null);
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const purchaseSubscription = async (planId) => {
        if (!currentUser?.uid) return false;

        const plans = {
            'monthly': { duration: 30, price: 199, name: 'Monthly Plan' },
            'quarterly': { duration: 90, price: 499, name: '3-Months Plan' },
            'yearly': { duration: 365, price: 1499, name: 'Yearly Plan' }
        };

        const selectedPlan = plans[planId];
        if (!selectedPlan) return false;

        try {
            // Mock Payment Logic would go here
            console.log(`Processing payment for ${selectedPlan.name}...`);
            await new Promise(resolve => setTimeout(resolve, 1500));

            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + selectedPlan.duration);

            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
                isPremium: true,
                subscriptionPlan: planId,
                premiumExpiry: expiryDate,
                // Also give some bonus coins as a thank you!
                // coins: increment(100) // Optional
            });

            toast.success(`Welcome to Premium! You are now a VIP.`);
            return true;
        } catch (error) {
            console.error("Subscription failed:", error);
            toast.error("Purchase failed. Please try again.");
            return false;
        }
    };

    const value = {
        isPremium,
        subscription,
        loading,
        purchaseSubscription
    };

    return (
        <PremiumContext.Provider value={value}>
            {children}
        </PremiumContext.Provider>
    );
};
