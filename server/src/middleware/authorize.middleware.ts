import type { Role } from '@prisma/client';
import type { RequestHandler } from 'express';
import { hasPermission, type Permission } from '../modules/authorization/permissions';
import { HttpError } from '../utils/http-error';

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.authUser) {
      next(new HttpError(401, 'Authentication required'));
      return;
    }

    if (!roles.includes(req.authUser.role)) {
      next(new HttpError(403, 'Insufficient role for this action'));
      return;
    }

    next();
  };
}

export function requirePermission(permission: Permission): RequestHandler {
  return (req, _res, next) => {
    if (!req.authUser) {
      next(new HttpError(401, 'Authentication required'));
      return;
    }

    if (!hasPermission(req.authUser.role, permission)) {
      next(new HttpError(403, 'Insufficient permission for this action'));
      return;
    }

    next();
  };
}
