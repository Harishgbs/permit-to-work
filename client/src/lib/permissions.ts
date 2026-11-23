import type { Permission, Permit, PublicUser, Role } from '../types/api';

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  REQUESTER: ['permit:create', 'permit:read', 'permit:close', 'permit:cancel', 'permit:worklog'],
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

export function hasPermission(user: PublicUser | null, permission: Permission): boolean {
  return user ? ROLE_PERMISSIONS[user.role].includes(permission) : false;
}

export function isApprover(user: PublicUser | null): boolean {
  return hasPermission(user, 'permit:approve');
}

export function canDecideApproval(user: PublicUser | null, permit: Permit | null): boolean {
  if (!user || !permit || !isApprover(user)) return false;
  if (permit.requesterId === user.id) return false;
  if (user.role === 'AREA_OWNER' && permit.areaId !== user.areaId) return false;

  return permit.approvals.some(
    (approval) => approval.status === 'PENDING' && approval.requiredRole === user.role,
  );
}

export function canEditDraft(user: PublicUser | null, permit: Permit | null): boolean {
  if (!user || !permit || permit.status !== 'DRAFT') return false;
  return user.role === 'ADMIN' || permit.requesterId === user.id;
}
