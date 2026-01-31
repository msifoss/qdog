import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import config from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import laneRoutes from './routes/lanes.js';
import queueRoutes from './routes/queue.js';
import settingsRoutes from './routes/settings.js';
import { setupSocket } from './socket.js';

const app = express();
const server = createServer(app);
const prisma = new PrismaClient();

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: config.frontendUrl,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Make io, prisma, and config available to routes
app.set('io', io);
app.set('prisma', prisma);
app.set('config', config);

// Middleware
app.use(cors({
  origin: config.frontendUrl
}));
app.use(express.json());

// Routes
app.use('/api/lanes', laneRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (config.nodeEnv === 'production') {
  const publicPath = join(__dirname, '..', 'public');
  app.use(express.static(publicPath));

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(join(publicPath, 'index.html'));
    }
  });
}

// Setup socket handlers
setupSocket(io, prisma);

// Initialize default settings and lanes if needed
async function initializeData() {
  // Create default settings if not exists
  const settings = await prisma.settings.findFirst();
  if (!settings) {
    await prisma.settings.create({
      data: {
        rangeName: config.rangeName,
        defaultSessionMins: config.defaultSessionMins,
        notifyTimeoutMins: config.notifyTimeoutMins
      }
    });
  }

  // Create default lanes if none exist
  const laneCount = await prisma.lane.count();
  if (laneCount === 0) {
    await prisma.lane.createMany({
      data: [
        { name: 'Lane 1' },
        { name: 'Lane 2' },
        { name: 'Lane 3' },
        { name: 'Lane 4' },
        { name: 'Lane 5' },
        { name: 'Lane 6' }
      ]
    });
    console.log('Created 6 default lanes');
  }
}

server.listen(config.port, async () => {
  await initializeData();
  console.log(`Server running on port ${config.port}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  server.close();
});
