import React from 'react';
import SEO from '../SEO';


const Community = () => {
    const rules = [
        {
            title: "Be Respectful",
            desc: "Treat everyone with kindness. No harassment, bullying, or hate speech.",
            icon: "🤝"
        },
        {
            title: "Stay Safe",
            desc: "Never share personal info. Protect your privacy and the privacy of others.",
            icon: "🛡️"
        },
        {
            title: "Keep it Clean",
            desc: "Strangy is for a general audience. No nudity or inappropriate content.",
            icon: "✨"
        },
        {
            title: "Have Fun",
            desc: "Spontaneous connections are what we're about! Enjoy meeting new people.",
            icon: "🎉"
        }
    ];

    return (
        <div className="min-h-screen bg-dark-900 text-white pt-24 pb-12 px-4 md:px-8">
            <SEO
                title="Strangy Community — Connect, Chat & Meet People in India"
                description="Join the Strangy community — thousands of users across India connect, chat and build real friendships through live video calls daily. Join us today!"
                canonical="https://strangy.in/community"
                ogImage="https://strangy.in/og-community.jpg"
            />

            <div className="max-w-4xl mx-auto">
                <header className="text-center mb-16">
                    <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-fuchsia-600 mb-6 text-gradient">
                        Community Standards
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Welcome to the Strangy community! Our goal is to create a safe, 
                        friendly, and fun environment for everyone.
                    </p>
                </header>

                <div className="grid md:grid-cols-2 gap-8 mb-16">
                    {rules.map((rule, index) => (
                        <div key={index} className="bg-dark-800/40 backdrop-blur-md p-8 rounded-3xl border border-white/5 hover:bg-dark-800/60 transition-all group">
                            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform inline-block">{rule.icon}</div>
                            <h3 className="text-2xl font-bold mb-3 text-violet-400">{rule.title}</h3>
                            <p className="text-gray-400 leading-relaxed">{rule.desc}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-dark-800 p-10 rounded-3xl border border-white/10 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-fuchsia-600"></div>
                    <h2 className="text-3xl font-bold mb-6">Our Culture</h2>
                    <p className="text-gray-300 text-lg leading-relaxed mb-8">
                        We believe in the power of human connection. Every day, thousands of people 
                        from different backgrounds come together on Strangy to share moments, 
                        stories, and laughs. By following our guidelines, you help keep this 
                        vibrant community thriving.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a href="/safety" className="text-violet-400 font-bold hover:underline">Safety Guidelines</a>
                        <span className="hidden sm:block text-gray-600">|</span>
                        <a href="/terms" className="text-violet-400 font-bold hover:underline">Terms of Service</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Community;
