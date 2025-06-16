require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const memeRoutes = require('./routes/memeRoutes');
const bidRoutes = require('./routes/bidRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const socketHandler = require('./sockets/socketHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Attach socket.io instance to res for real-time events
app.use((req, res, next) => {
  res.io = io;
  next();
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/memes', memeRoutes);
app.use('/api/memes', bidRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Sockets
socketHandler(io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 MemeHustle server running on port ${PORT}`);
});
