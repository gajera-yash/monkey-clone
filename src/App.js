import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import VideoChat from './components/VideoChat';
import LoginModal from './components/auth/LoginModal';
import PrivateRoute from './components/auth/PrivateRoute';
import AdminDashboard from './components/admin/AdminDashboard';
import AgeGate from './components/safety/AgeGate';
import SafetyGuidelines from './components/safety/SafetyGuidelines';
import GenderModal from './components/auth/GenderModal';

function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isGenderModalOpen, setIsGenderModalOpen] = useState(false);
  const { currentUser } = useAuth();

  // Improved start chat handler with Gender Selection
  const handleStartChat = () => {
    if (currentUser) {
      window.location.href = '/chat';
    } else {
      // Check if gender is already selected
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
    <Router>
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

        <Routes>
          <Route path="/" element={
            <>
              <Header onStartChat={handleStartChat} />
              <Hero onStartChat={handleStartChat} />
              <Features />
              <FAQ />
              <Footer />
            </>
          } />

          <Route path="/chat" element={
            <PrivateRoute>
              <ChatLayout />
            </PrivateRoute>
          } />

          <Route path="/admin" element={
            <AdminDashboard />
          } />

          <Route path="/safety" element={
            <>
              <Header onStartChat={handleStartChat} />
              <SafetyGuidelines />
              <Footer />
            </>
          } />
        </Routes>
      </div>
    </Router>
  );
}

// Wrapper to handle chat state inside the protected route
const ChatLayout = () => {
  const [isChatting, setIsChatting] = useState(true);

  if (!isChatting) {
    return <Navigate to="/" />;
  }

  return <VideoChat onEndChat={() => window.location.href = '/'} userName="User" />;
};

export default App;
