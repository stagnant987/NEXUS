import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const ADMIN_USERNAME = 'pat';

async function requireAdmin(req: AuthRequest, res: Response): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { username: true } });
  if (!user || user.username !== ADMIN_USERNAME) {
    res.status(403).json({ error: 'Accès refusé' });
    return false;
  }
  return true;
}

router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  if (!await requireAdmin(req, res)) return;

  const [users, posts, communities, messages] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.community.count(),
    prisma.message.count(),
  ]);

  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, username: true, displayName: true, avatar: true, createdAt: true }
  });

  res.json({ users, posts, communities, messages, recentUsers });
});

router.get('/users', authenticate, async (req: AuthRequest, res: Response) => {
  if (!await requireAdmin(req, res)) return;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, username: true, email: true, displayName: true,
      avatar: true, verified: true, createdAt: true,
      _count: { select: { posts: true, followers: true } }
    }
  });
  res.json(users);
});

router.put('/users/:id/verify', authenticate, async (req: AuthRequest, res: Response) => {
  if (!await requireAdmin(req, res)) return;

  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { verified: !user.verified },
    select: { id: true, verified: true }
  });
  res.json(updated);
});

router.delete('/users/:id', authenticate, async (req: AuthRequest, res: Response) => {
  if (!await requireAdmin(req, res)) return;

  const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: { username: true } });
  if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
  if (user.username === ADMIN_USERNAME) return res.status(400).json({ error: 'Impossible de supprimer le compte admin' });

  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

router.get('/posts', authenticate, async (req: AuthRequest, res: Response) => {
  if (!await requireAdmin(req, res)) return;

  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true, content: true, mediaType: true, createdAt: true,
      author: { select: { id: true, username: true, displayName: true } },
      _count: { select: { likes: true, comments: true } }
    }
  });
  res.json(posts);
});

router.delete('/posts/:id', authenticate, async (req: AuthRequest, res: Response) => {
  if (!await requireAdmin(req, res)) return;

  await prisma.post.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export default router;
