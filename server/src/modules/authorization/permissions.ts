import type { Role } from '@prisma/client';

export type Permission =
  | 'permit:create'
  | 'permit:read'
  | 'permit:approve'
  | 'permit:activate'
  | 'permit:verify'
  | 'user:manage';

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  REQUESTER: ['permit:create', 'permit:read'],
  AREA_OWNER: ['permit:read', 'permit:approve'],
  SAFETY_OFFICER: ['permit:read', 'permit:approve', 'permit:activate', 'permit:verify'],
  ADMIN: [
    'permit:create',
    'permit:read',
    'permit:approve',
    'permit:activate',
    'permit:verify',
    'user:manage',
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
