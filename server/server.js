const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servește fișierele statice
app.use(express.static(path.join(__dirname, '../public')));

// Routes API
app.use('/api/auth', authRoutes);  // /api/auth/login și /api/auth/register
app.use('/api/user', userRoutes);  // /api/user/profile


// Rute pentru paginile HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/profile.html'));
});

app.get('/discover', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/discover.html'));
});

app.get('/notifications', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/notifications.html'));
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server funcționează' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Ceva nu a funcționat corect!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta nu a fost găsită' });
});

app.listen(PORT, () => {
  console.log(`🚀 Serverul rulează pe http://localhost:${PORT}`);
});