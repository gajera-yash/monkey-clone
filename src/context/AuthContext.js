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
    const [matchHistory, setMatchHistory] = useState([]);
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

    // Email Login (Specifically for Admin access)
    const loginWithEmail = async (email, password) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            setIsGuest(false);
            toast.success("Admin logged in successfully!");
            return data.user;
        } catch (error) {
            toast.error(error.message);
            throw error;
        }
    };


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
            if (!isGuest && currentUser) {
                // Save last user info for persistent login UI
                const lastUserInfo = {
                    id: currentUser.id,
                    displayName: currentUser.displayName,
                    photoURL: currentUser.photoURL,
                    email: currentUser.email
                };
                localStorage.setItem('lastLoggedUser', JSON.stringify(lastUserInfo));
                await supabase.auth.signOut();
            }
            setIsGuest(false);
            setCurrentUser(null);
            localStorage.removeItem('lastActivity');
            localStorage.removeItem('userGender');
            toast.success("Logged out");
        } catch (error) {
            console.error("Logout error:", error);
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

    // Fetch Match History
    useEffect(() => {
        if (!currentUser?.id || isGuest) {
            setMatchHistory([]);
            return;
        }

        const fetchHistory = async () => {
            try {
                const { data, error } = await supabase
                    .from('chat_logs')
                    .select(`
                        id,
                        start_time,
                        duration,
                        user1_id,
                        user2_id,
                        partner1:profiles!chat_logs_user1_id_fkey(username, avatar_url, location),
                        partner2:profiles!chat_logs_user2_id_fkey(username, avatar_url, location)
                    `)
                    .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
                    .order('start_time', { ascending: false })
                    .limit(50);

                if (error) throw error;

                const formatted = data.map(item => {
                    // Identify the partner by checking which ID is NOT the current user
                    const isUser1 = item.user1_id === currentUser.id;
                    const partner = isUser1 ? item.partner2 : item.partner1;

                    return {
                        id: item.id,
                        name: partner?.username || 'Guest User',
                        avatar: partner?.avatar_url,
                        location: partner?.location || 'Global',
                        timestamp: item.start_time,
                        duration: item.duration ? `${Math.floor(item.duration / 60)}m ${item.duration % 60}s` : null,
                        hasRecording: false // Change if UI supports recordings
                    };
                });
                
                setMatchHistory(formatted);
            } catch (error) {
                console.error("Error fetching match history for mobile:", error);
            }
        };

        fetchHistory();
    }, [currentUser, isGuest]);

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
        let mounted = true;

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("[AuthContext] onAuthStateChange event:", event);

            if (!mounted) return;
            try {
                if (session?.user) {
                    try {
                        let profile = await fetchProfile(session.user.id);

                        // Handle female creator registration logic
                        const savedGender = localStorage.getItem('userGender');
                        if (savedGender === 'Female' && profile && !profile.isCreator) {
                            const { error: updateErr } = await supabase
                                .from('profiles')
                                .update({ is_creator: true, gender: 'Female', account_status: 'pending' })
                                .eq('id', session.user.id);

                            if (!updateErr) {
                                profile = { ...profile, isCreator: true, gender: 'Female', accountStatus: 'pending' };
                            }
                            localStorage.removeItem('userGender');
                        } else if (savedGender) {
                            localStorage.removeItem('userGender');
                        }

                        setCurrentUser({ ...session.user, ...profile });

                        // Update last user info OR clear if it's a new login
                        const lastUserInfo = {
                            id: session.user.id,
                            displayName: profile?.displayName || session.user.email?.split('@')[0],
                            photoURL: profile?.photoURL || session.user.user_metadata?.avatar_url,
                            email: session.user.email
                        };
                        localStorage.setItem('lastLoggedUser', JSON.stringify(lastUserInfo));

                        // Check for ban
                        if (profile?.is_blocked && profile?.ban_expiry && new Date(profile.ban_expiry) > new Date()) {
                            const daysRemaining = Math.ceil((new Date(profile.ban_expiry) - new Date()) / (1000 * 60 * 60 * 24));
                            const reason = profile.ban_reason || 'Administrative Decision';
                            setCurrentUser(null);
                            await supabase.auth.signOut();
                            toast.error(`Your profile is banned for ${daysRemaining} day(s). Reason: ${reason}`, { duration: 8000 });
                        } else if (profile?.is_blocked && !profile?.ban_expiry) {
                            setCurrentUser(null);
                            await supabase.auth.signOut();
                            const reason = profile.ban_reason || 'Administrative Decision';
                            toast.error(`Your profile has been permanently banned. Reason: ${reason}`, { duration: 8000 });
                        }
                    } catch (profileError) {
                        console.error("Profile fetch error on auth state change:", profileError);
                        setCurrentUser(session.user);
                    }
                } else if (!isGuest) {
                    setCurrentUser(null);
                }
            } catch (err) {
                console.error("Unexpected error in auth state change:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        });

        return () => {
            mounted = false;
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
        if (!currentUser?.id || isGuest || !partnerData.uid) return;
        try {
            const { data, error } = await supabase
                .from('chat_logs')
                .insert({
                    user1_id: currentUser.id,
                    user2_id: partnerData.uid,
                    start_time: partnerData.startTimeIso || new Date().toISOString(),
                    end_time: new Date().toISOString(),
                    duration: partnerData.durationSec || 0
                }).select().single();

            if (error) {
                console.error("Supabase insert error:", error);
                throw error;
            }

            // Immediately update local state
            const newMatch = {
                id: data.id,
                name: partnerData.name || 'Guest User',
                avatar: partnerData.avatar,
                location: partnerData.location || 'Global',
                timestamp: data.start_time,
                duration: partnerData.durationSec ? `${Math.floor(partnerData.durationSec / 60)}m ${partnerData.durationSec % 60}s` : '0m 0s',
                hasRecording: false
            };
            setMatchHistory(prev => [newMatch, ...prev]);

            // Update total chats
            await supabase.rpc('increment_chats', { user_id: currentUser.id });
        } catch (error) {
            console.error("Error saving match history:", error);
        }
    };

    // Remove from history locally
    const removeFromHistory = async (id) => {
        try {
            await supabase.from('chat_logs').delete().eq('id', id);
            setMatchHistory(prev => prev.filter(item => item.id !== id));
        } catch(e) {
            console.error('Failed to remove from history');
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
        loginWithEmail,
        continueAsGuest,
        logout,
        reportUser,
        updateProfileInfo,
        updateSafetySettings,
        updateMatchPreferences,
        saveMatchToHistory,
        removeFromHistory,
        matchHistory,
        logCreatorEarnings,
        refreshProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
