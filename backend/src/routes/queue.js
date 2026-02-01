import { Router } from 'express';
import { broadcastQueueUpdate } from '../socket.js';
import { generateHandleAndAvatar } from '../services/handleGenerator.js';

const router = Router();

// Get queue (up to 25 entries)
router.get('/', async (req, res) => {
  const prisma = req.app.get('prisma');

  try {
    const queue = await prisma.queueEntry.findMany({
      orderBy: { position: 'asc' },
      take: 25
    });
    res.json(queue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get queue count
router.get('/count', async (req, res) => {
  const prisma = req.app.get('prisma');

  try {
    const count = await prisma.queueEntry.count();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get public queue (only handles and avatars - no personal info)
router.get('/public', async (req, res) => {
  const prisma = req.app.get('prisma');

  try {
    const queue = await prisma.queueEntry.findMany({
      orderBy: { position: 'asc' },
      take: 25,
      select: {
        id: true,
        handle: true,
        avatar: true,
        position: true
      }
    });
    res.json(queue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add to queue
router.post('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const io = req.app.get('io');
  const { customerName, email, phone } = req.body;

  if (!customerName?.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (!email?.trim()) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Check if email already in queue
    const existing = await prisma.queueEntry.findUnique({
      where: { email: normalizedEmail }
    });

    if (existing) {
      return res.status(409).json({
        error: 'This email is already in the queue',
        position: existing.position
      });
    }

    // Get next position
    const lastEntry = await prisma.queueEntry.findFirst({
      orderBy: { position: 'desc' }
    });
    const nextPosition = (lastEntry?.position || 0) + 1;

    // Generate unique handle and avatar
    const { handle, avatar } = await generateHandleAndAvatar();

    const entry = await prisma.queueEntry.create({
      data: {
        customerName: customerName.trim(),
        email: normalizedEmail,
        phone: phone?.trim() || null,
        handle,
        avatar,
        position: nextPosition
      }
    });

    // Broadcast update
    const queue = await prisma.queueEntry.findMany({
      orderBy: { position: 'asc' },
      take: 25
    });
    broadcastQueueUpdate(io, queue);

    res.status(201).json({ entry, position: nextPosition });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Move entry up in queue
router.post('/:id/move-up', async (req, res) => {
  const prisma = req.app.get('prisma');
  const io = req.app.get('io');
  const { id } = req.params;

  try {
    const entry = await prisma.queueEntry.findUnique({
      where: { id: parseInt(id) }
    });

    if (!entry || entry.position <= 1) {
      return res.status(400).json({ error: 'Cannot move up' });
    }

    // Find entry above
    const entryAbove = await prisma.queueEntry.findFirst({
      where: { position: entry.position - 1 }
    });

    if (entryAbove) {
      // Swap positions
      await prisma.$transaction([
        prisma.queueEntry.update({
          where: { id: entry.id },
          data: { position: entry.position - 1 }
        }),
        prisma.queueEntry.update({
          where: { id: entryAbove.id },
          data: { position: entry.position }
        })
      ]);
    }

    // Broadcast update
    const queue = await prisma.queueEntry.findMany({
      orderBy: { position: 'asc' },
      take: 25
    });
    broadcastQueueUpdate(io, queue);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Move entry down in queue
router.post('/:id/move-down', async (req, res) => {
  const prisma = req.app.get('prisma');
  const io = req.app.get('io');
  const { id } = req.params;

  try {
    const entry = await prisma.queueEntry.findUnique({
      where: { id: parseInt(id) }
    });

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // Find entry below
    const entryBelow = await prisma.queueEntry.findFirst({
      where: { position: entry.position + 1 }
    });

    if (!entryBelow) {
      return res.status(400).json({ error: 'Cannot move down' });
    }

    // Swap positions
    await prisma.$transaction([
      prisma.queueEntry.update({
        where: { id: entry.id },
        data: { position: entry.position + 1 }
      }),
      prisma.queueEntry.update({
        where: { id: entryBelow.id },
        data: { position: entry.position }
      })
    ]);

    // Broadcast update
    const queue = await prisma.queueEntry.findMany({
      orderBy: { position: 'asc' },
      take: 25
    });
    broadcastQueueUpdate(io, queue);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reorder queue (for drag and drop)
router.post('/reorder', async (req, res) => {
  const prisma = req.app.get('prisma');
  const io = req.app.get('io');
  const { orderedIds } = req.body;

  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: 'orderedIds array required' });
  }

  try {
    // Update positions based on array order
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.queueEntry.update({
          where: { id },
          data: { position: index + 1 }
        })
      )
    );

    // Broadcast update
    const queue = await prisma.queueEntry.findMany({
      orderBy: { position: 'asc' },
      take: 25
    });
    broadcastQueueUpdate(io, queue);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove from queue
router.delete('/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  const io = req.app.get('io');
  const { id } = req.params;

  try {
    const entry = await prisma.queueEntry.findUnique({
      where: { id: parseInt(id) }
    });

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // Delete entry
    await prisma.queueEntry.delete({
      where: { id: parseInt(id) }
    });

    // Reposition remaining entries
    await prisma.$executeRaw`
      UPDATE QueueEntry
      SET position = position - 1
      WHERE position > ${entry.position}
    `;

    // Broadcast update
    const queue = await prisma.queueEntry.findMany({
      orderBy: { position: 'asc' },
      take: 25
    });
    broadcastQueueUpdate(io, queue);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
