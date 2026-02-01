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

// Initialize default settings if needed
async function initializeData() {
  const settings = await prisma.settings.findFirst();
  if (!settings) {
    await prisma.settings.create({
      data: { businessName: config.rangeName || 'QDog' }
    });
    console.log('Created default settings');
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
