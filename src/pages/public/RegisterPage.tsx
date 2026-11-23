import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PublicLayout } from '../../components/PublicLayout';
import { useAuth } from '../../context/AuthContext';

const DEPARTMENTS = [
  'Computer Science & Engineering (CSE)',
  'Electrical & Electronic Engineering (EEE)',
  'Mechanical Engineering (ME)',
  'Civil Engineering (CE)',
  'Industrial & Production Engineering (IPE)',
  'Business Administration (BBA)',
  'English',
];

export function RegisterPage() {
  const { register, allowNewRegistrations, postgresConfigured, enterDemoMode } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get('redirect') || '';

  const [fullName, setFullName] = useState('');
  const [baustId, setBaustId] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [batchSemester, setBatchSemester] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postgresConfigured) {
      setError('PostgreSQL is not configured. Student registration is disabled until PostgreSQL is connected.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await register({
        fullName,
        baustId,
        department,
        batchSemester,
        phone,
        email,
        password,
      });
      const safeStudentRedirect =
        redirectParam.startsWith('/student/') && !redirectParam.startsWith('//')
          ? redirectParam
          : '/student/dashboard';
      navigate(safeStudentRedirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
          <h1 className="font-display text-2xl font-bold text-[#0F2547]">Student Registration</h1>
          <p className="text-sm text-slate-600 mt-1">
            Register with your official BAUST Student ID to submit and track applications online.
          </p>

          {!postgresConfigured && (
            <div className="mt-5 p-4 rounded-lg border border-amber-200 bg-amber-50/90 text-xs text-amber-950 space-y-2.5">
              <p className="font-semibold">PostgreSQL Not Configured — Live Registration Disabled</p>
              <p className="leading-relaxed">
                Account creation is blocked until PostgreSQL credentials are configured in <span className="font-mono">.env</span> (no registrations are saved to local JSON). Use Demo Preview Mode to explore the Student Portal.
              </p>
              <button
                type="button"
                onClick={() => {
                  enterDemoMode('student');
                  navigate('/student/dashboard');
                }}
                className="px-3 py-1.5 rounded-md bg-[#0F2547] text-white font-medium hover:bg-[#173463]"
              >
                Open Student Portal (Demo Preview)
              </button>
            </div>
          )}

          {!allowNewRegistrations ? (
            <div className="mt-6 p-4 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-900">
              New student registration is currently closed by the BAUST Registrar Administrator.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-800">{error}</div>
              )}

              <fieldset disabled={!postgresConfigured} className="space-y-4 disabled:opacity-60">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ayesha Siddiqua"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">BAUST Student ID</label>
                    <input
                      type="text"
                      required
                      value={baustId}
                      onChange={(e) => setBaustId(e.target.value)}
                      placeholder="e.g. 220101015"
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100"
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Batch &amp; Level/Term</label>
                    <input
                      type="text"
                      required
                      value={batchSemester}
                      onChange={(e) => setBatchSemester(e.target.value)}
                      placeholder="e.g. Batch 20 · Level 3 Term 1"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@baust.edu.bd"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+880-17XXXXXXXX"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password (minimum 8 characters)</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100"
                  />
                </div>
              </fieldset>

              <button
                type="submit"
                disabled={submitting || !postgresConfigured}
                className="w-full py-2.5 rounded-lg bg-[#0F2547] hover:bg-[#173463] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {!postgresConfigured
                  ? 'Registration Disabled (PostgreSQL Required)'
                  : submitting
                  ? 'Creating Account...'
                  : 'Create Student Account'}
              </button>

              <p className="text-xs text-slate-600 pt-1">
                Already registered?{' '}
                <Link
                  to={redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : '/login'}
                  className="text-[#1D4ED8] font-semibold hover:underline"
                >
                  Sign In
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
