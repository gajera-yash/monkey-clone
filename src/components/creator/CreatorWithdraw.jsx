import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import toast from 'react-hot-toast';

const CreatorWithdraw = () => {
    const { currentUser, updateProfileInfo } = useAuth();
    const navigate = useNavigate();

    const [method, setMethod] = useState('upi'); // 'upi' | 'bank'
    const [amount, setAmount] = useState('');
    const [paymentDetails, setPaymentDetails] = useState('');
    const [bankDetails, setBankDetails] = useState({ accountName: '', accountNumber: '', ifsc: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const MINIMUM_WITHDRAWAL = 1000;
    const availableBalance = currentUser?.coins || 0;

    const handleWithdraw = async (e) => {
        e.preventDefault();

        const withdrawAmount = Number(amount);

        if (!withdrawAmount || withdrawAmount < MINIMUM_WITHDRAWAL) {
            toast.error(`Minimum withdrawal is ₹${MINIMUM_WITHDRAWAL}`);
            return;
        }

        if (withdrawAmount > availableBalance) {
            toast.error("Insufficient balance");
            return;
        }

        if (method === 'upi' && !paymentDetails) {
            toast.error("Please enter your UPI ID");
            return;
        }

        if (method === 'bank' && (!bankDetails.accountName || !bankDetails.accountNumber || !bankDetails.ifsc)) {
            toast.error("Please fill all bank details");
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading("Processing request...");

        try {
            // 1. Create withdrawal request in payouts table
            const { error: payoutError } = await supabase
                .from('payouts')
                .insert({
                    user_id: currentUser.uid,
                    amount: withdrawAmount,
                    method,
                    details: method === 'upi' ? { upiId: paymentDetails } : bankDetails,
                    status: 'pending'
                });

            if (payoutError) throw payoutError;

            // 2. Deduct from available balance using RPC
            const { error: balanceError } = await supabase.rpc('update_creator_balance', {
                user_id: currentUser.uid,
                earned: -withdrawAmount,
                duration: 0 // Duration not relevant for withdrawal
            });

            if (balanceError) throw balanceError;

            // Update local context to reflect immediately
            await updateProfileInfo({
                available_balance: (currentUser.available_balance || 0) - withdrawAmount
            });

            toast.success(`Withdrawal request for ₹${withdrawAmount} submitted!`, { id: toastId });
            setAmount('');
            setPaymentDetails('');
            setBankDetails({ accountName: '', accountNumber: '', ifsc: '' });
            navigate('/creator/dashboard');

        } catch (error) {
            console.error("Withdrawal error", error);
            toast.error("Failed to submit request", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark-900 text-white p-4 md:p-8">
            <div className="max-w-3xl mx-auto">

                <button
                    onClick={() => navigate('/creator/dashboard')}
                    className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
                >
                    <span>←</span> Back to Dashboard
                </button>

                <div className="mb-10">
                    <h1 className="text-3xl font-black mb-2">Withdraw Earnings</h1>
                    <p className="text-gray-400">Cash out your hard-earned money to your bank account or UPI.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                    {/* Left Col - Balance & Stats */}
                    <div className="md:col-span-1 space-y-4">
                        <div className="bg-gradient-to-br from-dark-800 to-dark-900 border border-white/10 p-6 rounded-3xl relative overflow-hidden shadow-2xl">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 blur-3xl -mr-10 -mt-10 rounded-full"></div>
                            <p className="text-gray-400 text-sm font-medium mb-2 relative z-10">Available Coins</p>
                            <h2 className="text-4xl font-black text-yellow-400 relative z-10 drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                                🪙 {currentUser?.coins?.toLocaleString() || 0}
                            </h2>

                            <div className="mt-8 pt-6 border-t border-white/5 space-y-3 relative z-10">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Total Coins Earned</span>
                                    <span className="text-white font-medium">🪙 {(currentUser?.coins || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Withdrawn</span>
                                    <span className="text-white font-medium">🪙 0</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-500/10 border border-blue-500/30 p-5 rounded-2xl flex gap-3 text-blue-300 text-sm">
                            <span className="text-xl">ℹ️</span>
                            <p>Withdrawals are processed manually within 24-48 business hours. Minimum payout is 🪙 1,000.</p>
                        </div>
                    </div>

                    {/* Right Col - Form */}
                    <div className="md:col-span-2">
                        <form onSubmit={handleWithdraw} className="bg-dark-800 border border-white/5 p-6 md:p-8 rounded-3xl shadow-xl">

                            {/* Method Selection */}
                            <div className="mb-8">
                                <label className="block text-sm font-bold text-gray-300 mb-4">Select Payout Method</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setMethod('upi')}
                                        className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${method === 'upi'
                                            ? 'border-accent-purple bg-accent-purple/10 text-white'
                                            : 'border-white/5 hover:border-white/20 text-gray-400'
                                            }`}
                                    >
                                        <span className="text-2xl">📱</span>
                                        <span className="font-bold">UPI</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMethod('bank')}
                                        className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${method === 'bank'
                                            ? 'border-blue-500 bg-blue-500/10 text-white'
                                            : 'border-white/5 hover:border-white/20 text-gray-400'
                                            }`}
                                    >
                                        <span className="text-2xl">🏦</span>
                                        <span className="font-bold">Bank Transfer</span>
                                    </button>
                                </div>
                            </div>

                            {/* Amount Input */}
                            <div className="mb-8">
                                <label className="block text-sm font-bold text-gray-300 mb-2">Withdrawal Amount (Coins)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-400 font-bold">🪙</span>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0"
                                        className="w-full bg-dark-900 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xl font-bold text-white outline-none focus:border-accent-purple transition-colors"
                                    />
                                </div>
                                <div className="flex justify-between mt-2 px-1">
                                    <span className="text-xs text-gray-500">Min: 🪙 1,000</span>
                                    <button
                                        type="button"
                                        onClick={() => setAmount(currentUser?.coins?.toString() || '0')}
                                        className="text-xs text-accent-pink font-bold hover:underline"
                                    >
                                        Withdraw Max
                                    </button>
                                </div>
                            </div>

                            {/* Dynamic Details Fields */}
                            <div className="space-y-4 mb-10">
                                {method === 'upi' ? (
                                    <div>
                                        <label className="block text-sm font-bold text-gray-300 mb-2">UPI ID</label>
                                        <input
                                            type="text"
                                            value={paymentDetails}
                                            onChange={(e) => setPaymentDetails(e.target.value)}
                                            placeholder="yourname@upi"
                                            className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-accent-purple transition-colors"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-300 mb-2">Account Holder Name</label>
                                            <input
                                                type="text"
                                                value={bankDetails.accountName}
                                                onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })}
                                                placeholder="John Doe"
                                                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-300 mb-2">Account Number</label>
                                            <input
                                                type="text"
                                                value={bankDetails.accountNumber}
                                                onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                                                placeholder="0000 0000 0000"
                                                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-300 mb-2">IFSC Code</label>
                                            <input
                                                type="text"
                                                value={bankDetails.ifsc}
                                                onChange={(e) => setBankDetails({ ...bankDetails, ifsc: e.target.value.toUpperCase() })}
                                                placeholder="SBIN000XXXX"
                                                className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors uppercase"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || !amount || Number(amount) < MINIMUM_WITHDRAWAL}
                                className={`w-full py-4 rounded-2xl font-black text-lg shadow-xl flex items-center justify-center transition-all ${isSubmitting || !amount || Number(amount) < MINIMUM_WITHDRAWAL
                                    ? 'bg-dark-900 text-gray-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-green-400 to-emerald-500 text-black hover:scale-[1.02] active:scale-95 shadow-green-500/20'
                                    }`}
                            >
                                {isSubmitting ? (
                                    <span className="animate-spin text-2xl">⏳</span>
                                ) : (
                                    `Submit Withdrawal Request`
                                )}
                            </button>

                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CreatorWithdraw;
