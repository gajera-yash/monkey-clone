import React, { useState } from 'react';
import { usePremium } from '../../context/PremiumContext';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const PremiumModal = ({ isOpen, onClose }) => {
    const { purchaseSubscription } = usePremium();
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const plans = [
        {
            id: 'monthly',
            name: 'Monthly',
            price: '₹199',
            duration: '/mo',
            features: ['Ad-Free', 'Gender Filter', 'Location Filter'],
            color: 'from-blue-500 to-cyan-500'
        },
        {
            id: 'quarterly',
            name: '3 Months',
            price: '₹499',
            duration: '/3mo',
            description: 'Save 15%',
            features: ['All Monthly Features', 'Priority Matching', 'Unlimited Skips'],
            color: 'from-purple-500 to-pink-500',
            popular: true
        },
        {
            id: 'yearly',
            name: 'Yearly',
            price: '₹1499',
            duration: '/yr',
            description: 'Best Value - Save 40%',
            features: ['All Features', 'Diamond Badge', 'Incognito Mode'],
            color: 'from-yellow-400 to-orange-500'
        },
    ];

    const handlePurchase = async (plan) => {
        setLoading(true);
        const success = await purchaseSubscription(plan.id);
        setLoading(false);

        if (success) {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="bg-dark-900 border border-white/10 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl animate-fade-in-up relative flex flex-col md:flex-row h-[80vh] md:h-auto overflow-y-auto">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 text-gray-400 hover:text-white bg-black/20 rounded-full p-2 transition-colors"
                >
                    ✕
                </button>

                {/* Left Side - Hero / Benefits */}
                <div className="md:w-1/3 bg-gradient-to-br from-indigo-900 to-purple-900 p-8 flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/diamond-upholstery.png')] opacity-10"></div>
                    <div className="relative z-10 text-center md:text-left">
                        <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-lg border border-white/20 mx-auto md:mx-0 shadow-xl">
                            <span className="text-5xl">💎</span>
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">Go Premium</h2>
                        <p className="text-purple-200 mb-8">Unlock the full potential of Strangy with exclusive VIP benefits.</p>

                        <ul className="space-y-4 text-sm text-gray-300">
                            <li className="flex items-center gap-3">
                                <span className="text-green-400">✓</span> No Ads
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-green-400">✓</span> Gender & Location Filters
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-green-400">✓</span> Skip Timer
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-green-400">✓</span> Priority Matching
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Right Side - Plans */}
                <div className="md:w-2/3 p-6 md:p-8 bg-dark-800">
                    <h3 className="text-xl font-bold text-white mb-6 text-center">Select Your Plan</h3>

                    <div className="grid md:grid-cols-3 gap-4">
                        {plans.map((plan) => (
                            <div
                                key={plan.id}
                                className={`relative rounded-2xl p-4 border transition-all cursor-pointer hover:scale-105 flex flex-col h-full
                        ${plan.popular
                                        ? 'bg-white/10 border-accent-purple shadow-lg shadow-accent-purple/20'
                                        : 'bg-white/5 border-white/10 hover:border-white/30'
                                    }`}
                                onClick={() => handlePurchase(plan)}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent-purple text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md uppercase tracking-wide">
                                        Most Popular
                                    </div>
                                )}

                                <div className={`h-2 w-12 rounded-full mb-4 bg-gradient-to-r ${plan.color}`}></div>

                                <h4 className="text-lg font-bold text-white">{plan.name}</h4>
                                <div className="flex items-baseline gap-1 my-2">
                                    <span className="text-2xl font-bold text-white">{plan.price}</span>
                                    <span className="text-xs text-gray-400">{plan.duration}</span>
                                </div>

                                {plan.description && (
                                    <p className="text-xs text-green-400 font-medium mb-4">{plan.description}</p>
                                )}

                                <div className="mt-auto pt-4 border-t border-white/10">
                                    <button
                                        disabled={loading}
                                        className={`w-full py-2 rounded-xl font-bold text-sm transition-all
                                ${plan.popular
                                                ? 'bg-accent-purple hover:bg-accent-purple/80 text-white shadow-lg shadow-accent-purple/25'
                                                : 'bg-white text-dark-900 hover:bg-gray-200'
                                            } disabled:opacity-50`}
                                    >
                                        {loading ? 'Processing...' : 'Select'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <p className="text-center text-xs text-gray-500 mt-6">
                        Recurring billing. Cancel anytime. <br />
                        Terms & Conditions apply.
                    </p>
                </div>

            </div>
        </div>
    );
};

export default PremiumModal;
