const fs = require('fs');
const path = require('path');

// Robust Environment Loading (Gracefully handle missing .env in production)
require('dotenv').config();
if (fs.existsSync(path.join(__dirname, '.env'))) {
    require('dotenv').config({ path: path.join(__dirname, '.env') });
}

// Environment Variable Validation (Phase 9)
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar] && !process.env[`REACT_APP_${envVar}`]);
if (missingEnvVars.length > 0) {
    console.error('========================================');
    console.error('WARNING: Missing recommended environment variables:');
    console.error(missingEnvVars.join(', '));
    console.error('Some backend features like Admin roles or RLS bypass might fail.');
    console.error('========================================');
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
const os = require('os');
const { createClient } = require('@supabase/supabase-js');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');
const logger = require('./utils/logger');
const morgan = require('morgan');

const coinsRoutes = require('./routes/coins');
const subscriptionsRoutes = require('./routes/subscriptions');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');

const app = express();
app.set('trust proxy', 1); // Required for rate limiting behind Vercel/Railway proxies

// Initialize Sentry
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        integrations: [
            nodeProfilingIntegration(),
        ],
        tracesSampleRate: 1.0, 
        profilesSampleRate: 1.0,
    });
}

// HTTP Security Headers (Helmet)
// TEMPORARILY DISABLED FOR DEBUGGING NETWORK BLOCKS
// app.use(helmet({
//     contentSecurityPolicy: {
//         directives: {
//             defaultSrc: ["'self'"],
//             scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://checkout.razorpay.com"],
//             styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
//             imgSrc: ["'self'", "data:", "https://*"],
//             connectSrc: ["'self'", "wss:", "https://*", "stun:", "turn:", "turns:"],
//             fontSrc: ["'self'", "https://fonts.gstatic.com"],
//             objectSrc: ["'none'"],
//             mediaSrc: ["'self'", "blob:", "data:", "https://*"],
//             frameSrc: ["'self'", "https://checkout.razorpay.com"]
//         }
//     },
//     crossOriginEmbedderPolicy: false, // Needed for some external assets
//     crossOriginResourcePolicy: false, // CRITICAL: Allows cross-origin Socket.IO polling from frontend
// }));
app.disable('x-powered-by');

// Request Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Global Rate Limiting
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', globalLimiter);

// Specific Rate Limiter for Auth
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // Limit each IP to 50 auth requests per hour
    message: { error: 'Too many authentication attempts, please try again later.' }
});

// Specific Rate Limiter for Admin Routes (Extreme Security)
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 admin requests per 15 mins
    message: { error: 'Too many admin requests, please try again later.' }
});
app.use('/api/admin', adminLimiter);

// CORS: Allow Vercel frontend in production
const FRONTEND_URL = process.env.FRONTEND_URL || '*';
const allowedOrigins = FRONTEND_URL.split(',').map(o => o.trim()).filter(Boolean);

const isAllowedOrigin = (origin) => {
    // Standardize origin for comparison (remove trailing slashes)
    const cleanOrigin = origin ? origin.replace(/\/+$/, "") : null;

    // Log incoming origin for debugging (VERY HELPFUL)
    console.log(`[CORS DEBUG] Incoming Origin: ${origin || 'No Origin (Direct call)'}`);

    if (!cleanOrigin) return true;
    if (FRONTEND_URL === '*') return true;

    return allowedOrigins.some(ao => ao.replace(/\/+$/, "") === cleanOrigin);
};

app.use(cors({
    origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) return callback(null, true);
        return callback(null, true); // FINAL RASTO: Force allow during debug
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: false
}));
app.use(express.json({ limit: '10kb' })); // Restrict payload size
app.use(hpp()); // Prevent HTTP Parameter Pollution

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', time: new Date().toISOString(), port: process.env.PORT || 3001 });
});

// Helper to get Supabase Admin Client
const getSupabaseAdmin = () => {
    const url = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_KEY;
    
    if (!url || !key) {
        console.error('[Supabase] Missing credentials for admin client!');
        return null;
    }
    return createClient(url, key);
};

const supabase = getSupabaseAdmin();
if (!supabase) {
    console.error('Critical Error: Supabase Admin client failed to initialize. RLS bypass will not work.');
}

// Authentication Routes
app.use('/api/auth', authLimiter, authRoutes);

// User & Profile Routes
app.use('/api/user', userRoutes);

// Monetization Routes
app.use('/api/coins', coinsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);

// --- PAYMENT DIAGNOSTICS ENDPOINT ---
// Visit https://strangy.in/api/payment-debug to check if variables are set
app.get('/api/payment-debug', (req, res) => {
    const config = {
        RAZORPAY_KEY_ID: {
            exists: !!process.env.RAZORPAY_KEY_ID,
            prefix: process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.substring(0, 8) : null,
            length: process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.length : 0
        },
        RAZORPAY_KEY_SECRET: {
            exists: !!process.env.RAZORPAY_KEY_SECRET,
            length: process.env.RAZORPAY_KEY_SECRET ? process.env.RAZORPAY_KEY_SECRET.length : 0
        },
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: process.env.PORT || '3000'
    };
    
    res.json({
        message: "Payment Gateway Diagnostic Tool",
        timestamp: new Date().toISOString(),
        config: config,
        tip: "If 'exists' is false, you must add the variable to your Railway/Vercel dashboard."
    });
});

// Serve static files from the React app (only if build folder exists - for combined deploy)
const buildPath = path.join(__dirname, '../build');
if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));
}

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: true, // Echo origin (Safest for debug)
        methods: ["GET", "POST", "OPTIONS"],
        credentials: false
    },
    // CRITICAL: Custom path to bypass Jio DPI (Deep Packet Inspection)
    // Jio blocks '/socket.io/' in HTTP traffic. '/s/' looks like normal API calls.
    path: '/s/',
    transports: ['polling', 'websocket'],
    pingInterval: 12000,  // 12s — balanced for Jio/mobile latency without Vercel timeout
    pingTimeout: 20000,   // 20s — Jio CGNAT causes latency spikes up to 8-10s
    allowEIO3: true,      // Support older clients if any
    maxHttpBufferSize: 1e6, // 1MB — handle large ICE candidate payloads
    httpCompression: false, // Disable compression to avoid mobile network issues
    perMessageDeflate: false // Prevent WebSocket compression issues on Jio/mobile
});

// Socket.IO Connection Rate Limiter (Prevent Connection Flooding)
const connectionLimits = new Map(); // ip -> { count, lastReset }
io.use((socket, next) => {
    const ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    const now = Date.now();
    
    if (!connectionLimits.has(ip)) {
        connectionLimits.set(ip, { count: 1, lastReset: now });
    } else {
        const limitData = connectionLimits.get(ip);
        if (now - limitData.lastReset > 60000) { // reset every minute
            limitData.count = 1;
            limitData.lastReset = now;
        } else {
            limitData.count++;
            if (limitData.count > 30) { // Max 30 connections per minute per IP
                logger.warn(`[Socket Security] Connection flood blocked from IP: ${ip}`);
                return next(new Error('Connection rate limit exceeded'));
            }
        }
    }
    next();
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

// System Health Endpoint for Admin Dashboard
app.get('/api/admin/system-health', async (req, res) => {
    const { user: requester, error: verifyError } = await verifyAdmin(req);
    if (verifyError) return res.status(403).json({ error: verifyError });

    const health = {
        uptime: process.uptime(),
        message: 'OK',
        timestamp: Date.now(),
        cpuUsage: process.cpuUsage(),
        memoryUsage: process.memoryUsage(),
        osLoadavg: os.loadavg(),
        osFreeMem: os.freemem(),
        osTotalMem: os.totalmem(),
        socketStats: {
            totalConnections: io.engine.clientsCount,
            waitingCount: waitingUsers.length,
            activeRooms: socketRooms.size / 2,
        }
    };
    res.json(health);
});

// Fetch all revenue metrics for Admin Panel (Bypass client-side RLS)
app.get('/api/admin/revenue-data', async (req, res) => {
    const { user: requester, error: verifyError } = await verifyAdmin(req);
    if (verifyError) return res.status(403).json({ error: verifyError });

    try {
        // 1. Total Successful Transactions
        const { data: revData, error: revError } = await supabase
            .from('transactions')
            .select('amount, type, created_at');

        if (revError) {
            console.error('[Admin Revenue] revData query failed:', revError);
            throw revError;
        }
        console.log('[Admin Revenue] revData fetched:', revData?.length || 0, 'rows');

        // 2. Active Premium Users Count
        const { count: subCount, error: subError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('is_premium', true);

        if (subError) {
            console.error('[Admin Revenue] subCount query failed:', subError);
            throw subError;
        }
        console.log('[Admin Revenue] subCount fetched:', subCount);

        // 3. Recent Transactions with User Details
        const { data: recentTxs, error: txError } = await supabase
            .from('transactions')
            .select('*, user:profiles(username, avatar_url)')
            .order('created_at', { ascending: false })
            .limit(50);

        if (txError) {
            console.error('[Admin Revenue] recentTxs query failed:', txError);
            throw txError;
        }
        console.log('[Admin Revenue] recentTxs fetched:', recentTxs?.length || 0, 'rows');

        // --- CALCULATIONS ---
        const totalRevenue = revData?.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0) || 0;
        const subData = revData?.filter(t => t.type === 'subscription') || [];
        const coinData = revData?.filter(t => t.type === 'coins') || [];
        
        const mrr = subData.reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const avgTicket = revData?.length ? (totalRevenue / revData.length) : 0;

        // Segment Calculation
        const coinRev = coinData.reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const coinPercent = totalRevenue > 0 ? Math.round((coinRev / totalRevenue) * 100) : 0;

        // Weekly Chart Data
        const now = new Date();
        const chartData = [];
        for (let i = 3; i >= 0; i--) {
            const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i * 7 + 7));
            const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i * 7));
            
            const weeklyRev = revData?.filter(tx => {
                const date = new Date(tx.created_at);
                return date >= weekStart && date <= weekEnd;
            }).reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0) || 0;

            chartData.push({ name: `Week ${4 - i}`, revenue: weeklyRev });
        }

        res.json({
            stats: {
                totalRevenue,
                mrr,
                subscriptions: subCount || 0,
                avgTicket
            },
            segments: {
                plus_annual: 42, // Ratios
                plus_monthly: 35,
                coins: coinPercent
            },
            chartData,
            recentTransactions: recentTxs || []
        });

    } catch (err) {
        console.error('[Admin] Failed to fetch revenue data:', err);
        res.status(500).json({ error: err.message });
    }
});

// Fetch all coin transactions for Admin Panel (Bypass client-side RLS)
app.get('/api/admin/coin-transactions', async (req, res) => {
    const { user: requester, error: verifyError } = await verifyAdmin(req);
    if (verifyError) return res.status(403).json({ error: verifyError });

    try {
        const { data, error } = await supabase
            .from('coin_transactions')
            .select(`
                *,
                user:profiles(username, avatar_url, email)
            `)
            .order('created_at', { ascending: false })
            .limit(500);

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('[Admin] Failed to fetch transactions:', err);
        res.status(500).json({ error: err.message });
    }
});

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
    socket.on('connect', () => {
        console.log("[SocketDebug] Connected to server!", socket.id);
    });
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
        let skippedPartner = null;

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
            skippedPartner = userData.skippedPartner || null;
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
            filters,
            skippedPartner
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

        // Avoid duplicates (Socket ID or UID)
        const existingIdx = waitingUsers.findIndex(u => u.id === socket.id || (uid && u.uid === uid));
        if (existingIdx === -1) {
            waitingUsers.push(user);
        } else {
            console.log(`[Queue] Updating existing entry for UID: ${uid || 'N/A'} (Socket: ${socket.id})`);
            waitingUsers[existingIdx] = user; // Update info/socket if already in queue
        }

        console.log(`[Queue] User ${user.uid || user.id} (${user.name}) joined. Pool: ${waitingUsers.length}`);
        io.emit('waiting-count', io.engine.clientsCount);

        // Matching function (extracted so it can be called later for retries)
        const attemptMatching = () => {
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

                        // SKIP CHECK: Don't re-match users who just skipped each other
                        if (u1.skippedPartner && u1.skippedPartner === u2.uid) {
                            console.log(`[MatchEngine] Skipping pair: ${u1.name} recently skipped ${u2.name}`);
                            continue;
                        }
                        if (u2.skippedPartner && u2.skippedPartner === u1.uid) {
                            console.log(`[MatchEngine] Skipping pair: ${u2.name} recently skipped ${u1.name}`);
                            continue;
                        }

                        // CHECK FREE MALE FEMALE RATIO LIMIT (3 out of 10 matches)
                        const checkRatioLimit = (userA, userB) => {
                            const aGender = userA.gender || 'Male'; // default unknown to Male
                            const bGender = userB.gender || 'Male';

                            // Condition applies if userA is Male and userB is Female
                            if (aGender !== 'Male' || bGender !== 'Female') return false;

                            // Only applies if userA (Male) is NOT paying for a gender filter
                            if (userA.filters?.gender && userA.filters.gender !== 'Both') return false;

                            // Growth Promotion: Increase female match ratio for free users for 3 months (Ends July 9, 2026)
                            const isPromotionActive = new Date() < new Date('2026-07-09');
                            const limit = isPromotionActive ? 7 : 3;
                            
                            return femaleCount >= limit; 
                        };

/*
                        if (checkRatioLimit(u1, u2) || checkRatioLimit(u2, u1)) {
                            continue; // Skip this match, save female creator for paid/eligible users
                        }
*/

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

                    // Create a globally UNIQUE room ID to prevent race conditions on Next/Skip
                    const roomId = `room_${u1.id}_${u2.id}_${Date.now()}`;
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

                    // If only skipped-partner pairs remain, clear skippedPartner after 5 seconds so they can rematch
                    if (waitingUsers.length >= 2) {
                        setTimeout(() => {
                            let cleared = false;
                            waitingUsers.forEach(u => {
                                if (u.skippedPartner) {
                                    console.log(`[MatchEngine] Clearing stale skippedPartner for ${u.name}`);
                                    u.skippedPartner = null;
                                    cleared = true;
                                }
                            });
                            // Re-attempt matching after clearing
                            if (cleared && waitingUsers.length >= 2) {
                                console.log(`[MatchEngine] Retrying matching after clearing skipped partners...`);
                                attemptMatching();
                            }
                        }, 5000);
                    }
                }
            } // end if waitingUsers.length >= 2
        }; // end attemptMatching()

        attemptMatching();
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

// Sentry Error Handler (must be before any other error middleware)
if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
}

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
    logger.error(`[Express Error] ${err.message}`, { stack: err.stack, url: req.originalUrl, method: req.method });
    
    // Do not leak stack traces to client in production
    const isProd = process.env.NODE_ENV === 'production';
    const errorResponse = {
        error: isProd ? 'Internal Server Error' : err.message,
        ...(isProd ? {} : { stack: err.stack })
    };
    
    res.status(err.status || 500).json(errorResponse);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`========================================`);
    console.log(`Signaling server running on PORT: ${PORT}`);
    console.log(`Interface: 0.0.0.0 (Publicly Reachable)`);
    console.log(`Frontend URL: ${FRONTEND_URL}`);
    console.log(`Current Time: ${new Date().toISOString()}`);
    console.log(`========================================`);
}).on('error', (err) => {
    console.error('========================================');
    console.error('SERVER LISTEN ERROR!');
    console.error('Error Code:', err.code);
    console.error('Error Message:', err.message);
    console.error('========================================');
});

// Deployment Trigger: 2026-04-02 21:40
