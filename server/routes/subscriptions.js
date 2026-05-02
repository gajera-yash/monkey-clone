const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const Razorpay = require('razorpay');
const crypto = require('crypto');

// Get all subscription plans
router.get('/plans', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    
    if (error) throw error;
    
    res.json({ plans: data });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// Create subscription order
router.post('/subscribe/create-order', async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return res.status(500).json({
            error: 'Payment gateway not configured',
            message: 'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required on server.'
        });
    }

    const { userId, planId, billingPeriod } = req.body;
    
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();
      
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    
    const amount = billingPeriod === 'yearly' ? plan.price_yearly_inr : plan.price_monthly_inr;
    const amountInPaise = Math.round(amount * 100);

    if (amountInPaise < 100) {
        return res.status(400).json({ error: 'Amount must be at least 100 paise' });
    }

    const razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const receipt = `sub_${Date.now()}_${userId.substring(0, 6)}`;
    
    const order = await razorpayInstance.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: receipt
    });

    res.json({
        orderId: order.id,
        amount: amount,
        currency: "INR"
    });

  } catch (error) {
    console.error('Error creating subscription order:', error);
    res.status(500).json({ error: 'Failed to create subscription order' });
  }
});

// Verify subscription payment and activate
router.post('/subscribe/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, planId, billingPeriod } = req.body;

    if (!process.env.RAZORPAY_KEY_SECRET) {
        return res.status(500).json({
            success: false,
            error: 'Payment gateway not configured',
            message: 'RAZORPAY_KEY_SECRET is required on server.'
        });
    }
    
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false, error: 'Signature mismatch' });
    }
    
    // Prevent double processing
    const { data: existingTx } = await supabase
        .from('transactions')
        .select('*')
        .eq('metadata->>order_id', razorpay_order_id)
        .single();
        
    if (existingTx) {
        return res.json({ success: true, message: 'Already verified' });
    }

    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    const amount = billingPeriod === 'yearly' ? plan.price_yearly_inr : plan.price_monthly_inr;

    // Calculate expiration
    const expiry = new Date();
    if (billingPeriod === 'yearly') {
        expiry.setFullYear(expiry.getFullYear() + 1);
    } else {
        expiry.setMonth(expiry.getMonth() + 1);
    }

    // Activate Subscription
    await supabase
      .from('profiles')
      .update({
        is_premium: true,
        subscription_tier: plan.tier_level,
        subscription_status: 'active',
        subscription_expires_at: expiry.toISOString(),
        subscription_auto_renew: true
      })
      .eq('id', userId);

    // Record into global transactions table for Revenue Admin Panel
    await supabase
        .from('transactions')
        .insert({
            user_id: userId,
            type: 'subscription',
            amount: amount,
            metadata: {
                payment_gateway: 'razorpay',
                order_id: razorpay_order_id,
                payment_id: razorpay_payment_id,
                plan: plan.name,
                billing: billingPeriod
            }
        });

    res.json({
        success: true,
        tier: plan.tier_level,
        expiresAt: expiry.toISOString()
    });

  } catch (error) {
    console.error('Error verifying subscription:', error);
    res.status(500).json({ error: 'Failed to verify subscription' });
  }
});

// Cancel subscription
router.post('/cancel', async (req, res) => {
  try {
    const { userId } = req.body;
    
    await supabase
      .from('profiles')
      .update({
        subscription_auto_renew: false
      })
      .eq('id', userId);
    
    res.json({
      success: true,
      message: 'Subscription will not renew'
    });
    
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

module.exports = router;
