import React, { useRef, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../supabase";
import toast from "react-hot-toast";
import * as faceapi from 'face-api.js';

const FaceVerification = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [detectedGender, setDetectedGender] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Load Models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
        console.log("Models Loaded Successfully");
      } catch (err) {
        console.error("Error loading face-api models:", err);
        toast.error("AI Models failed to load. Check internet.");
      }
    };
    loadModels();
  }, []);

  // START CAMERA
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setCameraActive(true);
      }
    } catch (err) {
      toast.error("Camera access denied.");
      console.error(err);
    }
  };

  // STOP CAMERA
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setCameraActive(false);
    }
  }, [stream]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // CAPTURE PHOTO
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");

    // Mirror image
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // AI Detection
    const detections = await faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withAgeAndGender();

    if (!detections) {
      toast.error("No face detected. Please try again.");
      return;
    }

    setDetectedGender(detections.gender);
    console.log("Detected:", detections.gender);

    // Resize and set image
    const MAX_W = 640;
    const MAX_H = 640;
    const scale = Math.min(MAX_W / canvas.width, MAX_H / canvas.height, 1);

    const compressed = document.createElement("canvas");
    compressed.width = Math.round(canvas.width * scale);
    compressed.height = Math.round(canvas.height * scale);

    const cctx = compressed.getContext("2d");
    cctx.drawImage(canvas, 0, 0, compressed.width, compressed.height);

    const imageDataUrl = compressed.toDataURL("image/jpeg", 0.7);

    setCapturedImage(imageDataUrl);
    stopCamera();

    if (detections.gender === 'male') {
      toast.error("Female only verification required!", { duration: 4000 });
    } else {
      toast.success("Identity Verified!", { icon: '✨' });
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setDetectedGender(null);
    startCamera();
  };

  // SUBMIT PHOTO
  const submitPhoto = async () => {
    if (!capturedImage) return;
    if (!currentUser?.uid) {
      toast.error("Login required");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading("Verifying face...");

    try {
      const fileName = `${currentUser.uid}/face_${Date.now()}.jpg`;

      // Convert base64 to blob
      const res = await fetch(capturedImage);
      const blob = await res.blob();

      // 1. Upload image to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('verifications')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('verifications')
        .getPublicUrl(fileName);

      // 3. Insert into verifications table
      const { error: dbError } = await supabase
        .from('verifications')
        .insert({
          user_id: currentUser.uid,
          face_url: publicUrl,
          status: "pending"
        });

      if (dbError) throw dbError;

      toast.success("Face verified!", { id: toastId });
      navigate("/creator/verify/voice");
    } catch (error) {
      console.error("Verification Error:", error);
      let errorMessage = error.message || "Face Verification failed";

      if (errorMessage.includes("bucket_not_found") || errorMessage.includes("Bucket not found")) {
        errorMessage = "Storage Bucket 'verifications' not found. Please create it in Supabase dashboard.";
      }

      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <h2 className="text-3xl font-black mb-2">Face Verification</h2>

        <p className="text-gray-400 text-sm mb-8">
          Make sure your face is clearly visible.
        </p>

        <div className="relative w-full aspect-[3/4] bg-dark-800 rounded-3xl overflow-hidden mb-8 border border-white/10 shadow-2xl">
          {!modelsLoaded && (
            <div className="absolute inset-0 bg-dark-900/80 flex flex-col items-center justify-center z-20">
              <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-pink-400 font-bold">Loading AI System...</p>
            </div>
          )}

          <div className="relative w-full h-full">
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />

                {/* face guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={`w-64 h-80 border-2 border-dashed rounded-[50px] transition-all duration-500 ${isUploading ? 'border-pink-500' : 'border-white/20'}`}></div>
                </div>
              </>
            ) : (
              <div className="relative w-full h-full">
                <img
                  src={capturedImage}
                  alt="Captured"
                  className={`w-full h-full object-cover ${detectedGender === 'male' ? 'grayscale opacity-50' : ''}`}
                />
                {detectedGender === 'male' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-900/40 backdrop-blur-sm">
                    <div className="text-white text-center p-4">
                      <span className="text-5xl mb-2 block">🚫</span>
                      <p className="text-xl font-black uppercase tracking-widest">Male Detected</p>
                      <p className="text-sm opacity-80">Only female creators allowed</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>

        {!capturedImage ? (
          <button
            onClick={capturePhoto}
            disabled={!cameraActive || !modelsLoaded}
            className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center transition-all ${!modelsLoaded ? 'opacity-20' : 'bg-white hover:scale-105 active:scale-95 shadow-xl shadow-white/10'}`}
          >
            <div className="w-20 h-20 rounded-full border-4 border-black flex items-center justify-center">
              <div className="w-12 h-12 bg-black/5 rounded-full"></div>
            </div>
          </button>
        ) : (
          <div className="flex flex-col gap-4">
            {detectedGender === 'male' && (
              <p className="text-red-400 text-sm font-bold bg-red-400/10 py-3 rounded-xl border border-red-400/20">
                AI has restricted this account. Only females can apply.
              </p>
            )}
            <div className="flex gap-4 w-full">
              <button
                onClick={retakePhoto}
                disabled={isUploading}
                className="flex-1 py-4 bg-gray-800 rounded-2xl font-bold hover:bg-gray-700 transition-colors"
              >
                Retake
              </button>

              <button
                onClick={submitPhoto}
                disabled={isUploading || detectedGender === 'male'}
                className={`flex-1 py-4 rounded-2xl font-bold transition-all ${detectedGender === 'male'
                  ? 'bg-gray-700 cursor-not-allowed text-gray-400'
                  : 'bg-pink-500 hover:bg-pink-400 shadow-lg shadow-pink-500/20'
                  }`}
              >
                {isUploading ? "Uploading..." : "Verify Identity"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FaceVerification;