import React, { useState } from 'react';

// Generate random color for avatar
const avatarColors = ['bg-orange-500', 'bg-green-500', 'bg-purple-500', 'bg-blue-500', 'bg-pink-500', 'bg-teal-500', 'bg-red-500'];
const getColor = (name) => avatarColors[name.charCodeAt(0) % avatarColors.length];

const MOCK_HISTORY = [
    { id: 1, name: 'Majid Ali', location: 'Sikandra Rao', emoji: '🤨', time: '02/16/2026 10:12PM', duration: '00:01' },
    { id: 2, name: 'Krishna Linda', location: 'Jammu', emoji: '🤨', time: '02/16/2026 10:12PM', duration: '00:22' },
    { id: 3, name: 'Jai prakesh Kes', location: 'Chhattisgarh', emoji: '🤨', time: '02/16/2026 10:12PM', duration: '00:21' },
    { id: 4, name: 'Praval Soni', location: 'Indore', emoji: '🤨', time: '02/16/2026 10:11PM', duration: '00:06' },
];

const MatchHistoryMobile = ({ onClose }) => {
    const [history, setHistory] = useState(MOCK_HISTORY);

    const deleteEntry = (id) => {
        setHistory(prev => prev.filter(h => h.id !== id));
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-dark-900/95 backdrop-blur-xl animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h2 className="text-xl font-bold">Match History</h2>
                <button
                    onClick={onClose}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-lg"
                >
                    ✕
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-3">
                {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                        <span className="text-5xl mb-4">📭</span>
                        <p>No match history yet</p>
                    </div>
                ) : (
                    history.map((match) => (
                        <div key={match.id} className="bg-dark-800 border border-white/10 rounded-2xl p-4">
                            {/* Top info row */}
                            <div className="flex items-center justify-between mb-3 text-xs text-gray-500">
                                <span>{match.time}</span>
                                <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-1">▶️ {match.duration}</span>
                                    <span className="text-lg cursor-pointer">🐵</span>
                                    <button
                                        onClick={() => deleteEntry(match.id)}
                                        className="text-lg hover:scale-110 transition-transform"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>

                            {/* User row */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {/* Colored Avatar */}
                                    <div className={`w-12 h-12 rounded-full ${getColor(match.name)} flex items-center justify-center text-lg font-bold text-white shadow-lg`}>
                                        {match.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-semibold text-white">{match.name}</span>
                                            <span>{match.emoji}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                            <span>📍</span>
                                            <span>{match.location}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Heart button */}
                                <button className="w-10 h-10 rounded-full bg-accent-pink/20 flex items-center justify-center hover:bg-accent-pink/30 transition-colors">
                                    <span className="text-accent-pink text-lg">💗</span>
                                </button>
                            </div>
                        </div>
                    ))
                )}

                {history.length > 0 && (
                    <p className="text-center text-gray-500 text-sm pt-2">
                        Show records of the past month
                    </p>
                )}
            </div>
        </div>
    );
};

export default MatchHistoryMobile;
