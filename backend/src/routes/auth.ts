import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { signToken, authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.post('/register', async (req: Request, res: Response) => {
  const { username, email, password, displayName } = req.body;
  if (!username || !email || !password || !displayName)
    return res.status(400).json({ error: 'Tous les champs sont requis' });

  const exists = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] }
  });
  if (exists) return res.status(409).json({ error: 'Email ou username déjà utilisé' });

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { username, email, password: hashed, displayName }
  });

  const token = signToken(user.id);
  res.status(201).json({
    token,
    user: { id: user.id, username: user.username, displayName: user.displayName, avatar: user.avatar }
  });
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Identifiants incorrects' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Identifiants incorrects' });

  const token = signToken(user.id);
  res.json({
    token,
    user: { id: user.id, username: user.username, displayName: user.displayName, avatar: user.avatar }
  });
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, username: true, email: true, displayName: true, bio: true, avatar: true, verified: true, createdAt: true }
  });
  if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
  res.json(user);
});

export default router;
