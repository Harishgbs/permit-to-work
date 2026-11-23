import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        id: string;
        name: string;
        email: string;
        role: Role;
        areaId: string | null;
      };
    }
  }
}

export {};
