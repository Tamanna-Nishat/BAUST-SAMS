import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { PortalLayout } from '../../components/PortalLayout';
import { ApplicationStatusLabel } from '../../components/StatusIndicator';
import { useAuth } from '../../context/AuthContext';
import { APPLICATION_STATUSES, type Application } from '../../types/sams';
import { apiFetch, formatDate, formatDateTime } from '../../utils/api';

type StaffQueueScope = 'assigned' | 'forwarded';

export function StaffApplicationsPage() {
  const { user, catalog, isDemoMode, demoApplications, demoUsers } = useAuth();
  const [scope, setScope] = useState<StaffQueueScope>('assigned');
  const [assignedApps, setAssignedApps] = useState<Application[]>([]);
  const [forwardedApps, setForwardedApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (isDemoMode) {
      const office = catalog.offices.find((o) => o.id === user?.officeId);
      const officeUserIds = new Set(
        demoUsers.filter((u) => u.officeId === user?.officeId).map((u) => u.id)
      );

      setAssignedApps(
        demoApplications.filter((a) => a.assignedOfficeId === user?.officeId && a.status !== 'Draft')
      );
      setForwardedApps(
        demoApplications.filter(
          (a) =>
            a.status !== 'Draft' &&
            a.assignedOfficeId !== user?.officeId &&
            a.history.some(
              (h) =>
                h.newStatus === 'Forwarded' &&
                (officeUserIds.has(h.actorId) || (office?.name && h.actorOfficeName === office.name))
            )
        )
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      apiFetch<{ applications: Application[] }>('/api/applications?scope=assigned'),
      apiFetch<{ applications: Application[] }>('/api/applications?scope=forwarded'),
    ])
      .then(([assignedRes, forwardedRes]) => {
        setAssignedApps(assignedRes.applications);
        setForwardedApps(forwardedRes.applications);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isDemoMode, demoApplications, demoUsers, catalog.offices, user?.officeId]);

  const activeList = scope === 'assigned' ? assignedApps : forwardedApps;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activeList.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (!q) return true;
      return (
        a.applicationCode.toLowerCase().includes(q) ||
        a.studentName.toLowerCase().includes(q) ||
        a.studentBaustId.toLowerCase().includes(q) ||
        a.subject.toLowerCase().includes(q)
      );
    });
  }, [activeList, statusFilter, query]);

  const currentOfficeName =
    catalog.offices.find((o) => o.id === user?.officeId)?.name || user?.officeName || '';

  const getForwardingRecord = (app: Application) => {
    const officeUserIds = new Set(
      demoUsers.filter((u) => u.officeId === user?.officeId).map((u) => u.id)
    );
    const matching = [...app.history]
      .reverse()
      .find(
        (h) =>
          h.newStatus === 'Forwarded' &&
          (officeUserIds.has(h.actorId) ||
            (currentOfficeName && h.actorOfficeName === currentOfficeName) ||
            Boolean(h.targetOfficeName))
      );
    return matching ?? null;
  };

  return (
    <PortalLayout
      title={scope === 'assigned' ? 'Assigned Applications' : 'Forwarded Application History'}
      breadcrumb={`Staff Portal / ${user?.officeName ?? 'Office'} / ${
        scope === 'assigned' ? 'Assigned Queue' : 'Forwarded History'
      }`}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg max-w-full w-fit">
            <button
              type="button"
              onClick={() => setScope('assigned')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md ${
                scope === 'assigned' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Assigned Queue ({assignedApps.length})
            </button>
            <button
              type="button"
              onClick={() => setScope('forwarded')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md ${
                scope === 'forwarded' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Forwarded History ({forwardedApps.length})
            </button>
          </div>
          {scope === 'forwarded' && (
            <p className="text-xs text-slate-500">
              Read-only forwarding log showing originating office, receiving office, forwarding date, and remarks.
            </p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by Application ID, Student Name, or BAUST ID..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Statuses</option>
            {APPLICATION_STATUSES.filter((s) => s !== 'Draft').map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-sm text-slate-500">Loading office applications...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              {scope === 'forwarded'
                ? 'No forwarded applications match this filter.'
                : 'No assigned applications match this filter.'}
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-slate-200">
                {filtered.map((app) => {
                  const fwd = scope === 'forwarded' ? getForwardingRecord(app) : null;
                  return (
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
                      {scope === 'forwarded' ? (
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                          <p>
                            <span className="font-semibold text-slate-700">From:</span>{' '}
                            {fwd?.actorOfficeName || currentOfficeName || 'Originating Office'}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-700">To:</span>{' '}
                            {fwd?.targetOfficeName || app.assignedOfficeName}
                          </p>
                          <p className="font-mono text-[11px] text-slate-500">
                            {fwd ? formatDateTime(fwd.createdAt) : formatDate(app.updatedAt)}
                          </p>
                          {fwd?.remarks && <p className="text-slate-700">{fwd.remarks}</p>}
                        </div>
                      ) : (
                        <p className="font-mono text-xs text-slate-500">Updated: {formatDate(app.updatedAt)}</p>
                      )}
                      <div>
                        <Link
                          to={`/staff/applications/${app.id}`}
                          className="inline-block px-3.5 py-1.5 text-xs font-medium rounded-lg bg-[#0F2547] text-white hover:bg-[#173463]"
                        >
                          {scope === 'forwarded' ? 'View History' : 'Open Review'}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                      <th className="py-3 px-6">Application ID</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Subject &amp; Category</th>
                      {scope === 'forwarded' ? (
                        <>
                          <th className="py-3 px-4">Originating Office</th>
                          <th className="py-3 px-4">Receiving Office</th>
                          <th className="py-3 px-4">Forwarding Date</th>
                          <th className="py-3 px-4">Forwarding Remarks</th>
                        </>
                      ) : (
                        <th className="py-3 px-4">Updated</th>
                      )}
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filtered.map((app) => {
                      const fwd = scope === 'forwarded' ? getForwardingRecord(app) : null;
                      return (
                        <tr key={app.id} className="hover:bg-slate-50/70 align-top">
                          <td className="py-3.5 px-6 font-mono text-xs font-semibold text-[#0F2547] whitespace-nowrap">
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
                          {scope === 'forwarded' ? (
                            <>
                              <td className="py-3.5 px-4 text-xs">
                                <p className="font-medium text-slate-800">
                                  {fwd?.actorOfficeName || currentOfficeName || 'Originating Office'}
                                </p>
                                {fwd?.actorName && (
                                  <p className="text-[11px] text-slate-500 mt-0.5">{fwd.actorName}</p>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-xs">
                                <p className="font-medium text-slate-800">
                                  {fwd?.targetOfficeName || app.assignedOfficeName}
                                </p>
                                {fwd?.targetOfficeName && fwd.targetOfficeName !== app.assignedOfficeName && (
                                  <p className="text-[11px] text-slate-500 mt-0.5">
                                    Current: {app.assignedOfficeName}
                                  </p>
                                )}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-xs tabular-nums text-slate-600 whitespace-nowrap">
                                {fwd ? formatDateTime(fwd.createdAt) : formatDate(app.updatedAt)}
                              </td>
                              <td className="py-3.5 px-4 text-xs text-slate-700 max-w-xs">
                                {fwd?.remarks || '—'}
                              </td>
                            </>
                          ) : (
                            <td className="py-3.5 px-4 font-mono text-xs tabular-nums text-slate-500 whitespace-nowrap">
                              {formatDate(app.updatedAt)}
                            </td>
                          )}
                          <td className="py-3.5 px-4">
                            <ApplicationStatusLabel status={app.status} />
                          </td>
                          <td className="py-3.5 px-6 text-right whitespace-nowrap">
                            <Link
                              to={`/staff/applications/${app.id}`}
                              className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-[#0F2547] text-white hover:bg-[#173463]"
                            >
                              {scope === 'forwarded' ? 'View History' : 'Open Review'}
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
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
