import React from 'react';

const Features = () => {
    const features = [
        {
            icon: "🎥",
            title: "Dynamic Video Chats",
            description: "Jump into real, face-to-face conversations that feel spontaneous and genuine.",
            gradient: "from-purple-500 to-indigo-600"
        },
        {
            icon: "🌍",
            title: "Global Reach",
            description: "Connect with people from different backgrounds and cultures worldwide.",
            gradient: "from-pink-500 to-rose-500"
        },
        {
            icon: "🔒",
            title: "Simplicity and Security",
            description: "Enjoy a smooth experience with built-in safety features and moderation.",
            gradient: "from-blue-500 to-cyan-500"
        },
        {
            icon: "🎲",
            title: "Random Matching",
            description: "Start conversations in seconds with fast, one-tap matching.",
            gradient: "from-amber-500 to-orange-500"
        }
    ];

    return (
        <section className="py-24 bg-dark-900 relative overflow-hidden">
            <div className="container mx-auto px-6 relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-white mb-4">
                        Meet New <span className="text-gradient">People</span>
                    </h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Discover a world of possibilities with features designed to make connection easy.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="glass-card p-8 group hover:-translate-y-2"
                        >
                            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-3xl mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                {feature.icon}
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                            <p className="text-gray-400 leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Features;
