import React, { useState } from 'react';
import { DemoNotice } from '../../components/DemoNotice';
import { PortalLayout } from '../../components/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import type { Office } from '../../types/sams';
import { apiFetch } from '../../utils/api';

export function AdminOfficesPage() {
  const { catalog, isDemoMode, refreshCatalog } = useAuth();
  const [editing, setEditing] = useState<Partial<Office> | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [demoNotice, setDemoNotice] = useState('');
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setError('');
    setMessage('');
    setDemoNotice('');
    if (isDemoMode) {
      setDemoNotice(
        'Office modifications are disabled in Demo Preview Mode. Configure PostgreSQL and sign in as an administrator to save university office records.'
      );
      setEditing(null);
      return;
    }

    try {
      await apiFetch('/api/admin/offices', {
        method: 'POST',
        body: JSON.stringify(editing),
      });
      await refreshCatalog();
      setEditing(null);
      setMessage('Office record saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save office.');
    }
  };

  const handleDeleteOffice = async (id: string) => {
    setError('');
    setMessage('');
    setDemoNotice('');
    if (isDemoMode) {
      setConfirmDeleteId(null);
      setDemoNotice(
        'Deleting offices is disabled in Demo Preview Mode. Configure PostgreSQL and sign in as an administrator.'
      );
      return;
    }

    setDeletingId(id);
    try {
      await apiFetch(`/api/admin/offices/${id}`, { method: 'DELETE' });
      await refreshCatalog();
      setConfirmDeleteId(null);
      setMessage('Office record deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete office.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PortalLayout title="Office Management" breadcrumb="Admin Portal / Offices">
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
            onClick={() =>
              setEditing({
                code: '',
                name: '',
                buildingLocation: '',
                email: '',
                phone: '',
                headTitle: '',
                description: '',
                isActive: true,
              })
            }
            className="px-4 py-2 text-xs font-medium rounded-lg bg-[#0F2547] text-white"
          >
            Add BAUST Office
          </button>
        </div>

        {editing && (
          <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-base font-bold text-[#0F2547]">
              {editing.id ? 'Edit Office' : 'New Office'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Office Code</label>
                <input
                  type="text"
                  required
                  value={editing.code ?? ''}
                  onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Office Name</label>
                <input
                  type="text"
                  required
                  value={editing.name ?? ''}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Building Location</label>
                <input
                  type="text"
                  required
                  value={editing.buildingLocation ?? ''}
                  onChange={(e) => setEditing({ ...editing, buildingLocation: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={editing.email ?? ''}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                <input
                  type="text"
                  required
                  value={editing.phone ?? ''}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Office Head Title</label>
                <input
                  type="text"
                  required
                  value={editing.headTitle ?? ''}
                  onChange={(e) => setEditing({ ...editing, headTitle: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={editing.description ?? ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={editing.isActive !== false}
                onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
              />
              <span>Office Active &amp; Receiving Applications</span>
            </label>
            <div className="flex items-center gap-3">
              <button type="submit" className="px-4 py-2 text-xs font-medium rounded-lg bg-[#1D4ED8] text-white">
                Save Office
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
          {catalog.offices.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-500">No university offices configured yet.</p>
          ) : (
            catalog.offices.map((o) => (
              <div key={o.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-mono text-slate-500">
                    {o.code} · {o.buildingLocation}
                    {!o.isActive ? ' · Inactive' : ''}
                  </p>
                  <h3 className="font-display text-base font-bold text-slate-900 mt-0.5">{o.name}</h3>
                  <p className="text-xs text-slate-600 mt-1">{o.description}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {o.email} · <span className="font-mono">{o.phone}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDeleteId(null);
                      setEditing({ ...o });
                    }}
                    className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Edit Office
                  </button>
                  {confirmDeleteId === o.id ? (
                    <>
                      <button
                        type="button"
                        disabled={deletingId === o.id}
                        onClick={() => void handleDeleteOffice(o.id)}
                        className="px-3 py-2 text-xs font-medium rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                      >
                        {deletingId === o.id ? 'Deleting...' : 'Confirm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-2 text-xs font-medium rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(o.id)}
                      className="px-3 py-2 text-xs font-medium rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
