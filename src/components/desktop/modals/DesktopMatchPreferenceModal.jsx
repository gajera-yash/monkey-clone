import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';

const DesktopMatchPreferenceModal = ({ onClose }) => {
    const { currentUser, updateMatchPreferences } = useAuth();
    const [prefs, setPrefs] = useState(currentUser?.matchPreferences || {
        ageRange: [18, 35],
        language: 'Unlimited',
        regions: {
            northAmerica: 'Default',
            latinAmerica: 'Default',
            northAfrica: 'Default',
            middleEast: 'Default'
        }
    });

    const handleSave = () => {
        updateMatchPreferences(prefs);
        onClose();
    };

    const handleRangeChange = (e) => {
        setPrefs(prev => ({ ...prev, ageRange: [parseInt(e.target.value), prev.ageRange[1]] }));
    };

    return (
        <div className="bg-white w-[340px] rounded-[24px] overflow-hidden flex flex-col shadow-2xl relative pointer-events-auto">
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <h2 className="text-gray-900 text-base font-bold">Match Preference</h2>
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">i</span>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="p-4 space-y-4">
                {/* Monkey Plus Banner */}
                <div className="bg-[#f0f2ff] rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <span className="text-3xl">👑</span>
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full border-2 border-white"></div>
                        </div>
                        <div>
                            <h4 className="text-gray-900 font-bold">Monkey Plus+</h4>
                            <p className="text-gray-500 text-xs">Set your preferences, meet someone who's right for you.</p>
                        </div>
                    </div>
                    <button className="bg-black text-white font-bold px-6 py-2 rounded-full text-sm hover:opacity-80 transition-opacity">
                        Join
                    </button>
                </div>

                {/* Age Preference */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-gray-900 font-bold">
                        <span>🎂</span>
                        <span>Age</span>
                    </div>
                    <div className="px-2">
                        <div className="flex justify-between text-sm text-gray-500 mb-2">
                            <span>18</span>
                            <span>{prefs.ageRange[1]}+</span>
                        </div>
                        <input
                            type="range"
                            min="18"
                            max="35"
                            value={prefs.ageRange[0]}
                            onChange={handleRangeChange}
                            className="w-full h-2 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <div className="flex justify-between mt-2">
                            <span className="text-indigo-600 font-bold">{prefs.ageRange[0]}</span>
                            <div className="w-5 h-5 rounded-full border-2 border-indigo-600 bg-white"></div>
                        </div>
                    </div>
                </div>

                {/* Language */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-gray-900 font-bold">
                        <span>abc</span>
                        <span>Language</span>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between border border-gray-100 cursor-pointer group hover:bg-gray-100 transition-colors">
                        <span className="text-gray-400">Language</span>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-900 font-bold">Unlimited</span>
                            <svg className="w-4 h-4 text-gray-400 group-hover:translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Region */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-gray-900 font-bold">
                        <span>🌍</span>
                        <span>Region</span>
                    </div>
                    <div className="space-y-2">
                        {Object.entries(prefs.regions).map(([key, value]) => (
                            <div key={key} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
                                <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-900 font-bold">{value}</span>
                                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex gap-4 pt-2">
                    <button
                        onClick={handleSave}
                        className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-2xl hover:bg-indigo-700 transition-colors text-sm"
                    >
                        Save
                    </button>
                    <button className="bg-indigo-100 text-2xl p-4 rounded-3xl hover:bg-indigo-200 transition-colors">
                        👫
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DesktopMatchPreferenceModal;
