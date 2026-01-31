import { Router } from 'express';
import { releaseLane, assignLaneToCustomer } from '../services/queue.js';
import { broadcastLaneUpdate } from '../socket.js';

const router = Router();

// Get all lanes
router.get('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  try {
    const lanes = await prisma.lane.findMany({
      include: { currentCustomer: true },
      orderBy: { id: 'asc' }
    });
    res.json(lanes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new lane
router.post('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const io = req.app.get('io');
  const { name } = req.body;

  try {
    const lane = await prisma.lane.create({
      data: { name }
    });

    const lanes = await prisma.lane.findMany({ include: { currentCustomer: true } });
    broadcastLaneUpdate(io, lanes);

    res.status(201).json(lane);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update lane status (maintenance, available)
router.put('/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  const io = req.app.get('io');
  const { id } = req.params;
  const { status, name } = req.body;

  try {
    const lane = await prisma.lane.update({
      where: { id: parseInt(id) },
      data: {
        ...(status && { status }),
        ...(name && { name })
      }
    });

    const lanes = await prisma.lane.findMany({ include: { currentCustomer: true } });
    broadcastLaneUpdate(io, lanes);

    res.json(lane);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Release a lane (customer done)
router.post('/:id/release', async (req, res) => {
  const prisma = req.app.get('prisma');
  const io = req.app.get('io');
  const { id } = req.params;
  const { callNext = true } = req.body;

  try {
    const result = await releaseLane(prisma, io, parseInt(id), callNext);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manually assign a customer to a lane
router.post('/:id/assign', async (req, res) => {
  const prisma = req.app.get('prisma');
  const io = req.app.get('io');
  const { id } = req.params;
  const { queueEntryId } = req.body;

  try {
    const result = await assignLaneToCustomer(prisma, io, parseInt(id), queueEntryId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a lane
router.delete('/:id', async (req, res) => {
  const prisma = req.app.get('prisma');
  const io = req.app.get('io');
  const { id } = req.params;

  try {
    await prisma.lane.delete({
      where: { id: parseInt(id) }
    });

    const lanes = await prisma.lane.findMany({ include: { currentCustomer: true } });
    broadcastLaneUpdate(io, lanes);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
