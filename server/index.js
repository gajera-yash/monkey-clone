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
// Track which room each socket is in so we can notify partners on disconnect
const socketRooms = new Map(); // socketId -> roomId

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);


    // User wants to find a match
    socket.on('join-waiting', (userData) => {
        // Handle both simple string (legacy) and object (new)
        let name = 'Stranger';
        let uid = null;
        let blockedUsers = [];
        let location = null;
        let isPremium = false;

        if (typeof userData === 'string') {
            name = userData;
        } else if (typeof userData === 'object') {
            name = userData.name || 'Stranger';
            uid = userData.uid;
            blockedUsers = userData.blockedUsers || [];
            location = userData.location || null;
            isPremium = userData.isPremium || false;
        }

        const user = {
            id: socket.id,
            name,
            uid,
            blockedUsers,
            location,
            isPremium
        };

        // Avoid duplicates
        if (!waitingUsers.find(u => u.id === socket.id)) {
            waitingUsers.push(user);
            console.log(`User ${user.name} (${user.id}) joined waiting pool. Queue: ${waitingUsers.length}`);
        }

        // Broadcast waiting count for debugging
        io.emit('waiting-count', waitingUsers.length);

        // Check if we can match
        if (waitingUsers.length >= 2) {
            // Try to find a match for the first user
            // We iterate to find a compatible pair that doesn't block each other

            // Loop through waitingUsers to find a pair
            let matchFound = false;
            let user1Index = 0;
            let user2Index = -1;

            // Simple greedy match with blocking check
            // We take the first user and try to find the first compatible partner
            // If user1 has no compatible partners, we move to user2 and try to match them, etc.

            // Note: This is an O(n) scan for the head of queue. 
            // Better scalable approach needed for production, but fine for <100 users.

            // We can't just shift user1 because they might find a match deeper in queue if user2 was blocked.
            // But for simplicity/fairness FIFO:
            // We try to match waitingUsers[0] with anyone. 
            // If they match waitingUsers[1], great. If blocked, try waitingUsers[2].

            const user1 = waitingUsers[0];

            for (let i = 1; i < waitingUsers.length; i++) {
                const potentialPartner = waitingUsers[i];

                // Check blocks
                const user1BlockedPartner = user1.blockedUsers.includes(potentialPartner.uid) || (user1.uid && potentialPartner.blockedUsers.includes(user1.uid));
                const partnerBlockedUser1 = potentialPartner.blockedUsers.includes(user1.uid) || (potentialPartner.uid && user1.blockedUsers.includes(potentialPartner.uid));

                if (!user1BlockedPartner && !partnerBlockedUser1) {
                    user2Index = i;
                    matchFound = true;
                    break;
                }
            }

            if (matchFound) {
                // Remove both from queue
                // Be careful with indices since spliced
                const user2 = waitingUsers[user2Index];
                waitingUsers.splice(user2Index, 1); // Remove user2 first (higher index)
                waitingUsers.splice(0, 1); // Remove user1 (index 0)

                // Create a unique room ID
                const roomId = `${user1.id}-${user2.id}`;

                // Join both users to the room
                io.to(user1.id).socketsJoin(roomId);
                io.to(user2.id).socketsJoin(roomId);

                // Track which room each socket is in
                socketRooms.set(user1.id, roomId);
                socketRooms.set(user2.id, roomId);

                // Notify users they are matched
                // Match found!
                io.to(user1.id).emit('matched', {
                    roomId,
                    initiator: true,
                    partnerId: user2.uid,
                    partnerName: user2.name,
                    partnerLocation: user2.location,
                    partnerIsPremium: user2.isPremium
                });
                io.to(user2.id).emit('matched', {
                    roomId,
                    initiator: false,
                    partnerId: user1.uid,
                    partnerName: user1.name,
                    partnerLocation: user1.location,
                    partnerIsPremium: user1.isPremium
                });

                console.log(`Matched ${user1.name} and ${user2.name} in room ${roomId}`);
            }
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

        // Notify partner in active room
        const roomId = socketRooms.get(socket.id);
        if (roomId) {
            socket.to(roomId).emit('partner-disconnected');
            socketRooms.delete(socket.id);
        }
    });

    // Explicit leave/next
    socket.on('leave-room', ({ roomId }) => {
        socket.leave(roomId);
        socket.to(roomId).emit('partner-disconnected');
        socketRooms.delete(socket.id);
    });

    // Text Chat: Send message to room
    socket.on('send-message', ({ roomId, message }) => {
        // Send to everyone else in the room
        socket.to(roomId).emit('receive-message', message);
    });

    // Text Chat: Typing indicator
    socket.on('typing', ({ roomId, isTyping }) => {
        socket.to(roomId).emit('partner-typing', isTyping);
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
