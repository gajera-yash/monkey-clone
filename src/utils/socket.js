import io from 'socket.io-client';

// ========================================================================
// Strangy Socket Connection — with Jio DPI Bypass & Multi-URL Fallback
// ========================================================================

// --- URL Configuration ---
let SOCKET_URL;
let FALLBACK_URL = null;

const hostname = window.location.hostname;

if (hostname === 'localhost' || hostname.startsWith('192.168.')) {
    SOCKET_URL = `http://${hostname}:3001`;
} else if (process.env.REACT_APP_SOCKET_URL) {
    SOCKET_URL = process.env.REACT_APP_SOCKET_URL;
    FALLBACK_URL = 'https://strangy-production-9664.up.railway.app';
} else {
    SOCKET_URL = 'https://api.strangy.in';
    FALLBACK_URL = 'https://strangy-production-9664.up.railway.app';
}

// Clean URLs
SOCKET_URL = SOCKET_URL.replace(/\/+$/, "");
if (!SOCKET_URL.startsWith('http') && SOCKET_URL !== '/') {
    SOCKET_URL = `https://${SOCKET_URL}`;
}
if (FALLBACK_URL) FALLBACK_URL = FALLBACK_URL.replace(/\/+$/, "");

// Detect mobile network (Jio/Airtel etc)
const isMobileNetwork = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);

console.log("[Socket] Primary:", SOCKET_URL, "| Mobile:", isMobileNetwork);

// --- Create Socket ---
// CRITICAL: Custom path '/s/' bypasses Jio DPI which detects & blocks '/socket.io/'
const socket = io(SOCKET_URL, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 10,  // Try 10 times on primary before fallback
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    randomizationFactor: 0.5,
    timeout: 20000,
    // WebSocket first on mobile — WSS on 443 looks like HTTPS to Jio DPI
    // Polling first on desktop — more reliable through corporate proxies
    transports: isMobileNetwork ? ['websocket', 'polling'] : ['polling', 'websocket'],
    upgrade: true,
    secure: true,
    withCredentials: false,
    perMessageDeflate: false,
    path: '/s/'   // Custom path — Jio DPI blocks '/socket.io/'
});

// --- Fallback Logic ---
let consecutiveErrors = 0;
let hasSwitchedToFallback = false;
let isConnecting = false;

const switchToFallback = () => {
    if (!FALLBACK_URL || hasSwitchedToFallback) return;
    hasSwitchedToFallback = true;
    consecutiveErrors = 0;

    console.log(`[Socket] 🔄 Switching to fallback: ${FALLBACK_URL}`);

    // Change the URI on the existing socket manager — keeps same socket instance!
    socket.io.uri = FALLBACK_URL;
    
    // Reset transport strategy for fallback URL
    socket.io.opts.transports = ['polling', 'websocket'];
    
    // Reset reconnection attempts for fresh start
    socket.io.opts.reconnectionAttempts = Infinity;

    // Force reconnect to new URL
    socket.disconnect();
    setTimeout(() => socket.connect(), 500);
};

// --- Event Listeners ---
socket.io.on('error', (error) => {
    console.warn("[Socket] IO-level error:", error?.message || error);
});

socket.io.on('reconnect_attempt', (attempt) => {
    console.log(`[Socket] Reconnect attempt #${attempt}`);

    // Progressive transport strategy for Jio bypass:
    if (isMobileNetwork) {
        if (attempt === 2) {
            // Try polling-only (maybe WebSocket is blocked)
            socket.io.opts.transports = ['polling'];
            console.log('[Socket] → Trying polling-only');
        } else if (attempt === 4) {
            // Try WebSocket-only (maybe polling is blocked)
            socket.io.opts.transports = ['websocket'];
            console.log('[Socket] → Trying WebSocket-only');
        } else if (attempt === 6) {
            // Restore both
            socket.io.opts.transports = ['websocket', 'polling'];
            console.log('[Socket] → Trying both transports');
        }
    }
});

socket.io.on('reconnect', (attempt) => {
    console.log(`[Socket] ✅ Reconnected after ${attempt} attempts | Transport:`, socket.io.engine?.transport?.name);
    consecutiveErrors = 0;
    // Restore default transports
    socket.io.opts.transports = isMobileNetwork ? ['websocket', 'polling'] : ['polling', 'websocket'];
});

socket.io.on('reconnect_failed', () => {
    console.error('[Socket] ❌ All reconnection attempts exhausted');
    // Last resort: try fallback URL
    switchToFallback();
});

socket.on('connect', () => {
    consecutiveErrors = 0;
    isConnecting = false;
    const transport = socket.io.engine?.transport?.name || 'unknown';
    console.log(`[Socket] ✅ Connected! ID: ${socket.id} | URL: ${socket.io.uri} | Transport: ${transport}`);
});

socket.on('connect_error', (err) => {
    consecutiveErrors++;
    const msg = err?.message || 'Unknown error';
    console.error(`[Socket] ❌ Connect error #${consecutiveErrors}: ${msg}`);

    // After 4 consecutive errors on primary, try fallback
    if (consecutiveErrors >= 4 && !hasSwitchedToFallback) {
        switchToFallback();
    }
});

socket.on('disconnect', (reason) => {
    console.warn("[Socket] Disconnected:", reason);
    // If server-initiated, auto-reconnect is handled by Socket.IO
    // If client-initiated (transport close), we may need manual reconnect
    if (reason === 'transport close' || reason === 'transport error') {
        consecutiveErrors++;
    }
});

// --- Exports ---
export { SOCKET_URL };
export const API_BASE_URL = SOCKET_URL;
export default socket;
