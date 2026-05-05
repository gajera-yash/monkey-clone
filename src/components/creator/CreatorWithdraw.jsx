import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import toast from 'react-hot-toast';

const CreatorWithdraw = () => {
    const { currentUser, updateProfileInfo, refreshProfile } = useAuth();
    const navigate = useNavigate();

    const [method, setMethod] = useState('upi'); // 'upi' | 'bank'
    const [amount, setAmount] = useState('');
    const [paymentDetails, setPaymentDetails] = useState('');
    const [bankDetails, setBankDetails] = useState({ accountName: '', accountNumber: '', ifsc: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const COINS_PER_RUPEE = 100;         // 100 coins = ₹1
    const MINIMUM_WITHDRAWAL_COINS = 5000; // Minimum 5000 coins = ₹50
    const availableBalance = currentUser?.coins || 0;
    const availableRupees = availableBalance / COINS_PER_RUPEE;

    // Live rupee preview from coin input
    const coinAmount = Number(amount) || 0;
    const rupeeAmount = parseFloat((coinAmount / COINS_PER_RUPEE).toFixed(2));

    const handleWithdraw = async (e) => {
        e.preventDefault();

        const withdrawAmount = Number(amount);

        if (!withdrawAmount || withdrawAmount < MINIMUM_WITHDRAWAL_COINS) {
            toast.error(`Minimum withdrawal is 🪙 ${MINIMUM_WITHDRAWAL_COINS.toLocaleString()} coins (₹${MINIMUM_WITHDRAWAL_COINS / COINS_PER_RUPEE})`);
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
            const userId = currentUser.uid || currentUser.id;
            
            const rupeeValue = parseFloat((withdrawAmount / COINS_PER_RUPEE).toFixed(2));
            const { error: payoutError } = await supabase
                .from('payouts')
                .insert({
                    user_id: userId,
                    amount: rupeeValue,
                    coins_redeemed: withdrawAmount,
                    method,
                    details: method === 'upi' ? { upiId: paymentDetails } : bankDetails,
                    status: 'pending'
                });

            if (payoutError) throw payoutError;

            const { error: balanceError } = await supabase.rpc('update_creator_balance', {
                user_id: userId,
                earned: -withdrawAmount,
                duration: 0
            });

            if (balanceError) throw balanceError;

            if (typeof refreshProfile === 'function') {
                await refreshProfile();
            }

            const finalRupees = (withdrawAmount / COINS_PER_RUPEE).toFixed(2);
            toast.success(`Withdrawal request for ₹${finalRupees} submitted! (🪙 ${withdrawAmount.toLocaleString()} coins)`, { id: toastId });
            setAmount('');
            setPaymentDetails('');
            setBankDetails({ accountName: '', accountNumber: '', ifsc: '' });
            
            setTimeout(() => {
                navigate('/creator/dashboard');
            }, 1500);

        } catch (error) {
            console.error("Withdrawal error", error);
            const msg = error.message || "Failed to submit request";
            toast.error(msg, { id: toastId });
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

                {currentUser?.gender === 'Female' ? (
                    /* Coming Soon Message for Female Creators */
                    <div className="flex flex-col items-center justify-center text-center py-20">
                        <div className="w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mb-8 border border-white/10 shadow-2xl">
                            <span className="text-6xl">🏦</span>
                        </div>
                        
                        <h1 className="text-4xl font-black mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                            Withdrawal Coming Soon!
                        </h1>
                        
                        <p className="text-gray-400 max-w-md text-lg mb-3">
                            We're working hard to bring you a seamless withdrawal experience. This feature will be available very soon!
                        </p>
                        
                        <p className="text-gray-500 text-sm mb-10 max-w-sm">
                            Keep earning coins through video chats and gifts. Your balance is safe and will be ready to withdraw once the feature launches.
                        </p>

                        <div className="bg-dark-800 border border-white/10 rounded-3xl p-8 mb-8 w-full max-w-sm">
                            <p className="text-gray-400 text-sm font-medium mb-2">Your Current Balance</p>
                            <h2 className="text-4xl font-black text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                                🪙 {availableBalance.toLocaleString()}
                            </h2>
                            <p className="text-green-400 text-lg font-bold mt-1">
                                = ₹{availableRupees.toFixed(2)}
                            </p>
                        </div>

                        <div className="bg-blue-500/10 border border-blue-500/30 p-5 rounded-2xl flex gap-3 text-blue-300 text-sm max-w-sm">
                            <span className="text-xl">🔔</span>
                            <p>You'll be notified as soon as withdrawals are enabled. Keep chatting and earning!</p>
                        </div>

                        <button
                            onClick={() => navigate('/creator/dashboard')}
                            className="mt-8 px-8 py-3 bg-gradient-to-r from-accent-pink to-accent-purple rounded-2xl font-bold hover:scale-105 transition-transform shadow-lg shadow-accent-purple/20"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                ) : (
                    /* Original Withdrawal Form for Others */
                    <>
                        <div className="mb-10">
                            <h1 className="text-3xl font-black mb-2">Withdraw Earnings</h1>
                            <p className="text-gray-400">Cash out your hard-earned money to your bank account or UPI.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="md:col-span-1 space-y-4">
                                <div className="bg-gradient-to-br from-dark-800 to-dark-900 border border-white/10 p-6 rounded-3xl relative overflow-hidden shadow-2xl">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 blur-3xl -mr-10 -mt-10 rounded-full"></div>
                                    <p className="text-gray-400 text-sm font-medium mb-2 relative z-10">Available Coins</p>
                                    <h2 className="text-4xl font-black text-yellow-400 relative z-10 drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                                        🪙 {availableBalance.toLocaleString()}
                                    </h2>
                                    <p className="text-green-400 text-lg font-bold relative z-10 mt-1">
                                        = ₹{availableRupees.toFixed(2)}
                                    </p>

                                    <div className="mt-6 pt-4 border-t border-white/5 space-y-2 relative z-10">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Conversion Rate</span>
                                            <span className="text-white font-medium">🪙 100 = ₹1</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Min. Withdrawal</span>
                                            <span className="text-white font-medium">🪙 5,000 (₹50)</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-blue-500/10 border border-blue-500/30 p-5 rounded-2xl flex gap-3 text-blue-300 text-sm">
                                    <span className="text-xl">ℹ️</span>
                                    <p>Withdrawals processed within 24-48 hours. Rate: <strong>🪙 100 = ₹1</strong>. Minimum payout: 🪙 5,000 coins (₹50).</p>
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <form onSubmit={handleWithdraw} className="bg-dark-800 border border-white/5 p-6 md:p-8 rounded-3xl shadow-xl">
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

                                    <div className="mb-8">
                                        <label className="block text-sm font-bold text-gray-300 mb-2">Coins to Redeem</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-400 font-bold">🪙</span>
                                            <input
                                                type="number"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                placeholder="Enter coins (min 5,000)"
                                                min={MINIMUM_WITHDRAWAL_COINS}
                                                step={100}
                                                className="w-full bg-dark-900 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xl font-bold text-white outline-none focus:border-accent-purple transition-colors"
                                            />
                                        </div>

                                        <div className={`mt-3 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${
                                            coinAmount >= MINIMUM_WITHDRAWAL_COINS
                                                ? 'bg-green-500/10 border border-green-500/20 text-green-300'
                                                : 'bg-white/5 border border-white/10 text-gray-500'
                                        }`}>
                                            <span className="text-sm">🪙 {coinAmount.toLocaleString()} coins</span>
                                            <span className="text-white/30">→</span>
                                            <span className="text-lg">₹{rupeeAmount.toFixed(2)}</span>
                                        </div>

                                        <div className="flex justify-between mt-2 px-1">
                                            <span className="text-xs text-gray-500">Min: 🪙 5,000 coins = ₹50</span>
                                            <button
                                                type="button"
                                                onClick={() => setAmount(availableBalance.toString())}
                                                className="text-xs text-accent-pink font-bold hover:underline"
                                            >
                                                Withdraw Max (🪙{availableBalance.toLocaleString()} = ₹{availableRupees.toFixed(2)})
                                            </button>
                                        </div>
                                    </div>

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
                                                    <label htmlFor="accountName" className="block text-sm font-bold text-gray-300 mb-2">Account Holder Name</label>
                                                    <input
                                                        id="accountName"
                                                        type="text"
                                                        inputMode="text"
                                                        autoComplete="name"
                                                        enterKeyHint="next"
                                                        value={bankDetails.accountName}
                                                        onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })}
                                                        placeholder="John Doe"
                                                        className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors text-base"
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="accountNumber" className="block text-sm font-bold text-gray-300 mb-2">Account Number</label>
                                                    <input
                                                        id="accountNumber"
                                                        type="text"
                                                        inputMode="numeric"
                                                        autoComplete="off"
                                                        enterKeyHint="next"
                                                        value={bankDetails.accountNumber}
                                                        onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                                                        placeholder="0000 0000 0000"
                                                        className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors text-base"
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="ifscCode" className="block text-sm font-bold text-gray-300 mb-2">IFSC Code</label>
                                                    <input
                                                        id="ifscCode"
                                                        type="text"
                                                        inputMode="text"
                                                        autoComplete="off"
                                                        autoCapitalize="characters"
                                                        enterKeyHint="done"
                                                        value={bankDetails.ifsc}
                                                        onChange={(e) => setBankDetails({ ...bankDetails, ifsc: e.target.value.toUpperCase() })}
                                                        placeholder="SBIN000XXXX"
                                                        className="w-full bg-dark-900 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors uppercase text-base"
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !amount || coinAmount < MINIMUM_WITHDRAWAL_COINS}
                                        className={`w-full py-4 rounded-2xl font-black text-lg shadow-xl flex items-center justify-center gap-2 transition-all ${isSubmitting || !amount || coinAmount < MINIMUM_WITHDRAWAL_COINS
                                            ? 'bg-dark-900 text-gray-500 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-green-400 to-emerald-500 text-black hover:scale-[1.02] active:scale-95 shadow-green-500/20'
                                            }`}
                                    >
                                        {isSubmitting ? (
                                            <span className="animate-spin text-2xl">⏳</span>
                                        ) : coinAmount >= MINIMUM_WITHDRAWAL_COINS ? (
                                            <>Withdraw ₹{rupeeAmount.toFixed(2)} <span className="text-sm font-medium opacity-70">(🪙 {coinAmount.toLocaleString()})</span></>
                                        ) : (
                                            `Enter at least 🪙 5,000 coins`
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CreatorWithdraw;
