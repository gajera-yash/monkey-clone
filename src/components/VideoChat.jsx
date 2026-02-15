import React, { useState, useEffect, useRef, useCallback } from 'react';
import socket from '../utils/socket';
import PermissionModal from './PermissionModal';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.ekiga.net' },
    { urls: 'stun:stun.ideasip.com' },
    { urls: 'stun:stun.schlund.de' },
    { urls: 'stun:stun.voiparound.com' },
    { urls: 'stun:stun.voipbuster.com' },
    { urls: 'stun:stun.voipstunt.com' },
    { urls: 'stun:stun.voxgratia.org' }
  ]
};

const VideoChat = ({ onEndChat, userName }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const roomIdRef = useRef(null);
  const hasEmittedJoin = useRef(false);

  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [partnerName, setPartnerName] = useState(null);
  const [error, setError] = useState(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false); // Default to false, trigger on need
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [timer, setTimer] = useState(0);
  const [status, setStatus] = useState('Initializing...');
  const [debugInfo, setDebugInfo] = useState({ socketId: '', waitingCount: 0 });

  // 1. Join Logic - The "Source of Truth" for entering the pool
  const performJoin = useCallback(() => {
    if (hasEmittedJoin.current) return;

    if (socket.connected && stream) {
      console.log("--- JOINING WAITING POOL NOW ---");
      hasEmittedJoin.current = true;
      setStatus('Searching for partner...');
      socket.emit('join-waiting', userName);
    } else {
      console.log("Join deferred: ", { socket: socket.connected, stream: !!stream });
      if (!stream) setStatus('Waiting for camera...');
      else if (!socket.connected) setStatus('Connecting to server...');
    }
  }, [stream, userName]);

  // 2. Timer Effect
  useEffect(() => {
    let interval;
    if (status === 'Connected') {
      interval = setInterval(() => setTimer(prev => prev + 1), 1000);
    } else {
      setTimer(0);
    }
    return () => clearInterval(interval);
  }, [status]);

  // 3. Media & Socket Init
  const requestMedia = useCallback(async () => {
    setError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("navigator.mediaDevices is undefined. Are you on HTTPS or localhost?");
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      if (localVideoRef.current) localVideoRef.current.srcObject = mediaStream;
      setShowPermissionModal(false); // Close modal on success
    } catch (err) {
      console.error("Media error:", err);
      let errorMessage = `Camera Error: ${err.name}`;
      if (err.message.includes("navigator.mediaDevices is undefined")) {
        errorMessage = "Browser denied camera access. (Insecure Context?)";
      } else if (err.name === 'NotAllowedError') {
        errorMessage = "Permission denied. Please allow camera access.";
      } else if (err.name === 'NotFoundError') {
        errorMessage = "No camera or microphone found.";
      }

      setError(errorMessage);
      setShowPermissionModal(true); // Show modal on error to allow retry
    }
  }, []);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    // Check if we already have permissions or need to ask
    navigator.permissions?.query({ name: 'camera' }).then(permissionStatus => {
      if (permissionStatus.state === 'granted') {
        requestMedia();
      } else {
        setShowPermissionModal(true); // Ask nicely first
      }
    }).catch(() => {
      // Fallback for browsers that don't support permission query (like Firefox sometimes)
      // or just try to get media
      requestMedia();
    });

    return () => {
      // Cleanup stream on unmount
    };
  }, [requestMedia]);

  // 4. Trigger Join whenever readiness changes
  useEffect(() => {
    performJoin();
  }, [performJoin]);

  // 6. Attach Remote Stream to Video Element (Fix for black screen)
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      console.log("Attaching remote stream to video element");
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // 5. Signaling & Connection Logic
  useEffect(() => {
    const handleConnect = () => {
      console.log("Socket connected event received");
      setDebugInfo(prev => ({ ...prev, socketId: socket.id }));
      performJoin();
    };

    const handleMatched = async ({ roomId, initiator, partnerName }) => {
      console.log("MATCHED! Partner:", partnerName);
      roomIdRef.current = roomId;
      setPartnerName(partnerName || 'Stranger');
      setStatus('Connected');

      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnection.current = pc;

      if (stream) {
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
      }

      pc.ontrack = (e) => {
        setRemoteStream(e.streams[0]);
        // Ref is likely null here because video isn't rendered yet (it waits for remoteStream state)
      };



      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('ice-candidate', { candidate: e.candidate, roomId });
      };

      if (initiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { offer, roomId });
      }
    };

    const handleOffer = async (offer) => {
      const pc = peerConnection.current;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { answer, roomId: roomIdRef.current });
      }
    };

    const handleAnswer = async (answer) => {
      const pc = peerConnection.current;
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const handleIce = (candidate) => {
      const pc = peerConnection.current;
      if (pc) pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => { });
    };

    const handleDisconnect = () => {
      console.log("Partner disconnected");
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
      setRemoteStream(null);
      setPartnerName(null);
      hasEmittedJoin.current = false;
      performJoin();
    };

    socket.on('connect', handleConnect);
    socket.on('matched', handleMatched);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIce);
    socket.on('partner-disconnected', handleDisconnect);
    socket.on('waiting-count', (count) => setDebugInfo(prev => ({ ...prev, waitingCount: count })));

    if (socket.connected) {
      setDebugInfo(prev => ({ ...prev, socketId: socket.id }));
      performJoin();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('matched', handleMatched);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIce);
      socket.off('partner-disconnected', handleDisconnect);
      socket.off('waiting-count');
    };
  }, [stream, performJoin]);

  const endCall = useCallback(() => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (stream) stream.getTracks().forEach(t => t.stop());
    socket.emit('leave-room', { roomId: roomIdRef.current });
    onEndChat();
  }, [stream, onEndChat]);

  const handleNext = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setRemoteStream(null);
    setPartnerName(null);
    socket.emit('leave-room', { roomId: roomIdRef.current });
    roomIdRef.current = null;
    hasEmittedJoin.current = false;
    performJoin();
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden flex flex-col">
      <PermissionModal
        isOpen={showPermissionModal}
        onGrant={requestMedia}
        error={error}
      />

      <div className="absolute inset-0 flex items-center justify-center bg-black">
        {remoteStream ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="text-center text-white/50">
            <div className="text-6xl mb-4 animate-pulse">👤</div>
            <p className="text-xl font-light tracking-wide">{status}</p>
          </div>
        )}
        {partnerName && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/60 px-4 py-1 rounded-full text-white font-bold text-lg backdrop-blur-sm z-30">
            Talking to: {partnerName}
          </div>
        )}
      </div>

      <div className="absolute top-0 left-0 w-full p-4 flex justify-center z-10 bg-gradient-to-b from-black/50 to-transparent">
        <div className="bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 text-white flex items-center space-x-4">
          <span className={`w-2 h-2 rounded-full ${status === 'Connected' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></span>
          <span className="font-mono">{formatTime(timer)}</span>
          <span className="text-white/30">|</span>
          <span className="text-sm text-purple-200">{debugInfo.waitingCount} waiting</span>
          <span className="text-white/30">|</span>
          <span className="text-xs text-gray-400">{debugInfo.socketId ? `ID: ${debugInfo.socketId.slice(0, 4)}` : 'No ID'}</span>
        </div>
      </div>

      {error && !showPermissionModal && <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white px-6 py-3 rounded-lg shadow-xl z-50 text-center"><p>{error}</p></div>}

      <div className="absolute bottom-24 right-6 w-32 md:w-48 aspect-[3/4] bg-black rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 z-20">
        <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${!isCamOn ? 'hidden' : ''}`} />
        {!isCamOn && <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white"><span className="text-2xl">Option 📵</span></div>}
        <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-0.5 rounded text-xs text-white font-medium">You ({userName || 'You'})</div>
      </div>

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 z-30">
        <button onClick={endCall} className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" /></svg></button>
        <button onClick={() => setIsMicOn(!isMicOn)} className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${isMicOn ? 'bg-gray-700' : 'bg-red-500'}`}>{isMicOn ? '🎤' : '🔇'}</button>
        <button onClick={() => setIsCamOn(!isCamOn)} className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${isCamOn ? 'bg-gray-700' : 'bg-red-500'}`}>{isCamOn ? '📷' : '📵'}</button>
        <button onClick={handleNext} className="px-8 py-3 bg-white text-gray-900 rounded-full font-bold shadow-lg hover:bg-gray-100 transition-all active:scale-95">Next ⏭️</button>
      </div>
    </div>
  );
};

export default VideoChat;
