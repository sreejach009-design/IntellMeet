import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';
import { setupSocketHandlers } from './sockets/socketHandler.js';

dotenv.config();

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Connect Database
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.io
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Attach io instance to express app for access in controllers
app.set('io', io);

// Initialize socket events
setupSocketHandlers(io);

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`  IntellMeet API & Socket Server running on port ${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Client URL:  ${CLIENT_URL}`);
  console.log(`  Host binding: 0.0.0.0 (All network interfaces)`);
  console.log(`=======================================================`);
});

export { server, io };
