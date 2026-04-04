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
    // Railway Production URL
    SOCKET_URL = 'https://strangy-production-56d4.up.railway.app';
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

// Prefer websocket first in cross-origin deploys (Vercel -> Railway)
// Polling can fail with CORS/proxy layers and cause repeated "xhr poll error"
const socket = io(SOCKET_URL, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    timeout: 20000,
    transports: ['websocket', 'polling'],
    withCredentials: false
});

// Global debug listeners
socket.on('connect', () => console.log("[SocketDebug] Connected to server!", socket.id));
socket.on('connect_error', (err) => console.error("[SocketDebug] Connection Error:", err.message));
socket.on('disconnect', (reason) => console.warn("[SocketDebug] Disconnected:", reason));

export { SOCKET_URL };
export const API_BASE_URL = SOCKET_URL;
export default socket;
