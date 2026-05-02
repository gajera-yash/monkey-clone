import React, { useState, useEffect } from 'react';
import { Check, Crown, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { loadRazorpay } from '../../utils/loadRazorpay';

export default function SubscriptionPlans({ userId, onClose }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  
  useEffect(() => {
    fetchPlans();
  }, []);
  
  async function fetchPlans() {
    try {
      const res = await fetch('/api/subscriptions/plans');
      const data = await res.json();
      setPlans(data.plans || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error("Failed to load subscription plans");
    }
  }
  
  async function handleSubscribe(plan) {
    setLoading(true);
    
    try {
      const orderRes = await fetch('/api/subscriptions/subscribe/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          planId: plan.id,
          billingPeriod: billingPeriod
        })
      });
      
      const orderData = await orderRes.json();
      
      if (!orderData.orderId) throw new Error("Failed to create order");
      
      const resLoad = await loadRazorpay();
      if (!resLoad) {
          throw new Error('Razorpay SDK failed to load. Are you online?');
      }

      const options = {
          key: process.env.REACT_APP_RAZORPAY_KEY_ID,
          amount: orderData.amount * 100, // assuming backend sent amount in INR, but wait, let's verify what backend sends
          // Actually, backend sends amount in INR. Razorpay expects paise in options.amount but order is already created with paise.
          // In coins.js we passed orderData.amount which was in Paise. Wait, let's check what backend sends.
          // The backend sends: amount: amount (which is in INR).
          // We must pass amount * 100 to Razorpay options if it's not strictly necessary since order_id binds the amount.
          currency: orderData.currency,
          name: "Strangy",
          description: `Subscription: ${plan.name}`,
          order_id: orderData.orderId,
          theme: {
              color: "#8b5cf6"
          },
          handler: async function (response) {
              try {
                  const verifyRes = await fetch('/api/subscriptions/subscribe/verify', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                          razorpay_order_id: response.razorpay_order_id,
                          razorpay_payment_id: response.razorpay_payment_id,
                          razorpay_signature: response.razorpay_signature,
                          userId: userId,
                          planId: plan.id,
                          billingPeriod: billingPeriod
                      })
                  });
                  
                  const verifyData = await verifyRes.json();
                  
                  if (verifyData.success) {
                      toast.success(`Welcome to ${plan.name}!`);
                      if (onClose) onClose();
                  } else {
                      toast.error("Subscription verification failed");
                  }
              } catch (verifyErr) {
                  console.error('Verification Error:', verifyErr);
                  toast.error("Subscription verification failed");
              } finally {
                  setLoading(false);
              }
          },
          modal: {
              ondismiss: function() {
                  toast.error("Subscription cancelled");
                  setLoading(false);
              }
          }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.on('payment.failed', function (response) {
          toast.error(response.error.description || "Payment failed");
          setLoading(false);
      });
      paymentObject.open();
      
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error('Subscription failed. Please try again.');
      setLoading(false);
    }
  }
  
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[999] p-4 animate-in fade-in duration-500">
      <div className="bg-white rounded-[40px] max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-[0_0_100px_rgba(139,92,246,0.1)] border border-slate-100 flex flex-col">
        <div className="p-8 border-b border-slate-50 sticky top-0 bg-white/90 backdrop-blur-xl z-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h2 className="text-4xl font-black text-slate-800 tracking-tight text-center md:text-left">Unlock Premium</h2>
              <p className="text-slate-500 font-bold text-sm text-center md:text-left mt-1">Choose the plan that fits your vibe</p>
            </div>
            
            <div className="flex items-center gap-6">
                <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
                    <button
                        onClick={() => setBillingPeriod('monthly')}
                        className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                        billingPeriod === 'monthly' 
                            ? 'bg-white text-indigo-600 shadow-sm' 
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBillingPeriod('yearly')}
                        className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${
                        billingPeriod === 'yearly' 
                            ? 'bg-white text-indigo-600 shadow-sm' 
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        Yearly
                        <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-md text-[8px] animate-pulse">Save 17%</span>
                    </button>
                </div>
                
                <button onClick={onClose} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-2xl transition-all active:scale-95 border border-slate-100">
                    <X size={24} />
                </button>
            </div>
          </div>
        </div>
        
        <div className="p-8 lg:p-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan, index) => (
              <div
                key={plan.id}
                className={`relative group border-2 rounded-[40px] p-10 transition-all duration-500 flex flex-col ${
                  index === 1 
                    ? 'border-indigo-500 bg-indigo-50/20 shadow-2xl shadow-indigo-500/10 scale-105 md:z-10' 
                    : 'border-slate-100 hover:border-indigo-100 hover:shadow-xl'
                }`}
              >
                {index === 1 && (
                  <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[2px] shadow-xl shadow-indigo-600/30">
                    Recommended
                  </div>
                )}
                
                <div className="text-center mb-10">
                  <div className={`w-20 h-20 mx-auto rounded-[28px] flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-500 ${
                    index === 0 ? 'bg-slate-100 text-slate-500' : 
                    index === 1 ? 'bg-indigo-100 text-indigo-600' : 
                    'bg-amber-100 text-amber-500'
                  }`}>
                    <Crown size={40} strokeWidth={2.5} />
                  </div>
                  
                  <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">{plan.name}</h3>
                  
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-black text-slate-900 tracking-tighter">
                        ₹{billingPeriod === 'yearly' 
                        ? Math.round(plan.price_yearly_inr / 12) 
                        : plan.price_monthly_inr}
                    </span>
                    <span className="text-xs font-black uppercase text-slate-400 tracking-widest">/mo</span>
                  </div>
                  
                  {billingPeriod === 'yearly' && (
                    <div className="text-[10px] font-black text-emerald-600 mt-2 uppercase tracking-wider bg-emerald-50 inline-block px-3 py-1 rounded-lg">
                      Billed ₹{plan.price_yearly_inr} yearly
                    </div>
                  )}
                </div>
                
                <div className="space-y-4 mb-10 flex-1">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3 bg-white/50 p-3 rounded-2xl border border-slate-50">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={12} strokeWidth={4} />
                      </div>
                      <span className="text-sm font-bold text-slate-600">{feature}</span>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={loading}
                  className={`w-full py-5 rounded-[24px] font-black text-xs uppercase tracking-[3px] transition-all active:scale-95 shadow-xl ${
                    index === 1 
                      ? 'bg-indigo-600 text-white shadow-indigo-600/30 hover:bg-indigo-700' 
                      : 'bg-slate-900 text-white shadow-slate-900/30 hover:bg-black'
                  } disabled:opacity-50 disabled:scale-100`}
                >
                  {loading ? 'Activating...' : 'Select Plan'}
                </button>
              </div>
            ))}
          </div>
          
          <div className="mt-16 text-center">
            <p className="text-xs font-black text-slate-400 uppercase tracking-[4px]">Verified Security</p>
            <div className="flex items-center justify-center gap-8 mt-6 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all cursor-default">
              <span className="font-black text-sm tracking-tighter">RAZORPAY</span>
              <span className="font-black text-sm tracking-tighter">MASTERCARD</span>
              <span className="font-black text-sm tracking-tighter">VISA</span>
              <span className="font-black text-sm tracking-tighter">UPI</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
