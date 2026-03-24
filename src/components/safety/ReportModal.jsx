import React, { useState } from 'react';

const ReportModal = ({ isOpen, onClose, onSubmit, reportedUserName, remoteVideoRef }) => {
    const [reason, setReason] = useState('Nudity');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const captureScreenshot = () => {
        if (!remoteVideoRef?.current) return null;
        const video = remoteVideoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const screenshotBlob = await captureScreenshot();
            await onSubmit({ reason, description, screenshotBlob });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setDescription('');
            setReason('Nudity');
        }
    };

    const reasons = [
        { id: 'Nudity', label: '🔞 Nudity / Explicit Content', color: 'border-red-500/60 bg-red-500/10 text-red-300' },
        { id: 'Harassment', label: '😠 Harassment / Bullying', color: 'border-orange-500/60 bg-orange-500/10 text-orange-300' },
        { id: 'Underage', label: '🔒 Underage User', color: 'border-purple-500/60 bg-purple-500/10 text-purple-300' },
        { id: 'Spam', label: '📢 Spam / Advertising', color: 'border-yellow-500/60 bg-yellow-500/10 text-yellow-300' },
        { id: 'Other', label: '⚠️ Other', color: 'border-gray-500/60 bg-gray-500/10 text-gray-300' },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-dark-800 border border-red-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="text-red-500">🚨</span>
                        Report {reportedUserName || 'User'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Select Reason</label>
                        <div className="flex flex-col gap-2">
                            {reasons.map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setReason(opt.id)}
                                    className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                                        reason === opt.id
                                            ? opt.color + ' border-2'
                                            : 'border-white/10 bg-black/20 text-gray-400 hover:border-white/20 hover:text-white'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Description (Optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 min-h-[80px] resize-none"
                            placeholder="Please describe what happened..."
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all"
                        >
                            {loading ? 'Submitting...' : 'Submit Report & Block'}
                        </button>
                        <p className="text-xs text-center text-gray-500 mt-3">
                            Reporting will instantly block this user and skip to the next match.
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReportModal;
