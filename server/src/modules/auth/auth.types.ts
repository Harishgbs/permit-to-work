import type { Role } from '@prisma/client';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  areaId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  token: string;
  user: PublicUser;
}
