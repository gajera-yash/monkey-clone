import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
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
            await setDoc(userRef, {
                uid: user.uid,
                displayName: user.displayName || 'Anonymous',
                email: user.email,
                photoURL: user.photoURL,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                totalChats: 0,
                blockedUsers: []
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

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Fetch user data from Firestore
                const userRef = doc(db, "users", user.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const data = userSnap.data();

                    if (data.isBanned) {
                        await signOut(auth);
                        toast.error("This account has been banned.");
                        setCurrentUser(null);
                        setLoading(false);
                        return;
                    }

                    setBlockedUsers(data.blockedUsers || []);
                    setCurrentUser({ ...user, ...data }); // Merge auth user with firestore data
                } else {
                    setCurrentUser(user);
                }
            } else if (!isGuest) {
                setCurrentUser(null);
                setBlockedUsers([]);
            }
            setLoading(false);
        });
        return unsubscribe;
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
        reportUser
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
