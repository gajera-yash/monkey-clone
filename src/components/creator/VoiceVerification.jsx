import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { storage, db } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

const VoiceVerification = () => {
    const { currentUser, updateProfileInfo } = useAuth();
    const navigate = useNavigate();

    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);

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

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => {
                    if (prev >= 15) { // Max 15 seconds
                        stopRecording();
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000);

        } catch (error) {
            console.error("Error accessing microphone:", error);
            toast.error("Microphone access denied or unavailable.");
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
    };

    const submitAudio = async () => {
        if (!audioBlob || !currentUser?.uid) return;

        setIsUploading(true);
        const toastId = toast.loading("Uploading voice verification...");

        try {
            // 1. Upload to Storage
            const storageRef = ref(storage, `creator-verification/${currentUser.uid}/voice.webm`);
            await uploadBytes(storageRef, audioBlob);
            const downloadURL = await getDownloadURL(storageRef);

            // 2. Update Verifications Document
            const verificationRef = doc(db, 'creatorVerifications', currentUser.uid);
            await updateDoc(verificationRef, {
                voiceAudio: downloadURL,
                status: 'pending',
                updatedAt: serverTimestamp()
            });

            // 3. Mark profile verification level
            await updateProfileInfo({ verificationLevel: 1 });

            toast.success("Voice verified successfully!", { id: toastId });
            // Redirect to Dashboard
            navigate('/creator/dashboard');

        } catch (error) {
            console.error("Voice Upload failed", error);
            toast.error("Voice verification upload failed.", { id: toastId });
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
                        <div className="w-full bg-dark-800 p-4 rounded-xl border border-white/10">
                            <audio src={audioUrl} controls className="w-full h-12 outline-none" />
                        </div>
                    )}
                </div>

                {audioBlob && (
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
                )}
            </div>
        </div>
    );
};

export default VoiceVerification;
