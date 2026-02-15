import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
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

function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <AuthProvider>
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
                <Header onStartChat={() => setIsLoginOpen(true)} />
                <Hero onStartChat={() => {
                  // If logged in, go to chat, else open modal
                  // For now we just open modal as Hero handles the start logic
                  setIsLoginOpen(true)
                }} />
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
          </Routes>
        </div>
      </Router>
    </AuthProvider>
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
