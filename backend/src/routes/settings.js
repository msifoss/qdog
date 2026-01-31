import { Router } from 'express';

const router = Router();

// Get settings
router.get('/', async (req, res) => {
  const prisma = req.app.get('prisma');

  try {
    let settings = await prisma.settings.findFirst();

    if (!settings) {
      settings = await prisma.settings.create({
        data: { rangeName: 'QDog Range' }
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
  const { rangeName, defaultSessionMins, notifyTimeoutMins, emailNotifications } = req.body;

  try {
    let settings = await prisma.settings.findFirst();

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          rangeName: rangeName || 'QDog Range',
          defaultSessionMins: defaultSessionMins || 60,
          notifyTimeoutMins: notifyTimeoutMins || 5,
          emailNotifications: emailNotifications ?? true
        }
      });
    } else {
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: {
          ...(rangeName !== undefined && { rangeName }),
          ...(defaultSessionMins !== undefined && { defaultSessionMins }),
          ...(notifyTimeoutMins !== undefined && { notifyTimeoutMins }),
          ...(emailNotifications !== undefined && { emailNotifications })
        }
      });
    }

    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
