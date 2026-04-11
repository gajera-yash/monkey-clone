const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============ CASHFREE CONFIG ============
const getCashfreeConfig = () => {
    // Priority 1: Use process.env directly (Railway/Production)
    // Priority 2: Use empty string as fallback
    const appId = (process.env.CASHFREE_APP_ID || '').trim();
    const secretKey = (process.env.CASHFREE_SECRET_KEY || '').trim();
    const env = (process.env.CASHFREE_ENV || 'SANDBOX').trim().toUpperCase();

    const isConfigured = Boolean(appId && secretKey);
    const isTestAppId = appId.startsWith('TEST');
    
    // Safety check: Don't allow PRODUCTION mode with a TEST App ID
    const mode = (env === 'PRODUCTION' && !isTestAppId) ? 'production' : 'sandbox';
    
    if (!isConfigured) {
        console.error('[Cashfree Config] Error: Keys are missing in process.env!');
    }

    const baseUrl = mode === 'production'
        ? 'https://api.cashfree.com/pg/orders'
        : 'https://sandbox.cashfree.com/pg/orders';

    return {
        appId,
        secretKey,
        env,
        mode,
        isConfigured,
        isTestAppId,
        baseUrl
    };
};

const getCashfreeHeaders = (cashfreeConfig) => {
    return {
        'x-client-id': cashfreeConfig.appId,
        'x-client-secret': cashfreeConfig.secretKey,
        'x-api-version': '2023-08-01',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
};

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

// ============ PURCHASE COINS ============

// Create Cashfree order for coin purchase
router.post('/purchase/create-order', async (req, res) => {
  try {
    const cashfreeConfig = getCashfreeConfig();
    if (!cashfreeConfig.isConfigured) {
        return res.status(500).json({
            error: 'Payment gateway not configured',
            message: 'CASHFREE_APP_ID and CASHFREE_SECRET_KEY are required on server.'
        });
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
        console.error('[Coins] Invalid order amount:', orderAmount, 'Package:', pkg);
        return res.status(400).json({ error: 'Invalid package price configuration' });
    }

    const { data: user } = await supabase
      .from('profiles')
      .select('email, phone, username')
      .eq('id', userId)
      .single();

    const orderId = `order_${Date.now()}_${userId.substring(0, 6)}`;
    
    const requestBody = {
        order_amount: Number(orderAmount),
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

    console.log('[Coins] Creating Cashfree order:', {
        orderId,
        amount: orderAmount,
        env: cashfreeConfig.env,
        mode: cashfreeConfig.mode
    });

    const response = await fetch(cashfreeConfig.baseUrl, {
        method: 'POST',
        headers: getCashfreeHeaders(cashfreeConfig),
        body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    
    if (!response.ok) {
        console.error("Cashfree Order Error:", JSON.stringify(data));
        const isAuthError = /auth|unauthor|credential|forbidden|key/i.test(JSON.stringify(data || {}));
        return res.status(500).json({ 
            error: 'Payment gateway error', 
            details: data,
            message: isAuthError
                ? 'Cashfree authentication failed. Check CASHFREE_APP_ID / CASHFREE_SECRET_KEY and CASHFREE_ENV.'
                : (data?.message || 'Cashfree rejected the order. Please retry.')
        });
    }

    res.json({
        orderId: data.order_id,
        paymentSessionId: data.payment_session_id,
        amount: orderAmount,
        currency: "INR",
        cashfreeMode: cashfreeConfig.mode
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order', message: error.message });
  }
});

// Verify payment and add coins
router.post('/purchase/verify', async (req, res) => {
  try {
    const { orderId, userId, packageId } = req.body;

    const cashfreeConfig = getCashfreeConfig();
    if (!cashfreeConfig.isConfigured) {
        return res.status(500).json({
            success: false,
            error: 'Payment gateway not configured',
            message: 'CASHFREE_APP_ID and CASHFREE_SECRET_KEY are required on server.'
        });
    }
    
    const response = await fetch(`${cashfreeConfig.baseUrl}/${orderId}`, {
        method: 'GET',
        headers: getCashfreeHeaders(cashfreeConfig)
    });
    
    let orderStat;
    try {
        orderStat = await response.json();
    } catch (parseError) {
        console.error('[Cashfree Verify] Failed to parse response as JSON:', parseError);
        return res.status(500).json({ 
            success: false, 
            error: 'Gateway Communication Error', 
            message: 'Failed to parse response from Cashfree.' 
        });
    }

    if (!response.ok) {
        console.error('[Cashfree Verify] Gateway Error Response:', JSON.stringify(orderStat));
        const isAuthError = /auth|unauthor|credential|forbidden|key/i.test(JSON.stringify(orderStat || {}));
        return res.status(response.status || 500).json({
            success: false,
            error: 'Failed to verify payment',
            message: isAuthError
                ? 'Cashfree authentication failed during verification.'
                : (orderStat?.message || 'Unable to verify payment status with gateway.'),
            details: orderStat
        });
    }
    
    console.log(`[Cashfree Verify] Order ${orderId} status: ${orderStat.order_status}`);
    
    if (orderStat.order_status !== 'PAID') {
        return res.status(400).json({ success: false, error: 'Payment not successful' });
    }
    
    // Prevent double crediting
    const { data: existingTx } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('metadata->>orderId', orderId)
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
        console.error('[Cashfree Verify] Package not found:', pkgError);
        return res.status(404).json({ success: false, error: 'Package not found' });
    }

    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('coins, total_coins_purchased')
      .eq('id', userId)
      .single();

    if (userError || !user) {
        console.error('[Cashfree Verify] User not found:', userError);
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
        total_coins_purchased: newTotalPurchased,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
        console.error('[Cashfree Verify] Profile update failed:', updateError);
        return res.status(500).json({ success: false, error: 'Failed to update user wallet' });
    }

    const { error: txError } = await supabase
      .from('coin_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'purchased',
        coins_amount: pkgCoins,
        coins_balance_after: newCoins,
        description: `Purchased ${pkg.name}`,
        payment_status: 'completed',
        metadata: {
            orderId: orderId,
            gateway: 'cashfree',
            amount_paid: pkgPrice
        }
      });

    if (txError) {
        console.error('[Cashfree Verify] Transaction log failed:', txError);
        // We continue because the coins were already added, but we log the error
    }
      
    await supabase
        .from('transactions')
        .insert({
            user_id: userId,
            type: 'coins',
            amount: pkgPrice,
            status: 'success',
            metadata: {
                payment_gateway: 'cashfree',
                order_id: orderId,
                package: pkg.name
            }
        });

    res.json({
        success: true,
        coinsAdded: pkgCoins,
        newBalance: newCoins
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
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
