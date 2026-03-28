import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { getUserLocation } from '../utils/geolocation';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isGuest, setIsGuest] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [matchHistory, setMatchHistory] = useState([]);
    const [userLocation, setUserLocation] = useState(null);
    const activeLogId = useRef(null);

    // Fetch Profile from Supabase
    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*, is_profile_completed')
                .eq('id', userId)
                .single();

            if (error) throw error;
            // Mapping to support existing components (uid, isCreator, etc)
            return {
                ...data,
                uid: data.id,
                email: data.email,
                isCreator: data.is_creator,
                accountStatus: data.account_status,
                displayName: data.username,
                photoURL: data.avatar_url,
                role: data.role || 'user'
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
                        prompt: 'select_account', // Forces account selection to avoid auto-login loops
                        access_type: 'offline'
                    },
                    scopes: 'https://www.googleapis.com/auth/user.birthday.read'
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

    // Email Login (For Standard Users)
    const loginWithUserEmail = async (email, password) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            setIsGuest(false);
            return data.user;
        } catch (error) {
            console.error(error);
            toast.error(error.message);
            throw error;
        }
    };

    // Email Registration
    const signUpWithEmail = async (email, password, displayName) => {
        try {
            const savedGender = localStorage.getItem('userGender');
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: displayName,
                        gender: savedGender || null
                    }
                }
            });
            if (error) throw error;
            
            if (data.user && data.user.identities?.length === 0) {
                throw new Error("This email is already registered.");
            }

            return { needsVerification: true, user: data.user };
        } catch (error) {
            console.error(error);
            toast.error(error.message);
            throw error;
        }
    };

    // Verify OTP
    const verifyEmailOTP = async (email, token) => {
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token,
                type: 'signup'
            });
            if (error) throw error;
            
            toast.success("Email verified successfully!");
            return data.session;
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Invalid or expired code");
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
            // Close any active chat log before logging out
            if (activeLogId.current) {
                updateChatLog(activeLogId.current, 0, 0);
            }

            if (!isGuest) {
                if (currentUser) {
                    // Save last user info for persistent login UI
                    const lastUserInfo = {
                        id: currentUser.id,
                        displayName: currentUser.displayName,
                        photoURL: currentUser.photoURL,
                        email: currentUser.email
                    };
                    localStorage.setItem('lastLoggedUser', JSON.stringify(lastUserInfo));
                }
                
                // Attempt to sign out from Supabase server
                // We wrap this inside try-catch so if network fails, we STILL clear local session
                try {
                    await supabase.auth.signOut();
                } catch (signOutError) {
                    console.error("Supabase signOut error:", signOutError);
                }
            }
            
            // Aggressive local state cleanup
            // 1. Manually prune all Supabase sb- keys to guarantee local removal
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                    localStorage.removeItem(key);
                }
            }

            // 2. Clear application memory 
            setIsGuest(false);
            setCurrentUser(null);
            localStorage.removeItem('lastActivity');
            localStorage.removeItem('userGender');
            
            toast.success("Logged out");
            
            // Hard redirect to home to forcefully unmount private routes
            setTimeout(() => {
                window.location.href = '/';
            }, 500);
        } catch (error) {
            console.error("Logout error:", error);
            
            // Catastrophic fallback cleanup
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                    localStorage.removeItem(key);
                }
            }
            setCurrentUser(null);
            window.location.href = '/';
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

        // --- Active Now Ping (last_seen heartbeat) ---
        const updateLastSeen = async () => {
            if (currentUser?.id && !isGuest) {
                try {
                    await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', currentUser.id);
                } catch (e) { } // silent fail
            }
        };
        updateLastSeen();
        const heartbeat = setInterval(updateLastSeen, 60000); // exactly every 1 min

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
                        partner1:profiles!chat_logs_user1_id_fkey(username, avatar_url, location_country),
                        partner2:profiles!chat_logs_user2_id_fkey(username, avatar_url, location_country)
                    `)
                    .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
                    .order('start_time', { ascending: false })
                    .limit(50);

                if (error) throw error;

                const formatted = data.map(item => {
                    const isUser1 = item.user1_id === currentUser.id;
                    const partner = isUser1 ? item.partner2 : item.partner1;

                    return {
                        id: item.id,
                        name: partner?.username || 'Guest User',
                        avatar: partner?.avatar_url,
                        location: partner?.location_country || 'Global',
                        timestamp: item.start_time,
                        duration: item.duration ? `${Math.floor(item.duration / 60)}m ${item.duration % 60}s` : null,
                        hasRecording: false
                    };
                });
                
                setMatchHistory(formatted);
            } catch (error) {
                console.error("Error fetching match history:", error);
            }
        };

        fetchHistory();

        return () => clearInterval(heartbeat);
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

    // Complete profile (new function)
    const completeProfile = async (birthdate, gender) => {
        if (!currentUser?.id) return;
        try {
            const updates = {
                birthdate,
                gender,
                is_profile_completed: true
            };

            // If user selects Female, they are automatically treated as a pending creator (Female Verification)
            if (gender === 'Female' && !currentUser.is_creator) {
                updates.is_creator = true;
                updates.account_status = 'pending';
                
                // Insert admin notification for female profile completion
                try {
                    await supabase.from('notifications').insert({
                        type: 'female_signup',
                        message: `User ${currentUser.displayName || currentUser.email} completed profile as Female — awaiting verification`,
                        is_read: false
                    });
                } catch (e) { console.warn("Notif failed", e.message); }
            }

            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', currentUser.id);

            if (error) throw error;
            
            // Map updates to state (including aliased names like isCreator/accountStatus)
            setCurrentUser(prev => ({ 
                ...prev, 
                ...updates,
                isCreator: updates.is_creator !== undefined ? updates.is_creator : prev.isCreator,
                accountStatus: updates.account_status !== undefined ? updates.account_status : prev.accountStatus
            }));
            
            toast.success("Profile verified!");
        } catch (error) {
            console.error("Error completing profile:", error);
            toast.error("Failed to save profile");
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
                        
                        // Fix for missing email on existing profiles
                        if (profile && !profile.email && session.user.email) {
                            console.log("Updating missing email for existing profile...");
                            await supabase.from('profiles').update({ email: session.user.email }).eq('id', session.user.id);
                            profile.email = session.user.email;
                        }

                        // If profile doesn't exist, create it (important for new Google users)
                        if (!profile) {
                            console.log("Creating missing profile for user:", session.user.id);
                            const { data: newProfile, error: createError } = await supabase
                                .from('profiles')
                                .insert({
                                    id: session.user.id,
                                    email: session.user.email,
                                    username: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
                                    avatar_url: session.user.user_metadata?.avatar_url,
                                    coins: 50,
                                    is_creator: false,
                                    account_status: 'active',
                                    is_profile_completed: false
                                })
                                .select()
                                .single();

                            if (createError) {
                                console.error("Error creating profile:", createError);
                            } else {
                                profile = {
                                    ...newProfile,
                                    uid: newProfile.id,
                                    email: newProfile.email,
                                    displayName: newProfile.username,
                                    photoURL: newProfile.avatar_url,
                                    isCreator: newProfile.is_creator,
                                    accountStatus: newProfile.account_status
                                };
                            }
                        }

                        // --- Google Birthday Fetch Logic ---
                        if (session.provider_token && session.user.app_metadata.provider === 'google' && !profile.birthdate) {
                            console.log("Attempting to fetch Google birthday...");
                            try {
                                const response = await fetch('https://people.googleapis.com/v1/people/me?personFields=birthdays', {
                                    headers: { Authorization: `Bearer ${session.provider_token}` }
                                });
                                const data = await response.json();
                                const birthday = data.birthdays?.find(b => b.date);
                                if (birthday && birthday.date) {
                                    const { year, month, day } = birthday.date;
                                    const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    
                                    console.log("Fetched birthday from Google:", formattedDate);
                                    
                                    const { error: updateError } = await supabase
                                        .from('profiles')
                                        .update({ birthdate: formattedDate })
                                        .eq('id', session.user.id);
                                    
                                    if (!updateError) {
                                        profile.birthdate = formattedDate;
                                    }
                                }
                            } catch (e) {
                                console.error("Failed to fetch Google birthday:", e);
                            }
                        }

                        // Handle female creator registration logic
                        const savedGender = localStorage.getItem('userGender');
                        if (savedGender === 'Female' && profile && !profile.isCreator) {
                            const { error: updateErr } = await supabase
                                .from('profiles')
                                .update({ is_creator: true, gender: 'Female', account_status: 'pending' })
                                .eq('id', session.user.id);

                            if (!updateErr) {
                                profile = { ...profile, isCreator: true, gender: 'Female', accountStatus: 'pending' };
                                // Insert admin notification for female signup
                                try {
                                    await supabase.from('notifications').insert({
                                        type: 'female_signup',
                                        message: `New female user registered: ${profile.displayName || session.user.email} — awaiting verification`,
                                        is_read: false
                                    });
                                } catch (notifErr) {
                                    // notifications table may not exist yet — silently fail
                                    console.warn('Could not insert notification:', notifErr.message);
                                }
                            }
                            localStorage.removeItem('userGender');
                        } else if (savedGender) {
                            localStorage.removeItem('userGender');
                        }


                        // Check Google Profile data for first-time population
                        if (session.user.app_metadata?.provider === 'google' && profile && (!profile.location_country || !profile.birthdate)) {
                            const updates = {};
                            const meta = session.user.user_metadata || {};
                            
                            // Map locale to country (e.g. en-GB -> GB, en-US -> US)
                            if (!profile.location_country && meta.locale) {
                                const localeParts = meta.locale.split('-');
                                if (localeParts.length > 1) {
                                    const code = localeParts[1].toUpperCase();
                                    const regions = new Intl.DisplayNames(['en'], { type: 'region' });
                                    try {
                                        updates.location_country = regions.of(code) || code;
                                    } catch(e) { updates.location_country = code; }
                                }
                            }
                            
                            // Check birthdate if available (rare from default oauth, but if requested)
                            if (!profile.birthdate && meta.birthdate) {
                                updates.birthdate = meta.birthdate;
                            }

                            if (Object.keys(updates).length > 0) {
                                await supabase.from('profiles').update(updates).eq('id', session.user.id);
                                profile = { ...profile, ...updates };
                            }
                        }

                        setCurrentUser({ ...session.user, ...profile });
                        setIsAdmin(profile?.role === 'admin');

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

    // Upload Report Evidence (Screenshot)
    const uploadReportEvidence = async (file) => {
        if (!file) return null;
        try {
            const fileName = `report_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            const { data, error } = await supabase.storage
                .from('report-evidence')
                .upload(fileName, file, {
                    contentType: 'image/jpeg',
                    upsert: false
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('report-evidence')
                .getPublicUrl(fileName);

            return publicUrl;
        } catch (error) {
            console.error("Error uploading evidence:", error);
            return null;
        }
    };

    // Report User
    const reportUser = async (reportedUserId, reason, description, chatLogId = null, evidenceFile = null) => {
        try {
            let evidenceUrl = null;
            if (evidenceFile) {
                evidenceUrl = await uploadReportEvidence(evidenceFile);
            }

            const insertData = {
                reporter_id: currentUser?.id,
                reported_user_id: reportedUserId,
                reason,
                description,
                status: 'pending',
                evidence_url: evidenceUrl
            };

            if (chatLogId) insertData.chat_log_id = chatLogId;

            const { error } = await supabase
                .from('reports')
                .insert(insertData);

            if (error) throw error;
            toast.success("User reported.");
        } catch (error) {
            console.error("Error reporting user:", error);
            toast.error("Failed to report user.");
        }
    };

    // Start a new chat log (called by initiator at match start)
    const startChatLog = async (partnerId, roomId) => {
        // Base check for current user as initiator
        if (!currentUser?.id || !partnerId) return null;

        // --- PREVENT DUPLICATE/DANGLING LOGS FOR SAME USER ---
        if (activeLogId.current) {
            console.log("[Auth] Closing existing log before starting new one:", activeLogId.current);
            updateChatLog(activeLogId.current, 0, 0); // Force close
        }
        // -----------------------------------------------------

        try {
            // Check if IDs are valid UUIDs for FK satisfaction
            const isUuid = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
            
            const logData = {
                user1_id: isUuid(currentUser.id) ? currentUser.id : null,
                user1_guest_id: !isUuid(currentUser.id) ? currentUser.id : null,
                user2_id: isUuid(partnerId) ? partnerId : null,
                user2_guest_id: !isUuid(partnerId) ? partnerId : null,
                room_id: roomId || null,
                start_time: new Date().toISOString(),
                end_time: null,
                duration: 0,
                messages_count: 0
            };

            const { data, error } = await supabase
                .from('chat_logs')
                .insert(logData)
                .select()
                .single();

            if (error) throw error;
            activeLogId.current = data.id; // Store current log ID
            return data.id;
        } catch (error) {
            console.error("Error starting chat log:", error);
            return null;
        }
    };

    // Update an existing chat log (called at end of chat)
    const updateChatLog = async (logId, durationSec, messagesCount = 0) => {
        if (!logId) return;
        try {
            const { error } = await supabase
                .from('chat_logs')
                .update({
                    end_time: new Date().toISOString(),
                    duration: durationSec || 0,
                    messages_count: messagesCount || 0
                })
                .eq('id', logId);

            if (error) throw error;
            
            // Clear if it was the active one
            if (activeLogId.current === logId) {
                activeLogId.current = null;
            }
            
            // Stats will be auto-calculated by database trigger
        } catch (error) {
            console.error("Error updating chat log:", error);
        }
    };

    // Save match to history (compatibility wrapper / fallback)
    const saveMatchToHistory = async (partnerData, roomData = {}) => {
        if (!currentUser?.id || isGuest || !partnerData.uid) return;
        try {
            // If logId exists, we should use updateChatLog instead. 
            // This function is now used as a fallback or for simple history tracking.
            const { data, error } = await supabase
                .from('chat_logs')
                .insert({
                    user1_id: currentUser.id,
                    user2_id: partnerData.uid,
                    room_id: roomData.roomId || null,
                    start_time: partnerData.startTimeIso || new Date().toISOString(),
                    end_time: new Date().toISOString(),
                    duration: partnerData.durationSec || 0,
                    messages_count: roomData.messagesCount || 0
                }).select().single();

            if (error) throw error;

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

            // Note: increment_chats RPC call was removed because it's now handled by DB trigger
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
        isAdmin,
        loading,
        blockedUsers,
        userLocation,
        loginWithGoogle,
        loginWithEmail,
        loginWithUserEmail,
        signUpWithEmail,
        continueAsGuest,
        logout,
        reportUser,
        uploadReportEvidence,
        updateProfileInfo,
        updateSafetySettings,
        updateMatchPreferences,
        completeProfile,
        startChatLog,
        updateChatLog,
        saveMatchToHistory,
        removeFromHistory,
        matchHistory,
        refreshProfile,
        verifyEmailOTP
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
