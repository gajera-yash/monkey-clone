import React, { useState } from 'react';

const ReportBug = () => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        device: '',
        browser: '',
        steps: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        alert("Bug report submitted successfully! Thank you for helping us improve.");
        setFormData({ title: '', description: '', device: '', browser: '', steps: '' });
    };

    return (
        <div className="min-h-screen bg-dark-900 text-white pt-24 pb-12 px-4 md:px-8">
            <div className="max-w-4xl mx-auto">
                <header className="mb-12">
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-orange-600 mb-4 text-gradient">
                        Report a Bug
                    </h1>
                    <p className="text-gray-400">
                        Help us make Strangy better by reporting technical issues you encounter. 
                        Please be as descriptive as possible.
                    </p>
                </header>

                <div className="bg-dark-800 p-8 rounded-3xl border border-white/10 shadow-xl border-red-500/10">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Bug Title</label>
                            <input 
                                type="text" 
                                required
                                className="w-full bg-dark-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 transition-colors"
                                placeholder="Short, descriptive title"
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                            />
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Device Info</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full bg-dark-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 transition-colors"
                                    placeholder="e.g. iPhone 13, Windows PC"
                                    value={formData.device}
                                    onChange={(e) => setFormData({...formData, device: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Browser</label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full bg-dark-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 transition-colors"
                                    placeholder="e.g. Chrome, Safari"
                                    value={formData.browser}
                                    onChange={(e) => setFormData({...formData, browser: e.target.value})}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                            <textarea 
                                required
                                rows="4"
                                className="w-full bg-dark-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 transition-colors resize-none"
                                placeholder="What happened?"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                            ></textarea>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Steps to Reproduce</label>
                            <textarea 
                                required
                                rows="4"
                                className="w-full bg-dark-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-red-500 transition-colors resize-none"
                                placeholder="1. Click start chat&#10;2. Wait for connection... "
                                value={formData.steps}
                                onChange={(e) => setFormData({...formData, steps: e.target.value})}
                            ></textarea>
                        </div>

                        <button 
                            type="submit"
                            className="w-full py-4 bg-gradient-to-r from-red-500 to-orange-600 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
                        >
                            <span>🐞</span>
                            <span>Submit Bug Report</span>
                        </button>
                    </form>
                </div>

                <div className="mt-8 p-6 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
                    <p className="text-sm text-yellow-500 flex items-start space-x-3">
                        <span className="text-lg">💡</span>
                        <span>For account issues or urgent support, please use the <a href="/contact" className="underline font-bold">Contact Us</a> page or email directy at <a href="mailto:support.strangy@gmail.com" className="underline font-bold">support.strangy@gmail.com</a>.</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ReportBug;
