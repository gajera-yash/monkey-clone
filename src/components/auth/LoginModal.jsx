import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import GenderModal from './GenderModal';
import { RiFacebookFill, RiMailFill } from "react-icons/ri";

const LoginModal = ({ isOpen, onClose }) => {
    const { loginWithGoogle, continueAsGuest, loginWithUserEmail, signUpWithEmail, verifyEmailOTP } = useAuth();
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
    const [otp, setOtp] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);

    // Get last logged user
    const lastUser = JSON.parse(localStorage.getItem('lastLoggedUser') || 'null');

    // Reset forms when switching views
    const switchView = (newView) => {
        setView(newView);
        if (newView !== 'verify-otp') {
            setEmail('');
            setPassword('');
            setName('');
        }
        setOtp('');
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
                    toast.success('Check your email for the 6-digit code!', { duration: 6000 });
                    setView('verify-otp');
                } else {
                    toast.success('Account created successfully!');
                    onClose();
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (otp.trim().length !== 6) {
            toast.error("Please enter the 6-digit code");
            return;
        }
        setOtpLoading(true);
        try {
            await verifyEmailOTP(email, otp);
            toast.success("Account verified! You are now logged in.");
            onClose();
        } catch (error) {
            // Error is handled in AuthContext toast
        } finally {
            setOtpLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (resendTimer > 0) return;
        
        setOtpLoading(true);
        try {
            await signUpWithEmail(email, password, name);
            toast.success("New code sent to your email!");
            setOtp('');
            setResendTimer(60); // Start 60s cooldown
        } catch (error) {
            console.error(error);
        } finally {
            setOtpLoading(false);
        }
    };

    // Resend Timer logic
    React.useEffect(() => {
        let interval;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

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

                    {/* App Logo */}
                    <div className="mb-12 flex justify-center">
                        <img src="/logo.png" alt="Strangy Logo" className="h-12 w-auto object-contain" />
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
                                        <svg viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                        </svg>
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
                                <svg viewBox="0 0 24 24" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                </svg>
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
                                        I have read and agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-white transition-colors">Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-white transition-colors">Privacy Policy</a>.
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
                                            I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-white transition-colors">Terms of Service</a> & <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-white transition-colors">Privacy Policy</a>.
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
                    ) : view === 'verify-otp' ? (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <h2 className="text-2xl font-bold text-white mb-2">Verify Email</h2>
                            <p className="text-white/60 text-sm mb-8">
                                Enter the 6-digit code sent to <br/>
                                <span className="text-white font-mono">{email}</span>
                            </p>
                            
                            <form onSubmit={handleVerifyOtp} className="space-y-6">
                                <div className="flex justify-center gap-2">
                                    <input
                                        type="text"
                                        maxLength="6"
                                        placeholder="000000"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                        className="w-full max-w-[200px] bg-black/20 border-2 border-white/10 rounded-2xl px-4 py-4 text-center text-3xl font-black tracking-[0.5em] text-white focus:outline-none focus:border-white/40 transition-all placeholder:text-white/10 placeholder:tracking-normal"
                                        autoFocus
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={otpLoading || otp.length !== 6}
                                    className="w-full bg-white text-gray-900 font-black py-4 rounded-2xl hover:bg-gray-100 transition-all shadow-xl disabled:opacity-50"
                                >
                                    {otpLoading ? 'VERIFYING...' : 'VERIFY & CONTINUE'}
                                </button>
                            </form>

                            <div className="mt-8 flex flex-col gap-4">
                                <button 
                                    onClick={handleResendOtp}
                                    disabled={otpLoading || resendTimer > 0}
                                    className={`font-bold transition-all ${resendTimer > 0 ? 'text-white/20 cursor-not-allowed' : 'text-white hover:underline'}`}
                                >
                                    {resendTimer > 0 ? `Resend Code in ${resendTimer}s` : 'Resend Code'}
                                </button>
                                <button 
                                    onClick={() => switchView('email-signup')}
                                    className="text-white/40 hover:text-white text-sm font-bold transition-colors"
                                >
                                    Wrong email? Go back
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
