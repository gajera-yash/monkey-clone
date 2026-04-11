import React from 'react';

const About = () => {
    return (
        <div className="min-h-screen bg-dark-900 text-white pt-24 pb-12 px-4 md:px-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 mb-8 animate-fade-in">
                    About Strangy
                </h1>

                <div className="space-y-12">
                    <section className="bg-dark-800/50 backdrop-blur-xl p-8 rounded-3xl border border-white/10 hover:border-purple-500/30 transition-all duration-300">
                        <h2 className="text-3xl font-bold mb-6 text-purple-400">Our Mission</h2>
                        <p className="text-gray-300 text-lg leading-relaxed">
                            Strangy was born from a simple idea: the most interesting conversations often happen by chance. 
                            We believe that in an increasingly digital world, spontaneous connections can bridge gaps, 
                            foster empathy, and bring a little bit of magic to our daily lives.
                        </p>
                    </section>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-dark-800/50 backdrop-blur-xl p-8 rounded-3xl border border-white/10 hover:border-pink-500/30 transition-all duration-300">
                            <h3 className="text-2xl font-bold mb-4 text-pink-500">Global Connection</h3>
                            <p className="text-gray-400">
                                Meet people from every corner of the globe. Explore different cultures, 
                                languages, and perspectives with just one click.
                            </p>
                        </div>
                        <div className="bg-dark-800/50 backdrop-blur-xl p-8 rounded-3xl border border-white/10 hover:border-blue-500/30 transition-all duration-300">
                            <h3 className="text-2xl font-bold mb-4 text-blue-400">Instant Interaction</h3>
                            <p className="text-gray-400">
                                No profiles, no swiping, no waiting. Just real people, real conversations, 
                                and real-time video connections.
                            </p>
                        </div>
                    </div>

                    <section className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 p-10 rounded-3xl border border-white/10">
                        <h2 className="text-3xl font-bold mb-6 text-white text-center">Join the Community</h2>
                        <p className="text-gray-300 text-lg leading-relaxed text-center mb-10">
                            Thousands of people are connecting on Strangy right now. Whether you're looking for 
                            a friendly chat, a new language partner, or just someone to share a laugh with, 
                            Strangy is the place for you.
                        </p>
                        <div className="flex justify-center mb-12">
                             <a href="/" className="px-10 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-lg shadow-purple-500/25">
                                Start Chatting Now
                             </a>
                        </div>

                        <div className="pt-8 border-t border-white/10">
                            <h3 className="text-xl font-bold mb-4 text-purple-400 text-center uppercase tracking-widest">Legal Information</h3>
                            <p className="text-gray-400 text-sm leading-relaxed text-center">
                                Strangy Video Chat is owned and operated by <strong>GAJERA YASH VIPULBHAI</strong>.<br />
                                Registered Address: Yoginagar Society, opp. Bapasitaram Society, Yogi Chowk, Puna Simada Road, Surat, Gujarat - 395010
                            </p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default About;
