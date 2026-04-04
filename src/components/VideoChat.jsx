import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { RiMagicLine, RiChat3Line, RiFlagLine, RiHeartLine, RiEmotionHappyLine, RiGiftLine, RiArrowRightDoubleLine, RiMicFill, RiMicOffLine, RiVidiconFill, RiVideoOffLine, RiCloseLine, RiMenuLine, RiUserLine, RiSendPlaneLine } from 'react-icons/ri';
import CoinStoreModal from './coins/CoinStoreModal';
import SafetyInfoModal from './safety/SafetyInfoModal';
import { loadNsfwModel, checkVideoForNsfw } from '../utils/nsfwDetector';
import StrangyIcon from './common/StrangyIcon';

const buildRtcConfig = () => {
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ];

  // Optional TURN fallback for strict NAT/firewall networks.
  // Configure these in frontend env (Vercel) to improve connection reliability:
  // REACT_APP_TURN_URL, REACT_APP_TURN_USERNAME, REACT_APP_TURN_CREDENTIAL
  const turnUrl = process.env.REACT_APP_TURN_URL;
  const turnUsername = process.env.REACT_APP_TURN_USERNAME;
  const turnCredential = process.env.REACT_APP_TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential
    });
  }

  return {
    iceServers,
    iceCandidatePoolSize: 10
  };
};

const RTC_CONFIG = buildRtcConfig();

const VideoChat = ({ onEndChat }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const directCallTarget = searchParams.get('directCall');
  const directCallName = searchParams.get('name');
  
  const incomingDirectCall = location.state?.incomingDirectCall;

  const { currentUser, blockedUsers, reportUser, userLocation, saveMatchToHistory, startChatLog, updateChatLog } = useAuth();
  const { spendCoins, addCoins, coins, filterCosts, openCoinStore, openDailyBonus, creatorMonetizationSettings } = useCoins();
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
  const pendingFilterCharge = useRef(null);
  const activeLogId = useRef(null);
  const randomRewardAdded = useRef(false);
  const lastMinuteHandled = useRef(-1); // To handle per-minute billing once per minute
  const streamRef = useRef(null);
  const pendingIceCandidates = useRef([]);

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
  const [showConnectedUsers, setShowConnectedUsers] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showCoinStore, setShowCoinStore] = useState(false);
  const [showSafetyInfo, setShowSafetyInfo] = useState(false);
  const [waitingCount, setWaitingCount] = useState(0);

  // Location States
  const [partnerLocation, setPartnerLocation] = useState(null);
  const [partnerGender, setPartnerGender] = useState(null);
  const [partnerAge, setPartnerAge] = useState(null);
  const [showCityName, setShowCityName] = useState(true);
  const [partnerIsPremium, setPartnerIsPremium] = useState(false);

  // Filter state (set from IdleDesktop)
  const [chatFilters, setChatFilters] = useState({ gender: 'Both', location: 'Global', ageRange: 'Any' });
  const [isLocalNsfw, setIsLocalNsfw] = useState(false);
  const [socketStatus, setSocketStatus] = useState(socket.connected ? 'Connected' : 'Disconnected');
  const nsfwViolations = useRef(0);

  // Monitor socket status
  useEffect(() => {
    const onConnect = () => { console.log("[VideoChat] Socket Connected"); setSocketStatus('Connected'); };
    const onConnectError = (err) => { console.error("[VideoChat] Socket Connection Error", err); setSocketStatus('Error'); };
    const onDisconnect = () => { console.log("[VideoChat] Socket Disconnected"); setSocketStatus('Disconnected'); };

    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  // Refs to avoid stale closures in interval
  const coinsRef = useRef(coins);
  const filterCostsRef = useRef(filterCosts);
  const chatFiltersRef = useRef(chatFilters);
  useEffect(() => { coinsRef.current = coins; }, [coins]);
  useEffect(() => { filterCostsRef.current = filterCosts; }, [filterCosts]);
  useEffect(() => { chatFiltersRef.current = chatFilters; }, [chatFilters]);

  // Load NSFW model on mount
  useEffect(() => {
    loadNsfwModel().catch(err => console.error("NSFW Model load error", err));
  }, []);

  // NSFW Detection Logic
  useEffect(() => {
    let nsfwInterval;
    if (status === 'Connected') {
      nsfwInterval = setInterval(async () => {
        const video = localVideoRef.current || localVideoMobileRef.current;
        if (video && video.readyState === 4) {
          const result = await checkVideoForNsfw(video);
          if (result && result.isNsfw) {
            setIsLocalNsfw(true);
            nsfwViolations.current += 1;
            
            if (nsfwViolations.current === 1) {
              toast.error("⚠️ Inappropriate content detected! Your camera is blurred. Please adjust your camera to avoid being banned.", { duration: 5000 });
            }

            if (nsfwViolations.current >= 3) {
              toast.error("🚨 Call disconnected due to multiple safety violations.", { duration: 6000 });
              // Emit violation to server for strike
              socket.emit('system-violation', { reason: 'NSFW content detected', uid: currentUser.uid });
              handleNext();
            }
          } else if (result) {
            setIsLocalNsfw(false);
            // Slowly decay violations if user behaves? Or just keep it.
            // Let's reset if they are clean for a bit
            if (nsfwViolations.current > 0) nsfwViolations.current = 0;
          }
        }
      }, 2000); // Check every 2 seconds
    } else {
      setIsLocalNsfw(false);
      nsfwViolations.current = 0;
    }
    return () => clearInterval(nsfwInterval);
  }, [status, currentUser.uid]);



  // Timer & Earnings logic
  useEffect(() => {
    let interval;
    if (status === 'Connected' && roomIdRef.current) {
      interval = setInterval(() => {
        setChatTimer(prev => {
          const newTime = prev + 1;
          const isPrivate = roomIdRef.current?.startsWith('private_');
          
          // --- CASE 1: RANDOM CHAT (NOT PRIVATE) ---
          if (!isPrivate && currentUser?.isCreator && !randomRewardAdded.current) {
            // Reward after 15 seconds
            if (newTime >= 15) {
              const reward = creatorMonetizationSettings?.randomChatCoins || 10;
              setSessionEarnings(prevEarnings => prevEarnings + reward);
              randomRewardAdded.current = true;
              toast.success(`+${reward} Coins (Chat Reward)`);
            }
          }

          // --- CASE 2: PRIVATE 1-ON-1 CHAT ---
          if (isPrivate) {
            const currentMinute = Math.floor(newTime / 60);
            
            // Per-minute billing logic (every 60 seconds)
            if (currentMinute > lastMinuteHandled.current) {
              lastMinuteHandled.current = currentMinute;
              
              const isCaller = roomIdRef.current.includes(`private_${currentUser.uid}_`) || roomIdRef.current.startsWith(`private_${currentUser.uid}`);
              const perMinuteCost = creatorMonetizationSettings?.privateCallCost || 60;
              const creatorPercentage = (creatorMonetizationSettings?.privateCallPercentage || 50) / 100;

              if (isCaller) {
                // MALE USER / CALLER: Spend Coins
                if (coinsRef.current < perMinuteCost) {
                  toast.error("Insufficient coins for private call!");
                  handleNext(); // Disconnect
                } else {
                  spendCoins(perMinuteCost, `Private Call (Min ${currentMinute + 1})`);
                }
              } else if (currentUser?.isCreator) {
                // FEMALE CREATOR / RECEIVER: Earn Coins (50% or dynamic cut)
                const creatorEarned = perMinuteCost * creatorPercentage;
                setSessionEarnings(prev => prev + creatorEarned);
                toast.success(`+${creatorEarned.toFixed(0)} Coins (Private Call Min ${currentMinute + 1})`);
              }
            }
          }

          return newTime;
        });
      }, 1000);
    } else {
      setChatTimer(0);
      setSessionEarnings(0);
      randomRewardAdded.current = false;
      lastMinuteHandled.current = -1;
    }
    return () => clearInterval(interval);
  }, [status, currentUser, creatorMonetizationSettings]);

  // Auto-disconnect when coins run out during active filter session
  useEffect(() => {
    if (status !== 'Connected') return;

    const checkInterval = setInterval(() => {
      const filters = chatFiltersRef.current;
      const fCosts = filterCostsRef.current;
      const userCoins = coinsRef.current;

      let filterCost = 0;
      if (filters.gender !== 'Both') filterCost += fCosts.gender;
      if (filters.location !== 'Global') filterCost += fCosts.location;
      if (filters.ageRange !== 'Any') filterCost += fCosts.age;

      if (filterCost > 0 && userCoins < filterCost) {
        clearInterval(checkInterval);
        toast.error('💸 Out of coins! Switching to free video chat...', { duration: 4000 });
        // Reset to free filters
        setChatFilters({ gender: 'Both', location: 'Global', ageRange: 'Any' });
        // Disconnect current session
        setTimeout(() => {
          if (peerConnection.current) { peerConnection.current.close(); peerConnection.current = null; }
          if (roomIdRef.current) { socket.emit('leave-room', { roomId: roomIdRef.current }); roomIdRef.current = null; }
          setRemoteStream(null);
          setPartnerName(null);
          setPartnerLocation(null);
          setPartnerIsPremium(false);
          setMessages([]);
          setChatTimer(0);
          setIsPartnerTyping(false);
          partnerIdRef.current = null;
          pendingFilterCharge.current = null;
          hasEmittedJoin.current = false;
          setStatus('Idle');
        }, 1000);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(checkInterval);
  }, [status]);

  const calculateAge = (birthdate) => {
    if (!birthdate) return null;
    const birth = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const performJoin = useCallback(() => {
    if (hasEmittedJoin.current) return;
    if (!userInitiatedJoin.current) return; // Only join if user clicked Start
    
    if (!socket.connected) {
        console.log("[SocketDebug] Connecting socket...");
        socket.connect();
    }

    if (socket.connected && stream && currentUser) {
      console.log("[SocketDebug] Emitting join query with filters:", chatFilters);
      hasEmittedJoin.current = true;
      
      if (incomingDirectCall) {
        console.log("[SocketDebug] Accepting direct call from:", incomingDirectCall.callerData?.name);
        setStatus(`Connecting to ${incomingDirectCall.callerData?.name || 'User'}...`);
        socket.emit('accept-direct-call', {
            callerSocketId: incomingDirectCall.callerSocketId,
            callerData: incomingDirectCall.callerData,
            creatorData: {
                uid: currentUser?.uid,
                name: currentUser?.displayName,
                photoURL: currentUser?.photoURL,
                gender: currentUser?.gender || 'Female'
            }
        });
        
        // Remove state so it doesn't auto-call again
        navigate(location.pathname, { replace: true });
        
      } else if (directCallTarget) {
        console.log("[SocketDebug] Requesting direct call to:", directCallTarget);
        setStatus(`Calling ${directCallName || 'Creator'}...`);
        socket.emit('request-direct-call', {
            targetUid: directCallTarget,
            callerData: {
                uid: currentUser.id || currentUser.uid,
                name: currentUser.displayName || 'Stranger',
                photoURL: currentUser.photoURL || currentUser.avatar_url,
                gender: currentUser.gender
            }
        });
        
        // Remove param so it doesn't auto-call again
        navigate(location.pathname, { replace: true });
        
      } else {
        setStatus('Searching for partner...');
        socket.emit('join-waiting', {
          name: currentUser?.safetySettings?.invisibleMode ? 'Ghost User' : (currentUser.displayName || 'Stranger'),
          uid: currentUser.uid,
          blockedUsers: blockedUsers || [],
          location: userLocation,
          isPremium,
          filters: chatFilters,
          ownGender: currentUser?.gender || localStorage.getItem('userGender'),
          ownBirthdate: currentUser?.birthdate || null
        });
      }
    } else {
      if (!stream) setStatus('Waiting for camera...');
      else if (!socket.connected) setStatus('Connecting to server...');
    }
  }, [stream, currentUser, blockedUsers, userLocation, chatFilters, directCallTarget, incomingDirectCall, directCallName, navigate, location.pathname, isPremium]);


  const handleStartChat = useCallback(() => {
    userInitiatedJoin.current = true;
    performJoin();
  }, [performJoin]);

  // Auto-Start Stream for Direct Calls
  useEffect(() => {
    if (directCallTarget || incomingDirectCall) {
       userInitiatedJoin.current = true;
       performJoin();
    }
  }, [directCallTarget, incomingDirectCall, performJoin]);

  const requestMedia = useCallback(async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      setStream(mediaStream);
      streamRef.current = mediaStream;
      if (localVideoRef.current) localVideoRef.current.srcObject = mediaStream;
      setShowPermissionModal(false);
    } catch (err) {
      setError("Please allow camera and microphone access.");
      setShowPermissionModal(true);
    }
  }, []);

  const payoutSessionEarnings = useCallback(async () => {
    if (currentUser?.isCreator && sessionEarnings > 0) {
      const amount = Math.floor(sessionEarnings);
      console.log(`[Payout] Payout for creator: ${amount} coins`);
      await addCoins(amount, "Video Chat Earning", 'earned');
      setSessionEarnings(0);
      randomRewardAdded.current = false;
      lastMinuteHandled.current = -1;
    }
  }, [currentUser, sessionEarnings, addCoins]);

  const handleNext = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    payoutSessionEarnings();
    
    setRemoteStream(null);
    setPartnerName(null);
    setPartnerLocation(null);
    setPartnerIsPremium(false);
    setMessages([]);
    setChatTimer(0);
    setIsPartnerTyping(false);
    partnerIdRef.current = null;
    pendingIceCandidates.current = [];
    pendingFilterCharge.current = null;
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

  const handleReportSubmit = async ({ reason, description, screenshotBlob }) => {
    if (partnerIdRef.current) {
      const targetId = partnerIdRef.current;
      await reportUser(targetId, reason, description, activeLogId.current, screenshotBlob);
      
      // Notify server to check auto-disconnect on the reported user
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        fetch(`${apiUrl}/api/flag-report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportedUid: targetId })
        }).catch(e => console.error(e));
      } catch (err) {}

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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      // CRITICAL: Force disconnect to reset session state on server
      socket.disconnect();
      
      pendingFilterCharge.current = null;
      hasEmittedJoin.current = false;
      userInitiatedJoin.current = false;
    };
  }, []); // Empty array ensures this only runs on actual component unmount!

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

  // Re-join the waiting queue automatically if socket reconnects
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

  // --- Stable Socket Listeners (Run once on mount) ---
  useEffect(() => {
    const handleMatched = async (data) => {
      console.log("[SocketDebug] Received 'matched' event:", data);
      const { roomId, initiator, partnerName, partnerLocation, partnerIsPremium, partnerGender, partnerBirthdate, partnerId, isDirectCall } = data;
      
      roomIdRef.current = roomId;
      partnerIdRef.current = partnerId;
      setPartnerName(partnerName || 'Stranger');
      setPartnerLocation(partnerLocation || null);
      setPartnerIsPremium(partnerIsPremium || false);
      setPartnerGender(partnerGender || null);
      setPartnerAge(calculateAge(partnerBirthdate));
      
      console.log(`[SocketDebug] Matching with ${partnerName || 'Stranger'}. Initiator: ${initiator}`);
      setStatus('Connected');
      setStartTime(Date.now());
      setMessages([]);
      setChatTimer(0);

      // --- Deduct filter coins on each match (Unless Direct Call) ---
      const filters = chatFiltersRef.current;
      const fCosts = filterCostsRef.current;
      let filterCost = fCosts.standard || 0;
      const filterDesc = [];
      
      if (fCosts.standard > 0) filterDesc.push('Match Fee');
      if (filters.gender !== 'Both') { filterCost += fCosts.gender; filterDesc.push(`Gender(${filters.gender})`); }
      if (filters.location !== 'Global') { filterCost += fCosts.location; filterDesc.push(`Location(${filters.location})`); }
      if (filters.ageRange !== 'Any') { filterCost += fCosts.age; filterDesc.push(`Age(${filters.ageRange})`); }

      if (isDirectCall) {
          filterCost = 0; // Direct calls are billed per minute via timer
      }

      if (filterCost > 0) {
        const userCoins = coinsRef.current;
        if (userCoins < filterCost) {
          toast.error('⚠️ Not enough coins for filter! Switching to free chat...');
          setChatFilters({ gender: 'Both', location: 'Global', ageRange: 'Any' });
          setTimeout(() => {
            if (peerConnection.current) { peerConnection.current.close(); peerConnection.current = null; }
            if (roomIdRef.current) { socket.emit('leave-room', { roomId: roomIdRef.current }); roomIdRef.current = null; }
            pendingFilterCharge.current = null;
            hasEmittedJoin.current = false;
            performJoin();
          }, 500);
          return;
        }
        pendingFilterCharge.current = { cost: filterCost, desc: filterDesc.join(', ') };
      }

      if (peerConnection.current) {
        peerConnection.current.close();
      }
      pendingIceCandidates.current = [];
      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnection.current = pc;

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') {
          console.warn('[WebRTC] Connection failed - likely NAT/firewall issue. TURN fallback may be required.');
        }
      };

      // Use stable streamRef instead of stream state
      const currentStream = streamRef.current;
      if (currentStream) {
        currentStream.getTracks().forEach(track => pc.addTrack(track, currentStream));
      }

      pc.ontrack = (e) => {
        setRemoteStream(e.streams[0]);
        if (pendingFilterCharge.current) {
          const { cost, desc } = pendingFilterCharge.current;
          pendingFilterCharge.current = null;
          spendCoins(cost, `Filter: ${desc}`);
        }
      };
      
      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('ice-candidate', { candidate: e.candidate, roomId });
      };

      if (initiator) {
        const logId = await startChatLog(partnerId, roomId);
        if (logId) {
          activeLogId.current = logId;
          socket.emit('share-log-id', { logId, roomId });
        }
        
        // Safety check after async call
        if (pc.signalingState === 'closed') return;

        const offer = await pc.createOffer();
        if (pc.signalingState === 'closed') return;
        
        await pc.setLocalDescription(offer);
        socket.emit('offer', { offer, roomId });
      }
    };

    const flushPendingIceCandidates = async (pc) => {
      if (!pc || !pc.remoteDescription || !pc.remoteDescription.type) return;
      if (!pendingIceCandidates.current.length) return;

      const queued = [...pendingIceCandidates.current];
      pendingIceCandidates.current = [];

      for (const ice of queued) {
        try {
          await pc.addIceCandidate(ice);
        } catch (e) {
          console.warn('[WebRTC] Failed to add queued ICE candidate:', e?.message || e);
        }
      }
    };

    const handleOffer = async (offer) => {
      const pc = peerConnection.current;
      if (pc && pc.signalingState !== 'closed') {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await flushPendingIceCandidates(pc);
        if (pc.signalingState === 'closed') return;
        
        const answer = await pc.createAnswer();
        if (pc.signalingState === 'closed') return;
        
        await pc.setLocalDescription(answer);
        socket.emit('answer', { answer, roomId: roomIdRef.current });
      }
    };

    const handleAnswer = async (answer) => {
      const pc = peerConnection.current;
      if (pc && pc.signalingState !== 'closed') {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          await flushPendingIceCandidates(pc);
      }
    };

    const handleIce = (candidate) => {
      const pc = peerConnection.current;
      if (!pc || pc.signalingState === 'closed') return;

      const ice = new RTCIceCandidate(candidate);

      if (pc.remoteDescription && pc.remoteDescription.type) {
        pc.addIceCandidate(ice).catch(e => {
          console.warn('[WebRTC] Failed to add ICE candidate:', e?.message || e);
        });
      } else {
        pendingIceCandidates.current.push(ice);
      }
    };

    const handleDisconnect = () => {
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
      if (roomIdRef.current) {
        socket.emit('leave-room', { roomId: roomIdRef.current });
        roomIdRef.current = null;
      }
      setRemoteStream(null);
      setPartnerName(null);
      setPartnerLocation(null);
      setPartnerIsPremium(false);
      setMessages([]);
      setChatTimer(0);
      setIsPartnerTyping(false);
      pendingIceCandidates.current = [];
      
      if (activeLogId.current) {
        const durationSec = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
        updateChatLog(activeLogId.current, durationSec, messages.length);
        activeLogId.current = null;
      }
      payoutSessionEarnings();
      partnerIdRef.current = null;
      pendingFilterCharge.current = null;
      hasEmittedJoin.current = false;
      setStatus('Searching for partner...');
      performJoin();
    };

    const handleReceiveMessage = (message) => {
      setMessages(prev => [...prev, message]);
      setUnreadCount(prevCount => showChat ? 0 : prevCount + 1);
      notificationSound.current.play().catch(e => console.log("Sound play failed", e));
      if (message.type === 'gift' && currentUser?.isCreator && message.giftValue) {
        const commission = message.giftValue * 0.70;
        setSessionEarnings(prev => prev + commission);
        toast.success(`Received ${commission.toFixed(0)} coins from gift!`);
      }
    };

    const handleDirectCallDeclined = ({ reason }) => {
      let msg = "Call declined.";
      if (reason === 'offline') msg = "User is currently offline or busy.";
      toast.error(msg, { icon: '🚫', duration: 4000 });
      handleDisconnect();
      setStatus('Idle');
    };

    socket.on('matched', handleMatched);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIce);
    socket.on('partner-disconnected', handleDisconnect);
    socket.on('system-disconnect', ({ reason }) => {
      toast.error(reason || 'Session closed by safety system', { icon: '🚨' });
      handleDisconnect();
      setStatus('Idle');
    });
    socket.on('geo-blocked', ({ reason }) => {
      toast.error(reason || 'Your region is blocked', { icon: '🌍' });
      setStatus('Idle');
    });
    socket.on('direct-call-declined', handleDirectCallDeclined);
    socket.on('receive-message', handleReceiveMessage);
    socket.on('partner-typing', (typing) => setIsPartnerTyping(typing));
    socket.on('waiting-count', (count) => setWaitingCount(count));
    socket.on('share-log-id', ({ logId }) => { activeLogId.current = logId; });

    return () => {
      socket.off('matched');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('partner-disconnected');
      socket.off('system-disconnect');
      socket.off('geo-blocked');
      socket.off('direct-call-declined');
      socket.off('receive-message');
      socket.off('partner-typing');
      socket.off('waiting-count');
      socket.off('share-log-id');
    };
  }, []); // Re-join still relies on performJoin, but listeners remain stable.

  const endCall = () => {
    if (status === 'Connected' && partnerName) {
      const durationSec = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
      const minutes = Math.floor(durationSec / 60);
      const seconds = durationSec % 60;
      const durationStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      // Update Unified Chat Monitoring Log
      if (activeLogId.current) {
        updateChatLog(activeLogId.current, durationSec, messages.length);
        activeLogId.current = null;
      }

      payoutSessionEarnings();
    }

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    pendingIceCandidates.current = [];
    if (stream) stream.getTracks().forEach(t => t.stop());
    if (roomIdRef.current) socket.emit('leave-room', { roomId: roomIdRef.current });

    setStartTime(null);
    setSessionEarnings(0);
    pendingFilterCharge.current = null;
    onEndChat();
  };

  return (
    <div className={`relative w-full h-[100dvh] overflow-hidden flex flex-col desktop-purple-bg`}>
      {/* Background Patterns for Idle Desktop */}
      {status === 'Idle' && (
        <div className="absolute inset-0 hidden md:block opacity-20 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 transform -translate-x-1/2 -translate-y-1/2 rotate-12">
            <StrangyIcon className="w-[200px] h-[200px] rounded-[40px] opacity-40" size="text-[120px]" />
          </div>
          <div className="absolute bottom-1/4 right-1/4 transform translate-x-1/2 translate-y-1/2 -rotate-12">
            <StrangyIcon className="w-[200px] h-[200px] rounded-[40px] opacity-40" size="text-[120px]" />
          </div>
          <div className="absolute top-1/2 left-3/4 transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-8">
            <StrangyIcon className="w-[120px] h-[120px] rounded-[24px] opacity-30" size="text-[72px]" />
            <StrangyIcon className="w-[120px] h-[120px] rounded-[24px] opacity-30" size="text-[72px]" />
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
        remoteVideoRef={remoteVideoRef}
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
                  className={`w-full h-full object-cover -scale-x-100 ${!isCamOn ? 'hidden' : ''} ${isLocalNsfw ? 'nsfw-blur' : ''}`}
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
                <button 
                  onClick={() => setShowSafetyInfo(true)}
                  className="w-9 h-9 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center hover:bg-green-500/30 transition-colors"
                >
                  <span className="text-green-400 text-sm">✅</span>
                </button>

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

                {/* Free Coins (Trigger Bonus) */}
                <button
                  onClick={() => openDailyBonus()}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-yellow-400/30 flex items-center justify-center hover:bg-yellow-400/10 transition-colors relative shadow-[0_0_15px_rgba(250,204,21,0.2)]"
                >
                  <span className="text-lg">💰</span>
                  <span className="absolute -bottom-1 text-[8px] bg-green-500 text-white px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider shadow-sm border border-green-400">FREE</span>
                </button>

                {/* Coin Store (Purchase Coins) */}
                <button
                  onClick={() => setShowCoinStore(true)}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 backdrop-blur-md border px-0 border-yellow-200 flex flex-col items-center justify-center hover:scale-105 transition-transform relative shadow-[0_0_20px_rgba(250,204,21,0.4)] mt-2"
                >
                  <span className="text-base font-black text-yellow-900 leading-none">C</span>
                  <span className="text-[7px] font-black uppercase tracking-widest text-yellow-900 leading-none mt-0.5">Topup</span>
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
                          if (opt !== 'Both') {
                            const cost = filterCosts.gender;
                            if (cost > 0 && coins < cost) {
                              toast.error(`Need ${cost} coins for this filter!`);
                              if (openCoinStore) openCoinStore();
                              return;
                            }
                          }
                          setChatFilters(p => ({ ...p, gender: opt }));
                        }}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1 ${chatFilters.gender === opt ? 'bg-green-500 text-white shadow-green-500/30' : 'bg-white/10 text-white/70'}`}
                      >
                        {opt}
                        {opt !== 'Both' && filterCosts.gender > 0 && (
                          <span className="text-[8px] bg-yellow-400 text-black px-1 rounded-full font-bold">🪙{filterCosts.gender}</span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Age */}
                  <div className="flex gap-2">
                    {['Any', '18-25', '26-35', '36+'].map(opt => (
                      <button
                        key={opt}
                        onClick={() => {
                          if (opt !== 'Any') {
                            const cost = filterCosts.age;
                            if (cost > 0 && coins < cost) {
                              toast.error(`Need ${cost} coins for this filter!`);
                              if (openCoinStore) openCoinStore();
                              return;
                            }
                          }
                          setChatFilters(p => ({ ...p, ageRange: opt }));
                        }}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1 ${chatFilters.ageRange === opt ? 'bg-blue-500 text-white shadow-blue-500/30' : 'bg-white/10 text-white/70'}`}
                      >
                        {opt}
                        {opt !== 'Any' && filterCosts.age > 0 && (
                          <span className="text-[8px] bg-yellow-400 text-black px-1 rounded-full font-bold">🪙{filterCosts.age}</span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Location */}
                  <div className="relative">
                    <select
                      value={chatFilters.location}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val !== 'Global') {
                          const cost = filterCosts.location;
                          if (cost > 0 && coins < cost) {
                            toast.error(`Need ${cost} coins for this filter!`);
                            if (openCoinStore) openCoinStore();
                            return;
                          }
                        }
                        setChatFilters(p => ({ ...p, location: val }));
                      }}
                      className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none appearance-none font-bold"
                    >
                      <option value="Global" className="bg-dark-800">🌍 Global (All Regions)</option>
                      <option value="North America" className="bg-dark-800">🇺🇸 North America {filterCosts.location > 0 ? `(🪙${filterCosts.location}/match)` : ''}</option>
                      <option value="Latin America" className="bg-dark-800">🇧🇷 Latin America {filterCosts.location > 0 ? `(🪙${filterCosts.location}/match)` : ''}</option>
                      <option value="Europe" className="bg-dark-800">🇪🇺 Europe {filterCosts.location > 0 ? `(🪙${filterCosts.location}/match)` : ''}</option>
                      <option value="Middle East" className="bg-dark-800">🇸🇦 Middle East {filterCosts.location > 0 ? `(🪙${filterCosts.location}/match)` : ''}</option>
                      <option value="South Asia" className="bg-dark-800">🇮🇳 South Asia {filterCosts.location > 0 ? `(🪙${filterCosts.location}/match)` : ''}</option>
                      <option value="East Asia" className="bg-dark-800">🇯🇵 East Asia {filterCosts.location > 0 ? `(🪙${filterCosts.location}/match)` : ''}</option>
                      <option value="Africa" className="bg-dark-800">🌍 Africa {filterCosts.location > 0 ? `(🪙${filterCosts.location}/match)` : ''}</option>
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


              {/* Profile Overlay */}
              {showProfile && <UserProfileMobile onClose={() => setShowProfile(false)} />}

              {/* Match History Overlay */}
              {showMatchHistory && <MatchHistoryMobile onClose={() => setShowMatchHistory(false)} />}

              {/* Search Modal Overlay (Mobile) */}
              {showSearchModal && (
                <div className="fixed inset-0 z-[100] flex flex-col animate-slide-up">
                  <DesktopSearchModal onClose={() => setShowSearchModal(false)} />
                </div>
              )}
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
                isLocalNsfw={isLocalNsfw}
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
          <div className="flex-1 md:relative absolute inset-0 md:flex md:flex-col overflow-hidden z-10 bg-black">
            {remoteStream ? (
              /* === CONNECTED: 50/50 Split screen on mobile === */
              <>
                {/* Remote Video - Top 50% on mobile */}
                <div className="absolute top-0 left-0 right-0 h-1/2 md:h-auto md:flex-none md:inset-0 overflow-hidden z-0 bg-black">
                  <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  {/* strangy.app watermark */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-2 md:hidden z-20">
                    <StrangyIcon className="w-6 h-6 rounded-lg opacity-60" size="text-[12px]" />
                    <span className="text-white/40 text-[11px] font-bold tracking-tight">strangy.app</span>
                  </div>
                </div>

                {/* Local Video - Bottom 50% on mobile */}
                <div className="absolute bottom-0 left-0 right-0 h-1/2 overflow-hidden md:hidden z-10 bg-black border-t-2 border-white/10 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
                  <video
                    ref={localVideoMobileRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover -scale-x-100 ${!isCamOn ? 'hidden' : ''} ${isLocalNsfw ? 'nsfw-blur' : ''}`}
                  />
                  {!isCamOn && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
                      <RiVideoOffLine className="text-white/20" size={48} />
                    </div>
                  )}

                  {/* INSTAGRAM LIVE STYLE FLOATING CHAT (Overlaying bottom half) */}
                  <div className="absolute bottom-[80px] left-4 right-16 z-30 flex flex-col md:hidden pointer-events-none">
                    <div 
                      className="flex flex-col gap-2 overflow-y-auto max-h-[200px] scrollbar-hide"
                      style={{ 
                        maskImage: 'linear-gradient(to top, black 85%, transparent 100%)', 
                        WebkitMaskImage: 'linear-gradient(to top, black 85%, transparent 100%)' 
                      }}
                    >
                      {messages.slice(-6).map((msg) => (
                        <div key={msg.id} className="flex items-start gap-2 animate-fade-in-up">
                          <div className="bg-black/40 backdrop-blur-xl px-3 py-1.5 rounded-[18px] flex items-center gap-2 max-w-[90%] border border-white/10">
                            <span className={`text-[12px] font-black whitespace-nowrap ${msg.senderId === currentUser.uid ? 'text-accent-pink' : 'text-accent-purple'}`}>
                              {msg.senderId === currentUser.uid ? 'You' : (partnerName || 'Stranger')}
                            </span>
                            <span className="text-[13px] text-white/95 leading-tight">
                              {msg.text}
                            </span>
                          </div>
                        </div>
                      ))}
                      {isPartnerTyping && (
                        <div className="bg-black/30 backdrop-blur-md px-3 py-1 rounded-full w-fit flex items-center gap-2 border border-white/5">
                          <div className="flex gap-1">
                            <span className="w-1 h-1 bg-white/50 rounded-full animate-bounce"></span>
                            <span className="w-1 h-1 bg-white/50 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                            <span className="w-1 h-1 bg-white/50 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                          </div>
                          <span className="text-[11px] text-white/60 font-bold">Partner is typing...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* INSTAGRAM LIVE STYLE BOTTOM INPUT & CONTROLS */}
                  <div className="absolute bottom-5 left-0 right-0 flex items-center gap-2 z-40 px-4 md:hidden">
                    {/* Input Bar */}
                    <form 
                      onSubmit={handleSendMessage}
                      className="flex-1 bg-white/10 backdrop-blur-2xl rounded-full border border-white/20 flex items-center px-4 py-2.5 shadow-2xl focus-within:bg-white/20 transition-all"
                    >
                      <input
                        type="text"
                        value={newMessage}
                        onChange={handleTyping}
                        placeholder="Add a comment..."
                        className="bg-transparent border-none outline-none text-white text-[15px] flex-1 placeholder:text-white/50"
                      />
                      <button type="submit" className={`ml-2 text-white font-bold text-sm ${!newMessage.trim() ? 'hidden' : 'text-accent-pink'}`}>
                        Post
                      </button>
                    </form>

                    {/* Stickers/Reactions Button */}
                    <button
                      onClick={() => setShowStickerPicker(!showStickerPicker)}
                      className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center justify-center text-white active:scale-90 transition-all"
                    >
                      <RiMagicLine size={20} />
                    </button>

                    {/* Next Button (Skip) */}
                    <button
                      onClick={handleNext}
                      className="w-11 h-11 rounded-full bg-gradient-to-br from-accent-purple to-indigo-600 flex items-center justify-center text-white shadow-lg active:scale-90 transition-all border border-white/20"
                    >
                      <RiArrowRightDoubleLine size={24} />
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
                  <p className="text-gray-500 text-sm mb-2">Please wait while we connect you</p>
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <p className="text-accent-purple font-bold text-xs uppercase tracking-widest">{waitingCount} users online</p>
                  </div>
                  
                  {/* Connection Debug Indicator */}
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <div className={`w-3 h-3 rounded-full ${
                      socketStatus === 'Connected' ? 'bg-green-500' : 
                      socketStatus === 'Connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                    }`}></div>
                    <span className="text-[10px] text-gray-400 font-mono uppercase tracking-tighter">
                      {socketStatus === 'Connected' ? 'Server Online' : 
                       socketStatus === 'Error' ? 'Connection Failed' : 'Connecting To Signaling...'}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setStatus('Idle');
                      setPartnerName(null);
                      setPartnerLocation(null);
                      setPartnerIsPremium(false);
                      pendingFilterCharge.current = null;
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
                <StrangyIcon className="w-6 h-6 rounded-full" size="text-[12px]" />
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
        {remoteStream && partnerName && partnerLocation && (
          <div className="absolute top-6 right-6 z-50 hidden md:flex items-center">
            <div className="flex items-center gap-4 bg-[#4a4049]/60 backdrop-blur-xl rounded-full pl-5 pr-1.5 py-1.5 shadow-2xl">
              <div className="flex flex-col py-1">
                <div className="flex items-center gap-1.5">
                  <RiUserLine className="w-4 h-4 text-white/80" />
                  <span className="text-white font-bold text-[15px]">
                    {partnerName} {partnerAge ? `(${partnerAge})` : ''} {partnerGender ? (partnerGender === 'Male' ? '♂' : '♀') : ''}
                    <span className="mx-1.5 text-white/40">|</span>
                    {getLocationDisplay(partnerLocation, showCityName)}
                  </span>
                  {partnerIsPremium && <PremiumBadge size="sm" />}
                </div>
                {userLocation && getDistanceBetween(userLocation, partnerLocation) && (
                  <p className="text-white/70 text-xs mt-0.5 flex items-center gap-1">
                    <RiHeartLine className="w-3 h-3" />
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
                className={`w-full h-full object-cover -scale-x-100 ${!isCamOn ? 'hidden' : ''} ${isLocalNsfw ? 'nsfw-blur' : ''}`}
              />
              {!isCamOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#1a1c1e]">
                  <RiVideoOffLine className="text-white/40" size={40} />
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
        {status === 'Connected' && remoteStream && (
          <div className="absolute top-0 left-0 right-0 z-[100] md:hidden">
            <div className="flex items-center justify-between px-4 py-4 bg-gradient-to-b from-black/90 via-black/40 to-transparent">
              <div className="flex items-center gap-3 min-w-0">
                {/* Partner Avatar Circle with Initial */}
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-orange-600 to-pink-600 border-2 border-white/20 flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-lg">
                  {partnerName?.charAt(0)?.toUpperCase() || 'P'}
                </div>
                <div className="min-w-0 flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-[16px] truncate leading-tight">{partnerName}</span>
                    {partnerIsPremium && <PremiumBadge size="sm" />}
                  </div>
                   <div className="flex items-center gap-1.5 overflow-hidden">
                    <p className="text-[12px] text-white/80 truncate flex-shrink">
                      {partnerGender && (
                        <span className="mr-1 opacity-90">{partnerGender === 'Male' ? '♂' : '♀'}</span>
                      )}
                      {partnerAge && `${partnerAge} • `}
                      {getLocationDisplay(partnerLocation, showCityName) || 'Online'}
                    </p>
                    <RiHeartLine className="text-accent-pink flex-shrink-0" size={14} />
                  </div>
                </div>
              </div>
              {/* Right Side Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowReportModal(true)}
                  className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white/70 hover:text-red-400 transition-colors border border-white/10"
                ><RiFlagLine size={20} /></button>
                
                <button
                  onClick={() => setShowConnectedUsers(true)}
                  className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all border border-white/10 active:scale-95"
                >
                  <RiMenuLine size={22} />
                </button>
              </div>
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
              {isMicOn ? <RiMicFill size={24} /> : <RiMicOffLine size={24} />}
            </button>
            {/* Cam */}
            <button
              onClick={() => setIsCamOn(!isCamOn)}
              className={`w-[52px] h-[52px] rounded-full flex items-center justify-center transition-all ${isCamOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500 text-white'}`}
            >
              {isCamOn ? <RiVidiconFill size={24} /> : <RiVideoOffLine size={24} />}
            </button>
            {/* End Call */}
            <button
              onClick={endCall}
              className="w-[60px] h-[60px] bg-[#ff4b4b] hover:bg-red-500 rounded-full flex items-center justify-center transition-all shadow-[0_0_20px_rgba(255,75,75,0.4)] mx-2 transform hover:scale-105"
            >
              <RiCloseLine size={32} className="text-white" />
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
              <RiArrowRightDoubleLine size={28} className="text-white" />
            </button>
          </div>
        )}
      </div>

      {/* Right Panel - Chat Interface (Desktop Only) */}
      {status === 'Connected' && (
        <div className={`hidden md:flex w-full md:w-[350px] h-full md:h-auto md:max-h-[70vh] md:min-h-[480px] bg-[#5c545e]/80 backdrop-blur-2xl md:rounded-[24px] border border-white/10 flex-col z-[200] absolute inset-0 md:inset-auto md:right-8 md:top-1/2 md:-translate-y-1/2 md:translate-x-0 ${showChat ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'} transition-all duration-300 transform shadow-[0_15px_40px_rgba(0,0,0,0.5)] overflow-hidden`}>
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
                <RiChat3Line className="mb-4 text-white/20" size={48} />
                <p>Say hi! Start the conversation with emojis or text.</p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.senderId === currentUser.uid ? 'items-end' : 'items-start'}`}
              >
                <span className="text-[10px] text-white/40 mb-1 px-1 font-bold uppercase tracking-wider">
                  {msg.senderId === currentUser.uid ? 'You' : (partnerName || 'Stranger')}
                </span>

                {msg.type === 'sticker' ? (
                  <div className="text-6xl my-2 animate-bounce-short">
                    {msg.text}
                  </div>
                ) : (
                  <div className={`max-w-[85%] px-4 py-3 rounded-[20px] text-[14px] leading-relaxed shadow-lg ${msg.senderId === currentUser.uid
                      ? 'bg-gradient-to-br from-accent-purple to-indigo-600 text-white rounded-tr-none border border-white/10'
                      : 'bg-white/10 backdrop-blur-md text-white/90 rounded-tl-none border border-white/5'
                    }`}>
                    {msg.text}
                  </div>
                )}

                <span className="text-[9px] text-white/20 mt-1 px-1">
                  {msg.timestamp === 'Just now' ? 'Just now' : new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
          <div className="p-4 bg-transparent pb-6">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-2 rounded-full transition-colors ${showEmojiPicker ? 'bg-accent-purple text-white' : 'hover:bg-white/5 text-gray-400'}`}
              >
                <RiEmotionHappyLine size={22} />
              </button>

              {/* Gift Button */}
              <div className="relative group">
                <button
                  type="button"
                  className="p-2 rounded-full hover:bg-white/5 text-pink-500 transition-colors"
                >
                  <RiGiftLine size={20} />
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
                <RiSendPlaneLine size={20} className="ml-1" />
              </button>
            </form>
          </div>
        </div>
      )}


      {/* Mobile Chat Toggle - REMOVED (now unified at top-left) */}

      {/* Mobile Connected Users List Overlay */}
      {showConnectedUsers && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-xl flex flex-col animate-fade-in">
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h3 className="text-xl font-bold">Recent Connections</h3>
            <button
              onClick={() => setShowConnectedUsers(false)}
              className="w-10 h-10 bg-white/10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
            >
              <RiCloseLine size={24} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-2">
            <MatchHistoryMobile onClose={() => setShowConnectedUsers(false)} />
          </div>
        </div>
      )}

      {/* Mobile Sticker Picker Overlay */}
      {showStickerPicker && (
        <div className="fixed inset-x-0 bottom-0 z-[120] bg-[#1a1c1e]/95 backdrop-blur-2xl rounded-t-[32px] p-6 border-t border-white/10 shadow-2xl animate-fade-in-up">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold">Send Sticker</h3>
            <button
              onClick={() => setShowStickerPicker(false)}
              className="text-gray-400 hover:text-white"
            >✕</button>
          </div>
          <div className="grid grid-cols-4 gap-4 pb-8">
            {['👋', '😂', '🔥', '❤', '😮', '👍', '🙈', '🚀', '🌈', '💎', '🎨', '✨', '🎈', '🍿', '🥤', '🎮'].map(sticker => (
              <button
                key={sticker}
                onClick={() => {
                  sendMessage(sticker, 'sticker');
                  setShowStickerPicker(false);
                }}
                className="text-4xl hover:scale-125 transition-transform active:scale-90"
              >
                {sticker}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Root Level Subscription Modal Overlay - Fixed Z-Index Context */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
          <DesktopSubscriptionModal onClose={() => setShowSubscriptionModal(false)} />
        </div>
      )}

      {/* Coin Store Modal Overlay */}
      {showCoinStore && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
          <CoinStoreModal isOpen={showCoinStore} onClose={() => setShowCoinStore(false)} />
        </div>
      )}

      {/* Safety Info Modal Overlay (Stay safe and have fun design) */}
      {showSafetyInfo && (
        <SafetyInfoModal onClose={() => setShowSafetyInfo(false)} />
      )}
    </div >
  );
};

export default VideoChat;
