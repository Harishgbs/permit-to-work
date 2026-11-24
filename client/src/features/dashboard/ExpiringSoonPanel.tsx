import { AlertTriangle, ArrowRight, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import ExpiryIndicator from '../../components/ui/ExpiryIndicator';
import { formatDateTime, formatType } from '../../lib/format';
import { getExpiringSoonPermits } from '../../lib/expiry';
import type { Permit } from '../../types/api';

export default function ExpiringSoonPanel({
  permits,
  now,
}: {
  permits: Permit[];
  now?: number;
}) {
  const expiring = getExpiringSoonPermits(permits, now);

  if (!expiring.length) return null;

  return (
    <section
      aria-label="Permits expiring soon"
      className="overflow-hidden rounded-xl border border-amber-300 bg-amber-50 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 px-4 py-3 sm:px-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-bold text-amber-900">Expiring Soon</h3>
            <p className="mt-0.5 text-xs text-amber-800">
              Active permits expiring within the next 2 hours.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-amber-900">
          {expiring.length}
        </span>
      </div>
      <ul className="divide-y divide-amber-200">
        {expiring.map((permit) => {
          const location = permit.equipment?.tag
            ? `${permit.equipment.tag} · ${permit.area.name}`
            : permit.area.name;

          return (
            <li
              key={permit.id}
              className="flex flex-col gap-3 px-4 py-4 first:pt-3 last:pb-3 sm:flex-row sm:items-start sm:justify-between sm:px-5"
            >
              <div className="min-w-0">
                <Link
                  to={`/permits/${permit.id}`}
                  className="font-semibold text-amber-950 hover:text-amber-700 hover:underline"
                >
                  {permit.permitNumber}
                </Link>
                <p className="mt-0.5 truncate text-sm text-amber-900/80">{permit.workDescription}</p>
                <p className="mt-1 text-xs text-amber-800">
                  {formatType(permit.type)} · {location}
                </p>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <ExpiryIndicator permit={permit} now={now} />
                <p className="text-xs text-amber-800">
                  <Clock3 className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                  {formatDateTime(permit.validUntil)}
                </p>
                <Link
                  to={`/permits/${permit.id}`}
                  className="text-xs font-semibold text-amber-900 hover:underline"
                >
                  Open details <ArrowRight className="inline h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
