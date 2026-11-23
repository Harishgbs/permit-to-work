import { Router } from 'express';
import { prisma } from '../config/prisma';
import { authenticate } from '../middleware/auth.middleware';
import { login } from '../modules/auth/auth.service';
import { loginSchema } from '../modules/auth/auth.validation';
import { asyncHandler } from '../utils/async-handler';
import { HttpError } from '../utils/http-error';

export const authRouter = Router();

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid login request');
    }

    res.status(200).json(await login(parsed.data.email, parsed.data.password));
  }),
);

authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.authUser!.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        areaId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({ user });
  }),
);
