import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
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
        if (!currentUser?.id) {
            setIsPremium(false);
            setSubscription(null);
            setLoading(false);
            return;
        }

        const now = new Date();
        // Sync with currentUser from AuthContext
        if (currentUser.is_premium && currentUser.premium_expiry) {
            const expiryDate = new Date(currentUser.premium_expiry);
            if (expiryDate > now) {
                setIsPremium(true);
                setSubscription({
                    plan: currentUser.subscription_plan,
                    expiry: expiryDate
                });
            } else {
                setIsPremium(false);
                setSubscription(null);
            }
        } else {
            setIsPremium(false);
            setSubscription(null);
        }
        setLoading(false);
    }, [currentUser]);

    const purchaseSubscription = async (planId) => {
        if (!currentUser?.id) return false;

        const plans = {
            'monthly': { duration: 30, price: 199, name: 'Monthly Plan' },
            'quarterly': { duration: 90, price: 499, name: '3-Months Plan' },
            'yearly': { duration: 365, price: 1499, name: 'Yearly Plan' }
        };

        const selectedPlan = plans[planId];
        if (!selectedPlan) return false;

        try {
            // Mock Payment Logic
            console.log(`Processing payment for ${selectedPlan.name}...`);
            await new Promise(resolve => setTimeout(resolve, 1500));

            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + selectedPlan.duration);

            const { error } = await supabase
                .from('profiles')
                .update({
                    is_premium: true,
                    subscription_plan: planId,
                    premium_expiry: expiryDate.toISOString()
                })
                .eq('id', currentUser.id);

            if (error) throw error;

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
