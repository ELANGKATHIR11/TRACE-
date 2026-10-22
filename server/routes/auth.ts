import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../db/prisma';
import { logAuditEvent } from '../services/audit-service';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    res.cookie('trace_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
    });

    await logAuditEvent({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      outcome: 'Success',
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        roleLabel: user.roleLabel,
        title: user.title,
        organization: user.organization,
        institutionId: user.institutionId,
        email: user.email,
        badgeCode: user.badgeCode,
        permissionsDescription: user.permissionsDescription,
      },
      token,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Login failed', detail: error?.message });
  }
});

authRouter.post('/logout', async (req, res) => {
  try {
    const token = req.cookies?.trace_session || req.headers['x-session-token'];
    if (token) {
      await prisma.session.deleteMany({ where: { token } });
    }
    res.clearCookie('trace_session');

    if (req.user) {
      await logAuditEvent({
        actorId: req.user.id,
        actorName: req.user.name,
        actorRole: req.user.role,
        action: 'USER_LOGOUT',
        entityType: 'User',
        entityId: req.user.id,
        ipAddress: req.ip,
      });
    }

    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Logout failed', detail: error?.message });
  }
});

authRouter.get('/me', async (req, res) => {
  if (!req.user) {
    // Return primary default reviewer user for transparent initial session
    const defaultUser = await prisma.user.findFirst({
      where: { role: 'authorized_reviewer' },
    });
    if (!defaultUser) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    res.json({ user: defaultUser });
    return;
  }
  res.json({ user: req.user });
});

// Role switcher with audit trail for testing and verification
authRouter.post('/switch-role', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        token,
        userId: targetUser.id,
        expiresAt,
      },
    });

    res.cookie('trace_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
    });

    await logAuditEvent({
      actorId: targetUser.id,
      actorName: targetUser.name,
      actorRole: targetUser.role,
      action: 'ROLE_SWITCHED',
      entityType: 'User',
      entityId: targetUser.id,
      newState: targetUser.role,
      ipAddress: req.ip,
      outcome: 'Success',
    });

    res.json({
      success: true,
      user: targetUser,
      token,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Role switch failed', detail: error?.message });
  }
});
