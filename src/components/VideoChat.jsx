import React, { useState, useEffect, useRef, useCallback } from 'react';
import socket from '../utils/socket';
import PermissionModal from './PermissionModal';
import ReportModal from './safety/ReportModal';
import { useAuth } from '../context/AuthContext';
import { useCoins } from '../context/CoinsContext';
import { usePremium } from '../context/PremiumContext';
import EmojiPicker from 'emoji-picker-react';
import { getLocationDisplay, getDistanceBetween } from '../utils/geolocation';
import toast from 'react-hot-toast';
import PremiumBadge from './premium/PremiumBadge';
import UserProfileMobile from './profile/UserProfileMobile';
import MatchHistoryMobile from './history/MatchHistoryMobile';
import DesktopHeader from './desktop/DesktopHeader';
import IdleDesktop from './desktop/IdleDesktop';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

const VideoChat = ({ onEndChat }) => {
  const { currentUser, blockedUsers, reportUser, userLocation, saveMatchToHistory } = useAuth();
  const { spendCoins } = useCoins();
  const { isPremium } = usePremium();

  const localVideoRef = useRef(null);
  const localVideoMobileRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const roomIdRef = useRef(null);
  const hasEmittedJoin = useRef(false);
  const userInitiatedJoin = useRef(false);
  const partnerIdRef = useRef(null);
  const scrollRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const notificationSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'));

  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [partnerName, setPartnerName] = useState(null);
  const [error, setError] = useState(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [status, setStatus] = useState('Idle');
  const [startTime, setStartTime] = useState(null);

  // Chat & Timer States
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [chatTimer, setChatTimer] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showMatchHistory, setShowMatchHistory] = useState(false);

  // Location States
  const [partnerLocation, setPartnerLocation] = useState(null);
  const [showCityName, setShowCityName] = useState(true);
  const [partnerIsPremium, setPartnerIsPremium] = useState(false);

  // Timer logic
  useEffect(() => {
    let interval;
    if (status === 'Connected' && roomIdRef.current) {
      interval = setInterval(() => {
        setChatTimer(prev => prev + 1);
      }, 1000);
    } else {
      setChatTimer(0);
    }
    return () => clearInterval(interval);
  }, [status]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const performJoin = useCallback(() => {
    if (hasEmittedJoin.current) return;
    if (!userInitiatedJoin.current) return; // Only join if user clicked Start
    if (socket.connected && stream && currentUser) {
      hasEmittedJoin.current = true;
      setStatus('Searching for partner...');
      socket.emit('join-waiting', {
        name: currentUser.displayName || 'Stranger',
        uid: currentUser.uid,
        blockedUsers: blockedUsers || [],
        location: userLocation,
        isPremium
      });
    } else {
      if (!stream) setStatus('Waiting for camera...');
      else if (!socket.connected) setStatus('Connecting to server...');
    }
  }, [stream, currentUser, blockedUsers, userLocation]);

  const handleStartChat = useCallback(() => {
    userInitiatedJoin.current = true;
    performJoin();
  }, [performJoin]);

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

  const handleNext = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setRemoteStream(null);
    setPartnerName(null);
    setPartnerLocation(null);
    setPartnerIsPremium(false);
    setMessages([]);
    setChatTimer(0);
    setIsPartnerTyping(false);
    partnerIdRef.current = null;
    if (roomIdRef.current) {
      socket.emit('leave-room', { roomId: roomIdRef.current });
      roomIdRef.current = null;
    }
    hasEmittedJoin.current = false;
    performJoin();
  };

  const sendMessage = (text, type = 'text') => {
    if (!roomIdRef.current) return;

    const messageData = {
      id: Date.now(),
      text,
      senderId: currentUser.uid,
      senderName: currentUser.displayName || 'Me',
      timestamp: new Date().toISOString(),
      type
    };

    socket.emit('send-message', { roomId: roomIdRef.current, message: messageData });
    setMessages(prev => [...prev, messageData]);
  };

  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim()) return;

    sendMessage(newMessage);
    setNewMessage('');
    setShowEmojiPicker(false);

    // Stop typing indicator
    socket.emit('typing', { roomId: roomIdRef.current, isTyping: false });
  };

  const sendGift = async (emoji, cost, name) => {
    if (status !== 'Connected') {
      toast.error("Find a partner first!");
      return;
    }

    const success = await spendCoins(cost, `Sent ${name} gift`);
    if (success) {
      sendMessage(`Sent a ${name} ${emoji}`, 'gift');
      toast.success(`Sent ${name}! -${cost} coins`);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!roomIdRef.current) return;

    socket.emit('typing', { roomId: roomIdRef.current, isTyping: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { roomId: roomIdRef.current, isTyping: false });
    }, 3000);
  };

  const onEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  const handleReportSubmit = async ({ reason, description }) => {
    if (partnerIdRef.current) {
      await reportUser(partnerIdRef.current, reason, description);
      handleNext(); // Skip after reporting
    }
  };

  useEffect(() => {
    if (!socket.connected) socket.connect();
    requestMedia();
  }, [requestMedia]);

  // Sync local stream to mobile video element
  useEffect(() => {
    if (localVideoMobileRef.current && stream) {
      localVideoMobileRef.current.srcObject = stream;
    }
  }, [stream, remoteStream]);

  // Cleanup on unmount (back button, navigation away)
  useEffect(() => {
    return () => {
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
      if (roomIdRef.current) {
        socket.emit('leave-room', { roomId: roomIdRef.current });
        roomIdRef.current = null;
      }
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      hasEmittedJoin.current = false;
      userInitiatedJoin.current = false;
    };
  }, [stream]);

  // Toggle Microphone
  useEffect(() => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = isMicOn;
      });
    }
  }, [isMicOn, stream]);

  // Toggle Camera
  useEffect(() => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = isCamOn;
      });
    }
  }, [isCamOn, stream]);

  // REMOVED: Auto-join on mount
  // useEffect(() => {
  //   performJoin();
  // }, [performJoin]);

  // Fix: Listen for socket connection to retry join if it wasn't ready initially
  useEffect(() => {
    const handleConnect = () => {
      console.log("Socket connected, retrying join...");
      performJoin();
    };

    socket.on('connect', handleConnect);

    return () => {
      socket.off('connect', handleConnect);
    };
  }, [performJoin]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isPartnerTyping]);

  useEffect(() => {
    const handleMatched = async ({ roomId, initiator, partnerName, partnerLocation, partnerIsPremium }) => {
      roomIdRef.current = roomId;
      setPartnerName(partnerName || 'Stranger');
      setPartnerLocation(partnerLocation || null);
      setPartnerIsPremium(partnerIsPremium || false);
      setStatus('Connected');
      setStartTime(Date.now());
      setMessages([]);
      setChatTimer(0);

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
      setMessages([]);
      setChatTimer(0);
      setIsPartnerTyping(false);
      partnerIdRef.current = null;
      hasEmittedJoin.current = false;
      performJoin();
    };

    const handleReceiveMessage = (message) => {
      setMessages(prev => [...prev, message]);
      // Increment unread count if chat is hidden
      setUnreadCount(prevCount => showChat ? 0 : prevCount + 1);
      notificationSound.current.play().catch(e => console.log("Sound play failed", e));
    };

    const handlePartnerTyping = (typing) => {
      setIsPartnerTyping(typing);
    };

    socket.on('matched', handleMatched);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIce);
    socket.on('partner-disconnected', handleDisconnect);
    socket.on('receive-message', handleReceiveMessage);
    socket.on('partner-typing', handlePartnerTyping);

    return () => {
      socket.off('matched');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('partner-disconnected');
      socket.off('receive-message');
      socket.off('partner-typing');
    };
  }, [stream, performJoin]);

  const endCall = () => {
    if (status === 'Connected' && partnerName) {
      const durationSec = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
      const minutes = Math.floor(durationSec / 60);
      const seconds = durationSec % 60;
      const durationStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      saveMatchToHistory({
        name: partnerName,
        location: partnerLocation ? getLocationDisplay(partnerLocation, true) : 'Unknown',
        duration: durationStr,
        avatar: partnerName.charAt(0).toUpperCase(),
        hasRecording: false
      });
    }

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (stream) stream.getTracks().forEach(t => t.stop());
    if (roomIdRef.current) socket.emit('leave-room', { roomId: roomIdRef.current });

    setStartTime(null);
    onEndChat();
  };

  return (
    <div className={`relative w-full h-[100dvh] overflow-hidden flex flex-col desktop-purple-bg ${status === 'Connected' ? 'md:grid md:grid-cols-[1fr_360px]' : ''}`}>
      {/* Background Patterns for Idle Desktop */}
      {status === 'Idle' && (
        <div className="absolute inset-0 hidden md:block opacity-20 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 transform -translate-x-1/2 -translate-y-1/2 rotate-12">
            <span className="text-[200px]">🐵</span>
          </div>
          <div className="absolute bottom-1/4 right-1/4 transform translate-x-1/2 translate-y-1/2 -rotate-12">
            <span className="text-[200px]">🐵</span>
          </div>
          <div className="absolute top-1/2 left-3/4 transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-8">
            <span className="text-[120px]">🐵</span>
            <span className="text-[120px]">🐵</span>
          </div>
        </div>
      )}

      {/* Desktop Header for Idle State */}
      {status === 'Idle' && (
        <div className="hidden md:block">
          <DesktopHeader />
        </div>
      )}

      <PermissionModal isOpen={false} onGrant={requestMedia} error={error} />
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleReportSubmit}
        reportedUserName={partnerName}
      />

      {/* Center Panel - Main Video Area */}
      <div className="flex-1 md:col-start-2 relative bg-black flex flex-col transition-all duration-300 border-r border-white/5">

        {/* Center Panel Content */}
        {status === 'Idle' ? (
          <>
            {/* ===== MOBILE IDLE SCREEN ===== */}
            <div className="flex-1 flex flex-col md:hidden relative overflow-hidden">
              {/* Camera Preview Background */}
              <div className="absolute inset-0 z-0">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${!isCamOn ? 'hidden' : ''}`}
                />
                {!isCamOn && (
                  <div className="absolute inset-0 bg-dark-900 flex items-center justify-center">
                    <span className="text-6xl">📷</span>
                  </div>
                )}
                {/* Dark overlay for readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60"></div>
              </div>

              {/* Top Bar */}
              <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2">
                {/* Verified badge */}
                <div className="w-9 h-9 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                  <span className="text-green-400 text-sm">✅</span>
                </div>

                {/* SOLO / SQUAD Toggle */}
                <div className="bg-white/10 p-1 rounded-full flex items-center backdrop-blur-md border border-white/10">
                  <button className="px-5 py-1.5 rounded-full bg-yellow-400 text-black font-bold text-xs shadow-lg shadow-yellow-400/20">
                    SOLO
                  </button>
                  <button className="px-5 py-1.5 rounded-full text-gray-400 font-bold text-xs hover:text-white transition-colors">
                    SQUAD
                  </button>
                </div>

                {/* Profile Avatar */}
                <button
                  onClick={() => setShowProfile(true)}
                  className="relative"
                >
                  {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="" className="w-9 h-9 rounded-full border-2 border-accent-pink object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-accent-pink flex items-center justify-center text-sm font-bold">
                      {currentUser?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                </button>
              </div>

              {/* Left Sidebar Icons */}
              <div className="relative z-10 flex flex-col items-start gap-3 px-3 mt-4">
                {/* Search */}
                <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <span className="text-lg">🔍</span>
                </button>


                {/* Match History */}
                <button
                  onClick={() => setShowMatchHistory(true)}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <span className="text-lg">🕐</span>
                </button>

                {/* Heart / Likes */}
                <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <span className="text-lg">💚</span>
                </button>

                {/* Coin Store */}
                <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-yellow-400/30 flex items-center justify-center hover:bg-yellow-400/10 transition-colors relative">
                  <span className="text-lg">🪙</span>
                  <span className="absolute -bottom-1 text-[8px] bg-green-500 text-white px-1 rounded-full font-bold">FREE</span>
                </button>
              </div>

              {/* Spacer */}
              <div className="flex-1"></div>

              {/* Bottom Section */}
              <div className="relative z-10 px-5 pb-6 space-y-3">
                {/* Gender Filter */}
                <button
                  className="w-full bg-white/90 backdrop-blur-sm text-black font-bold py-3.5 rounded-full hover:bg-white transition-all flex items-center justify-center gap-2 shadow-lg"
                  onClick={() => toast('Gender filter coming soon!', { icon: '🚻' })}
                >
                  <span>👫</span> Both
                </button>

                {/* Start Video Chat */}
                <button
                  onClick={handleStartChat}
                  className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold py-4 rounded-full text-lg shadow-xl shadow-yellow-400/30 transform hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  Start Video Chat
                </button>
              </div>

              {/* Bottom Promo Banner */}
              <div className="relative z-10 bg-gradient-to-r from-yellow-400/10 via-yellow-400/20 to-yellow-400/10 border-t border-yellow-400/20 px-4 py-3 flex items-center justify-center gap-2">
                <span className="text-xl">🐵</span>
                <div className="text-center">
                  <span className="text-yellow-400 font-bold text-sm">Enjoy with Monkey Plus</span>
                  <p className="text-[10px] text-gray-400">Select your preference to meet people you like</p>
                </div>
                <span className="text-xl">🐵</span>
              </div>

              {/* Profile Overlay */}
              {showProfile && <UserProfileMobile onClose={() => setShowProfile(false)} />}

              {/* Match History Overlay */}
              {showMatchHistory && <MatchHistoryMobile onClose={() => setShowMatchHistory(false)} />}
            </div>

            {/* ===== DESKTOP IDLE SCREEN ===== */}
            <div className="hidden md:flex flex-1">
              <IdleDesktop
                localVideoRef={localVideoRef}
                isCamOn={isCamOn}
                isMicOn={isMicOn}
                onStartChat={handleStartChat}
                onToggleCam={() => setIsCamOn(!isCamOn)}
                onToggleMic={() => setIsMicOn(!isMicOn)}
              />
            </div>

            {/* Mobile Overlays */}
            <div className="md:hidden">
              {showProfile && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center">
                  <div className="relative w-full h-full">
                    <UserProfileMobile onClose={() => setShowProfile(false)} />
                  </div>
                </div>
              )}

              {showMatchHistory && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center">
                  <div className="relative w-full h-full">
                    <MatchHistoryMobile onClose={() => setShowMatchHistory(false)} />
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Remote Video / Status */
          <div className="flex-1 relative flex flex-col overflow-hidden">
            {remoteStream ? (
              /* === CONNECTED: 50/50 Split screen on mobile === */
              <>
                {/* Remote Video - Top 50% on mobile, full on desktop */}
                <div className="h-[50dvh] md:h-auto md:flex-none md:absolute md:inset-0 overflow-hidden relative bg-black flex-shrink-0">
                  <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  {/* monkey.app watermark */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-2 md:hidden">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg">
                      <span className="text-[14px]">🐵</span>
                    </div>
                    <span className="text-white/90 text-[13px] font-bold tracking-tight">monkey.app</span>
                  </div>
                </div>

                {/* Local Video - Bottom 50% on mobile */}
                <div className="h-[50dvh] overflow-hidden md:hidden relative bg-black border-t-2 border-white/5 flex-shrink-0">
                  <video
                    ref={localVideoMobileRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${!isCamOn ? 'hidden' : ''}`}
                  />
                  {!isCamOn && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                      <span className="text-4xl">📷</span>
                    </div>
                  )}
                  {/* Chat & Gift buttons bottom bar */}
                  <div className="absolute bottom-6 left-0 right-0 flex items-center justify-between px-6 z-10">
                    {/* Chat Button - matches reference style */}
                    <button
                      onClick={() => {
                        setShowChat(!showChat);
                        if (!showChat) setUnreadCount(0);
                      }}
                      className="w-12 h-12 rounded-full bg-[#1a1c1e]/80 backdrop-blur-md border border-white/10 flex items-center justify-center relative shadow-xl active:scale-90 transition-transform"
                    >
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-[#1a1c1e]">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>
                    {/* Gift Button - matches reference style */}
                    <button className="w-12 h-12 rounded-full bg-[#ffea00] flex items-center justify-center shadow-lg shadow-yellow-400/40 active:scale-95 transition-transform">
                      <svg className="w-7 h-7 text-[#d32f2f]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.5 2.5 0 00-5-0c0 .35.07.69.18 1H11c.11-.31.18-.65.18-1a2.5 2.5 0 00-5-0c0 .35.07.69.18 1H4a2 2 0 00-2 2v2c0 .55.45 1 1 1h1v10a2 2 0 002 2h12a2 2 0 002-2V10h1c.55 0 1-.45 1-1V8a2 2 0 00-2-2M15.5 5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-0.67 1.5-1.5 1.5h-1.5V5M7 5c0-.83.67-1.5 1.5-1.5S10 4.17 10 5v1.5H8.5C7.67 6.5 7 5.83 7 5m11 15H6V10h12v10m1-11H5V8h14v1" />
                      </svg>
                    </button>
                  </div>

                </div>
              </>

            ) : (
              /* === SEARCHING: Centered loader === */
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  {/* Spinning loader */}
                  <div className="relative w-20 h-20 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-t-yellow-400 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                    <div className="absolute inset-3 rounded-full border-4 border-white/5"></div>
                    <div className="absolute inset-3 rounded-full border-4 border-t-accent-purple border-r-transparent border-b-transparent border-l-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                  </div>
                  <p className="text-white font-bold text-lg mb-1">Finding a partner...</p>
                  <p className="text-gray-500 text-sm mb-6">Please wait while we connect you</p>
                  <button
                    onClick={() => {
                      setStatus('Idle');
                      userInitiatedJoin.current = false;
                      hasEmittedJoin.current = false;
                    }}
                    className="px-8 py-2.5 border border-white/20 rounded-full text-sm hover:bg-white/10 transition-colors text-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== DESKTOP CONNECTED OVERLAYS ===== */}

        {/* Top-Left: Monkey Chat badge + Timer */}
        {status === 'Connected' && (
          <div className="absolute top-5 left-5 z-50 hidden md:flex items-center gap-3">
            {/* Monkey Chat badge */}
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-full px-4 py-2">
              <span className="text-lg">🐵</span>
              <span className="text-white font-bold text-sm">Monkey Chat</span>
            </div>
            {/* Timer */}
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-full px-4 py-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-white font-mono text-sm font-semibold">{formatTime(chatTimer)}</span>
            </div>
          </div>
        )}

        {/* Top-Right: Partner location */}
        {partnerName && partnerLocation && (
          <div className="absolute top-5 right-5 z-50 hidden md:flex items-center gap-3">
            <div className="flex items-center gap-3 bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2.5">
              <div>
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="text-white font-bold text-sm">{getLocationDisplay(partnerLocation, showCityName)}</span>
                  {partnerIsPremium && <PremiumBadge size="sm" />}
                </div>
                {userLocation && getDistanceBetween(userLocation, partnerLocation) && (
                  <p className="text-white/50 text-xs mt-0.5">📍 {getDistanceBetween(userLocation, partnerLocation)} away</p>
                )}
              </div>
              {/* Globe icon */}
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-lg border border-white/10">🌍</div>
            </div>
          </div>
        )}

        {/* Bottom-Left: Local video PIP - Desktop only */}
        {status !== 'Idle' && (
          <div className="absolute bottom-24 left-5 z-30 hidden md:block">
            <div className="relative w-44 h-36 rounded-2xl overflow-hidden shadow-2xl border-2 border-purple-500/60">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${!isCamOn ? 'hidden' : ''}`}
              />
              {!isCamOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <span className="text-2xl">📷</span>
                </div>
              )}
              {/* YOU (Live) label */}
              <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                <span className="text-white text-[11px] font-semibold">YOU (Live)</span>
                {isPremium && <PremiumBadge size="sm" />}
              </div>
            </div>
          </div>
        )}

        {/* ===== MOBILE CONNECTED TOP BAR ===== */}
        {partnerName && (
          <div className="absolute top-0 left-0 right-0 z-50 md:hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-black/40 backdrop-blur-sm">
              <div className="flex items-center gap-3 min-w-0">
                {/* Partner Avatar Circle with Initial */}
                <div className="w-10 h-10 rounded-full bg-orange-600 border border-white/20 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-lg">
                  {partnerName?.charAt(0)?.toUpperCase() || 'P'}
                </div>
                <div className="min-w-0 flex flex-col">
                  <span className="text-white font-bold text-[15px] truncate leading-tight">{partnerName}</span>
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <p className="text-[12px] text-white/70 truncate flex-shrink">
                      {getLocationDisplay(partnerLocation, showCityName) || 'Somewhere'}
                    </p>
                    <span className="text-[14px] flex-shrink-0">💜</span>
                    <button
                      onClick={() => setShowReportModal(true)}
                      className="text-[14px] flex-shrink-0 hover:scale-110 active:scale-90 transition-transform"
                    >👮</button>
                  </div>
                </div>
              </div>
              {/* Next Button - Square icon to match reference */}
              <button
                onClick={handleNext}
                className="w-10 h-10 bg-[#3a4959]/90 backdrop-blur-md rounded-lg flex items-center justify-center text-white shadow-lg active:scale-95 transition-all"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4.555 13.904l1.39-1.39a1 1 0 011.414 0l.293.293V10a1 1 0 112 0v2.807l.293-.293a1 1 0 011.414 0l1.39 1.39a1 1 0 01-1.414 1.414l-1.39-1.39L8 15.414l-1.39 1.39-1.39-1.39z" />
                  <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Controls Bar - Desktop Only */}
        {status === 'Connected' && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 hidden md:flex items-center gap-3 z-50 bg-black/50 backdrop-blur-xl border border-white/10 px-5 py-3 rounded-full shadow-2xl">
            {/* Mic */}
            <button
              onClick={() => setIsMicOn(!isMicOn)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isMicOn ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-red-500 text-white'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {isMicOn
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                }
              </svg>
            </button>
            {/* Cam */}
            <button
              onClick={() => setIsCamOn(!isCamOn)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isCamOn ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-red-500 text-white'}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            {/* End Call */}
            <button
              onClick={endCall}
              className="w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all shadow-lg shadow-red-500/30"
            >
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
              </svg>
            </button>
            {/* Effects */}
            <button className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-all text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </button>
            {/* Next */}
            <button
              onClick={handleNext}
              className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-500 flex items-center justify-center transition-all shadow-lg shadow-purple-600/30"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Right Panel - Chat Interface */}
      {status === 'Connected' && (
        <div className={`w-full md:w-[320px] h-full bg-[#2d2040]/95 backdrop-blur-xl border-l border-white/5 flex flex-col z-[60] absolute md:relative inset-0 transition-transform duration-300 transform ${showChat ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0 md:col-start-2`}>
          {/* Chat Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm tracking-widest uppercase text-white">Live Chat</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-purple-600/30 text-purple-300 text-xs font-semibold px-2.5 py-1 rounded-full border border-purple-500/30">24 Participants</span>
              <button
                onClick={() => setShowChat(false)}
                className="md:hidden p-2 hover:bg-white/5 rounded-full text-white"
              >✕</button>
            </div>
          </div>

          {/* Messages List */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10"
          >
            {messages.length === 0 && !isPartnerTyping && (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 text-center px-8">
                <div className="text-4xl mb-4">💬</div>
                <p>Say hi! Start the conversation with emojis or text.</p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.senderId === currentUser.uid ? 'items-end' : 'items-start'}`}
              >
                <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${msg.senderId === currentUser.uid
                  ? 'bg-accent-purple text-white rounded-tr-none'
                  : 'bg-white/5 text-gray-200 border border-white/10 rounded-tl-none'
                  }`}>
                  {msg.text}
                </div>
                <span className="text-[10px] text-gray-500 mt-1 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}

            {/* Typing Indicator */}
            {isPartnerTyping && (
              <div className="flex items-start">
                <div className="bg-white/5 text-gray-400 px-4 py-2 rounded-2xl rounded-tl-none border border-white/10 italic text-xs flex items-center gap-2">
                  {partnerName || 'Stranger'} is typing
                  <span className="flex gap-1">
                    <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce"></span>
                    <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Emoji Picker Overlay */}
          {showEmojiPicker && (
            <div className="absolute bottom-20 left-4 right-4 z-[70] shadow-2xl">
              <div className="relative">
                <button
                  className="absolute -top-10 right-0 bg-dark-900 border border-white/10 p-2 rounded-full text-white"
                  onClick={() => setShowEmojiPicker(false)}
                >✕</button>
                <EmojiPicker
                  onEmojiClick={onEmojiClick}
                  theme="dark"
                  width="100%"
                  height={350}
                  lazyLoadEmojis={true}
                />
              </div>
            </div>
          )}

          {/* Chat Input */}
          <div className="p-4 bg-dark-900/50 backdrop-blur-md border-t border-white/5">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-2 rounded-full transition-colors ${showEmojiPicker ? 'bg-accent-purple text-white' : 'hover:bg-white/5 text-gray-400'}`}
              >
                😊
              </button>

              {/* Gift Button */}
              <div className="relative group">
                <button
                  type="button"
                  className="p-2 rounded-full hover:bg-white/5 text-pink-500 transition-colors"
                >
                  🎁
                </button>

                {/* Gift Popover */}
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-dark-800 border border-white/10 rounded-xl shadow-xl p-3 hidden group-hover:block transition-all duration-200 z-[80]">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { emoji: '🌹', cost: 10, name: 'Rose' },
                      { emoji: '🍫', cost: 50, name: 'Chocolate' },
                      { emoji: '💎', cost: 100, name: 'Diamond' },
                      { emoji: '🏎️', cost: 500, name: 'Car' },
                      { emoji: '🏰', cost: 1000, name: 'Castle' },
                      { emoji: '🚀', cost: 5000, name: 'Rocket' },
                    ].map((gift) => (
                      <button
                        key={gift.name}
                        type="button"
                        onClick={() => sendGift(gift.emoji, gift.cost, gift.name)}
                        className="flex flex-col items-center p-2 hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/5"
                        title={`Send ${gift.name} (${gift.cost} coins)`}
                      >
                        <span className="text-2xl mb-1">{gift.emoji}</span>
                        <div className="flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded-full">
                          <span className="text-[10px] text-yellow-400 font-bold">{gift.cost}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <input
                type="text"
                value={newMessage}
                onChange={handleTyping}
                placeholder="Type a message..."
                disabled={status !== 'Connected'}
                className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-accent-purple transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || status !== 'Connected'}
                className="p-2 bg-accent-purple text-white rounded-full hover:bg-accent-purple/80 transition-all disabled:opacity-50 disabled:grayscale"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}


      {/* Mobile Chat Toggle - REMOVED (now unified at top-left) */}
    </div >
  );
};

export default VideoChat;
