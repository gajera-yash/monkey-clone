const { io } = require("socket.io-client");

const SOCKET_URL = "https://strangy-production-664f.up.railway.app";
console.log("Connecting to:", SOCKET_URL);

const socket = io(SOCKET_URL, {
    transports: ['polling', 'websocket'],
    withCredentials: true,
});

socket.on("connect", () => {
    console.log("Successfully connected to websocket server! Socket ID:", socket.id);
    process.exit(0);
});

socket.on("connect_error", (err) => {
    console.error("Connection Error:", err.message);
    process.exit(1);
});

setTimeout(() => {
    console.error("Timeout connecting to socket server");
    process.exit(1);
}, 10000);
