import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import { AdminProvider } from './context/AdminContext';
import { CoinsProvider, useCoins } from './context/CoinsContext';
import { PremiumProvider } from './context/PremiumContext';
import { supabase } from './supabase';
import Header from './components/Header';
import socket from './utils/socket';
import toast from 'react-hot-toast';
import Hero from './components/Hero';
import Features from './components/Features';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import LandingPage from './components/LandingPage';
import VideoChat from './components/VideoChat';
import LoginModal from './components/auth/LoginModal';
import PrivateRoute from './components/auth/PrivateRoute';
import AdminLayout from './components/admin/AdminLayout';
import AdminProtectedRoute from './components/auth/AdminProtectedRoute';
import AgeGate from './components/safety/AgeGate';
import SafetyGuidelines from './components/safety/SafetyGuidelines';
import GenderModal from './components/auth/GenderModal';
import DailyBonusModal from './components/coins/DailyBonusModal';
import CoinStoreModal from './components/coins/CoinStoreModal';
import SubscriptionPlans from './components/monetization/SubscriptionPlans';
import MaintenancePage from './components/MaintenancePage';
import ProfileCompletionModal from './components/auth/ProfileCompletionModal';

// Creator Components
import CreatorRoute from './components/creator/CreatorRoute';
import CreatorOnboarding from './components/creator/CreatorOnboarding';
import FaceVerification from './components/creator/FaceVerification';
import VoiceVerification from './components/creator/VoiceVerification';
import CreatorDashboard from './components/creator/CreatorDashboard';
import CreatorWithdraw from './components/creator/CreatorWithdraw';
import CreatorSettings from './components/creator/CreatorSettings';
import { loadFaceModels } from './utils/faceApiModelLoader';
import { useParams } from 'react-router-dom';

// Static Pages
import About from './components/pages/About';
import TermsOfService from './components/pages/TermsOfService';
import PrivacyPolicy from './components/pages/PrivacyPolicy';
import HelpCenter from './components/pages/HelpCenter';
import ContactUs from './components/pages/ContactUs';
import ReportBug from './components/pages/ReportBug';
import Community from './components/pages/Community';


const AppContent = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isGenderModalOpen, setIsGenderModalOpen] = useState(false);
  const [isBonusOpen, setIsBonusOpen] = useState(false);
  const [isCoinStoreOpen, setIsCoinStoreOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const { currentUser, loading, logout } = useAuth();
  const ringtone = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/1350/1350-preview.mp3'));
  
  useEffect(() => {
    if (ringtone.current) ringtone.current.loop = true;
  }, []);
  const { checkDailyBonus, registerModalCallbacks } = useCoins();
  const navigate = useNavigate();
  const location = useLocation();

  const bonusCheckedForUser = useRef(null);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Capture Referral Code from ?ref= query param on ANY page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      console.log("[App] Referral code detected:", ref);
      localStorage.setItem('referralCode', ref);
    }
  }, []);

  // Check maintenance mode from database
  useEffect(() => {
      const checkMaintenance = async () => {
        const { data } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'maintenance_mode')
          .single();
        if (data && (data.value === 'true' || data.value === true)) {
          setMaintenanceMode(true);
        } else {
          setMaintenanceMode(false);
        }
      };
      
      checkMaintenance();
  
      // Re-check every 60 seconds
      const interval = setInterval(checkMaintenance, 60000);
      return () => clearInterval(interval);
    }, []);
  
    // Enforce logout if Maintenance mode is active and user is not admin
    useEffect(() => {
      const isAdminUser = currentUser?.role === 'admin' || currentUser?.role === 'moderator' || currentUser?.role === 'support';
      if (maintenanceMode && currentUser && !isAdminUser) {
        logout();
      }
    }, [maintenanceMode, currentUser, logout]);

  // Register modal openers into CoinsContext so any component can trigger them
  useEffect(() => {
    registerModalCallbacks(
      () => setIsCoinStoreOpen(true),
      () => setIsSubscriptionOpen(true),
      () => setIsBonusOpen(true)
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Only check bonus once per login session (not on every profile update)
    if (!currentUser?.id) {
      bonusCheckedForUser.current = null;
      return;
    }

    // Delay bonus for creators until they are active/verified
    if (currentUser.isCreator && currentUser.accountStatus !== 'active') return;
    
    // Delay bonus until profile is completed (to avoid overlapping modals)
    if (!currentUser.is_profile_completed) return;

    if (bonusCheckedForUser.current === currentUser.id) return;
    bonusCheckedForUser.current = currentUser.id;

    const checkBonus = async () => {
      const hasBonus = await checkDailyBonus();
      if (hasBonus) setIsBonusOpen(true);
    };
    checkBonus();
  }, [currentUser?.id, currentUser?.isCreator, currentUser?.accountStatus, currentUser?.is_profile_completed, checkDailyBonus]);

  // Global Call Listener and UID Registration
  useEffect(() => {
    if (!currentUser?.id) return;



    const handleConnect = () => {
      console.log("[Global] Socket connected, registering UID:", currentUser.id);
      socket.emit('register-uid', currentUser.id);
    };

    const handleIncomingCall = (payload) => {
      // Support both legacy `send-private-invite` payload and new `request-direct-call` payload
      const senderUid = payload.senderUid || payload.callerData?.uid;
      const senderName = payload.senderName || payload.callerData?.name || 'User';
      const senderPhoto = payload.senderPhoto || payload.callerData?.photoURL;
      const isNewDirectCall = payload.isNewDirectCall || !!payload.callerSocketId;

      console.log("[Global] Incoming call from:", senderName);
      ringtone.current.play().catch(e => console.log("Ringtone blocked", e));
      
      // If we are on the CreatorDashboard we already show a big modal, skip the toast
      if (window.location.pathname.includes('/creator') && isNewDirectCall) {
          return;
      }

      toast((t) => (
        <div className="flex flex-col gap-3 min-w-[250px]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xl overflow-hidden border-2 border-indigo-400">
                {senderPhoto ? <img src={senderPhoto} className="w-full h-full object-cover" alt="" /> : (senderName ? senderName.charAt(0) : 'U')}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#333] animate-pulse" />
            </div>
            <div>
              <p className="text-white text-sm font-bold">{senderName}</p>
              <p className="text-white/40 text-[10px]">is calling you now...</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <button 
              onClick={() => {
                if (isNewDirectCall) {
                    navigate('/chat', { state: { incomingDirectCall: payload } });
                } else {
                    socket.emit('accept-private-invite', { targetUid: currentUser.id, senderUid });
                    if (window.location.pathname !== '/chat') navigate('/chat');
                }
                
                toast.dismiss(t.id);
                ringtone.current.pause();
                ringtone.current.currentTime = 0;
              }}
              className="flex-1 bg-green-500 hover:bg-green-400 text-white text-xs font-black py-2.5 rounded-xl transition-colors shadow-lg shadow-green-500/20"
            >
              ACCEPT
            </button>
            <button 
              onClick={() => {
                if (isNewDirectCall) {
                    socket.emit('decline-direct-call', { callerSocketId: payload.callerSocketId });
                } else {
                    socket.emit('decline-private-invite', { targetUid: currentUser.id, senderUid });
                }
                toast.dismiss(t.id);
                ringtone.current.pause();
                ringtone.current.currentTime = 0;
              }}
              className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 text-xs font-bold py-2.5 rounded-xl transition-colors"
            >
              DECLINE
            </button>
          </div>
        </div>
      ), { 
        duration: 15000, 
        id: `call-${payload.callerSocketId || senderUid}`,
        position: 'top-right',
        style: {
          background: '#1a172e',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '16px',
          borderRadius: '20px'
        }
      });
    };

    const handleCallCancelled = (payload) => {
        toast.dismiss(`call-${payload.callerSocketId}`);
        ringtone.current.pause();
        ringtone.current.currentTime = 0;
    };

    socket.on('connect', handleConnect);
    socket.on('incoming-call', handleIncomingCall);
    socket.on('call-cancelled', handleCallCancelled);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('incoming-call', handleIncomingCall);
      socket.off('call-cancelled', handleCallCancelled);
    };
  }, [currentUser?.id, navigate]);

  // Pre-load AI models for creators or potential creators
  useEffect(() => {
    if (currentUser?.isCreator || location.pathname.includes('/creator') || localStorage.getItem('userGender') === 'Female') {
      loadFaceModels().catch(err => console.error("Initial model load failed", err));
    }
  }, [currentUser?.isCreator, location.pathname]);

  // Force navigate to home on back button
  useEffect(() => {
    const handlePopState = (event) => {
      // If we are not at home, force go home
      if (window.location.pathname !== '/') {
        navigate('/', { replace: true });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-t-accent-purple border-white/10 animate-spin"></div>
      </div>
    );
  }

  // Maintenance mode: show for non-admin users only (not on /admin routes)
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'moderator' || currentUser?.role === 'support';
  const isAdminRoute = location.pathname.startsWith('/admin');
  if (maintenanceMode && !isAdmin && !isAdminRoute) {
    return <MaintenancePage />;
  }

  // Improved start chat handler with Gender Selection
  const handleStartChat = () => {
    if (currentUser) {
      // Creator already logged in - send to right place
      if (currentUser.isCreator) {
        if (currentUser.accountStatus === 'active') {
          navigate('/creator/dashboard');
        } else {
          navigate('/creator/onboarding');
        }
      } else {
        navigate('/chat');
      }
    } else {
      // Not logged in - show login modal directly
      setIsLoginOpen(true);
    }
  };

  const handleGenderSelect = (gender) => {
    localStorage.setItem('userGender', gender);
    setIsGenderModalOpen(false);
    setIsLoginOpen(true);
  };

  return (
    <div className="font-sans antialiased text-white bg-dark-900 min-h-screen">
      <AgeGate />
      <Toaster position="top-center" toastOptions={{
        style: {
          background: '#333',
          color: '#fff',
        },
      }} />

      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
      <GenderModal
        isOpen={isGenderModalOpen}
        onSelect={handleGenderSelect}
        onClose={() => setIsGenderModalOpen(false)}
      />
      {!location.pathname.startsWith('/admin') && (
        <DailyBonusModal isOpen={isBonusOpen} onClose={() => setIsBonusOpen(false)} />
      )}
      {isCoinStoreOpen && currentUser && (
        <CoinStoreModal isOpen={isCoinStoreOpen} onClose={() => setIsCoinStoreOpen(false)} />
      )}
      {isSubscriptionOpen && currentUser && (
        <SubscriptionPlans userId={currentUser.id} onClose={() => setIsSubscriptionOpen(false)} />
      )}

      {/* Mandatory Profile Completion Modal */}
      {currentUser && !currentUser.is_profile_completed && !isAdminRoute && (
        <ProfileCompletionModal isOpen={true} user={currentUser} />
      )}

      <Routes>
        <Route path="/" element={
          (() => {
            if (!currentUser) {
              return (
                <LandingPage onStartChat={handleStartChat} />
              );
            }
            // Creator redirect from root
            if (currentUser.isCreator) {
              if (currentUser.accountStatus === 'active') {
                return <Navigate to="/creator/dashboard" replace />;
              }
              return <Navigate to="/creator/onboarding" replace />;
            }
            // Normal male user
            return <Navigate to="/chat" replace />;
          })()
        } />

        <Route path="/chat" element={
          <PrivateRoute>
            <ChatLayout />
          </PrivateRoute>
        } />

        <Route path="/admin/*" element={
          <AdminProtectedRoute>
            <AdminLayout />
          </AdminProtectedRoute>
        } />

        <Route path="/safety" element={
          <>
            <Header onStartChat={handleStartChat} />
            <SafetyGuidelines />
            <Footer />
          </>
        } />

        {/* Creator Routes */}
        <Route path="/creator/onboarding" element={
          <PrivateRoute>
            <CreatorOnboarding />
          </PrivateRoute>
        } />

        <Route path="/creator/verify/face" element={
          <PrivateRoute>
            <FaceVerification />
          </PrivateRoute>
        } />

        <Route path="/creator/verify/voice" element={
          <PrivateRoute>
            <VoiceVerification />
          </PrivateRoute>
        } />

        <Route path="/creator/dashboard" element={
          <CreatorRoute>
            <CreatorDashboard />
          </CreatorRoute>
        } />

        <Route path="/creator/withdraw" element={
          <CreatorRoute>
            <CreatorWithdraw />
          </CreatorRoute>
        } />

        <Route path="/creator/settings" element={
          <CreatorRoute>
            <CreatorSettings />
          </CreatorRoute>
        } />

        {/* Static Pages Routes */}
        <Route path="/about" element={
          <>
            <Header onStartChat={handleStartChat} />
            <About />
            <Footer />
          </>
        } />
        <Route path="/terms" element={
          <>
            <Header onStartChat={handleStartChat} />
            <TermsOfService />
            <Footer />
          </>
        } />
        <Route path="/privacy" element={
          <>
            <Header onStartChat={handleStartChat} />
            <PrivacyPolicy />
            <Footer />
          </>
        } />
        <Route path="/help" element={
          <>
            <Header onStartChat={handleStartChat} />
            <HelpCenter />
            <Footer />
          </>
        } />
        <Route path="/contact" element={
          <>
            <Header onStartChat={handleStartChat} />
            <ContactUs />
            <Footer />
          </>
        } />
        <Route path="/report-bug" element={
          <>
            <Header onStartChat={handleStartChat} />
            <ReportBug />
            <Footer />
          </>
        } />
        <Route path="/community" element={
          <>
            <Header onStartChat={handleStartChat} />
            <Community />
            <Footer />
          </>
        } />
        {/* Referral Link Route: /ref/:code stores code and redirects home */}
        <Route path="/ref/:code" element={<ReferralRedirect />} />

      </Routes>

    </div>
  );
};

function App() {
  return (
    <Router>
      <AdminProvider>
        <CoinsProvider>
          <PremiumProvider>
            <AppContent />
          </PremiumProvider>
        </CoinsProvider>
      </AdminProvider>
    </Router>
  );
}

// Wrapper to handle chat state inside the protected route
const ChatLayout = () => {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const [isChatting, setIsChatting] = useState(true);

  // Creator Redirect Logic — runs when user data is fully loaded
  useEffect(() => {
    if (loading) return; // wait for Supabase data
    if (currentUser?.isCreator) {
      if (currentUser.accountStatus !== 'active') {
        navigate('/creator/onboarding', { replace: true });
      }
      // If active, they are allowed to stay here (Go Live mode)
    }
  }, [currentUser, navigate, loading]);

  // Show loader only while loading OR while a non-active creator is being redirected to onboarding
  if (loading || (currentUser?.isCreator && currentUser?.accountStatus !== 'active')) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-t-accent-purple border-white/10 animate-spin"></div>
      </div>
    );
  }

  if (!isChatting) {
    return <Navigate to="/" replace />;
  }

  return (
    <VideoChat
      onEndChat={() => navigate('/')}
      userName={currentUser?.displayName || 'User'}
    />
  );
};

export default App;

// =============================================
// Referral Redirect Handler
// Captures code from URL path and redirects to landing page
// =============================================
const ReferralRedirect = () => {
  const { code } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      console.log('[ReferralRedirect] Captured code from path:', code);
      localStorage.setItem('referralCode', code);
    }
    navigate('/', { replace: true });
  }, [code, navigate]);

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-t-accent-purple border-white/10 animate-spin" />
    </div>
  );
};
