import React, { useState, useEffect } from 'react';
import { useCoins } from '../../context/CoinsContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabase';
import toast from 'react-hot-toast';
import { load } from '@cashfreepayments/cashfree-js';
import { API_BASE_URL } from '../../utils/socket';



const formatCard = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
};

const formatExpiry = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
};

const CoinStoreModal = ({ isOpen, onClose }) => {
    const { addCoins } = useCoins();
    const { currentUser } = useAuth();
    const [step, setStep] = useState('packages'); // 'packages' | 'payment' | 'success'
    const [selectedPkg, setSelectedPkg] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen) return;
        
        const fetchPackages = async () => {
            const { data, error } = await supabase
                .from('subscription_plans')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (error) throw error;

            console.log("[CoinStore] Fetched plans:", data);

            // Mapping for UI consistency
            const formattedPackages = data.map(pkg => ({
                id: pkg.id,
                coins: pkg.coins,
                price: pkg.price_monthly_inr || pkg.price || 0,
                label: pkg.name || pkg.label || `${pkg.coins} Coins`,
                discount: pkg.discount_label,
                icon: pkg.icon || '🪙',
                popular: pkg.is_popular
            }));

            setPackages(formattedPackages);
            setLoading(false);
        };
        fetchPackages();
    }, [isOpen]);

    // Payment form state
    const [cardName, setCardName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [formError, setFormError] = useState('');

    if (!isOpen) return null;

    const handleSelectPackage = (pkg) => {
        setSelectedPkg(pkg);
        setStep('payment');
        setFormError('');
    };

    const validateForm = () => {
        if (!cardName.trim()) return 'Please enter your name on card.';
        if (cardNumber.replace(/\s/g, '').length < 16) return 'Please enter a valid 16-digit card number.';
        const [mm, yy] = expiry.split('/');
        if (!mm || !yy || parseInt(mm) < 1 || parseInt(mm) > 12) return 'Please enter a valid expiry (MM/YY).';
        if (cvv.length < 3) return 'Please enter a valid CVV.';
        return null;
    };

    const handlePay = async () => {
        setProcessing(true);
        
        try {
            // 1. Create order on backend
            const orderRes = await fetch(`${API_BASE_URL}/api/coins/purchase/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser?.uid || currentUser?.id,
                    packageId: selectedPkg.id
                })
            });
            
            // Check for non-OK response before parsing JSON
            if (!orderRes.ok) {
                let errorMsg = `Server Error (${orderRes.status})`;
                try {
                    const errorData = await orderRes.json();
                    errorMsg = errorData.message || errorData.error || errorMsg;
                    console.error("Server Error Details:", errorData);
                } catch (e) {
                    const text = await orderRes.text();
                    console.error("Server Error:", text);
                }
                throw new Error(errorMsg);
            }

            const orderData = await orderRes.json();
            
            if (!orderData.paymentSessionId) {
                throw new Error(orderData.error || "Failed to create payment session");
            }

            // 2. Load Cashfree Checkout - use dynamic mode from server
            const cashfreeMode = orderData.cashfreeMode || "sandbox";
            console.log("[CoinStore] Loading Cashfree in mode:", cashfreeMode);
            
            const cashfree = await load({
                mode: cashfreeMode
            });

            const result = await cashfree.checkout({
                paymentSessionId: orderData.paymentSessionId,
                redirectTarget: "_modal"
            });

            if (result?.error) {
                toast.error(result.error.message || "Payment cancelled");
                setProcessing(false);
                return;
            }

            // 3. Verify on backend
            const verifyRes = await fetch(`${API_BASE_URL}/api/coins/purchase/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: orderData.orderId,
                    userId: currentUser?.uid || currentUser?.id,
                    packageId: selectedPkg.id
                })
            });
            
            if (!verifyRes.ok) {
                let verifyErrorMsg = "Verification failed";
                try {
                    const verifyErrorData = await verifyRes.json();
                    verifyErrorMsg = verifyErrorData.message || verifyErrorData.error || verifyErrorMsg;
                } catch (e) {}
                throw new Error(verifyErrorMsg);
            }

            const verifyData = await verifyRes.json();
            
            if (verifyData.success) {
                await addCoins(selectedPkg.coins, `Purchased ${selectedPkg.coins} Coins`);
                setStep('success');
            } else {
                toast.error("Payment verification failed");
            }
        } catch (error) {
            console.error("Payment Error:", error);
            toast.error(error.message || "Payment failed");
        } finally {
            setProcessing(false);
        }
    };

    const handleClose = () => {
        setStep('packages');
        setSelectedPkg(null);
        setCardName('');
        setCardNumber('');
        setExpiry('');
        setCvv('');
        setFormError('');
        setProcessing(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-md animate-fade-in-up" style={{ filter: 'drop-shadow(0 25px 60px rgba(0,0,0,0.5))' }}>

                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute -top-3 -right-3 z-20 w-9 h-9 bg-red-500 hover:bg-red-600 text-white rounded-xl flex items-center justify-center font-black text-base transition-colors shadow-lg"
                >
                    ✕
                </button>

                {/* ===== STEP 1: PACKAGE SELECT ===== */}
                {step === 'packages' && (
                    <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(160deg, #1a1830 0%, #0f0d1e 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {/* Header */}
                        <div className="px-6 pt-8 pb-5 text-center"
                            style={{ background: 'linear-gradient(160deg, rgba(139,92,246,0.3) 0%, transparent 100%)' }}>
                            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-4xl"
                                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 8px 24px rgba(245,158,11,0.35)' }}>
                                💰
                            </div>
                            <h2 className="text-2xl font-black text-white">Get Coins</h2>
                            <p className="text-white/50 text-sm mt-1">Use coins for filters, gifts & more!</p>
                        </div>

                        {/* Packages */}
                        <div className="px-5 pb-6 space-y-3">
                            {loading ? (
                                <div className="py-10 flex flex-col items-center justify-center text-white/20">
                                    <div className="w-8 h-8 border-2 border-white/10 border-t-white/40 rounded-full animate-spin mb-2"></div>
                                    <span className="text-xs uppercase tracking-widest font-bold">Loading...</span>
                                </div>
                            ) : packages.length === 0 ? (
                                <div className="py-10 text-center text-white/30 text-xs font-bold uppercase tracking-widest">
                                    No packages available.
                                </div>
                            ) : (
                                packages.map(pkg => (
                                    <button
                                        key={pkg.id}
                                        onClick={() => handleSelectPackage(pkg)}
                                        className="w-full group relative flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                                        style={{
                                            background: pkg.popular
                                                ? 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(109,40,217,0.15))'
                                                : 'rgba(255,255,255,0.04)',
                                            borderColor: pkg.popular ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.08)'
                                        }}
                                    >
                                        {pkg.popular && (
                                            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-black px-3 py-0.5 rounded-full"
                                                style={{ background: 'linear-gradient(90deg, #7c3aed, #a855f7)', color: '#fff' }}>
                                                ⭐ MOST POPULAR
                                            </span>
                                        )}
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                                                style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
                                                {pkg.icon}
                                            </div>
                                            <div className="text-left">
                                                <div className="text-white font-black text-lg leading-none">{pkg.coins.toLocaleString()} Coins</div>
                                                <div className="text-xs mt-1 font-semibold">
                                                    {pkg.discount
                                                        ? <span className="text-green-400">{pkg.discount}</span>
                                                        : <span className="text-white/40">{pkg.label}</span>
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="bg-white text-gray-900 font-black px-4 py-2 rounded-xl text-sm group-hover:bg-yellow-400 transition-colors">
                                                ₹{pkg.price}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        <div className="px-5 pb-5 text-center">
                            <p className="text-white/25 text-xs">🔒 Secure • Instant Delivery • No Real Payment</p>
                        </div>
                    </div>
                )}

                {/* ===== STEP 2: PAYMENT FORM ===== */}
                {step === 'payment' && (
                    <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(160deg, #1a1830 0%, #0f0d1e 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {/* Header */}
                        <div className="px-6 pt-7 pb-5" style={{ background: 'linear-gradient(160deg, rgba(139,92,246,0.2) 0%, transparent 100%)' }}>
                            <button
                                onClick={() => setStep('packages')}
                                className="flex items-center gap-2 text-white/50 hover:text-white text-sm font-semibold mb-4 transition-colors"
                            >
                                ← Back
                            </button>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-black text-white">Secure Checkout</h2>
                                    <p className="text-white/40 text-sm">Powered by Cashfree</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-yellow-400 font-black text-lg">{selectedPkg?.coins.toLocaleString()} 🪙</div>
                                    <div className="text-white/60 text-sm">₹{selectedPkg?.price}</div>
                                </div>
                            </div>
                        </div>

                        {/* Redirect Info */}
                        <div className="px-10 py-16 text-center">
                            <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
                                <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                            </div>
                            <h3 className="text-white font-black text-lg mb-2">Ready for payment?</h3>
                            <p className="text-white/40 text-sm leading-relaxed mb-8">Click below to open the secure payment gateway and complete your purchase.</p>

                            <button
                                onClick={handlePay}
                                disabled={processing}
                                className="w-full py-4 rounded-2xl font-black text-base tracking-wide transition-all active:scale-95 disabled:opacity-80 flex items-center justify-center gap-3"
                                style={{
                                    background: processing ? 'rgba(139,92,246,0.5)' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
                                    boxShadow: processing ? 'none' : '0 8px 24px rgba(139,92,246,0.4)',
                                    color: 'white'
                                }}
                            >
                                {processing ? 'Opening Gateway...' : <>💳 Open Gateway (Pay ₹{selectedPkg?.price})</>}
                            </button>
                            <p className="text-center text-white/25 text-xs mt-6 uppercase tracking-widest font-bold">Safe • Encrypted • SSL</p>
                        </div>
                    </div>
                )}

                {/* ===== STEP 3: SUCCESS ===== */}
                {step === 'success' && (
                    <div className="rounded-3xl overflow-hidden text-center py-12 px-8"
                        style={{ background: 'linear-gradient(160deg, #064e3b 0%, #0f0d1e 100%)', border: '1px solid rgba(52,211,153,0.25)' }}>
                        <div className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center text-5xl animate-bounce"
                            style={{ background: 'rgba(52,211,153,0.15)', border: '2px solid rgba(52,211,153,0.4)' }}>
                            🎉
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2">Payment Successful!</h2>
                        <p className="text-green-300 font-semibold text-lg mb-1">+{selectedPkg?.coins.toLocaleString()} Coins Added!</p>
                        <p className="text-white/40 text-sm mb-8">Your wallet has been updated</p>
                        <button
                            onClick={handleClose}
                            className="px-10 py-3.5 rounded-2xl font-black text-sm tracking-widest transition-all hover:scale-105 active:scale-95"
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 8px 24px rgba(16,185,129,0.35)', color: 'white' }}
                        >
                            AWESOME! ✨
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CoinStoreModal;
