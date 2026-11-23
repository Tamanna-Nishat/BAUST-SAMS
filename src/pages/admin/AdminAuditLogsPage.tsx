import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { PortalLayout } from '../../components/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import type { AuditLog } from '../../types/sams';
import { apiFetch, formatDateTime } from '../../utils/api';

export function AdminAuditLogsPage() {
  const { isDemoMode, demoAuditLogs } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      setLogs(demoAuditLogs);
      setLoading(false);
      return;
    }
    apiFetch<{ auditLogs: AuditLog[] }>('/api/admin/audit-logs')
      .then((res) => setLogs(res.auditLogs))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isDemoMode, demoAuditLogs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.actorName.toLowerCase().includes(q) ||
        l.targetId.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q)
    );
  }, [logs, query]);

  return (
    <PortalLayout title="System Audit Logs" breadcrumb="Admin Portal / Audit Logs">
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter audit events by action, staff name, or Tracking ID..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <p className="p-8 text-sm text-slate-500">Loading audit logs...</p>
          ) : filtered.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-500">No audit records match your search.</p>
          ) : (
            <>
              <div className="md:hidden divide-y divide-slate-200">
                {filtered.map((l) => (
                  <div key={l.id} className="p-4 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-[#0F2547]">{l.action}</span>
                      <span className="font-mono text-[11px] tabular-nums text-slate-500">
                        {formatDateTime(l.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-800">
                      <span className="font-semibold">{l.actorName}</span>{' '}
                      <span className="text-slate-500">({l.actorRole})</span> ·{' '}
                      <span className="font-mono text-slate-700">{l.targetId}</span>
                    </p>
                    <p className="text-xs text-slate-600">{l.details}</p>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                      <th className="py-3 px-6">Timestamp</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Target</th>
                      <th className="py-3 px-6">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filtered.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-6 font-mono text-xs tabular-nums text-slate-500 whitespace-nowrap">
                          {formatDateTime(l.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <span className="font-semibold text-slate-900">{l.actorName}</span>{' '}
                          <span className="text-slate-500">({l.actorRole})</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-[#0F2547]">{l.action}</td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-700">{l.targetId}</td>
                        <td className="py-3 px-6 text-xs text-slate-600">{l.details}</td>
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
