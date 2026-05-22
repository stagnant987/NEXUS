import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const notifs = await prisma.notification.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  res.json(notifs);
});

router.put('/read-all', authenticate, async (req: AuthRequest, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.userId, read: false },
    data: { read: true }
  });
  res.json({ success: true });
});

export default router;
