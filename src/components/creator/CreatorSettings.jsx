import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const CreatorSettings = () => {
    const { currentUser, updateProfileInfo } = useAuth();
    const navigate = useNavigate();

    const [isSaving, setIsSaving] = useState(false);
    const [settings, setSettings] = useState({
        displayName: currentUser?.displayName || '',
        bio: currentUser?.bio || '',
        autoAcceptCalls: true,
        showLocation: true,
    });

    const referralLink = `https://strangy.app/ref/${currentUser?.uid?.substring(0, 8)}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        toast.success("Referral link copied!");
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const toastId = toast.loading("Saving settings...");
        try {
            await updateProfileInfo({
                displayName: settings.displayName,
                bio: settings.bio
            });
            toast.success("Settings saved successfully!", { id: toastId });
        } catch (error) {
            toast.error("Failed to save settings.", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark-900 text-white p-4 md:p-8">
            <div className="max-w-3xl mx-auto">
                <button
                    onClick={() => navigate('/creator/dashboard')}
                    className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
                >
                    <span>←</span> Back to Dashboard
                </button>

                <h1 className="text-3xl font-black mb-8">Creator Settings</h1>

                <div className="space-y-8">

                    {/* Referrals */}
                    <div className="bg-dark-800 border border-white/5 p-6 md:p-8 rounded-3xl shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-2xl">🔗</span>
                            <h2 className="text-xl font-bold">Refer & Earn 5%</h2>
                        </div>
                        <p className="text-gray-400 text-sm mb-6">
                            Share your referral link with other creators. You will earn a continuous 5% commission from all of their video chat earnings forever!
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="flex-1 bg-dark-900 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-gray-300 truncate">
                                {referralLink}
                            </div>
                            <button
                                onClick={handleCopy}
                                className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-colors"
                            >
                                Copy Link
                            </button>
                        </div>
                    </div>

                    {/* Profile */}
                    <form onSubmit={handleSave} className="bg-dark-800 border border-white/5 p-6 md:p-8 rounded-3xl shadow-xl space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl">👤</span>
                            <h2 className="text-xl font-bold">Public Profile</h2>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-300 mb-2">Display Name</label>
                            <input
                                type="text"
                                value={settings.displayName}
                                onChange={(e) => setSettings({ ...settings, displayName: e.target.value })}
                                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-accent-purple transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-300 mb-2">Bio (Describe yourself)</label>
                            <textarea
                                value={settings.bio}
                                onChange={(e) => setSettings({ ...settings, bio: e.target.value })}
                                rows={4}
                                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-accent-purple transition-colors resize-none"
                                placeholder="I love chatting about movies and traveling!"
                            />
                        </div>

                        <div className="border-t border-white/5 pt-6 mt-6">
                            <h3 className="font-bold text-lg mb-4">Privacy & Call Settings</h3>

                            <div className="flex items-center justify-between py-3 border-b border-white/5">
                                <div>
                                    <p className="font-bold">Auto-Accept Calls</p>
                                    <p className="text-sm text-gray-500">Automatically connect when you press Go Live</p>
                                </div>
                                <div
                                    onClick={() => setSettings({ ...settings, autoAcceptCalls: !settings.autoAcceptCalls })}
                                    className={`w-14 h-7 rounded-full transition-colors cursor-pointer relative ${settings.autoAcceptCalls ? 'bg-green-500' : 'bg-gray-600'}`}
                                >
                                    <div className={`absolute top-1 transform transition-transform duration-300 w-5 h-5 bg-white rounded-full ${settings.autoAcceptCalls ? 'left-8' : 'left-1'}`}></div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-3">
                                <div>
                                    <p className="font-bold">Show My Location</p>
                                    <p className="text-sm text-gray-500">Display your general region to callers</p>
                                </div>
                                <div
                                    onClick={() => setSettings({ ...settings, showLocation: !settings.showLocation })}
                                    className={`w-14 h-7 rounded-full transition-colors cursor-pointer relative ${settings.showLocation ? 'bg-green-500' : 'bg-gray-600'}`}
                                >
                                    <div className={`absolute top-1 transform transition-transform duration-300 w-5 h-5 bg-white rounded-full ${settings.showLocation ? 'left-8' : 'left-1'}`}></div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="w-full py-4 bg-accent-purple hover:bg-[#6d28d9] rounded-2xl font-black shadow-lg shadow-purple-500/20 disabled:opacity-50 transition-colors"
                            >
                                {isSaving ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </form>

                </div>
            </div>
        </div>
    );
};

export default CreatorSettings;
