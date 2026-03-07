import React, { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { storage, db } from '../../firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const FaceVerification = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const { currentUser, setProfileInfo } = useAuth();
    const navigate = useNavigate();

    const [stream, setStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                setCameraActive(true);
            }
        } catch (err) {
            toast.error("Camera access denied or unavailable.");
            console.error(err);
        }
    };

    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            setCameraActive(false);
        }
    }, [stream]);

    // Cleanup on unmount
    React.useEffect(() => {
        startCamera();
        return () => stopCamera();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        // Mirror image
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageDataUrl);
        stopCamera();
    };

    const retakePhoto = () => {
        setCapturedImage(null);
        startCamera();
    };

    const submitPhoto = async () => {
        if (!capturedImage) return;
        if (!currentUser?.uid) {
            toast.error("You must be logged in.");
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading("Uploading face verification...");

        try {
            // 1. Upload to Storage
            const storageRef = ref(storage, `creator-verification/${currentUser.uid}/face.jpg`);
            await uploadString(storageRef, capturedImage, 'data_url');
            const downloadURL = await getDownloadURL(storageRef);

            // 2. Create Verifications Document
            const verificationRef = doc(db, 'creatorVerifications', currentUser.uid);
            await setDoc(verificationRef, {
                creatorId: currentUser.uid,
                faceImage: downloadURL,
                status: 'pending',
                submittedAt: serverTimestamp()
            }, { merge: true });

            toast.success("Face verified successfully!", { id: toastId });
            navigate('/creator/verify/voice');

        } catch (error) {
            console.error("Upload failed", error);
            toast.error("Verification upload failed.", { id: toastId });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark-900 text-white flex flex-col items-center justify-center p-6 relative">
            <div className="max-w-md w-full relative z-10 text-center">
                <h2 className="text-3xl font-black mb-2">Face Verification</h2>
                <p className="text-gray-400 text-sm mb-8">Please make sure your face is clearly visible in the camera frame.</p>

                <div className="relative w-full aspect-[3/4] bg-dark-800 rounded-3xl overflow-hidden mb-8 border-2 border-white/10 shadow-2xl">
                    {!capturedImage ? (
                        <>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover transform -scale-x-100"
                            />
                            {/* Overlay mask for face */}
                            <div className="absolute inset-0 border-[40px] border-dark-900/50 rounded-3xl pointer-events-none"></div>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-48 h-64 border-2 border-dashed border-accent-pink/50 rounded-[40px]"></div>
                            </div>
                        </>
                    ) : (
                        <img src={capturedImage} alt="Captured face" className="w-full h-full object-cover" />
                    )}

                    {/* Hidden canvas for capturing */}
                    <canvas ref={canvasRef} className="hidden" />
                </div>

                {!capturedImage ? (
                    <button
                        onClick={capturePhoto}
                        disabled={!cameraActive}
                        className="w-20 h-20 rounded-full bg-white flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(255,255,255,0.3)] active:scale-95 transition-transform disabled:opacity-50"
                    >
                        <div className="w-16 h-16 rounded-full border-4 border-dark-900"></div>
                    </button>
                ) : (
                    <div className="flex gap-4">
                        <button
                            onClick={retakePhoto}
                            disabled={isUploading}
                            className="flex-1 py-4 bg-dark-800 rounded-2xl font-bold border border-white/10 hover:bg-white/5 disabled:opacity-50"
                        >
                            Retake
                        </button>
                        <button
                            onClick={submitPhoto}
                            disabled={isUploading}
                            className="flex-1 py-4 bg-gradient-to-r from-accent-pink to-accent-purple rounded-2xl font-bold shadow-lg shadow-accent-purple/30 disabled:opacity-50 flex items-center justify-center"
                        >
                            {isUploading ? (
                                <span className="animate-spin text-xl">⏳</span>
                            ) : (
                                "Looks Good"
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FaceVerification;
