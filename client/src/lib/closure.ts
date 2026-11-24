import type { Permit, PublicUser, VerifyResponse } from '../types/api';
import { hasPermission } from './permissions';

export function canClosePermit(user: PublicUser | null, permit: Permit | null): boolean {
  if (!user || !permit || permit.status !== 'ACTIVE') return false;
  if (!hasPermission(user, 'permit:close')) return false;

  return user.role !== 'REQUESTER' || permit.requesterId === user.id;
}

export function canVerifyClosure(user: PublicUser | null, permit: Permit | null): boolean {
  if (!user || !permit || permit.status !== 'CLOSED') return false;
  if (!hasPermission(user, 'permit:verify')) return false;

  return user.role !== 'REQUESTER';
}

export function validateCompletionNotes(value: string): string {
  const completionNotes = value.trim();

  if (!completionNotes) {
    throw new Error('Completion notes are required.');
  }

  return completionNotes;
}

export function buildVerifyPayload(areaClean: boolean, comment: string): VerifyResponse {
  if (!areaClean) {
    throw new Error('Confirm the work area is clean and safe.');
  }

  const verificationComment = comment.trim();

  return {
    areaClean: true,
    ...(verificationComment ? { comment: verificationComment } : {}),
  };
}
