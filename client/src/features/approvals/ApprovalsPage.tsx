import { CheckCircle2, ShieldCheck, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import Field from '../../components/ui/Field';
import Modal from '../../components/ui/Modal';
import { useAsyncData } from '../../hooks/useAsyncData';
import { api } from '../../lib/api';
import { formatDateTime, formatType } from '../../lib/format';
import { canDecideApproval, isApprover } from '../../lib/permissions';
import type { Permit } from '../../types/api';
import { useAuth } from '../auth/AuthProvider';

async function loadPending() {
  const first = await api.listPermits({ status: 'PENDING_APPROVAL', page: 1, pageSize: 50 });
  const remaining = await Promise.all(
    Array.from({ length: Math.max(0, first.meta.totalPages - 1) }, (_, index) => index + 2).map(
      (page) => api.listPermits({ status: 'PENDING_APPROVAL', page, pageSize: 50 }),
    ),
  );

  return [...first.data, ...remaining.flatMap((page) => page.data)];
}

type Decision = 'approve' | 'reject';

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<Permit | null>(null);
  const [decision, setDecision] = useState<Decision>('approve');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, error, isLoading, reload } = useAsyncData(loadPending, [user?.id]);

  if (!isApprover(user)) {
    return (
      <EmptyState
        title="Approvals are not available for your role"
        message="Only area owners, safety officers and administrators can decide permit approvals."
        icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
        action={
          <Link to="/permits">
            <Button variant="secondary">Back to permits</Button>
          </Link>
        }
      />
    );
  }

  const myQueue = (data ?? []).filter((permit) => canDecideApproval(user, permit));
  const others = (data ?? []).filter((permit) => !canDecideApproval(user, permit));

  const openDecision = (permit: Permit, next: Decision) => {
    setSelected(permit);
    setDecision(next);
    setNote('');
    setActionError(null);
  };

  const submitDecision = async () => {
    if (!selected) return;

    if (decision === 'reject' && !note.trim()) {
      setActionError('A rejection reason is required.');
      return;
    }

    setBusy(true);
    setActionError(null);

    try {
      if (decision === 'approve') {
        await api.approvePermit(selected.id, note.trim() ? { comment: note.trim() } : {});
      } else {
        await api.rejectPermit(selected.id, { reason: note.trim() });
      }
      setSelected(null);
      reload();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Unable to record decision');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Approval queue</h2>
        <p className="mt-1 text-sm text-slate-500">
          Review permits waiting for your authorization. Decisions are recorded in the audit log.
        </p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : isLoading ? (
        <Card>
          <p className="py-12 text-center text-sm text-slate-500">Loading approvals…</p>
        </Card>
      ) : (
        <>
          <Card
            title="Awaiting your decision"
            description={`${myQueue.length} permit${myQueue.length === 1 ? '' : 's'} assigned to your role.`}
          >
            {myQueue.length === 0 ? (
              <EmptyState
                title="Queue is clear"
                message="There are no permits currently waiting for your role."
                icon={<CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
              />
            ) : (
              <ul className="space-y-3">
                {myQueue.map((permit) => (
                  <li
                    key={permit.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/permits/${permit.id}`}
                            className="font-semibold text-teal-800 hover:underline"
                          >
                            {permit.permitNumber}
                          </Link>
                          <Badge tone="blue">{formatType(permit.type)}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-700">{permit.workDescription}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {permit.plant.name} · {permit.area.name} · Requested by{' '}
                          {permit.requester.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Planned {formatDateTime(permit.plannedStartAt)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                          onClick={() => openDecision(permit, 'approve')}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          icon={<XCircle className="h-4 w-4" aria-hidden="true" />}
                          onClick={() => openDecision(permit, 'reject')}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Other pending permits" description="Visible for plant-wide oversight.">
            {others.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">No other permits are pending.</p>
            ) : (
              <ul className="divide-y divide-slate-200">
                {others.map((permit) => (
                  <li key={permit.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div>
                      <Link
                        to={`/permits/${permit.id}`}
                        className="font-semibold text-slate-900 hover:text-teal-800"
                      >
                        {permit.permitNumber}
                      </Link>
                      <p className="text-sm text-slate-500">{permit.workDescription}</p>
                    </div>
                    <Badge tone="amber">Awaiting other approver</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      <Modal
        open={Boolean(selected)}
        title={decision === 'approve' ? 'Approve permit' : 'Reject permit'}
        description={
          selected
            ? `${selected.permitNumber} · ${selected.workDescription}`
            : undefined
        }
        onClose={() => setSelected(null)}
      >
        <Field
          id="decision-note"
          label={decision === 'approve' ? 'Comment (optional)' : 'Rejection reason'}
          required={decision === 'reject'}
          hint={
            decision === 'approve'
              ? 'Add any conditions the permit holder should know about.'
              : 'The requester will see this reason.'
          }
          error={actionError ?? undefined}
        >
          <textarea
            id="decision-note"
            rows={4}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
          />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setSelected(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={decision === 'reject' ? 'danger' : 'primary'}
            loading={busy}
            onClick={submitDecision}
          >
            {decision === 'approve' ? 'Confirm approval' : 'Confirm rejection'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
