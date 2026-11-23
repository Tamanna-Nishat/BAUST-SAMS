import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PublicLayout } from '../../components/PublicLayout';
import { useAuth } from '../../context/AuthContext';
import type { DemoPersonaKey } from '../../data/demoData';

export function LoginPage() {
  const { login, setupAdmin, needsAdminSetup, postgresConfigured, databaseConnected, databaseError, enterDemoMode } =
    useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get('redirect') || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // First-run admin setup state (shown only when no admin account exists yet)
  const [showAdminSetup, setShowAdminSetup] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const routeByRole = (role: string) => {
    const isSafeInternal = redirectParam.startsWith('/') && !redirectParam.startsWith('//');
    if (isSafeInternal) {
      if (role === 'student' && redirectParam.startsWith('/student/')) {
        navigate(redirectParam);
        return;
      }
      if (role === 'staff' && redirectParam.startsWith('/staff/')) {
        navigate(redirectParam);
        return;
      }
      if (role === 'admin' && (redirectParam.startsWith('/admin/') || redirectParam.startsWith('/staff/'))) {
        navigate(redirectParam);
        return;
      }
    }
    if (role === 'admin') navigate('/admin/dashboard');
    else if (role === 'staff') navigate('/staff/dashboard');
    else navigate('/student/dashboard');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postgresConfigured) {
      setError('PostgreSQL is not configured. Use Demo Preview Mode on the right to explore the application.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email, password);
      routeByRole(user.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postgresConfigured) return;
    setError('');
    setSubmitting(true);
    try {
      const user = await setupAdmin({
        fullName: adminName,
        email: adminEmail,
        phone: adminPhone || undefined,
        password: adminPassword,
      });
      routeByRole(user.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Administrator setup failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoPersona = (persona: DemoPersonaKey, path: string) => {
    enterDemoMode(persona);
    navigate(path);
  };

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          {!postgresConfigured ? (
            <div className="mb-6 p-4 rounded-lg border border-amber-200 bg-amber-50/80 text-xs text-amber-950">
              <p className="font-semibold">PostgreSQL Not Configured — Live Sign In Disabled</p>
              <p className="mt-1 leading-relaxed">
                {databaseError ? (
                  <>{databaseError} </>
                ) : (
                  <>
                    Live authentication is unavailable until PostgreSQL credentials are configured in{' '}
                    <span className="font-mono">.env</span>.{' '}
                  </>
                )}
                Use the <strong>Demo Preview Mode</strong> panel on the right to inspect Student, Staff, and Administrator portals without creating fake sessions.
              </p>
            </div>
          ) : !databaseConnected && databaseError ? (
            <div className="mb-6 p-4 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-900">
              <p className="font-semibold">PostgreSQL Connection Unavailable</p>
              <p className="mt-1 leading-relaxed">{databaseError}</p>
            </div>
          ) : null}

          {needsAdminSetup && postgresConfigured && (
            <div className="mb-6 p-4 rounded-lg border border-blue-200 bg-blue-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[#0F2547]">First-Run System Configuration</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  No administrator account is configured yet. Claim the initial administrator account to manage staff and offices.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setShowAdminSetup((v) => !v);
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#0F2547] text-white whitespace-nowrap"
              >
                {showAdminSetup ? 'Back to Sign In' : 'Claim Admin Setup'}
              </button>
            </div>
          )}

          {showAdminSetup && needsAdminSetup && postgresConfigured ? (
            <form onSubmit={handleAdminSetup} className="space-y-4">
              <div>
                <h1 className="font-display text-2xl font-bold text-[#0F2547]">Initial Administrator Setup</h1>
                <p className="text-sm text-slate-600 mt-1">
                  This one-time setup locks automatically once the first administrator account is created.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-800">{error}</div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Registrar / System Administrator"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">University Email</label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@baust.edu.bd"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Office Phone (Optional)</label>
                <input
                  type="text"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  placeholder="+880-5526-73405"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Administrator Password (min 8 chars)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg bg-[#0F2547] hover:bg-[#173463] disabled:opacity-50 text-white text-sm font-medium"
              >
                {submitting ? 'Creating Administrator...' : 'Create Administrator & Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <h1 className="font-display text-2xl font-bold text-[#0F2547]">Sign In to BAUST SAMS</h1>
                <p className="text-sm text-slate-600 mt-1">
                  Enter your university email and password to access live database-backed Student, Staff, or Administrator workflows.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-800">{error}</div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  disabled={!postgresConfigured}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@baust.edu.bd"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  disabled={!postgresConfigured}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !postgresConfigured}
                className="w-full py-2.5 rounded-lg bg-[#0F2547] hover:bg-[#173463] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {!postgresConfigured
                  ? 'Sign In Disabled (PostgreSQL Required)'
                  : submitting
                  ? 'Signing In...'
                  : 'Sign In'}
              </button>

              <p className="text-xs text-slate-600 pt-2">
                New BAUST student?{' '}
                <Link
                  to={redirectParam ? `/register?redirect=${encodeURIComponent(redirectParam)}` : '/register'}
                  className="text-[#1D4ED8] font-semibold hover:underline"
                >
                  Create a Student Account
                </Link>
              </p>
            </form>
          )}
        </div>

        {/* Demo Sandbox Launcher */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div>
            <p className="text-xs font-medium text-[#0D9488]">Unauthenticated UI Preview · Sample Data</p>
            <h2 className="font-display text-lg font-bold text-[#0F2547] mt-1">Demo Preview Mode</h2>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Explore all portal layouts and navigation flows using sample BAUST data without database credentials or login. Database mutations remain disabled in preview mode.
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => handleDemoPersona('student', '/student/dashboard')}
              className="w-full text-left p-3.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
            >
              <p className="text-sm font-semibold text-slate-900">Student Portal (Demo Preview)</p>
              <p className="text-xs text-slate-500 mt-0.5">Sample student · Browse, forms, tracking, Q&amp;A</p>
            </button>

            <button
              type="button"
              onClick={() => handleDemoPersona('staff_registrar', '/staff/dashboard')}
              className="w-full text-left p-3.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
            >
              <p className="text-sm font-semibold text-slate-900">Registrar Staff (Demo Preview)</p>
              <p className="text-xs text-slate-500 mt-0.5">Office queue, review layout, Q&amp;A (no medical access)</p>
            </button>

            <button
              type="button"
              onClick={() => handleDemoPersona('staff_medical', '/staff/dashboard')}
              className="w-full text-left p-3.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
            >
              <p className="text-sm font-semibold text-slate-900">Medical Officer (Demo Preview)</p>
              <p className="text-xs text-slate-500 mt-0.5">Medical clearance layout &amp; restricted attachments</p>
            </button>

            <button
              type="button"
              onClick={() => handleDemoPersona('admin', '/admin/dashboard')}
              className="w-full text-left p-3.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
            >
              <p className="text-sm font-semibold text-slate-900">Administrator (Demo Preview)</p>
              <p className="text-xs text-slate-500 mt-0.5">Users, permissions, offices, categories, audit logs &amp; reports</p>
            </button>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
