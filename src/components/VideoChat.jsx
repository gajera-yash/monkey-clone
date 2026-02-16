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

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

const VideoChat = ({ onEndChat }) => {
  const { currentUser, blockedUsers, reportUser, userLocation } = useAuth();
  const { spendCoins } = useCoins();
  const { isPremium } = usePremium();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const roomIdRef = useRef(null);
  const hasEmittedJoin = useRef(false);
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
  const [status, setStatus] = useState('Initializing...');

  // Chat & Timer States
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [chatTimer, setChatTimer] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

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

  useEffect(() => {
    performJoin();
  }, [performJoin]);

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
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (stream) stream.getTracks().forEach(t => t.stop());
    if (roomIdRef.current) socket.emit('leave-room', { roomId: roomIdRef.current });
    onEndChat();
  };

  return (
    <div className="relative w-full h-[100dvh] bg-dark-900 overflow-hidden flex flex-col md:flex-row">
      <PermissionModal isOpen={showPermissionModal} onGrant={requestMedia} error={error} />
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleReportSubmit}
        reportedUserName={partnerName}
      />

      {/* Main Video Area */}
      <div className="flex-1 relative bg-black flex flex-col transition-all duration-300">

        {/* Remote Video */}
        <div className="flex-1 relative flex items-center justify-center">
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

          {/* Timer Display */}
          {status === 'Connected' && (
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-black/40 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-full flex items-center gap-2 z-40">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-white font-mono text-sm">{formatTime(chatTimer)}</span>
            </div>
          )}

          {/* Partner Info Badge */}
          {partnerName && (
            <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 bg-black/40 backdrop-blur-md border border-white/10 px-6 py-2 rounded-full z-40 max-w-[90%]">
              <div className="flex flex-col items-center gap-1">
                {/* Partner Name */}
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-white font-medium text-sm inline-block truncate">
                    Chatting with {partnerName}
                  </span>
                  {partnerIsPremium && <PremiumBadge size="sm" />}
                </div>

                {/* Partner Location */}
                {partnerLocation && (
                  <div className="flex items-center gap-2 text-xs text-gray-300">
                    <span>{getLocationDisplay(partnerLocation, showCityName)}</span>
                    {userLocation && getDistanceBetween(userLocation, partnerLocation) && (
                      <>
                        <span className="text-gray-500">•</span>
                        <span>{getDistanceBetween(userLocation, partnerLocation)}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Top-Left Controls (Report & Chat) */}
          {partnerName && (
            <div className="absolute top-6 left-6 z-50 flex flex-col gap-4">
              {/* Report Button */}
              <button
                onClick={() => setShowReportModal(true)}
                className="bg-black/40 backdrop-blur-md p-3 rounded-full text-red-500 hover:bg-red-500/20 transition-colors border border-red-500/30"
                title="Report User"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
              </button>

              {/* Chat Button */}
              <button
                onClick={() => {
                  setShowChat(!showChat);
                  if (!showChat) setUnreadCount(0);
                }}
                className={`bg-black/40 backdrop-blur-md p-3 rounded-full border border-white/10 relative transition-all ${showChat ? 'bg-accent-purple border-accent-purple/50' : 'hover:bg-white/10'}`}
                title="Toggle Chat"
              >
                <span className="text-2xl">💬</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-dark-900">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Local Video Overlay */}
          <div className="absolute top-6 right-6 w-24 md:w-48 aspect-[3/4] md:aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 z-20 transition-all hover:scale-105">
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
            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-white font-medium flex items-center gap-1">
              <span>You</span>
              {isPremium && <PremiumBadge size="sm" />}
            </div>
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


          <div className="w-px h-8 bg-white/10 mx-1"></div>


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

      {/* Chat Sidebar */}
      {showChat && (
        <div className={`w-full md:w-[400px] h-full bg-dark-800 border-l border-white/5 flex flex-col z-[60] absolute md:relative inset-0 transition-transform duration-300 transform ${showChat ? 'translate-x-0' : 'translate-x-full'}`}>
          {/* Chat Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-dark-900/50 backdrop-blur-md">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <span className="text-accent-purple">●</span> Chat
            </h3>
            <button
              onClick={() => setShowChat(false)}
              className="md:hidden p-2 hover:bg-white/5 rounded-full"
            >
              ✕
            </button>
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
    </div>
  );
};

export default VideoChat;
