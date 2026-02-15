import React, { useState, useEffect } from 'react';

const Header = ({ onStartChat }) => {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 0) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header
            className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-purple-900/90 backdrop-blur-md shadow-lg' : 'bg-transparent'
                }`}
        >
            <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                {/* Logo */}
                <div className="flex items-center space-x-2 cursor-pointer" onClick={onStartChat}>
                    <span className="text-2xl">🐵</span>
                    <h1 className="text-white font-bold text-xl tracking-wide">Monkey Clone</h1>
                </div>

                {/* Navigation */}
                <nav className="flex items-center space-x-8">
                    <button
                        onClick={onStartChat}
                        className="text-white/90 hover:text-white font-medium transition-colors duration-200"
                    >
                        Start
                    </button>
                    <button className="text-white/90 hover:text-white font-medium transition-colors duration-200">
                        About Chat
                    </button>
                </nav>
            </div>
        </header>
    );
};

export default Header;
