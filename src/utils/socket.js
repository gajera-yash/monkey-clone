import io from 'socket.io-client';

// Initialize socket connection
// Connect to the backend server
let SOCKET_URL;

const hostname = window.location.hostname;

if (hostname === 'localhost' || hostname.startsWith('192.168.')) {
    // Development mode (Split frontend/backend) - Localhost or Local IP
    // Backend signaling server runs on 3001 by default
    SOCKET_URL = `http://${hostname}:3001`;
} else if (process.env.REACT_APP_SOCKET_URL) {
    // Explicit env override (only used when NOT localhost)
    SOCKET_URL = process.env.REACT_APP_SOCKET_URL;
} else if (hostname.includes('vercel.app') || hostname.includes('strangy.in')) {
    // Custom subdomain for Railway (Bypasses Jio blocks and Vercel proxy limits)
    SOCKET_URL = 'https://api.strangy.in';
} else {
    // Production URL fallback
    SOCKET_URL = 'https://api.strangy.in';
}

// Ensure URL has protocol and NO trailing slash
if (SOCKET_URL !== '/') {
    // Remove trailing slash if present
    SOCKET_URL = SOCKET_URL.replace(/\/+$/, "");
    
    if (!SOCKET_URL.startsWith('http')) {
        SOCKET_URL = `https://${SOCKET_URL}`;
    }
}

console.log("[SocketDebug] Connecting to:", SOCKET_URL);

const socket = io(SOCKET_URL, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,      // Increased from 5000 — Jio needs more breathing room
    randomizationFactor: 0.5,         // Add jitter to prevent reconnection storms
    timeout: 30000,
    transports: ['polling', 'websocket'], // Polling first for ISP resilience, then upgrade to WS
    upgrade: true,
    secure: true,
    withCredentials: false,
    forceNew: false,
    // Jio/Mobile network resilience — disable perMessageDeflate to avoid compression issues
    perMessageDeflate: false,
    // Path override — ensure we're hitting the right endpoint
    path: '/socket.io/'
});

// Implement a fallback if polling fails too (rare)
socket.io.on('error', (error) => {
    console.warn("[SocketDebug] IO Error:", error);
});

// Reconnection monitoring — useful for debugging Jio instability
socket.io.on('reconnect_attempt', (attempt) => {
    console.log(`[SocketDebug] Reconnection attempt #${attempt}`);
    // On 3rd+ attempt, force polling-only to avoid WebSocket issues on Jio
    if (attempt >= 3) {
        socket.io.opts.transports = ['polling'];
        console.log('[SocketDebug] Forcing polling-only transport after 3 failed attempts');
    }
});

socket.io.on('reconnect', (attempt) => {
    console.log(`[SocketDebug] Reconnected after ${attempt} attempts`);
    // Restore WebSocket upgrade capability after successful reconnect
    socket.io.opts.transports = ['polling', 'websocket'];
});

socket.io.on('reconnect_failed', () => {
    console.error('[SocketDebug] All reconnection attempts failed!');
});

// Global debug listeners
socket.on('connect', () => {
    console.log("[SocketDebug] Connected to server!", socket.id, "| Transport:", socket.io.engine?.transport?.name);
});
socket.on('connect_error', (err) => console.error("[SocketDebug] Connection Error:", err.message));
socket.on('disconnect', (reason) => console.warn("[SocketDebug] Disconnected:", reason));

export { SOCKET_URL };
export const API_BASE_URL = SOCKET_URL;
export default socket;
