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
} else if (hostname.includes('vercel.app') || hostname.includes('strangy.in')) {
    // New Custom Subdomain for Railway (Bypasses Jio blocks and Vercel proxy limits)
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
    reconnectionDelayMax: 5000,
    timeout: 30000,
    transports: ['polling', 'websocket'], // Polling first for ISP resilience, then upgrade to WS
    upgrade: true,
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
});
socket.on('connect_error', (err) => console.error("[SocketDebug] Connection Error:", err.message));
socket.on('disconnect', (reason) => console.warn("[SocketDebug] Disconnected:", reason));

export { SOCKET_URL };
export const API_BASE_URL = SOCKET_URL;
export default socket;
