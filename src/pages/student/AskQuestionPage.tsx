import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DemoNotice } from '../../components/DemoNotice';
import { PortalLayout } from '../../components/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import type { Application, Question } from '../../types/sams';
import { apiFetch } from '../../utils/api';

export function AskQuestionPage() {
  const { user, catalog, isDemoMode, demoApplications } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [applications, setApplications] = useState<Application[]>([]);
  const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') || '');
  const [applicationId, setApplicationId] = useState(searchParams.get('applicationId') || '');
  const [assignedOfficeId, setAssignedOfficeId] = useState(catalog.offices[0]?.id || 'off-reg');
  const [subject, setSubject] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [demoNotice, setDemoNotice] = useState('');

  useEffect(() => {
    if (isDemoMode) {
      setApplications(demoApplications.filter((a) => a.studentId === user?.id));
      return;
    }
    apiFetch<{ applications: Application[] }>('/api/applications')
      .then((res) => setApplications(res.applications))
      .catch(() => {});
  }, [isDemoMode, demoApplications, user?.id]);

  // Auto-select office when category or application changes
  useEffect(() => {
    if (applicationId) {
      const app = applications.find((a) => a.id === applicationId);
      if (app) setAssignedOfficeId(app.assignedOfficeId);
    } else if (categoryId) {
      const cat = catalog.categories.find((c) => c.id === categoryId);
      if (cat) setAssignedOfficeId(cat.defaultOfficeId);
    }
  }, [applicationId, categoryId, applications, catalog.categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDemoNotice('');

    if (isDemoMode) {
      setDemoNotice(
        'Submitting questions to BAUST offices is disabled in Demo Preview Mode. Configure PostgreSQL and sign in as a student to send real inquiries.'
      );
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch<{ question: Question }>('/api/questions', {
        method: 'POST',
        body: JSON.stringify({
          categoryId: categoryId || undefined,
          applicationId: applicationId || undefined,
          assignedOfficeId,
          subject,
          questionText,
        }),
      });
      navigate('/student/questions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit question.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PortalLayout title="Ask a Question" breadcrumb="Student Portal / Ask a Question">
      <div className="max-w-2xl bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <h2 className="font-display text-lg font-bold text-[#0F2547]">Contact BAUST Administrative Staff</h2>
        <p className="text-xs text-slate-600 mt-1">
          Link your inquiry to an application type or existing application Tracking ID for faster office resolution.
        </p>

        {error && (
          <div className="mt-4 p-3 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-800">{error}</div>
        )}
        {demoNotice && (
          <div className="mt-4">
            <DemoNotice message={demoNotice} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Link to Application Category (Optional)
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="">General Inquiry</option>
                {catalog.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Link to Specific Application (Optional)
              </label>
              <select
                value={applicationId}
                onChange={(e) => setApplicationId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="">None</option>
                {applications.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.applicationCode} — {a.subject}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target BAUST Office</label>
            <select
              value={assignedOfficeId}
              onChange={(e) => setAssignedOfficeId(e.target.value)}
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
            <input
              type="text"
              required
              minLength={4}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Clarification on Trust Bank fee deposit receipt"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Question Details</label>
            <textarea
              rows={5}
              required
              minLength={10}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Describe your question clearly..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 text-sm font-medium rounded-lg bg-[#0F2547] hover:bg-[#173463] disabled:opacity-50 text-white"
          >
            {submitting ? 'Sending Question...' : 'Submit Question'}
          </button>
        </form>
      </div>
    </PortalLayout>
  );
}
