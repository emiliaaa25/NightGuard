const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");
require('dotenv').config();

// Database Connection
const pool = require('./config/db');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const iotRoutes = require('./routes/iotRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow connections from anywhere (Mobile/Ngrok)
        methods: ["GET", "POST"]
    }
});
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/buddy', require('./routes/buddyRoutes'));
// --- SOCKET.IO LOGIC ---
app.set('io', io);

io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // 1. LOGIN: Userul intră în camera lui personală
    socket.on('join_user_room', (userId) => {
        socket.userId = userId;
        socket.join(`user_${userId}`);
        console.log(`👤 User ${userId} joined notification room.`);
    });

    // 2. START ESCORT: Logica de filtrare contacte
    socket.on('escort_start', async (data) => {
        const userId = socket.userId;
        if (!userId) return;

        // A. Userul intră în camera de transmisie
        const trackRoom = `track_${userId}`;
        socket.join(trackRoom);
        console.log(`🛡️ Escort started by User ${userId}. Room: ${trackRoom}`);

        try {
            // B. Obținem numele real al celui care a plecat (Userul curent)
            const senderRes = await pool.query('SELECT full_name FROM users WHERE id = $1', [userId]);
            const senderName = senderRes.rows.length > 0 ? senderRes.rows[0].full_name : `User ${userId}`;

            // C. Găsim prietenii în baza de date
            // Logică: Selectăm ID-ul utilizatorilor din tabelul 'users'
            // care au numărul de telefon ('phone') egal cu un număr salvat
            // în lista 'emergency_contacts' a userului curent.
            const query = `
                SELECT u.id 
                FROM users u
                JOIN emergency_contacts ec ON u.phone = ec.phone
                WHERE ec.user_id = $1
            `;

            const result = await pool.query(query, [userId]);
            const friends = result.rows;

            console.log(`found ${friends.length} matching contacts for User ${userId}`);

            // D. Trimitem notificare DOAR prietenilor găsiți (Nu Broadcast)
            if (friends.length > 0) {
                friends.forEach(friend => {
                    io.to(`user_${friend.id}`).emit('friend_journey_started', {
                        friendName: senderName,
                        friendId: userId,
                        destination: data.destination
                    });
                    console.log(`--> Sent alert to Friend ID: ${friend.id}`);
                });
            } else {
                console.log("No contacts with NightGuard accounts found for this user.");
            }

        } catch (err) {
            console.error("Error notifying friends:", err);
        }
    });

    // 3. UPDATE GPS
    socket.on('escort_update', (data) => {
        // Luăm ID-ul din pachetul trimis de client (data.userId)
        // Asta e mult mai sigur decât socket.userId
        const senderId = data.userId || socket.userId;

        if (!senderId) {
            console.log("⚠️ GPS update ignored: No User ID.");
            return;
        }

        const trackRoom = `track_${senderId}`;

        // Trimitem locația la Watchers
        socket.to(trackRoom).emit('update_target_location', {
            lat: data.lat,
            lng: data.lng
        });

        console.log(`📡 Update from User ${senderId} -> Room ${trackRoom}`);
    });
    // 4. WATCHER: Prietenul intră să vadă harta
    socket.on('join_watch_room', (targetUserId) => {
        const trackRoom = `track_${targetUserId}`;
        socket.join(trackRoom);
        console.log(`👀 Watcher ${socket.id} joined room ${trackRoom}`);
    });

    // 5. STOP ESCORT
    socket.on('escort_end', () => {
        if (!socket.userId) return;
        const trackRoom = `track_${socket.userId}`;
        socket.to(trackRoom).emit('friend_journey_ended', { friendId: socket.userId });

        // Opțional: Curățăm camera, dar lăsăm userul principal
        const room = io.sockets.adapter.rooms.get(trackRoom);
        if (room) {
            room.forEach((socketId) => {
                const clientSocket = io.sockets.sockets.get(socketId);
                if (clientSocket && clientSocket.userId !== socket.userId) {
                    clientSocket.leave(trackRoom);
                }
            });
        }
    });
    // === WALKING BUDDY LOGIC ===

    // A. Cineva cere să se alăture unei plimbări
    socket.on('buddy_join_request', async ({ routeId }) => {
        const requesterId = socket.userId;

        try {
            // 1. Aflăm cine deține ruta și cum îl cheamă pe solicitant
            const routeRes = await pool.query('SELECT user_id, destination_name FROM route_posts WHERE id = $1', [routeId]);
            const userRes = await pool.query('SELECT full_name FROM users WHERE id = $1', [requesterId]);

            if (routeRes.rows.length === 0 || userRes.rows.length === 0) return;

            const ownerId = routeRes.rows[0].user_id;
            const requesterName = userRes.rows[0].full_name;
            const dest = routeRes.rows[0].destination_name;

            // 1.b Get requester's average rating (if any)
            let requesterRating = 0;
            try {
                const r = await pool.query("SELECT COALESCE(ROUND(AVG(stars)::numeric,1),0) as avg_rating FROM user_ratings WHERE target_id = $1", [requesterId]);
                if (r.rows.length > 0) requesterRating = r.rows[0].avg_rating;
            } catch (e) { console.error('Rating lookup failed', e); }

            // 2. Trimitem notificare proprietarului rutei
            // (Folosim camera 'user_ID' creată la login)
            io.to(`user_${ownerId}`).emit('buddy_request_received', {
                routeId,
                requesterId,
                requesterName,
                requesterRating,
                destination: dest
            });

            console.log(`🤝 Buddy Request: ${requesterName} -> User ${ownerId}`);

        } catch (err) { console.error(err); }

    });

    // B. Proprietarul acceptă cererea
    // B. Proprietarul acceptă cererea (UPDATE)
    socket.on('buddy_request_accepted', async ({ routeId, requesterId }) => {
        const ownerId = socket.userId;
        const roomName = `walk_${routeId}`;

        socket.join(roomName);

        io.to(`user_${requesterId}`).emit('buddy_request_confirmed', {
            routeId,
            ownerId,
            roomName
        });

        socket.emit('buddy_match_success', { requesterId, routeId });

        // --- MODIFICARE AICI: Salvăm și buddy_id ---
        await pool.query(
            "UPDATE route_posts SET status = 'MATCHED', buddy_id = $1 WHERE id = $2",
            [requesterId, routeId]
        );
    });
    // C. Chat Live (Mesaje)
    socket.on('buddy_chat_send', async ({ routeId, message }) => {
        const senderId = socket.userId;
        const roomName = `walk_${routeId}`;

        try {
            // 1. Salvăm în baza de date
            await pool.query(
                "INSERT INTO buddy_messages (route_id, sender_id, message) VALUES ($1, $2, $3)",
                [routeId, senderId, message]
            );

            // 2. Trimitem mesajul în cameră (către celălalt)
            // Includem senderId ca să știm cum să-l colorăm în frontend (stânga/dreapta)
            io.to(roomName).emit('buddy_chat_receive', {
                senderId,
                message,
                timestamp: new Date()
            });

        } catch (err) { console.error("Chat Error:", err); }
    });
    socket.on('join_chat_room', ({ routeId }) => {
        const roomName = `walk_${routeId}`;
        socket.join(roomName);
        console.log(`✅ Socket ${socket.id} joined chat room: ${roomName}`);
    });

    socket.on('disconnect', () => {
        // Cleanup standard
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/iot', iotRoutes);

// Static Files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Fallback Route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});