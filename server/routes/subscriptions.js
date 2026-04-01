const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Razorpay integration removed (no active account)
const razorpay = null;

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

// Create subscription order (DISABLED)
router.post('/subscribe/create-order', async (req, res) => {
  return res.status(403).json({ error: 'Subscriptions are currently disabled. Please contact support.' });
});

// Verify subscription payment and activate (DISABLED)
router.post('/subscribe/verify', async (req, res) => {
  return res.status(403).json({ error: 'Subscriptions are currently disabled.' });
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
