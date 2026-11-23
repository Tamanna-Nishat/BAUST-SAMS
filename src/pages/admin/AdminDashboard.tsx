import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PortalLayout } from '../../components/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import {
  APPLICATION_STATUSES,
  type Application,
  type AuditLog,
  type Question,
  type User,
} from '../../types/sams';
import { apiFetch, formatDateTime } from '../../utils/api';

export function AdminDashboard() {
  const { catalog, isDemoMode, demoApplications, demoQuestions, demoUsers, demoAuditLogs } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      setUsers(demoUsers);
      setApplications(demoApplications);
      setQuestions(demoQuestions);
      setAuditLogs(demoAuditLogs);
      setLoading(false);
      return;
    }

    apiFetch<{
      users: User[];
      applications: Application[];
      questions: Question[];
      auditLogs: AuditLog[];
    }>('/api/admin/overview')
      .then((res) => {
        setUsers(res.users);
        setApplications(res.applications);
        setQuestions(res.questions);
        setAuditLogs(res.auditLogs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isDemoMode, demoUsers, demoApplications, demoQuestions, demoAuditLogs]);

  return (
    <PortalLayout title="Administrator Dashboard" breadcrumb="Admin Portal / Overview">
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500">Registered Users</p>
            <p className="font-mono text-2xl font-bold text-[#0F2547] mt-1 tabular-nums">
              {loading ? '—' : users.length}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">Total Applications</p>
              <Link to="/admin/applications" className="text-xs font-medium text-[#1D4ED8] hover:underline">
                Browse →
              </Link>
            </div>
            <p className="font-mono text-2xl font-bold text-[#1D4ED8] mt-1 tabular-nums">
              {loading ? '—' : applications.length}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500">Active Offices</p>
            <p className="font-mono text-2xl font-bold text-slate-800 mt-1 tabular-nums">
              {catalog.offices.length}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500">Student Questions</p>
            <p className="font-mono text-2xl font-bold text-[#0D9488] mt-1 tabular-nums">
              {loading ? '—' : questions.length}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Breakdown */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-bold text-[#0F2547]">Applications by Status</h2>
              <Link to="/admin/reports" className="text-xs font-medium text-[#1D4ED8] hover:underline">
                Full Reports →
              </Link>
            </div>
            <div className="divide-y divide-slate-100 text-sm">
              {APPLICATION_STATUSES.map((status) => {
                const count = applications.filter((a) => a.status === status).length;
                return (
                  <div key={status} className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-700">{status}</span>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Office Workload */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-bold text-[#0F2547]">Office Workload</h2>
              <Link to="/admin/offices" className="text-xs font-medium text-[#1D4ED8] hover:underline">
                Manage Offices →
              </Link>
            </div>
            <div className="divide-y divide-slate-100 text-sm">
              {catalog.offices.map((office) => {
                const total = applications.filter((a) => a.assignedOfficeId === office.id).length;
                const staffCount = users.filter((u) => u.officeId === office.id).length;
                return (
                  <div key={office.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">{office.name}</p>
                      <p className="text-xs text-slate-500">
                        {office.code} · {staffCount} assigned staff
                      </p>
                    </div>
                    <span className="font-mono text-sm font-semibold text-[#0F2547] tabular-nums">
                      {total} apps
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Audit Events */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-[#0F2547]">Recent Audit Logs</h2>
            <Link to="/admin/audit-logs" className="text-xs font-medium text-[#1D4ED8] hover:underline">
              View All Audit Logs →
            </Link>
          </div>
          <div className="divide-y divide-slate-100 text-sm">
            {auditLogs.slice(0, 8).map((log) => (
              <div key={log.id} className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">
                    <span className="font-mono text-xs text-[#0F2547] mr-2">{log.action}</span>
                    {log.details}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {log.actorName} ({log.actorRole}) · Target: {log.targetId}
                  </p>
                </div>
                <span className="font-mono text-xs tabular-nums text-slate-500 shrink-0">
                  {formatDateTime(log.createdAt)}
                </span>
              </div>
            ))}
            {auditLogs.length === 0 && (
              <p className="p-6 text-sm text-slate-500">No audit records recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
