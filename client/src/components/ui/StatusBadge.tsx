import Badge from './Badge';
import { formatStatus } from '../../lib/format';
import type { PermitStatus } from '../../types/api';

const tones: Record<PermitStatus, 'slate' | 'teal' | 'amber' | 'green' | 'red' | 'blue'> = {
  DRAFT: 'slate',
  PENDING_APPROVAL: 'amber',
  APPROVED: 'blue',
  ACTIVE: 'green',
  SUSPENDED: 'red',
  REJECTED: 'red',
  EXPIRED: 'amber',
  CLOSED: 'teal',
  CLOSED_VERIFIED: 'green',
  CANCELLED: 'slate',
};

export default function StatusBadge({ status }: { status: PermitStatus }) {
  return <Badge tone={tones[status]}>{formatStatus(status)}</Badge>;
}
