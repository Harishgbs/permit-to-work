import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-teal-700">404</p>
      <h2 className="mt-3 text-2xl font-bold text-slate-900">Page not found</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
        The page you requested does not exist in this workspace.
      </p>
      <Link to="/" className="mt-6 inline-block">
        <Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>
          Back to dashboard
        </Button>
      </Link>
    </div>
  );
}
