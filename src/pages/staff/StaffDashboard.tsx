import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PortalLayout } from '../../components/PortalLayout';
import { ApplicationStatusLabel, QuestionStatusLabel } from '../../components/StatusIndicator';
import { useAuth } from '../../context/AuthContext';
import type { Application, Question } from '../../types/sams';
import { apiFetch, formatDate } from '../../utils/api';

export function StaffDashboard() {
  const { user, isDemoMode, demoApplications, demoQuestions } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      setApplications(
        demoApplications.filter((a) => a.assignedOfficeId === user?.officeId && a.status !== 'Draft')
      );
      setQuestions(demoQuestions.filter((q) => q.assignedOfficeId === user?.officeId));
      setLoading(false);
      return;
    }

    Promise.all([
      apiFetch<{ applications: Application[] }>('/api/applications'),
      apiFetch<{ questions: Question[] }>('/api/questions'),
    ])
      .then(([appRes, qRes]) => {
        setApplications(appRes.applications);
        setQuestions(qRes.questions);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isDemoMode, demoApplications, demoQuestions, user?.officeId]);

  const pendingAction = applications.filter((a) =>
    ['Submitted', 'Under Review', 'Forwarded', 'Pending Decision'].includes(a.status)
  );
  const unansweredQs = questions.filter((q) => q.status !== 'Answered');

  const permList = [
    { key: 'can_review', label: 'Review & Process' },
    { key: 'can_request_info', label: 'Request Student Info' },
    { key: 'can_forward', label: 'Forward to Office' },
    { key: 'can_approve', label: 'Approve Applications' },
    { key: 'can_reject', label: 'Reject Applications' },
    { key: 'can_answer_questions', label: 'Answer Questions' },
    { key: 'can_manage_guidelines', label: 'Manage Guidelines' },
    { key: 'can_access_medical', label: 'Confidential Medical Access' },
  ] as const;

  return (
    <PortalLayout
      title="Staff Dashboard"
      breadcrumb={`Staff Portal / ${user?.officeName ?? 'Assigned Office'}`}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500">Assigned to Office</p>
            <p className="font-mono text-2xl font-bold text-[#0F2547] mt-1 tabular-nums">
              {loading ? '—' : applications.length}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500">Active Processing Queue</p>
            <p className="font-mono text-2xl font-bold text-[#1D4ED8] mt-1 tabular-nums">
              {loading ? '—' : pendingAction.length}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500">Open Student Questions</p>
            <p className="font-mono text-2xl font-bold text-amber-700 mt-1 tabular-nums">
              {loading ? '—' : unansweredQs.length}
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-500">Approved / Completed</p>
            <p className="font-mono text-2xl font-bold text-[#0D9488] mt-1 tabular-nums">
              {loading
                ? '—'
                : applications.filter((a) => a.status === 'Approved' || a.status === 'Completed').length}
            </p>
          </div>
        </div>

        {/* Assigned Authority Summary */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <h2 className="font-display text-base font-bold text-[#0F2547]">
              Assigned Office &amp; Authority Scope
            </h2>
            <span className="text-xs font-medium text-slate-600">
              {user?.officeName || 'No Office Assigned'} · {user?.designation || 'Staff'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            {permList.map((p) => {
              const allowed = Boolean(user?.permissions?.[p.key]);
              return (
                <div
                  key={p.key}
                  className={`px-3 py-2 rounded-lg border ${
                    allowed
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <span className="font-semibold">{allowed ? 'Granted' : 'Restricted'}</span> · {p.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Assigned Applications Queue */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-[#0F2547]">Office Application Queue</h2>
            <Link to="/staff/applications" className="text-xs font-medium text-[#1D4ED8] hover:underline">
              View Full Queue →
            </Link>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading assigned applications...</div>
          ) : applications.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No applications are currently assigned to your office.
            </div>
          ) : (
            <>
              <div className="md:hidden divide-y divide-slate-200">
                {applications.slice(0, 6).map((app) => (
                  <div key={app.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs font-semibold text-[#0F2547]">{app.applicationCode}</p>
                        <p className="text-sm font-medium text-slate-900 mt-0.5">{app.subject}</p>
                        <p className="text-xs text-slate-500">{app.categoryName}</p>
                      </div>
                      <ApplicationStatusLabel status={app.status} />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                      <span>{app.studentName} ({app.studentBaustId})</span>
                      <span className="font-mono tabular-nums text-slate-500">{formatDate(app.updatedAt)}</span>
                    </div>
                    <Link
                      to={`/staff/applications/${app.id}`}
                      className="inline-block px-3 py-1.5 text-xs font-medium rounded-lg bg-[#0F2547] text-white hover:bg-[#173463]"
                    >
                      Review
                    </Link>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                      <th className="py-3 px-6">Tracking ID</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Category &amp; Subject</th>
                      <th className="py-3 px-4">Updated</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {applications.slice(0, 6).map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-6 font-mono text-xs font-semibold text-[#0F2547]">
                          {app.applicationCode}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-slate-900">{app.studentName}</p>
                          <p className="text-xs font-mono text-slate-500">{app.studentBaustId}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-slate-900">{app.subject}</p>
                          <p className="text-xs text-slate-500">{app.categoryName}</p>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs tabular-nums text-slate-500">
                          {formatDate(app.updatedAt)}
                        </td>
                        <td className="py-3.5 px-4">
                          <ApplicationStatusLabel status={app.status} />
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <Link
                            to={`/staff/applications/${app.id}`}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#0F2547] text-white hover:bg-[#173463]"
                          >
                            Review
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

        {/* Assigned Questions */}
        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-[#0F2547]">Recent Office Questions</h2>
            <Link to="/staff/questions" className="text-xs font-medium text-[#1D4ED8] hover:underline">
              Manage Questions →
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {questions.slice(0, 4).map((q) => (
              <div key={q.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-mono text-slate-500">
                    {q.questionCode} · {q.studentName} ({q.studentBaustId})
                  </p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">{q.subject}</p>
                </div>
                <QuestionStatusLabel status={q.status} />
              </div>
            ))}
            {questions.length === 0 && (
              <p className="p-6 text-sm text-slate-500">No student questions assigned to your office.</p>
            )}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
