import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCoins } from '../../context/CoinsContext';
import { usePremium } from '../../context/PremiumContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import toast from 'react-hot-toast';
import { RiCoinsLine, RiGenderlessLine, RiCalendar2Line, RiFileCopyLine, RiGridLine, RiMapPinRangeLine, RiEdit2Line, RiCamera2Line, RiChat3Line, RiFlashlightLine } from 'react-icons/ri';

const UserProfileMobile = ({ onClose }) => {
    const { currentUser, userLocation, logout, updateProfileInfo } = useAuth();
    const { coins } = useCoins();
    const { isPremium } = usePremium();
    const navigate = useNavigate();

    const [isEditing, setIsEditing] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef(null);
    const [editData, setEditData] = useState({
        displayName: currentUser?.displayName || '',
        bio: currentUser?.bio || ''
    });

    const userInitial = currentUser?.displayName?.charAt(0)?.toUpperCase() || 'U';
    const displayId = currentUser?.id?.slice(0, 8) || '00000000';

    const handleSave = async () => {
        await updateProfileInfo(editData);
        setIsEditing(false);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !currentUser?.id) return;

        try {
            setUploadingImage(true);
            const toastId = toast.loading("Uploading image...");
            
            const fileExt = file.name?.split('.').pop() || 'jpg';
            const fileName = `${currentUser.id}/avatar_${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, file, {
                    contentType: file.type || 'image/jpeg',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            // Save to DB (profiles table) — same as Desktop version
            const { error: dbError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', currentUser.id);

            if (dbError) throw dbError;

            // Also update local context
            await updateProfileInfo({ photoURL: publicUrl });
            toast.success("Profile photo updated!", { id: toastId });
        } catch (error) {
            console.error("Error uploading image:", error);
            toast.error(error.message || "Failed to upload image.");
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
                            <RiEdit2Line size={20} className="text-gray-400" />
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
                            <RiChat3Line size={20} className="text-gray-400" />
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
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            {currentUser?.photoURL ? (
                                <img
                                    src={currentUser.photoURL}
                                    alt="avatar"
                                    className={`w-16 h-16 rounded-full border-2 border-accent-pink object-cover ${uploadingImage ? 'opacity-50' : ''}`}
                                />
                            ) : (
                                <div className={`w-16 h-16 rounded-full bg-accent-pink flex items-center justify-center text-2xl font-bold border-2 border-accent-pink text-white ${uploadingImage ? 'opacity-50' : ''}`}>
                                    {userInitial}
                                </div>
                            )}
                            {/* Edit Overlay */}
                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                {uploadingImage ? (
                                    <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <RiCamera2Line size={20} className="text-white drop-shadow-md" />
                                )}
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-dark-900 rounded-full p-1 border border-white/10 shadow-lg">
                                <RiEdit2Line size={12} className="text-white" />
                            </div>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            accept="image/*"
                            className="hidden"
                        />

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold truncate">{currentUser?.displayName || 'User'}</h3>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="text-xs bg-yellow-400/20 text-yellow-400 px-2.5 py-0.5 rounded-full flex items-center gap-1 hover:bg-yellow-400/30 transition-colors"
                                >
                                    <RiEdit2Line size={12} /> Edit
                                </button>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-400 text-sm mt-0.5">
                                <span>ID: {displayId}</span>
                                <button
                                    onClick={() => {
                                        if (navigator.clipboard && window.isSecureContext) {
                                            navigator.clipboard.writeText(displayId);
                                            toast.success("ID copied!");
                                        } else {
                                            // Fallback for non-https/unsupported environments
                                            const textArea = document.createElement("textarea");
                                            textArea.value = displayId;
                                            document.body.appendChild(textArea);
                                            textArea.select();
                                            document.execCommand("copy");
                                            document.body.removeChild(textArea);
                                            toast.success("ID copied!");
                                        }
                                    }}
                                    className="text-gray-500 hover:text-white transition-colors p-1"
                                    title="Copy ID"
                                >
                                    <RiFileCopyLine size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>


                {/* Coins */}
                <div className="bg-dark-800 border border-white/10 rounded-xl p-4 flex items-center gap-3">
                    <RiCoinsLine size={28} className="text-yellow-400" />
                    <div className="flex-1">
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Coins</p>
                        <span className="text-2xl font-bold">{coins}</span>
                    </div>
                </div>

                {/* Info List */}
                <div className="bg-dark-800 border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
                    <div className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-3">
                            <RiCalendar2Line size={18} className="text-gray-400" />
                            <span className="text-gray-300">Birthday</span>
                        </div>
                        <span className="text-gray-400 text-sm">{currentUser?.birthdate || 'Not set'}</span>
                    </div>
                    <div className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-3">
                            <RiGenderlessLine size={20} className="text-gray-400" />
                            <span className="text-gray-300">Gender</span>
                        </div>
                        <span className="text-gray-400 text-sm capitalize">{currentUser?.gender || 'Not set'}</span>
                    </div>
                    <div className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-3">
                            <RiMapPinRangeLine size={20} className="text-gray-400" />
                            <span className="text-gray-300">Location</span>
                        </div>
                        <span className="text-gray-400 text-sm">{userLocation?.city || 'Unknown'}</span>
                    </div>
                </div>



                {/* Creator Dashboard (Only for verified creators) */}
                {currentUser?.isCreator && (
                    <button
                        onClick={() => {
                            navigate('/creator/dashboard');
                            onClose();
                        }}
                        className="w-full bg-accent-purple/10 border border-accent-purple/30 rounded-2xl px-5 py-4 flex items-center justify-between hover:bg-accent-purple/20 transition-colors"
                    >
                        <div className="flex items-center gap-3 text-accent-purple">
                            <RiGridLine size={18} />
                            <span className="font-bold">Creator Dashboard</span>
                        </div>
                        <span className="text-accent-purple opacity-50">›</span>
                    </button>
                )}

                {/* Sign Out */}
                <button
                    onClick={() => logout()}
                    className="w-full bg-dark-800 border border-red-500/20 rounded-2xl px-5 py-4 text-red-400 font-medium hover:bg-red-500/10 transition-colors text-left"
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
};

export default UserProfileMobile;
