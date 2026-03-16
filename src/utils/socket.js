import io from 'socket.io-client';

// Initialize socket connection
// Connect to the backend server
let SOCKET_URL;

if (process.env.REACT_APP_SOCKET_URL) {
    SOCKET_URL = process.env.REACT_APP_SOCKET_URL;
} else if (window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168.')) {
    // Development mode (Split frontend/backend) - Localhost or Local IP
    SOCKET_URL = `http://${window.location.hostname}:3000`;
} else {
    // Production mode (Served by Backend) - Ngrok or deployed
    SOCKET_URL = '/';
}

console.log("Connecting to Socket:", SOCKET_URL);

const socket = io(SOCKET_URL, {
    autoConnect: false, // We will connect manually when the chat starts
    extraHeaders: {
        "ngrok-skip-browser-warning": "true"
    }
});

export default socket;
