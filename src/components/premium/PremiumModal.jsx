import React, { useState } from 'react';
import { useCoins } from '../../context/CoinsContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { RiCoinsLine, RiGiftLine, RiCloseLine } from 'react-icons/ri';

const PremiumModal = ({ isOpen, onClose }) => {
    const { addCoins } = useCoins();
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const coinPackages = [
        {
            id: 'pkg_10000',
            baseCoins: 10000,
            bonusCoins: 1000,
            price: '₹5,500',
            priceValue: 5500
        },
        {
            id: 'pkg_4500',
            baseCoins: 4500,
            bonusCoins: 450,
            price: '₹2,699',
            priceValue: 2699
        },
        {
            id: 'pkg_1700',
            baseCoins: 1700,
            bonusCoins: 170,
            price: '₹1,099',
            priceValue: 1099
        },
        {
            id: 'pkg_400',
            baseCoins: 400,
            bonusCoins: 40,
            price: '₹269',
            priceValue: 269
        }
    ];

    const handlePurchase = async (pkg) => {
        setLoading(true);
        const totalCoins = pkg.baseCoins + pkg.bonusCoins;
        // Dummy mode: directly add coins without payment gateway
        console.log("Trying to add coins:", totalCoins);
        const success = await addCoins(totalCoins, `Purchased ${totalCoins} Coins`);
        console.log("addCoins result:", success);
        setLoading(false);

        if (success) {
            toast.success(`🎉 ${totalCoins.toLocaleString()} Coins added!`);
            onClose();
        } else {
            toast.error(`Purchase failed. Please try again. (Debug: addCoins returned false)`);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-[#242424] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in-up relative flex flex-col h-auto max-h-[90vh]">

                {/* Header */}
                <div className="flex justify-between items-center p-5">
                    <h2 className="text-xl font-bold text-white">Shop</h2>
                    <div className="flex items-center gap-1.5 text-yellow-400 font-bold bg-yellow-400/10 px-3 py-1.5 rounded-full">
                        <RiCoinsLine size={18} />
                        <span>{currentUser?.coins || 0}</span>
                    </div>
                </div>

                {/* Close Button Overlay */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 z-[1010] w-10 h-10 hover:bg-white/10 text-white rounded-full flex items-center justify-center transition-colors"
                >
                    <RiCloseLine size={28} />
                    <span className="sr-only">Close</span>
                </button>

                <div className="flex-1 overflow-y-auto px-5 pb-6 custom-scrollbar">
                    
                    {/* Promo Banner */}
                    <div className="bg-[#1c2a22] rounded-2xl p-4 mb-5 text-center border border-[#2a3c31]">
                        <div className="flex items-center justify-center gap-2 text-[#4ade80] font-bold mb-1">
                            <RiGiftLine size={20} className="text-purple-400" /> Web-only Special Offer!
                        </div>
                        <p className="text-[#4ade80] text-sm font-semibold mb-2">10% Web Bonus</p>
                        <p className="text-white text-sm font-bold">10% bonus Coins in total</p>
                    </div>

                    {/* Packages List */}
                    <div className="space-y-3">
                        {coinPackages.map((pkg) => (
                            <button
                                key={pkg.id}
                                disabled={loading}
                                onClick={() => handlePurchase(pkg)}
                                className="w-full bg-[#fbd055] hover:bg-[#ffdb70] rounded-2xl p-4 flex items-center justify-between transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                                style={{
                                    background: pkg.id === 'pkg_10000' 
                                        ? 'linear-gradient(135deg, #fbd055 0%, #f9a826 100%)' 
                                        : '#3b3b3b'
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex -space-x-2">
                                        {/* Coin Stack Illustration */}
                                        <div className="bg-yellow-400 w-8 h-8 rounded-full border border-yellow-500 shadow-sm flex items-center justify-center z-20">
                                            <RiCoinsLine className="text-yellow-700" size={20} />
                                        </div>
                                        <div className="bg-yellow-500 w-8 h-8 rounded-full border border-yellow-600 shadow-sm flex items-center justify-center z-10 translate-y-1">
                                            <RiCoinsLine className="text-yellow-800" size={20} />
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <div className={`text-lg font-black leading-tight ${pkg.id === 'pkg_10000' ? 'text-black' : 'text-white'}`}>
                                            {pkg.baseCoins.toLocaleString()} Coins
                                        </div>
                                        <div className="text-[#4ade80] text-sm font-bold">
                                            + {pkg.bonusCoins.toLocaleString()} Coins
                                        </div>
                                    </div>
                                </div>
                                <div className={`px-3 py-1.5 rounded-xl font-bold text-sm ${pkg.id === 'pkg_10000' ? 'bg-black/10 text-black' : 'bg-white/10 text-white'}`}>
                                    {pkg.price}
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="mt-5 text-[#888] text-xs leading-relaxed px-2">
                        <ul className="list-disc pl-4 space-y-1">
                            <li>You can use coins purchased on the web in the mobile app too.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PremiumModal;
