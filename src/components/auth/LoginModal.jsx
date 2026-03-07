import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const LoginModal = ({ isOpen, onClose }) => {
    const { loginWithGoogle, loginWithEmail, signupWithEmail, continueAsGuest, currentUser } = useAuth();
    const navigate = useNavigate();

    // Helper to navigate based on creator status
    const navigateAfterLogin = (user) => {
        const gender = localStorage.getItem('userGender');
        const isCreatorUser = user?.isCreator || gender === 'Female';
        // Clear gender from localStorage after using it (each new session should pick gender fresh)
        localStorage.removeItem('userGender');

        if (isCreatorUser) {
            const status = user?.accountStatus;
            if (status === 'active') {
                navigate('/creator/dashboard');
            } else {
                navigate('/creator/onboarding');
            }
        } else {
            navigate('/chat');
        }
    };
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            await loginWithGoogle();
            // Note: navigateAfterLogin will happen via AuthState listener in higher components
            // because signInWithOAuth triggers a redirect
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleGuest = () => {
        continueAsGuest();
        onClose();
        navigate('/chat');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-dark-800 border border-white/10 rounded-2xl w-full max-w-md p-8 shadow-2xl relative overflow-hidden">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-white mb-2">
                        Welcome to Strangy
                    </h2>
                    <p className="text-gray-400">
                        Sign in to start matching with people
                    </p>
                </div>

                {/* Google Sign In */}
                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-bold py-4 rounded-xl hover:bg-gray-100 transition-all mb-4 shadow-xl"
                >
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-6 h-6" />
                    {loading ? 'Connecting...' : 'Sign in with Google'}
                </button>

                {/* Guest Option */}
                <div className="mt-4 pt-4 border-t border-white/5 text-center">
                    <button
                        onClick={handleGuest}
                        className="text-gray-500 hover:text-white text-sm font-medium transition-colors"
                    >
                        Continue as Guest &rarr;
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginModal;
