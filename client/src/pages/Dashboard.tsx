import { ShieldCheck } from 'lucide-react';

export default function Dashboard() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Overview of permit activity across your plant.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <ShieldCheck className="mx-auto h-10 w-10 text-teal-600" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-semibold">Foundation ready</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          The application shell is in place. Permit workflows and reporting will be
          added in the next implementation milestones.
        </p>
      </div>
    </section>
  );
}
