import React, { useState } from 'react';

const ReportModal = ({ isOpen, onClose, onSubmit, reportedUserName }) => {
    const [reason, setReason] = useState('Inappropriate Behavior');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit({ reason, description });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setDescription('');
            setReason('Inappropriate Behavior');
        }
    };

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
                        <label className="block text-sm font-medium text-gray-400 mb-1">Reason</label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500"
                        >
                            <option>Inappropriate Behavior</option>
                            <option>Spam or Advertising</option>
                            <option>Harassment or Bullying</option>
                            <option>Underage User</option>
                            <option>Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Description (Optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 min-h-[100px]"
                            placeholder="Please describe the issue..."
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all"
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
