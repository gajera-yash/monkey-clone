const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============ CASHFREE CONFIG ============
const getCashfreeHeaders = () => {
    return {
        'x-client-id': process.env.CASHFREE_APP_ID || "TEST110318160b1c0d9b14535af06f5e61813011",
        'x-client-secret': process.env.CASHFREE_SECRET_KEY || "cfsk_ma_test_7f8dc4850ce067d9694c1355c45b9609_",
        'x-api-version': '2023-08-01',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
};

const getCashfreeUrl = () => {
    const appId = process.env.CASHFREE_APP_ID || "TEST110318160b1c0d9b14535af06f5e61813011";
    if (appId.startsWith("TEST")) {
        return 'https://sandbox.cashfree.com/pg/orders';
    }
    return process.env.CASHFREE_ENV === 'PRODUCTION' ? 
        'https://api.cashfree.com/pg/orders' : 
        'https://sandbox.cashfree.com/pg/orders';
};

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
    const { userId, planId, billingPeriod } = req.body;
    
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();
      
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    
    const amount = billingPeriod === 'yearly' ? plan.price_yearly_inr : plan.price_monthly_inr;
    
    const { data: user } = await supabase
      .from('profiles')
      .select('email, phone, username')
      .eq('id', userId)
      .single();

    const orderId = `sub_${Date.now()}_${userId.substring(0, 6)}`;
    
    const requestBody = {
        order_amount: amount,
        order_currency: "INR",
        order_id: orderId,
        customer_details: {
            customer_id: userId,
            customer_phone: user?.phone || "9999999999",
            customer_email: user?.email || "customer@strangy.in",
            customer_name: user?.username || "Strangy User"
        },
        order_meta: {
            return_url: "https://strangy.in/chat?order_id={order_id}"
        }
    };

    const response = await fetch(getCashfreeUrl(), {
        method: 'POST',
        headers: getCashfreeHeaders(),
        body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    
    if (!response.ok) {
        console.error("Cashfree Order Error:", data);
        return res.status(500).json({ error: 'Payment gateway error', details: data });
    }

    // Return cashfreeEnv so frontend can dynamically set mode
    const cashfreeEnv = (process.env.CASHFREE_ENV || 'SANDBOX').toUpperCase();
    const activeAppId = process.env.CASHFREE_APP_ID || "TEST110318160b1c0d9b14535af06f5e61813011";

    res.json({
        orderId: data.order_id,
        paymentSessionId: data.payment_session_id,
        amount: amount,
        currency: "INR",
        cashfreeMode: (cashfreeEnv === 'PRODUCTION' && !activeAppId.startsWith("TEST")) ? 'production' : 'sandbox'
    });

  } catch (error) {
    console.error('Error creating subscription order:', error);
    res.status(500).json({ error: 'Failed to create subscription order' });
  }
});

// Verify subscription payment and activate
router.post('/subscribe/verify', async (req, res) => {
  try {
    const { orderId, userId, planId, billingPeriod } = req.body;
    
    const response = await fetch(`${getCashfreeUrl()}/${orderId}`, {
        method: 'GET',
        headers: getCashfreeHeaders()
    });
    
    const orderStat = await response.json();
    
    if (orderStat.order_status !== 'PAID') {
        return res.status(400).json({ success: false, error: 'Payment not successful' });
    }
    
    // Prevent double processing
    const { data: existingTx } = await supabase
        .from('transactions')
        .select('*')
        .eq('metadata->>order_id', orderId)
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
        subscription_auto_renew: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    // Record into global transactions table for Revenue Admin Panel
    await supabase
        .from('transactions')
        .insert({
            user_id: userId,
            type: 'subscription',
            amount: amount,
            status: 'success',
            metadata: {
                payment_gateway: 'cashfree',
                order_id: orderId,
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
        subscription_auto_renew: false,
        updated_at: new Date().toISOString()
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
