import io from 'socket.io-client';

// Initialize socket connection
// Connect to the backend server
let SOCKET_URL;

const hostname = window.location.hostname;

if (hostname === 'localhost' || hostname.startsWith('192.168.')) {
    // Development mode (Split frontend/backend) - Localhost or Local IP
    SOCKET_URL = `http://${hostname}:3000`;
} else if (process.env.REACT_APP_SOCKET_URL) {
    SOCKET_URL = process.env.REACT_APP_SOCKET_URL;
} else if (hostname.includes('vercel.app')) {
    // Fallback for Vercel if env var is missing - check common railway patterns
    // Better to default to '/' and let it fail gracefully with a log
    SOCKET_URL = '/';
} else {
    // Production mode (Served by Backend) - Ngrok or deployed
    SOCKET_URL = '/';
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

// Forcing polling first is the "Perfect Solution" for Railway/Vercel handshake issues
const socket = io(SOCKET_URL, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    transports: ['polling', 'websocket'], // Polling first is most stable for handshake
    withCredentials: true,
    extraHeaders: {
        "ngrok-skip-browser-warning": "true"
    }
});

// Global debug listeners
socket.on('connect', () => console.log("[SocketDebug] Connected to server!", socket.id));
socket.on('connect_error', (err) => console.error("[SocketDebug] Connection Error:", err.message));
socket.on('disconnect', (reason) => console.warn("[SocketDebug] Disconnected:", reason));

export default socket;
