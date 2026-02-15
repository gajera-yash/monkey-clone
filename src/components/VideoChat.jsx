import React, { useState, useEffect, useRef, useCallback } from 'react';
import socket from '../utils/socket';
import PermissionModal from './PermissionModal';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
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
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [status, setStatus] = useState('Initializing...');

  const performJoin = useCallback(() => {
    if (hasEmittedJoin.current) return;
    if (socket.connected && stream) {
      hasEmittedJoin.current = true;
      setStatus('Searching for partner...');
      socket.emit('join-waiting', userName);
    } else {
      if (!stream) setStatus('Waiting for camera...');
      else if (!socket.connected) setStatus('Connecting to server...');
    }
  }, [stream, userName]);

  const requestMedia = useCallback(async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      if (localVideoRef.current) localVideoRef.current.srcObject = mediaStream;
      setShowPermissionModal(false);
    } catch (err) {
      setError("Please allow camera and microphone access.");
      setShowPermissionModal(true);
    }
  }, []);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    requestMedia();
  }, [requestMedia]);

  useEffect(() => {
    performJoin();
  }, [performJoin]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    const handleMatched = async ({ roomId, initiator, partnerName }) => {
      roomIdRef.current = roomId;
      setPartnerName(partnerName || 'Stranger');
      setStatus('Connected');

      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnection.current = pc;

      if (stream) {
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
      }

      pc.ontrack = (e) => setRemoteStream(e.streams[0]);
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
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
      setRemoteStream(null);
      setPartnerName(null);
      hasEmittedJoin.current = false;
      performJoin();
    };

    socket.on('matched', handleMatched);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIce);
    socket.on('partner-disconnected', handleDisconnect);

    return () => {
      socket.off('matched');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('partner-disconnected');
    };
  }, [stream]);

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

  const endCall = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (stream) stream.getTracks().forEach(t => t.stop());
    socket.emit('leave-room', { roomId: roomIdRef.current });
    onEndChat();
  };

  return (
    <div className="relative w-full h-[100dvh] bg-dark-900 overflow-hidden flex flex-col md:flex-row">
      <PermissionModal isOpen={showPermissionModal} onGrant={requestMedia} error={error} />

      {/* Remote Video (Main) */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        {remoteStream ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="text-center">
            <div className="inline-block p-4 rounded-full bg-white/5 backdrop-blur-lg mb-4 animate-pulse">
              <span className="text-4xl">🔍</span>
            </div>
            <p className="text-gray-400 font-medium tracking-wide animate-pulse">{status}</p>
          </div>
        )}

        {/* Status Badge */}
        {partnerName && (
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-black/40 backdrop-blur-md border border-white/10 px-6 py-2 rounded-full flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-white font-medium text-sm">Chatting with {partnerName}</span>
          </div>
        )}
      </div>

      {/* Local Video (Floating or Sidebar) */}
      <div className="absolute top-6 right-6 w-32 md:w-64 aspect-[3/4] md:aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 z-20 transition-all hover:scale-105">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${!isCamOn ? 'hidden' : ''}`}
        />
        {!isCamOn && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
            <span className="text-2xl">📷</span>
          </div>
        )}
        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-white font-medium">
          You
        </div>
      </div>

      {/* Controls Bar */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4 z-50 bg-black/40 backdrop-blur-xl border border-white/10 p-2 rounded-full shadow-2xl">

        <button
          onClick={() => setIsMicOn(!isMicOn)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isMicOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500 text-white'}`}
        >
          {isMicOn ? '🎤' : '🔇'}
        </button>

        <button
          onClick={() => setIsCamOn(!isCamOn)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isCamOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500 text-white'}`}
        >
          {isCamOn ? '📹' : '📷'}
        </button>

        <div className="w-px h-8 bg-white/10 mx-2"></div>

        <button
          onClick={handleNext}
          className="px-6 py-3 bg-white text-dark-900 rounded-full font-bold hover:bg-gray-200 transition-all active:scale-95 flex items-center gap-2"
        >
          <span>Next</span>
          <span>⏭️</span>
        </button>

        <button
          onClick={endCall}
          className="w-12 h-12 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 rounded-full flex items-center justify-center transition-all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
};

export default VideoChat;
