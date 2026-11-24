import {
  CheckCircle2,
  ClipboardCheck,
  History,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  ShieldCheck,
  Square,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ErrorState from '../../components/ui/ErrorState';
import Field from '../../components/ui/Field';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import { useToast } from '../../components/ui/ToastProvider';
import { useAsyncData } from '../../hooks/useAsyncData';
import { api } from '../../lib/api';
import {
  formatAuditAction,
  formatAuditActor,
  formatAuditValue,
  formatDateTime,
  formatType,
  toDateTimeInputValue,
} from '../../lib/format';
import {
  canDecideApproval,
  canEditDraft,
  canResumePermit,
  hasPermission,
} from '../../lib/permissions';
import type {
  ConfinedSpaceData,
  ElectricalLotoData,
  HotWorkData,
  Permit,
  WorkingAtHeightData,
} from '../../types/api';
import { useAuth } from '../auth/AuthProvider';

type ActionKind =
  | 'approve'
  | 'reject'
  | 'activate'
  | 'suspend'
  | 'resume'
  | 'close'
  | 'verify'
  | 'cancel'
  | 'worklog';

export default function PermitDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const { notify } = useToast();
  const { data, error, isLoading, reload } = useAsyncData(() => api.getPermit(id), [id]);
  const {
    data: audit,
    error: auditError,
    isLoading: auditIsLoading,
    reload: reloadAudit,
  } = useAsyncData(() => api.getPermitAudit(id), [id]);
  const [action, setAction] = useState<ActionKind | null>(null);
  const [note, setNote] = useState('');
  const [validUntil, setValidUntil] = useState(toDateTimeInputValue(new Date().toISOString()));
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (error) return <ErrorState message={error} onRetry={reload} />;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
        Loading permit details…
      </div>
    );
  }

  if (!data) return null;

  const openAction = (kind: ActionKind) => {
    setAction(kind);
    setNote('');
    setActionError(null);
    if (kind === 'activate') {
      setValidUntil(toDateTimeInputValue(data.validUntil ?? new Date().toISOString()));
    }
  };

  const runAction = async (kind: ActionKind) => {
    setBusy(true);
    setActionError(null);

    try {
      switch (kind) {
        case 'approve':
          await api.approvePermit(id, note.trim() ? { comment: note.trim() } : {});
          notify('Approval recorded.');
          break;
        case 'reject':
          await api.rejectPermit(id, { reason: note.trim() });
          notify('Permit rejected.');
          break;
        case 'activate':
          await api.activatePermit(id, {
            validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
            comment: note.trim() || undefined,
          });
          notify('Permit activated.');
          break;
        case 'suspend':
          await api.suspendPermit(id, { reason: note.trim() });
          notify('Permit suspended.');
          break;
        case 'resume':
          await api.resumePermit(id, note.trim() ? { comment: note.trim() } : {});
          notify('Permit resumed.');
          break;
        case 'close':
          await api.closePermit(id, note.trim() ? { comment: note.trim() } : {});
          notify('Permit closed.');
          break;
        case 'verify':
          await api.verifyPermit(id, note.trim() ? { comment: note.trim() } : {});
          notify('Permit verified.');
          break;
        case 'cancel':
          await api.cancelPermit(id, { reason: note.trim() });
          notify('Permit cancelled.');
          break;
        case 'worklog':
          await api.addWorkLog(id, { note: note.trim() });
          notify('Work log recorded.');
          break;
      }
      setAction(null);
      reload();
      reloadAudit();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Unable to perform action');
    } finally {
      setBusy(false);
    }
  };

  const submitDraft = async () => {
    setBusy(true);
    try {
      await api.submitPermit(id);
      notify(`${data.permitNumber} submitted for approval.`);
      reload();
      reloadAudit();
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'Unable to submit permit', 'error');
    } finally {
      setBusy(false);
    }
  };

  const requiresText = action === 'reject' || action === 'suspend' || action === 'cancel' || action === 'worklog';
  const actionTitle: Record<ActionKind, string> = {
    approve: 'Approve permit',
    reject: 'Reject permit',
    activate: 'Activate permit',
    suspend: 'Suspend permit',
    resume: 'Resume permit',
    close: 'Close permit',
    verify: 'Verify closeout',
    cancel: 'Cancel permit',
    worklog: 'Add work log',
  };

  const handleConfirm = () => {
    if (requiresText && !note.trim()) {
      setActionError(action === 'worklog' ? 'A work log note is required.' : 'A reason is required.');
      return;
    }
    if (action) void runAction(action);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                {data.permitNumber}
              </h2>
              <StatusBadge status={data.status} />
              <Badge tone="blue">{formatType(data.type)}</Badge>
            </div>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">{data.workDescription}</p>
            <p className="mt-2 text-xs text-slate-500">
              Created {formatDateTime(data.createdAt)} · Version {data.version} · Requested by{' '}
              {data.requester.name}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.status === 'DRAFT' && canEditDraft(user, data) && (
              <Link to={`/permits/${id}/edit`}>
                <Button variant="secondary" icon={<Pencil className="h-4 w-4" aria-hidden="true" />}>
                  Edit
                </Button>
              </Link>
            )}
            {data.status === 'DRAFT' && hasPermission(user, 'permit:create') && (
              <Button
                loading={busy}
                icon={<ClipboardCheck className="h-4 w-4" aria-hidden="true" />}
                onClick={submitDraft}
              >
                Submit for approval
              </Button>
            )}
            {data.status === 'PENDING_APPROVAL' && canDecideApproval(user, data) && (
              <>
                <Button
                  variant="secondary"
                  icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => openAction('approve')}
                >
                  Approve
                </Button>
                <Button
                  variant="danger"
                  icon={<XCircle className="h-4 w-4" aria-hidden="true" />}
                  onClick={() => openAction('reject')}
                >
                  Reject
                </Button>
              </>
            )}
            {data.status === 'APPROVED' && hasPermission(user, 'permit:activate') && (
              <Button icon={<Play className="h-4 w-4" aria-hidden="true" />} onClick={() => openAction('activate')}>
                Activate
              </Button>
            )}
            {data.status === 'ACTIVE' && hasPermission(user, 'permit:worklog') && (
              <Button variant="secondary" icon={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={() => openAction('worklog')}>
                Log work
              </Button>
            )}
            {data.status === 'ACTIVE' && hasPermission(user, 'permit:suspend') && (
              <Button variant="danger" icon={<Square className="h-4 w-4" aria-hidden="true" />} onClick={() => openAction('suspend')}>
                Suspend
              </Button>
            )}
            {canResumePermit(user, data) && (
              <Button icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />} onClick={() => openAction('resume')}>
                Resume
              </Button>
            )}
            {['ACTIVE', 'SUSPENDED'].includes(data.status) && hasPermission(user, 'permit:close') && (
              <Button variant="secondary" onClick={() => openAction('close')}>
                Close work
              </Button>
            )}
            {data.status === 'CLOSED' && hasPermission(user, 'permit:verify') && (
              <Button icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />} onClick={() => openAction('verify')}>
                Verify closeout
              </Button>
            )}
            {['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(data.status) &&
              hasPermission(user, 'permit:cancel') && (
                <Button variant="ghost" onClick={() => openAction('cancel')}>
                  Cancel permit
                </Button>
              )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Work information">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label="Plant" value={data.plant.name} />
            <Detail label="Area" value={data.area.name} />
            <Detail label="Equipment" value={data.equipment ? `${data.equipment.tag} ${data.equipment.name ?? ''}` : 'Not specified'} />
            <Detail label="Contractor" value={data.contractorTeam} />
            <div className="sm:col-span-2">
              <Detail label="Work location" value={data.workLocation} />
            </div>
            <Detail label="Planned start" value={formatDateTime(data.plannedStartAt)} />
            <Detail label="Planned end" value={formatDateTime(data.plannedEndAt)} />
            <Detail label="Valid until" value={formatDateTime(data.validUntil)} />
            <Detail label="Requester" value={data.requester.name} />
            <div className="sm:col-span-2">
              <Detail label="Identified hazards" value={data.identifiedHazards ?? 'Not recorded'} />
            </div>
            <div className="sm:col-span-2">
              <Detail label="Required PPE" value={data.requiredPpe ?? 'Not recorded'} />
            </div>
            <div className="sm:col-span-2">
              <Detail label="Precautions" value={data.precautions ?? 'Not recorded'} />
            </div>
          </dl>
        </Card>

        <Card title="Type-specific controls" description={formatType(data.type)}>
          <TypeDataDisplay typeData={data.typeData} type={data.type} />
        </Card>
      </div>

      <Card title="Approval chain" description="Authorization steps for this permit.">
        <ol className="space-y-4">
          {data.approvals.map((approval) => (
            <li key={approval.id} className="flex gap-3">
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  approval.status === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-700'
                    : approval.status === 'REJECTED'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                }`}
              >
                {approval.step}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    {approval.requiredRole.replaceAll('_', ' ')}
                  </p>
                  <Badge
                    tone={
                      approval.status === 'APPROVED'
                        ? 'green'
                        : approval.status === 'REJECTED'
                          ? 'red'
                          : 'amber'
                    }
                  >
                    {approval.status}
                  </Badge>
                </div>
                {approval.comment && <p className="mt-1 text-sm text-slate-600">{approval.comment}</p>}
                {approval.decidedAt && (
                  <p className="mt-1 text-xs text-slate-500">Decided {formatDateTime(approval.decidedAt)}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card
        title="Audit timeline"
        description="Chronological record of permit activity, oldest first."
      >
        {auditError ? (
          <ErrorState message={auditError} onRetry={reloadAudit} />
        ) : auditIsLoading ? (
          <p className="py-12 text-center text-sm text-slate-500">Loading audit history…</p>
        ) : !audit?.length ? (
          <p className="py-12 text-center text-sm text-slate-500">
            No audit history recorded for this permit.
          </p>
        ) : (
          <ol className="space-y-4">
            {audit.map((entry) => (
              <li key={entry.id} className="flex gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <History className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatAuditAction(entry.action)}
                    </p>
                    <Badge tone={auditTone(entry.toValue)}>{formatAuditValue(entry.toValue)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDateTime(entry.timestamp)} · {formatAuditActor(entry)}
                  </p>
                  {(entry.fromValue || entry.toValue) && (
                    <p className="mt-1 text-xs text-slate-500">
                      {entry.fromValue ? formatAuditValue(entry.fromValue) : 'Start'} →{' '}
                      {formatAuditValue(entry.toValue)}
                    </p>
                  )}
                  {entry.comment && (
                    <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {entry.comment}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card
        title="Work log"
        description={`${data._count.workLogs} entr${data._count.workLogs === 1 ? 'y' : 'ies'} recorded.`}
        actions={
          data.status === 'ACTIVE' && hasPermission(user, 'permit:worklog') ? (
            <Button size="sm" variant="secondary" onClick={() => openAction('worklog')}>
              Add entry
            </Button>
          ) : undefined
        }
      >
        {data._count.workLogs === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No work logs recorded for this permit.
          </p>
        ) : (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Entries are recorded, but the API does not yet expose a work-log list endpoint. The
            current count above is live from the permit record.
          </div>
        )}
      </Card>

      <Modal
        open={Boolean(action)}
        title={action ? actionTitle[action] : ''}
        description={`${data.permitNumber} · Current status: ${data.status.replaceAll('_', ' ')}`}
        onClose={() => setAction(null)}
      >
        <div className="space-y-4">
          {action === 'activate' && (
            <Field
              id="valid-until"
              label="Valid until"
              required
              hint="Activation can be extended later if the work needs more time."
            >
              <input
                id="valid-until"
                type="datetime-local"
                value={validUntil}
                onChange={(event) => setValidUntil(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </Field>
          )}
          {action !== 'activate' && (
            <Field
              id="action-note"
              label={action === 'worklog' ? 'Work log note' : requiresText ? 'Reason' : 'Comment (optional)'}
              required={requiresText}
            >
              <textarea
                id="action-note"
                rows={4}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </Field>
          )}
          {action === 'activate' && (
            <Field id="activate-comment" label="Comment (optional)">
              <textarea
                id="activate-comment"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </Field>
          )}
          {actionError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {actionError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAction(null)}>
              Cancel
            </Button>
            <Button type="button" loading={busy} onClick={handleConfirm}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function auditTone(value: string | null): 'slate' | 'teal' | 'amber' | 'green' | 'red' | 'blue' {
  switch (value) {
    case 'APPROVED':
    case 'ACTIVE':
    case 'CLOSED_VERIFIED':
      return 'green';
    case 'REJECTED':
    case 'SUSPENDED':
    case 'EXPIRED':
    case 'CANCELLED':
      return 'red';
    case 'DRAFT':
    case 'PENDING_APPROVAL':
    case 'CLOSED':
      return 'amber';
    default:
      return 'blue';
  }
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800">{value}</dd>
    </div>
  );
}

function TypeDataDisplay({
  typeData,
  type,
}: {
  typeData: Permit['typeData'];
  type: Permit['type'];
}) {
  if (type === 'HOT_WORK') {
    const data = typeData as HotWorkData;
    return (
      <dl className="grid gap-4 sm:grid-cols-2">
        <Detail label="Method" value={data.hotWorkType} />
        <Detail label="Fire watch" value={data.fireWatch ? 'Assigned' : 'Not assigned'} />
        <Detail label="Extinguisher" value={data.extinguisherType} />
        <Detail label="Clearance radius" value={`${data.combustiblesClearanceRadiusMetres} m`} />
        <Detail label="Gas LEL" value={`${data.gasReadings.lel}%`} />
        <Detail label="Gas O2" value={`${data.gasReadings.o2}%`} />
        <div className="sm:col-span-2">
          <Detail label="Reading time" value={formatDateTime(data.gasReadings.recordedAt)} />
        </div>
      </dl>
    );
  }

  if (type === 'CONFINED_SPACE') {
    const data = typeData as ConfinedSpaceData;
    return (
      <dl className="grid gap-4 sm:grid-cols-2">
        <Detail label="Space ID" value={data.spaceId} />
        <Detail label="Entry point" value={data.entryPoint} />
        <Detail label="O2" value={String(data.atmosphericReadings.o2)} />
        <Detail label="LEL" value={String(data.atmosphericReadings.lel)} />
        <Detail label="H2S" value={String(data.atmosphericReadings.h2s)} />
        <Detail label="CO" value={String(data.atmosphericReadings.co)} />
        <Detail label="Reading time" value={formatDateTime(data.atmosphericReadings.recordedAt)} />
        <Detail label="Attendant" value={data.attendant} />
        <Detail label="Ventilation" value={data.ventilation} />
        <Detail label="Entry/exit log" value={data.entryExitLog} />
        <div className="sm:col-span-2">
          <Detail label="Rescue plan" value={data.rescuePlan} />
        </div>
      </dl>
    );
  }

  if (type === 'WORKING_AT_HEIGHT') {
    const data = typeData as WorkingAtHeightData;
    return (
      <dl className="grid gap-4 sm:grid-cols-2">
        <Detail label="Height" value={`${data.heightMetres} m`} />
        <Detail label="Access method" value={data.accessMethod} />
        <Detail label="Fall arrest" value={data.fallArrest ? 'Yes' : 'No'} />
        <Detail label="Barricading" value={data.barricading ? 'Yes' : 'No'} />
        <div className="sm:col-span-2">
          <Detail label="Anchor check" value={data.anchorCheck} />
        </div>
      </dl>
    );
  }

  const data = typeData as ElectricalLotoData;
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      <Detail label="Equipment tag" value={data.equipmentTag} />
      <Detail label="Voltage" value={String(data.voltage)} />
      <Detail label="Isolation points" value={String(data.isolationPoints)} />
      <Detail label="Lock/tag numbers" value={data.lockTagNumbers.join(', ')} />
      <Detail label="Earthing" value={data.earthing ? 'Yes' : 'No'} />
      <Detail label="Tested dead" value={data.testedDead ? 'Confirmed' : 'Not confirmed'} />
      <Detail label="Tested by" value={data.testedDeadBy} />
    </dl>
  );
}
