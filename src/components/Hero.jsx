import React from 'react';

const Hero = ({ onStartChat }) => {
    return (
        <div className="relative w-full h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-700 overflow-hidden">
            {/* Background Animation Overlay (Optional subtle pulse) */}
            <div className="absolute inset-0 bg-black/10"></div>

            <div className="relative z-10 container mx-auto px-6 text-center text-white flex flex-col items-center">
                {/* Badge/Tag */}
                <div className="mb-6 animate-fade-in-down">
                    <span className="bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-1.5 rounded-full text-sm font-medium uppercase tracking-wider text-pink-200">
                        Connect Globally
                    </span>
                </div>

                {/* Headline */}
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight animate-fade-in-up">
                    LIVE VIDEO CHAT & <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-300">
                        TALK TO STRANGERS
                    </span>
                </h1>

                {/* Subheadline/Description */}
                <p className="text-lg md:text-xl text-gray-200 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-100">
                    Experience a fresh way to meet new people from around the world.
                    Make video chat easy, natural, and fun with just one click.
                </p>

                {/* Name Input & CTA */}
                <div className="flex flex-col items-center space-y-4 w-full max-w-md animate-fade-in-up delay-200">
                    <input
                        type="text"
                        placeholder="Enter your name..."
                        id="username-input"
                        className="w-full px-6 py-4 rounded-full bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 backdrop-blur-sm transition-all"
                    />

                    <button
                        onClick={() => {
                            const name = document.getElementById('username-input').value;
                            if (name.trim()) onStartChat(name);
                            else alert("Please enter your name!");
                        }}
                        className="group relative w-full px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
                    >
                        <span className="relative z-10 text-white">Start Chatting</span>
                        <div className="absolute inset-0 rounded-full bg-white/20 blur-md opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
                    </button>
                </div>

                {/* Footer/Trust indicators (optional) */}
                <div className="mt-16 flex items-center justify-center space-x-8 text-white/50 animate-fade-in-up delay-300">
                    <span>1M+ Users</span>
                    <span>•</span>
                    <span>Safe & Secure</span>
                    <span>•</span>
                    <span>Free to Use</span>
                </div>
            </div>
        </div>
    );
};

export default Hero;
