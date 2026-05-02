const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);



// ============ RAZORPAY COIN PURCHASE ============

// ============ COIN PACKAGES ============

// Get all coin packages
router.get('/packages', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    
    if (error) throw error;
    
    // Auto-map for frontend consistency
    const packages = data.map(p => ({
        ...p,
        price_inr: p.price_monthly_inr || p.price
    }));
    
    res.json({ packages });
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// ============ RAZORPAY COIN PURCHASE ============

router.post('/purchase/create-order', async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ error: 'Razorpay keys not configured' });
    }

    const { userId, packageId } = req.body;
    
    if (!userId || !packageId) {
        return res.status(400).json({ error: 'userId and packageId are required' });
    }

    const { data: pkg, error: pkgError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', packageId)
      .single();
      
    if (pkgError || !pkg) {
        console.error('[Coins] Package fetch error:', pkgError);
        return res.status(404).json({ error: 'Package not found' });
    }
    
    const orderAmount = pkg.price_monthly_inr || pkg.price || pkg.price_inr;
    
    if (!orderAmount || orderAmount <= 0) {
        return res.status(400).json({ error: 'Invalid package price configuration' });
    }

    const amountInPaise = Math.round(orderAmount * 100);
    if (amountInPaise < 100) {
        return res.status(400).json({ error: 'Amount must be at least 100 paise' });
    }

    const razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const receipt = `receipt_${Date.now()}_${userId.substring(0, 6)}`;
    
    const order = await razorpayInstance.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: receipt
    });

    res.json({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency
    });

  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: 'Failed to create order', message: error.message });
  }
});

router.post('/purchase/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, packageId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId || !packageId) {
        return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ success: false, error: 'Razorpay keys not configured' });
    }

    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpay_signature) {
        console.error('[Razorpay Verify] Signature mismatch!');
        return res.status(400).json({ success: false, error: 'Payment verification failed: Signature mismatch' });
    }

    // Prevent double crediting
    const { data: existingTx } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('payment_id', razorpay_order_id)
        .single();
        
    if (existingTx) {
        return res.json({ success: true, message: 'Already verified' });
    }

    const { data: pkg, error: pkgError } = await supabase
      .from('subscription_plans')
      .select('coins, price_monthly_inr, price, name')
      .eq('id', packageId)
      .single();

    if (pkgError || !pkg) {
        return res.status(404).json({ success: false, error: 'Package not found' });
    }

    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('coins, total_coins_purchased')
      .eq('id', userId)
      .single();

    if (userError || !user) {
        return res.status(404).json({ success: false, error: 'User not found' });
    }

    const pkgCoins = pkg.coins || 0;
    const pkgPrice = pkg.price_monthly_inr || pkg.price || 0;
    const newCoins = (user.coins || 0) + pkgCoins;
    const newTotalPurchased = (user.total_coins_purchased || 0) + pkgCoins;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        coins: newCoins,
        total_coins_purchased: newTotalPurchased
      })
      .eq('id', userId);

    if (updateError) {
        return res.status(500).json({ 
            success: false, 
            error: 'Failed to update user wallet', 
            message: 'Your payment was successful but we encountered an error updating your balance.'
        });
    }

    await supabase
      .from('coin_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'purchase',
        coins_amount: pkgCoins,
        coins_balance_after: newCoins,
        description: `Purchased ${pkg.name}`,
        payment_status: 'completed',
        payment_id: razorpay_order_id,
        metadata: {
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            gateway: 'razorpay',
            amount_paid: pkgPrice
        }
      });

    await supabase
        .from('transactions')
        .insert({
            user_id: userId,
            type: 'coins',
            amount: pkgPrice,
            description: `Purchase of ${pkgCoins} coins bundle`,
            coins_amount: pkgCoins,
            metadata: {
                payment_gateway: 'razorpay',
                order_id: razorpay_order_id,
                payment_id: razorpay_payment_id,
                package: pkg.name
            }
        });

    res.json({
        success: true,
        coinsAdded: pkgCoins,
        newBalance: newCoins
    });

  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    res.status(500).json({ success: false, error: 'Failed to verify payment', message: error.message });
  }
});

// ============ SPEND COINS ============

// Spend coins on feature
router.post('/spend', async (req, res) => {
  try {
    const { userId, featureName, metadata } = req.body;
    
    // Get feature price
    const { data: feature } = await supabase
      .from('feature_prices')
      .select('*')
      .eq('feature_name', featureName)
      .eq('is_active', true)
      .single();
    
    if (!feature) {
      return res.status(404).json({ error: 'Feature not found' });
    }
    
    // Get user coins and subscription
    const { data: user } = await supabase
      .from('profiles')
      .select('coins, total_coins_spent, subscription_tier, subscription_status')
      .eq('id', userId)
      .single();
    
    // Check if user has subscription that includes this feature
    let coinCost = feature.coin_cost;
    let freeWithSubscription = false;
    
    if (user.subscription_status === 'active') {
      // Check subscription benefits
      const freeFeatures = {
        bronze: ['gender_filter'],
        silver: ['gender_filter', 'country_filter', 'rewind'],
        gold: ['gender_filter', 'country_filter', 'rewind', 'interest_match', 
               'invisible_mode', 'no_ads']
      };
      
      if (freeFeatures[user.subscription_tier]?.includes(featureName)) {
        freeWithSubscription = true;
        coinCost = 0;
      } else {
        // Apply subscription discount
        const discounts = { bronze: 0, silver: 0.10, gold: 0.20 };
        coinCost = Math.round(coinCost * (1 - (discounts[user.subscription_tier] || 0)));
      }
    }
    
    // Check if user has enough coins
    if ((user.coins || 0) < coinCost && !freeWithSubscription) {
      return res.status(400).json({ 
        error: 'Insufficient coins',
        required: coinCost,
        available: user.coins || 0
      });
    }
    
    const newCoins = (user.coins || 0) - coinCost;
    const newTotalSpent = (user.total_coins_spent || 0) + coinCost;
    
    // Deduct coins
    await supabase
      .from('profiles')
      .update({
        coins: newCoins,
        total_coins_spent: newTotalSpent
      })
      .eq('id', userId);
    
    // Record transaction
    await supabase
      .from('coin_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'spent',
        coins_amount: -coinCost,
        coins_balance_after: newCoins,
        description: `Used ${feature.feature_display_name}`,
        feature_used: featureName,
        payment_status: 'completed',
        metadata: {
          free_with_subscription: freeWithSubscription,
          original_cost: feature.coin_cost,
          actual_cost: coinCost,
          ...metadata
        }
      });
    
    res.json({
      success: true,
      coinsSpent: coinCost,
      newBalance: newCoins,
      freeWithSubscription
    });
    
  } catch (error) {
    console.error('Error spending coins:', error);
    res.status(500).json({ error: 'Failed to spend coins' });
  }
});

// ============ DAILY LOGIN REWARD ============

router.post('/daily-reward', async (req, res) => {
  try {
    const { userId } = req.body;
    
    const today = new Date().toISOString().split('T')[0];
    
    // Check if already claimed today
    const { data: existing } = await supabase
      .from('daily_coin_rewards')
      .select('*')
      .eq('user_id', userId)
      .eq('reward_date', today)
      .eq('reward_type', 'daily_login')
      .single();
    
    if (existing) {
      return res.json({
        alreadyClaimed: true,
        message: 'Daily reward already claimed'
      });
    }
    
    // Get yesterday's reward for streak calculation
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];
    
    const { data: yesterdayReward } = await supabase
      .from('daily_coin_rewards')
      .select('streak_days')
      .eq('user_id', userId)
      .eq('reward_date', yesterdayDate)
      .eq('reward_type', 'daily_login')
      .single();
    
    const streakDays = yesterdayReward ? yesterdayReward.streak_days + 1 : 1;
    const baseCoins = 5;
    const streakBonus = Math.min(streakDays - 1, 6) * 2; // Max 12 bonus coins
    const totalCoins = baseCoins + streakBonus;
    
    // Get current user coins
    const { data: user } = await supabase
      .from('profiles')
      .select('coins')
      .eq('id', userId)
      .single();
    
    const newCoins = (user.coins || 0) + totalCoins;
    
    // Update user coins
    await supabase
      .from('profiles')
      .update({
        coins: newCoins
      })
      .eq('id', userId);
    
    // Record daily reward
    await supabase
      .from('daily_coin_rewards')
      .insert({
        user_id: userId,
        reward_date: today,
        coins_earned: totalCoins,
        streak_days: streakDays,
        reward_type: 'daily_login'
      });
    
    // Record transaction
    await supabase
      .from('coin_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'earned',
        coins_amount: totalCoins,
        coins_balance_after: newCoins,
        description: `Daily login reward (Day ${streakDays})`,
        payment_status: 'completed',
        metadata: {
          base_coins: baseCoins,
          streak_bonus: streakBonus,
          streak_days: streakDays
        }
      });
    
    res.json({
      success: true,
      coinsEarned: totalCoins,
      breakdown: {
        base: baseCoins,
        streakBonus: streakBonus
      },
      streakDays: streakDays,
      newBalance: newCoins
    });
    
  } catch (error) {
    console.error('Error claiming daily reward:', error);
    res.status(500).json({ error: 'Failed to claim reward' });
  }
});

// ============ GET USER COINS & HISTORY ============

// Get user coin balance and stats
router.get('/balance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { data: user } = await supabase
      .from('profiles')
      .select('coins, total_coins_purchased, total_coins_spent, subscription_tier')
      .eq('id', userId)
      .single();
    
    res.json({
      balance: user.coins || 0,
      totalPurchased: user.total_coins_purchased || 0,
      totalSpent: user.total_coins_spent || 0,
      subscriptionTier: user.subscription_tier || 'free'
    });
    
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// Get transaction history
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const { data, error } = await supabase
      .from('coin_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);
    
    if (error) throw error;
    
    res.json({ transactions: data });
    
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;
