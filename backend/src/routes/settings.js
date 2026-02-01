import { Router } from 'express';

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

export default router;
