import { AlertTriangle } from 'lucide-react';
import Button from './Button';

export default function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-red-500" aria-hidden="true" />
      <h3 className="mt-3 text-sm font-semibold text-red-900">Something went wrong</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-red-700">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
