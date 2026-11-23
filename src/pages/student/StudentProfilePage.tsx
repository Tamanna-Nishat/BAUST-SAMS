import React, { useState } from 'react';
import { DemoNotice } from '../../components/DemoNotice';
import { PortalLayout } from '../../components/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';

export function StudentProfilePage() {
  const { user, isDemoMode, refreshAuth } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [department, setDepartment] = useState(user?.department ?? '');
  const [batchSemester, setBatchSemester] = useState(user?.batchSemester ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [demoNotice, setDemoNotice] = useState('');
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setDemoNotice('');
    setError('');
    if (isDemoMode) {
      setDemoNotice(
        'Saving profile changes is disabled in Demo Preview Mode. Configure PostgreSQL and sign in with your student account to update profile records.'
      );
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ fullName, department, batchSemester, phone }),
      });
      await refreshAuth();
      setMessage('Profile updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalLayout title="My Profile" breadcrumb="Student Portal / My Profile">
      <div className="max-w-2xl bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <h2 className="font-display text-lg font-bold text-[#0F2547]">Academic &amp; Contact Information</h2>
        <p className="text-xs text-slate-500 mt-1">
          These details automatically populate your BAUST online application forms.
        </p>

        {message && (
          <div className="mt-4 p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-xs text-emerald-800">
            {message}
          </div>
        )}
        {demoNotice && (
          <div className="mt-4">
            <DemoNotice message={demoNotice} />
          </div>
        )}
        {error && (
          <div className="mt-4 p-3 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-800">{error}</div>
        )}

        <form onSubmit={handleSave} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">BAUST Student ID</label>
              <input
                type="text"
                disabled
                value={user?.baustId ?? '—'}
                className="w-full px-3 py-2 text-sm font-mono bg-slate-100 border border-slate-200 rounded-lg text-slate-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Email</label>
              <input
                type="email"
                disabled
                value={user?.email ?? ''}
                className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Batch &amp; Level/Term</label>
              <input
                type="text"
                value={batchSemester}
                onChange={(e) => setBatchSemester(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-[#0F2547] hover:bg-[#173463] disabled:opacity-50 text-white text-sm font-medium"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </PortalLayout>
  );
}
