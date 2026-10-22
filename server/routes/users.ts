import { Router } from 'express';
import { prisma } from '../db/prisma';

export const usersRouter = Router();

usersRouter.get('/', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        roleLabel: true,
        title: true,
        organization: true,
        institutionId: true,
        email: true,
        badgeCode: true,
        permissionsDescription: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json({ users });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch users', detail: error?.message });
  }
});
