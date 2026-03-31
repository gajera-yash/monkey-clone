import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabase';

const CreatorOnboarding = () => {
    const navigate = useNavigate();
    const { currentUser, logout } = useAuth();
    const [progress, setProgress] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkProgress = async () => {
            if (!currentUser?.uid) return;
            try {
                const { data, error } = await supabase
                    .from('verifications')
                    .select('face_url, voice_url, ai_confidence')
                    .eq('user_id', currentUser.uid)
                    .maybeSingle();

                if (error) throw error;
                setProgress(data);
            } catch (err) {
                console.error("[Onboarding] Error checking progress:", err);
            } finally {
                setLoading(false);
            }
        };

        checkProgress();
    }, [currentUser]);

    const handleExit = async () => {
        await logout();
        navigate('/');
    };

    const handleStart = () => {
        if (progress?.face_url && !progress?.voice_url) {
            // Resume at voice step
            navigate('/creator/verify/voice', { 
                state: { confidence: progress.ai_confidence || 0.9 } 
            });
        } else {
            // Start from beginning or restart if something went wrong
            navigate('/creator/verify/face');
        }
    };

    // Determine button text
    const isResuming = progress?.face_url && !progress?.voice_url;

    return (
        <div className="min-h-screen bg-dark-900 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-accent-pink/10 rounded-full blur-3xl -mx-20 -my-20"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl -mx-20 -my-20"></div>

            <div className="max-w-md w-full bg-dark-800/80 backdrop-blur-xl border border-white/10 p-8 rounded-[32px] shadow-2xl relative z-10 text-center">
                <div className="w-20 h-20 bg-gradient-to-tr from-accent-pink to-accent-purple rounded-full mx-auto flex items-center justify-center mb-6 shadow-lg shadow-accent-pink/20">
                    <span className="text-4xl text-white">
                        {loading ? '⏳' : (isResuming ? '🔄' : '✨')}
                    </span>
                </div>

                <h1 className="text-3xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                    {isResuming ? 'Continue Progress' : 'Become a Creator'}
                </h1>

                <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                    {isResuming 
                        ? 'We found your previous verification attempt! You have completed the Face scan. Please finish the last step (Voice) to get started.'
                        : 'Welcome to Strangy! Since you selected Female, you can monetize your time. Talk to users, receive gifts, and earn real money by becoming a verified creator.'
                    }
                </p>

                <div className="space-y-4 mb-8 text-left">
                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                        <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xl">💸</div>
                        <div>
                            <h3 className="font-bold text-sm">Earn per Minute</h3>
                            <p className="text-xs text-gray-500">Get paid for every minute you video chat.</p>
                        </div>
                    </div>
                    {isResuming && (
                        <div className="flex items-center gap-4 bg-green-500/10 p-4 rounded-2xl border border-green-500/20">
                            <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xl">✅</div>
                            <div>
                                <h3 className="font-bold text-sm text-green-400">Step 1: Face Verified</h3>
                                <p className="text-xs text-green-400/60">Photo scan completed successfully.</p>
                            </div>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleStart}
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-accent-pink to-accent-purple rounded-2xl font-bold text-white shadow-lg shadow-accent-purple/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                    {loading ? 'Checking Status...' : (isResuming ? 'Continue to Voice Scan' : 'Start Verification')}
                </button>

                <button
                    onClick={handleExit}
                    className="w-full mt-4 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-gray-400 hover:bg-white/10 transition-all uppercase tracking-widest text-[10px]"
                >
                    Exit & Logout
                </button>
            </div>
        </div>
    );
};

export default CreatorOnboarding;
