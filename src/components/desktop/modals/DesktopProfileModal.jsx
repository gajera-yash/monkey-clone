import React, { useState, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useCoins } from '../../../context/CoinsContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../../../supabase';
import {
    RiCloseLine, RiEdit2Line, RiCoinsLine, RiCalendar2Line,
    RiGenderlessLine, RiMapPinRangeLine, RiSmartphoneLine,
    RiArrowRightSLine, RiGridLine, RiFileCopyLine, RiChat3Line
} from 'react-icons/ri';

const DesktopProfileModal = ({ onClose }) => {
    const { currentUser, logout, updateProfileInfo, refreshProfile } = useAuth();
    const { coins, stars } = useCoins();
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef(null);
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
        if (!file || !currentUser?.id) return;

        try {
            setUploadingImage(true);
            const toastId = toast.loading("Uploading avatar...");

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

            const { error: dbError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', currentUser.id);

            if (dbError) throw dbError;

            await refreshProfile();
            toast.success("Avatar updated!", { id: toastId });
        } catch (error) {
            console.error("Error uploading avatar:", error);
            toast.error(error.message || "Failed to upload avatar");
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
                        <RiCloseLine size={24} />
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
                            <label 
                                onClick={(e) => {
                                    e.preventDefault();
                                    fileInputRef.current?.click();
                                }}
                                className={`absolute bottom-1 right-1 w-10 h-10 bg-indigo-600 rounded-full border-4 border-white flex items-center justify-center shadow-lg transition-transform cursor-pointer hover:scale-110`}
                            >
                                <span className="text-white text-lg">📷</span>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                    accept="image/*"
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>

                    {/* Name Input */}
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                        <div className="flex items-center gap-3">
                            <RiEdit2Line size={20} className="text-indigo-500" />
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
                            <RiChat3Line size={20} className="text-indigo-500" />
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
        <div className="bg-[#24213a] w-[320px] rounded-[24px] overflow-hidden flex flex-col shadow-2xl border border-white/5 pointer-events-auto relative">
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
                <h2 className="text-white text-base font-bold w-full text-center">My Profile</h2>
                <button onClick={onClose} className="absolute right-6 text-white/60 hover:text-white transition-colors">
                    <RiCloseLine size={24} />
                </button>
            </div>

            <div className="px-4 pb-5 space-y-3">
                {/* User Card */}
                <div className="bg-[#1a172e] rounded-3xl p-5 flex items-center gap-4 border border-white/5">
                    <div className="relative group">
                        {currentUser?.photoURL ? (
                            <img src={currentUser.photoURL} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-[#ff2d55]" />
                        ) : (
                            <div className="w-20 h-20 rounded-full bg-[#ff2d55] flex items-center justify-center text-3xl font-bold text-white">
                                {currentUser?.displayName?.charAt(0)?.toUpperCase()}
                            </div>
                        )}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingImage}
                            className={`absolute -bottom-1 -right-1 w-8 h-8 bg-[#ff2d55] rounded-lg border-4 border-[#1a172e] flex items-center justify-center shadow-lg transition-all ${uploadingImage ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 hover:rotate-12 group-hover:bg-[#ff4570]'}`}
                            title="Edit Profile"
                        >
                            {uploadingImage ? (
                                <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <RiEdit2Line size={14} className="text-white" />
                            )}
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            accept="image/*"
                            className="hidden"
                        />
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <h3 className="text-white text-xl font-black tracking-tight truncate">{currentUser?.displayName || 'User'}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-white/40 text-sm">ID: {currentUser?.uid?.slice(0, 8) || '28082674'}</span>
                            <button
                                onClick={() => {
                                    const idToCopy = currentUser?.uid?.slice(0, 8) || '';
                                    if (navigator.clipboard) {
                                        navigator.clipboard.writeText(idToCopy);
                                        toast.success("ID copied!");
                                    }
                                }}
                                className="text-white/40 hover:text-white/60 p-1"
                                title="Copy ID"
                            >
                                <RiFileCopyLine size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Wallet Info */}
                <div className="bg-[#1a172e] rounded-2xl p-4 flex items-center justify-center gap-3 border border-white/5">
                    <div className="w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center">
                        <RiCoinsLine size={18} className="text-yellow-400" />
                    </div>
                    <div>
                        <p className="text-white/40 text-xs font-medium uppercase tracking-widest leading-none mb-0.5">Coins</p>
                        <span className="text-white font-bold text-2xl">{coins || 0}</span>
                    </div>
                </div>

                {/* List Items */}
                <div className="bg-[#1a172e] rounded-2xl overflow-hidden border border-white/5">
                    <div className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <RiCalendar2Line size={18} className="text-white/60" />
                            <span className="text-white font-medium">Birthday</span>
                        </div>
                        <span className="text-white/40 text-sm">{currentUser?.birthdate || 'Not set'}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <RiGenderlessLine size={20} className="text-white/60" />
                            <span className="text-white font-medium">Gender</span>
                        </div>
                        <span className="text-white/40 text-sm capitalize">{currentUser?.gender || 'Not set'}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                            <RiMapPinRangeLine size={20} className="text-white/60" />
                            <span className="text-white font-medium">Location</span>
                        </div>
                        <span className="text-white/40 text-sm">{currentUser?.location_city || 'Unknown'}</span>
                    </div>
                </div>



                {/* Creator Dashboard (Only for verified creators) */}
                {currentUser?.isCreator && (
                    <button
                        onClick={() => {
                            navigate('/creator/dashboard');
                            onClose();
                        }}
                        className="w-full bg-accent-purple/10 border border-accent-purple/30 rounded-2xl p-4 flex items-center justify-between hover:bg-accent-purple/20 transition-colors"
                    >
                        <div className="flex items-center gap-3 text-accent-purple">
                            <RiGridLine size={18} />
                            <span className="font-bold">Creator Dashboard</span>
                        </div>
                        <RiArrowRightSLine className="w-5 h-5 opacity-50" />
                    </button>
                )}

                {/* Sign Out Button */}
                <button
                    onClick={() => logout()}
                    className="w-full bg-[#1a172e] rounded-2xl p-5 text-left text-white font-bold hover:bg-white/5 transition-colors border border-white/5"
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
};

export default DesktopProfileModal;
