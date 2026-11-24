import { describe, expect, it } from 'vitest';
import { formatAuditAction, formatAuditActor, formatAuditValue } from './format';

describe('audit formatting', () => {
  it('maps recorded actions to readable labels', () => {
    expect(formatAuditAction('PERMIT_SUSPENDED')).toBe('Permit suspended');
    expect(formatAuditAction('WORK_LOG_ADDED')).toBe('Work log added');
    expect(formatAuditAction('SOME_NEW_ACTION')).toBe('Some New Action');
  });

  it('formats audit values as readable text', () => {
    expect(formatAuditValue('PENDING_APPROVAL')).toBe('Pending Approval');
    expect(formatAuditValue('CLOSED_VERIFIED')).toBe('Closed Verified');
    expect(formatAuditValue(null)).toBe('—');
  });

  it('formats audit actors with system and fallback handling', () => {
    expect(
      formatAuditActor({
        systemAction: false,
        actor: { id: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com' },
      }),
    ).toBe('Ada Lovelace');
    expect(
      formatAuditActor({
        systemAction: false,
        actor: { id: 'user-2', name: '', email: 'grace@example.com' },
      }),
    ).toBe('grace@example.com');
    expect(formatAuditActor({ systemAction: true, actor: null })).toBe('System');
    expect(formatAuditActor({ systemAction: false, actor: null })).toBe('Unknown user');
  });
});
