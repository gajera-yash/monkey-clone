import React from 'react';

const SafetyGuidelines = () => {
    return (
        <div className="min-h-screen bg-dark-900 text-white pt-24 pb-12 px-4 md:px-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 mb-8">
                    Community Safety Guidelines
                </h1>

                <div className="space-y-8">
                    <section className="bg-dark-800 p-6 rounded-2xl border border-white/10">
                        <h2 className="text-2xl font-semibold mb-4 text-purple-400">1. Zero Tolerance for Harassment</h2>
                        <p className="text-gray-300 leading-relaxed">
                            We have a zero-tolerance policy for harassment, bullying, hate speech, or discrimination of any kind.
                            Users found engaging in such behavior will be permanently banned.
                        </p>
                    </section>

                    <section className="bg-dark-800 p-6 rounded-2xl border border-white/10">
                        <h2 className="text-2xl font-semibold mb-4 text-pink-500">2. No Inappropriate Content</h2>
                        <p className="text-gray-300 leading-relaxed">
                            Nudity, sexual content, and illegal acts are strictly prohibited.
                            Our moderation system and community reports help us keep the platform clean.
                        </p>
                    </section>

                    <section className="bg-dark-800 p-6 rounded-2xl border border-white/10">
                        <h2 className="text-2xl font-semibold mb-4 text-blue-400">3. Protect Your Privacy</h2>
                        <p className="text-gray-300 leading-relaxed">
                            Never share personal information like your full name, address, phone number, or financial details with strangers.
                            Be cautious and stay safe.
                        </p>
                    </section>

                    <section className="bg-dark-800 p-6 rounded-2xl border border-white/10">
                        <h2 className="text-2xl font-semibold mb-4 text-green-400">4. Age Restriction</h2>
                        <p className="text-gray-300 leading-relaxed">
                            You must be 18 years or older to use this platform. We strictly enforce this rule to ensure the safety of minors.
                        </p>
                    </section>

                    <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-2xl mt-8">
                        <h3 className="text-xl font-bold text-red-500 mb-2">How to Report</h3>
                        <p className="text-gray-300">
                            If you encounter any violation of these guidelines, please use the
                            <span className="font-bold text-white px-2">Report <span className="text-xl">🚨</span></span>
                            button available in the video chat interface immediately.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SafetyGuidelines;
