const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const path = require('path');

const app = express();
app.use(cors());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../build')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for dev simplicity
        methods: ["GET", "POST"]
    }
});

// Queue for users waiting to be matched [{id, name}]
let waitingUsers = [];

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // User wants to find a match
    socket.on('join-waiting', (userName) => {
        const user = { id: socket.id, name: userName || 'Stranger' };

        // Avoid duplicates
        if (!waitingUsers.find(u => u.id === socket.id)) {
            waitingUsers.push(user);
            console.log(`User ${user.name} (${user.id}) joined waiting pool. Queue: ${waitingUsers.length}`);
        }

        // Broadcast waiting count for debugging
        io.emit('waiting-count', waitingUsers.length);

        // Check if we can match
        if (waitingUsers.length >= 2) {
            const user1 = waitingUsers.shift();
            const user2 = waitingUsers.shift();

            // Create a unique room ID
            const roomId = `${user1.id}-${user2.id}`;

            // Join both users to the room
            io.to(user1.id).socketsJoin(roomId);
            io.to(user2.id).socketsJoin(roomId);

            // Notify users they are matched
            // user1 is 'initiator' (will send offer), user2 is 'receiver'
            io.to(user1.id).emit('matched', { roomId, initiator: true, partnerId: user2.id, partnerName: user2.name });
            io.to(user2.id).emit('matched', { roomId, initiator: false, partnerId: user1.id, partnerName: user1.name });

            console.log(`Matched ${user1.name} and ${user2.name} in room ${roomId}`);
        }
    });

    // WebRTC Signaling Events
    socket.on('offer', ({ offer, roomId }) => {
        socket.to(roomId).emit('offer', offer);
    });

    socket.on('answer', ({ answer, roomId }) => {
        socket.to(roomId).emit('answer', answer);
    });

    socket.on('ice-candidate', ({ candidate, roomId }) => {
        socket.to(roomId).emit('ice-candidate', candidate);
    });

    // Handle Disconnection
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);

        // Remove from waiting list if there
        waitingUsers = waitingUsers.filter(u => u.id !== socket.id);

        // Notify partner in any active rooms (simplified: broadcast to all rooms user was in)
        // In a real app, track user rooms more explicitly
        // For this simple version, socket.io handles room cleanup, but we need to tell the partner.
        // We can't easily know who the partner was without tracking, but socket.rooms is empty on disconnect.
        // Setup: Client handles "partner-disconnected" if the peer connection fails or we can track matches server-side.
        // Better approach: When matching, store the pair.
        // For now, let's rely on WebRTC connection state changes on client, 
        // OR broadcast a 'partner-disconnected' to the room if we knew it.
        // Since we don't track rooms persistently here, let's just let the client handle connection failure/closure.
        // IMPROVEMENT: Let's actually track matches to notify gracefully.
    });

    // Explicit leave/next
    socket.on('leave-room', ({ roomId }) => {
        socket.leave(roomId);
        socket.to(roomId).emit('partner-disconnected');
    });
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build/index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Signaling server running on port ${PORT}`);
    console.log(`--- SERVER RESTARTED WITH NAMES SUPPORT ---`);
});
