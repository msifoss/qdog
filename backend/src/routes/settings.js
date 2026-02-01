import { Router } from 'express';
import { refreshManifests, getManifestInfo } from '../services/handleGenerator.js';

const router = Router();

// Get settings
router.get('/', async (req, res) => {
  const prisma = req.app.get('prisma');

  try {
    let settings = await prisma.settings.findFirst();

    if (!settings) {
      settings = await prisma.settings.create({
        data: { businessName: 'QDog' }
      });
    }

    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update settings
router.put('/', async (req, res) => {
  const prisma = req.app.get('prisma');
  const { businessName, emailNotifications } = req.body;

  try {
    let settings = await prisma.settings.findFirst();

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          businessName: businessName || 'QDog',
          emailNotifications: emailNotifications ?? true
        }
      });
    } else {
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: {
          ...(businessName !== undefined && { businessName }),
          ...(emailNotifications !== undefined && { emailNotifications })
        }
      });
    }

    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get avatar manifest info
router.get('/avatars', (req, res) => {
  try {
    const info = getManifestInfo();
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Refresh avatar manifests by scanning PNG files
router.post('/avatars/refresh', (req, res) => {
  try {
    const results = refreshManifests();
    res.json({
      success: true,
      message: `Refreshed manifests: ${results.male} male, ${results.female} female avatars`,
      ...results
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
