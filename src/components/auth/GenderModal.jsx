import React from 'react';

const GenderModal = ({ isOpen, onSelect, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-dark-900/90 backdrop-blur-xl animate-fade-in"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-lg bg-dark-800 border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl animate-scale-in">
                {/* Decoration */}
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-accent-purple/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-accent-pink/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

                <div className="relative text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/5 border border-white/10 mb-8">
                        <span className="text-4xl animate-bounce">👋</span>
                    </div>

                    <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
                        Select Your <br />
                        <span className="text-gradient">Gender.</span>
                    </h2>

                    <p className="text-gray-400 mb-10 text-lg">
                        This helps us find the best <br />
                        connections for you.
                    </p>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Male Option */}
                        <button
                            onClick={() => onSelect('Male')}
                            className="group relative flex flex-col items-center justify-center p-8 bg-white/5 border border-white/10 rounded-3xl hover:bg-accent-blue/10 hover:border-accent-blue/50 transition-all duration-300 hover:scale-105"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-accent-blue/20 flex items-center justify-center mb-4 group-hover:bg-accent-blue group-hover:text-white transition-colors">
                                <span className="text-3xl">👨</span>
                            </div>
                            <span className="text-lg font-bold text-gray-300 group-hover:text-white">Male</span>
                            <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-opacity"></div>
                        </button>

                        {/* Female Option */}
                        <button
                            onClick={() => onSelect('Female')}
                            className="group relative flex flex-col items-center justify-center p-8 bg-white/5 border border-white/10 rounded-3xl hover:bg-accent-pink/10 hover:border-accent-pink/50 transition-all duration-300 hover:scale-105"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-accent-pink/20 flex items-center justify-center mb-4 group-hover:bg-accent-pink group-hover:text-white transition-colors">
                                <span className="text-3xl">👩</span>
                            </div>
                            <span className="text-lg font-bold text-gray-300 group-hover:text-white">Female</span>
                            <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 shadow-[0_0_30px_rgba(236,72,153,0.3)] transition-opacity"></div>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default GenderModal;
