import { PencilLine } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { useToast } from '../../components/ui/ToastProvider';
import { useAsyncData } from '../../hooks/useAsyncData';
import { api } from '../../lib/api';
import { canEditDraft } from '../../lib/permissions';
import type { PermitPayload } from '../../types/api';
import { useAuth } from '../auth/AuthProvider';
import PermitForm from './PermitForm';

export default function EditPermitPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const { data, error, isLoading, reload } = useAsyncData(() => api.getPermit(id), [id]);

  if (error) return <ErrorState message={error} onRetry={reload} />;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
        Loading permit…
      </div>
    );
  }

  if (!data) return null;

  if (!canEditDraft(user, data)) {
    return (
      <EmptyState
        title="This permit cannot be edited"
        message="Only the requester or an administrator can edit a permit in draft status."
        icon={<PencilLine className="h-5 w-5" aria-hidden="true" />}
        action={
          <Link to={`/permits/${id}`}>
            <Button variant="secondary">Back to permit</Button>
          </Link>
        }
      />
    );
  }

  const handleSubmit = async (payload: PermitPayload) => {
    setBusy(true);
    try {
      const permit = await api.updatePermit(id, payload);
      notify(`${permit.permitNumber} updated.`);
      navigate(`/permits/${permit.id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Edit draft permit</h2>
        <p className="mt-1 text-sm text-slate-500">
          Updating this permit increments its version and records an audit entry.
        </p>
      </div>
      <PermitForm
        initial={data}
        onSubmit={handleSubmit}
        submitLabel="Save changes"
        onCancel={() => navigate(`/permits/${id}`)}
        busy={busy}
      />
    </div>
  );
}
