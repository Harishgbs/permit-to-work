import type { Role } from '@prisma/client';

export type Permission =
  | 'permit:create'
  | 'permit:read'
  | 'permit:approve'
  | 'permit:activate'
  | 'permit:suspend'
  | 'permit:close'
  | 'permit:cancel'
  | 'permit:worklog'
  | 'permit:verify'
  | 'user:manage';

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  REQUESTER: [
    'permit:create',
    'permit:read',
    'permit:close',
    'permit:cancel',
    'permit:worklog',
  ],
  AREA_OWNER: ['permit:read', 'permit:approve', 'permit:close'],
  SAFETY_OFFICER: [
    'permit:read',
    'permit:approve',
    'permit:activate',
    'permit:suspend',
    'permit:close',
    'permit:worklog',
    'permit:verify',
  ],
  ADMIN: [
    'permit:create',
    'permit:read',
    'permit:approve',
    'permit:activate',
    'permit:suspend',
    'permit:close',
    'permit:cancel',
    'permit:worklog',
    'permit:verify',
    'user:manage',
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
