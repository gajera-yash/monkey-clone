const fs = require('fs');
const path = require('path');
if (fs.existsSync(path.join(__dirname, '.env'))) {
    require('dotenv').config({ path: path.join(__dirname, '.env') });
}

// Global Exception Handlers
process.on('uncaughtException', (err) => {
    console.error('========================================');
    console.error('UNCAUGHT EXCEPTION! Server Crashing...');
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
    console.error('========================================');
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('========================================');
    console.error('UNHANDLED REJECTION AT:', promise);
    console.error('Reason:', reason);
    console.error('========================================');
});

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const coinsRoutes = require('./routes/coins');
const subscriptionsRoutes = require('./routes/subscriptions');

const app = express();

// ============================================================
// FIX 1: CORS — Removed forced "return true" debug bypass
// Production ma origin properly check thase
// ============================================================
const FRONTEND_URL = process.env.FRONTEND_URL || '*';
const allowedOrigins = FRONTEND_URL.split(',').map(o => o.trim()).filter(Boolean);

const isAllowedOrigin = (origin) => {
    const cleanOrigin = origin ? origin.replace(/\/+$/, "") : null;
    if (!cleanOrigin) return true;
    if (FRONTEND_URL === '*') return true;
    return allowedOrigins.some(ao => ao.replace(/\/+$/, "") === cleanOrigin);
};

app.use(cors({
    origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) return callback(null, true);
        console.warn(`[CORS] Blocked origin: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: false
}));

app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', time: new Date().toISOString(), port: process.env.PORT || 3001 });
});

// Supabase admin client
const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null;

// Monetization Routes
app.use('/api/coins', coinsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);

// Static build (combined deploy only)
const buildPath = path.join(__dirname, '../build');
if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
}

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (isAllowedOrigin(origin)) return callback(null, true);
            return callback(new Error('Not allowed by CORS'));
        },
        methods: ["GET", "POST", "OPTIONS"],
        credentials: false
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
});

// ============================================================
// STATE
// ============================================================
let waitingUsers = [];
const socketRooms = new Map();   // socketId -> roomId
const userSockets = new Map();   // uid -> socketId
const userMatchHistory = new Map(); // uid -> array of recent matched genders
const onlineCreators = new Map(); // uid -> userData
const socketRateLimits = new Map(); // socketId:event -> lastTimestamp

// ============================================================
// HELPERS
// ============================================================
const isRateLimited = (socketId, event, limitMs = 1000) => {
    const key = `${socketId}:${event}`;
    const now = Date.now();
    const last = socketRateLimits.get(key) || 0;
    if (now - last < limitMs) return true;
    socketRateLimits.set(key, now);
    return false;
};

const FLAGGED_KEYWORDS = [
    'cp', 'child porn', 'underage', 'lolita', 'jailbait',
    'minor sex', 'kill yourself', 'kys', 'suicide method',
    'bomb threat', 'shoot school', 'terrorist'
];

const containsFlaggedKeyword = (text) => {
    const lower = (text || '').toLowerCase();
    return FLAGGED_KEYWORDS.some(kw => lower.includes(kw));
};

// Geo-block cache
let geoBlockCache = [];
let geoBlockLastFetch = 0;
const GEO_CACHE_TTL = 60 * 1000;

const getGeoBlocks = async () => {
    if (!supabase) return [];
    if (Date.now() - geoBlockLastFetch < GEO_CACHE_TTL) return geoBlockCache;
    try {
        const { data } = await supabase.from('geo_blocks').select('country_code').eq('is_active', true);
        geoBlockCache = (data || []).map(r => r.country_code.toUpperCase());
        geoBlockLastFetch = Date.now();
        return geoBlockCache;
    } catch (e) {
        return geoBlockCache;
    }
};

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

// ============================================================
// MATCHING ENGINE HELPERS (extracted — no longer nested)
// ============================================================
const calculateAge = (birthdate) => {
    if (!birthdate) return null;
    const birth = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
};

const matchesFilters = (user, filterer) => {
    const filters = filterer.filters || {};

    if (filters.gender && filters.gender !== 'Both') {
        if (user.gender !== filters.gender) return false;
    }

    if (filters.ageRange && filters.ageRange !== 'Any') {
        const age = calculateAge(user.birthdate);
        if (age === null) return false;
        if (filters.ageRange === '18-25' && (age < 18 || age > 25)) return false;
        if (filters.ageRange === '26-35' && (age < 26 || age > 35)) return false;
        if (filters.ageRange === '36+' && age < 36) return false;
    }

    if (filters.location && filters.location !== 'Global') {
        const userCountry = typeof user.location === 'string'
            ? user.location
            : (user.location?.country || '');
        if (!userCountry.toLowerCase().includes(filters.location.toLowerCase())) return false;
    }

    return true;
};

const checkRatioLimit = (userA, userB) => {
    const aGender = userA.gender || 'Male';
    const bGender = userB.gender || 'Male';
    if (aGender !== 'Male' || bGender !== 'Female') return false;
    if (userA.filters?.gender && userA.filters.gender !== 'Both') return false;
    const history = userMatchHistory.get(userA.uid) || [];
    const femaleCount = history.filter(g => g === 'Female').length;
    return femaleCount >= 3;
};

const recordMatch = (uid, partnerGender) => {
    if (!uid) return;
    const gender = partnerGender || 'Male';
    const history = userMatchHistory.get(uid) || [];
    history.push(gender);
    if (history.length > 10) history.shift();
    userMatchHistory.set(uid, history);
};

// ============================================================
// FIX 2: MATCHING ENGINE
// - O(n²) loop capped at 20 — prevents freeze at scale
// - Recursive setTimeout replaced with one-time guarded retry
// ============================================================
const attemptMatching = () => {
    if (waitingUsers.length < 2) return;

    // Sort: premium/filter users first
    const isPriority = (u) => {
        const f = u.filters || {};
        return (f.gender && f.gender !== 'Both') ||
            (f.ageRange && f.ageRange !== 'Any') ||
            (f.location && f.location !== 'Global');
    };
    waitingUsers.sort((a, b) => (isPriority(b) ? 1 : 0) - (isPriority(a) ? 1 : 0));

    // FIX: Cap scan at 20 users — O(n²) becomes O(400) max, not O(n²) unbounded
    const scanLimit = Math.min(waitingUsers.length, 20);

    let matchFound = false;
    let user1Index = -1;
    let user2Index = -1;

    for (let i = 0; i < scanLimit && !matchFound; i++) {
        const u1 = waitingUsers[i];
        for (let j = i + 1; j < scanLimit; j++) {
            const u2 = waitingUsers[j];

            const u1BlocksU2 = (u1.blockedUsers || []).includes(u2.uid) ||
                (u1.uid && (u2.blockedUsers || []).includes(u1.uid));
            const u2BlocksU1 = (u2.blockedUsers || []).includes(u1.uid) ||
                (u2.uid && (u1.blockedUsers || []).includes(u2.uid));

            if (u1BlocksU2 || u2BlocksU1) continue;

            if (u1.skippedPartner && u1.skippedPartner === u2.uid) continue;
            if (u2.skippedPartner && u2.skippedPartner === u1.uid) continue;

            if (checkRatioLimit(u1, u2) || checkRatioLimit(u2, u1)) continue;

            const u1FiltersMatchU2 = matchesFilters(u2, u1);
            const u2FiltersMatchU1 = matchesFilters(u1, u2);

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

        waitingUsers.splice(user2Index, 1);
        waitingUsers.splice(user1Index, 1);

        const roomId = `room_${u1.id}_${u2.id}_${Date.now()}`;
        console.log(`[Match] Pair Found: ${u1.name} & ${u2.name} -> ${roomId}`);

        recordMatch(u1.uid, u2.gender);
        recordMatch(u2.uid, u1.gender);

        io.to(u1.id).socketsJoin(roomId);
        io.to(u2.id).socketsJoin(roomId);

        socketRooms.set(u1.id, roomId);
        socketRooms.set(u2.id, roomId);

        io.to(u1.id).emit('matched', {
            roomId, initiator: true,
            partnerId: u2.uid, partnerName: u2.name,
            partnerLocation: u2.location, partnerIsPremium: u2.isPremium,
            partnerGender: u2.gender, partnerBirthdate: u2.birthdate
        });
        io.to(u2.id).emit('matched', {
            roomId, initiator: false,
            partnerId: u1.uid, partnerName: u1.name,
            partnerLocation: u1.location, partnerIsPremium: u1.isPremium,
            partnerGender: u1.gender, partnerBirthdate: u1.birthdate
        });

    } else {
        console.log(`[MatchEngine] No suitable pairs. Queue: ${waitingUsers.length}`);

        // FIX: One-time retry with guard — no unbounded recursion
        if (waitingUsers.length >= 2) {
            let retryFired = false;
            setTimeout(() => {
                if (retryFired) return;
                retryFired = true;

                let cleared = false;
                waitingUsers.forEach(u => {
                    if (u.skippedPartner) {
                        u.skippedPartner = null;
                        cleared = true;
                    }
                });
                if (cleared && waitingUsers.length >= 2) {
                    console.log(`[MatchEngine] One-time retry after clearing skipped partners`);
                    attemptMatching();
                }
            }, 5000);
        }
    }
};

// ============================================================
// REST ENDPOINTS
// ============================================================
app.get('/api/status', (req, res) => {
    res.json({
        totalConnections: io.engine.clientsCount,
        waitingCount: waitingUsers.length,
        activeRooms: socketRooms.size / 2,
        waitingUsers: waitingUsers.map(u => ({ id: u.id, name: u.name, uid: u.uid }))
    });
});

app.get('/api/geo-blocks', async (req, res) => {
    const blocks = await getGeoBlocks();
    res.json({ blocked_countries: blocks });
});

const verifyAdmin = async (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return { error: 'No authorization header' };
    const token = authHeader.split(' ')[1];
    if (!token) return { error: 'Invalid token format' };
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return { error: 'Invalid session' };
        const { data: admin, error: dbError } = await supabase
            .from('admin_team_members').select('role')
            .eq('user_id', user.id).eq('is_active', true).single();
        if (dbError || !admin || admin.role !== 'admin') {
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            if (profile?.role === 'admin') return { user };
            return { error: 'Access denied' };
        }
        return { user };
    } catch (e) {
        return { error: 'Verification failed' };
    }
};

app.post('/api/admin/create-user', async (req, res) => {
    const { user: requester, error: verifyError } = await verifyAdmin(req);
    if (verifyError) return res.status(403).json({ error: verifyError });
    const { email, password, metadata } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    console.log(`[Admin] Creating team member: ${email}`);
    try {
        const { data, error } = await supabase.auth.admin.createUser({
            email, password, email_confirm: true, user_metadata: metadata || {}
        });
        if (error) throw error;
        await supabase.auth.admin.updateUserById(data.user.id, { email_confirm: true });
        res.json({ user: data.user });
    } catch (err) {
        console.error('[Admin] Failed to create user:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/flag-report', async (req, res) => {
    const { reportedUid } = req.body;
    if (!reportedUid) return res.json({ disconnect: false });
    const shouldDisconnect = await checkAutoDisconnect(reportedUid);
    if (shouldDisconnect) {
        const targetSocketId = userSockets.get(reportedUid);
        if (targetSocketId) {
            const roomId = socketRooms.get(targetSocketId);
            if (roomId) {
                io.to(roomId).emit('system-disconnect', {
                    reason: 'Multiple reports received. Auto-disconnected by safety system.'
                });
                socketRooms.delete(targetSocketId);
            }
            waitingUsers = waitingUsers.filter(u => u.uid !== reportedUid);
            console.log(`[SafetySystem] Auto-disconnected ${reportedUid}`);
        }
    }
    res.json({ disconnect: shouldDisconnect });
});

// ============================================================
// SOCKET.IO
// ============================================================
io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id} | Total: ${io.engine.clientsCount}`);

    // FIX 3: Only notify the joining socket — not broadcast to ALL
    socket.emit('waiting-count', waitingUsers.length);

    // --- DIRECT CREATOR CALLS ---
    socket.on('creator-online', (userData) => {
        if (!userData || !userData.uid) return;
        onlineCreators.set(userData.uid, { ...userData, socketId: socket.id });
        console.log(`[Creator Online] ${userData.name}`);
    });

    socket.on('creator-offline', (uid) => {
        if (uid) onlineCreators.delete(uid);
    });

    socket.on('request-direct-call', ({ targetUid, callerData }) => {
        if (isRateLimited(socket.id, 'direct-call', 5000)) {
            return socket.emit('error', { message: 'Please wait before making another call.' });
        }
        let targetSocketId = onlineCreators.get(targetUid)?.socketId || userSockets.get(targetUid);
        if (targetSocketId) {
            socket.pendingCallTargetId = targetSocketId;
            io.to(targetSocketId).emit('incoming-call', {
                callerSocketId: socket.id, callerData, isNewDirectCall: true
            });
        } else {
            socket.emit('direct-call-declined', { reason: 'offline' });
        }
    });

    socket.on('accept-direct-call', ({ callerSocketId, callerData, creatorData }) => {
        const callerSocket = io.sockets.sockets.get(callerSocketId);
        if (callerSocket) callerSocket.pendingCallTargetId = null;

        const roomId = `direct_${callerSocketId}_${socket.id}`;
        waitingUsers = waitingUsers.filter(u => u.id !== callerSocketId && u.id !== socket.id);

        io.to(callerSocketId).socketsJoin(roomId);
        socket.join(roomId);
        socketRooms.set(callerSocketId, roomId);
        socketRooms.set(socket.id, roomId);

        io.to(callerSocketId).emit('matched', {
            roomId, initiator: true,
            partnerId: creatorData.uid, partnerName: creatorData.name,
            partnerGender: creatorData.gender || 'Female', isDirectCall: true
        });
        socket.emit('matched', {
            roomId, initiator: false,
            partnerId: callerData?.uid, partnerName: callerData?.name || 'User', isDirectCall: true
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
        const targetSocketId = onlineCreators.get(targetUid)?.socketId || userSockets.get(targetUid);
        if (targetSocketId) io.to(targetSocketId).emit('call-cancelled', { callerSocketId: socket.id });
        socket.pendingCallTargetId = null;
    });

    // --- SAFETY ---
    socket.on('system-violation', async ({ reason, uid }) => {
        console.log(`[SafetyViolation] ${uid} flagged for: ${reason}`);
        if (!supabase || !uid) return;
        try {
            const { data: profile } = await supabase.from('profiles')
                .select('strike_count, is_blocked').eq('id', uid).single();
            const newStrikeCount = (profile?.strike_count || 0) + 1;
            let ban_expiry = null;
            let is_blocked = profile?.is_blocked || false;
            if (newStrikeCount === 2) {
                ban_expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                is_blocked = true;
            } else if (newStrikeCount >= 3) {
                is_blocked = true;
            }
            await supabase.from('profiles').update({
                strike_count: newStrikeCount,
                last_strike_at: new Date().toISOString(),
                is_blocked, ban_expiry,
                ban_reason: `System: ${reason} (Strike ${newStrikeCount})`
            }).eq('id', uid);
            await supabase.from('user_strikes').insert({
                user_id: uid, strike_number: newStrikeCount, reason,
                admin_id: null,
                action_taken: newStrikeCount === 1 ? 'warning' : newStrikeCount === 2 ? '24hr_ban' : 'permanent_ban',
                expires_at: ban_expiry
            });
            console.log(`[SafetyViolation] Strike ${newStrikeCount} issued to ${uid}`);
        } catch (e) {
            console.error('[SafetyViolation] Failed:', e);
        }
    });

    // --- MATCHMAKING ---
    socket.on('join-waiting', async (userData) => {
        if (isRateLimited(socket.id, 'join', 2000)) return;

        let name = 'Stranger', uid = null, blockedUsers = [], location = null;
        let isPremium = false, gender = null, birthdate = null, filters = {}, skippedPartner = null;

        if (typeof userData === 'string') {
            name = userData;
        } else if (typeof userData === 'object' && userData !== null) {
            name = userData.name || 'Stranger';
            uid = userData.uid;
            blockedUsers = userData.blockedUsers || [];
            location = userData.location || null;
            isPremium = userData.isPremium || false;
            gender = userData.ownGender || null;
            birthdate = userData.ownBirthdate || null;
            filters = userData.filters || {};
            skippedPartner = userData.skippedPartner || null;
        }

        const user = { id: socket.id, name, uid, blockedUsers, location, isPremium, gender, birthdate, filters, skippedPartner };

        // Geo-block check
        const userCountry = typeof location === 'object' ? (location?.country || '') : (location || '');
        if (userCountry) {
            try {
                const blockedCountries = await getGeoBlocks();
                const isBlocked = blockedCountries.some(code =>
                    code === userCountry.toUpperCase() ||
                    userCountry.toLowerCase().includes(code.toLowerCase())
                );
                if (isBlocked) {
                    socket.emit('geo-blocked', { reason: 'Your country is currently restricted.' });
                    return;
                }
            } catch (e) {
                console.error('[GeoBlock] Check failed:', e);
            }
        }

        // Deduplicate queue
        const existingIdx = waitingUsers.findIndex(u => u.id === socket.id);
        if (existingIdx === -1) {
            waitingUsers.push(user);
        } else {
            waitingUsers[existingIdx] = user;
        }

        console.log(`[Queue] ${user.name} joined. Pool: ${waitingUsers.length}`);

        // FIX 3: Only emit to this socket, not entire server
        socket.emit('waiting-count', waitingUsers.length);

        attemptMatching();
    });

    // --- WEBRTC SIGNALING ---
    socket.on('offer', ({ offer, roomId }) => {
        socket.to(roomId).emit('offer', offer);
    });

    socket.on('answer', ({ answer, roomId }) => {
        socket.to(roomId).emit('answer', answer);
    });

    socket.on('ice-candidate', ({ candidate, roomId }) => {
        socket.to(roomId).emit('ice-candidate', candidate);
    });

    socket.on('share-log-id', ({ logId, roomId }) => {
        socket.currentLogId = logId;
        socket.to(roomId).emit('share-log-id', { logId });
    });

    // --- DISCONNECT ---
    socket.on('disconnect', async () => {
        console.log(`[Socket] Disconnected: ${socket.id} | Remaining: ${io.engine.clientsCount - 1}`);

        // Close dangling chat log
        if (socket.currentLogId && supabase) {
            try {
                const { data: log } = await supabase.from('chat_logs')
                    .select('start_time, end_time').eq('id', socket.currentLogId).single();
                if (log && !log.end_time) {
                    const endTime = new Date();
                    const duration = Math.floor((endTime - new Date(log.start_time)) / 1000);
                    await supabase.from('chat_logs').update({
                        end_time: endTime.toISOString(),
                        duration: duration > 0 ? duration : 0
                    }).eq('id', socket.currentLogId);
                    console.log(`[DB Cleanup] Closed log: ${socket.currentLogId}`);
                }
            } catch (e) {
                console.error('[DB Cleanup Error]', e);
            }
        }

        if (socket.pendingCallTargetId) {
            io.to(socket.pendingCallTargetId).emit('call-cancelled', { callerSocketId: socket.id });
            socket.pendingCallTargetId = null;
        }

        waitingUsers = waitingUsers.filter(u => u.id !== socket.id);

        const roomId = socketRooms.get(socket.id);
        if (roomId) {
            socket.to(roomId).emit('partner-disconnected');
            socketRooms.delete(socket.id);
        }

        for (const [uid, sid] of userSockets.entries()) {
            if (sid === socket.id) { userSockets.delete(uid); break; }
        }

        for (const [uid, cData] of onlineCreators.entries()) {
            if (cData.socketId === socket.id) { onlineCreators.delete(uid); break; }
        }

        setTimeout(() => {
            for (const [key] of socketRateLimits) {
                if (key.startsWith(`${socket.id}:`)) socketRateLimits.delete(key);
            }
            // FIX 3: Broadcast updated count to all on disconnect is fine (infrequent)
            io.emit('waiting-count', waitingUsers.length);
        }, 100);
    });

    socket.on('leave-room', ({ roomId }) => {
        if (socket.pendingCallTargetId) {
            io.to(socket.pendingCallTargetId).emit('call-cancelled', { callerSocketId: socket.id });
            socket.pendingCallTargetId = null;
        }
        socket.leave(roomId);
        socket.to(roomId).emit('partner-disconnected');
        socketRooms.delete(socket.id);
    });

    socket.on('register-uid', (uid) => {
        if (uid) {
            userSockets.set(uid, socket.id);
            console.log(`[Socket] Registered UID: ${uid}`);
        }
    });

    // --- PRIVATE INVITE CALLS ---
    socket.on('send-private-invite', ({ targetUid, senderName, senderPhoto, senderUid }) => {
        const targetSocketId = userSockets.get(targetUid);
        if (targetSocketId) {
            io.to(targetSocketId).emit('incoming-call', { senderUid, senderName, senderPhoto });
        }
    });

    socket.on('accept-private-invite', ({ targetUid, senderUid }) => {
        const targetSocketId = userSockets.get(senderUid);
        if (targetSocketId) {
            const roomId = `private_${Math.min(targetUid, senderUid)}_${Math.max(targetUid, senderUid)}`.replace(/[^a-zA-Z0-9_]/g, '');
            io.to(socket.id).socketsJoin(roomId);
            io.to(targetSocketId).socketsJoin(roomId);
            socketRooms.set(socket.id, roomId);
            socketRooms.set(targetSocketId, roomId);
            io.to(socket.id).emit('matched', { roomId, initiator: true, partnerId: senderUid, partnerName: 'User', partnerLocation: null, partnerIsPremium: false });
            io.to(targetSocketId).emit('matched', { roomId, initiator: false, partnerId: targetUid, partnerName: 'User', partnerLocation: null, partnerIsPremium: false });
        }
    });

    socket.on('decline-private-invite', ({ targetUid, senderUid }) => {
        const targetSocketId = userSockets.get(senderUid);
        if (targetSocketId) io.to(targetSocketId).emit('call-declined', { targetUid });
    });

    // --- TEXT CHAT ---
    // FIX 4: Removed reference to undefined `activeRooms` — was causing silent crash
    socket.on('send-message', ({ roomId, message }) => {
        if (isRateLimited(socket.id, 'message', 333)) return; // ~3 msg/sec
        if (containsFlaggedKeyword(message?.text || '')) {
            console.log(`[SafetySystem] Flagged keyword in room ${roomId}`);
            io.to(roomId).emit('system-disconnect', {
                reason: 'Inappropriate language detected. Connection closed by safety system.'
            });
            // Clean up both sockets in this room
            for (const [sid, rid] of socketRooms.entries()) {
                if (rid === roomId) socketRooms.delete(sid);
            }
            return;
        }
        socket.to(roomId).emit('receive-message', message);
    });

    socket.on('typing', ({ roomId, isTyping }) => {
        socket.to(roomId).emit('partner-typing', isTyping);
    });
});

// Catchall for combined deploy
if (fs.existsSync(buildPath)) {
    app.get('*', (req, res) => {
        res.sendFile(path.join(buildPath, 'index.html'));
    });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`========================================`);
    console.log(`Strangy Signaling Server — PORT: ${PORT}`);
    console.log(`Frontend URL: ${FRONTEND_URL}`);
    console.log(`Started: ${new Date().toISOString()}`);
    console.log(`========================================`);
}).on('error', (err) => {
    console.error('SERVER LISTEN ERROR:', err.code, err.message);
});