import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authenticate, async (_req: AuthRequest, res: Response) => {
  const communities = await prisma.community.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { members: true, posts: true } } }
  });
  res.json(communities);
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom requis' });

  const community = await prisma.community.create({
    data: {
      name, description: description || '',
      members: { create: { userId: req.userId!, role: 'admin' } }
    },
    include: { _count: { select: { members: true, posts: true } } }
  });
  res.status(201).json(community);
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const community = await prisma.community.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { members: true, posts: true } } }
  });
  if (!community) return res.status(404).json({ error: 'Communauté non trouvée' });

  const isMember = !!(await prisma.communityMember.findUnique({
    where: { userId_communityId: { userId: req.userId!, communityId: req.params.id } }
  }));

  res.json({ ...community, isMember });
});

router.post('/:id/join', authenticate, async (req: AuthRequest, res: Response) => {
  const existing = await prisma.communityMember.findUnique({
    where: { userId_communityId: { userId: req.userId!, communityId: req.params.id } }
  });

  if (existing) {
    await prisma.communityMember.delete({ where: { id: existing.id } });
    res.json({ member: false });
  } else {
    await prisma.communityMember.create({ data: { userId: req.userId!, communityId: req.params.id } });
    res.json({ member: true });
  }
});

router.get('/:id/posts', authenticate, async (req: AuthRequest, res: Response) => {
  const posts = await prisma.post.findMany({
    where: { communityId: req.params.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, content: true, mediaUrl: true, mediaType: true, createdAt: true,
      author: { select: { id: true, username: true, displayName: true, avatar: true, verified: true } },
      _count: { select: { likes: true, comments: true } }
    }
  });
  res.json(posts);
});

export default router;
