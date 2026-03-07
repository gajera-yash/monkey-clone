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
import DesktopSubscriptionModal from './desktop/modals/DesktopSubscriptionModal';
import DesktopSearchModal from './desktop/modals/DesktopSearchModal';
import DesktopSafetyModal from './desktop/modals/DesktopSafetyModal';
import DesktopMatchPreferenceModal from './desktop/modals/DesktopMatchPreferenceModal';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

const VideoChat = ({ onEndChat }) => {
  const { currentUser, blockedUsers, reportUser, userLocation, saveMatchToHistory, logCreatorEarnings } = useAuth();
  const { spendCoins } = useCoins();
  const { isPremium } = usePremium();

  const localVideoRef = useRef(null);
  const localVideoMobileRef = useRef(null);
  const localVideoMobileIdleRef = useRef(null);
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
  const [sessionEarnings, setSessionEarnings] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showMatchHistory, setShowMatchHistory] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);

  // Location States
  const [partnerLocation, setPartnerLocation] = useState(null);
  const [showCityName, setShowCityName] = useState(true);
  const [partnerIsPremium, setPartnerIsPremium] = useState(false);

  // Filter state (set from IdleDesktop)
  const [chatFilters, setChatFilters] = useState({ gender: 'Both', location: 'Global', ageRange: 'Any' });

  // Timer & Earnings logic
  useEffect(() => {
    let interval;
    if (status === 'Connected' && roomIdRef.current) {
      interval = setInterval(() => {
        setChatTimer(prev => {
          const newTime = prev + 1;
          // Calculate Earnings for Creators (e.g. 10 coins per minute roughly 0.16 coins per second for Tier 1)
          if (currentUser?.isCreator) {
            const ratePerSecond = (currentUser.currentTier || 1) * 10 / 60;
            setSessionEarnings(prevEarnings => prevEarnings + ratePerSecond);
          }
          return newTime;
        });
      }, 1000);
    } else {
      setChatTimer(0);
      setSessionEarnings(0);
    }
    return () => clearInterval(interval);
  }, [status, currentUser]);

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
        name: currentUser?.safetySettings?.invisibleMode ? 'Ghost User' : (currentUser.displayName || 'Stranger'),
        uid: currentUser.uid,
        blockedUsers: blockedUsers || [],
        location: userLocation,
        isPremium,
        filters: chatFilters
      });
    } else {
      if (!stream) setStatus('Waiting for camera...');
      else if (!socket.connected) setStatus('Connecting to server...');
    }
  }, [stream, currentUser, blockedUsers, userLocation, chatFilters]);


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

  const sendMessage = (text, type = 'text', giftValue = 0) => {
    if (!roomIdRef.current) return;

    const messageData = {
      id: Date.now(),
      text,
      senderId: currentUser.uid,
      senderName: currentUser.displayName || 'Me',
      timestamp: new Date().toISOString(),
      type,
      giftValue: giftValue
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
      sendMessage(`Sent a ${name} ${emoji}`, 'gift', cost);
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

  // Sync local stream to video elements
  useEffect(() => {
    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
    }
    if (localVideoMobileRef.current && stream) {
      localVideoMobileRef.current.srcObject = stream;
    }
    if (localVideoMobileIdleRef.current && stream) {
      localVideoMobileIdleRef.current.srcObject = stream;
    }
  }, [stream, remoteStream, status]);

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

      // Process Gift Commission for Creators
      if (message.type === 'gift' && currentUser?.isCreator && message.giftValue) {
        const commission = message.giftValue * 0.70; // 70% cut
        setSessionEarnings(prev => prev + commission);
        toast.success(`Received ${commission.toFixed(0)} coins from gift!`);
      }
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

      if (currentUser?.isCreator && sessionEarnings > 0) {
        logCreatorEarnings(durationSec, sessionEarnings);
      }
    }

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (stream) stream.getTracks().forEach(t => t.stop());
    if (roomIdRef.current) socket.emit('leave-room', { roomId: roomIdRef.current });

    setStartTime(null);
    setSessionEarnings(0);
    onEndChat();
  };

  return (
    <div className={`relative w-full h-[100dvh] overflow-hidden flex flex-col desktop-purple-bg`}>
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
          <DesktopHeader onShowSubscription={() => setShowSubscriptionModal(true)} />
        </div>
      )}

      <PermissionModal isOpen={showPermissionModal} onGrant={requestMedia} error={error} />
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
                  ref={localVideoMobileIdleRef}
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

                {/* Free space where tabs used to be */}
                <div className="flex-1"></div>

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
                <button
                  onClick={() => setShowSearchModal(true)}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <span className="text-lg">🔍</span>
                </button>

                {/* Match History */}
                <button
                  onClick={() => setShowMatchHistory(true)}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <span className="text-lg">🕐</span>
                </button>

                {/* Safety Center */}
                <button
                  onClick={() => setShowSafetyModal(true)}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <span className="text-lg">🛡️</span>
                </button>

                {/* Coin Store */}
                <button
                  onClick={() => setShowSubscriptionModal(true)}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-yellow-400/30 flex items-center justify-center hover:bg-yellow-400/10 transition-colors relative"
                >
                  <span className="text-lg">🪙</span>
                  <span className="absolute -bottom-1 text-[8px] bg-green-500 text-white px-1 rounded-full font-bold">FREE</span>
                </button>
              </div>

              {/* Spacer */}
              <div className="flex-1"></div>

              {/* Bottom Section */}
              <div className="relative z-10 px-5 pb-6 space-y-3">
                {/* Mobile Filters */}
                <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 space-y-3 mb-2 border border-white/10">
                  {/* Gender */}
                  <div className="flex gap-2">
                    {['Both', 'Male', 'Female'].map(opt => (
                      <button
                        key={opt}
                        onClick={() => {
                          if (opt !== 'Both' && !isPremium) { setShowSubscriptionModal(true); return; }
                          setChatFilters(p => ({ ...p, gender: opt }));
                        }}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm ${chatFilters.gender === opt ? 'bg-green-500 text-white shadow-green-500/30' : 'bg-white/10 text-white/70'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  {/* Age */}
                  <div className="flex gap-2">
                    {['Any', '18-25', '26-35', '36+'].map(opt => (
                      <button
                        key={opt}
                        onClick={() => {
                          if (opt !== 'Any' && !isPremium) { setShowSubscriptionModal(true); return; }
                          setChatFilters(p => ({ ...p, ageRange: opt }));
                        }}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm ${chatFilters.ageRange === opt ? 'bg-blue-500 text-white shadow-blue-500/30' : 'bg-white/10 text-white/70'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  {/* Location */}
                  <div className="relative">
                    <select
                      value={chatFilters.location}
                      onChange={(e) => {
                        if (e.target.value !== 'Global' && !isPremium) { setShowSubscriptionModal(true); return; }
                        setChatFilters(p => ({ ...p, location: e.target.value }));
                      }}
                      className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none appearance-none font-bold"
                    >
                      <option value="Global" className="bg-dark-800">🌍 Global (All Regions)</option>
                      <option value="North America" className="bg-dark-800">🇺🇸 North America</option>
                      <option value="Latin America" className="bg-dark-800">🇧🇷 Latin America</option>
                      <option value="Europe" className="bg-dark-800">🇪🇺 Europe</option>
                      <option value="Middle East" className="bg-dark-800">🇸🇦 Middle East</option>
                      <option value="South Asia" className="bg-dark-800">🇮🇳 South Asia</option>
                      <option value="East Asia" className="bg-dark-800">🇯🇵 East Asia</option>
                      <option value="Africa" className="bg-dark-800">🌍 Africa</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white/50">
                      ▼
                    </div>
                  </div>
                </div>

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
                  <span className="text-yellow-400 font-bold text-sm">Enjoy with Strangy Plus</span>
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
                onFiltersChange={setChatFilters}
                onSubscriptionRequired={() => setShowSubscriptionModal(true)}
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

              {showSearchModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <DesktopSearchModal onClose={() => setShowSearchModal(false)} />
                </div>
              )}

              {showSafetyModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <DesktopSafetyModal onClose={() => setShowSafetyModal(false)} />
                </div>
              )}

              {showPreferencesModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <DesktopMatchPreferenceModal onClose={() => setShowPreferencesModal(false)} />
                </div>
              )}

              {showSubscriptionModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <DesktopSubscriptionModal onClose={() => setShowSubscriptionModal(false)} />
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
                  {/* strangy.app watermark */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-2 md:hidden">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg">
                      <span className="text-[14px]">🐵</span>
                    </div>
                    <span className="text-white/90 text-[13px] font-bold tracking-tight">strangy.app</span>
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

        {/* Top-Left: Strangy Chat badge + Timer & Earnings Tracker */}
        {status === 'Connected' && (
          <div className="absolute top-6 left-6 z-50 flex flex-col gap-3">
            <div className="hidden md:flex flex-row items-center gap-4">
              {/* Strangy Chat badge */}
              <div className="flex items-center gap-2 bg-[#302b3e]/80 backdrop-blur-md rounded-full px-4 py-2 shadow-lg">
                <div className="w-6 h-6 rounded-full bg-[#8234f9] flex items-center justify-center">
                  <span className="text-[12px] relative top-[1px]">🐵</span>
                </div>
                <span className="text-white font-bold text-[15px] tracking-wide">Strangy Chat</span>
              </div>
              {/* Timer */}
              <div className="flex items-center gap-2 bg-[#302b3e]/80 backdrop-blur-md rounded-full px-4 py-2.5 shadow-lg">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff4b4b]"></span>
                <span className="text-white font-mono text-[14px] font-bold tracking-wider">{formatTime(chatTimer)}</span>
              </div>
            </div>

            {/* CREATOR EARNINGS TRACKER (Shows on both mobile & desktop) */}
            {currentUser?.isCreator && (
              <div className="flex items-center gap-3 bg-gradient-to-r from-accent-pink/90 to-accent-purple/90 backdrop-blur-xl border border-white/20 rounded-2xl px-5 py-3 shadow-[0_0_30px_rgba(236,72,153,0.3)] animate-fade-in-down mt-12 md:mt-0">
                <div className="w-10 h-10 rounded-full bg-white/20 flex flex-col items-center justify-center text-white">
                  <span className="text-xl leading-none">₹</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-white/80 text-[10px] uppercase font-black tracking-widest leading-none mb-1">Session Earnings</span>
                  <span className="text-white font-mono text-2xl font-black leading-none drop-shadow-md">
                    {sessionEarnings.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Top-Right: Partner location */}
        {partnerName && partnerLocation && (
          <div className="absolute top-6 right-6 z-50 hidden md:flex items-center">
            <div className="flex items-center gap-4 bg-[#4a4049]/60 backdrop-blur-xl rounded-full pl-5 pr-1.5 py-1.5 shadow-2xl">
              <div className="flex flex-col py-1">
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  <span className="text-white font-bold text-[15px]">{getLocationDisplay(partnerLocation, showCityName)}</span>
                  {partnerIsPremium && <PremiumBadge size="sm" />}
                </div>
                {userLocation && getDistanceBetween(userLocation, partnerLocation) && (
                  <p className="text-white/70 text-xs mt-0.5 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
                    {getDistanceBetween(userLocation, partnerLocation)} away
                  </p>
                )}
              </div>
              {/* Map/Globe icon */}
              <div className="w-11 h-11 rounded-full overflow-hidden border border-white/20 flex-shrink-0">
                <img src="https://static.vecteezy.com/system/resources/previews/000/153/588/original/vector-map-of-city-with-streets-and-parks.jpg" alt="Map" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        )}

        {/* Bottom-Left: Local video PIP - Desktop only */}
        {status !== 'Idle' && (
          <div className="absolute bottom-8 left-8 z-30 hidden md:block">
            <div className="relative w-64 h-48 rounded-[20px] overflow-hidden shadow-[0_0_25px_rgba(168,85,247,0.4)] border-2 border-[#a27ef6]">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${!isCamOn ? 'hidden' : ''}`}
              />
              {!isCamOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#1a1c1e]">
                  <span className="text-4xl">📷</span>
                </div>
              )}
              {/* YOU (Live) label */}
              <div className="absolute bottom-3 left-3 bg-[#1a1c1e]/70 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                <span className="text-white/90 text-[12px] font-bold tracking-wide">YOU (Live)</span>
                {isPremium && <PremiumBadge size="sm" />}
              </div>
              <div className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white/70">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
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
          <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 hidden md:flex items-center gap-5 z-50 bg-[#3a3b40]/90 backdrop-blur-2xl px-6 py-4 rounded-[32px] shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/5">
            {/* Mic */}
            <button
              onClick={() => setIsMicOn(!isMicOn)}
              className={`w-[52px] h-[52px] rounded-full flex items-center justify-center transition-all ${isMicOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500 text-white'}`}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {isMicOn
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                }
              </svg>
            </button>
            {/* Cam */}
            <button
              onClick={() => setIsCamOn(!isCamOn)}
              className={`w-[52px] h-[52px] rounded-full flex items-center justify-center transition-all ${isCamOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500 text-white'}`}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            {/* End Call */}
            <button
              onClick={endCall}
              className="w-[60px] h-[60px] bg-[#ff4b4b] hover:bg-red-500 rounded-full flex items-center justify-center transition-all shadow-[0_0_20px_rgba(255,75,75,0.4)] mx-2 transform hover:scale-105"
            >
              <svg className="w-8 h-8 text-white transform rotate-[135deg]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M20 18.35V19c0 .55-.45 1-1 1h-1c-5.52 0-10.48-2.24-14.14-5.86S0 5.52 0 0V0C0-1 .45-1 1-1h.65C2.11-1 2.5-1.5 2.5-2v-3.5c0-.5-.5-1-1-1c-.5 0-1 .5-1 1v3.5c0 1.05-.85 1.9-1.9 1.9H-1c-1.66 0-3 1.34-3 3v0c0 4.97 2.01 9.47 5.27 12.73S9.03 20 14 20h0c1.66 0 3-1.34 3-3V19h-.65c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1H19c.55 0 1 .45 1 1v.65z" transform="translate(2 2)" />
                <path d="M12.26 9l4.59-4.59c.39-.39.39-1.02 0-1.41s-1.02-.39-1.41 0L10.84 7.59l-4.59-4.59c-.39-.39-1.02-.39-1.41 0s-.39 1.02 0 1.41L9.43 9l-4.59 4.59c-.39.39-.39 1.02 0 1.41.19.19.45.29.71.29s.51-.1.71-.29l4.59-4.59 4.59 4.59c.19.19.45.29.71.29s.51-.1.71-.29c.39-.39.39-1.02 0-1.41L12.26 9z" />
              </svg>
            </button>
            {/* Effects */}
            <button className="w-[52px] h-[52px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </button>
            {/* Next */}
            <button
              onClick={handleNext}
              className="w-[52px] h-[52px] rounded-full bg-[#8234f9] hover:bg-[#7220e9] flex items-center justify-center transition-all shadow-[0_0_15px_rgba(130,52,249,0.5)] transform hover:scale-105"
            >
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Right Panel - Chat Interface */}
      {status === 'Connected' && (
        <div className={`w-full md:w-[350px] h-full md:h-auto md:max-h-[70vh] md:min-h-[480px] bg-[#665e64]/80 md:bg-[#5c545e]/80 backdrop-blur-2xl md:rounded-[24px] border-l md:border border-white/10 flex flex-col z-[60] absolute inset-0 md:inset-auto md:right-8 md:top-1/2 md:-translate-y-1/2 md:translate-x-0 ${showChat ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 transform shadow-[0_15px_40px_rgba(0,0,0,0.5)] overflow-hidden`}>
          {/* Chat Header */}
          <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-black/10">
            <div className="flex items-center gap-2">
              <h3 className="font-[800] text-[15px] tracking-[0.1em] text-white">LIVE CHAT</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-[#8234f9]/40 text-[#d8b4fe] text-[11px] font-bold px-3 py-1.5 rounded-full backdrop-blur-md">24 Participants</span>
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
                <span className="text-[11px] text-white/60 mb-1.5 px-0.5 flex items-center gap-1 font-medium">
                  {msg.senderId === currentUser.uid ? (
                    <><span className="text-[#a78bfa]">You</span> &bull; {msg.timestamp === 'Just now' ? 'Just now' : new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                  ) : (
                    <>{partnerName || 'Stranger'} &bull; {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                  )}
                </span>
                <div className={`max-w-[85%] px-5 py-3.5 rounded-[18px] text-[14px] leading-snug font-medium shadow-sm ${msg.senderId === currentUser.uid
                  ? 'bg-[#8234f9] text-white rounded-tr-sm'
                  : 'bg-white/10 text-white/95 rounded-tl-sm'
                  }`}>
                  {msg.text}
                </div>
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
          <div className="p-4 bg-transparent pb-6">
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
                className="flex-1 bg-white/10 border-0 rounded-full px-5 py-3.5 text-[14px] font-medium text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || status !== 'Connected'}
                className="flex items-center justify-center w-11 h-11 bg-[#8234f9] text-white rounded-full hover:bg-[#7220e9] transition-all disabled:opacity-50 disabled:grayscale flex-shrink-0"
              >
                <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}


      {/* Mobile Chat Toggle - REMOVED (now unified at top-left) */}

      {/* Root Level Subscription Modal Overlay - Fixed Z-Index Context */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
          <DesktopSubscriptionModal onClose={() => setShowSubscriptionModal(false)} />
        </div>
      )}
    </div >
  );
};

export default VideoChat;
