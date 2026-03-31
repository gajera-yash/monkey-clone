import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabase';
import toast from 'react-hot-toast';
import { analyzeVoiceGender } from '../../utils/voiceGenderDetection';

const VoiceVerification = () => {
    const { currentUser, updateProfileInfo, refreshProfile, logout } = useAuth();
    const navigate = useNavigate();

    const handleExit = async () => {
        await logout();
        navigate('/');
    };
    const location = useLocation();

    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [voiceResult, setVoiceResult] = useState(null); // { gender, pitchHz, confidence }

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerIntervalRef = useRef(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());

                // --- Run Voice AI Analysis automatically after recording ---
                setIsAnalyzing(true);
                try {
                    const result = await analyzeVoiceGender(blob);
                    setVoiceResult(result);
                    if (result.gender === 'female') {
                        toast.success(`Female voice detected! (${result.pitchHz}Hz)`, { icon: '✅' });
                    } else if (result.gender === 'male') {
                        toast.error(`Male voice detected (${result.pitchHz}Hz). You can retake.`, { duration: 4000 });
                    } else {
                        toast('Could not analyze voice clearly. Try recording again in a quiet place.', { icon: '⚠️' });
                    }
                } catch (err) {
                    console.error("Voice analysis error:", err);
                    setVoiceResult({ gender: 'unknown', pitchHz: 0, confidence: 0 });
                    toast('Voice analysis failed. You can still submit for manual review.', { icon: '⚠️' });
                } finally {
                    setIsAnalyzing(false);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            setVoiceResult(null);

            timerIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => {
                    if (prev >= 8) { // Max 8 seconds is enough
                        stopRecording();
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000);

        } catch (error) {
            console.error("Error accessing microphone:", error);
            if (error.name === 'NotAllowedError') {
                toast.error("Microphone blocked. Please allow access in browser settings.");
            } else if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
                toast.error("Microphone requires HTTPS or localhost.");
            } else {
                toast.error("Microphone error: " + (error.message || "Access Denied"));
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        }
    };

    const retakeAudio = () => {
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordingTime(0);
        setVoiceResult(null);
    };

    const submitAudio = async () => {
        if (!audioBlob || !currentUser?.uid) return;

        setIsUploading(true);
        const toastId = toast.loading("Finalizing your verification...");

        try {
            console.log("[VoiceSubmission] Step 1: Checking previous verification confidence...");
            // Face AI confidence from previous step
            const faceConfidence = location.state?.confidence || 0;
            const facePassedAsFemale = faceConfidence > 0.85;

            // Voice AI result from local analysis
            const voicePassedAsFemale = voiceResult?.gender === 'female' && voiceResult?.confidence > 0.55;

            // AUTO-APPROVE: Both Face AI AND Voice AI must confirm female
            const isAutoApproved = facePassedAsFemale && voicePassedAsFemale;

            const aiNotes = isAutoApproved
                ? `Auto-approved: Face AI ${Math.round(faceConfidence * 100)}% female + Voice AI ${voiceResult?.pitchHz}Hz (${Math.round((voiceResult?.confidence || 0) * 100)}% confidence)`
                : `Pending review: Face AI ${Math.round(faceConfidence * 100)}%${voiceResult ? `, Voice ${voiceResult.pitchHz}Hz (${voiceResult.gender})` : ', Voice not analyzed'}`;

            console.log("[VoiceSubmission] Step 2: Saving verification data to database...");
            // Update/Upsert the verification record (Sequential for better error tracing)
            const { error: verifyError } = await supabase
                .from('verifications')
                .upsert({
                    user_id: currentUser.uid,
                    status: isAutoApproved ? 'approved' : 'pending',
                    ai_notes: aiNotes,
                    ai_confidence: faceConfidence
                }, { onConflict: 'user_id' });

            if (verifyError) {
                console.error("[VoiceSubmission] Verification Table Error:", verifyError);
                throw verifyError;
            }

            console.log("[VoiceSubmission] Step 3: Updating user profile status...");
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ 
                    is_verified: isAutoApproved, 
                    account_status: isAutoApproved ? 'active' : 'pending', 
                    is_creator: true 
                })
                .eq('id', currentUser.uid);

            if (profileError) {
                console.error("[VoiceSubmission] Profile Update Error:", profileError);
                throw profileError;
            }

            console.log("[VoiceSubmission] Step 4: Verification data saved. Refreshing profile...");
            // Trigger profile refresh (non-blocking)
            refreshProfile(); 
            
            if (isAutoApproved) {
                toast.success("Identity Verified! Welcome! 🎉", { id: toastId });
                navigate('/creator/dashboard');
            } else {
                toast.success("Verification submitted! Awaiting admin review.", { id: toastId });
                navigate('/');
            }

            // BACKGROUND UPLOAD: Upload audio file AFTER user is already navigated
            console.log("[VoiceSubmission] Step 5: Starting background audio upload...");
            const fileName = `${currentUser.uid}/voice_${Date.now()}.webm`;
            supabase.storage
                .from('verifications')
                .upload(fileName, audioBlob, { contentType: 'audio/webm', upsert: true })
                .then(({ error: uploadError }) => {
                    if (uploadError) {
                        console.warn("Background voice upload failed:", uploadError.message);
                        return;
                    }
                    console.log("[VoiceSubmission] Audio upload successful.");
                    const { data: { publicUrl } } = supabase.storage
                        .from('verifications')
                        .getPublicUrl(fileName);
                    supabase.from('verifications')
                        .update({ voice_url: publicUrl })
                        .eq('user_id', currentUser.uid)
                        .then(() => console.log("[VoiceSubmission] Voice URL saved in background."));
                });

        } catch (error) {
            console.error("[VoiceSubmission] Critical Error:", error);
            let errorMessage = error.message || "Voice verification upload failed.";

            if (errorMessage.includes("bucket_not_found") || errorMessage.includes("Bucket not found")) {
                errorMessage = "Storage Bucket 'verifications' not found. Please ensure it exists in Supabase.";
            }

            toast.error(errorMessage, { id: toastId });
        } finally {
            setIsUploading(false);
        }
    };

    useEffect(() => {
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (isRecording) stopRecording();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-dark-900 text-white flex flex-col items-center justify-center p-6 relative">
            <button 
                onClick={handleExit}
                className="absolute top-6 left-6 flex items-center gap-2 text-gray-500 hover:text-white transition-colors uppercase font-black text-[10px] tracking-widest"
            >
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">✕</div>
                Exit
            </button>
            <div className="max-w-md w-full relative z-10 text-center">
                <div className="w-20 h-20 bg-dark-800 rounded-full mx-auto flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                    <span className="text-4xl">🎙️</span>
                </div>

                <h2 className="text-3xl font-black mb-2">Voice Verification</h2>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 text-left">
                    <p className="text-gray-400 text-sm mb-4">Please read the following sentence clearly to verify your voice:</p>
                    <p className="text-xl font-medium text-blue-300 italic border-l-4 border-blue-500 pl-4 py-2 bg-blue-500/10 rounded-r-lg">
                        "Hello, I am {currentUser?.displayName || 'verifying my account'} and I agree to the creator terms on Strangy."
                    </p>
                </div>

                <div className="mb-8">
                    {!audioBlob ? (
                        <div className="flex flex-col items-center">
                            <span className="text-4xl font-mono font-bold mb-4 text-gray-300">
                                {formatTime(recordingTime)}
                            </span>

                            <button
                                onClick={isRecording ? stopRecording : startRecording}
                                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${isRecording
                                    ? 'bg-red-500/20 border-4 border-red-500 animate-pulse'
                                    : 'bg-blue-500/20 border-4 border-blue-500 hover:scale-105'
                                    }`}
                            >
                                {isRecording ? (
                                    <div className="w-8 h-8 bg-red-500 rounded-md"></div>
                                ) : (
                                    <div className="w-8 h-8 bg-blue-500 rounded-full"></div>
                                )}
                            </button>
                            <p className="mt-4 text-sm text-gray-400">
                                {isRecording ? "Tap to stop recording" : "Tap to record"}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="w-full bg-dark-800 p-4 rounded-xl border border-white/10">
                                <audio src={audioUrl} controls className="w-full h-12 outline-none" />
                            </div>

                            {/* Voice AI Result Badge */}
                            {isAnalyzing && (
                                <div className="flex items-center justify-center gap-2 py-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                    <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-blue-300 text-sm font-bold">Analyzing voice...</span>
                                </div>
                            )}
                            {voiceResult && !isAnalyzing && (
                                <div className={`flex items-center justify-center gap-2 py-3 rounded-xl border ${
                                    voiceResult.gender === 'female' 
                                        ? 'bg-green-500/10 border-green-500/20 text-green-300' 
                                        : voiceResult.gender === 'male'
                                        ? 'bg-red-500/10 border-red-500/20 text-red-300'
                                        : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
                                }`}>
                                    <span className="text-lg">
                                        {voiceResult.gender === 'female' ? '✅' : voiceResult.gender === 'male' ? '🚫' : '⚠️'}
                                    </span>
                                    <span className="text-sm font-bold">
                                        {voiceResult.gender === 'female' 
                                            ? `Female Voice Detected (${voiceResult.pitchHz}Hz)`
                                            : voiceResult.gender === 'male'
                                            ? `Male Voice Detected (${voiceResult.pitchHz}Hz)`
                                            : 'Voice unclear — will be reviewed manually'}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {audioBlob && !isAnalyzing && (
                    <div className="flex flex-col gap-4">
                        {voiceResult?.gender === 'male' && (
                            <p className="text-red-400 text-sm font-bold bg-red-400/10 py-3 rounded-xl border border-red-400/20">
                                Male voice detected. You can retake or submit for manual review.
                            </p>
                        )}
                        <div className="flex gap-4">
                            <button
                                onClick={retakeAudio}
                                disabled={isUploading}
                                className="flex-1 py-4 bg-dark-800 rounded-2xl font-bold border border-white/10 hover:bg-white/5 disabled:opacity-50"
                            >
                                Retake
                            </button>
                            <button
                                onClick={submitAudio}
                                disabled={isUploading}
                                className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold shadow-lg shadow-blue-600/30 disabled:opacity-50 flex items-center justify-center transition-colors"
                            >
                                {isUploading ? (
                                    <span className="animate-spin text-xl">⏳</span>
                                ) : (
                                    "Submit Verification"
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VoiceVerification;
