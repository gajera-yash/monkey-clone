import React, { useState } from 'react';
import { useCoins } from '../../context/CoinsContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const CoinStoreModal = ({ isOpen, onClose }) => {
    const { purchaseCoins } = useCoins();
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const packages = [
        { id: 'pkg_100', coins: 100, price: 99, discount: '0%' },
        { id: 'pkg_500', coins: 500, price: 449, discount: '10%' },
        { id: 'pkg_1000', coins: 1000, price: 799, discount: '20%', popular: true },
        { id: 'pkg_5000', coins: 5000, price: 3499, discount: '30%' },
    ];

    const handlePurchase = async (pkg) => {
        setLoading(true);
        const success = await purchaseCoins(pkg.id);
        setLoading(false);

        if (success) {
            toast.success(`Purchased ${pkg.coins} Coins!`);
            onClose();
        } else {
            toast.error('Purchase failed. Please try again.');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-dark-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-up relative">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    ✕
                </button>

                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
                        <span className="text-4xl filter drop-shadow-lg">💰</span>
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">Get More Coins</h2>
                    <p className="text-gray-400 text-sm mb-6">Use coins for gifts, skips, and premium filters!</p>

                    <div className="space-y-3">
                        {packages.map((pkg) => (
                            <button
                                key={pkg.id}
                                onClick={() => handlePurchase(pkg)}
                                disabled={loading}
                                className={`w-full group relative flex items-center justify-between p-4 rounded-xl border transition-all duration-200
                  ${pkg.popular
                                        ? 'bg-accent-purple/10 border-accent-purple hover:bg-accent-purple/20'
                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                    } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {pkg.popular && (
                                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-accent-purple text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                                        MOST POPULAR
                                    </span>
                                )}

                                <div className="flex items-center gap-3">
                                    <div className="bg-yellow-500/10 p-2 rounded-full">
                                        <span className="text-xl">🪙</span>
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-white text-lg">{pkg.coins.toLocaleString()}</div>
                                        <div className="text-xs text-green-400 font-medium">{pkg.discount !== '0%' ? `Save ${pkg.discount}` : 'Starter Pack'}</div>
                                    </div>
                                </div>

                                <div className="bg-white text-dark-900 font-bold px-4 py-1.5 rounded-full text-sm group-hover:scale-105 transition-transform">
                                    ₹{pkg.price}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white/5 p-4 text-center border-t border-white/5">
                    <p className="text-xs text-gray-500">
                        Secure processing by Stripe/Razorpay. <br />
                        By purchasing, you agree to our Terms & Conditions.
                    </p>
                </div>

            </div>
        </div>
    );
};

export default CoinStoreModal;
