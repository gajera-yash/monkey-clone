import React, { useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import VideoChat from './components/VideoChat';

function App() {
  const [isChatting, setIsChatting] = useState(false);
  const [userName, setUserName] = useState('');

  const startChat = (name) => {
    setUserName(name);
    setIsChatting(true);
  };
  const endChat = () => setIsChatting(false);

  return (
    <div className="font-sans antialiased">
      {isChatting ? (
        <VideoChat onEndChat={endChat} userName={userName} />
      ) : (
        <>
          <Header onStartChat={startChat} />
          <Hero onStartChat={startChat} />
          <Features />
          <FAQ />
          <Footer />
        </>
      )}
    </div>
  );
}

export default App;
