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

function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const { currentUser } = useAuth();

  // Improved start chat handler
  const handleStartChat = () => {
    if (currentUser) {
      window.location.href = '/chat'; // Or use navigate if inside Router? 
      // Wait, App is inside Router now? No, App RENDERs Router.
      // So App cannot use useNavigate. 
      // But window.location.href works. 
      // BETTER: Move Router to index.js too? 
      // OR: Just use window.location.href for now as it's a hard redirect which is fine, 
      // BUT even better: Create a "Layout" component or similar.
      // actually if I just use window.location.href = '/chat', it reloads app.
      // To use useNavigate, I need to be inside Router.
      // Let's move Router to index.js as well? 
      // Or just keep it here and use a dirty trick? 
      // Let's use window.location.href for simplicity in this file structure, 
      // OR better: Create a `MainContent` component inside App.
    } else {
      setIsLoginOpen(true);
    }
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
