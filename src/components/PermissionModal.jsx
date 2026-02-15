import React from 'react';

const PermissionModal = ({ isOpen, onGrant, error }) => {
    if (!isOpen) return null;

    const isSecureContextError = error && (
        error.includes('navigator.mediaDevices is undefined') ||
        error.toString().includes('TypeError') || // Often "TypeError: Cannot read properties of undefined (reading 'getUserMedia')"
        !window.isSecureContext
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">📷</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Camera Access Needed</h2>
                    <p className="text-gray-400">
                        {error ? (
                            <span className="text-red-400 block mb-2 font-medium">Error: {error}</span>
                        ) : (
                            "To video chat with strangers, we need access to your camera and microphone."
                        )}
                    </p>

                    {isSecureContextError && (
                        <div className="mt-4 bg-yellow-900/30 border border-yellow-700/50 p-3 rounded-lg text-left text-sm text-yellow-200">
                            <p className="font-bold mb-1">⚠️ Connection Issue Detected</p>
                            <p className="mb-2">Browsers block camera access on insecure connections (http://192.168...).</p>
                            <p className="font-semibold">Solutions:</p>
                            <ul className="list-disc list-inside space-y-1 ml-1 text-xs text-yellow-100/80">
                                <li>Use <strong>localhost</strong> on PC.</li>
                                <li>On Chrome Mobile: Go to <code>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code>, enable it, and add your IP address.</li>
                                <li>Or use a tunneling service like ngrok for HTTPS.</li>
                            </ul>
                        </div>
                    )}
                </div>

                <div className="flex flex-col space-y-3">
                    <button
                        onClick={onGrant}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold transition-all transform active:scale-95 shadow-lg shadow-purple-900/20"
                    >
                        {error ? "Try Again" : "Allow Camera & Mic"}
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-medium transition-colors"
                    >
                        Refresh Page
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PermissionModal;
