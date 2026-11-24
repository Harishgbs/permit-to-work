import { ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import EmptyState from '../../components/ui/EmptyState';
import ExpiryIndicator from '../../components/ui/ExpiryIndicator';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatDate, formatType } from '../../lib/format';
import type { Permit } from '../../types/api';

export default function PermitTable({
  permits,
  emptyMessage = 'No permits match the current view.',
}: {
  permits: Permit[];
  emptyMessage?: string;
}) {
  if (!permits.length) {
    return (
      <EmptyState
        title="No permits found"
        message={emptyMessage}
        icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Permit</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3">Planned</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {permits.map((permit) => (
            <tr key={permit.id} className="hover:bg-slate-50/70">
              <td className="px-4 py-3">
                <Link
                  to={`/permits/${permit.id}`}
                  className="font-semibold text-teal-800 hover:text-teal-900 hover:underline"
                >
                  {permit.permitNumber}
                </Link>
                <p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">
                  {permit.workDescription}
                </p>
              </td>
              <td className="px-4 py-3 text-slate-600">{formatType(permit.type)}</td>
              <td className="px-4 py-3">
                <p className="text-slate-700">{permit.area.name}</p>
                <p className="text-xs text-slate-500">{permit.plant.name}</p>
              </td>
              <td className="px-4 py-3 text-slate-600">{formatDate(permit.plannedStartAt)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={permit.status} />
                {(permit.status === 'ACTIVE' || permit.status === 'EXPIRED') && (
                  <div className="mt-1.5">
                    <ExpiryIndicator permit={permit} compact />
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  to={`/permits/${permit.id}`}
                  className="text-sm font-semibold text-slate-700 hover:text-teal-800"
                >
                  View →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
