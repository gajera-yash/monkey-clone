import React from 'react';

const TermsOfService = () => {
    return (
        <div className="min-h-screen bg-dark-900 text-white pt-24 pb-12 px-4 md:px-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-600 mb-8">
                    Terms of Service
                </h1>

                <div className="space-y-8 text-gray-300">
                    <section className="bg-dark-800 p-8 rounded-2xl border border-white/10">
                        <h2 className="text-2xl font-semibold mb-4 text-blue-400">1. Acceptance of Terms</h2>
                        <p className="leading-relaxed">
                            By accessing and using Strangy ("the Platform"), you agree to be bound by these Terms of Service. 
                            If you do not agree to these terms, please do not use our services.
                        </p>
                    </section>

                    <section className="bg-dark-800 p-8 rounded-2xl border border-white/10">
                        <h2 className="text-2xl font-semibold mb-4 text-blue-400">2. Eligibility</h2>
                        <p className="leading-relaxed">
                            You must be at least 18 years of age to use the Platform. By using Strangy, you represent 
                            and warrant that you have the right, authority, and capacity to enter into this agreement 
                            and to abide by all of its terms and conditions.
                        </p>
                    </section>

                    <section className="bg-dark-800 p-8 rounded-2xl border border-white/10">
                        <h2 className="text-2xl font-semibold mb-4 text-blue-400">3. Code of Conduct</h2>
                        <p className="mb-4">Users must adhere to our Community Safety Guidelines. Prohibited activities include but are not limited to:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>Harassment or bullying of other users</li>
                            <li>Sharing or broadcasting sexual or inappropriate content</li>
                            <li>Fraudulent or illegal activities</li>
                            <li>Impersionating others or misrepresenting your identity</li>
                        </ul>
                    </section>

                    <section className="bg-dark-800 p-8 rounded-2xl border border-white/10">
                        <h2 className="text-2xl font-semibold mb-4 text-blue-400">4. Content Ownership</h2>
                        <p className="leading-relaxed">
                            You retain ownership of the content you share, but you grant Strangy a non-exclusive, 
                            royalty-free license to use, host, and display that content for the purpose of 
                            providing and improving our services.
                        </p>
                    </section>

                    <section className="bg-dark-800 p-8 rounded-2xl border border-white/10">
                        <h2 className="text-2xl font-semibold mb-4 text-blue-400">5. Termination</h2>
                        <p className="leading-relaxed">
                            We reserve the right to terminate or suspend your access to the Platform at any time, 
                            without prior notice, for conduct that we believe violates these Terms or is harmful 
                            to other users or the Platform itself.
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

export default TermsOfService;
