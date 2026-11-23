import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { requireJwtSecret } from '../config/env';
import { prisma } from '../config/prisma';
import { HttpError } from '../utils/http-error';

export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new HttpError(401, 'Authentication required');
    }

    const token = header.slice(7).trim();

    if (!token) {
      throw new HttpError(401, 'Authentication required');
    }

    const payload = jwt.verify(token, requireJwtSecret());

    if (typeof payload === 'string' || typeof payload.sub !== 'string') {
      throw new HttpError(401, 'Invalid or expired token');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, role: true, areaId: true },
    });

    if (!user) {
      throw new HttpError(401, 'Invalid or expired token');
    }

    req.authUser = user;
    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, 'Invalid or expired token'));
  }
};
