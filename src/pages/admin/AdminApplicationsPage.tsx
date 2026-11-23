import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { PortalLayout } from '../../components/PortalLayout';
import { ApplicationStatusLabel } from '../../components/StatusIndicator';
import { useAuth } from '../../context/AuthContext';
import { APPLICATION_STATUSES, type Application } from '../../types/sams';
import { apiFetch, formatDate } from '../../utils/api';

export function AdminApplicationsPage() {
  const { catalog, isDemoMode, demoApplications } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [officeFilter, setOfficeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    if (isDemoMode) {
      setApplications(demoApplications);
      setLoading(false);
      return;
    }

    apiFetch<{ applications: Application[] }>('/api/applications')
      .then((res) => setApplications(res.applications))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load applications.'))
      .finally(() => setLoading(false));
  }, [isDemoMode, demoApplications]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return applications.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (officeFilter !== 'all' && a.assignedOfficeId !== officeFilter) return false;
      if (categoryFilter !== 'all' && a.categoryId !== categoryFilter) return false;
      if (!q) return true;
      return (
        a.applicationCode.toLowerCase().includes(q) ||
        a.studentName.toLowerCase().includes(q) ||
        a.studentBaustId.toLowerCase().includes(q) ||
        a.subject.toLowerCase().includes(q)
      );
    });
  }, [applications, statusFilter, officeFilter, categoryFilter, query]);

  const activeCount = applications.filter((a) =>
    ['Submitted', 'Under Review', 'Forwarded', 'Pending Decision'].includes(a.status)
  ).length;
  const awaitingCount = applications.filter((a) => a.status === 'Awaiting Student Information').length;
  const completedCount = applications.filter((a) => ['Approved', 'Completed'].includes(a.status)).length;

  return (
    <PortalLayout title="All University Applications" breadcrumb="Admin Portal / Applications">
      <div className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg border border-rose-200 bg-rose-50 text-sm text-rose-800">{error}</div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500">Total Records</p>
            <p className="font-mono text-2xl font-bold text-[#0F2547] mt-1 tabular-nums">
              {loading ? '—' : applications.length}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500">Active In-Progress</p>
            <p className="font-mono text-2xl font-bold text-[#1D4ED8] mt-1 tabular-nums">
              {loading ? '—' : activeCount}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500">Awaiting Student Info</p>
            <p className="font-mono text-2xl font-bold text-amber-700 mt-1 tabular-nums">
              {loading ? '—' : awaitingCount}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500">Approved / Completed</p>
            <p className="font-mono text-2xl font-bold text-[#0D9488] mt-1 tabular-nums">
              {loading ? '—' : completedCount}
            </p>
          </div>
        </div>

        {/* Search & Multi-Filters */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ID, Student, BAUST ID..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

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

          <select
            value={officeFilter}
            onChange={(e) => setOfficeFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Assigned Offices</option>
            {catalog.offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Categories</option>
            {catalog.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-sm text-slate-500">Loading applications...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">No applications match your selected filters.</div>
          ) : (
            <>
              <div className="md:hidden divide-y divide-slate-200">
                {filtered.map((app) => (
                  <div key={app.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs font-semibold text-[#0F2547]">{app.applicationCode}</p>
                        <p className="text-sm font-semibold text-slate-900 mt-0.5">{app.subject}</p>
                        <p className="text-xs text-slate-500">{app.categoryName}</p>
                      </div>
                      <ApplicationStatusLabel status={app.status} />
                    </div>
                    <p className="text-xs text-slate-600">
                      {app.studentName} · <span className="font-mono">{app.studentBaustId}</span> ({app.studentDepartment})
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{app.assignedOfficeName}</span>
                      <span className="font-mono tabular-nums">{formatDate(app.updatedAt)}</span>
                    </div>
                    <Link
                      to={`/admin/applications/${app.id}`}
                      className="inline-block px-3.5 py-1.5 text-xs font-medium rounded-lg bg-[#0F2547] text-white hover:bg-[#173463]"
                    >
                      Inspect &amp; Review
                    </Link>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                      <th className="py-3 px-6">Application ID</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Subject &amp; Category</th>
                      <th className="py-3 px-4">Assigned Office</th>
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
                          <p className="font-medium text-slate-900">{app.studentName}</p>
                          <p className="text-xs font-mono text-slate-500">
                            {app.studentBaustId} · {app.studentDepartment}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-slate-900">{app.subject}</p>
                          <p className="text-xs text-slate-500">{app.categoryName}</p>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-700">{app.assignedOfficeName}</td>
                        <td className="py-3.5 px-4 font-mono text-xs tabular-nums text-slate-500">
                          {formatDate(app.updatedAt)}
                        </td>
                        <td className="py-3.5 px-4">
                          <ApplicationStatusLabel status={app.status} />
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <Link
                            to={`/admin/applications/${app.id}`}
                            className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-[#0F2547] text-white hover:bg-[#173463]"
                          >
                            Inspect &amp; Review
                          </Link>
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
