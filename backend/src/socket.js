// Socket.IO event handlers
export function setupSocket(io, prisma) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join room for specific queue entry (for customer notifications)
    socket.on('join-queue', (queueId) => {
      socket.join(`queue-${queueId}`);
      console.log(`Socket ${socket.id} joined queue-${queueId}`);
    });

    // Admin joins admin room for all updates
    socket.on('join-admin', () => {
      socket.join('admin');
      console.log(`Socket ${socket.id} joined admin room`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}

// Helper to broadcast queue update to all clients
export function broadcastQueueUpdate(io, queueData) {
  io.emit('queue-updated', queueData);
}

// Helper to broadcast lane update to all clients
export function broadcastLaneUpdate(io, laneData) {
  io.emit('lanes-updated', laneData);
}

// Helper to notify specific customer
export function notifyCustomer(io, queueId, notification) {
  io.to(`queue-${queueId}`).emit('notification', notification);
}
