import React from 'react';

const IdleDesktop = ({ localVideoRef, isCamOn, onStartChat }) => {
    return (
        <div className="flex-1 flex items-center justify-center p-8 z-10">
            <div className="flex w-full max-w-5xl gap-6 items-stretch">
                {/* Left Panel - Camera Preview */}
                <div className="flex-1 aspect-square bg-black rounded-3xl overflow-hidden relative border border-white/10 shadow-2xl">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${!isCamOn ? 'hidden' : ''}`}
                    />
                    {!isCamOn && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                            <span className="text-6xl">📷</span>
                        </div>
                    )}
                    {/* Dark Overlay for Text */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80"></div>

                    {/* Monkey Icons with Camera/Mic at center of black screen if cam is off, but here we show text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                        {!isCamOn && (
                            <div className="mb-6 flex items-center gap-4">
                                <span className="text-5xl">👑</span>
                                <span className="text-5xl">🐵</span>
                                <span className="text-5xl">📹</span>
                            </div>
                        )}
                        <p className="mt-auto text-white font-medium text-lg leading-relaxed max-w-xs">
                            With you on camera, it's easier to meet the right one.
                        </p>
                    </div>
                </div>

                {/* Right Panel - Controls */}
                <div className="flex-1 bg-accent-purple/40 backdrop-blur-xl rounded-3xl p-10 flex flex-col items-center justify-center border border-white/10 shadow-2xl">
                    {/* SOLO/SQUAD toggle */}
                    <div className="bg-black/20 p-1.5 rounded-full flex items-center mb-12 border border-white/5">
                        <button className="px-8 py-2.5 rounded-full bg-yellow-400 text-black font-bold text-sm shadow-xl shadow-yellow-400/20">
                            SOLO
                        </button>
                        <button className="px-8 py-2.5 rounded-full text-white/50 font-bold text-sm hover:text-white transition-colors">
                            SQUAD
                        </button>
                    </div>

                    {/* Logo */}
                    <div className="w-24 h-24 bg-white/10 rounded-3xl flex items-center justify-center mb-6 border border-white/10 shadow-inner">
                        <span className="text-5xl">🐵</span>
                    </div>

                    <h1 className="text-4xl font-bold mb-3 text-white">Monkey</h1>
                    <p className="text-white/70 mb-12 text-center max-w-xs text-lg font-medium">
                        Make new friends face-to-face
                    </p>

                    <div className="w-full space-y-4 max-w-xs">
                        {/* Gender Filter */}
                        <button className="w-full bg-white text-black font-bold py-4 rounded-3xl hover:bg-gray-100 transition-all flex items-center justify-center gap-3 shadow-xl shadow-black/10">
                            <span>👫</span> Both
                        </button>

                        {/* Start Button */}
                        <button
                            onClick={onStartChat}
                            className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold py-5 rounded-3xl text-xl shadow-xl shadow-yellow-400/20 transform hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3"
                        >
                            Start Video Chat
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IdleDesktop;
