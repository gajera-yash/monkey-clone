import React from 'react';

const Footer = () => {
    return (
        <footer className="bg-dark-900 border-t border-white/5 pt-16 pb-8">
            <div className="container mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-center mb-12">
                    {/* Brand */}
                    <div className="mb-8 md:mb-0 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start space-x-3 mb-4">
                            <span className="text-3xl">🐵</span>
                            <h2 className="text-2xl font-bold text-gradient">
                                Strangy
                            </h2>
                        </div>
                        <p className="text-gray-400 max-w-xs mx-auto md:mx-0">
                            Connecting people globally through spontaneous video chat.
                        </p>
                    </div>

                    {/* Download Buttons */}
                    <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                        <button className="flex items-center justify-center px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-200 border border-white/10 group">
                            <span className="text-2xl mr-3 group-hover:scale-110 transition-transform">🍎</span>
                            <div className="text-left">
                                <div className="text-xs text-gray-400">Download on the</div>
                                <div className="text-sm font-bold text-white">App Store</div>
                            </div>
                        </button>
                        <button className="flex items-center justify-center px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-200 border border-white/10 group">
                            <span className="text-2xl mr-3 group-hover:scale-110 transition-transform">🤖</span>
                            <div className="text-left">
                                <div className="text-xs text-gray-400">Get it on</div>
                                <div className="text-sm font-bold text-white">Google Play</div>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center">
                    <div className="flex flex-col md:flex-row items-center gap-4 text-gray-500 text-sm mb-4 md:mb-0">
                        <p>© 2026 Strangy. All rights reserved.</p>
                        <div className="hidden md:block w-1 h-1 bg-gray-700 rounded-full"></div>
                        <a href="/safety" className="hover:text-white transition-colors">Safety Guidelines</a>
                        <a href="/" className="hover:text-white transition-colors">Terms of Service</a>
                    </div>

                    <div className="flex space-x-6">
                        {['Instagram', 'Twitter', 'Facebook'].map((social) => (
                            <a key={social} href="/" className="text-gray-400 hover:text-accent-purple transition-colors duration-200">
                                <span className="sr-only">{social}</span>
                                {/* Placeholder Icons - simplified for brevity, in real app use SVGs */}
                                <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all">
                                    <span className="text-xs">{social[0]}</span>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
