const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ============ AUTH MIDDLEWARE ============
// Verify token and attach user to request
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Invalid token format. Use: Bearer <token>' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token. Please login again.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[Auth Middleware] Error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};


// ============ 1. GET PROFILE ============
// Get any user's public profile by ID
router.get('/profile/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, gender, bio, is_creator, is_verified, is_premium, total_chats, total_hours_online, created_at, last_seen')
      .eq('id', id)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is blocked
    if (profile.account_status === 'banned') {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      profile: {
        id: profile.id,
        username: profile.username || 'Stranger',
        avatar_url: profile.avatar_url || null,
        gender: profile.gender || null,
        bio: profile.bio || null,
        is_creator: profile.is_creator || false,
        is_verified: profile.is_verified || false,
        is_premium: profile.is_premium || false,
        total_chats: profile.total_chats || 0,
        total_hours_online: profile.total_hours_online || 0,
        member_since: profile.created_at,
        last_seen: profile.last_seen || null
      }
    });

  } catch (error) {
    console.error('[User Profile] Server error:', error);
    res.status(500).json({ error: 'Failed to fetch profile', details: error.message });
  }
});


// ============ 2. UPDATE PROFILE ============
// Update own profile (authenticated)
router.put('/profile', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, gender, bio, birthdate, location_city, location_country } = req.body;

    // Build update object (only include provided fields)
    const updateData = {};
    if (username !== undefined) {
      // Validate username
      if (username.length < 2 || username.length > 30) {
        return res.status(400).json({ error: 'Username must be 2-30 characters' });
      }
      if (!/^[a-zA-Z0-9_\s]+$/.test(username)) {
        return res.status(400).json({ error: 'Username can only contain letters, numbers, underscores, and spaces' });
      }
      updateData.username = username.trim();
    }
    if (gender !== undefined) {
      const validGenders = ['Male', 'Female', 'Other'];
      if (!validGenders.includes(gender)) {
        return res.status(400).json({ error: 'Gender must be Male, Female, or Other' });
      }
      updateData.gender = gender;
    }
    if (bio !== undefined) {
      if (bio.length > 200) {
        return res.status(400).json({ error: 'Bio must be under 200 characters' });
      }
      updateData.bio = bio.trim();
    }
    if (birthdate !== undefined) {
      // Validate date format YYYY-MM-DD
      if (birthdate && !/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
        return res.status(400).json({ error: 'Birthdate must be in YYYY-MM-DD format' });
      }
      updateData.birthdate = birthdate;
    }
    if (location_city !== undefined) updateData.location_city = location_city;
    if (location_country !== undefined) updateData.location_country = location_country;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update. Provide at least one field.' });
    }

    // Check if profile is now complete
    const hasMinFields = updateData.username || updateData.gender || updateData.birthdate;
    if (hasMinFields) {
      // Fetch existing profile to check completeness
      const { data: existing } = await supabase
        .from('profiles')
        .select('username, gender, birthdate')
        .eq('id', userId)
        .single();

      const merged = { ...existing, ...updateData };
      if (merged.username && merged.gender && merged.birthdate) {
        updateData.is_profile_completed = true;
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select('username, gender, bio, birthdate, avatar_url, location_city, location_country, is_profile_completed')
      .single();

    if (error) {
      console.error('[User Update] Supabase error:', error);
      return res.status(500).json({ error: 'Failed to update profile', details: error.message });
    }

    console.log(`[User Update] Profile updated for user: ${userId}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: data
    });

  } catch (error) {
    console.error('[User Update] Server error:', error);
    res.status(500).json({ error: 'Failed to update profile', details: error.message });
  }
});


// ============ 3. UPDATE AVATAR ============
// Update avatar URL (authenticated)
router.put('/avatar', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { avatar_url } = req.body;

    if (!avatar_url) {
      return res.status(400).json({ error: 'avatar_url is required' });
    }

    // Basic URL validation
    try {
      new URL(avatar_url);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format for avatar_url' });
    }

    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url })
      .eq('id', userId);

    if (error) {
      console.error('[User Avatar] Supabase error:', error);
      return res.status(500).json({ error: 'Failed to update avatar', details: error.message });
    }

    console.log(`[User Avatar] Avatar updated for user: ${userId}`);

    res.json({
      success: true,
      message: 'Avatar updated successfully',
      avatar_url
    });

  } catch (error) {
    console.error('[User Avatar] Server error:', error);
    res.status(500).json({ error: 'Failed to update avatar', details: error.message });
  }
});


// ============ 4. GET MY STATS ============
// Get own detailed stats (authenticated)
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('coins, stars, total_chats, avg_chat_duration, total_hours_online, total_chat_duration, total_coins_purchased, total_coins_spent, is_premium, subscription_tier, subscription_status, subscription_end_date, reward_streak, last_reward_claim, strike_count, created_at, referral_code')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({
      success: true,
      stats: {
        coins: profile.coins || 0,
        stars: profile.stars || 0,
        total_chats: profile.total_chats || 0,
        avg_chat_duration: profile.avg_chat_duration || 0,
        total_hours_online: profile.total_hours_online || 0,
        total_chat_duration: profile.total_chat_duration || 0,
        total_coins_purchased: profile.total_coins_purchased || 0,
        total_coins_spent: profile.total_coins_spent || 0,
        is_premium: profile.is_premium || false,
        subscription_tier: profile.subscription_tier || 'free',
        subscription_status: profile.subscription_status || 'inactive',
        subscription_expires_at: profile.subscription_end_date || null,
        reward_streak: profile.reward_streak || 0,
        last_reward_claim: profile.last_reward_claim || null,
        strike_count: profile.strike_count || 0,
        referral_code: profile.referral_code || null,
        member_since: profile.created_at
      }
    });

  } catch (error) {
    console.error('[User Stats] Server error:', error);
    res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
  }
});


// ============ 5. BLOCK USER ============
// Block another user (authenticated)
router.post('/block', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { blocked_user_id, reason } = req.body;

    if (!blocked_user_id) {
      return res.status(400).json({ error: 'blocked_user_id is required' });
    }

    if (blocked_user_id === userId) {
      return res.status(400).json({ error: 'You cannot block yourself' });
    }

    // Check if target user exists
    const { data: targetUser, error: targetError } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('id', blocked_user_id)
      .single();

    if (targetError || !targetUser) {
      return res.status(404).json({ error: 'User to block not found' });
    }

    // Check if already blocked
    const { data: existing } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('blocker_id', userId)
      .eq('blocked_id', blocked_user_id)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'User is already blocked' });
    }

    // Insert block record
    const { error: blockError } = await supabase
      .from('blocked_users')
      .insert({
        blocker_id: userId,
        blocked_id: blocked_user_id,
        reason: reason || null,
        created_at: new Date().toISOString()
      });

    if (blockError) {
      console.error('[User Block] Supabase error:', blockError);
      return res.status(500).json({ error: 'Failed to block user', details: blockError.message });
    }

    console.log(`[User Block] ${userId} blocked ${blocked_user_id}`);

    res.json({
      success: true,
      message: `User ${targetUser.username || blocked_user_id} has been blocked`
    });

  } catch (error) {
    console.error('[User Block] Server error:', error);
    res.status(500).json({ error: 'Failed to block user', details: error.message });
  }
});


// ============ 6. UNBLOCK USER ============
// Unblock a previously blocked user (authenticated)
router.post('/unblock', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { blocked_user_id } = req.body;

    if (!blocked_user_id) {
      return res.status(400).json({ error: 'blocked_user_id is required' });
    }

    const { error, count } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', userId)
      .eq('blocked_id', blocked_user_id);

    if (error) {
      console.error('[User Unblock] Supabase error:', error);
      return res.status(500).json({ error: 'Failed to unblock user', details: error.message });
    }

    console.log(`[User Unblock] ${userId} unblocked ${blocked_user_id}`);

    res.json({
      success: true,
      message: 'User has been unblocked'
    });

  } catch (error) {
    console.error('[User Unblock] Server error:', error);
    res.status(500).json({ error: 'Failed to unblock user', details: error.message });
  }
});


// ============ 7. GET BLOCKED LIST ============
// Get list of all users blocked by current user (authenticated)
router.get('/blocked', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('blocked_users')
      .select(`
        id,
        blocked_id,
        reason,
        created_at,
        blocked_user:profiles!blocked_users_blocked_id_fkey(id, username, avatar_url)
      `)
      .eq('blocker_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[User Blocked List] Supabase error:', error);
      // Fallback: try without join if foreign key doesn't exist
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('blocked_users')
        .select('id, blocked_id, reason, created_at')
        .eq('blocker_id', userId)
        .order('created_at', { ascending: false });

      if (fallbackError) {
        return res.status(500).json({ error: 'Failed to fetch blocked list', details: fallbackError.message });
      }

      return res.json({
        success: true,
        count: fallbackData?.length || 0,
        blocked_users: (fallbackData || []).map(b => ({
          id: b.id,
          user_id: b.blocked_id,
          username: null,
          avatar_url: null,
          reason: b.reason,
          blocked_at: b.created_at
        }))
      });
    }

    res.json({
      success: true,
      count: data?.length || 0,
      blocked_users: (data || []).map(b => ({
        id: b.id,
        user_id: b.blocked_id,
        username: b.blocked_user?.username || null,
        avatar_url: b.blocked_user?.avatar_url || null,
        reason: b.reason,
        blocked_at: b.created_at
      }))
    });

  } catch (error) {
    console.error('[User Blocked List] Server error:', error);
    res.status(500).json({ error: 'Failed to fetch blocked list', details: error.message });
  }
});


// ============ 8. DELETE ACCOUNT ============
// Permanently delete own account (authenticated)
router.delete('/account', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { confirm } = req.body;

    // Require explicit confirmation
    if (confirm !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({ 
        error: 'Account deletion requires confirmation',
        hint: 'Send { "confirm": "DELETE_MY_ACCOUNT" } in request body'
      });
    }

    console.log(`[User Delete] Account deletion requested by: ${userId}`);

    // 1. Delete profile data
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('[User Delete] Profile deletion failed:', profileError);
      // Continue anyway - try to delete auth user
    }

    // 2. Delete blocked_users records (both as blocker and blocked)
    await supabase.from('blocked_users').delete().eq('blocker_id', userId).catch(() => {});
    await supabase.from('blocked_users').delete().eq('blocked_id', userId).catch(() => {});

    // 3. Delete auth user (this invalidates all sessions)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('[User Delete] Auth deletion failed:', authError);
      return res.status(500).json({ error: 'Failed to delete account completely', details: authError.message });
    }

    console.log(`[User Delete] Account permanently deleted: ${userId}`);

    res.json({
      success: true,
      message: 'Account permanently deleted. All data has been removed.'
    });

  } catch (error) {
    console.error('[User Delete] Server error:', error);
    res.status(500).json({ error: 'Failed to delete account', details: error.message });
  }
});


// ============ 9. UPDATE SETTINGS ============
// Update user safety/notification settings (authenticated)
router.put('/settings', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { safety_settings } = req.body;

    if (!safety_settings || typeof safety_settings !== 'object') {
      return res.status(400).json({ error: 'safety_settings object is required' });
    }

    // Merge with existing settings
    const { data: existing } = await supabase
      .from('profiles')
      .select('safety_settings')
      .eq('id', userId)
      .single();

    const mergedSettings = {
      ...(existing?.safety_settings || {}),
      ...safety_settings
    };

    const { error } = await supabase
      .from('profiles')
      .update({ safety_settings: mergedSettings })
      .eq('id', userId);

    if (error) {
      console.error('[User Settings] Supabase error:', error);
      return res.status(500).json({ error: 'Failed to update settings', details: error.message });
    }

    console.log(`[User Settings] Settings updated for user: ${userId}`);

    res.json({
      success: true,
      message: 'Settings updated successfully',
      safety_settings: mergedSettings
    });

  } catch (error) {
    console.error('[User Settings] Server error:', error);
    res.status(500).json({ error: 'Failed to update settings', details: error.message });
  }
});


module.exports = router;
