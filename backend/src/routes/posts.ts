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
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const postSelect = {
  id: true, content: true, mediaUrl: true, mediaType: true, createdAt: true,
  repostOfId: true,
  repostOf: {
    select: {
      id: true, content: true, mediaUrl: true, mediaType: true, createdAt: true,
      author: { select: { id: true, username: true, displayName: true, avatar: true, verified: true } }
    }
  },
  author: { select: { id: true, username: true, displayName: true, avatar: true, verified: true } },
  community: { select: { id: true, name: true } },
  hashtags: { include: { hashtag: { select: { tag: true } } } },
  _count: { select: { likes: true, comments: true, reposts: true } }
};

async function extractAndSaveHashtags(prismaClient: PrismaClient, postId: string, content: string) {
  const tags = (content.match(/#[\wÀ-ſ]+/g) || []).map(t => t.toLowerCase().slice(1));
  for (const tag of tags) {
    const hashtag = await prismaClient.hashtag.upsert({
      where: { tag },
      create: { tag },
      update: {}
    });
    await prismaClient.postHashtag.upsert({
      where: { postId_hashtagId: { postId, hashtagId: hashtag.id } },
      create: { postId, hashtagId: hashtag.id },
      update: {}
    });
  }
}

router.get('/feed', authenticate, async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  const following = await prisma.follow.findMany({
    where: { followerId: req.userId },
    select: { followingId: true }
  });
  const ids = [req.userId!, ...following.map(f => f.followingId)];

  const posts = await prisma.post.findMany({
    where: { authorId: { in: ids } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip,
    select: postSelect
  });

  const withMeta = await Promise.all(posts.map(async p => ({
    ...p,
    liked: !!(await prisma.like.findUnique({ where: { userId_postId: { userId: req.userId!, postId: p.id } } })),
    reposted: !!(await prisma.repost.findUnique({ where: { userId_postId: { userId: req.userId!, postId: p.id } } })),
    reaction: (await prisma.reaction.findUnique({ where: { userId_postId: { userId: req.userId!, postId: p.id } } }))?.emoji || null
  })));

  res.json({ posts: withMeta, hasMore: posts.length === limit });
});

router.get('/explore', authenticate, async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip,
    select: postSelect
  });
  res.json({ posts, hasMore: posts.length === limit });
});

router.get('/hashtag/:tag', authenticate, async (req: AuthRequest, res: Response) => {
  const hashtag = await prisma.hashtag.findUnique({ where: { tag: req.params.tag.toLowerCase() } });
  if (!hashtag) return res.json({ posts: [], hasMore: false });

  const postHashtags = await prisma.postHashtag.findMany({
    where: { hashtagId: hashtag.id },
    include: { post: { select: postSelect } },
    orderBy: { post: { createdAt: 'desc' } },
    take: 50
  });

  res.json({ posts: postHashtags.map(ph => ph.post), hasMore: false });
});

router.get('/trending', authenticate, async (_req: AuthRequest, res: Response) => {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const trending = await prisma.postHashtag.groupBy({
    by: ['hashtagId'],
    where: { post: { createdAt: { gte: since } } },
    _count: { hashtagId: true },
    orderBy: { _count: { hashtagId: 'desc' } },
    take: 10
  });

  const result = await Promise.all(trending.map(async t => {
    const hashtag = await prisma.hashtag.findUnique({ where: { id: t.hashtagId } });
    return { tag: hashtag?.tag, count: t._count.hashtagId };
  }));

  res.json(result.filter(r => r.tag));
});

router.post('/', authenticate, upload.single('media'), async (req: AuthRequest, res: Response) => {
  const { content, communityId } = req.body;
  if (!content && !req.file) return res.status(400).json({ error: 'Contenu requis' });

  const post = await prisma.post.create({
    data: {
      content: content || '',
      mediaUrl: req.file ? `/uploads/${req.file.filename}` : '',
      mediaType: req.file ? (req.file.mimetype.startsWith('video') ? 'video' : 'image') : 'none',
      authorId: req.userId!,
      ...(communityId && { communityId })
    },
    select: postSelect
  });

  if (content) await extractAndSaveHashtags(prisma, post.id, content);

  res.status(201).json(post);
});

router.post('/:id/like', authenticate, async (req: AuthRequest, res: Response) => {
  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId: req.userId!, postId: req.params.id } }
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    res.json({ liked: false });
  } else {
    await prisma.like.create({ data: { userId: req.userId!, postId: req.params.id } });
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (post && post.authorId !== req.userId) {
      const liker = await prisma.user.findUnique({ where: { id: req.userId }, select: { displayName: true } });
      await prisma.notification.create({
        data: { userId: post.authorId, type: 'like', message: `${liker?.displayName} a aimé votre post` }
      });
    }
    res.json({ liked: true });
  }
});

router.post('/:id/react', authenticate, async (req: AuthRequest, res: Response) => {
  const { emoji } = req.body;
  const validEmojis = ['❤️', '🔥', '😂', '😮', '😢', '👏'];
  if (!validEmojis.includes(emoji)) return res.status(400).json({ error: 'Réaction invalide' });

  const existing = await prisma.reaction.findUnique({
    where: { userId_postId: { userId: req.userId!, postId: req.params.id } }
  });

  if (existing) {
    if (existing.emoji === emoji) {
      await prisma.reaction.delete({ where: { id: existing.id } });
      return res.json({ reaction: null });
    }
    const updated = await prisma.reaction.update({ where: { id: existing.id }, data: { emoji } });
    return res.json({ reaction: updated.emoji });
  }

  await prisma.reaction.create({ data: { userId: req.userId!, postId: req.params.id, emoji } });
  res.json({ reaction: emoji });
});

router.post('/:id/repost', authenticate, async (req: AuthRequest, res: Response) => {
  const original = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!original) return res.status(404).json({ error: 'Post non trouvé' });

  const existing = await prisma.repost.findUnique({
    where: { userId_postId: { userId: req.userId!, postId: req.params.id } }
  });

  if (existing) {
    await prisma.repost.delete({ where: { id: existing.id } });
    await prisma.post.deleteMany({ where: { repostOfId: req.params.id, authorId: req.userId } });
    return res.json({ reposted: false });
  }

  await prisma.repost.create({ data: { userId: req.userId!, postId: req.params.id } });
  await prisma.post.create({
    data: { content: '', authorId: req.userId!, repostOfId: req.params.id }
  });

  res.json({ reposted: true });
});

router.get('/:id/comments', authenticate, async (req: AuthRequest, res: Response) => {
  const comments = await prisma.comment.findMany({
    where: { postId: req.params.id },
    orderBy: { createdAt: 'asc' },
    include: { author: { select: { id: true, username: true, displayName: true, avatar: true } } }
  });
  res.json(comments);
});

router.post('/:id/comments', authenticate, async (req: AuthRequest, res: Response) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Contenu requis' });

  const comment = await prisma.comment.create({
    data: { content, authorId: req.userId!, postId: req.params.id },
    include: { author: { select: { id: true, username: true, displayName: true, avatar: true } } }
  });

  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (post && post.authorId !== req.userId) {
    const commenter = await prisma.user.findUnique({ where: { id: req.userId }, select: { displayName: true } });
    await prisma.notification.create({
      data: { userId: post.authorId, type: 'comment', message: `${commenter?.displayName} a commenté votre post` }
    });
  }

  res.status(201).json(comment);
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post) return res.status(404).json({ error: 'Post non trouvé' });
  if (post.authorId !== req.userId) return res.status(403).json({ error: 'Non autorisé' });

  await prisma.post.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export default router;
