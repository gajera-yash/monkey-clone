import React, { useState, useEffect } from 'react';
import { Coins, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CoinStore({ userId, onClose }) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userCoins, setUserCoins] = useState(0);
  
  useEffect(() => {
    fetchPackages();
    fetchUserCoins();
  }, [userId]);
  
  async function fetchPackages() {
    try {
      const res = await fetch('/api/coins/packages');
      const data = await res.json();
      setPackages(data.packages || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error("Failed to load coin packages");
    }
  }
  
  async function fetchUserCoins() {
    if (!userId) return;
    try {
      const res = await fetch(`/api/coins/balance/${userId}`);
      const data = await res.json();
      setUserCoins(data.balance || 0);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  }
  
  async function handlePurchase(packageItem) {
    setLoading(true);
    
    try {
      // Create order
      const orderRes = await fetch('/api/coins/purchase/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          packageId: packageItem.id
        })
      });
      
      const orderData = await orderRes.json();
      
      if (!orderData.orderId) throw new Error("Failed to create order");

      // Initialize Razorpay
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_placeholder', // Should be in env
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Strangy',
        description: `${packageItem.coins} Coins`,
        order_id: orderData.orderId,
        handler: async function(response) {
          // Verify payment
          const verifyRes = await fetch('/api/coins/purchase/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: orderData.orderId,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              userId: userId,
              packageId: packageItem.id
            })
          });
          
          const verifyData = await verifyRes.json();
          
          if (verifyData.success) {
            toast.success(`Successfully added ${verifyData.coinsAdded} coins!`);
            fetchUserCoins();
            if (onClose) onClose();
          } else {
            toast.error("Payment verification failed");
          }
        },
        prefill: {
            name: "User",
            email: "user@example.com"
        },
        theme: {
          color: '#6366f1'
        },
        modal: {
            ondismiss: function() {
                setLoading(false);
            }
        }
      };
      
      const razorpay = new window.Razorpay(options);
      razorpay.open();
      
    } catch (error) {
      console.error('Error purchasing coins:', error);
      toast.error('Purchase failed. Please try again.');
      setLoading(false);
    }
  }
  
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[999] p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[40px] max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-indigo-500/10 border border-slate-100 flex flex-col">
        <div className="p-8 border-b border-slate-50 sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">Coin Store</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
                <p className="text-slate-500 font-bold text-sm">Your balance: <span className="text-indigo-600">{userCoins} coins</span></p>
              </div>
            </div>
            <button onClick={onClose} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-2xl transition-all active:scale-95">
              <X size={24} />
            </button>
          </div>
        </div>
        
        <div className="p-8 lg:p-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative group border-2 rounded-[32px] p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                  pkg.is_popular ? 'border-indigo-500 bg-indigo-50/30' : 
                  pkg.is_best_value ? 'border-amber-400 bg-amber-50/30' : 
                  'border-slate-100 hover:border-indigo-100'
                }`}
              >
                {pkg.is_popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20">
                    Most Popular
                  </div>
                )}
                
                {pkg.is_best_value && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-amber-500 text-white px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20">
                    Best Value
                  </div>
                )}
                
                <div className="text-center">
                  <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-500 ${
                    pkg.is_popular ? 'bg-indigo-100 text-indigo-600' : 
                    pkg.is_best_value ? 'bg-amber-100 text-amber-600' : 
                    'bg-slate-50 text-slate-400'
                  }`}>
                    <Coins size={40} strokeWidth={2.5} />
                  </div>
                  
                  <h3 className="text-lg font-black text-slate-800 mb-1">{pkg.name}</h3>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="text-4xl font-black text-slate-900 tracking-tighter">
                      {pkg.coins}
                    </span>
                    <span className="text-xs font-black uppercase text-slate-400 tracking-widest">coins</span>
                  </div>
                  
                  {pkg.discount_percentage > 0 && (
                    <div className="inline-block bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider mb-6">
                      Save {pkg.discount_percentage}%
                    </div>
                  )}
                  
                  <div className="text-2xl font-black text-slate-800 mb-1">
                    ₹{pkg.price_inr}
                  </div>
                  
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">
                    ₹{(pkg.price_inr / pkg.coins).toFixed(2)} / coin
                  </div>
                  
                  <button
                    onClick={() => handlePurchase(pkg)}
                    disabled={loading}
                    className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[2px] transition-all active:scale-95 shadow-lg ${
                      pkg.is_popular ? 'bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-700' : 
                      pkg.is_best_value ? 'bg-amber-500 text-white shadow-amber-500/20 hover:bg-amber-600' : 
                      'bg-slate-900 text-white shadow-slate-900/20 hover:bg-black'
                    } disabled:opacity-50 disabled:scale-100`}
                  >
                    {loading ? 'Processing...' : 'Buy Now'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-12 p-6 bg-slate-50 rounded-[24px] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm border border-slate-100">
                <Coins size={24} />
              </div>
              <div>
                <h4 className="font-black text-slate-800 text-sm">Safe & Secure Payments</h4>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Trusted by 1M+ users worldwide</p>
              </div>
            </div>
            <div className="flex gap-4 opacity-50 grayscale hover:grayscale-0 transition-all">
                <span className="font-black text-xs uppercase tracking-widest text-slate-400">Razorpay</span>
                <span className="font-black text-xs uppercase tracking-widest text-slate-400">SSL</span>
                <span className="font-black text-xs uppercase tracking-widest text-slate-400">256-BIT</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
