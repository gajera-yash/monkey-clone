import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { getUserLocation } from '../utils/geolocation';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isGuest, setIsGuest] = useState(false);
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [userLocation, setUserLocation] = useState(null);

    // Fetch Profile from Supabase
    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            // Mapping to support existing components (uid, isCreator, etc)
            return {
                ...data,
                uid: data.id,
                isCreator: data.is_creator,
                accountStatus: data.account_status,
                displayName: data.username,
                photoURL: data.avatar_url
            };
        } catch (error) {
            console.error("Error fetching profile:", error);
            return null;
        }
    };

    // Robust URL detector for Supabase redirects
    const getURL = () => {
        let url = window.location.origin;
        // Ensure it ends correctly without a trailing slash for Supabase consistency
        return url.charAt(url.length - 1) === '/' ? url.slice(0, -1) : url;
    };

    // Google Login
    const loginWithGoogle = async () => {
        const redirectUrl = getURL();
        console.log("🚀 Initiating Google Auth. Redirecting to:", redirectUrl);

        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    queryParams: {
                        prompt: 'select_account' // Forces account selection to avoid auto-login loops
                    }
                }
            });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error(error);
            toast.error(error.message);
            throw error;
        }
    };

    // Email authentication functions removed as per Google-only requirement


    // Guest Login
    const continueAsGuest = () => {
        setIsGuest(true);
        setBlockedUsers([]);
        const guestUser = {
            id: `guest_${Date.now()}`,
            displayName: 'Guest User',
            isAnonymous: true,
            photoURL: null
        };
        setCurrentUser(guestUser);
        toast.success("Continued as Guest");
    };

    // Logout
    const logout = async () => {
        try {
            if (!isGuest) {
                await supabase.auth.signOut();
            }
            setIsGuest(false);
            setCurrentUser(null);
            localStorage.removeItem('lastActivity');
            localStorage.removeItem('userGender');
            toast.success("Logged out");
        } catch (error) {
            toast.error("Error logging out");
        }
    };

    // Auto-Logout Logic (24 hours of inactivity)
    useEffect(() => {
        if (!currentUser) return;

        const INACTIVITY_TIMEOUT = 24 * 60 * 60 * 1000;
        const CHECK_INTERVAL = 60 * 1000;

        const updateActivity = () => {
            localStorage.setItem('lastActivity', Date.now().toString());
        };

        const checkInactivity = () => {
            const lastActivity = localStorage.getItem('lastActivity');
            if (lastActivity) {
                const inactiveDuration = Date.now() - parseInt(lastActivity);
                if (inactiveDuration > INACTIVITY_TIMEOUT) {
                    logout();
                    toast("Logged out due to inactivity", { icon: '⏰' });
                }
            } else {
                updateActivity();
            }
        };

        const activityEvents = [
            'mousedown', 'mousemove', 'keypress',
            'scroll', 'touchstart', 'click'
        ];

        activityEvents.forEach(event => {
            window.addEventListener(event, updateActivity);
        });

        if (!localStorage.getItem('lastActivity')) {
            updateActivity();
        }

        const interval = setInterval(checkInactivity, CHECK_INTERVAL);

        return () => {
            activityEvents.forEach(event => {
                window.removeEventListener(event, updateActivity);
            });
            clearInterval(interval);
        };
    }, [currentUser]);

    // Update Profile Info
    const updateProfileInfo = async (updates) => {
        if (!currentUser?.id) return;
        try {
            const supabaseUpdates = {};
            if (updates.displayName) supabaseUpdates.username = updates.displayName;
            if (updates.photoURL) supabaseUpdates.avatar_url = updates.photoURL;
            if (updates.bio !== undefined) supabaseUpdates.bio = updates.bio;

            const { error } = await supabase
                .from('profiles')
                .update(supabaseUpdates)
                .eq('id', currentUser.id);

            if (error) throw error;

            setCurrentUser(prev => ({ ...prev, ...updates }));
            toast.success("Profile updated!");
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Failed to update profile");
        }
    };

    // Update Safety Settings (Now in profiles table or a separate settings table)
    const updateSafetySettings = async (settings) => {
        if (!currentUser?.id) return;
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ safety_settings: settings })
                .eq('id', currentUser.id);

            if (error) throw error;
            setCurrentUser(prev => ({ ...prev, safety_settings: settings }));
            toast.success("Settings saved");
        } catch (error) {
            console.error("Error updating safety settings:", error);
            toast.error("Failed to save settings");
        }
    };

    // Update Match Preferences
    const updateMatchPreferences = async (preferences) => {
        if (!currentUser?.id) return;
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ match_preferences: preferences })
                .eq('id', currentUser.id);

            if (error) throw error;
            setCurrentUser(prev => ({ ...prev, match_preferences: preferences }));
            toast.success("Preferences saved");
        } catch (error) {
            console.error("Error updating preferences:", error);
            toast.error("Failed to save preferences");
        }
    };

    // Auth State Listener
    useEffect(() => {
        const getInitialSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const profile = await fetchProfile(session.user.id);
                setCurrentUser({ ...session.user, ...profile });
            }
            setLoading(false);
        };

        getInitialSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                const profile = await fetchProfile(session.user.id);
                setCurrentUser({ ...session.user, ...profile });

                // Check for ban
                if (profile?.ban_expiry && new Date(profile.ban_expiry) > new Date()) {
                    logout();
                    toast.error(`Account banned until ${new Date(profile.ban_expiry).toLocaleDateString()}`);
                }
            } else if (!isGuest) {
                setCurrentUser(null);
            }
            setLoading(false);
        });

        return () => {
            if (subscription) subscription.unsubscribe();
        };
    }, [isGuest]);

    // Fetch user location on mount
    useEffect(() => {
        const fetchLocation = async () => {
            const location = await getUserLocation();
            setUserLocation(location);
        };
        fetchLocation();
    }, []);

    // Report User
    const reportUser = async (reportedUserId, reason, description) => {
        try {
            const { error } = await supabase
                .from('reports')
                .insert({
                    reporter_id: currentUser?.id,
                    reported_id: reportedUserId,
                    reason,
                    description,
                    status: 'pending'
                });

            if (error) throw error;
            toast.success("User reported.");
        } catch (error) {
            console.error("Error reporting user:", error);
            toast.error("Failed to report user.");
        }
    };

    // Save match to history
    const saveMatchToHistory = async (partnerData) => {
        if (!currentUser?.id || isGuest) return;
        try {
            await supabase
                .from('chat_logs')
                .insert({
                    user1_id: currentUser.id,
                    user2_id: partnerData.uid,
                    start_time: new Date().toISOString()
                });

            // Update total chats
            await supabase.rpc('increment_chats', { user_id: currentUser.id });
        } catch (error) {
            console.error("Error saving match history:", error);
        }
    };

    // Log Creator Earnings
    const logCreatorEarnings = async (durationSec, earnedAmount) => {
        if (!currentUser?.id || !currentUser?.is_creator || earnedAmount <= 0) return;
        try {
            await supabase
                .from('transactions')
                .insert({
                    user_id: currentUser.id,
                    amount: earnedAmount,
                    type: 'creator_earning'
                });

            // Update balance
            await supabase.rpc('update_creator_balance', {
                user_id: currentUser.id,
                earned: earnedAmount,
                duration: durationSec
            });
        } catch (error) {
            console.error("Error logging creator earnings:", error);
        }
    };

    // Refresh Profile manually
    const refreshProfile = async () => {
        if (!currentUser?.id) return;
        const profile = await fetchProfile(currentUser.id);
        if (profile) {
            setCurrentUser(prev => ({ ...prev, ...profile }));
        }
    };

    const value = {
        currentUser,
        isGuest,
        loading,
        blockedUsers,
        userLocation,
        loginWithGoogle,
        continueAsGuest,
        logout,
        reportUser,
        updateProfileInfo,
        updateSafetySettings,
        updateMatchPreferences,
        saveMatchToHistory,
        logCreatorEarnings,
        refreshProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
