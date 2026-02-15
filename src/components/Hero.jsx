import React, { useState } from 'react';

const Hero = ({ onStartChat }) => {
    const [name, setName] = useState('');

    const handleStart = () => {
        if (name.trim()) onStartChat(name);
        else {
            // Shake animation or toast could go here
            document.getElementById('name-input').focus();
        }
    };

    return (
        <div className="relative w-full h-screen flex items-center justify-center overflow-hidden bg-dark-900">
            {/* Background Effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-accent-purple/30 rounded-full blur-[120px] animate-blob"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-accent-pink/30 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>
            <div className="absolute top-[40%] left-[40%] w-[400px] h-[400px] bg-accent-blue/20 rounded-full blur-[100px] animate-blob animation-delay-4000"></div>

            {/* Grid Pattern Overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>

            <div className="relative z-10 container mx-auto px-6 text-center">

                {/* Badge */}
                <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8 backdrop-blur-md animate-fade-in-up">
                    <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-sm font-medium text-gray-300">14k+ Users Online Now</span>
                </div>

                {/* Headline */}
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-6 leading-tight animate-fade-in-up delay-100">
                    Talk to <br />
                    <span className="text-gradient">Strangers.</span>
                </h1>

                <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-200">
                    Spontaneous video connections with people from around the globe.
                    <span className="text-gray-300"> No login required.</span> Just start talking.
                </p>

                {/* Input Area */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto animate-fade-in-up delay-300">
                    <input
                        id="name-input"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="What's your name?"
                        className="w-full sm:w-auto flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-full text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-purple/50 focus:border-accent-purple/50 transition-all backdrop-blur-sm"
                        onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                    />

                    <button
                        onClick={handleStart}
                        className="w-full sm:w-auto btn-primary whitespace-nowrap"
                    >
                        Start Chatting
                    </button>
                </div>

                {/* Features / Social Proof */}
                <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto opacity-0 animate-fade-in-up delay-500" style={{ animationFillMode: 'forwards' }}>
                    {['⚡ Instant Match', '🔒 Secure & Safe', '🌎 Global Reach', '💸 100% Free'].map((item, i) => (
                        <div key={i} className="text-gray-500 font-medium text-sm flex items-center justify-center gap-2">
                            {item}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Hero;
