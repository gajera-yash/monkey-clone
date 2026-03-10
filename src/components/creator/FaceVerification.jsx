import React, { useRef, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../supabase";
import toast from "react-hot-toast";

const FaceVerification = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

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
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");

    // Mirror image
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Resize to 320x320
    const MAX_W = 320;
    const MAX_H = 320;

    const scale = Math.min(MAX_W / canvas.width, MAX_H / canvas.height, 1);

    const compressed = document.createElement("canvas");
    compressed.width = Math.round(canvas.width * scale);
    compressed.height = Math.round(canvas.height * scale);

    const cctx = compressed.getContext("2d");
    cctx.drawImage(canvas, 0, 0, compressed.width, compressed.height);

    const imageDataUrl = compressed.toDataURL("image/jpeg", 0.3);

    setCapturedImage(imageDataUrl);
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedImage(null);
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
      const errorMessage = error.message || "Face Verification failed";
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

        <div className="relative w-full aspect-[3/4] bg-dark-800 rounded-3xl overflow-hidden mb-8 border border-white/10">

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
                <div className="w-48 h-64 border-2 border-dashed border-pink-400 rounded-[40px]"></div>
              </div>
            </>
          ) : (
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {!capturedImage ? (
          <button
            onClick={capturePhoto}
            disabled={!cameraActive}
            className="w-20 h-20 rounded-full bg-white mx-auto flex items-center justify-center"
          >
            <div className="w-16 h-16 rounded-full border-4 border-black"></div>
          </button>
        ) : (
          <div className="flex gap-4">
            <button
              onClick={retakePhoto}
              disabled={isUploading}
              className="flex-1 py-4 bg-gray-800 rounded-2xl"
            >
              Retake
            </button>

            <button
              onClick={submitPhoto}
              disabled={isUploading}
              className="flex-1 py-4 bg-pink-500 rounded-2xl"
            >
              {isUploading ? "Uploading..." : "Looks Good"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FaceVerification;