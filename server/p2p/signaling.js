// server/p2p/signaling.js
import http from 'http';
import express from 'express';
import { Server as IOServer } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new IOServer(server, { cors: { origin: '*' } });

io.on('connection', socket => {
  socket.on('join', room => socket.join(room));
  socket.on('signal', ({ room, data }) => {
    socket.to(room).emit('signal', data);
  });
});

const PORT = process.env.P2P_PORT || 5000;
server.listen(PORT, () => console.log(` P2P signaling on ${PORT}`));
