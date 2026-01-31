// Queue management service
import { sendLaneReadyEmail } from './email.js';
import { notifyCustomer, broadcastQueueUpdate, broadcastLaneUpdate } from '../socket.js';

// Recalculate positions for all waiting entries
export async function recalculatePositions(prisma) {
  const waiting = await prisma.queueEntry.findMany({
    where: { status: 'waiting' },
    orderBy: { createdAt: 'asc' }
  });

  for (let i = 0; i < waiting.length; i++) {
    await prisma.queueEntry.update({
      where: { id: waiting[i].id },
      data: { position: i + 1 }
    });
  }

  return waiting.length;
}

// Get next person in queue
export async function getNextInQueue(prisma) {
  return prisma.queueEntry.findFirst({
    where: { status: 'waiting' },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }]
  });
}

// Assign lane to customer
export async function assignLaneToCustomer(prisma, io, laneId, queueEntryId) {
  const settings = await prisma.settings.findFirst();
  const rangeName = settings?.rangeName || 'Shooting Range';

  // Update lane
  const lane = await prisma.lane.update({
    where: { id: laneId },
    data: {
      status: 'occupied',
      currentCustomerId: queueEntryId
    }
  });

  // Update queue entry
  const entry = await prisma.queueEntry.update({
    where: { id: queueEntryId },
    data: {
      status: 'assigned',
      position: null,
      assignedAt: new Date()
    }
  });

  // Recalculate positions
  await recalculatePositions(prisma);

  // Notify customer on-screen
  notifyCustomer(io, queueEntryId, {
    type: 'lane-assigned',
    message: `${lane.name} is ready for you!`,
    laneName: lane.name
  });

  // Send email notification
  if (settings?.emailNotifications) {
    await sendLaneReadyEmail(entry.email, entry.customerName, lane.name, rangeName);
  }

  // Broadcast updates
  const lanes = await prisma.lane.findMany({ include: { currentCustomer: true } });
  const queue = await prisma.queueEntry.findMany({
    where: { status: 'waiting' },
    orderBy: { position: 'asc' }
  });

  broadcastLaneUpdate(io, lanes);
  broadcastQueueUpdate(io, queue);

  return { lane, entry };
}

// Release lane and optionally call next customer
export async function releaseLane(prisma, io, laneId, callNext = true) {
  const lane = await prisma.lane.findUnique({
    where: { id: laneId },
    include: { currentCustomer: true }
  });

  if (!lane) throw new Error('Lane not found');

  // Mark current customer as completed if exists
  if (lane.currentCustomerId) {
    await prisma.queueEntry.update({
      where: { id: lane.currentCustomerId },
      data: {
        status: 'completed',
        completedAt: new Date()
      }
    });
  }

  // Release the lane
  await prisma.lane.update({
    where: { id: laneId },
    data: {
      status: 'available',
      currentCustomerId: null
    }
  });

  // Call next customer if requested
  if (callNext) {
    const next = await getNextInQueue(prisma);
    if (next) {
      await assignLaneToCustomer(prisma, io, laneId, next.id);
      return { laneReleased: true, nextCustomer: next };
    }
  }

  // Broadcast updates
  const lanes = await prisma.lane.findMany({ include: { currentCustomer: true } });
  broadcastLaneUpdate(io, lanes);

  return { laneReleased: true, nextCustomer: null };
}
