import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useCoins } from '../../../context/CoinsContext';
import toast from 'react-hot-toast';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../firebase';


const DesktopProfileModal = ({ onClose }) => {
    const { currentUser, logout, updateProfileInfo } = useAuth();
    const { coins, stars } = useCoins();
    const [isEditing, setIsEditing] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [editData, setEditData] = useState({
        displayName: currentUser?.displayName || '',
        bio: currentUser?.bio || ''
    });

    const handleSave = async () => {
        await updateProfileInfo(editData);
        setIsEditing(false);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploadingImage(true);
            const imageRef = ref(storage, `profiles/${currentUser.uid}_${Date.now()}`);
            await uploadBytes(imageRef, file);
            const url = await getDownloadURL(imageRef);
            await updateProfileInfo({ photoURL: url });
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
            <div className="bg-white w-[320px] rounded-[24px] overflow-hidden flex flex-col shadow-2xl border border-gray-100 relative pointer-events-auto">
                <div className="p-6 flex items-center justify-between border-b border-gray-50">
                    <h2 className="text-gray-900 text-xl font-bold w-full text-center">Edit Profile</h2>
                    <button onClick={() => setIsEditing(false)} className="absolute right-6 text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Profile Picture Edit */}
                    <div className="flex justify-center">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-indigo-50">
                                {currentUser?.photoURL ? (
                                    <img src={currentUser.photoURL} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-4xl font-bold text-white">
                                        {currentUser?.displayName?.charAt(0)?.toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <label className={`absolute bottom-1 right-1 w-10 h-10 bg-indigo-600 rounded-full border-4 border-white flex items-center justify-center shadow-lg transition-transform cursor-pointer ${uploadingImage ? 'opacity-50' : 'hover:scale-110'}`}>
                                {uploadingImage ? <span className="animate-spin text-white">⌛</span> : <span className="text-white text-lg">📷</span>}
                                <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} hidden />
                            </label>
                        </div>
                    </div>

                    {/* Name Input */}
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">😊</span>
                            <input
                                type="text"
                                value={editData.displayName}
                                onChange={(e) => setEditData(prev => ({ ...prev, displayName: e.target.value.slice(0, 16) }))}
                                className="bg-transparent flex-1 text-gray-900 font-medium focus:outline-none"
                                placeholder="Your name"
                            />
                            <span className="text-xs text-gray-400 font-medium">{editData.displayName.length}/16</span>
                        </div>
                    </div>

                    {/* Bio Input */}
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col gap-2">
                        <div className="flex items-center gap-3 border-b border-gray-200 pb-2">
                            <span className="text-xl">💬</span>
                            <span className="text-gray-900 font-bold">About</span>
                        </div>
                        <textarea
                            value={editData.bio}
                            onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value.slice(0, 140) }))}
                            className="bg-transparent w-full h-32 text-gray-600 text-sm focus:outline-none resize-none pt-2"
                            placeholder="Hobby | Status | Secret | Spirit Animal"
                        />
                        <div className="flex justify-end">
                            <span className="text-xs text-gray-400 font-medium">{editData.bio.length}/140</span>
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        className="w-full bg-indigo-600 text-white font-bold py-4 rounded-[20px] hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                    >
                        Save
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#24213a] w-[320px] rounded-[24px] overflow-hidden flex flex-col shadow-2xl border border-white/5 pointer-events-auto">
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
                <h2 className="text-white text-base font-bold w-full text-center">My Profile</h2>
                <button onClick={onClose} className="absolute right-6 text-white/60 hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="px-4 pb-5 space-y-3">
                {/* User Card */}
                <div className="bg-[#1a172e] rounded-3xl p-5 flex items-center gap-4 border border-white/5">
                    <div className="relative">
                        {currentUser?.photoURL ? (
                            <img src={currentUser.photoURL} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-[#ff2d55]" />
                        ) : (
                            <div className="w-20 h-20 rounded-full bg-[#ff2d55] flex items-center justify-center text-3xl font-bold text-white">
                                {currentUser?.displayName?.charAt(0)?.toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <h3 className="text-white text-xl font-bold">{currentUser?.displayName || 'User'}</h3>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full text-white transition-colors"
                            >
                                ✏️ Edit
                            </button>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-white/40 text-sm">ID: {currentUser?.uid?.slice(0, 8) || '280826743'}</span>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(currentUser?.uid || '');
                                    toast.success("ID copied!");
                                }}
                                className="text-white/40 hover:text-white/60"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Monkey Plus Banner */}
                <div className="bg-gradient-to-r from-[#6e56cf] to-[#403294] rounded-2xl p-4 flex items-center justify-between border border-white/10">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">👑</span>
                        <div>
                            <h4 className="text-white font-bold">Strangy Plus</h4>
                            <p className="text-white/60 text-xs">Get More Gender Filters</p>
                        </div>
                    </div>
                    <button className="bg-yellow-400 text-black font-extrabold px-6 py-2 rounded-full text-sm hover:bg-yellow-300 transition-colors">
                        Join
                    </button>
                </div>

                {/* Wallet Info */}
                <div className="bg-[#1a172e] rounded-2xl p-4 flex items-center border border-white/5 divide-x divide-white/5">
                    <div className="flex-1 flex items-center justify-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center">
                            <span className="text-lg">M</span>
                        </div>
                        <span className="text-white font-bold text-xl">{coins || 0}</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center gap-3 pl-4">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                            <span className="text-lg">💎</span>
                        </div>
                        <span className="text-white font-bold text-xl">{stars || 0}</span>
                    </div>
                </div>

                {/* List Items */}
                <div className="bg-[#1a172e] rounded-2xl overflow-hidden border border-white/5">
                    <div className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">🎂</span>
                            <span className="text-white font-medium">Birthday</span>
                        </div>
                        <span className="text-white/40 text-sm">2000-01-01</span>
                    </div>
                    <div className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">👦</span>
                            <span className="text-white font-medium">Gender</span>
                        </div>
                        <span className="text-white/40 text-sm">male</span>
                    </div>
                    <div className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                            <span className="text-xl">🌏</span>
                            <span className="text-white font-medium">Location</span>
                        </div>
                        <span className="text-white/40 text-sm">Ahmedabad</span>
                    </div>
                </div>

                {/* More Section */}
                <button className="w-full bg-[#1a172e] rounded-2xl p-4 flex items-center justify-between border border-white/5 hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">📱</span>
                        <span className="text-white font-medium">More</span>
                    </div>
                    <svg className="w-5 h-5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>

                {/* Sign Out Button */}
                <button
                    onClick={() => {
                        logout();
                        onClose();
                    }}
                    className="w-full bg-[#1a172e] rounded-2xl p-5 text-left text-white font-bold hover:bg-white/5 transition-colors border border-white/5"
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
};

export default DesktopProfileModal;
