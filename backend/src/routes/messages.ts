import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/conversations', authenticate, async (req: AuthRequest, res: Response) => {
  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: req.userId }, { receiverId: req.userId }]
    },
    orderBy: { createdAt: 'desc' },
    include: {
      sender: { select: { id: true, username: true, displayName: true, avatar: true } },
      receiver: { select: { id: true, username: true, displayName: true, avatar: true } }
    }
  });

  const convMap = new Map<string, typeof messages[0]>();
  for (const msg of messages) {
    const otherId = msg.senderId === req.userId ? msg.receiverId : msg.senderId;
    if (!convMap.has(otherId)) convMap.set(otherId, msg);
  }

  res.json(Array.from(convMap.values()));
});

router.get('/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: req.userId, receiverId: req.params.userId },
        { senderId: req.params.userId, receiverId: req.userId }
      ]
    },
    orderBy: { createdAt: 'asc' },
    include: {
      sender: { select: { id: true, username: true, displayName: true, avatar: true } }
    }
  });

  await prisma.message.updateMany({
    where: { senderId: req.params.userId, receiverId: req.userId, read: false },
    data: { read: true }
  });

  res.json(messages);
});

router.post('/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Message vide' });

  const message = await prisma.message.create({
    data: { content, senderId: req.userId!, receiverId: req.params.userId },
    include: { sender: { select: { id: true, username: true, displayName: true, avatar: true } } }
  });
  res.status(201).json(message);
});

export default router;
