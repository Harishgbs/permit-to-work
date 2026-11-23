import type { User } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { env, requireJwtSecret } from '../../config/env';
import { prisma } from '../../config/prisma';
import { HttpError } from '../../utils/http-error';
import { verifyPassword } from '../../utils/password';
import type { AuthResponse, PublicUser } from './auth.types';

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    areaId: user.areaId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const token = jwt.sign({ role: user.role }, requireJwtSecret(), {
    subject: user.id,
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });

  return { token, user: toPublicUser(user) };
}
