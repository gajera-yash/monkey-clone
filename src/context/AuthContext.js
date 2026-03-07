import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc, onSnapshot, collection, addDoc, increment } from 'firebase/firestore';

import { auth, googleProvider, db } from '../firebase';
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

    // Save user to Firestore
    const saveUserToDb = async (user) => {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            const gender = localStorage.getItem('userGender');

            await setDoc(userRef, {
                uid: user.uid,
                displayName: user.displayName || 'Anonymous',
                email: user.email,
                photoURL: user.photoURL,
                gender: gender || 'unknown',
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                totalChats: 0,
                blockedUsers: [],
                coins: 500, // Initial coins
                bio: '',
                ...(gender === 'Female' ? {
                    isCreator: true,
                    accountStatus: 'pending',
                    verificationLevel: 0,
                    currentTier: 1,
                    totalEarnings: 0,
                    availableBalance: 0,
                    lifetimeWithdrawn: 0,
                    totalHoursOnline: 0,
                    rating: 0,
                    totalRatings: 0,
                    profileComplete: false
                } : {
                    isCreator: false
                }),
                safetySettings: {
                    disableFriendRequests: false,
                    invisibleMode: false
                },
                matchPreferences: {
                    ageRange: [18, 35],
                    language: 'Unlimited',
                    regions: {
                        northAmerica: 'Default',
                        latinAmerica: 'Default',
                        northAfrica: 'Default',
                        middleEast: 'Default'
                    }
                }
            });
        } else {
            const data = userSnap.data();
            setBlockedUsers(data.blockedUsers || []);
            await setDoc(userRef, {
                lastLogin: serverTimestamp()
            }, { merge: true });
        }
    };

    // Google Login
    const loginWithGoogle = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            await saveUserToDb(result.user);
            setIsGuest(false);
            toast.success(`Welcome ${result.user.displayName}!`);
            return result.user;
        } catch (error) {
            console.error(error);
            toast.error(error.message);
            throw error;
        }
    };

    // Email Login
    const loginWithEmail = async (email, password) => {
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            // check if user exists in db (might be created via signup)
            setIsGuest(false);
            toast.success("Logged in successfully!");
            return result.user;
        } catch (error) {
            toast.error(error.message);
            throw error;
        }
    };

    // Email Signup
    const signupWithEmail = async (email, password, name) => {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            // Update profile with name
            await updateProfile(result.user, { displayName: name });
            // Save to DB
            await saveUserToDb({ ...result.user, displayName: name });
            setIsGuest(false);
            toast.success("Account created!");
            return result.user;
        } catch (error) {
            toast.error(error.message);
            throw error;
        }
    };

    // Guest Login
    const continueAsGuest = () => {
        setIsGuest(true);
        setBlockedUsers([]); // Reset blocked users
        const guestUser = {
            uid: `guest_${Date.now()}`,
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
                await signOut(auth);
            }
            setIsGuest(false);
            setCurrentUser(null);
            localStorage.removeItem('lastActivity'); // Clear activity on logout
            localStorage.removeItem('userGender');   // Clear gender so gender modal shows next login
            toast.success("Logged out");
        } catch (error) {
            toast.error("Error logging out");
        }
    };

    // Auto-Logout Logic (24 hours of inactivity)
    useEffect(() => {
        if (!currentUser) return;

        const INACTIVITY_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
        const CHECK_INTERVAL = 60 * 1000; // 1 minute

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
                // If no activity record, initialize it
                updateActivity();
            }
        };

        // Events to track activity
        const activityEvents = [
            'mousedown', 'mousemove', 'keypress',
            'scroll', 'touchstart', 'click'
        ];

        // Register event listeners
        activityEvents.forEach(event => {
            window.addEventListener(event, updateActivity);
        });

        // Initialize activity if not present
        if (!localStorage.getItem('lastActivity')) {
            updateActivity();
        }

        // Periodic check
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
        if (!currentUser?.uid) return;
        try {
            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, {
                ...updates,
                updatedAt: serverTimestamp()
            });
            setCurrentUser(prev => ({ ...prev, ...updates }));
            toast.success("Profile updated!");
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Failed to update profile");
        }
    };

    // Update Safety Settings
    const updateSafetySettings = async (settings) => {
        if (!currentUser?.uid) return;
        try {
            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, {
                safetySettings: settings
            });
            setCurrentUser(prev => ({ ...prev, safetySettings: settings }));
            toast.success("Settings saved");
        } catch (error) {
            console.error("Error updating safety settings:", error);
            toast.error("Failed to save settings");
        }
    };

    // Update Match Preferences
    const updateMatchPreferences = async (preferences) => {
        if (!currentUser?.uid) return;
        try {
            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, {
                matchPreferences: preferences
            });
            setCurrentUser(prev => ({ ...prev, matchPreferences: preferences }));
            toast.success("Preferences saved");
        } catch (error) {
            console.error("Error updating preferences:", error);
            toast.error("Failed to save preferences");
        }
    };

    useEffect(() => {
        let unsubSnapshot = null;

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            // Clean up previous snapshot listener if it exists
            if (unsubSnapshot) {
                unsubSnapshot();
                unsubSnapshot = null;
            }

            if (user) {
                const today = new Date().toDateString();
                const lastLoginDate = localStorage.getItem('lastLoginDate');

                if (lastLoginDate && lastLoginDate !== today) {
                    signOut(auth);
                    localStorage.removeItem('lastLoginDate');
                    toast.success("New day! Please log in again.");
                    setCurrentUser(null);
                    setLoading(false);
                    return;
                }

                localStorage.setItem('lastLoginDate', today);

                const userRef = doc(db, "users", user.uid);

                // Set up new snapshot listener
                unsubSnapshot = onSnapshot(userRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        if (data.isBanned) {
                            signOut(auth);
                            toast.error("This account has been banned.");
                            setCurrentUser(null);
                        } else {
                            setBlockedUsers(data.blockedUsers || []);
                            setCurrentUser({ ...user, ...data });
                        }
                    } else {
                        setCurrentUser(user);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Firestore snapshot error:", error);
                    setCurrentUser(user);
                    setLoading(false);
                });
            } else {
                if (!isGuest) {
                    setCurrentUser(null);
                    setBlockedUsers([]);
                }
                setLoading(false);
            }
        });

        return () => {
            unsubscribe();
            if (unsubSnapshot) unsubSnapshot();
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
            // 1. Create Report
            const reportsRef = doc(db, "reports", `${Date.now()}_${currentUser?.uid || 'guest'}`);
            await setDoc(reportsRef, {
                reporterId: currentUser?.uid || 'guest',
                reportedUserId,
                reason,
                description,
                timestamp: serverTimestamp(),
                status: 'pending'
            });

            // 2. Block User locally and in DB
            const newBlocked = [...blockedUsers, reportedUserId];
            setBlockedUsers(newBlocked);

            if (!isGuest && currentUser) {
                const userRef = doc(db, "users", currentUser.uid);
                await setDoc(userRef, { blockedUsers: newBlocked }, { merge: true });
            }

            toast.success("User reported and blocked.");
        } catch (error) {
            console.error("Error reporting user:", error);
            toast.error("Failed to report user.");
        }
    };

    // Save match to history
    const saveMatchToHistory = async (partnerData) => {
        if (!currentUser?.uid || isGuest) return;
        try {
            const historyRef = collection(db, `users/${currentUser.uid}/matchHistory`);
            await addDoc(historyRef, {
                ...partnerData,
                timestamp: serverTimestamp()
            });

            // Also update total chats count
            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, {
                totalChats: increment(1)
            });
        } catch (error) {
            console.error("Error saving match history:", error);
        }
    };

    // Log Creator Earnings for a session
    const logCreatorEarnings = async (durationSec, earnedAmount) => {
        if (!currentUser?.uid || !currentUser?.isCreator || earnedAmount <= 0) return;
        try {
            // 1. Add to creatorEarnings collection for history/charts
            const earningsRef = collection(db, 'creatorEarnings');
            await addDoc(earningsRef, {
                creatorId: currentUser.uid,
                amount: earnedAmount,
                durationSeconds: durationSec,
                source: 'video_chat',
                timestamp: serverTimestamp()
            });

            // 2. Update the user's total balance
            const userRef = doc(db, "users", currentUser.uid);
            await updateDoc(userRef, {
                totalEarnings: increment(earnedAmount),
                availableBalance: increment(earnedAmount),
                totalHoursOnline: increment(durationSec / 3600)
            });

            // Note: In a real production app, we would also deduct coins from the partner here 
            // via a secure Cloud Function using transaction.
        } catch (error) {
            console.error("Error logging creator earnings:", error);
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
        signupWithEmail,
        continueAsGuest,
        logout,
        reportUser,
        updateProfileInfo,
        updateSafetySettings,
        updateMatchPreferences,
        saveMatchToHistory,
        logCreatorEarnings
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
