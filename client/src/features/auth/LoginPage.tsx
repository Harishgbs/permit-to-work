import { AlertCircle, ArrowRight, Eye, EyeOff, Flame, HardHat, LockKeyhole, Wind } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { useAuth } from './AuthProvider';

const demoAccounts = [
  { label: 'Requester', email: 'requester@example.com' },
  { label: 'Area owner', email: 'area-owner@example.com' },
  { label: 'Safety officer', email: 'safety-officer@example.com' },
  { label: 'Admin', email: 'admin@example.com' },
];

export default function LoginPage() {
  const { user, status, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      navigate(from, { replace: true });
    }
  }, [status, from, navigate]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Spinner className="h-7 w-7 text-teal-400" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await signIn(email.trim(), password);
      navigate(from, { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(13,148,136,0.22),transparent_45%),radial-gradient(circle_at_85%_80%,rgba(245,158,11,0.14),transparent_40%)]" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600">
                <HardHat className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <p className="text-lg font-bold tracking-wider">SAFEZONE</p>
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Permit Control</p>
              </div>
            </div>
          </div>

          <div className="relative max-w-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-teal-400">
              Controlled work. Accountable teams.
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight">
              Every hazardous task starts with a verified permit.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-slate-400">
              Plan, review, authorize and close hot work, confined space, height and electrical work
              from one auditable workspace.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-3">
              {[
                { icon: Flame, label: 'Hot work' },
                { icon: Wind, label: 'Confined space' },
                { icon: LockKeyhole, label: 'LOTO control' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur"
                >
                  <item.icon className="h-5 w-5 text-teal-400" aria-hidden="true" />
                  <p className="mt-3 text-xs font-semibold text-slate-200">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="relative text-xs text-slate-500">
            Industrial permit-to-work system · Role-based approvals · Append-only audit trail
          </p>
        </section>

        <section className="flex items-center justify-center bg-slate-50 px-5 py-12 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white">
                  <HardHat className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className="text-lg font-bold tracking-wider text-slate-900">SAFEZONE</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-9">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sign in</h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Use your plant credentials to access the permit workspace.
              </p>

              {error && (
                <div
                  role="alert"
                  className="mt-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                    Work email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                    placeholder="name@plant.com"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                      Password
                    </label>
                  </div>
                  <div className="relative mt-1.5">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-11 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" loading={submitting}>
                  {!submitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                  Sign in to workspace
                </Button>
              </form>

              <div className="mt-7 border-t border-slate-200 pt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Demo accounts · password DemoPass123!
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {demoAccounts.map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => {
                        setEmail(account.email);
                        setPassword('DemoPass123!');
                        setError(null);
                      }}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
                    >
                      {account.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
