// server/p2p/signaling.js

const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*' }
});

io.on('connection', socket => {
  console.log('⚡️ Peer connected:', socket.id);

  // Join a room named after the transferId
  socket.on('join', room => {
    socket.join(room);
    console.log(`${socket.id} joined room ${room}`);
  });

  // Relay signaling messages (SDP/ICE) to the other peer
  socket.on('signal', ({ room, data }) => {
    socket.to(room).emit('signal', data);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Peer disconnected:', socket.id);
  });
});

const PORT = process.env.P2P_PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚦 P2P signaling server listening on port ${PORT}`);
});
