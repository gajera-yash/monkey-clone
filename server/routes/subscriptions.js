const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

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
    
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    
    const amount = billingPeriod === 'yearly' 
      ? plan.price_yearly_inr 
      : plan.price_monthly_inr;
    
    const options = {
      amount: amount * 100,
      currency: 'INR',
      receipt: `sub_${userId}_${Date.now()}`,
      notes: {
        userId: userId,
        planId: planId,
        tier: plan.tier,
        billingPeriod: billingPeriod
      }
    };
    
    const order = await razorpay.orders.create(options);
    
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      planDetails: plan
    });
    
  } catch (error) {
    console.error('Error creating subscription order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Verify subscription payment and activate
router.post('/subscribe/verify', async (req, res) => {
  try {
    const {
      orderId,
      paymentId,
      signature,
      userId,
      planId,
      billingPeriod
    } = req.body;
    
    // Verify signature
    const text = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
    
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();
    
    const startDate = new Date();
    const endDate = new Date();
    
    if (billingPeriod === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }
    
    // Update user subscription
    await supabase
      .from('profiles')
      .update({
        subscription_tier: plan.tier,
        subscription_status: 'active',
        subscription_start_date: startDate.toISOString(),
        subscription_end_date: endDate.toISOString(),
        subscription_auto_renew: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    // Add monthly coins immediately
    const { data: user } = await supabase
      .from('profiles')
      .select('coins')
      .eq('id', userId)
      .single();
    
    const newCoins = (user.coins || 0) + plan.coins_per_month;
    
    await supabase
      .from('profiles')
      .update({ coins: newCoins })
      .eq('id', userId);
    
    await supabase
      .from('coin_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'bonus',
        coins_amount: plan.coins_per_month,
        coins_balance_after: newCoins,
        description: `${plan.name} subscription bonus`,
        payment_status: 'completed'
      });
    
    // Record subscription transaction
    await supabase
      .from('subscription_transactions')
      .insert({
        user_id: userId,
        subscription_plan_id: planId,
        tier: plan.tier,
        amount_paid: billingPeriod === 'yearly' 
          ? plan.price_yearly_inr 
          : plan.price_monthly_inr,
        billing_period: billingPeriod,
        payment_id: paymentId,
        payment_status: 'completed',
        subscription_start_date: startDate.toISOString(),
        subscription_end_date: endDate.toISOString(),
        auto_renew: true,
        metadata: {
          order_id: orderId,
          coins_granted: plan.coins_per_month
        }
      });
    
    res.json({
      success: true,
      tier: plan.tier,
      endDate: endDate,
      coinsAdded: plan.coins_per_month
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
