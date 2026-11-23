import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Trash2 } from 'lucide-react';
import { DemoNotice } from '../../components/DemoNotice';
import { PortalLayout } from '../../components/PortalLayout';
import { ApplicationStatusLabel } from '../../components/StatusIndicator';
import { useAuth } from '../../context/AuthContext';
import { APPLICATION_STATUSES, type Application } from '../../types/sams';
import { apiFetch, formatDate } from '../../utils/api';

export function StudentApplicationsPage({ draftsOnly = false }: { draftsOnly?: boolean }) {
  const { user, isDemoMode, demoApplications } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmDiscardId, setConfirmDiscardId] = useState<string | null>(null);
  const [discardingId, setDiscardingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [demoNotice, setDemoNotice] = useState('');

  useEffect(() => {
    if (isDemoMode) {
      setApplications(demoApplications.filter((a) => a.studentId === user?.id));
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await apiFetch<{ applications: Application[] }>('/api/applications');
        setApplications(res.applications);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load applications.');
      } finally {
        setLoading(false);
      }
    })();
  }, [isDemoMode, demoApplications, user?.id]);

  const handleDiscardDraft = async (app: Application) => {
    setError('');
    setMessage('');
    setDemoNotice('');

    if (isDemoMode) {
      setConfirmDiscardId(null);
      setDemoNotice(
        `Discarding draft "${app.applicationCode}" is disabled in Demo Preview Mode. Configure PostgreSQL and sign in as a student to manage persisted drafts.`
      );
      return;
    }

    setDiscardingId(app.id);
    try {
      await apiFetch(`/api/applications/${app.id}`, { method: 'DELETE' });
      setApplications((prev) => prev.filter((a) => a.id !== app.id));
      setConfirmDiscardId(null);
      setMessage(`Draft ${app.applicationCode} discarded.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to discard draft.');
    } finally {
      setDiscardingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = searchId.trim().toLowerCase();
    return applications.filter((a) => {
      if (draftsOnly && a.status !== 'Draft') return false;
      if (!draftsOnly && statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (!q) return true;
      return (
        a.applicationCode.toLowerCase().includes(q) ||
        a.subject.toLowerCase().includes(q) ||
        a.categoryName.toLowerCase().includes(q)
      );
    });
  }, [applications, draftsOnly, statusFilter, searchId]);

  return (
    <PortalLayout
      title={draftsOnly ? 'Draft Applications' : 'My Applications'}
      breadcrumb={`Student Portal / ${draftsOnly ? 'Drafts' : 'My Applications'}`}
    >
      <div className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg border border-rose-200 bg-rose-50 text-sm text-rose-800">{error}</div>
        )}
        {message && (
          <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50 text-sm text-emerald-800">{message}</div>
        )}
        {demoNotice && <DemoNotice message={demoNotice} />}

        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Search by Application Tracking ID (e.g. BAUST-2026-0041) or subject..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          {!draftsOnly && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">All Statuses</option>
              {APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-sm text-slate-500">Loading applications...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-medium text-slate-800">
                {draftsOnly ? 'No saved draft applications.' : 'No applications match your search criteria.'}
              </p>
              <Link
                to="/student/apply"
                className="inline-block mt-4 px-4 py-2 text-xs font-medium rounded-lg bg-[#1D4ED8] text-white"
              >
                Start New Application
              </Link>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-slate-200">
                {filtered.map((app) => (
                  <div key={app.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs font-semibold text-[#0F2547]">{app.applicationCode}</p>
                        <p className="font-semibold text-sm text-slate-900 mt-0.5">{app.subject}</p>
                        <p className="text-xs text-slate-500">{app.categoryName}</p>
                      </div>
                      <ApplicationStatusLabel status={app.status} />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span>{app.assignedOfficeName}</span>
                      <span className="font-mono tabular-nums">{formatDate(app.updatedAt)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {app.status === 'Draft' ? (
                        <>
                          <Link
                            to={`/student/drafts/${app.id}/edit`}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1D4ED8] text-white hover:bg-blue-700"
                          >
                            Resume Draft
                          </Link>
                          {confirmDiscardId === app.id ? (
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                disabled={discardingId === app.id}
                                onClick={() => void handleDiscardDraft(app)}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                              >
                                {discardingId === app.id ? 'Discarding...' : 'Confirm Discard'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDiscardId(null)}
                                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-600"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDiscardId(app.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Discard</span>
                            </button>
                          )}
                        </>
                      ) : (
                        <Link
                          to={`/student/applications/${app.id}`}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                        >
                          Track &amp; History
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                      <th className="py-3 px-6">Application ID</th>
                      <th className="py-3 px-4">Subject &amp; Category</th>
                      <th className="py-3 px-4">Office</th>
                      <th className="py-3 px-4">Updated</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filtered.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-6 font-mono text-xs font-semibold text-[#0F2547]">
                          {app.applicationCode}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-slate-900">{app.subject}</p>
                          <p className="text-xs text-slate-500">{app.categoryName}</p>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">{app.assignedOfficeName}</td>
                        <td className="py-3.5 px-4 font-mono text-xs tabular-nums text-slate-500">
                          {formatDate(app.updatedAt)}
                        </td>
                        <td className="py-3.5 px-4">
                          <ApplicationStatusLabel status={app.status} />
                        </td>
                        <td className="py-3.5 px-6 text-right whitespace-nowrap">
                          {app.status === 'Draft' ? (
                            <div className="inline-flex items-center justify-end gap-2">
                              <Link
                                to={`/student/drafts/${app.id}/edit`}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1D4ED8] text-white hover:bg-blue-700"
                              >
                                Resume Draft
                              </Link>
                              {confirmDiscardId === app.id ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={discardingId === app.id}
                                    onClick={() => void handleDiscardDraft(app)}
                                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                                  >
                                    {discardingId === app.id ? 'Discarding...' : 'Confirm'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDiscardId(null)}
                                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDiscardId(app.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50"
                                  title="Discard draft"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Discard</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <Link
                              to={`/student/applications/${app.id}`}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                            >
                              Track &amp; History
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
