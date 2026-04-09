const fs = require('fs');
const path = require('path');
if (fs.existsSync(path.join(__dirname, '.env'))) {
    require('dotenv').config({ path: path.join(__dirname, '.env') });
}

// ============================================================
// GLOBAL EXCEPTION HANDLERS
// ============================================================
process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught Exception:', err.message);
    console.error(err.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    console.error('[FATAL] Unhandled Rejection:', reason);
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
// FIX 1: CORS — debug bypass removed, proper validation
// ============================================================
const FRONTEND_URL = process.env.FRONTEND_URL || '*';
const allowedOrigins = FRONTEND_URL.split(',').map(o => o.trim()).filter(Boolean);

const isAllowedOrigin = (origin) => {
    const clean = origin ? origin.replace(/\/+$/, '') : null;
    if (!clean) return true;
    if (FRONTEND_URL === '*') return true;
    return allowedOrigins.some(ao => ao.replace(/\/+$/, '') === clean);
};

app.use(cors({
    origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) return callback(null, true);
        console.warn(`[CORS] Blocked: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: false
}));

app.use(express.json());

// ============================================================
// SUPABASE
// ============================================================
const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseServiceKey)
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

// ============================================================
// ROUTES
// ============================================================
app.use('/api/coins', coinsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);

const buildPath = path.join(__dirname, '../build');
if (fs.existsSync(buildPath)) app.use(express.static(buildPath));

// ============================================================
// HTTP + SOCKET SERVER
// ============================================================
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (isAllowedOrigin(origin)) return callback(null, true);
            return callback(new Error('Not allowed by CORS'));
        },
        methods: ['GET', 'POST', 'OPTIONS'],
        credentials: false
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
});

// ============================================================
// IN-MEMORY STATE
// ============================================================
let waitingUsers = [];
const socketRooms    = new Map(); // socketId  -> roomId
const userSockets    = new Map(); // uid       -> socketId
const userMatchHistory = new Map(); // uid     -> string[]
const onlineCreators = new Map(); // uid       -> { ...data, socketId }
const socketRateLimits = new Map(); // "sid:event" -> timestamp

// ============================================================
// UTILITIES
// ============================================================
const isRateLimited = (socketId, event, limitMs = 1000) => {
    const key = `${socketId}:${event}`;
    const now = Date.now();
    if (now - (socketRateLimits.get(key) || 0) < limitMs) return true;
    socketRateLimits.set(key, now);
    return false;
};

const FLAGGED_KEYWORDS = [
    'cp', 'child porn', 'underage', 'lolita', 'jailbait',
    'minor sex', 'kill yourself', 'kys', 'suicide method',
    'bomb threat', 'shoot school', 'terrorist'
];
const containsFlaggedKeyword = (text) =>
    FLAGGED_KEYWORDS.some(kw => (text || '').toLowerCase().includes(kw));

// Geo-block cache
let geoBlockCache = [], geoBlockLastFetch = 0;
const getGeoBlocks = async () => {
    if (!supabase) return [];
    if (Date.now() - geoBlockLastFetch < 60_000) return geoBlockCache;
    try {
        const { data } = await supabase
            .from('geo_blocks').select('country_code').eq('is_active', true);
        geoBlockCache = (data || []).map(r => r.country_code.toUpperCase());
        geoBlockLastFetch = Date.now();
    } catch { /* use cache */ }
    return geoBlockCache;
};

const checkAutoDisconnect = async (uid) => {
    if (!supabase || !uid) return false;
    try {
        const { count } = await supabase.from('reports')
            .select('id', { count: 'exact', head: true })
            .eq('reported_id', uid)
            .gte('created_at', new Date(Date.now() - 3_600_000).toISOString());
        return (count || 0) >= 3;
    } catch { return false; }
};

// ============================================================
// FIX 2: MATCHING ENGINE — extracted, capped, no recursion
// ============================================================
const calculateAge = (birthdate) => {
    if (!birthdate) return null;
    const b = new Date(birthdate), t = new Date();
    let age = t.getFullYear() - b.getFullYear();
    const m = t.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
    return age;
};

const matchesFilters = (user, filterer) => {
    const f = filterer.filters || {};
    if (f.gender && f.gender !== 'Both' && user.gender !== f.gender) return false;
    if (f.ageRange && f.ageRange !== 'Any') {
        const age = calculateAge(user.birthdate);
        if (age === null) return false;
        if (f.ageRange === '18-25' && (age < 18 || age > 25)) return false;
        if (f.ageRange === '26-35' && (age < 26 || age > 35)) return false;
        if (f.ageRange === '36+' && age < 36) return false;
    }
    if (f.location && f.location !== 'Global') {
        const uc = typeof user.location === 'string'
            ? user.location : (user.location?.country || '');
        if (!uc.toLowerCase().includes(f.location.toLowerCase())) return false;
    }
    return true;
};

const checkRatioLimit = (uA, uB) => {
    if ((uA.gender || 'Male') !== 'Male' || (uB.gender || 'Male') !== 'Female') return false;
    if (uA.filters?.gender && uA.filters.gender !== 'Both') return false;
    return (userMatchHistory.get(uA.uid) || []).filter(g => g === 'Female').length >= 3;
};

const recordMatch = (uid, partnerGender) => {
    if (!uid) return;
    const h = userMatchHistory.get(uid) || [];
    h.push(partnerGender || 'Male');
    if (h.length > 10) h.shift();
    userMatchHistory.set(uid, h);
};

const attemptMatching = () => {
    if (waitingUsers.length < 2) return;

    // Sort: paid-filter users first
    waitingUsers.sort((a, b) => {
        const p = u => { const f = u.filters || {}; return (f.gender && f.gender !== 'Both') || (f.ageRange && f.ageRange !== 'Any') || (f.location && f.location !== 'Global') ? 1 : 0; };
        return p(b) - p(a);
    });

    // FIX: Cap at 20 — O(400) max instead of O(n²) unbounded
    const cap = Math.min(waitingUsers.length, 20);
    let i1 = -1, i2 = -1;

    outer: for (let i = 0; i < cap; i++) {
        const u1 = waitingUsers[i];
        for (let j = i + 1; j < cap; j++) {
            const u2 = waitingUsers[j];
            const blocked = (u1.blockedUsers || []).includes(u2.uid) || (u2.blockedUsers || []).includes(u1.uid);
            if (blocked) continue;
            if (u1.skippedPartner === u2.uid || u2.skippedPartner === u1.uid) continue;
            if (checkRatioLimit(u1, u2) || checkRatioLimit(u2, u1)) continue;
            if (!matchesFilters(u2, u1) || !matchesFilters(u1, u2)) continue;
            i1 = i; i2 = j;
            break outer;
        }
    }

    if (i1 !== -1) {
        const u1 = waitingUsers[i1], u2 = waitingUsers[i2];
        waitingUsers.splice(i2, 1);
        waitingUsers.splice(i1, 1);

        const roomId = `room_${u1.id}_${u2.id}_${Date.now()}`;
        console.log(`[Match] ${u1.name} <-> ${u2.name} | ${roomId}`);

        recordMatch(u1.uid, u2.gender);
        recordMatch(u2.uid, u1.gender);

        io.to(u1.id).socketsJoin(roomId);
        io.to(u2.id).socketsJoin(roomId);
        socketRooms.set(u1.id, roomId);
        socketRooms.set(u2.id, roomId);

        io.to(u1.id).emit('matched', { roomId, initiator: true, partnerId: u2.uid, partnerName: u2.name, partnerLocation: u2.location, partnerIsPremium: u2.isPremium, partnerGender: u2.gender, partnerBirthdate: u2.birthdate });
        io.to(u2.id).emit('matched', { roomId, initiator: false, partnerId: u1.uid, partnerName: u1.name, partnerLocation: u1.location, partnerIsPremium: u1.isPremium, partnerGender: u1.gender, partnerBirthdate: u1.birthdate });

    } else {
        // FIX: One-time guarded retry — no unbounded recursion
        if (waitingUsers.length >= 2) {
            let fired = false;
            setTimeout(() => {
                if (fired) return;
                fired = true;
                let cleared = false;
                waitingUsers.forEach(u => { if (u.skippedPartner) { u.skippedPartner = null; cleared = true; } });
                if (cleared && waitingUsers.length >= 2) attemptMatching();
            }, 5000);
        }
    }
};

// ============================================================
// REST ENDPOINTS
// ============================================================
app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.get('/api/status', (_, res) => res.json({
    totalConnections: io.engine.clientsCount,
    waitingCount: waitingUsers.length,
    activeRooms: Math.floor(socketRooms.size / 2),
    queue: waitingUsers.map(u => ({ id: u.id, name: u.name, uid: u.uid }))
}));

app.get('/api/geo-blocks', async (_, res) => {
    res.json({ blocked_countries: await getGeoBlocks() });
});

const verifyAdmin = async (req) => {
    const token = (req.headers.authorization || '').split(' ')[1];
    if (!token) return { error: 'No token' };
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) return { error: 'Invalid session' };
        const { data: a } = await supabase.from('admin_team_members').select('role').eq('user_id', user.id).eq('is_active', true).single();
        if (a?.role === 'admin') return { user };
        const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (p?.role === 'admin') return { user };
        return { error: 'Access denied' };
    } catch { return { error: 'Verification failed' }; }
};

app.post('/api/admin/create-user', async (req, res) => {
    const { error } = await verifyAdmin(req);
    if (error) return res.status(403).json({ error });
    const { email, password, metadata } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    try {
        const { data, error: e } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: metadata || {} });
        if (e) throw e;
        res.json({ user: data.user });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/flag-report', async (req, res) => {
    const { reportedUid } = req.body;
    if (!reportedUid) return res.json({ disconnect: false });
    const should = await checkAutoDisconnect(reportedUid);
    if (should) {
        const sid = userSockets.get(reportedUid);
        if (sid) {
            const room = socketRooms.get(sid);
            if (room) { io.to(room).emit('system-disconnect', { reason: 'Auto-disconnected: multiple reports.' }); socketRooms.delete(sid); }
            waitingUsers = waitingUsers.filter(u => u.uid !== reportedUid);
        }
    }
    res.json({ disconnect: should });
});

// ============================================================
// SOCKET EVENTS
// ============================================================
io.on('connection', (socket) => {
    console.log(`[+] ${socket.id} | Total: ${io.engine.clientsCount}`);

    // FIX 3: Notify only joining socket, not all
    socket.emit('waiting-count', waitingUsers.length);

    // Creator presence
    socket.on('creator-online', (d) => { if (d?.uid) onlineCreators.set(d.uid, { ...d, socketId: socket.id }); });
    socket.on('creator-offline', (uid) => { if (uid) onlineCreators.delete(uid); });

    // Direct calls
    socket.on('request-direct-call', ({ targetUid, callerData }) => {
        if (isRateLimited(socket.id, 'direct-call', 5000)) return socket.emit('error', { message: 'Please wait.' });
        const tid = onlineCreators.get(targetUid)?.socketId || userSockets.get(targetUid);
        if (tid) { socket.pendingCallTargetId = tid; io.to(tid).emit('incoming-call', { callerSocketId: socket.id, callerData, isNewDirectCall: true }); }
        else socket.emit('direct-call-declined', { reason: 'offline' });
    });

    socket.on('accept-direct-call', ({ callerSocketId, callerData, creatorData }) => {
        const cs = io.sockets.sockets.get(callerSocketId);
        if (cs) cs.pendingCallTargetId = null;
        const roomId = `direct_${callerSocketId}_${socket.id}`;
        waitingUsers = waitingUsers.filter(u => u.id !== callerSocketId && u.id !== socket.id);
        io.to(callerSocketId).socketsJoin(roomId); socket.join(roomId);
        socketRooms.set(callerSocketId, roomId); socketRooms.set(socket.id, roomId);
        io.to(callerSocketId).emit('matched', { roomId, initiator: true, partnerId: creatorData.uid, partnerName: creatorData.name, partnerGender: creatorData.gender || 'Female', isDirectCall: true });
        socket.emit('matched', { roomId, initiator: false, partnerId: callerData?.uid, partnerName: callerData?.name || 'User', isDirectCall: true });
    });

    socket.on('decline-direct-call', ({ callerSocketId }) => {
        const cs = io.sockets.sockets.get(callerSocketId);
        if (cs) { cs.pendingCallTargetId = null; io.to(callerSocketId).emit('direct-call-declined', { reason: 'declined' }); }
    });

    socket.on('cancel-direct-call', ({ targetUid }) => {
        const tid = onlineCreators.get(targetUid)?.socketId || userSockets.get(targetUid);
        if (tid) io.to(tid).emit('call-cancelled', { callerSocketId: socket.id });
        socket.pendingCallTargetId = null;
    });

    // NSFW strikes
    socket.on('system-violation', async ({ reason, uid }) => {
        if (!supabase || !uid) return;
        try {
            const { data: p } = await supabase.from('profiles').select('strike_count').eq('id', uid).single();
            const s = (p?.strike_count || 0) + 1;
            const ban_expiry = s === 2 ? new Date(Date.now() + 86_400_000).toISOString() : null;
            await supabase.from('profiles').update({ strike_count: s, last_strike_at: new Date().toISOString(), is_blocked: s >= 2, ban_expiry, ban_reason: `System: ${reason} (Strike ${s})` }).eq('id', uid);
            await supabase.from('user_strikes').insert({ user_id: uid, strike_number: s, reason, admin_id: null, action_taken: s === 1 ? 'warning' : s === 2 ? '24hr_ban' : 'permanent_ban', expires_at: ban_expiry });
        } catch (e) { console.error('[Strike]', e.message); }
    });

    // Matchmaking
    socket.on('join-waiting', async (userData) => {
        if (isRateLimited(socket.id, 'join', 2000)) return;

        let name = 'Stranger', uid = null, blockedUsers = [], location = null;
        let isPremium = false, gender = null, birthdate = null, filters = {}, skippedPartner = null;

        if (typeof userData === 'string') { name = userData; }
        else if (userData && typeof userData === 'object') {
            ({ uid = null, isPremium = false, gender = null, birthdate = null, filters = {}, skippedPartner = null } = userData);
            name = userData.name || 'Stranger';
            blockedUsers = userData.blockedUsers || [];
            location = userData.location || null;
            gender = userData.ownGender || null;
            birthdate = userData.ownBirthdate || null;
        }

        const user = { id: socket.id, name, uid, blockedUsers, location, isPremium, gender, birthdate, filters, skippedPartner };

        // Geo-block
        const userCountry = typeof location === 'object' ? (location?.country || '') : (location || '');
        if (userCountry) {
            try {
                const blocked = await getGeoBlocks();
                if (blocked.some(c => c === userCountry.toUpperCase() || userCountry.toLowerCase().includes(c.toLowerCase()))) {
                    socket.emit('geo-blocked', { reason: 'Your country is currently restricted.' });
                    return;
                }
            } catch (e) { console.error('[GeoBlock]', e.message); }
        }

        const idx = waitingUsers.findIndex(u => u.id === socket.id);
        if (idx === -1) waitingUsers.push(user); else waitingUsers[idx] = user;

        console.log(`[Queue] ${name} joined. Pool: ${waitingUsers.length}`);
        socket.emit('waiting-count', waitingUsers.length); // FIX 3
        attemptMatching();
    });

    // WebRTC signaling
    socket.on('offer', ({ offer, roomId }) => socket.to(roomId).emit('offer', offer));
    socket.on('answer', ({ answer, roomId }) => socket.to(roomId).emit('answer', answer));
    socket.on('ice-candidate', ({ candidate, roomId }) => socket.to(roomId).emit('ice-candidate', candidate));
    socket.on('share-log-id', ({ logId, roomId }) => { socket.currentLogId = logId; socket.to(roomId).emit('share-log-id', { logId }); });

    // Disconnect
    socket.on('disconnect', async () => {
        console.log(`[-] ${socket.id} | Remaining: ${io.engine.clientsCount - 1}`);

        if (socket.currentLogId && supabase) {
            try {
                const { data: log } = await supabase.from('chat_logs').select('start_time, end_time').eq('id', socket.currentLogId).single();
                if (log && !log.end_time) {
                    const end = new Date();
                    await supabase.from('chat_logs').update({ end_time: end.toISOString(), duration: Math.max(0, Math.floor((end - new Date(log.start_time)) / 1000)) }).eq('id', socket.currentLogId);
                }
            } catch (e) { console.error('[LogCleanup]', e.message); }
        }

        if (socket.pendingCallTargetId) { io.to(socket.pendingCallTargetId).emit('call-cancelled', { callerSocketId: socket.id }); socket.pendingCallTargetId = null; }

        waitingUsers = waitingUsers.filter(u => u.id !== socket.id);

        const roomId = socketRooms.get(socket.id);
        if (roomId) { socket.to(roomId).emit('partner-disconnected'); socketRooms.delete(socket.id); }

        for (const [uid, sid] of userSockets) { if (sid === socket.id) { userSockets.delete(uid); break; } }
        for (const [uid, c] of onlineCreators) { if (c.socketId === socket.id) { onlineCreators.delete(uid); break; } }

        setTimeout(() => {
            for (const key of socketRateLimits.keys()) { if (key.startsWith(`${socket.id}:`)) socketRateLimits.delete(key); }
            io.emit('waiting-count', waitingUsers.length);
        }, 100);
    });

    socket.on('leave-room', ({ roomId }) => {
        if (socket.pendingCallTargetId) { io.to(socket.pendingCallTargetId).emit('call-cancelled', { callerSocketId: socket.id }); socket.pendingCallTargetId = null; }
        socket.leave(roomId); socket.to(roomId).emit('partner-disconnected'); socketRooms.delete(socket.id);
    });

    socket.on('register-uid', (uid) => { if (uid) { userSockets.set(uid, socket.id); console.log(`[UID] ${uid}`); } });

    // Private invites
    socket.on('send-private-invite', ({ targetUid, senderName, senderPhoto, senderUid }) => {
        const tid = userSockets.get(targetUid);
        if (tid) io.to(tid).emit('incoming-call', { senderUid, senderName, senderPhoto });
    });

    socket.on('accept-private-invite', ({ targetUid, senderUid }) => {
        const tid = userSockets.get(senderUid);
        if (!tid) return;
        const roomId = `private_${Math.min(targetUid, senderUid)}_${Math.max(targetUid, senderUid)}`.replace(/[^a-zA-Z0-9_]/g, '');
        io.to(socket.id).socketsJoin(roomId); io.to(tid).socketsJoin(roomId);
        socketRooms.set(socket.id, roomId); socketRooms.set(tid, roomId);
        io.to(socket.id).emit('matched', { roomId, initiator: true, partnerId: senderUid, partnerName: 'User', partnerLocation: null, partnerIsPremium: false });
        io.to(tid).emit('matched', { roomId, initiator: false, partnerId: targetUid, partnerName: 'User', partnerLocation: null, partnerIsPremium: false });
    });

    socket.on('decline-private-invite', ({ senderUid }) => {
        const tid = userSockets.get(senderUid);
        if (tid) io.to(tid).emit('call-declined');
    });

    // Text chat
    // FIX 4: activeRooms undefined reference removed — socketRooms used instead
    socket.on('send-message', ({ roomId, message }) => {
        if (isRateLimited(socket.id, 'message', 333)) return;
        if (containsFlaggedKeyword(message?.text || '')) {
            io.to(roomId).emit('system-disconnect', { reason: 'Inappropriate language detected.' });
            for (const [sid, rid] of socketRooms) { if (rid === roomId) socketRooms.delete(sid); }
            return;
        }
        socket.to(roomId).emit('receive-message', message);
    });

    socket.on('typing', ({ roomId, isTyping }) => socket.to(roomId).emit('partner-typing', isTyping));
});

if (fs.existsSync(buildPath)) {
    app.get('*', (_, res) => res.sendFile(path.join(buildPath, 'index.html')));
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log('========================================');
    console.log(`Strangy Server | PORT: ${PORT}`);
    console.log(`Frontend: ${FRONTEND_URL}`);
    console.log(`Started: ${new Date().toISOString()}`);
    console.log('========================================');
}).on('error', (err) => console.error('[SERVER ERROR]', err.code, err.message));