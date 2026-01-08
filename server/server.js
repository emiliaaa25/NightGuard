const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http'); // 1. Import HTTP
const { Server } = require("socket.io"); // 2. Import Socket.io
require('dotenv').config();

// Route Imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const iotRoutes = require('./routes/iotRoutes');

const app = express();
const server = http.createServer(app); // 3. Create HTTP server
const io = new Server(server); // 4. Initialize Socket.io

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- SOCKET.IO LOGIC ---
// Make 'io' accessible in controllers via req.app.get('io')
app.set('io', io);

io.on('connection', (socket) => {
    console.log('⚡ A user connected via WebSocket');

    // When a user logs in, they join a "Room" specific to their User ID
    // This allows us to send messages ONLY to specific people
    socket.on('join_user_room', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`👤 User ${userId} joined their notification channel`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});
// -----------------------

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

// IMPORTANT: Listen on 'server', not 'app'
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});