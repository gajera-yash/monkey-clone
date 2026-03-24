import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import GenderModal from './GenderModal';
import { RiFacebookFill, RiMailFill } from "react-icons/ri";

const LoginModal = ({ isOpen, onClose }) => {
    const { loginWithGoogle, continueAsGuest, loginWithUserEmail, signUpWithEmail } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [ageChecked, setAgeChecked] = useState(false);
    const [termsChecked, setTermsChecked] = useState(false);
    const [isGenderModalOpen, setIsGenderModalOpen] = useState(false);
    
    // New state for Email Auth
    const [view, setView] = useState('social'); // 'social', 'email-login', 'email-signup'
    const [authMethod, setAuthMethod] = useState('google'); // 'google' or 'email-signup'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    // Get last logged user
    const lastUser = JSON.parse(localStorage.getItem('lastLoggedUser') || 'null');

    // Reset forms when switching views
    const switchView = (newView) => {
        setView(newView);
        setEmail('');
        setPassword('');
        setName('');
    };

    const handleGoogleLogin = async () => {
        if (!ageChecked || !termsChecked) {
            toast.error("Please agree to the Terms and Age verification");
            return;
        }
        setAuthMethod('google');
        setIsGenderModalOpen(true);
    };

    const handleEmailSignup = async (e) => {
        e.preventDefault();
        if (!name || !email || !password) {
            toast.error("Please fill in all fields");
            return;
        }
        if (!ageChecked || !termsChecked) {
            toast.error("Please agree to the Terms and Age verification");
            return;
        }
        setAuthMethod('email-signup');
        setIsGenderModalOpen(true);
    };

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error("Please enter email and password");
            return;
        }
        setLoading(true);
        try {
            await loginWithUserEmail(email, password);
            toast.success('Logged in successfully!');
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const onGenderSelect = async (gender) => {
        setIsGenderModalOpen(false);
        localStorage.setItem('userGender', gender);
        setLoading(true);
        try {
            if (authMethod === 'google') {
                await loginWithGoogle();
            } else if (authMethod === 'email-signup') {
                const res = await signUpWithEmail(email, password, name);
                if (res?.needsVerification) {
                    toast.success('Verification email sent! Please check your inbox before logging in.', { duration: 6000 });
                    setView('email-login'); // switch to login view for when they come back
                } else {
                    toast.success('Account created successfully!');
                }
                onClose();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleLastUserLogin = async () => {
        setLoading(true);
        try {
            await loginWithGoogle();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const handleGuest = () => {
        continueAsGuest();
        onClose();
        navigate('/chat');
    };

    return (
        <>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#5841d8]/95 backdrop-blur-md p-4 animate-fade-in">
                <div className="w-full max-w-[360px] text-center relative">
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute -top-12 right-0 text-white/60 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* App Logo or Name Could Go Here */}
                    <div className="mb-12">
                        <h1 className="text-4xl font-extrabold text-white tracking-tight">Strangy</h1>
                    </div>

                    {!showOptions && lastUser && view === 'social' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Last User Card */}
                            <button
                                onClick={handleLastUserLogin}
                                disabled={loading}
                                className="w-full bg-[#7c66f5] hover:bg-[#8d79f7] border border-white/10 rounded-[2rem] p-4 flex items-center gap-4 transition-all group mb-8 shadow-xl"
                            >
                                <div className="relative">
                                    <div className="w-14 h-14 rounded-full overflow-hidden bg-orange-500 flex items-center justify-center text-white text-2xl font-bold border-2 border-white/20">
                                        {lastUser.photoURL ? (
                                            <img src={lastUser.photoURL} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span>{lastUser.displayName?.charAt(0) || 'V'}</span>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full p-1 shadow-lg">
                                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="" className="w-full h-full" />
                                    </div>
                                </div>
                                <div className="text-left flex-1 overflow-hidden">
                                    <h3 className="text-white font-bold text-lg truncate">{lastUser.displayName || 'User'}</h3>
                                    <p className="text-white/60 text-sm truncate">{lastUser.email}</p>
                                </div>
                                <div className="text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </div>
                            </button>

                            <button
                                onClick={() => setShowOptions(true)}
                                className="text-white/80 hover:text-white text-lg font-bold underline underline-offset-4 transition-colors"
                            >
                                More sign-in options
                            </button>
                        </div>
                    ) : view === 'social' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Connect with Google Main Button */}
                            <button
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                className="w-full bg-white text-gray-900 font-black py-4 rounded-full text-xl hover:bg-gray-100 transition-all mb-8 shadow-xl flex items-center justify-center gap-3"
                            >
                                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                                {loading ? 'CONNECTING...' : 'Connect with Google'}
                            </button>

                            {/* Divider */}
                            <div className="flex items-center gap-4 mb-8">
                                <div className="h-px flex-1 bg-white/20"></div>
                                <span className="text-white/40 font-bold text-sm tracking-widest">OR</span>
                                <div className="h-px flex-1 bg-white/20"></div>
                            </div>

                            {/* Social Grid */}
                            <div className="flex justify-center gap-8 mb-10">
                                {[
                                    { 
                                        id: 'facebook', 
                                        Icon: RiFacebookFill,
                                        colorClass: 'text-white',
                                        label: 'Facebook',
                                        onClick: () => toast.success('Facebook login coming soon!')
                                    },
                                    { 
                                        id: 'email', 
                                        Icon: RiMailFill,
                                        colorClass: 'text-white',
                                        label: 'Email', 
                                        onClick: () => switchView('email-login') 
                                    }
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={item.onClick}
                                        className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all border border-white/10 group shadow-xl"
                                        title={item.label}
                                    >
                                        <item.Icon 
                                            className={`w-8 h-8 transition-transform group-hover:scale-110 ${item.colorClass}`}
                                        />
                                    </button>
                                ))}
                            </div>

                            {/* Checkboxes */}
                            <div className="space-y-4 text-left">
                                <label className="flex items-start gap-3 cursor-pointer group text-white/70 hover:text-white transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={ageChecked}
                                        onChange={(e) => setAgeChecked(e.target.checked)}
                                        className="mt-1 w-5 h-5 rounded border-white/20 bg-white/10 checked:bg-white checked:border-white transition-all cursor-pointer"
                                    />
                                    <span className="text-sm font-medium leading-tight pt-1">
                                        I am at least 18 years old.
                                    </span>
                                </label>

                                <label className="flex items-start gap-3 cursor-pointer group text-white/70 hover:text-white transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={termsChecked}
                                        onChange={(e) => setTermsChecked(e.target.checked)}
                                        className="mt-1 w-5 h-5 rounded border-white/20 bg-white/10 checked:bg-white checked:border-white transition-all cursor-pointer"
                                    />
                                    <span className="text-sm font-medium leading-tight pt-1">
                                        I have read and agree to the <button className="underline font-bold">Terms of Service</button> and <button className="underline font-bold">Privacy Policy</button>.
                                    </span>
                                </label>
                            </div>
                        </div>
                    ) : view === 'email-login' ? (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-2xl font-bold text-white mb-6">Welcome Back</h2>
                            <form onSubmit={handleEmailLogin} className="space-y-4">
                                <input
                                    type="email"
                                    placeholder="Email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-colors"
                                    required
                                />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-colors"
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-white text-gray-900 font-bold py-3.5 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-70 mt-4"
                                >
                                    {loading ? 'Logging in...' : 'Log In'}
                                </button>
                            </form>
                            
                            <div className="mt-6 space-y-3">
                                <p className="text-white/60 text-sm">
                                    Don't have an account?{' '}
                                    <button onClick={() => switchView('email-signup')} className="text-white font-bold hover:underline">
                                        Sign up
                                    </button>
                                </p>
                                <button
                                    onClick={() => switchView('social')}
                                    className="text-white/40 hover:text-white text-sm transition-colors flex items-center justify-center gap-2 mx-auto"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    Back to options
                                </button>
                            </div>
                        </div>
                    ) : view === 'email-signup' ? (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-2xl font-bold text-white mb-6">Create Account</h2>
                            <form onSubmit={handleEmailSignup} className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Full Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-colors"
                                    required
                                />
                                <input
                                    type="email"
                                    placeholder="Email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-colors"
                                    required
                                />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-colors"
                                    required
                                />

                                {/* Checkboxes for Signup */}
                                <div className="space-y-3 text-left pt-2 pb-2">
                                    <label className="flex items-start gap-3 cursor-pointer group text-white/70 hover:text-white transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={ageChecked}
                                            onChange={(e) => setAgeChecked(e.target.checked)}
                                            className="mt-1 w-5 h-5 rounded border-white/20 bg-white/10 checked:bg-white checked:border-white transition-all cursor-pointer"
                                        />
                                        <span className="text-xs font-medium pt-1">
                                            I am at least 18 years old.
                                        </span>
                                    </label>

                                    <label className="flex items-start gap-3 cursor-pointer group text-white/70 hover:text-white transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={termsChecked}
                                            onChange={(e) => setTermsChecked(e.target.checked)}
                                            className="mt-1 w-5 h-5 rounded border-white/20 bg-white/10 checked:bg-white checked:border-white transition-all cursor-pointer"
                                        />
                                        <span className="text-xs font-medium pt-1">
                                            I agree to the Terms of Service & Privacy Policy.
                                        </span>
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-white text-gray-900 font-bold py-3.5 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-70 mt-2"
                                >
                                    {loading ? 'Creating...' : 'Sign Up'}
                                </button>
                            </form>
                            
                            <div className="mt-6 space-y-3">
                                <p className="text-white/60 text-sm">
                                    Already have an account?{' '}
                                    <button onClick={() => switchView('email-login')} className="text-white font-bold hover:underline">
                                        Log in
                                    </button>
                                </p>
                                <button
                                    onClick={() => switchView('social')}
                                    className="text-white/40 hover:text-white text-sm transition-colors flex items-center justify-center gap-2 mx-auto"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    Back to options
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {/* Footer Spacer */}
                    <div className="mt-12"></div>
                </div>
            </div>

            {/* Gender Modal Integration */}
            <GenderModal
                isOpen={isGenderModalOpen}
                onSelect={onGenderSelect}
                onClose={() => setIsGenderModalOpen(false)}
            />
        </>
    );
};

export default LoginModal;
