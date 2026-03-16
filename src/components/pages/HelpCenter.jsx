import React from 'react';

const HelpCenter = () => {
    const faqs = [
        {
            q: "How do I start a chat?",
            a: "Simply click the 'Start Chatting' button on the home page. You'll be connected to a random user instantly."
        },
        {
            q: "Is Strangy free to use?",
            a: "Yes, the basic video chat features are completely free. We also offer premium features and coin packages for an enhanced experience."
        },
        {
            q: "How do I report a user?",
            a: "During a chat, you'll see a 'Report' button. Click it to immediately flag the user for our moderation team."
        },
        {
            q: "Can I use Strangy on mobile?",
            a: "Absolutely! Strangy is fully responsive and works great on both iOS and Android browsers."
        }
    ];

    return (
        <div className="min-h-screen bg-dark-900 text-white pt-24 pb-12 px-4 md:px-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-yellow-600 mb-8">
                    Help Center
                </h1>

                <div className="grid md:grid-cols-2 gap-8 mb-12">
                    <div className="bg-dark-800 p-8 rounded-3xl border border-white/10 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-orange-500/20 text-orange-500 rounded-2xl flex items-center justify-center text-3xl mb-4">
                            ❓
                        </div>
                        <h3 className="text-xl font-bold mb-2">FAQs</h3>
                        <p className="text-gray-400">Find quick answers to common questions about using Strangy.</p>
                    </div>
                    <div className="bg-dark-800 p-8 rounded-3xl border border-white/10 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-blue-500/20 text-blue-500 rounded-2xl flex items-center justify-center text-3xl mb-4">
                            ✉️
                        </div>
                        <h3 className="text-xl font-bold mb-2">Support</h3>
                        <p className="text-gray-400">Can't find what you're looking for? Reach out to our support team.</p>
                        <a href="mailto:support.strangy@gmail.com" className="text-blue-400 font-semibold mt-4">support.strangy@gmail.com</a>
                    </div>
                </div>

                <div className="space-y-6">
                    <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
                    {faqs.map((faq, index) => (
                        <div key={index} className="bg-dark-800 p-6 rounded-2xl border border-white/10 shadow-sm">
                            <h3 className="text-lg font-semibold text-orange-400 mb-2">{faq.q}</h3>
                            <p className="text-gray-300 leading-relaxed">{faq.a}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HelpCenter;
