import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  roleLabel: string;
  title: string;
  organization: string;
  institutionId?: string | null;
  badgeCode: string;
  permissionsDescription: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionToken?: string;
    }
  }
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const token =
      req.cookies?.trace_session ||
      req.headers.authorization?.replace(/^Bearer\s+/i, '') ||
      req.headers['x-session-token'];

    if (!token || typeof token !== 'string') {
      return next();
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (session && session.expiresAt > new Date()) {
      req.user = session.user;
      req.sessionToken = token;
    }
  } catch (error) {
    console.error('[AuthMiddleware] Error:', error);
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }
  next();
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    // Auditor is strictly read-only for state-mutating requests
    if (req.user.role === 'auditor' && req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
      res.status(403).json({
        error: 'Auditor access is strictly read-only. State mutation rejected.',
      });
      return;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Role '${req.user.role}' is not authorized for this operation.`,
        requiredRoles: allowedRoles,
      });
      return;
    }
    next();
  };
}

export function enforceTenantIsolation(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  // System administrators, reviewers, and auditors have cross-institution oversight
  if (['regulatory_system_administrator', 'authorized_reviewer', 'auditor'].includes(req.user.role)) {
    return next();
  }

  // Institution users are constrained to their own institution
  const targetInstitutionId = req.params.institutionId || req.body.institutionId || req.query.institutionId;
  if (targetInstitutionId && req.user.institutionId && targetInstitutionId !== req.user.institutionId) {
    res.status(403).json({
      error: 'Tenant isolation violation: Access to other institutions is restricted.',
    });
    return;
  }
  next();
}

/**
 * Checks if an authenticated institution user is attempting to access a resource belonging to another institution.
 * Returns true if access is allowed, or sends 403 and returns false if forbidden.
 */
export function assertTenantAccess(
  req: Request,
  res: Response,
  resourceInstitutionId: string | null | undefined,
  resourceLabel: string = 'resource'
): boolean {
  if (!req.user) {
    return true;
  }

  // System administrators, authorized reviewers, and auditors have cross-institution oversight
  if (['regulatory_system_administrator', 'authorized_reviewer', 'auditor'].includes(req.user.role)) {
    return true;
  }

  // Institution-scoped users can only access their own institution's resources
  if (
    req.user.institutionId &&
    resourceInstitutionId &&
    req.user.institutionId !== resourceInstitutionId
  ) {
    res.status(403).json({
      error: `Tenant isolation violation: Access to another institution's ${resourceLabel} (${resourceInstitutionId}) is forbidden for user affiliated with ${req.user.institutionId}.`,
    });
    return false;
  }

  return true;
}

