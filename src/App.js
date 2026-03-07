import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import { AdminProvider } from './context/AdminContext';
import { CoinsProvider, useCoins } from './context/CoinsContext';
import { PremiumProvider } from './context/PremiumContext';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import VideoChat from './components/VideoChat';
import LoginModal from './components/auth/LoginModal';
import PrivateRoute from './components/auth/PrivateRoute';
import AdminLayout from './components/admin/AdminLayout';
import AdminProtectedRoute from './components/auth/AdminProtectedRoute';
import AgeGate from './components/safety/AgeGate';
import SafetyGuidelines from './components/safety/SafetyGuidelines';
import GenderModal from './components/auth/GenderModal';
import DailyBonusModal from './components/coins/DailyBonusModal';

// Creator Components
import CreatorRoute from './components/creator/CreatorRoute';
import CreatorOnboarding from './components/creator/CreatorOnboarding';
import FaceVerification from './components/creator/FaceVerification';
import VoiceVerification from './components/creator/VoiceVerification';
import CreatorDashboard from './components/creator/CreatorDashboard';
import CreatorWithdraw from './components/creator/CreatorWithdraw';
import CreatorSettings from './components/creator/CreatorSettings';

const AppContent = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isGenderModalOpen, setIsGenderModalOpen] = useState(false);
  const [isBonusOpen, setIsBonusOpen] = useState(false);
  const { currentUser, loading } = useAuth();
  const { checkDailyBonus } = useCoins();
  const navigate = useNavigate();

  useEffect(() => {
    const checkBonus = async () => {
      if (currentUser) {
        const hasBonus = await checkDailyBonus();
        if (hasBonus) setIsBonusOpen(true);
      }
    };
    checkBonus();
  }, [currentUser, checkDailyBonus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-t-accent-purple border-white/10 animate-spin"></div>
      </div>
    );
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
      // Not logged in - show gender selection first
      const savedGender = localStorage.getItem('userGender');
      if (!savedGender) {
        setIsGenderModalOpen(true);
      } else {
        setIsLoginOpen(true);
      }
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
      <DailyBonusModal isOpen={isBonusOpen} onClose={() => setIsBonusOpen(false)} />

      <Routes>
        <Route path="/" element={
          (() => {
            if (!currentUser) {
              return (
                <>
                  <Header onStartChat={handleStartChat} />
                  <Hero onStartChat={handleStartChat} />
                  <Features />
                  <FAQ />
                  <Footer />
                </>
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
      if (currentUser.accountStatus === 'active') {
        navigate('/creator/dashboard', { replace: true });
      } else {
        navigate('/creator/onboarding', { replace: true });
      }
    }
  }, [currentUser, navigate, loading]);

  // Show nothing while redirecting a creator
  if (loading || currentUser?.isCreator) {
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
