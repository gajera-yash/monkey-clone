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

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isGuest, setIsGuest] = useState(false);

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
                totalChats: 0
            });
        } else {
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
            toast.success("Logged out");
        } catch (error) {
            toast.error("Error logging out");
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!isGuest) {
                setCurrentUser(user);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, [isGuest]);

    const value = {
        currentUser,
        isGuest,
        loading,
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        continueAsGuest,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
