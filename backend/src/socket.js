// Socket.IO event handlers
export function setupSocket(io, prisma) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}

// Broadcast queue update to all clients
export function broadcastQueueUpdate(io, queueData) {
  io.emit('queue-updated', queueData);
}
