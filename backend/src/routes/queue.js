import { Router } from 'express';
import { recalculatePositions, getNextInQueue, assignLaneToCustomer } from '../services/queue.js';
import { sendQueueConfirmationEmail } from '../services/email.js';
import { broadcastQueueUpdate, notifyCustomer } from '../socket.js';

const router = Router();

// Get all queue entries (with optional status filter)
router.get('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { status } = req.query;

  try {
    const where = status ? { status } : {};
    const queue = await prisma.queueEntry.findMany({
      where,
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }]
    });
    res.json(queue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single queue entry by ID
router.get('/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { id } = req.params;

  try {
    const entry = await prisma.queueEntry.findUnique({
      where: { id: parseInt(id) },
      include: { currentLane: true }
    });

    if (!entry) {
      return res.status(404).json({ error: 'Queue entry not found' });
    }

    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add customer to queue
router.post('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const io = req.app.get('io');
  const { customerName, email, phone, partySize = 1 } = req.body;

  if (!customerName || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  try {
    // Get current queue length for position
    const waitingCount = await prisma.queueEntry.count({
      where: { status: 'waiting' }
    });

    const entry = await prisma.queueEntry.create({
      data: {
        customerName,
        email,
        phone,
        partySize,
        position: waitingCount + 1
      }
    });

    // Check if there's an available lane immediately
    const availableLane = await prisma.lane.findFirst({
      where: { status: 'available' }
    });

    if (availableLane && waitingCount === 0) {
      // Assign immediately if no one waiting and lane available
      const result = await assignLaneToCustomer(prisma, io, availableLane.id, entry.id);
      return res.status(201).json({
        ...result.entry,
        immediateAssignment: true,
        lane: result.lane
      });
    }

    // Send confirmation email
    const settings = await prisma.settings.findFirst();
    if (settings?.emailNotifications) {
      await sendQueueConfirmationEmail(
        email,
        customerName,
        entry.position,
        settings.rangeName
      );
    }

    // Broadcast queue update
    const queue = await prisma.queueEntry.findMany({
      where: { status: 'waiting' },
      orderBy: { position: 'asc' }
    });
    broadcastQueueUpdate(io, queue);

    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update queue entry status
router.put('/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  const io = req.app.get('io');
  const { id } = req.params;
  const { status, customerName, email, phone, partySize } = req.body;

  try {
    const entry = await prisma.queueEntry.update({
      where: { id: parseInt(id) },
      data: {
        ...(status && { status }),
        ...(customerName && { customerName }),
        ...(email && { email }),
        ...(phone && { phone }),
        ...(partySize && { partySize })
      }
    });

    // Recalculate positions if status changed
    if (status && status !== 'waiting') {
      await prisma.queueEntry.update({
        where: { id: parseInt(id) },
        data: { position: null }
      });
      await recalculatePositions(prisma);
    }

    // Broadcast update
    const queue = await prisma.queueEntry.findMany({
      where: { status: 'waiting' },
      orderBy: { position: 'asc' }
    });
    broadcastQueueUpdate(io, queue);

    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark as no-show
router.post('/:id/no-show', async (req, res) => {
  const prisma = req.app.get('prisma');
  const io = req.app.get('io');
  const { id } = req.params;

  try {
    const entry = await prisma.queueEntry.update({
      where: { id: parseInt(id) },
      data: {
        status: 'no_show',
        position: null
      }
    });

    // If they had a lane, release it
    const lane = await prisma.lane.findFirst({
      where: { currentCustomerId: parseInt(id) }
    });

    if (lane) {
      await prisma.lane.update({
        where: { id: lane.id },
        data: { status: 'available', currentCustomerId: null }
      });

      // Assign to next in queue
      const next = await getNextInQueue(prisma);
      if (next) {
        await assignLaneToCustomer(prisma, io, lane.id, next.id);
      }
    }

    await recalculatePositions(prisma);

    // Broadcast update
    const queue = await prisma.queueEntry.findMany({
      where: { status: 'waiting' },
      orderBy: { position: 'asc' }
    });
    broadcastQueueUpdate(io, queue);

    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove from queue (customer left)
router.delete('/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  const io = req.app.get('io');
  const { id } = req.params;

  try {
    // Check if they have a lane assigned
    const lane = await prisma.lane.findFirst({
      where: { currentCustomerId: parseInt(id) }
    });

    if (lane) {
      await prisma.lane.update({
        where: { id: lane.id },
        data: { status: 'available', currentCustomerId: null }
      });
    }

    await prisma.queueEntry.delete({
      where: { id: parseInt(id) }
    });

    await recalculatePositions(prisma);

    // Broadcast update
    const queue = await prisma.queueEntry.findMany({
      where: { status: 'waiting' },
      orderBy: { position: 'asc' }
    });
    broadcastQueueUpdate(io, queue);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
