import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCoins } from '../../context/CoinsContext';
import { usePremium } from '../../context/PremiumContext';
import { supabase } from '../../supabase';
import toast from 'react-hot-toast';

const UserProfileMobile = ({ onClose }) => {
    const { currentUser, userLocation, logout, updateProfileInfo } = useAuth();
    const { coins, stars } = useCoins();
    const { isPremium } = usePremium();

    const [isEditing, setIsEditing] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [editData, setEditData] = useState({
        displayName: currentUser?.displayName || '',
        bio: currentUser?.bio || ''
    });

    const userInitial = currentUser?.displayName?.charAt(0)?.toUpperCase() || 'U';
    const userId = currentUser?.uid?.slice(-9) || '000000000';

    const handleSave = async () => {
        await updateProfileInfo(editData);
        setIsEditing(false);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploadingImage(true);
            const fileName = `${currentUser.uid}_${Date.now()}`;
            const { data, error } = await supabase.storage
                .from('avatars')
                .upload(fileName, file);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            await updateProfileInfo({ photoURL: publicUrl });
            toast.success("Profile photo updated!");
        } catch (error) {
            console.error("Error uploading image:", error);
            toast.error("Failed to upload image.");
        } finally {
            setUploadingImage(false);
        }
    };

    if (isEditing) {
        return (
            <div className="fixed inset-0 z-[100] flex flex-col bg-dark-900/95 backdrop-blur-xl animate-slide-up">
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/10">
                    <h2 className="text-xl font-bold">Edit Profile</h2>
                    <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-white transition-colors">
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Profile Picture Edit */}
                    <div className="flex justify-center">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-indigo-500/30">
                                {currentUser?.photoURL ? (
                                    <img src={currentUser.photoURL} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-4xl font-bold text-white">
                                        {userInitial}
                                    </div>
                                )}
                            </div>
                            <label className={`absolute bottom-1 right-1 w-10 h-10 bg-indigo-600 rounded-full border-4 border-[#1a172e] flex items-center justify-center shadow-lg transition-transform cursor-pointer ${uploadingImage ? 'opacity-50' : 'hover:scale-110'}`}>
                                {uploadingImage ? <span className="animate-spin text-white">⌛</span> : <span className="text-white text-lg">📷</span>}
                                <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} hidden />
                            </label>
                        </div>
                    </div>

                    {/* Name Input */}
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">😊</span>
                            <input
                                type="text"
                                value={editData.displayName}
                                onChange={(e) => setEditData(prev => ({ ...prev, displayName: e.target.value.slice(0, 16) }))}
                                className="bg-transparent flex-1 text-white font-medium focus:outline-none"
                                placeholder="Your name"
                            />
                            <span className="text-xs text-gray-400 font-medium">{editData.displayName.length}/16</span>
                        </div>
                    </div>

                    {/* Bio Input */}
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex flex-col gap-2">
                        <div className="flex items-center gap-3 border-b border-white/10 pb-2">
                            <span className="text-xl">💬</span>
                            <span className="text-white font-bold">About</span>
                        </div>
                        <textarea
                            value={editData.bio}
                            onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value.slice(0, 140) }))}
                            className="bg-transparent w-full h-32 text-gray-300 text-sm focus:outline-none resize-none pt-2"
                            placeholder="Hobby | Status | Secret | Spirit Animal"
                        />
                        <div className="flex justify-end">
                            <span className="text-xs text-gray-400 font-medium">{editData.bio.length}/140</span>
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        className="w-full bg-indigo-600 text-white font-bold py-4 rounded-[20px] hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        Save
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-dark-900/95 backdrop-blur-xl animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h2 className="text-xl font-bold">My Profile</h2>
                <button
                    onClick={onClose}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-lg"
                >
                    ✕
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-5">
                {/* Profile Card */}
                <div className="bg-gradient-to-br from-dark-800 to-dark-900 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center gap-4">
                        {/* Avatar */}
                        {currentUser?.photoURL ? (
                            <img
                                src={currentUser.photoURL}
                                alt="avatar"
                                className="w-16 h-16 rounded-full border-2 border-accent-pink object-cover"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-accent-pink flex items-center justify-center text-2xl font-bold border-2 border-accent-pink">
                                {userInitial}
                            </div>
                        )}

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold truncate">{currentUser?.displayName || 'User'}</h3>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="text-xs bg-yellow-400/20 text-yellow-400 px-2.5 py-0.5 rounded-full flex items-center gap-1 hover:bg-yellow-400/30 transition-colors"
                                >
                                    <span>✏️</span> Edit
                                </button>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-400 text-sm mt-0.5">
                                <span>ID: {userId}</span>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(currentUser?.uid || '');
                                        toast.success("ID copied!");
                                    }}
                                    className="text-gray-500 hover:text-white transition-colors"
                                >
                                    📋
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Strangy Plus Banner */}
                {!isPremium && (
                    <div className="bg-gradient-to-r from-yellow-500/30 via-yellow-400/20 to-yellow-500/30 border border-yellow-400/30 rounded-2xl p-4 flex items-center gap-3">
                        <span className="text-4xl">👑</span>
                        <div className="flex-1">
                            <h4 className="font-bold text-yellow-400">Strangy Plus</h4>
                            <p className="text-xs text-gray-300">Get More Gender Filters</p>
                        </div>
                        <button className="bg-yellow-400 text-black font-bold px-5 py-2 rounded-full text-sm hover:bg-yellow-300 transition-colors">
                            Join
                        </button>
                    </div>
                )}

                {/* Coins & Gems Row */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-dark-800 border border-white/10 rounded-xl p-4 flex items-center justify-center gap-2">
                        <span className="text-2xl">🪙</span>
                        <span className="text-lg font-bold">{coins}</span>
                    </div>
                    <div className="bg-dark-800 border border-white/10 rounded-xl p-4 flex items-center justify-center gap-2">
                        <span className="text-2xl">💎</span>
                        <span className="text-lg font-bold">0</span>
                    </div>
                </div>

                {/* Info List */}
                <div className="bg-dark-800 border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
                    <div className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">🎂</span>
                            <span className="text-gray-300">Birthday</span>
                        </div>
                        <span className="text-gray-400 text-sm">2000-01-01</span>
                    </div>
                    <div className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">🧑</span>
                            <span className="text-gray-300">Gender</span>
                        </div>
                        <span className="text-gray-400 text-sm">{localStorage.getItem('userGender') || 'male'}</span>
                    </div>
                    <div className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">🌍</span>
                            <span className="text-gray-300">Location</span>
                        </div>
                        <span className="text-gray-400 text-sm">{userLocation?.city || 'Unknown'}</span>
                    </div>
                </div>

                {/* More */}
                <button className="w-full bg-dark-800 border border-white/10 rounded-2xl px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">🔲</span>
                        <span className="text-gray-300">More</span>
                    </div>
                    <span className="text-gray-500">›</span>
                </button>

                {/* Sign Out */}
                <button
                    onClick={() => {
                        logout();
                        onClose();
                    }}
                    className="w-full bg-dark-800 border border-red-500/20 rounded-2xl px-5 py-4 text-red-400 font-medium hover:bg-red-500/10 transition-colors text-left"
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
};

export default UserProfileMobile;
