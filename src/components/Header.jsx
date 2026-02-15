import React, { useState, useEffect } from 'react';

const Header = ({ onStartChat }) => {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header
            className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 border-b ${isScrolled
                    ? 'bg-dark-900/80 backdrop-blur-md border-white/5 py-3 shadow-lg'
                    : 'bg-transparent border-transparent py-5'
                }`}
        >
            <div className="container mx-auto px-6 flex justify-between items-center">
                {/* Logo */}
                <div
                    className="flex items-center space-x-3 cursor-pointer group"
                    onClick={onStartChat}
                >
                    <div className="relative">
                        <span className="text-3xl filter drop-shadow-lg group-hover:scale-110 transition-transform duration-200 inline-block">
                            🐵
                        </span>
                        <div className="absolute inset-0 bg-accent-purple/20 blur-lg rounded-full opacity-50"></div>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        <span className="text-white">Monkey</span>
                        <span className="text-gradient">Clone</span>
                    </h1>
                </div>

                {/* Navigation */}
                <nav className="flex items-center space-x-6">
                    <button
                        className="text-gray-300 hover:text-white font-medium transition-colors duration-200 text-sm hidden md:block"
                    >
                        About
                    </button>
                    <button
                        onClick={onStartChat}
                        className="bg-white/10 hover:bg-white/20 text-white border border-white/10 px-6 py-2 rounded-full font-medium transition-all duration-200 hover:scale-105 backdrop-blur-sm"
                    >
                        Start Chat
                    </button>
                </nav>
            </div>
        </header>
    );
};

export default Header;
