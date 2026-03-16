import React from 'react';

const PrivacyPolicy = () => {
    return (
        <div className="min-h-screen bg-dark-900 text-white pt-24 pb-12 px-4 md:px-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-600 mb-8">
                    Privacy Policy
                </h1>

                <div className="space-y-8 text-gray-300">
                    <section className="bg-dark-800 p-8 rounded-2xl border border-white/10">
                        <h2 className="text-2xl font-semibold mb-4 text-teal-400">1. Information We Collect</h2>
                        <p className="mb-4">We collect information to provide a better experience to all our users. This includes:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li><strong>Session Information:</strong> Video and audio data are processed in real-time but not stored on our servers.</li>
                            <li><strong>Device Information:</strong> Browser type, operating system, and IP address for security and analytics.</li>
                            <li><strong>Account Information:</strong> If you create an account, we store your email and profile details.</li>
                        </ul>
                    </section>

                    <section className="bg-dark-800 p-8 rounded-2xl border border-white/10">
                        <h2 className="text-2xl font-semibold mb-4 text-teal-400">2. How We Use Information</h2>
                        <p className="leading-relaxed">
                            We use the information we collect to maintain, protect, and improve our services, 
                            to develop new ones, and to protect Strangy and our users.
                        </p>
                    </section>

                    <section className="bg-dark-800 p-8 rounded-2xl border border-white/10">
                        <h2 className="text-2xl font-semibold mb-4 text-teal-400">3. Data Security</h2>
                        <p className="leading-relaxed">
                            We work hard to protect Strangy and our users from unauthorized access to or unauthorized 
                            alteration, disclosure, or destruction of information we hold.
                        </p>
                    </section>

                    <section className="bg-dark-800 p-8 rounded-2xl border border-white/10">
                        <h2 className="text-2xl font-semibold mb-4 text-teal-400">4. Sharing Information</h2>
                        <p className="leading-relaxed">
                            We do not share personal information with companies, organizations, and individuals 
                            outside of Strangy unless one of the following circumstances applies: with your consent, 
                            for external processing, or for legal reasons.
                        </p>
                    </section>

                    <div className="text-sm text-gray-500 mt-12 text-center">
                        Last updated: March 2026
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
