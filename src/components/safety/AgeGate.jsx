import React, { useState, useEffect } from 'react';

const AgeGate = ({ onVerify }) => {
    const [isChecked, setIsChecked] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const isVerified = localStorage.getItem('isAgeVerified');
        if (!isVerified) {
            setIsVisible(true);
        } else if (onVerify) {
            onVerify();
        }
    }, [onVerify]);

    const handleEnter = () => {
        if (isChecked) {
            localStorage.setItem('isAgeVerified', 'true');
            setIsVisible(false);
            if (onVerify) onVerify();
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
            <div className="bg-dark-800 border border-red-500/30 rounded-2xl w-full max-w-md p-8 shadow-2xl relative text-center">
                <div className="mb-6">
                    <span className="text-5xl">🔞</span>
                </div>

                <h2 className="text-3xl font-bold text-white mb-4">
                    Age Verification
                </h2>

                <p className="text-gray-300 mb-8 leading-relaxed">
                    This website contains video chat with strangers.
                    You must be <strong>18 years or older</strong> to enter.
                </p>

                <div className="flex items-center justify-center gap-3 mb-8 cursor-pointer" onClick={() => setIsChecked(!isChecked)}>
                    <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-accent-purple border-accent-purple' : 'border-gray-500'}`}>
                        {isChecked && (
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </div>
                    <span className="text-white select-none">I am 18 years or older</span>
                </div>

                <button
                    onClick={handleEnter}
                    disabled={!isChecked}
                    className={`w-full font-bold py-4 rounded-xl transition-all ${isChecked
                            ? 'bg-white text-black hover:bg-gray-200'
                            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        }`}
                >
                    Enter Website
                </button>
            </div>
        </div>
    );
};

export default AgeGate;
