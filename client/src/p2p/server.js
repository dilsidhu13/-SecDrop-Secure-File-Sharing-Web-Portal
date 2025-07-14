// in server.js (or your existing Express + socket.io setup)
io.on('connection', socket => {
  socket.on('join', roomId => {
    socket.join(roomId);
  });

  socket.on('signal', ({ roomId, signal }) => {
    // relay to the other peer(s) in room
    socket.to(roomId).emit('signal', { signal });
  });
});
