const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============ SIGNUP ============
// Register a new user with email & password
router.post('/signup', async (req, res) => {
  try {
    const { email, password, username, gender, birthdate } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email (no verification email sent)
      user_metadata: {
        username: username || email.split('@')[0],
        gender: gender || null,
        birthdate: birthdate || null
      }
    });

    if (authError) {
      console.error('[Auth Signup] Supabase auth error:', authError);
      // Handle duplicate email
      if (authError.message?.includes('already been registered') || authError.message?.includes('already exists')) {
        return res.status(409).json({ error: 'This email is already registered. Please login instead.' });
      }
      return res.status(400).json({ error: authError.message });
    }

    const userId = authData.user.id;

    // 2. Create profile in profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        username: username || email.split('@')[0],
        gender: gender || null,
        birthdate: birthdate || null,
        coins: 10, // Welcome bonus: 10 free coins
        is_premium: false,
        created_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('[Auth Signup] Profile creation error:', profileError);
      // User was created in auth but profile failed - still return success
      // Profile will be created on first login via frontend fallback
    }

    // 3. Log welcome bonus transaction
    if (!profileError) {
      await supabase.from('coin_transactions').insert({
        user_id: userId,
        transaction_type: 'earned',
        coins_amount: 10,
        coins_balance_after: 10,
        description: 'Welcome bonus - New account signup',
        payment_status: 'completed',
        metadata: { source: 'signup_bonus' }
      }).catch(() => {}); // Non-critical, ignore errors
    }

    console.log(`[Auth Signup] New user created: ${email} (ID: ${userId})`);

    // 4. Generate session tokens for the new user (auto-login after signup)
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (sessionError) {
      // User created but session failed - they can login manually
      console.warn('[Auth Signup] Auto-login failed:', sessionError.message);
      return res.status(201).json({
        success: true,
        message: 'Account created successfully. Please login.',
        user: {
          id: userId,
          email: email,
          username: username || email.split('@')[0]
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: userId,
        email: email,
        username: username || email.split('@')[0],
        gender: gender || null,
        coins: 10
      },
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_at: sessionData.session.expires_at,
        token_type: 'Bearer'
      }
    });

  } catch (error) {
    console.error('[Auth Signup] Server error:', error);
    res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});


// ============ LOGIN ============
// Login with email & password, returns session tokens
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // 1. Sign in with Supabase Auth
    const { data: sessionData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      console.error('[Auth Login] Login failed:', authError.message);
      if (authError.message?.includes('Invalid login credentials')) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      if (authError.message?.includes('Email not confirmed')) {
        return res.status(403).json({ error: 'Email not verified. Please check your inbox.' });
      }
      return res.status(401).json({ error: authError.message });
    }

    const userId = sessionData.user.id;

    // 2. Fetch user profile from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username, gender, birthdate, avatar_url, coins, is_premium, subscription_tier, is_blocked, ban_expiry, ban_reason, strike_count')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.warn('[Auth Login] Profile fetch failed:', profileError.message);
    }

    // 3. Check if user is blocked/banned
    if (profile?.is_blocked) {
      // Check if it's a temporary ban that has expired
      if (profile.ban_expiry && new Date(profile.ban_expiry) < new Date()) {
        // Ban expired, unblock the user
        await supabase.from('profiles').update({
          is_blocked: false,
          ban_expiry: null,
          ban_reason: null
        }).eq('id', userId);
      } else {
        return res.status(403).json({
          error: 'Account suspended',
          reason: profile.ban_reason || 'Your account has been suspended due to policy violations.',
          ban_expiry: profile.ban_expiry || null,
          is_permanent: !profile.ban_expiry
        });
      }
    }

    console.log(`[Auth Login] User logged in: ${email} (ID: ${userId})`);

    res.json({
      success: true,
      user: {
        id: userId,
        email: email,
        username: profile?.username || email.split('@')[0],
        gender: profile?.gender || null,
        birthdate: profile?.birthdate || null,
        avatar_url: profile?.avatar_url || null,
        coins: profile?.coins || 0,
        is_premium: profile?.is_premium || false,
        subscription_tier: profile?.subscription_tier || 'free',
        strike_count: profile?.strike_count || 0
      },
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_at: sessionData.session.expires_at,
        token_type: 'Bearer'
      }
    });

  } catch (error) {
    console.error('[Auth Login] Server error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});


// ============ GUEST LOGIN ============
// Quick anonymous login - no email/password needed
router.post('/guest', async (req, res) => {
  try {
    const { deviceId, name } = req.body;

    // 1. Create anonymous user in Supabase Auth
    // We use a generated email pattern for anonymous users
    const guestEmail = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}@strangy.guest`;
    const guestPassword = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: guestEmail,
      password: guestPassword,
      email_confirm: true,
      user_metadata: {
        is_guest: true,
        device_id: deviceId || null,
        username: name || 'Stranger'
      }
    });

    if (authError) {
      console.error('[Auth Guest] Failed to create guest:', authError);
      return res.status(500).json({ error: 'Failed to create guest account' });
    }

    const userId = authData.user.id;

    // 2. Create minimal profile
    await supabase.from('profiles').upsert({
      id: userId,
      email: guestEmail,
      username: name || 'Stranger',
      is_guest: true,
      coins: 5, // Guests get 5 free coins
      is_premium: false,
      created_at: new Date().toISOString()
    });

    // 3. Generate session
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email: guestEmail,
      password: guestPassword
    });

    if (sessionError) {
      console.error('[Auth Guest] Session creation failed:', sessionError);
      return res.status(500).json({ error: 'Guest session failed' });
    }

    console.log(`[Auth Guest] Guest user created: ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Guest account created',
      user: {
        id: userId,
        username: name || 'Stranger',
        is_guest: true,
        coins: 5
      },
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_at: sessionData.session.expires_at,
        token_type: 'Bearer'
      }
    });

  } catch (error) {
    console.error('[Auth Guest] Server error:', error);
    res.status(500).json({ error: 'Failed to create guest account' });
  }
});


// ============ REFRESH TOKEN ============
// Refresh an expired access token using the refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'refresh_token is required' });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error) {
      console.error('[Auth Refresh] Token refresh failed:', error.message);
      return res.status(401).json({ error: 'Session expired. Please login again.' });
    }

    console.log(`[Auth Refresh] Token refreshed for user: ${data.user.id}`);

    res.json({
      success: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        token_type: 'Bearer'
      }
    });

  } catch (error) {
    console.error('[Auth Refresh] Server error:', error);
    res.status(500).json({ error: 'Failed to refresh session' });
  }
});


// ============ LOGOUT ============
// Invalidate the user's current session
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(400).json({ error: 'Authorization header required' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(400).json({ error: 'Invalid token format' });
    }

    // Get user from token first
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      // Token already invalid/expired - that's fine, user is effectively logged out
      return res.json({ success: true, message: 'Already logged out' });
    }

    // Sign out user (invalidate all sessions for this user)
    const { error: signOutError } = await supabase.auth.admin.signOut(token);

    if (signOutError) {
      console.warn('[Auth Logout] SignOut error:', signOutError.message);
      // Non-critical - token will expire on its own
    }

    console.log(`[Auth Logout] User logged out: ${user.id}`);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('[Auth Logout] Server error:', error);
    // Even on error, respond with success - client should clear local tokens
    res.json({ success: true, message: 'Logged out' });
  }
});


// ============ GET CURRENT USER ============
// Verify token and return current user data (useful for app startup)
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    // 1. Verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token. Please login again.' });
    }

    // 2. Fetch full profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username, gender, birthdate, avatar_url, coins, is_premium, subscription_tier, subscription_status, subscription_expires_at, is_blocked, ban_expiry, strike_count, total_coins_purchased, total_coins_spent')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.warn('[Auth Me] Profile not found for user:', user.id);
    }

    // 3. Check subscription expiry
    if (profile?.is_premium && profile?.subscription_expires_at) {
      const expiresAt = new Date(profile.subscription_expires_at);
      if (expiresAt < new Date()) {
        // Subscription expired - downgrade
        await supabase.from('profiles').update({
          is_premium: false,
          subscription_status: 'expired',
          subscription_tier: 'free'
        }).eq('id', user.id);

        profile.is_premium = false;
        profile.subscription_status = 'expired';
        profile.subscription_tier = 'free';
      }
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: profile?.username || user.email?.split('@')[0],
        gender: profile?.gender || null,
        birthdate: profile?.birthdate || null,
        avatar_url: profile?.avatar_url || null,
        coins: profile?.coins || 0,
        is_premium: profile?.is_premium || false,
        subscription_tier: profile?.subscription_tier || 'free',
        subscription_status: profile?.subscription_status || 'inactive',
        subscription_expires_at: profile?.subscription_expires_at || null,
        strike_count: profile?.strike_count || 0,
        is_blocked: profile?.is_blocked || false,
        total_coins_purchased: profile?.total_coins_purchased || 0,
        total_coins_spent: profile?.total_coins_spent || 0
      }
    });

  } catch (error) {
    console.error('[Auth Me] Server error:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});


// ============ FORGOT PASSWORD ============
// Send password reset email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL || 'https://strangy.in'}/reset-password`
    });

    if (error) {
      console.error('[Auth ForgotPassword] Error:', error.message);
      // Don't reveal if email exists or not (security)
    }

    // Always return success (security: don't reveal if email exists)
    res.json({
      success: true,
      message: 'If this email is registered, you will receive a password reset link.'
    });

  } catch (error) {
    console.error('[Auth ForgotPassword] Server error:', error);
    res.status(500).json({ error: 'Failed to send reset email' });
  }
});


module.exports = router;
