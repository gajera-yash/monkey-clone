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

// ============ COIN PACKAGES ============

// Get all coin packages
router.get('/packages', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('coin_packages')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    
    if (error) throw error;
    
    res.json({ packages: data });
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// ============ PURCHASE COINS ============

// Create Razorpay order for coin purchase (DISABLED)
router.post('/purchase/create-order', async (req, res) => {
  return res.status(403).json({ error: 'Payments are currently disabled. Please contact support.' });
});

// Verify payment and add coins (DISABLED)
router.post('/purchase/verify', async (req, res) => {
  return res.status(403).json({ error: 'Payments are currently disabled.' });
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
        total_coins_spent: newTotalSpent,
        updated_at: new Date().toISOString()
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
        coins: newCoins,
        updated_at: new Date().toISOString()
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
