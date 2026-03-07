import React, { useState } from 'react';
import { usePremium } from '../../context/PremiumContext';
import DesktopSubscriptionModal from './modals/DesktopSubscriptionModal';

const LOCATIONS = [
    { value: 'Global', label: '🌍 Global (All Regions)' },
    { value: 'North America', label: '🇺🇸 North America' },
    { value: 'Latin America', label: '🇧🇷 Latin America' },
    { value: 'Europe', label: '🇪🇺 Europe' },
    { value: 'Middle East', label: '🇸🇦 Middle East' },
    { value: 'South Asia', label: '🇮🇳 South Asia' },
    { value: 'East Asia', label: '🇯🇵 East Asia' },
    { value: 'Africa', label: '🌍 Africa' },
];

const AGE_OPTIONS = ['Any', '18-25', '26-35', '36+'];

const PREMIUM_BADGE = (
    <span className="ml-1.5 text-[9px] font-bold bg-yellow-400 text-black px-1.5 py-0.5 rounded-full tracking-wide">PLUS</span>
);

const IdleDesktop = ({ localVideoRef, isCamOn, isMicOn, onStartChat, onToggleCam, onToggleMic, onFiltersChange, onSubscriptionRequired }) => {
    const { isPremium } = usePremium();
    const [genderFilter, setGenderFilter] = useState('Both');
    const [locationFilter, setLocationFilter] = useState('Global');
    const [ageFilter, setAgeFilter] = useState('Any');
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);

    const isPremiumFilter = (gender, location, age) => {
        return gender !== 'Both' || location !== 'Global' || age !== 'Any';
    };

    const updateFilters = (newGender, newLocation, newAge) => {
        if (onFiltersChange) {
            onFiltersChange({ gender: newGender, location: newLocation, ageRange: newAge });
        }
    };

    const handleGenderSelect = (option) => {
        if (option !== 'Both' && !isPremium) {
            onSubscriptionRequired();
            return;
        }
        setGenderFilter(option);
        updateFilters(option, locationFilter, ageFilter);
    };

    const handleLocationSelect = (value) => {
        if (value !== 'Global' && !isPremium) {
            setShowLocationDropdown(false);
            onSubscriptionRequired();
            return;
        }
        setLocationFilter(value);
        setShowLocationDropdown(false);
        updateFilters(genderFilter, value, ageFilter);
    };

    const handleAgeSelect = (option) => {
        if (option !== 'Any' && !isPremium) {
            onSubscriptionRequired();
            return;
        }
        setAgeFilter(option);
        updateFilters(genderFilter, locationFilter, option);
    };

    const handleStartChat = () => {
        if (isPremiumFilter(genderFilter, locationFilter, ageFilter) && !isPremium) {
            onSubscriptionRequired();
            return;
        }
        onStartChat();
    };

    const selectedLocation = LOCATIONS.find(l => l.value === locationFilter);

    return (
        <div className="flex-1 flex flex-col z-10 mt-12" onClick={() => showLocationDropdown && setShowLocationDropdown(false)}>
            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center px-12 pt-4 pb-4">
                <div className="flex w-full max-w-[960px] gap-6 items-stretch">

                    {/* Left Panel - Camera Preview */}
                    <div className="flex-[1.2] bg-[#0d0d0d] rounded-2xl overflow-hidden relative border border-white/5 shadow-2xl min-h-[480px]">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`w-full h-full object-cover ${!isCamOn ? 'hidden' : ''}`}
                        />
                        {!isCamOn && (
                            <div className="absolute inset-0 flex items-center justify-center bg-[#0d0d0d]">
                                <div className="flex items-center gap-3">
                                    <span className="text-7xl">🐵</span>
                                    <span className="text-7xl">👑</span>
                                </div>
                            </div>
                        )}

                        {/* LIVE PREVIEW Badge */}
                        <div className="absolute top-5 left-5 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-1.5 border border-white/10">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                            <span className="text-white text-xs font-semibold tracking-wider uppercase">Live Preview</span>
                        </div>

                        {/* Bottom Section */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 pt-16">
                            <div className="flex items-end justify-between">
                                <div>
                                    <h3 className="text-white font-bold text-xl leading-tight">With you on camera,</h3>
                                    <p className="text-white/60 text-sm mt-1">it's easier to meet the right one</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Camera Toggle */}
                                    <button
                                        onClick={onToggleCam}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isCamOn ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-red-500/80 text-white'}`}
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            {isCamOn ? (
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            ) : (
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
                                            )}
                                        </svg>
                                    </button>
                                    {/* Mic Toggle */}
                                    <button
                                        onClick={onToggleMic}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isMicOn ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-red-500/80 text-white'}`}
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            {isMicOn ? (
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                            ) : (
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                            )}
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Controls */}
                    <div className="flex-1 bg-[#6c3fcf]/70 backdrop-blur-xl rounded-2xl p-7 flex flex-col border border-white/10 shadow-2xl min-h-[480px]">
                        {/* Title */}
                        <h1 className="text-white font-extrabold text-3xl mb-1">Strangy</h1>
                        <p className="text-white/60 text-sm mb-5">Make new friends face-to-face</p>

                        {/* Gender Filter */}
                        <div className="mb-4">
                            <p className="text-white/50 text-xs font-bold tracking-widest uppercase mb-2 flex items-center gap-1">
                                Who do you want to meet?
                            </p>
                            <div className="flex gap-2">
                                {['Both', 'Male', 'Female'].map(option => (
                                    <button
                                        key={option}
                                        onClick={() => handleGenderSelect(option)}
                                        className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all flex items-center justify-center ${genderFilter === option
                                            ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                            : 'bg-white/10 text-white/70 hover:bg-white/15 border border-white/10'
                                            }`}
                                    >
                                        {option}
                                        {option !== 'Both' && !isPremium && PREMIUM_BADGE}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Age Filter */}
                        <div className="mb-4">
                            <p className="text-white/50 text-xs font-bold tracking-widest uppercase mb-2 flex items-center gap-1">
                                Age Range
                            </p>
                            <div className="flex gap-2">
                                {AGE_OPTIONS.map(option => (
                                    <button
                                        key={option}
                                        onClick={() => handleAgeSelect(option)}
                                        className={`flex-1 py-2 rounded-full text-xs font-semibold transition-all flex items-center justify-center ${ageFilter === option
                                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                            : 'bg-white/10 text-white/70 hover:bg-white/15 border border-white/10'
                                            }`}
                                    >
                                        {option}
                                        {option !== 'Any' && !isPremium && PREMIUM_BADGE}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Location Filter */}
                        <div className="mb-4 relative">
                            <p className="text-white/50 text-xs font-bold tracking-widest uppercase mb-2 flex items-center gap-1">
                                Location Filter
                            </p>
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowLocationDropdown(prev => !prev); }}
                                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/15 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-white/60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="text-white text-sm font-medium">{selectedLocation?.label}</span>
                                </div>
                                <svg className={`w-4 h-4 text-white/40 transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {/* Dropdown */}
                            {showLocationDropdown && (
                                <div onClick={e => e.stopPropagation()} className="absolute top-full mt-1 left-0 right-0 bg-[#1a172e] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
                                    {LOCATIONS.map(loc => (
                                        <button
                                            key={loc.value}
                                            onClick={() => handleLocationSelect(loc.value)}
                                            className={`w-full px-4 py-2.5 text-sm text-left flex items-center justify-between transition-colors ${locationFilter === loc.value
                                                ? 'bg-purple-600/40 text-white font-semibold'
                                                : 'text-white/70 hover:bg-white/5'
                                                }`}
                                        >
                                            <span>{loc.label}</span>
                                            {loc.value !== 'Global' && !isPremium && PREMIUM_BADGE}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Active Filter Summary */}
                        {isPremiumFilter(genderFilter, locationFilter, ageFilter) && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {genderFilter !== 'Both' && (
                                    <span className="flex items-center gap-1 bg-green-500/20 text-green-300 text-xs px-2 py-0.5 rounded-full border border-green-500/30">
                                        👤 {genderFilter}
                                        <button onClick={() => handleGenderSelect('Both')} className="ml-0.5 hover:text-white">✕</button>
                                    </span>
                                )}
                                {locationFilter !== 'Global' && (
                                    <span className="flex items-center gap-1 bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded-full border border-blue-500/30">
                                        📍 {locationFilter}
                                        <button onClick={() => handleLocationSelect('Global')} className="ml-0.5 hover:text-white">✕</button>
                                    </span>
                                )}
                                {ageFilter !== 'Any' && (
                                    <span className="flex items-center gap-1 bg-purple-500/20 text-purple-300 text-xs px-2 py-0.5 rounded-full border border-purple-500/30">
                                        🎂 {ageFilter}
                                        <button onClick={() => handleAgeSelect('Any')} className="ml-0.5 hover:text-white">✕</button>
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Online Counter */}
                        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3 mb-auto">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/30 flex items-center justify-center">
                                <svg className="w-4 h-4 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-green-400 text-sm font-bold">14,208 Users Online</p>
                                <p className="text-white/40 text-xs">Ready for immediate video match</p>
                            </div>
                        </div>

                        {/* Start Button */}
                        <button
                            onClick={handleStartChat}
                            className={`w-full font-extrabold py-4 rounded-2xl text-lg shadow-xl transform hover:-translate-y-0.5 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4 ${isPremiumFilter(genderFilter, locationFilter, ageFilter) && !isPremium
                                ? 'bg-yellow-400 hover:bg-yellow-300 text-black shadow-yellow-400/20'
                                : 'bg-yellow-400 hover:bg-yellow-300 text-black shadow-yellow-400/20'
                                }`}
                        >
                            {isPremiumFilter(genderFilter, locationFilter, ageFilter) && !isPremium ? (
                                <>
                                    <span className="text-xl">👑</span> UNLOCK FILTERS
                                </>
                            ) : (
                                <>
                                    <span className="text-xl">⚡</span> START VIDEO CHAT
                                </>
                            )}
                        </button>

                        {/* Terms */}
                        <p className="text-white/30 text-[11px] text-center mt-3 leading-relaxed">
                            By clicking start, you agree to our Community<br />Guidelines and Terms of Service.
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-8 py-4 z-10">
                <div className="flex items-center gap-6">
                    <span className="text-white/40 text-xs font-semibold tracking-wider uppercase hover:text-white/60 cursor-pointer transition-colors">Help Center</span>
                    <span className="text-white/40 text-xs font-semibold tracking-wider uppercase hover:text-white/60 cursor-pointer transition-colors">Privacy Policy</span>
                    <span className="text-white/40 text-xs font-semibold tracking-wider uppercase hover:text-white/60 cursor-pointer transition-colors">Cookies</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="text-white/40 text-xs font-semibold tracking-wider uppercase">Systems Operational</span>
                </div>
            </div>
        </div>
    );
};

export default IdleDesktop;
