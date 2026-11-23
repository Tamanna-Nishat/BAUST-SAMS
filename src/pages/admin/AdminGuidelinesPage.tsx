import React, { useState } from 'react';
import { DemoNotice } from '../../components/DemoNotice';
import { PortalLayout } from '../../components/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import type { Guideline } from '../../types/sams';
import { apiFetch } from '../../utils/api';

export function AdminGuidelinesPage() {
  const { catalog, isDemoMode, refreshCatalog } = useAuth();
  const [editing, setEditing] = useState<Partial<Guideline> | null>(null);
  const [stepsText, setStepsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [demoNotice, setDemoNotice] = useState('');
  const [error, setError] = useState('');

  const startCreate = () => {
    const defaultCat = catalog.categories[0];
    const defaultOffice =
      catalog.offices.find((o) => o.id === defaultCat?.defaultOfficeId) ?? catalog.offices[0];
    setEditing({
      categoryId: defaultCat?.id ?? '',
      title: defaultCat ? `${defaultCat.name} Guidelines` : '',
      summary: '',
      eligibilityDetails: defaultCat?.eligibility ?? 'Enrolled BAUST students.',
      deadlineNote: defaultCat?.deadlineText ?? 'Open year-round',
      feeNote: defaultCat ? `BDT ${defaultCat.feeBdt}` : 'No fee',
      contactOfficeId: defaultOffice?.id ?? '',
      contactEmail: defaultOffice?.email ?? '',
      contactPhone: defaultOffice?.phone ?? '',
    });
    setStepsText('Prepare required supporting documents\nSubmit application online via SAMS');
    setError('');
    setMessage('');
    setDemoNotice('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setError('');
    setMessage('');
    setDemoNotice('');
    if (isDemoMode) {
      setDemoNotice(
        'Saving guideline changes is disabled in Demo Preview Mode. Configure PostgreSQL and sign in as an administrator to persist updates.'
      );
      setEditing(null);
      return;
    }

    const steps = stepsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (steps.length === 0) {
      setError('Please enter at least one submission step.');
      return;
    }

    setSaving(true);
    try {
      await apiFetch('/api/admin/guidelines', {
        method: 'POST',
        body: JSON.stringify({
          ...editing,
          submissionSteps: steps,
        }),
      });
      await refreshCatalog();
      setMessage(editing.id ? 'Guideline updated.' : 'Guideline created.');
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save guideline.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalLayout title="Guideline Management" breadcrumb="Admin Portal / Guidelines">
      <div className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg border border-rose-200 bg-rose-50 text-sm text-rose-800">{error}</div>
        )}
        {message && (
          <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50 text-sm text-emerald-800">
            {message}
          </div>
        )}
        {demoNotice && <DemoNotice message={demoNotice} />}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={startCreate}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-[#0F2547] hover:bg-[#173463] text-white"
          >
            Add Guideline
          </button>
        </div>

        {editing && (
          <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-base font-bold text-[#0F2547]">
              {editing.id ? 'Edit Guideline' : 'Create New Guideline'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Application Category</label>
                <select
                  required
                  value={editing.categoryId ?? ''}
                  onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {catalog.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editing.title ?? ''}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Summary</label>
              <input
                type="text"
                required
                value={editing.summary ?? ''}
                onChange={(e) => setEditing({ ...editing, summary: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Eligibility Details</label>
              <textarea
                rows={2}
                required
                value={editing.eligibilityDetails ?? ''}
                onChange={(e) => setEditing({ ...editing, eligibilityDetails: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deadline Note</label>
                <input
                  type="text"
                  required
                  value={editing.deadlineNote ?? ''}
                  onChange={(e) => setEditing({ ...editing, deadlineNote: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fee Note</label>
                <input
                  type="text"
                  required
                  value={editing.feeNote ?? ''}
                  onChange={(e) => setEditing({ ...editing, feeNote: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Office</label>
                <select
                  required
                  value={editing.contactOfficeId ?? ''}
                  onChange={(e) => {
                    const office = catalog.offices.find((o) => o.id === e.target.value);
                    setEditing({
                      ...editing,
                      contactOfficeId: e.target.value,
                      contactEmail: office?.email || editing.contactEmail || '',
                      contactPhone: office?.phone || editing.contactPhone || '',
                    });
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {catalog.offices.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  required
                  value={editing.contactEmail ?? ''}
                  onChange={(e) => setEditing({ ...editing, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  required
                  value={editing.contactPhone ?? ''}
                  onChange={(e) => setEditing({ ...editing, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Submission Steps (one per line)</label>
              <textarea
                rows={4}
                required
                value={stepsText}
                onChange={(e) => setStepsText(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-[#0F2547] text-white"
              >
                {saving ? 'Saving...' : 'Save Guideline'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 text-slate-700"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {catalog.guidelines.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-500">No guidelines published yet.</p>
          ) : (
            catalog.guidelines.map((g) => (
              <div key={g.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500">
                    {g.contactOfficeName} · {g.feeNote}
                  </p>
                  <h3 className="font-display text-base font-bold text-slate-900 mt-0.5">{g.title}</h3>
                  <p className="text-xs text-slate-600 mt-1">{g.summary}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditing({ ...g });
                    setStepsText(g.submissionSteps.join('\n'));
                    setError('');
                    setMessage('');
                  }}
                  className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 shrink-0"
                >
                  Edit
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
