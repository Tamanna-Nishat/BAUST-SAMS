import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, FileText, Lock } from 'lucide-react';
import { DemoNotice } from '../../components/DemoNotice';
import { PortalLayout } from '../../components/PortalLayout';
import { ApplicationStatusLabel } from '../../components/StatusIndicator';
import { useAuth } from '../../context/AuthContext';
import type { Application, ApplicationStatus } from '../../types/sams';
import { apiFetch, formatBytes, formatDateTime } from '../../utils/api';

type StaffActionMode = 'review' | 'request_info' | 'forward' | 'decision';

export function StaffApplicationDetailPage({
  portalMode = 'staff',
}: {
  portalMode?: 'staff' | 'admin';
}) {
  const { id } = useParams<{ id: string }>();
  const { user, catalog, isDemoMode, demoApplications } = useAuth();

  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [demoNotice, setDemoNotice] = useState('');

  const [actionMode, setActionMode] = useState<StaffActionMode | null>(null);
  const [nextStatus, setNextStatus] = useState<ApplicationStatus>('Under Review');
  const [targetOfficeId, setTargetOfficeId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [decisionSummary, setDecisionSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canReview = Boolean(user?.permissions?.can_review);
  const canRequestInfo = Boolean(user?.permissions?.can_request_info);
  const canForward = Boolean(user?.permissions?.can_forward);
  const canApprove = Boolean(user?.permissions?.can_approve);
  const canReject = Boolean(user?.permissions?.can_reject);
  const canAccessMedical = Boolean(user?.permissions?.can_access_medical);

  const isTerminalStatus = Boolean(
    app && ['Draft', 'Withdrawn', 'Rejected', 'Completed'].includes(app.status)
  );
  const isApprovedAwaitingCompletion = app?.status === 'Approved';
  const isForwardedReadOnly = Boolean(
    portalMode === 'staff' &&
      user?.role === 'staff' &&
      app &&
      user.officeId &&
      app.assignedOfficeId !== user.officeId
  );

  const availableModes: StaffActionMode[] = (() => {
    if (!app || isTerminalStatus || isForwardedReadOnly) return [];
    if (isApprovedAwaitingCompletion) {
      return canReview ? ['review'] : [];
    }
    const modes: StaffActionMode[] = [];
    if (canReview) modes.push('review');
    if (canRequestInfo) modes.push('request_info');
    if (canForward) modes.push('forward');
    if (canApprove || canReject) modes.push('decision');
    return modes;
  })();

  const loadApp = async () => {
    if (!id) return;
    if (isDemoMode) {
      const found = demoApplications.find((a) => a.id === id) ?? null;
      setApp(found);
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

  useEffect(() => {
    if (availableModes.length === 0) {
      setActionMode(null);
      return;
    }
    setActionMode((prev) => (prev && availableModes.includes(prev) ? prev : availableModes[0]));
  }, [app?.id, app?.status, canReview, canRequestInfo, canForward, canApprove, canReject, isForwardedReadOnly]);

  useEffect(() => {
    if (!actionMode) return;
    if (actionMode === 'review') {
      setNextStatus(isApprovedAwaitingCompletion ? 'Completed' : 'Under Review');
    } else if (actionMode === 'request_info') {
      setNextStatus('Awaiting Student Information');
    } else if (actionMode === 'forward') {
      setNextStatus('Forwarded');
    } else if (actionMode === 'decision') {
      setNextStatus(canApprove ? 'Approved' : 'Rejected');
    }
  }, [actionMode, isApprovedAwaitingCompletion, canApprove]);

  const handleTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!app || !actionMode) return;
    setError('');
    setMessage('');
    setDemoNotice('');

    if (isDemoMode) {
      setDemoNotice(
        `Status updates and workflow transitions (${nextStatus}) are disabled in Demo Preview Mode. Configure PostgreSQL and sign in with an authorized account to record permanent audit history.`
      );
      return;
    }

    if (nextStatus === 'Forwarded' && !targetOfficeId) {
      setError('Please select a destination BAUST office.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<{ application: Application }>(`/api/applications/${app.id}/transition`, {
        method: 'POST',
        body: JSON.stringify({
          newStatus: nextStatus,
          remarks: remarks.trim(),
          targetOfficeId: nextStatus === 'Forwarded' ? targetOfficeId : undefined,
          decisionSummary: decisionSummary.trim() || undefined,
        }),
      });
      setApp(res.application);
      setRemarks('');
      setDecisionSummary('');
      setMessage(`Application status permanently updated to ${nextStatus}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const backHref = portalMode === 'admin' ? '/admin/applications' : '/staff/applications';
  const backLabel = portalMode === 'admin' ? 'Return to All Applications' : 'Return to Assigned Applications';
  const breadcrumb =
    portalMode === 'admin'
      ? 'Admin Portal / Applications / Review'
      : 'Staff Portal / Assigned Applications / Review';

  return (
    <PortalLayout
      title={app ? `Review ${app.applicationCode}` : 'Application Review'}
      breadcrumb={breadcrumb}
    >
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-sm text-slate-500">
          Loading application details...
        </div>
      ) : !app ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-sm font-medium text-slate-800">{error || 'Application not found.'}</p>
          <Link to={backHref} className="inline-block mt-4 text-xs font-medium text-[#1D4ED8] hover:underline">
            {backLabel}
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <Link to={backHref} className="text-xs font-medium text-[#1D4ED8] hover:underline">
              ← {backLabel}
            </Link>
          </div>

          {error && (
            <div className="p-4 rounded-lg border border-rose-200 bg-rose-50 text-sm text-rose-800">{error}</div>
          )}
          {message && (
            <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50 text-sm text-emerald-800">
              {message}
            </div>
          )}
          {demoNotice && <DemoNotice message={demoNotice} />}

          {isForwardedReadOnly && (
            <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 text-sm text-blue-950">
              This application was forwarded from your office and is currently assigned to{' '}
              <strong>{app.assignedOfficeName}</strong>. You have read-only tracking and history access.
            </div>
          )}

          {/* Header */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-mono font-bold text-[#0F2547]">{app.applicationCode}</span>
                <span aria-hidden="true">·</span>
                <span>{app.categoryName}</span>
                <span aria-hidden="true">·</span>
                <span>Office: {app.assignedOfficeName}</span>
              </div>
              <h2 className="font-display text-xl font-bold text-slate-900 mt-1.5">{app.subject}</h2>
              <p className="text-xs text-slate-600 mt-1">
                Applicant: <span className="font-semibold text-slate-800">{app.studentName}</span> · ID:{' '}
                <span className="font-mono">{app.studentBaustId}</span> · {app.studentDepartment}
              </p>
            </div>
            <ApplicationStatusLabel status={app.status} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Form Data, Documents, Action Workspace */}
            <div className="lg:col-span-2 space-y-6">
              {/* Student Form Data */}
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-display text-base font-bold text-[#0F2547] mb-4">Application Submission Data</h3>
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

              {/* Document Review with Medical Sensitivity Enforcement */}
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-display text-base font-bold text-[#0F2547] mb-4">
                  Document Review ({app.documents.length})
                </h3>
                {app.documents.length === 0 ? (
                  <p className="text-sm text-slate-500">No documents attached.</p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                    {app.documents.map((doc) => {
                      const restricted = doc.isMedicalSensitive && !canAccessMedical;
                      return (
                        <div key={doc.id} className="p-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {restricted ? (
                              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-[#1D4ED8] shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {restricted ? 'Confidential Medical Document (Restricted)' : doc.originalFilename}
                              </p>
                              <p className="text-xs text-slate-500">
                                {doc.docSpecName} · <span className="font-mono">{formatBytes(doc.sizeBytes)}</span>
                                {doc.isMedicalSensitive ? ' · Medical Sensitive' : ''}
                              </p>
                            </div>
                          </div>

                          {restricted ? (
                            <span className="text-xs font-medium text-amber-800 shrink-0">
                              Medical Clearance Required
                            </span>
                          ) : !isDemoMode && doc.storedFilename ? (
                            <a
                              href={`/api/applications/documents/${doc.id}/download`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 shrink-0"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Inspect File</span>
                            </a>
                          ) : (
                            <span className="text-xs text-slate-500 shrink-0">Demo Attachment</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Workflow Action Panel (Enforces Status Lifecycle & Granular Permissions) */}
              {isTerminalStatus ? (
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h3 className="font-display text-base font-bold text-[#0F2547]">Processing Closed</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    This application is in <span className="font-semibold text-slate-900">{app.status}</span> state. No further status updates are permitted.
                  </p>
                </div>
              ) : !isForwardedReadOnly && availableModes.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h3 className="font-display text-base font-bold text-[#0F2547]">Read-Only View</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {isApprovedAwaitingCompletion
                      ? 'This application is Approved. Marking it Completed requires review processing authority (can_review).'
                      : 'Your account does not hold review, forwarding, information-request, or decision permissions for workflow transitions.'}
                  </p>
                </div>
              ) : !isForwardedReadOnly && actionMode ? (
                <form onSubmit={handleTransition} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                  <div>
                    <h3 className="font-display text-base font-bold text-[#0F2547]">
                      {isApprovedAwaitingCompletion ? 'Final Completion Action' : 'Processing Action'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isApprovedAwaitingCompletion
                        ? 'Approved applications may only be marked Completed once delivery or fulfillment is verified.'
                        : 'Available actions strictly reflect your assigned permissions. Every change creates a permanent history record.'}
                    </p>
                  </div>

                  {/* Mode Tabs (only permitted modes rendered) */}
                  <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-lg">
                    {availableModes.includes('review') && (
                      <button
                        type="button"
                        onClick={() => setActionMode('review')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                          actionMode === 'review' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                        }`}
                      >
                        {isApprovedAwaitingCompletion ? 'Mark Completed' : 'Update Status'}
                      </button>
                    )}
                    {availableModes.includes('request_info') && (
                      <button
                        type="button"
                        onClick={() => setActionMode('request_info')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                          actionMode === 'request_info' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                        }`}
                      >
                        Request Info
                      </button>
                    )}
                    {availableModes.includes('forward') && (
                      <button
                        type="button"
                        onClick={() => setActionMode('forward')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                          actionMode === 'forward' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                        }`}
                      >
                        Forward to Office
                      </button>
                    )}
                    {availableModes.includes('decision') && (
                      <button
                        type="button"
                        onClick={() => setActionMode('decision')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                          actionMode === 'decision' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                        }`}
                      >
                        Approve / Reject
                      </button>
                    )}
                  </div>

                  {actionMode === 'review' && canReview && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Target Status</label>
                      <select
                        value={nextStatus}
                        onChange={(e) => setNextStatus(e.target.value as ApplicationStatus)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                      >
                        {isApprovedAwaitingCompletion ? (
                          <option value="Completed">Completed</option>
                        ) : (
                          <>
                            <option value="Under Review">Under Review</option>
                            <option value="Pending Decision">Pending Decision</option>
                            <option value="Completed">Completed</option>
                          </>
                        )}
                      </select>
                    </div>
                  )}

                  {actionMode === 'forward' && canForward && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Destination Office</label>
                      <select
                        required
                        value={targetOfficeId}
                        onChange={(e) => setTargetOfficeId(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="">Select destination BAUST office...</option>
                        {catalog.offices
                          .filter((o) => o.id !== app.assignedOfficeId)
                          .map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name} ({o.code})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {actionMode === 'decision' && (canApprove || canReject) && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Final Decision</label>
                        <select
                          value={nextStatus}
                          onChange={(e) => setNextStatus(e.target.value as ApplicationStatus)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                        >
                          {canApprove && <option value="Approved">Approved</option>}
                          {canReject && <option value="Rejected">Rejected</option>}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Official Decision Summary (Visible to Student)
                        </label>
                        <input
                          type="text"
                          value={decisionSummary}
                          onChange={(e) => setDecisionSummary(e.target.value)}
                          placeholder="e.g. Approved; sealed certificate ready for collection at Counter 1."
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mandatory Processing Remarks <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      minLength={3}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder={
                        actionMode === 'request_info'
                          ? 'Specify exact missing documents or clarification needed from the student...'
                          : 'Enter official remarks for the permanent history log...'
                      }
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 text-xs font-medium rounded-lg bg-[#0F2547] hover:bg-[#173463] disabled:opacity-50 text-white"
                  >
                    {submitting ? 'Recording Update...' : `Confirm ${nextStatus}`}
                  </button>
                </form>
              ) : null}
            </div>

            {/* Right Column: Permanent History */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 self-start">
              <h3 className="font-display text-base font-bold text-[#0F2547] mb-4">Permanent Audit History</h3>
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
                    <p className="text-xs text-slate-700 mt-1">{h.remarks}</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {h.actorName}
                      {h.actorOfficeName ? ` (${h.actorOfficeName})` : ''}
                      {h.targetOfficeName ? ` → ${h.targetOfficeName}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
