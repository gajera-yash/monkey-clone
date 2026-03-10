import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import GenderModal from './GenderModal';

const LoginModal = ({ isOpen, onClose }) => {
    const { loginWithGoogle, continueAsGuest } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [ageChecked, setAgeChecked] = useState(false);
    const [termsChecked, setTermsChecked] = useState(false);
    const [isGenderModalOpen, setIsGenderModalOpen] = useState(false);

    // Get last logged user
    const lastUser = JSON.parse(localStorage.getItem('lastLoggedUser') || 'null');

    const handleGoogleLogin = async () => {
        if (!ageChecked || !termsChecked) {
            toast.error("Please agree to the Terms and Age verification");
            return;
        }
        setIsGenderModalOpen(true);
    };

    const onGenderSelect = async (gender) => {
        setIsGenderModalOpen(false);
        localStorage.setItem('userGender', gender);
        setLoading(true);
        try {
            await loginWithGoogle();
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

                    {!showOptions && lastUser ? (
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
                    ) : (
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
                            <div className="grid grid-cols-4 gap-4 mb-10">
                                {[
                                    { icon: 'https://www.svgrepo.com/show/475647/facebook-color.svg', label: 'FB' },
                                    { icon: 'https://www.svgrepo.com/show/442911/apple-logo.svg', label: 'Apple', filter: 'brightness(0) invert(1)' },
                                    { icon: 'https://www.svgrepo.com/show/361343/tiktok-logo.svg', label: 'TikTok', filter: 'brightness(0) invert(1)' },
                                    { icon: 'https://www.svgrepo.com/show/349340/email-fill.svg', label: 'Email', filter: 'brightness(0) invert(1)' }
                                ].map((item, idx) => (
                                    <button
                                        key={idx}
                                        className="aspect-square rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all border border-white/10 group"
                                    >
                                        <img
                                            src={item.icon}
                                            alt={item.label}
                                            className="w-6 h-6 transition-transform group-hover:scale-110"
                                            style={{ filter: item.filter }}
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
                    )}

                    {/* Back to Home / Guest Link */}
                    <div className="mt-12">
                        <button
                            onClick={handleGuest}
                            className="text-white/40 hover:text-white text-sm font-bold tracking-wide uppercase transition-colors"
                        >
                            Continue as Guest &rarr;
                        </button>
                    </div>
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
