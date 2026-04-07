import React, { useState } from 'react';
import { useCoins } from '../../context/CoinsContext';
import toast from 'react-hot-toast';
import { RiVidiconFill, RiVideoOffLine, RiMicFill, RiMicOffLine, RiMapPin2Line, RiArrowDownSLine, RiGroupLine } from 'react-icons/ri';

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

const COIN_BADGE = (cost) => (
    cost > 0 ? (
        <span className="ml-1.5 text-[9px] font-bold bg-yellow-400 text-black px-1.5 py-0.5 rounded-full tracking-wide">
            🪙{cost}
        </span>
    ) : null
);

const IdleDesktop = ({ localVideoRef, isCamOn, isMicOn, onStartChat, onToggleCam, onToggleMic, onFiltersChange, onSubscriptionRequired, isLocalNsfw }) => {
    const { coins, filterCosts, openCoinStore } = useCoins();
    const [genderFilter, setGenderFilter] = useState('Both');
    const [locationFilter, setLocationFilter] = useState('Global');
    const [ageFilter, setAgeFilter] = useState('Any');
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);

    // Calculate total cost per match based on active filters
    const calcFilterCost = (gender, location, age) => {
        let cost = 0;
        if (gender !== 'Both') cost += filterCosts.gender;
        if (location !== 'Global') cost += filterCosts.location;
        if (age !== 'Any') cost += filterCosts.age;
        return cost;
    };

    const hasActiveFilter = (gender, location, age) =>
        gender !== 'Both' || location !== 'Global' || age !== 'Any';

    const updateFilters = (newGender, newLocation, newAge) => {
        if (onFiltersChange) {
            onFiltersChange({ gender: newGender, location: newLocation, ageRange: newAge });
        }
    };

    const checkCoinGate = (newGender, newLocation, newAge) => {
        const cost = calcFilterCost(newGender, newLocation, newAge);
        if (cost > 0 && coins < cost) {
            toast.error(`Need at least ${cost} coins to use this filter! Get more coins.`);
            if (openCoinStore) openCoinStore();
            return false;
        }
        return true;
    };

    const handleGenderSelect = (option) => {
        if (option !== 'Both') {
            if (!checkCoinGate(option, locationFilter, ageFilter)) return;
        }
        setGenderFilter(option);
        updateFilters(option, locationFilter, ageFilter);
    };

    const handleLocationSelect = (value) => {
        if (value !== 'Global') {
            if (!checkCoinGate(genderFilter, value, ageFilter)) { setShowLocationDropdown(false); return; }
        }
        setLocationFilter(value);
        setShowLocationDropdown(false);
        updateFilters(genderFilter, value, ageFilter);
    };

    const handleAgeSelect = (option) => {
        if (option !== 'Any') {
            if (!checkCoinGate(genderFilter, locationFilter, option)) return;
        }
        setAgeFilter(option);
        updateFilters(genderFilter, locationFilter, option);
    };

    const handleStartChat = () => {
        if (hasActiveFilter(genderFilter, locationFilter, ageFilter)) {
            const cost = calcFilterCost(genderFilter, locationFilter, ageFilter);
            if (cost > 0 && coins < cost) {
                toast.error(`Not enough coins! Need ${cost} coins per match. Get more coins first.`);
                if (openCoinStore) openCoinStore();
                return;
            }
        }
        onStartChat();
    };

    const selectedLocation = LOCATIONS.find(l => l.value === locationFilter);
    const totalCostPerMatch = calcFilterCost(genderFilter, locationFilter, ageFilter);
    const isFiltered = hasActiveFilter(genderFilter, locationFilter, ageFilter);

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
                            className={`w-full h-full object-cover -scale-x-100 ${!isCamOn ? 'hidden' : ''} ${isLocalNsfw ? 'nsfw-blur' : ''}`}
                        />
                        {isLocalNsfw && (
                            <div className="absolute inset-0 z-[20] flex flex-col items-center justify-center p-6 text-center bg-black/40 backdrop-blur-sm">
                                <span className="text-5xl mb-4">⚠️</span>
                                <h4 className="text-white font-bold text-lg mb-2">Safety Violation</h4>
                                <p className="text-white/80 text-sm max-w-[280px]">We've detected inappropriate content. Please adjust your camera for a better experience.</p>
                            </div>
                        )}
                        {!isCamOn && (
                            <div className="absolute inset-0 flex items-center justify-center bg-[#0d0d0d]">
                                <img src="/logo.png" alt="Strangy Logo" className="w-40 h-auto opacity-40 grayscale brightness-200" />
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
                                        {isCamOn ? <RiVidiconFill size={20} /> : <RiVideoOffLine size={20} />}
                                    </button>
                                    {/* Mic Toggle */}
                                    <button
                                        onClick={onToggleMic}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isMicOn ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-red-500/80 text-white'}`}
                                    >
                                        {isMicOn ? <RiMicFill size={20} /> : <RiMicOffLine size={20} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Controls */}
                    <div className="flex-1 bg-[#6c3fcf]/70 backdrop-blur-xl rounded-2xl p-7 flex flex-col border border-white/10 shadow-2xl min-h-[480px]">
                        {/* Title */}
                        <div className="mb-2">
                            <img src="/logo.png" alt="Strangy Logo" className="h-10 w-auto object-contain" />
                        </div>
                        <p className="text-white/60 text-sm mb-5 font-medium">Make new friends face-to-face</p>

                        {/* Coin balance indicator */}
                        <div className="flex items-center gap-2 mb-4 bg-white/5 rounded-xl px-3 py-2 border border-white/10 w-fit">
                            <span className="text-base">🪙</span>
                            <span className="text-yellow-400 font-black text-sm">{coins.toLocaleString()}</span>
                            <span className="text-white/40 text-xs">coins</span>
                        </div>

                        {/* Gender Filter */}
                        <div className="mb-4">
                            <p className="text-white/50 text-xs font-bold tracking-widest uppercase mb-2">
                                Who do you want to meet?
                            </p>
                            <div className="flex gap-2">
                                {['Both', 'Male', 'Female'].map(option => (
                                    <button
                                        key={option}
                                        onClick={() => handleGenderSelect(option)}
                                        className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-1 ${genderFilter === option
                                            ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                            : 'bg-white/10 text-white/70 hover:bg-white/15 border border-white/10'
                                            }`}
                                    >
                                        {option}
                                        {option !== 'Both' && COIN_BADGE(filterCosts.gender)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Age Filter */}
                        <div className="mb-4">
                            <p className="text-white/50 text-xs font-bold tracking-widest uppercase mb-2">
                                Age Range
                            </p>
                            <div className="flex gap-2">
                                {AGE_OPTIONS.map(option => (
                                    <button
                                        key={option}
                                        onClick={() => handleAgeSelect(option)}
                                        className={`flex-1 py-2 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1 ${ageFilter === option
                                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                            : 'bg-white/10 text-white/70 hover:bg-white/15 border border-white/10'
                                            }`}
                                    >
                                        {option}
                                        {option !== 'Any' && COIN_BADGE(filterCosts.age)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Location Filter (Hidden per request) */}
                        <div className="hidden mb-4 relative">
                            <p className="text-white/50 text-xs font-bold tracking-widest uppercase mb-2">
                                Location Filter
                            </p>
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowLocationDropdown(prev => !prev); }}
                                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/15 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <RiMapPin2Line className="w-4 h-4 text-white/60 flex-shrink-0" />
                                    <span className="text-white text-sm font-medium">{selectedLocation?.label}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {locationFilter !== 'Global' && filterCosts.location > 0 && (
                                        <span className="text-[9px] font-bold bg-yellow-400 text-black px-1.5 py-0.5 rounded-full">🪙{filterCosts.location}</span>
                                    )}
                                    <RiArrowDownSLine className={`w-4 h-4 text-white/40 transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
                                </div>
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
                                            {loc.value !== 'Global' && filterCosts.location > 0 && (
                                                <span className="text-[9px] font-bold bg-yellow-400 text-black px-1.5 py-0.5 rounded-full">🪙{filterCosts.location}</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Active Filter Summary + Cost */}
                        {isFiltered && (
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
                                {totalCostPerMatch > 0 && (
                                    <span className="flex items-center gap-1 bg-yellow-500/20 text-yellow-300 text-xs px-2 py-0.5 rounded-full border border-yellow-500/30 font-bold">
                                        🪙 {totalCostPerMatch} per match
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Online Counter */}
                        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3 mb-auto">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/30 flex items-center justify-center">
                                <RiGroupLine className="w-4 h-4 text-purple-300" />
                            </div>
                            <div>
                                <p className="text-green-400 text-sm font-bold">14,208 Users Online</p>
                                <p className="text-white/40 text-xs">Ready for immediate video match</p>
                            </div>
                        </div>

                        {/* Start Button */}
                        <button
                            onClick={handleStartChat}
                            className="w-full font-extrabold py-4 rounded-2xl text-lg shadow-xl transform hover:-translate-y-0.5 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4 bg-yellow-400 hover:bg-yellow-300 text-black shadow-yellow-400/20"
                        >
                            {isFiltered && totalCostPerMatch > 0 ? (
                                <>
                                    <span>⚡</span> START — 🪙{totalCostPerMatch}/match
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
