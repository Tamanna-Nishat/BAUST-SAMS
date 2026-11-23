import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, FileText, Printer, Trash2, Upload } from 'lucide-react';
import { DemoNotice } from '../../components/DemoNotice';
import { PortalLayout } from '../../components/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import type { Application, ApplicationDocument } from '../../types/sams';
import { apiFetch, formatBytes, formatDateTime } from '../../utils/api';

export function ApplicationFormPage() {
  const { categoryId, draftId } = useParams<{ categoryId?: string; draftId?: string }>();
  const navigate = useNavigate();
  const { user, catalog, isDemoMode, demoApplications } = useAuth();

  const [selectedCatId, setSelectedCatId] = useState(categoryId || catalog.categories[0]?.id || 'cat-transcript');
  const [subject, setSubject] = useState('');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState('');
  const [draftApp, setDraftApp] = useState<Application | null>(null);
  const [documents, setDocuments] = useState<ApplicationDocument[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [confirmedApp, setConfirmedApp] = useState<Application | null>(null);

  const [uploadingSpecId, setUploadingSpecId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [demoNotice, setDemoNotice] = useState('');

  // Load existing draft if editing
  useEffect(() => {
    if (!draftId) return;
    if (isDemoMode) {
      const found = demoApplications.find((a) => a.id === draftId);
      if (found) {
        setDraftApp(found);
        setSelectedCatId(found.categoryId);
        setSubject(found.subject);
        setFormData(found.formData);
        setRemarks(found.remarks);
        setDocuments(found.documents);
      }
      return;
    }

    (async () => {
      try {
        const res = await apiFetch<{ application: Application }>(`/api/applications/${draftId}`);
        setDraftApp(res.application);
        setSelectedCatId(res.application.categoryId);
        setSubject(res.application.subject);
        setFormData(res.application.formData);
        setRemarks(res.application.remarks);
        setDocuments(res.application.documents);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load draft application.');
      }
    })();
  }, [draftId, isDemoMode, demoApplications]);

  useEffect(() => {
    if (categoryId) {
      setSelectedCatId(categoryId);
    } else if (!selectedCatId && catalog.categories.length > 0) {
      setSelectedCatId(catalog.categories[0].id);
    }
  }, [categoryId, catalog.categories, selectedCatId]);

  const category = catalog.categories.find((c) => c.id === selectedCatId) ?? catalog.categories[0];

  const ensureDraftCreated = async (): Promise<Application> => {
    if (draftApp) return draftApp;
    const defaultSubject = subject.trim() || `${category?.name ?? 'Application'} Request`;
    const res = await apiFetch<{ application: Application }>('/api/applications', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: category!.id,
        subject: defaultSubject,
        formData,
        remarks,
        submitNow: false,
      }),
    });
    setDraftApp(res.application);
    return res.application;
  };

  const handleFileUpload = async (docSpecId: string, docSpecName: string, file: File) => {
    setError('');
    setStatusMessage('');
    setDemoNotice('');

    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) {
      setError('Only PDF, JPG, and PNG files are accepted.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds the 5 MB limit.');
      return;
    }

    if (isDemoMode) {
      setDemoNotice(
        `File uploads are disabled in Demo Preview Mode ("${file.name}" was not uploaded). Configure PostgreSQL and sign in as a registered student to upload supporting documents.`
      );
      return;
    }

    setUploadingSpecId(docSpecId);
    try {
      const activeDraft = await ensureDraftCreated();
      const body = new FormData();
      body.append('file', file);
      body.append('docSpecId', docSpecId);
      body.append('docSpecName', docSpecName);

      const res = await apiFetch<{ document: ApplicationDocument }>(
        `/api/applications/${activeDraft.id}/documents`,
        {
          method: 'POST',
          body,
        }
      );
      setDocuments((prev) => [...prev, res.document]);
      setStatusMessage(`Uploaded "${res.document.originalFilename}" successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'File upload failed.');
    } finally {
      setUploadingSpecId(null);
    }
  };

  const handleRemoveDoc = async (docId: string) => {
    setError('');
    setStatusMessage('');
    setDemoNotice('');

    if (isDemoMode) {
      setDemoNotice(
        'Removing persisted documents is disabled in Demo Preview Mode. Configure PostgreSQL and sign in as a student to edit real draft attachments.'
      );
      return;
    }

    if (!draftApp) {
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      return;
    }
    try {
      await apiFetch(`/api/applications/${draftApp.id}/documents/${docId}`, { method: 'DELETE' });
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      setStatusMessage('Document removed from draft.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove document.');
    }
  };

  const handleDiscardDraft = async () => {
    if (!draftApp || draftApp.status !== 'Draft') return;
    setError('');
    setStatusMessage('');
    setDemoNotice('');

    if (isDemoMode) {
      setConfirmDiscard(false);
      setDemoNotice(
        `Discarding draft "${draftApp.applicationCode}" is disabled in Demo Preview Mode. Configure PostgreSQL and sign in as a student to delete persisted drafts.`
      );
      return;
    }

    setDiscarding(true);
    try {
      await apiFetch(`/api/applications/${draftApp.id}`, { method: 'DELETE' });
      navigate('/student/drafts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to discard draft.');
    } finally {
      setDiscarding(false);
    }
  };

  const validateForSubmit = (): string | null => {
    if (!category) return 'Please select an application category.';
    if (subject.trim().length < 4) return 'Please provide an application subject (at least 4 characters).';
    for (const field of category.dynamicFields) {
      if (field.required && !formData[field.key]?.trim()) {
        return `Please complete required field: ${field.label}`;
      }
    }
    for (const reqDoc of category.requiredDocuments) {
      if (reqDoc.isRequired && !documents.some((d) => d.docSpecId === reqDoc.id)) {
        return `Required supporting document missing: ${reqDoc.name}`;
      }
    }
    return null;
  };

  const handleSaveDraft = async () => {
    if (!category) return;
    setError('');
    setStatusMessage('');
    setDemoNotice('');

    if (isDemoMode) {
      setDemoNotice(
        'Saving drafts to the database is disabled in Demo Preview Mode. Configure PostgreSQL and sign in as a student to save persisted drafts.'
      );
      return;
    }

    if (subject.trim().length < 4) {
      setError('Please enter an application subject before saving a draft.');
      return;
    }

    setSubmitting(true);
    try {
      if (draftApp) {
        const res = await apiFetch<{ application: Application }>(`/api/applications/${draftApp.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            subject: subject.trim(),
            formData,
            remarks,
            action: 'save_draft',
          }),
        });
        setDraftApp(res.application);
        setStatusMessage(`Draft ${res.application.applicationCode} saved.`);
      } else {
        const created = await ensureDraftCreated();
        setStatusMessage(`Draft ${created.applicationCode} saved.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalSubmit = async () => {
    setError('');
    setStatusMessage('');
    setDemoNotice('');

    if (isDemoMode) {
      setPreviewMode(false);
      setDemoNotice(
        'Application submission is disabled in Demo Preview Mode. No application was submitted and no Tracking ID was created. Configure PostgreSQL and sign in as a student for live submissions.'
      );
      return;
    }

    const validationErr = validateForSubmit();
    if (validationErr) {
      setError(validationErr);
      setPreviewMode(false);
      return;
    }

    setSubmitting(true);
    try {
      const activeDraft = await ensureDraftCreated();
      const res = await apiFetch<{ application: Application }>(`/api/applications/${activeDraft.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          subject: subject.trim(),
          formData,
          remarks,
          action: 'submit',
        }),
      });
      setConfirmedApp(res.application);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmedApp) {
    return (
      <PortalLayout title="Application Submitted" breadcrumb="Student Portal / Submission Confirmation">
        <div className="no-print max-w-2xl mx-auto bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="font-display text-2xl font-bold text-[#0F2547]">Application Submitted Successfully</h2>
          <p className="text-sm text-slate-600">
            Your application has been routed to <span className="font-semibold text-slate-900">{confirmedApp.assignedOfficeName}</span>.
          </p>
          <div className="py-4 px-6 bg-slate-50 border border-slate-200 rounded-lg inline-block">
            <p className="text-xs text-slate-500">Unique Application Tracking ID</p>
            <p className="font-mono text-2xl font-bold text-[#0F2547] mt-1">{confirmedApp.applicationCode}</p>
          </div>
          <div className="pt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
            <Link
              to={`/student/applications/${confirmedApp.id}`}
              className="px-5 py-2.5 text-xs font-medium rounded-lg bg-[#0F2547] text-white hover:bg-[#173463]"
            >
              Track Application Progress
            </Link>
            <Link
              to="/student/applications"
              className="px-5 py-2.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Go to My Applications
            </Link>
          </div>
        </div>

        <div className="print-only bg-white border border-slate-300 rounded-lg p-8 space-y-6 text-slate-900">
          <div className="border-b-2 border-[#0F2547] pb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Bangladesh Army University of Science and Technology (BAUST)
              </p>
              <h2 className="font-display text-xl font-bold text-[#0F2547] mt-1">
                Student Application Submission Receipt
              </h2>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-slate-500">Tracking ID</p>
              <p className="font-mono text-base font-bold text-[#0F2547]">{confirmedApp.applicationCode}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-slate-500">Applicant Name</p>
              <p className="font-semibold text-slate-900 mt-0.5">{confirmedApp.studentName}</p>
            </div>
            <div>
              <p className="text-slate-500">BAUST Student ID</p>
              <p className="font-mono font-semibold text-slate-900 mt-0.5">{confirmedApp.studentBaustId || '—'}</p>
            </div>
            <div>
              <p className="text-slate-500">Department</p>
              <p className="font-semibold text-slate-900 mt-0.5">{confirmedApp.studentDepartment}</p>
            </div>
            <div>
              <p className="text-slate-500">Assigned Office</p>
              <p className="font-semibold text-slate-900 mt-0.5">{confirmedApp.assignedOfficeName}</p>
            </div>
            <div>
              <p className="text-slate-500">Category</p>
              <p className="font-semibold text-slate-900 mt-0.5">{confirmedApp.categoryName}</p>
            </div>
            <div>
              <p className="text-slate-500">Submitted At</p>
              <p className="font-mono font-semibold text-slate-900 mt-0.5">
                {formatDateTime(confirmedApp.submittedAt || confirmedApp.updatedAt)}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 text-xs space-y-2">
            <p><span className="font-semibold">Subject:</span> {confirmedApp.subject}</p>
            <p><span className="font-semibold">Current Status:</span> {confirmedApp.status}</p>
            <p><span className="font-semibold">Attached Documents:</span> {confirmedApp.documents.length}</p>
          </div>

          <div className="border-t border-slate-200 pt-4 text-[11px] text-slate-500 flex justify-between">
            <span>Generated by BAUST Student Application Management System (SAMS)</span>
            <span className="font-mono">Printed: {new Date().toLocaleDateString('en-GB')}</span>
          </div>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout
      title={draftApp ? `Edit Application (${draftApp.applicationCode})` : 'New Online Application'}
      breadcrumb="Student Portal / Online Application Form"
    >
      <div className="max-w-4xl space-y-6">
        {error && (
          <div className="p-4 rounded-lg border border-rose-200 bg-rose-50 text-sm text-rose-800">{error}</div>
        )}
        {statusMessage && (
          <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50 text-sm text-emerald-800">
            {statusMessage}
          </div>
        )}
        {demoNotice && <DemoNotice message={demoNotice} />}

        {/* Step 1: Category Selection & Student Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Application Category</label>
              <select
                disabled={Boolean(draftApp)}
                value={selectedCatId}
                onChange={(e) => {
                  setSelectedCatId(e.target.value);
                  setFormData({});
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
              >
                {catalog.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Office</label>
              <input
                type="text"
                disabled
                value={category?.defaultOfficeName ?? ''}
                className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-700"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <p className="text-slate-500">Applicant Name</p>
              <p className="font-semibold text-slate-900 mt-0.5">{user?.fullName}</p>
            </div>
            <div>
              <p className="text-slate-500">BAUST Student ID</p>
              <p className="font-mono font-semibold text-slate-900 mt-0.5">{user?.baustId || '—'}</p>
            </div>
            <div>
              <p className="text-slate-500">Department &amp; Batch</p>
              <p className="font-semibold text-slate-900 mt-0.5">
                {user?.department} · {user?.batchSemester}
              </p>
            </div>
          </div>
        </div>

        {/* Preview Mode vs Edit Mode */}
        {previewMode && category ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0F2547]">Application Preview</h2>
                <p className="text-xs text-slate-500">Verify all details and attachments before final submission.</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewMode(false)}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Edit Form
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <p><span className="font-semibold text-slate-700">Category:</span> {category.name}</p>
              <p><span className="font-semibold text-slate-700">Subject:</span> {subject}</p>
              {category.dynamicFields.map((f) => (
                <p key={f.key}>
                  <span className="font-semibold text-slate-700">{f.label}:</span> {formData[f.key] || '—'}
                </p>
              ))}
              {remarks && (
                <p><span className="font-semibold text-slate-700">Additional Remarks:</span> {remarks}</p>
              )}
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-xs font-semibold text-slate-700 mb-2">
                Attached Documents ({documents.length})
              </p>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {documents.map((d) => (
                  <li key={d.id} className="font-mono">
                    {d.docSpecName}: {d.originalFilename} ({formatBytes(d.sizeBytes)})
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setPreviewMode(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 text-slate-700"
              >
                Back to Edit
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleFinalSubmit}
                className="px-5 py-2.5 text-xs font-medium rounded-lg bg-[#0F2547] hover:bg-[#173463] disabled:opacity-50 text-white"
              >
                {submitting ? 'Submitting...' : 'Confirm & Final Submit'}
              </button>
            </div>
          </div>
        ) : (
          category && (
            <>
              {/* Step 2: Dynamic Form Fields */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h2 className="font-display text-base font-bold text-[#0F2547]">Application Details</h2>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Application Subject <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={`e.g. Request for ${category.name}`}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.dynamicFields.map((field) => (
                    <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {field.label} {field.required && <span className="text-rose-600">*</span>}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          rows={3}
                          value={formData[field.key] ?? ''}
                          onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      ) : field.type === 'select' ? (
                        <select
                          value={formData[field.key] ?? ''}
                          onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="">Select an option...</option>
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          value={formData[field.key] ?? ''}
                          onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          placeholder={field.placeholder}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Additional Notes for Reviewing Office (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Any urgent deadline or supporting context..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Step 3: Supporting Document Uploads */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div>
                  <h2 className="font-display text-base font-bold text-[#0F2547]">Supporting Documents</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Accepted formats: PDF, JPG, PNG (maximum 5 MB per file). Required documents must be uploaded prior to final submission.
                  </p>
                </div>

                <div className="space-y-3">
                  {category.requiredDocuments.map((spec) => {
                    const attached = documents.filter((d) => d.docSpecId === spec.id);
                    return (
                      <div key={spec.id} className="border border-slate-200 rounded-lg p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {spec.name}{' '}
                              <span className={spec.isRequired ? 'text-rose-600 text-xs' : 'text-slate-500 text-xs'}>
                                {spec.isRequired ? '(Required)' : '(Optional)'}
                              </span>
                            </p>
                            <p className="text-xs text-slate-600 mt-0.5">{spec.description}</p>
                            {spec.isMedicalSensitive && (
                              <p className="text-xs text-[#0D9488] font-medium mt-1">
                                Confidential Medical Document — Restricted to authorized medical staff only
                              </p>
                            )}
                          </div>

                          <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-800 cursor-pointer whitespace-nowrap shrink-0">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{uploadingSpecId === spec.id ? 'Uploading...' : 'Upload File'}</span>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="hidden"
                              disabled={uploadingSpecId === spec.id}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void handleFileUpload(spec.id, spec.name, file);
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </div>

                        {attached.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-slate-100">
                            {attached.map((doc) => (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between gap-2 text-xs bg-slate-50 px-3 py-2 rounded-md"
                              >
                                <span className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-3.5 h-3.5 text-[#1D4ED8] shrink-0" />
                                  <span className="font-medium text-slate-800 truncate">{doc.originalFilename}</span>
                                  <span className="font-mono text-slate-500 shrink-0">{formatBytes(doc.sizeBytes)}</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => void handleRemoveDoc(doc.id)}
                                  className="text-rose-600 hover:text-rose-800 p-1"
                                  title="Remove document"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={submitting || discarding}
                    onClick={handleSaveDraft}
                    className="px-4 py-2.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Save as Draft
                  </button>
                  {draftApp && draftApp.status === 'Draft' && (
                    confirmDiscard ? (
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          disabled={discarding}
                          onClick={() => void handleDiscardDraft()}
                          className="px-3.5 py-2.5 text-xs font-medium rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                        >
                          {discarding ? 'Discarding...' : 'Confirm Discard Draft'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDiscard(false)}
                          className="px-3 py-2.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={submitting || discarding}
                        onClick={() => setConfirmDiscard(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Discard Draft</span>
                      </button>
                    )
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isDemoMode) {
                        const err = validateForSubmit();
                        if (err) {
                          setError(err);
                          return;
                        }
                      }
                      setError('');
                      setDemoNotice('');
                      setPreviewMode(true);
                    }}
                    className="px-4 py-2.5 text-xs font-medium rounded-lg border border-blue-300 bg-blue-50 text-[#1D4ED8] hover:bg-blue-100"
                  >
                    Preview Application
                  </button>
                  <button
                    type="button"
                    disabled={submitting || discarding}
                    onClick={handleFinalSubmit}
                    className="px-5 py-2.5 text-xs font-medium rounded-lg bg-[#0F2547] hover:bg-[#173463] disabled:opacity-50 text-white"
                  >
                    {submitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </div>
            </>
          )
        )}
      </div>
    </PortalLayout>
  );
}
