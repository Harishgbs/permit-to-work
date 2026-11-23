import { ClipboardPlus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/ToastProvider';
import { api } from '../../lib/api';
import { hasPermission } from '../../lib/permissions';
import type { PermitPayload } from '../../types/api';
import { useAuth } from '../auth/AuthProvider';
import PermitForm from './PermitForm';

export default function NewPermitPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  if (!hasPermission(user, 'permit:create')) {
    return (
      <EmptyState
        title="Permit creation is not available for your role"
        message="Requesters and administrators can create new permits."
        icon={<ClipboardPlus className="h-5 w-5" aria-hidden="true" />}
        action={
          <Link to="/permits">
            <Button variant="secondary">Back to permits</Button>
          </Link>
        }
      />
    );
  }

  const handleSubmit = async (payload: PermitPayload) => {
    setBusy(true);
    try {
      const permit = await api.createPermit(payload);
      notify(`${permit.permitNumber} created as a draft.`);
      navigate(`/permits/${permit.id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Create permit</h2>
        <p className="mt-1 text-sm text-slate-500">
          Draft permits are submitted for approval after all safety controls are captured.
        </p>
      </div>
      <PermitForm
        onSubmit={handleSubmit}
        submitLabel="Create draft permit"
        onCancel={() => navigate('/permits')}
        busy={busy}
      />
    </div>
  );
}
