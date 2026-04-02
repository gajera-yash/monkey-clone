const fs = require('fs');
const path = require('path');
if (fs.existsSync(path.join(__dirname, '.env'))) {
    require('dotenv').config({ path: path.join(__dirname, '.env') });
}
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const coinsRoutes = require('./routes/coins');
const subscriptionsRoutes = require('./routes/subscriptions');

const app = express();

// CORS: Allow Vercel frontend in production
const FRONTEND_URL = process.env.FRONTEND_URL || '*';
const allowedOrigins = FRONTEND_URL.split(',').map(o => o.trim()).filter(Boolean);

const isAllowedOrigin = (origin) => {
    // Allow non-browser clients / server-to-server calls
    if (!origin) return true;
    if (allowedOrigins.includes('*')) return true;
    return allowedOrigins.includes(origin);
};

app.use(cors({
    origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) return callback(null, true);
        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: false
}));
app.use(express.json());

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', time: new Date().toISOString(), port: process.env.PORT || 3001 });
});

// Supabase admin client for server-side checks
const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null;

// Monetization Routes
app.use('/api/coins', coinsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);

// Serve static files from the React app (only if build folder exists - for combined deploy)
const buildPath = path.join(__dirname, '../build');
if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
}

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (isAllowedOrigin(origin)) return callback(null, true);
            return callback(new Error(`Socket CORS blocked for origin: ${origin}`));
        },
        methods: ["GET", "POST", "OPTIONS"],
        credentials: false
    },
    transports: ['websocket', 'polling']
});

// Queue for users waiting to be matched [{id, name}]
let waitingUsers = [];
const socketRooms = new Map(); // socketId -> roomId
const userSockets = new Map(); // uid -> socketId
const userMatchHistory = new Map(); // uid -> array of recent matched genders ['Male', 'Female', ...]
const onlineCreators = new Map(); // uid -> userData (including socketId)

// Simple Rate Limiting Map
const socketRateLimits = new Map(); // socketId:event -> lastTimestamp

const isRateLimited = (socketId, event, limitMs = 1000) => {
    const key = `${socketId}:${event}`;
    const now = Date.now();
    const last = socketRateLimits.get(key) || 0;
    if (now - last < limitMs) return true;
    socketRateLimits.set(key, now);
    return false;
};

// Flagged keywords list (auto-disconnect triggers)
const FLAGGED_KEYWORDS = [
    'cp', 'child porn', 'underage', 'lolita', 'jailbait',
    'minor sex', 'kill yourself', 'kys', 'suicide method',
    'bomb threat', 'shoot school', 'terrorist'
];

const containsFlaggedKeyword = (text) => {
    const lower = (text || '').toLowerCase();
    return FLAGGED_KEYWORDS.some(kw => lower.includes(kw));
};

// Fetch blocked countries from DB (cached)
let geoBlockCache = [];
let geoBlockLastFetch = 0;
const GEO_CACHE_TTL = 60 * 1000; // 1 minute

const getGeoBlocks = async () => {
    if (!supabase) return [];
    if (Date.now() - geoBlockLastFetch < GEO_CACHE_TTL) return geoBlockCache;
    try {
        const { data } = await supabase.from('geo_blocks').select('country_code').eq('is_active', true);
        geoBlockCache = (data || []).map(r => r.country_code.toUpperCase());
        geoBlockLastFetch = Date.now();
        return geoBlockCache;
    } catch (e) {
        return geoBlockCache; // use cached on error
    }
};

// Check if a user has 3+ reports in the last hour
const checkAutoDisconnect = async (uid) => {
    if (!supabase || !uid) return false;
    try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count } = await supabase
            .from('reports')
            .select('id', { count: 'exact', head: true })
            .eq('reported_id', uid)
            .gte('created_at', oneHourAgo);
        return (count || 0) >= 3;
    } catch (e) { return false; }
};

// Status endpoint for debugging
app.get('/api/status', (req, res) => {
    res.json({
        totalConnections: io.engine.clientsCount,
        waitingCount: waitingUsers.length,
        activeRooms: socketRooms.size / 2,
        waitingUsers: waitingUsers.map(u => ({ id: u.id, name: u.name, uid: u.uid }))
    });
});

// Geo-blocks endpoint (for frontend to read)
app.get('/api/geo-blocks', async (req, res) => {
    const blocks = await getGeoBlocks();
    res.json({ blocked_countries: blocks });
});

// Helper for admin verification
const verifyAdmin = async (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return { error: 'No authorization header' };
    
    const token = authHeader.split(' ')[1];
    if (!token) return { error: 'Invalid token format' };

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return { error: 'Invalid session' };

        const { data: admin, error: dbError } = await supabase
            .from('admin_team_members')
            .select('role')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single();

        if (dbError || !admin || admin.role !== 'admin') {
             // Second fallback: check profiles if they are super user
             const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
             if (profile?.role === 'admin') return { user };
             return { error: 'Access denied' };
        }

        return { user };
    } catch (e) {
        return { error: 'Verification failed' };
    }
};

// Create Admin User endpoint (bypass confirmation)
app.post('/api/admin/create-user', async (req, res) => {
    const { user: requester, error: verifyError } = await verifyAdmin(req);
    if (verifyError) return res.status(403).json({ error: verifyError });

    const { email, password, metadata } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    console.log(`[Admin] Admin ${requester.id} is creating new team member: ${email}`);

    try {
        // 1. Create User with email_confirm: true
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: metadata || {}
        });

        if (error) throw error;
        const newUserId = data.user.id;

        // 2. EXTRA SAFETY: Explicitly update the user to be confirmed (fallback for some Supabase configs)
        const { error: confirmError } = await supabase.auth.admin.updateUserById(newUserId, { 
            email_confirm: true 
        });

        if (confirmError) console.warn('[Admin] Manual confirmation fallback failed:', confirmError.message);
        
        console.log(`[Admin] Successfully created confirmed user: ${email} (ID: ${newUserId})`);
        res.json({ user: data.user });
    } catch (err) {
        console.error('[Admin] Failed to create user:', err);
        res.status(500).json({ error: err.message });
    }
});

// Flag report endpoint — called by frontend after report is filed
// Checks report count and emits auto-disconnect if threshold exceeded
app.post('/api/flag-report', async (req, res) => {
    const { reportedUid } = req.body;
    if (!reportedUid) return res.json({ disconnect: false });
    const shouldDisconnect = await checkAutoDisconnect(reportedUid);
    if (shouldDisconnect) {
        // Find socket for this uid and forcefully disconnect
        const targetSocketId = userSockets.get(reportedUid);
        if (targetSocketId) {
            const roomId = socketRooms.get(targetSocketId);
            if (roomId) {
                io.to(roomId).emit('system-disconnect', { reason: 'Multiple reports received. Auto-disconnected by safety system.' });
                socketRooms.delete(targetSocketId);
            }
            waitingUsers = waitingUsers.filter(u => u.uid !== reportedUid);
            console.log(`[SafetySystem] Auto-disconnected user ${reportedUid} due to 3+ reports in 1 hour`);
        }
    }
    res.json({ disconnect: shouldDisconnect });
});

io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id} | Total: ${io.engine.clientsCount}`);

    // Immediately tell the new client and everyone else the updated total count
    io.emit('waiting-count', io.engine.clientsCount);

    // --- DIRECT 1-TO-1 CALLS LOGIC ---
    socket.on('creator-online', (userData) => {
        if (!userData || !userData.uid) return;
        onlineCreators.set(userData.uid, { ...userData, socketId: socket.id });
        console.log(`[Creator Online] ${userData.name} is accepting direct calls`);
    });

    socket.on('creator-offline', (uid) => {
        if (uid) onlineCreators.delete(uid);
    });

    socket.on('request-direct-call', ({ targetUid, callerData }) => {
        if (isRateLimited(socket.id, 'direct-call', 5000)) {
            return socket.emit('error', { message: 'Please wait before making another call.' });
        }
        // First check if it's a creator on the dashboard
        let targetSocketId = onlineCreators.get(targetUid)?.socketId;
        
        // If not on dashboard, check global socket mapping
        if (!targetSocketId) {
            targetSocketId = userSockets.get(targetUid);
            console.log(`[Direct Call] Target ${targetUid} not on dashboard, found global socket: ${!!targetSocketId}`);
        }

        if (targetSocketId) {
            const creator = onlineCreators.get(targetUid);
            const targetName = creator ? creator.name : 'User';
            
            console.log(`[Direct Call] ${callerData.name} calling ${targetName}`);
            
            // Track pending call for cancellation
            socket.pendingCallTargetId = targetSocketId;

            io.to(targetSocketId).emit('incoming-call', {
                callerSocketId: socket.id,
                callerData,
                // Include target info for the App.js global listener to show better UI
                isNewDirectCall: true
            });
        } else {
            console.log(`[Direct Call Failed] Target ${targetUid} offline`);
            socket.emit('direct-call-declined', { reason: 'offline' });
        }
    });

    socket.on('accept-direct-call', ({ callerSocketId, callerData, creatorData }) => {
        // Clear pending status for the caller since it's accepted
        const callerSocket = io.sockets.sockets.get(callerSocketId);
        if (callerSocket) {
            callerSocket.pendingCallTargetId = null;
        }

        const roomId = `direct_${callerSocketId}_${socket.id}`;
        
        // Remove from waiting queue if they accidentally got in
        waitingUsers = waitingUsers.filter(u => u.id !== callerSocketId && u.id !== socket.id);
        
        // Join both sockets to the new room
        io.to(callerSocketId).socketsJoin(roomId);
        socket.join(roomId);

        socketRooms.set(callerSocketId, roomId);
        socketRooms.set(socket.id, roomId);

        console.log(`[Direct Call Accepted] Room: ${roomId} created for ${creatorData.name}`);

        // Start call immediately (simulate normal matching format)
        io.to(callerSocketId).emit('matched', {
            roomId,
            initiator: true,
            partnerId: creatorData.uid,
            partnerName: creatorData.name,
            partnerGender: creatorData.gender || 'Female',
            isDirectCall: true
        });

        socket.emit('matched', {
            roomId,
            initiator: false,
            partnerId: callerData?.uid,
            partnerName: callerData?.name || 'User',
            isDirectCall: true
        });
    });

    socket.on('decline-direct-call', ({ callerSocketId }) => {
        const callerSocket = io.sockets.sockets.get(callerSocketId);
        if (callerSocket) {
            callerSocket.pendingCallTargetId = null;
            io.to(callerSocketId).emit('direct-call-declined', { reason: 'declined' });
        }
    });

    socket.on('cancel-direct-call', ({ targetUid }) => {
        let targetSocketId = onlineCreators.get(targetUid)?.socketId || userSockets.get(targetUid);
        if (targetSocketId) {
            io.to(targetSocketId).emit('call-cancelled', { callerSocketId: socket.id });
        }
        socket.pendingCallTargetId = null;
    });
    // --- END DIRECT CALLS LOGIC ---

    // Safety Violation reported by the client (e.g. NSFW detected 3 times)
    socket.on('system-violation', async ({ reason, uid }) => {
        console.log(`[SafetyViolation] ${uid} flagged for: ${reason}`);
        if (!supabase || !uid) return;

        try {
            // 1. Get current strike count
            const { data: profile } = await supabase.from('profiles').select('strike_count, is_blocked').eq('id', uid).single();
            const newStrikeCount = (profile?.strike_count || 0) + 1;
            
            // Mirror StrikeSystem.jsx logic
            let ban_expiry = null;
            let is_blocked = profile?.is_blocked || false;
            
            if (newStrikeCount === 2) {
                ban_expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                is_blocked = true;
            } else if (newStrikeCount >= 3) {
                is_blocked = true;
            }

            // 2. Update Profile
            await supabase.from('profiles').update({
                strike_count: newStrikeCount,
                last_strike_at: new Date().toISOString(),
                is_blocked,
                ban_expiry,
                ban_reason: `System: ${reason} (Strike ${newStrikeCount})`
            }).eq('id', uid);

            // 3. Log Strike
            await supabase.from('user_strikes').insert({
                user_id: uid,
                strike_number: newStrikeCount,
                reason: reason,
                admin_id: null, // System-generated
                action_taken: newStrikeCount === 1 ? 'warning' : newStrikeCount === 2 ? '24hr_ban' : 'permanent_ban',
                expires_at: ban_expiry
            });

            console.log(`[SafetyViolation] Strike ${newStrikeCount} issued to ${uid}`);
        } catch (e) {
            console.error('[SafetyViolation] Failed to log strike:', e);
        }
    });

    // User wants to find a random match
    socket.on('join-waiting', async (userData) => {
        if (isRateLimited(socket.id, 'join', 2000)) return;
        console.log(`[Join] User ${socket.id} requested match:`, userData);
        
        // Handle both simple string (legacy) and object (new)
        let name = 'Stranger';
        let uid = null;
        let blockedUsers = [];
        let location = null;
        let isPremium = false;

        let gender = null;
        let birthdate = null;
        let filters = {};

        if (typeof userData === 'string') {
            name = userData;
        } else if (typeof userData === 'object') {
            name = userData.name || 'Stranger';
            uid = userData.uid;
            blockedUsers = userData.blockedUsers || [];
            location = userData.location || null;
            isPremium = userData.isPremium || false;
            gender = userData.ownGender || null;
            birthdate = userData.ownBirthdate || null;
            filters = userData.filters || {};
        }

        const user = {
            id: socket.id,
            name,
            uid,
            blockedUsers,
            location,
            isPremium,
            gender,
            birthdate,
            filters
        };

        // --- GEO-BLOCK CHECK ---
        const userCountry = typeof location === 'object' ? (location?.country || '') : (location || '');
        if (userCountry) {
            try {
                const blockedCountries = await getGeoBlocks();
                const countryUpper = userCountry.toUpperCase();
                const isBlocked = blockedCountries.some(code =>
                    code === countryUpper ||
                    userCountry.toLowerCase().includes(code.toLowerCase())
                );
                if (isBlocked) {
                    console.log(`[GeoBlock] Blocked user from: ${userCountry}`);
                    socket.emit('geo-blocked', { reason: 'Your country is currently restricted from this platform.' });
                    return;
                }
            } catch (e) {
                console.error('[GeoBlock] Check failed:', e);
            }
        }
        // -----------------------

        // Avoid duplicates
        const existingIdx = waitingUsers.findIndex(u => u.id === socket.id);
        if (existingIdx === -1) {
            waitingUsers.push(user);
        } else {
            waitingUsers[existingIdx] = user; // Update info if already in queue
        }

        console.log(`[Queue] User ${user.uid || user.id} (${user.name}) joined. Pool: ${waitingUsers.length}`);
        io.emit('waiting-count', io.engine.clientsCount);
        
        // Check if we can match
        if (waitingUsers.length >= 2) {
            console.log(`[MatchEngine] Attempting to match from pool of ${waitingUsers.length}...`);

            // 1. Sort users: priority users (paid filters) first
            const isPriority = (u) => {
                const f = u.filters || {};
                return (f.gender && f.gender !== 'Both') || 
                       (f.ageRange && f.ageRange !== 'Any') || 
                       (f.location && f.location !== 'Global');
            };
            
            waitingUsers.sort((a, b) => {
                const aPrio = isPriority(a) ? 1 : 0;
                const bPrio = isPriority(b) ? 1 : 0;
                return bPrio - aPrio;
            });

            let matchFound = false;
            let user1Index = -1;
            let user2Index = -1;

            // Helper to calculate age from birthdate
            const calculateAge = (birthdate) => {
                if (!birthdate) return null;
                const birth = new Date(birthdate);
                const today = new Date();
                let age = today.getFullYear() - birth.getFullYear();
                const m = today.getMonth() - birth.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
                return age;
            };

            // Helper to check if a user matches another's filters
            const matchesFilters = (user, filterer) => {
                const filters = filterer.filters || {};
                
                // 1. Gender check
                if (filters.gender && filters.gender !== 'Both') {
                    if (user.gender !== filters.gender) return false;
                }

                // 2. Age check
                if (filters.ageRange && filters.ageRange !== 'Any') {
                    const age = calculateAge(user.birthdate);
                    if (age === null) return false; // If no birthdate, can't match age filters
                    
                    if (filters.ageRange === '18-25') {
                        if (age < 18 || age > 25) return false;
                    } else if (filters.ageRange === '26-35') {
                        if (age < 26 || age > 35) return false;
                    } else if (filters.ageRange === '36+') {
                        if (age < 36) return false;
                    }
                }

                // 3. Location check
                if (filters.location && filters.location !== 'Global') {
                    // Assuming location is a country string or object with country
                    const userCountry = typeof user.location === 'string' ? user.location : (user.location?.country || '');
                    if (!userCountry.toLowerCase().includes(filters.location.toLowerCase())) return false;
                }

                return true;
            };

            // Matching loop
            for (let i = 0; i < waitingUsers.length && !matchFound; i++) {
                const u1 = waitingUsers[i];
                
                for (let j = i + 1; j < waitingUsers.length; j++) {
                    const u2 = waitingUsers[j];

                    // Check blocks
                    const u1BlocksU2 = (u1.blockedUsers || []).includes(u2.uid) || (u1.uid && (u2.blockedUsers || []).includes(u1.uid));
                    const u2BlocksU1 = (u2.blockedUsers || []).includes(u1.uid) || (u2.uid && (u1.blockedUsers || []).includes(u2.uid));

                    if (u1BlocksU2 || u2BlocksU1) continue;

                    // CHECK FREE MALE FEMALE RATIO LIMIT (3 out of 10 matches)
                    const checkRatioLimit = (userA, userB) => {
                        const aGender = userA.gender || 'Male'; // default unknown to Male
                        const bGender = userB.gender || 'Male';
                        
                        // Condition applies if userA is Male and userB is Female
                        if (aGender !== 'Male' || bGender !== 'Female') return false;
                        
                        // Only applies if userA (Male) is NOT paying for a gender filter
                        if (userA.filters?.gender && userA.filters.gender !== 'Both') return false;
                        
                        const history = userMatchHistory.get(userA.uid) || [];
                        const femaleCount = history.filter(g => g === 'Female').length;
                        return femaleCount >= 3; // Limit to 3 females per 10 matches
                    };

                    if (checkRatioLimit(u1, u2) || checkRatioLimit(u2, u1)) {
                        continue; // Skip this match, save female creator for paid/eligible users
                    }

                    // CHECK FILTERS ONE-WAY: each user's filter applies to their partner
                    // u1's filter must match u2's gender/age/location, AND u2's filter must match u1
                    const u1FiltersMatchU2 = matchesFilters(u2, u1); // does u2 match what u1 wants?
                    const u2FiltersMatchU1 = matchesFilters(u1, u2); // does u1 match what u2 wants?
                    if (u1FiltersMatchU2 && u2FiltersMatchU1) {
                        user1Index = i;
                        user2Index = j;
                        matchFound = true;
                        break;
                    }
                }
            }

            if (matchFound) {
                const u1 = waitingUsers[user1Index];
                const u2 = waitingUsers[user2Index];

                // Remove both from queue (higher index first)
                waitingUsers.splice(user2Index, 1);
                waitingUsers.splice(user1Index, 1);

                // Create a unique room ID
                const roomId = `room_${u1.id}_${u2.id}`;
                console.log(`[Match] Pair Found: ${u1.name} & ${u2.name} -> ${roomId}`);

                // Record the match in history for both users
                const recordMatch = (uid, partnerGender) => {
                    if (!uid) return;
                    const gender = partnerGender || 'Male';
                    const history = userMatchHistory.get(uid) || [];
                    history.push(gender);
                    if (history.length > 10) history.shift(); // Keep only last 10
                    userMatchHistory.set(uid, history);
                };
                recordMatch(u1.uid, u2.gender);
                recordMatch(u2.uid, u1.gender);

                // Join both users to the room
                io.to(u1.id).socketsJoin(roomId);
                io.to(u2.id).socketsJoin(roomId);

                // Track which room each socket is in
                socketRooms.set(u1.id, roomId);
                socketRooms.set(u2.id, roomId);

                // Notify users they are matched
                io.to(u1.id).emit('matched', {
                    roomId,
                    initiator: true,
                    partnerId: u2.uid,
                    partnerName: u2.name,
                    partnerLocation: u2.location,
                    partnerIsPremium: u2.isPremium,
                    partnerGender: u2.gender,
                    partnerBirthdate: u2.birthdate
                });
                io.to(u2.id).emit('matched', {
                    roomId,
                    initiator: false,
                    partnerId: u1.uid,
                    partnerName: u1.name,
                    partnerLocation: u1.location,
                    partnerIsPremium: u1.isPremium,
                    partnerGender: u1.gender,
                    partnerBirthdate: u1.birthdate
                });
            } else {
                console.log(`[MatchEngine] No suitable pairs found in current pool. Queue status: ${waitingUsers.length} waiting.`);
            }
        }
    });

    // WebRTC Signaling Events
    socket.on('offer', ({ offer, roomId }) => {
        console.log(`[Signal] Offer from ${socket.id} to room ${roomId}`);
        socket.to(roomId).emit('offer', offer);
    });

    socket.on('answer', ({ answer, roomId }) => {
        socket.to(roomId).emit('answer', answer);
    });

    socket.on('ice-candidate', ({ candidate, roomId }) => {
        socket.to(roomId).emit('ice-candidate', candidate);
    });

    // Handle Disconnection
    socket.on('share-log-id', ({ logId, roomId }) => {
        socket.currentLogId = logId; // Track on this socket for cleanup
        socket.to(roomId).emit('share-log-id', { logId });
    });

    socket.on('disconnect', async () => {
        const sid = socket.id;
        console.log(`User disconnected: ${sid} | Remaining: ${io.engine.clientsCount - 1}`);

        // --- DB CLEANUP FOR DANGLING LOGS ---
        if (socket.currentLogId && supabase) {
            try {
                // Get the log to check if it's already ended
                const { data: log } = await supabase
                    .from('chat_logs')
                    .select('start_time, end_time')
                    .eq('id', socket.currentLogId)
                    .single();

                if (log && !log.end_time) {
                    const endTime = new Date();
                    const duration = Math.floor((endTime - new Date(log.start_time)) / 1000);
                    
                    await supabase
                        .from('chat_logs')
                        .update({ 
                            end_time: endTime.toISOString(),
                            duration: duration > 0 ? duration : 0
                        })
                        .eq('id', socket.currentLogId);
                    
                    console.log(`[DB Cleanup] Auto-closed dangling log: ${socket.currentLogId} | Dur: ${duration}s`);
                }
            } catch (e) {
                console.error('[DB Cleanup Error]', e);
            }
        }
        // ------------------------------------

        // Cancel pending call if caller disconnected
        if (socket.pendingCallTargetId) {
            io.to(socket.pendingCallTargetId).emit('call-cancelled', { callerSocketId: socket.id });
            socket.pendingCallTargetId = null;
        }

        // Remove from waiting list if there
        waitingUsers = waitingUsers.filter(u => u.id !== socket.id);

        // Notify partner in active room
        const roomId = socketRooms.get(socket.id);
        if (roomId) {
            socket.to(roomId).emit('partner-disconnected');
            socketRooms.delete(socket.id);
        }

        // Remove from UID mapping
        for (const [uid, sid] of userSockets.entries()) {
            if (sid === socket.id) {
                userSockets.delete(uid);
                break;
            }
        }

        // Remove from Online Creators
        for (const [uid, cData] of onlineCreators.entries()) {
            if (cData.socketId === socket.id) {
                onlineCreators.delete(uid);
                break;
            }
        }

        // Broadcast updated online count to all remaining clients
        // Use setTimeout to ensure the client has fully disconnected before counting
        setTimeout(() => {
            // Clean up rate limits
            for (const [key] of socketRateLimits) {
                if (key.startsWith(`${socket.id}:`)) {
                    socketRateLimits.delete(key);
                }
            }

            io.emit('waiting-count', io.engine.clientsCount);
        }, 100);
    });

    // Explicit leave/next
    socket.on('leave-room', ({ roomId }) => {
        // Cancel pending call if caller cancels before match
        if (socket.pendingCallTargetId) {
            io.to(socket.pendingCallTargetId).emit('call-cancelled', { callerSocketId: socket.id });
            socket.pendingCallTargetId = null;
        }

        socket.leave(roomId);
        socket.to(roomId).emit('partner-disconnected');
        socketRooms.delete(socket.id);
    });

    // Track UID -> socketId for private calls
    socket.on('register-uid', (uid) => {
        if (uid) {
            userSockets.set(uid, socket.id);
            console.log(`[Socket] Registered UID: ${uid} for Socket: ${socket.id}`);
        }
    });

    // Direct/Private Call Invite
    socket.on('send-private-invite', ({ targetUid, senderName, senderPhoto, senderUid }) => {
        const targetSocketId = userSockets.get(targetUid);
        console.log(`[Invite] From ${senderName} (${senderUid}) to UID: ${targetUid} | Found: ${!!targetSocketId}`);
        
        if (targetSocketId) {
            io.to(targetSocketId).emit('incoming-call', { 
                senderUid, 
                senderName, 
                senderPhoto 
            });
        }
    });

    socket.on('accept-private-invite', ({ targetUid, senderUid }) => {
        console.log(`[Accept] User ${targetUid} accepted call from ${senderUid}`);
        const targetSocketId = userSockets.get(senderUid);
        
        if (targetSocketId) {
            const roomId = `private_${Math.min(targetUid, senderUid)}_${Math.max(targetUid, senderUid)}`.replace(/[^a-zA-Z0-9_]/g, '');
            
            // Join both to the room
            io.to(socket.id).socketsJoin(roomId);
            io.to(targetSocketId).socketsJoin(roomId);
            
            socketRooms.set(socket.id, roomId);
            socketRooms.set(targetSocketId, roomId);

            // Notify both to start WebRTC
            io.to(socket.id).emit('matched', {
                roomId,
                initiator: true,
                partnerId: senderUid,
                partnerName: 'User', // Would be better with real names
                partnerLocation: null,
                partnerIsPremium: false
            });
            io.to(targetSocketId).emit('matched', {
                roomId,
                initiator: false,
                partnerId: targetUid,
                partnerName: 'User',
                partnerLocation: null,
                partnerIsPremium: false
            });
        }
    });

    socket.on('decline-private-invite', ({ targetUid, senderUid }) => {
        console.log(`[Decline] User ${targetUid} declined call from ${senderUid}`);
        const targetSocketId = userSockets.get(senderUid);
        if (targetSocketId) {
            io.to(targetSocketId).emit('call-declined', { targetUid });
        }
    });

    // Text Chat: Send message to room
    socket.on('send-message', ({ roomId, message }) => {
        if (isRateLimited(socket.id, 'message', 3)) return; // Max 3 messages per second approx
        // --- KEYWORD SCAN ---
        if (containsFlaggedKeyword(message?.text || '')) {
            console.log(`[SafetySystem] Flagged keyword detected in room ${roomId}`);
            io.to(roomId).emit('system-disconnect', { reason: 'Inappropriate language detected. Connection closed by safety system.' });
            
            // Clean up the room
            const roomConfig = activeRooms.get(roomId);
            if (roomConfig) {
                const { user1, user2 } = roomConfig;
                socketRooms.delete(user1.id);
                socketRooms.delete(user2.id);
                activeRooms.delete(roomId);
            }
            return;
        }
        // --------------------

        socket.to(roomId).emit('receive-message', message);
    });

    // Text Chat: Typing indicator
    socket.on('typing', ({ roomId, isTyping }) => {
        socket.to(roomId).emit('partner-typing', isTyping);
    });
});

// The "catchall" handler: only serve React app if build folder exists (combined deploy)
if (fs.existsSync(buildPath)) {
    app.get('*', (req, res) => {
        res.sendFile(path.join(buildPath, 'index.html'));
    });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`========================================`);
    console.log(`Signaling server running on PORT: ${PORT}`);
    console.log(`Interface: 0.0.0.0 (Publicly Reachable)`);
    console.log(`Frontend URL: ${FRONTEND_URL}`);
    console.log(`========================================`);
});

// Deployment Trigger: 2026-04-02 21:40
