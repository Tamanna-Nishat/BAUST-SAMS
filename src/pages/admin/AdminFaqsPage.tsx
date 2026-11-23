import React, { useEffect, useState } from 'react';
import { DemoNotice } from '../../components/DemoNotice';
import { PortalLayout } from '../../components/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import type { FaqItem } from '../../types/sams';
import { apiFetch } from '../../utils/api';

export function AdminFaqsPage() {
  const { catalog, isDemoMode, refreshCatalog } = useAuth();
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [editing, setEditing] = useState<Partial<FaqItem> | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [demoNotice, setDemoNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isDemoMode) {
      setFaqs(catalog.faqs);
      return;
    }
    apiFetch<{ faqs: FaqItem[] }>('/api/admin/faqs')
      .then((res) => setFaqs(res.faqs))
      .catch(() => setFaqs(catalog.faqs));
  }, [isDemoMode, catalog.faqs]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setError('');
    setMessage('');
    setDemoNotice('');
    if (isDemoMode) {
      setDemoNotice(
        'FAQ edits are disabled in Demo Preview Mode. Configure PostgreSQL and sign in as an administrator to publish changes.'
      );
      setEditing(null);
      return;
    }

    try {
      const res = await apiFetch<{ faq: FaqItem }>('/api/admin/faqs', {
        method: 'POST',
        body: JSON.stringify(editing),
      });
      await refreshCatalog();
      setFaqs((prev) => {
        const exists = prev.some((f) => f.id === res.faq.id);
        return exists ? prev.map((f) => (f.id === res.faq.id ? res.faq : f)) : [...prev, res.faq];
      });
      setEditing(null);
      setMessage('FAQ saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save FAQ.');
    }
  };

  const handleDelete = async (id: string) => {
    setError('');
    setMessage('');
    setDemoNotice('');
    if (isDemoMode) {
      setConfirmDeleteId(null);
      setDemoNotice(
        'Deleting FAQs is disabled in Demo Preview Mode. Configure PostgreSQL and sign in as an administrator.'
      );
      return;
    }
    setDeletingId(id);
    try {
      await apiFetch(`/api/admin/faqs/${id}`, { method: 'DELETE' });
      await refreshCatalog();
      setFaqs((prev) => prev.filter((f) => f.id !== id));
      setConfirmDeleteId(null);
      setMessage('FAQ entry deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete FAQ.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PortalLayout title="FAQ Management" breadcrumb="Admin Portal / FAQ Management">
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
                question: '',
                answer: '',
                categoryId: '',
                isPublished: true,
                sortOrder: faqs.length + 1,
              })
            }
            className="px-4 py-2 text-xs font-medium rounded-lg bg-[#0F2547] text-white"
          >
            Add FAQ Entry
          </button>
        </div>

        {editing && (
          <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="font-display text-base font-bold text-[#0F2547]">
              {editing.id ? 'Edit FAQ' : 'New FAQ Entry'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={editing.categoryId ?? ''}
                  onChange={(e) => setEditing({ ...editing, categoryId: e.target.value || undefined })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">General System</option>
                  {catalog.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 pb-2">
                  <input
                    type="checkbox"
                    checked={Boolean(editing.isPublished)}
                    onChange={(e) => setEditing({ ...editing, isPublished: e.target.checked })}
                  />
                  Published on Public FAQ Page
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Question</label>
              <input
                type="text"
                required
                value={editing.question ?? ''}
                onChange={(e) => setEditing({ ...editing, question: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Answer</label>
              <textarea
                rows={3}
                required
                value={editing.answer ?? ''}
                onChange={(e) => setEditing({ ...editing, answer: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" className="px-4 py-2 text-xs font-medium rounded-lg bg-[#1D4ED8] text-white">
                Save FAQ
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
          {faqs.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-500">No FAQ entries configured yet.</p>
          ) : (
            faqs.map((f) => (
              <div key={f.id} className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-500">
                    {f.categoryName || 'General System'} · {f.isPublished ? 'Published' : 'Hidden'}
                  </p>
                  <h3 className="font-display text-sm font-bold text-slate-900 mt-1">{f.question}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{f.answer}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDeleteId(null);
                      setEditing({ ...f });
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  {confirmDeleteId === f.id ? (
                    <>
                      <button
                        type="button"
                        disabled={deletingId === f.id}
                        onClick={() => void handleDelete(f.id)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                      >
                        {deletingId === f.id ? 'Deleting...' : 'Confirm'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(f.id)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50"
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
