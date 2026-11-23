import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, FileText, Printer, Trash2, Upload } from 'lucide-react';
import { DemoNotice } from '../../components/DemoNotice';
import { PortalLayout } from '../../components/PortalLayout';
import { ApplicationStatusLabel } from '../../components/StatusIndicator';
import { useAuth } from '../../context/AuthContext';
import type { Application, ApplicationDocument } from '../../types/sams';
import { apiFetch, formatBytes, formatDateTime } from '../../utils/api';

export function StudentApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isDemoMode, demoApplications, catalog } = useAuth();
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [demoNotice, setDemoNotice] = useState('');

  const [clarificationText, setClarificationText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [removingDocId, setRemovingDocId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadApp = async () => {
    if (!id) return;
    if (isDemoMode) {
      setApp(demoApplications.find((a) => a.id === id) ?? null);
      setLoading(false);
      return;
    }
    try {
      const res = await apiFetch<{ application: Application }>(`/api/applications/${id}`);
      setApp(res.application);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load application.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadApp();
  }, [id, isDemoMode, demoApplications]);

  const handleAdditionalUpload = async (file: File) => {
    if (!app) return;
    setError('');
    setMessage('');
    setDemoNotice('');
    if (isDemoMode) {
      setDemoNotice(
        `Document uploads are disabled in Demo Preview Mode ("${file.name}" was not uploaded). Connect PostgreSQL and sign in as a student to upload files.`
      );
      return;
    }
    setUploading(true);
    try {
      const cat = catalog.categories.find((c) => c.id === app.categoryId);
      const spec = cat?.requiredDocuments[0];
      const body = new FormData();
      body.append('file', file);
      body.append('docSpecId', spec?.id ?? 'additional-info');
      body.append('docSpecName', 'Additional Requested Document');
      await apiFetch<{ document: ApplicationDocument }>(`/api/applications/${app.id}/documents`, {
        method: 'POST',
        body,
      });
      await loadApp();
      setMessage('Additional document uploaded.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitClarification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!app || !clarificationText.trim()) return;
    setError('');
    setMessage('');
    setDemoNotice('');
    if (isDemoMode) {
      setDemoNotice(
        'Submitting clarifications and updating application status require an active PostgreSQL database and authenticated student session.'
      );
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch<{ application: Application }>(`/api/applications/${app.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          remarks: clarificationText.trim(),
          action: 'resubmit_info',
        }),
      });
      setApp(res.application);
      setClarificationText('');
      setMessage('Requested information submitted. Application returned to Under Review.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit clarification.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!app) return;
    setError('');
    setMessage('');
    setDemoNotice('');
    if (isDemoMode) {
      setDemoNotice(
        'Withdrawing an application requires an active PostgreSQL database and authenticated student session.'
      );
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch<{ application: Application }>(`/api/applications/${app.id}/withdraw`, {
        method: 'POST',
        body: JSON.stringify({ remarks: 'Withdrawn by student.' }),
      });
      setApp(res.application);
      setMessage('Application has been withdrawn.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to withdraw application.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveDoc = async (docId: string) => {
    if (!app) return;
    setError('');
    setMessage('');
    setDemoNotice('');

    if (isDemoMode) {
      setDemoNotice(
        'Removing attached documents requires an active PostgreSQL database and authenticated student session.'
      );
      return;
    }

    setRemovingDocId(docId);
    try {
      await apiFetch(`/api/applications/${app.id}/documents/${docId}`, { method: 'DELETE' });
      await loadApp();
      setMessage('Document removed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove document.');
    } finally {
      setRemovingDocId(null);
    }
  };

  const canWithdraw = app && !['Approved', 'Rejected', 'Completed', 'Withdrawn'].includes(app.status);
  const canManageDocuments = app?.status === 'Awaiting Student Information';

  return (
    <PortalLayout
      title={app ? `Application ${app.applicationCode}` : 'Application Tracking'}
      breadcrumb="Student Portal / Tracking & History"
    >
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-sm text-slate-500">
          Loading tracking details...
        </div>
      ) : !app ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-sm font-medium text-slate-800">{error || 'Application not found.'}</p>
          <Link to="/student/applications" className="inline-block mt-4 text-xs font-medium text-[#1D4ED8] hover:underline">
            Back to My Applications
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Official Printable Receipt */}
          <div className="print-only bg-white border border-slate-300 rounded-lg p-8 space-y-6 text-slate-900">
            <div className="border-b-2 border-[#0F2547] pb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Bangladesh Army University of Science and Technology (BAUST)
                </p>
                <h2 className="font-display text-xl font-bold text-[#0F2547] mt-1">
                  Official Application Confirmation Receipt
                </h2>
                {isDemoMode && (
                  <p className="text-[11px] font-semibold text-amber-800 mt-1">
                    DEMO DATA — SAMPLE PREVIEW RECORD (NOT OFFICIAL BAUST RECORD)
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[11px] text-slate-500">Tracking ID</p>
                <p className="font-mono text-base font-bold text-[#0F2547]">{app.applicationCode}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-500">Applicant Name</p>
                <p className="font-semibold mt-0.5">{app.studentName}</p>
              </div>
              <div>
                <p className="text-slate-500">BAUST Student ID</p>
                <p className="font-mono font-semibold mt-0.5">{app.studentBaustId || '—'}</p>
              </div>
              <div>
                <p className="text-slate-500">Department</p>
                <p className="font-semibold mt-0.5">{app.studentDepartment}</p>
              </div>
              <div>
                <p className="text-slate-500">Current Office</p>
                <p className="font-semibold mt-0.5">{app.assignedOfficeName}</p>
              </div>
              <div>
                <p className="text-slate-500">Application Category</p>
                <p className="font-semibold mt-0.5">{app.categoryName}</p>
              </div>
              <div>
                <p className="text-slate-500">Current Status</p>
                <p className="font-semibold mt-0.5">{app.status}</p>
              </div>
              <div>
                <p className="text-slate-500">Submitted At</p>
                <p className="font-mono font-semibold mt-0.5">
                  {app.submittedAt ? formatDateTime(app.submittedAt) : 'Not Yet Submitted'}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Last Updated</p>
                <p className="font-mono font-semibold mt-0.5">{formatDateTime(app.updatedAt)}</p>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 text-xs space-y-2">
              <p><span className="font-semibold">Subject:</span> {app.subject}</p>
              {Object.entries(app.formData).map(([k, v]) => (
                <p key={k}>
                  <span className="font-semibold capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span> {v || '—'}
                </p>
              ))}
              {app.remarks && (
                <p><span className="font-semibold">Remarks:</span> {app.remarks}</p>
              )}
              {app.decisionSummary && (
                <p><span className="font-semibold">Decision Summary:</span> {app.decisionSummary}</p>
              )}
            </div>

            <div className="border-t border-slate-200 pt-4 text-xs">
              <p className="font-semibold mb-1">Attached Documents ({app.documents.length})</p>
              {app.documents.length === 0 ? (
                <p className="text-slate-500">None</p>
              ) : (
                <ul className="list-disc pl-5 space-y-0.5">
                  {app.documents.map((d) => (
                    <li key={d.id}>
                      {d.docSpecName}: {d.originalFilename} ({formatBytes(d.sizeBytes)})
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-slate-200 pt-4 text-[11px] text-slate-500 flex justify-between">
              <span>BAUST Student Application Management System (SAMS)</span>
              <span className="font-mono">Printed: {new Date().toLocaleDateString('en-GB')}</span>
            </div>
          </div>

          <div className="no-print space-y-6">
          {error && (
            <div className="p-4 rounded-lg border border-rose-200 bg-rose-50 text-sm text-rose-800">{error}</div>
          )}
          {message && (
            <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50 text-sm text-emerald-800">
              {message}
            </div>
          )}
          {demoNotice && <DemoNotice message={demoNotice} />}

          {/* Header Summary */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-mono font-bold text-[#0F2547]">{app.applicationCode}</span>
                <span aria-hidden="true">·</span>
                <span>{app.categoryName}</span>
                <span aria-hidden="true">·</span>
                <span>Current Office: {app.assignedOfficeName}</span>
              </div>
              <h2 className="font-display text-xl font-bold text-slate-900 mt-1.5">{app.subject}</h2>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <ApplicationStatusLabel status={app.status} />
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>
              <Link
                to={`/student/ask?applicationId=${app.id}`}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Ask About This Application
              </Link>
              {canWithdraw && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleWithdraw}
                  className="px-3.5 py-2 text-xs font-medium rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50"
                >
                  Withdraw
                </button>
              )}
            </div>
          </div>

          {/* Decision Summary if Approved / Rejected / Completed */}
          {app.decisionSummary && (
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <p className="text-xs font-semibold text-slate-500">Official Decision Summary</p>
              <p className="text-sm text-slate-900 mt-1 leading-relaxed">{app.decisionSummary}</p>
            </div>
          )}

          {/* Respond to Awaiting Student Information */}
          {app.status === 'Awaiting Student Information' && (
            <form onSubmit={handleSubmitClarification} className="bg-amber-50 border border-amber-200 rounded-xl p-6 space-y-4">
              <div>
                <h3 className="font-display text-base font-bold text-amber-950">
                  Provide Requested Information
                </h3>
                <p className="text-xs text-amber-900 mt-1">
                  Review the latest staff remark in the history timeline below, attach any requested document, and submit your response.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-amber-300 bg-white hover:bg-amber-100 text-xs font-medium text-amber-950 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploading ? 'Uploading...' : 'Attach Additional Document (PDF/JPG/PNG)'}</span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleAdditionalUpload(f);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>

              <textarea
                rows={3}
                required
                value={clarificationText}
                onChange={(e) => setClarificationText(e.target.value)}
                placeholder="Write your clarification or note for the reviewing officer..."
                className="w-full px-3 py-2 text-sm bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              />

              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-amber-900 text-white hover:bg-amber-800"
              >
                {submitting ? 'Submitting...' : 'Submit Information & Resume Review'}
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Submitted Form Details & Documents */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-display text-base font-bold text-[#0F2547] mb-4">Submitted Application Data</h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {Object.entries(app.formData).map(([k, v]) => (
                    <div key={k} className="border-b border-slate-100 pb-2">
                      <dt className="text-xs text-slate-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</dt>
                      <dd className="font-medium text-slate-900 mt-0.5">{v || '—'}</dd>
                    </div>
                  ))}
                  {app.remarks && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-slate-500">Student Remarks</dt>
                      <dd className="text-slate-800 mt-0.5">{app.remarks}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-display text-base font-bold text-[#0F2547] mb-4">
                  Supporting Documents ({app.documents.length})
                </h3>
                {app.documents.length === 0 ? (
                  <p className="text-sm text-slate-500">No documents attached.</p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                    {app.documents.map((doc) => (
                      <div key={doc.id} className="p-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-4 h-4 text-[#1D4ED8] shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{doc.originalFilename}</p>
                            <p className="text-xs text-slate-500">
                              {doc.docSpecName} · <span className="font-mono">{formatBytes(doc.sizeBytes)}</span>
                              {doc.isMedicalSensitive ? ' · Confidential Medical' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!isDemoMode && doc.storedFilename && (
                            <a
                              href={`/api/applications/documents/${doc.id}/download`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 shrink-0"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>View</span>
                            </a>
                          )}
                          {canManageDocuments && (
                            <button
                              type="button"
                              disabled={removingDocId === doc.id}
                              onClick={() => void handleRemoveDoc(doc.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                              title="Remove document"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{removingDocId === doc.id ? 'Removing...' : 'Remove'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Permanent Processing History */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 self-start">
              <h3 className="font-display text-base font-bold text-[#0F2547] mb-4">Processing History</h3>
              <div className="space-y-4">
                {[...app.history].reverse().map((h) => (
                  <div key={h.id} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-[#0F2547]">{h.newStatus}</span>
                      <span className="font-mono tabular-nums text-slate-500">{formatDateTime(h.createdAt)}</span>
                    </div>
                    {h.newStatus === 'Forwarded' && (
                      <div className="mt-1.5 p-2.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-700 space-y-0.5">
                        <p>
                          <span className="font-semibold text-slate-900">Originating Office:</span>{' '}
                          {h.actorOfficeName || 'Originating Office'}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">Receiving Office:</span>{' '}
                          {h.targetOfficeName || app.assignedOfficeName}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-slate-600 mt-1">{h.remarks}</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      By {h.actorName}
                      {h.actorOfficeName ? ` (${h.actorOfficeName})` : ''}
                      {h.targetOfficeName ? ` → ${h.targetOfficeName}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
