import { AlertTriangle, Clock3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  formatCountdown,
  formatCountdownShort,
  getExpiryState,
  getRemainingMs,
  type ExpirySubject,
} from '../../lib/expiry';

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}

export default function ExpiryIndicator({
  permit,
  compact = false,
  now,
}: {
  permit: ExpirySubject;
  compact?: boolean;
  now?: number;
}) {
  const tickNow = useNow(compact ? 30_000 : 1_000);
  const currentNow = now ?? tickNow;
  const state = getExpiryState(permit, currentNow);

  if (state === 'not-applicable') return null;

  const remainingMs = getRemainingMs(permit.validUntil, currentNow);
  const countdown = compact ? formatCountdownShort(remainingMs) : formatCountdown(remainingMs);
  const baseClass = 'inline-flex flex-wrap items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold';

  if (state === 'expiring-soon') {
    return (
      <span className={`${baseClass} border border-amber-300 bg-amber-100 text-amber-900`}>
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Expiring Soon
        <span className="font-medium">· {countdown}</span>
      </span>
    );
  }

  if (state === 'expired') {
    return (
      <span className={`${baseClass} border border-red-200 bg-red-50 text-red-700`}>
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Expired
      </span>
    );
  }

  if (state === 'unknown') {
    return <span className={`${baseClass} bg-slate-100 text-slate-500`}>{countdown}</span>;
  }

  return (
    <span className={`${baseClass} bg-slate-100 text-slate-600`}>
      <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {countdown}
    </span>
  );
}
