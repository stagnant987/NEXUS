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

router.get('/search', authenticate, async (req: AuthRequest, res: Response) => {
  const q = req.query.q as string;
  if (!q) return res.json([]);

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: q } },
        { displayName: { contains: q } }
      ]
    },
    select: { id: true, username: true, displayName: true, avatar: true, verified: true },
    take: 20
  });
  res.json(users);
});

router.get('/:username', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { username: req.params.username },
    select: {
      id: true, username: true, displayName: true, bio: true, avatar: true, verified: true, createdAt: true,
      _count: { select: { posts: true, followers: true, following: true } }
    }
  });
  if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

  const isFollowing = !!(await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: req.userId!, followingId: user.id } }
  }));

  res.json({ ...user, isFollowing });
});

router.get('/:username/posts', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { username: req.params.username } });
  if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

  const posts = await prisma.post.findMany({
    where: { authorId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, content: true, mediaUrl: true, mediaType: true, createdAt: true,
      author: { select: { id: true, username: true, displayName: true, avatar: true, verified: true } },
      _count: { select: { likes: true, comments: true } }
    }
  });
  res.json(posts);
});

router.put('/me/profile', authenticate, upload.single('avatar'), async (req: AuthRequest, res: Response) => {
  const { displayName, bio } = req.body;
  const data: Record<string, string> = {};
  if (displayName) data.displayName = displayName;
  if (bio !== undefined) data.bio = bio;
  if (req.file) data.avatar = `/uploads/${req.file.filename}`;

  const user = await prisma.user.update({
    where: { id: req.userId },
    data,
    select: { id: true, username: true, displayName: true, bio: true, avatar: true, verified: true }
  });
  res.json(user);
});

router.post('/:id/follow', authenticate, async (req: AuthRequest, res: Response) => {
  if (req.params.id === req.userId) return res.status(400).json({ error: 'Impossible de se suivre soi-même' });

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: req.userId!, followingId: req.params.id } }
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    res.json({ following: false });
  } else {
    await prisma.follow.create({ data: { followerId: req.userId!, followingId: req.params.id } });
    res.json({ following: true });
  }
});

export default router;
