import io from 'socket.io-client';

// ========================================================================
// Strangy Socket Connection — The Ultimate Jio Bypass (Vercel Proxy)
// ========================================================================

const hostname = window.location.hostname;
const isLocalhost = hostname === 'localhost' || hostname.startsWith('192.168.');

// URL Configuration
// For local development, point directly to the local backend.
// For production, we point directly to the backend domain to avoid Vercel Proxy 404 issues.
const RAILWAY_URL = 'https://backend.strangy.in';
let SOCKET_URL = isLocalhost ? `http://${hostname}:3001` : RAILWAY_URL;

// Direct Railway Fallback (if Vercel proxy fails)
let FALLBACK_URL = RAILWAY_URL;

console.log("[Socket] Init via Strategy | Localhost:", isLocalhost);

// --- Create Socket ---
// CRITICAL: Custom path '/s/' bypasses Jio DPI. Vercel vercel.json routes this to the backend.
const socket = io(SOCKET_URL, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    randomizationFactor: 0.5,
    timeout: 20000,
    // Use both polling and websocket to ensure maximum compatibility
    transports: ['polling', 'websocket'],
    upgrade: true, 
    secure: true,
    withCredentials: false,
    perMessageDeflate: false,
    path: '/s/' 
});

// --- Fallback Logic ---
let consecutiveErrors = 0;
let hasSwitchedToFallback = false;

const switchToFallback = () => {
    if (!FALLBACK_URL || hasSwitchedToFallback || isLocalhost) return;
    hasSwitchedToFallback = true;
    consecutiveErrors = 0;

    console.log(`[Socket] 🔄 Vercel Proxy blocked. Switching to direct fallback: ${FALLBACK_URL}`);

    // Change the URI to direct Railway domain
    socket.io.uri = FALLBACK_URL;
    
    // Reset transport strategy for fallback URL (maybe WS works directly)
    socket.io.opts.transports = ['polling', 'websocket'];
    socket.io.opts.upgrade = true;
    
    // Reset reconnection attempts for fresh start
    socket.io.opts.reconnectionAttempts = Infinity;

    // Force reconnect
    socket.disconnect();
    setTimeout(() => socket.connect(), 500);
};

// --- Event Listeners ---
socket.io.on('error', (error) => {
    console.warn("[Socket] IO-level error:", error?.message || error);
});

socket.io.on('reconnect_attempt', (attempt) => {
    console.log(`[Socket] Reconnect attempt #${attempt} via ${hasSwitchedToFallback ? 'Fallback' : 'Vercel Proxy'}`);
});

socket.io.on('reconnect', (attempt) => {
    console.log(`[Socket] ✅ Reconnected after ${attempt} attempts | Transport:`, socket.io.engine?.transport?.name);
    consecutiveErrors = 0;
});

socket.io.on('reconnect_failed', () => {
    console.error('[Socket] ❌ All reconnection attempts exhausted');
    if (!hasSwitchedToFallback) switchToFallback();
});

socket.on('connect', () => {
    consecutiveErrors = 0;
    const transport = socket.io.engine?.transport?.name || 'unknown';
    console.log(`[Socket] ✅ Connected! ID: ${socket.id} | Transport: ${transport} | Proxy: ${!hasSwitchedToFallback && !isLocalhost}`);
});

socket.on('connect_error', (err) => {
    consecutiveErrors++;
    const msg = err?.message || 'Unknown error';
    console.error(`[Socket] ❌ Connect error #${consecutiveErrors}: ${msg}`);

    // After 4 consecutive errors on Vercel Proxy, fall back to direct Railway
    if (consecutiveErrors >= 4 && !hasSwitchedToFallback) {
        switchToFallback();
    }
});

socket.on('disconnect', (reason) => {
    console.warn("[Socket] Disconnected:", reason);
    if (reason === 'transport close' || reason === 'transport error') {
        consecutiveErrors++;
    }
});

// --- Exports ---
export { SOCKET_URL };
// For API calls (like flag-report), always use direct Railway API to avoid Vercel timeouts/payload limits on large uploads
export const API_BASE_URL = 'https://backend.strangy.in';
export default socket;
