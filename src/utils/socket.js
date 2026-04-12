import io from 'socket.io-client';

// Initialize socket connection
// Connect to the backend server
let SOCKET_URL;

const hostname = window.location.hostname;

if (process.env.REACT_APP_SOCKET_URL) {
    SOCKET_URL = process.env.REACT_APP_SOCKET_URL;
} else if (hostname === 'localhost' || hostname.startsWith('192.168.')) {
    // Development mode (Split frontend/backend) - Localhost or Local IP
    // Backend signaling server runs on 3001 by default
    SOCKET_URL = `http://${hostname}:3001`;
} else if (hostname.includes('vercel.app')) {
    // Railway Production URL for Vercel
    SOCKET_URL = 'https://strangy-production-56d4.up.railway.app';
} else {
    // For custom domain strangy.in served by Vercel, use the same origin!
    // Vercel vercel.json will proxy /socket.io/ to Railway.
    // This perfectly bypasses ISP blocks on railway.app domains!
    SOCKET_URL = window.location.origin;
}

// Ensure URL has protocol and NO trailing slash
if (SOCKET_URL !== '/' && SOCKET_URL !== window.location.origin) {
    // Remove trailing slash if present
    SOCKET_URL = SOCKET_URL.replace(/\/+$/, "");
    
    if (!SOCKET_URL.startsWith('http')) {
        SOCKET_URL = `https://${SOCKET_URL}`;
    }
}

console.log("[SocketDebug] Connecting to:", SOCKET_URL);

// Use ONLY POLLING for Vercel Proxied connections because Vercel doesn't support WebSocket proxying.
// This is the ultimate fix for Jio networks blocking direct websocket/railway connections.
const isVercelProxied = SOCKET_URL === window.location.origin;

const socket = io(SOCKET_URL, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 30000,
    transports: isVercelProxied ? ['polling'] : ['polling', 'websocket'], // Strict polling if proxied
    upgrade: !isVercelProxied, // Disable upgrade if proxied through Vercel
    secure: true,
    withCredentials: false
});

// Implement a fallback if polling fails too (rare)
socket.io.on('error', (error) => {
    console.warn("[SocketDebug] IO Error:", error);
});

// Global debug listeners
socket.on('connect', () => {
    console.log("[SocketDebug] Connected to server!", socket.id);
    // Reset to preferred transport order on successful connection
    socket.io.opts.transports = ['websocket', 'polling'];
});
socket.on('connect_error', (err) => console.error("[SocketDebug] Connection Error:", err.message));
socket.on('disconnect', (reason) => console.warn("[SocketDebug] Disconnected:", reason));

export { SOCKET_URL };
export const API_BASE_URL = SOCKET_URL;
export default socket;
