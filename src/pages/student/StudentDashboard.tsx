import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PortalLayout } from '../../components/PortalLayout';
import { ApplicationStatusLabel } from '../../components/StatusIndicator';
import { useAuth } from '../../context/AuthContext';
import type { Application, NotificationItem, Question } from '../../types/sams';
import { apiFetch, formatDate } from '../../utils/api';

export function StudentDashboard() {
  const { user, isDemoMode, demoApplications, demoQuestions, demoNotifications } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isDemoMode) {
      setApplications(demoApplications.filter((a) => a.studentId === user?.id));
      setQuestions(demoQuestions.filter((q) => q.studentId === user?.id));
      setNotifications(demoNotifications);
      setLoading(false);
      return;
    }

    let active = true;
    (async () => {
      try {
        const [appRes, qRes, nRes] = await Promise.all([
          apiFetch<{ applications: Application[] }>('/api/applications'),
          apiFetch<{ questions: Question[] }>('/api/questions'),
          apiFetch<{ notifications: NotificationItem[] }>('/api/notifications'),
        ]);
        if (!active) return;
        setApplications(appRes.applications);
        setQuestions(qRes.questions);
        setNotifications(nRes.notifications);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isDemoMode, demoApplications, demoQuestions, demoNotifications, user?.id]);

  const draftsCount = applications.filter((a) => a.status === 'Draft').length;
  const activeCount = applications.filter(
    (a) => !['Draft', 'Completed', 'Rejected', 'Withdrawn', 'Approved'].includes(a.status)
  ).length;
  const awaitingInfo = applications.filter((a) => a.status === 'Awaiting Student Information');
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <PortalLayout title="Student Dashboard" breadcrumb="Student Portal / Overview">
      <div className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg border border-rose-200 bg-rose-50 text-sm text-rose-800">{error}</div>
        )}

        {awaitingInfo.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-amber-950">
                Action Required: Additional Information Requested ({awaitingInfo.length})
              </p>
              <p className="text-xs text-amber-900 mt-1">
                Office staff requested clarification or missing documents on{' '}
                <span className="font-mono font-semibold">{awaitingInfo[0].applicationCode}</span>.
              </p>
            </div>
            <Link
              to={`/student/applications/${awaitingInfo[0].id}`}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-amber-900 text-white hover:bg-amber-800 whitespace-nowrap self-start"
            >
              Respond Now
            </Link>
          </div>
        )}

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500">Total Applications</p>
            <p className="font-mono text-2xl font-bold text-[#0F2547] mt-1 tabular-nums">
              {loading ? '—' : applications.length}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500">In Active Review</p>
            <p className="font-mono text-2xl font-bold text-[#1D4ED8] mt-1 tabular-nums">
              {loading ? '—' : activeCount}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500">Saved Drafts</p>
            <p className="font-mono text-2xl font-bold text-slate-800 mt-1 tabular-nums">
              {loading ? '—' : draftsCount}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500">Unread Notifications</p>
            <p className="font-mono text-2xl font-bold text-[#0D9488] mt-1 tabular-nums">
              {loading ? '—' : unreadCount}
            </p>
          </div>
        </div>

        {/* Recent Applications */}
        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <h2 className="font-display text-base font-bold text-[#0F2547]">Recent Applications</h2>
            <Link to="/student/applications" className="text-xs font-medium text-[#1D4ED8] hover:underline">
              View All →
            </Link>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading applications...</div>
          ) : applications.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-medium text-slate-800">You have not created any applications yet.</p>
              <p className="text-xs text-slate-500 mt-1">Browse available BAUST application categories to begin.</p>
              <Link
                to="/student/browse"
                className="inline-block mt-4 px-4 py-2 text-xs font-medium rounded-lg bg-[#1D4ED8] text-white"
              >
                Browse Applications
              </Link>
            </div>
          ) : (
            <>
              <div className="md:hidden divide-y divide-slate-200">
                {applications.slice(0, 5).map((app) => (
                  <Link key={app.id} to={`/student/applications/${app.id}`} className="block p-4 hover:bg-slate-50 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs font-semibold text-[#0F2547]">{app.applicationCode}</p>
                        <p className="text-sm font-medium text-slate-900 mt-0.5">{app.subject}</p>
                        <p className="text-xs text-slate-500">{app.categoryName}</p>
                      </div>
                      <ApplicationStatusLabel status={app.status} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{app.assignedOfficeName}</span>
                      <span className="font-mono tabular-nums">{formatDate(app.updatedAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                      <th className="py-3 px-6">Tracking ID</th>
                      <th className="py-3 px-4">Application</th>
                      <th className="py-3 px-4">Assigned Office</th>
                      <th className="py-3 px-4">Updated</th>
                      <th className="py-3 px-6">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {applications.slice(0, 5).map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-6 font-mono text-xs font-semibold text-[#0F2547]">
                          <Link to={`/student/applications/${app.id}`} className="hover:underline">
                            {app.applicationCode}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-slate-900">{app.subject}</p>
                          <p className="text-xs text-slate-500">{app.categoryName}</p>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-xs">{app.assignedOfficeName}</td>
                        <td className="py-3.5 px-4 font-mono text-xs tabular-nums text-slate-500">
                          {formatDate(app.updatedAt)}
                        </td>
                        <td className="py-3.5 px-6">
                          <ApplicationStatusLabel status={app.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Questions & Notifications Split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-[#0F2547]">Recent Q&amp;A Inquiries</h2>
              <Link to="/student/ask" className="text-xs font-medium text-[#1D4ED8] hover:underline">
                Ask a Question →
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {questions.slice(0, 3).map((q) => (
                <div key={q.id} className="p-5">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="font-mono">{q.questionCode}</span>
                    <span>{q.status}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{q.subject}</p>
                  <p className="text-xs text-slate-500 mt-1">{q.assignedOfficeName}</p>
                </div>
              ))}
              {questions.length === 0 && (
                <p className="p-6 text-sm text-slate-500">No questions submitted yet.</p>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-[#0F2547]">Latest Notifications</h2>
              <Link to="/student/notifications" className="text-xs font-medium text-[#1D4ED8] hover:underline">
                View All →
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {notifications.slice(0, 3).map((n) => (
                <Link key={n.id} to={n.linkPath} className="block p-5 hover:bg-slate-50">
                  <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                  <p className="text-xs text-slate-600 mt-1">{n.message}</p>
                </Link>
              ))}
              {notifications.length === 0 && (
                <p className="p-6 text-sm text-slate-500">You are caught up on all notifications.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
