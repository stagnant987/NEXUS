import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (_, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const following = await prisma.follow.findMany({
    where: { followerId: req.userId },
    select: { followingId: true }
  });
  const ids = [req.userId!, ...following.map(f => f.followingId)];

  const stories = await prisma.story.findMany({
    where: {
      authorId: { in: ids },
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: 'desc' },
    include: { author: { select: { id: true, username: true, displayName: true, avatar: true } } }
  });
  res.json(stories);
});

router.post('/', authenticate, upload.single('media'), async (req: AuthRequest, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'Média requis' });

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const story = await prisma.story.create({
    data: {
      mediaUrl: `/uploads/${req.file.filename}`,
      mediaType: req.file.mimetype.startsWith('video') ? 'video' : 'image',
      authorId: req.userId!,
      expiresAt
    },
    include: { author: { select: { id: true, username: true, displayName: true, avatar: true } } }
  });
  res.status(201).json(story);
});

export default router;
