import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { DemoNotice } from '../../components/DemoNotice';
import { PortalLayout } from '../../components/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import type { ApplicationCategory, DynamicFieldSpec, RequiredDocumentSpec } from '../../types/sams';
import { apiFetch, formatBdt } from '../../utils/api';

export function AdminCategoriesPage() {
  const { catalog, isDemoMode, refreshCatalog } = useAuth();
  const [editing, setEditing] = useState<ApplicationCategory | null>(null);
  const [message, setMessage] = useState('');
  const [demoNotice, setDemoNotice] = useState('');
  const [error, setError] = useState('');

  const addDynamicField = () => {
    if (!editing) return;
    const nextIdx = editing.dynamicFields.length + 1;
    const newField: DynamicFieldSpec = {
      key: `field_${nextIdx}`,
      label: `Field ${nextIdx}`,
      type: 'text',
      required: false,
      placeholder: '',
    };
    setEditing({ ...editing, dynamicFields: [...editing.dynamicFields, newField] });
  };

  const addRequiredDoc = () => {
    if (!editing) return;
    const newDoc: RequiredDocumentSpec = {
      id: `doc-${Date.now()}`,
      name: 'New Supporting Document',
      description: 'PDF, JPG, or PNG scan.',
      allowedTypes: ['PDF', 'JPG', 'PNG'],
      maxSizeMb: 5,
      isRequired: true,
      isMedicalSensitive: false,
    };
    setEditing({ ...editing, requiredDocuments: [...editing.requiredDocuments, newDoc] });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setError('');
    setMessage('');
    setDemoNotice('');
    if (isDemoMode) {
      setDemoNotice(
        'Category and required document edits are disabled in Demo Preview Mode. Configure PostgreSQL and sign in as an administrator to persist changes.'
      );
      setEditing(null);
      return;
    }

    try {
      await apiFetch('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify(editing),
      });
      await refreshCatalog();
      setEditing(null);
      setMessage('Category, dynamic form fields, and required document configuration saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category.');
    }
  };

  return (
    <PortalLayout
      title="Application Categories & Required Documents"
      breadcrumb="Admin Portal / Categories & Docs"
    >
      <div className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg border border-rose-200 bg-rose-50 text-sm text-rose-800">{error}</div>
        )}
        {message && (
          <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50 text-sm text-emerald-800">
            {message}
          </div>
        )}
        {demoNotice && <DemoNotice message={demoNotice} />}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() =>
              setEditing({
                id: '',
                slug: `cat-${Date.now()}`,
                code: 'APP-NEW',
                name: '',
                shortDescription: '',
                defaultOfficeId: catalog.offices[0]?.id ?? 'off-reg',
                defaultOfficeName: catalog.offices[0]?.name ?? 'Office of the Registrar',
                feeBdt: 0,
                processingDays: 7,
                deadlineText: 'Open year-round',
                eligibility: 'Enrolled BAUST students.',
                submissionInstructions: 'Complete all fields and upload required documents.',
                isActive: true,
                dynamicFields: [
                  { key: 'details', label: 'Request Details', type: 'textarea', required: true },
                ],
                requiredDocuments: [],
              })
            }
            className="px-4 py-2 text-xs font-medium rounded-lg bg-[#0F2547] text-white"
          >
            Add Application Category
          </button>
        </div>

        {editing && (
          <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <h2 className="font-display text-base font-bold text-[#0F2547]">
              {editing.id ? `Edit Category: ${editing.name}` : 'Create Application Category'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Code</label>
                <input
                  type="text"
                  required
                  value={editing.code}
                  onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Default Office</label>
                <select
                  value={editing.defaultOfficeId}
                  onChange={(e) => setEditing({ ...editing, defaultOfficeId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  {catalog.offices.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fee (BDT)</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={editing.feeBdt}
                  onChange={(e) => setEditing({ ...editing, feeBdt: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Processing Days</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={editing.processingDays}
                  onChange={(e) => setEditing({ ...editing, processingDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deadline Text</label>
                <input
                  type="text"
                  required
                  value={editing.deadlineText}
                  onChange={(e) => setEditing({ ...editing, deadlineText: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Short Description</label>
              <input
                type="text"
                required
                value={editing.shortDescription}
                onChange={(e) => setEditing({ ...editing, shortDescription: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Eligibility Criteria</label>
                <textarea
                  rows={2}
                  required
                  value={editing.eligibility}
                  onChange={(e) => setEditing({ ...editing, eligibility: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Submission Instructions</label>
                <textarea
                  rows={2}
                  required
                  value={editing.submissionInstructions}
                  onChange={(e) => setEditing({ ...editing, submissionInstructions: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={editing.isActive}
                onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
              />
              <span>Category Active &amp; Visible for Student Submissions</span>
            </label>

            {/* Dynamic Form Fields Builder */}
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[#0F2547]">Dynamic Application Form Fields</h3>
                <button
                  type="button"
                  onClick={addDynamicField}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 hover:bg-slate-50"
                >
                  + Add Form Field
                </button>
              </div>
              {editing.dynamicFields.length === 0 ? (
                <p className="text-xs text-slate-500">No dynamic fields configured.</p>
              ) : (
                editing.dynamicFields.map((field, idx) => (
                  <div key={`${field.key}-${idx}`} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                      <div className="sm:col-span-3">
                        <input
                          type="text"
                          required
                          value={field.label}
                          onChange={(e) => {
                            const next = [...editing.dynamicFields];
                            next[idx] = { ...field, label: e.target.value };
                            setEditing({ ...editing, dynamicFields: next });
                          }}
                          placeholder="Field Label"
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <input
                          type="text"
                          required
                          value={field.key}
                          onChange={(e) => {
                            const next = [...editing.dynamicFields];
                            next[idx] = { ...field, key: e.target.value.replace(/\s+/g, '_') };
                            setEditing({ ...editing, dynamicFields: next });
                          }}
                          placeholder="Field Key"
                          className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <select
                          value={field.type}
                          onChange={(e) => {
                            const next = [...editing.dynamicFields];
                            next[idx] = { ...field, type: e.target.value as DynamicFieldSpec['type'] };
                            setEditing({ ...editing, dynamicFields: next });
                          }}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                        >
                          <option value="text">Text</option>
                          <option value="textarea">Textarea</option>
                          <option value="select">Select</option>
                          <option value="date">Date</option>
                          <option value="number">Number</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          value={field.placeholder ?? ''}
                          onChange={(e) => {
                            const next = [...editing.dynamicFields];
                            next[idx] = { ...field, placeholder: e.target.value };
                            setEditing({ ...editing, dynamicFields: next });
                          }}
                          placeholder="Placeholder"
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                        />
                      </div>
                      <label className="sm:col-span-1 flex items-center gap-1 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => {
                            const next = [...editing.dynamicFields];
                            next[idx] = { ...field, required: e.target.checked };
                            setEditing({ ...editing, dynamicFields: next });
                          }}
                        />
                        Req
                      </label>
                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            setEditing({
                              ...editing,
                              dynamicFields: editing.dynamicFields.filter((_, i) => i !== idx),
                            })
                          }
                          className="p-1.5 text-rose-600 hover:text-rose-800"
                          title="Remove field"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {field.type === 'select' && (
                      <input
                        type="text"
                        value={(field.options ?? []).join(', ')}
                        onChange={(e) => {
                          const next = [...editing.dynamicFields];
                          next[idx] = {
                            ...field,
                            options: e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          };
                          setEditing({ ...editing, dynamicFields: next });
                        }}
                        placeholder="Select options separated by commas (e.g. Official, Unofficial)"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                      />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Required Document Management */}
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[#0F2547]">Required Document Specifications</h3>
                <button
                  type="button"
                  onClick={addRequiredDoc}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 hover:bg-slate-50"
                >
                  + Add Document Requirement
                </button>
              </div>
              {editing.requiredDocuments.map((doc, idx) => (
                <div key={doc.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 items-center">
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      required
                      value={doc.name}
                      onChange={(e) => {
                        const next = [...editing.requiredDocuments];
                        next[idx] = { ...doc, name: e.target.value };
                        setEditing({ ...editing, requiredDocuments: next });
                      }}
                      placeholder="Document Name"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      required
                      value={doc.description}
                      onChange={(e) => {
                        const next = [...editing.requiredDocuments];
                        next[idx] = { ...doc, description: e.target.value };
                        setEditing({ ...editing, requiredDocuments: next });
                      }}
                      placeholder="Instructions"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                    />
                  </div>
                  <label className="sm:col-span-2 flex items-center gap-1.5 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={doc.isRequired}
                      onChange={(e) => {
                        const next = [...editing.requiredDocuments];
                        next[idx] = { ...doc, isRequired: e.target.checked };
                        setEditing({ ...editing, requiredDocuments: next });
                      }}
                    />
                    Required
                  </label>
                  <label className="sm:col-span-2 flex items-center gap-1.5 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={doc.isMedicalSensitive}
                      onChange={(e) => {
                        const next = [...editing.requiredDocuments];
                        next[idx] = { ...doc, isMedicalSensitive: e.target.checked };
                        setEditing({ ...editing, requiredDocuments: next });
                      }}
                    />
                    Medical Confidential
                  </label>
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({
                          ...editing,
                          requiredDocuments: editing.requiredDocuments.filter((_, i) => i !== idx),
                        })
                      }
                      className="p-1.5 text-rose-600 hover:text-rose-800"
                      title="Remove document specification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button type="submit" className="px-4 py-2 text-xs font-medium rounded-lg bg-[#1D4ED8] text-white">
                Save Category
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 text-slate-700"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {catalog.categories.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-500">No application categories configured yet.</p>
          ) : (
            catalog.categories.map((cat) => (
              <div key={cat.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-mono text-slate-500">
                    {cat.code} · {cat.defaultOfficeName} · {formatBdt(cat.feeBdt)} · {cat.dynamicFields.length} fields · {cat.requiredDocuments.length} doc specs
                    {!cat.isActive ? ' · Inactive' : ''}
                  </p>
                  <h3 className="font-display text-base font-bold text-slate-900 mt-0.5">{cat.name}</h3>
                  <p className="text-xs text-slate-600 mt-1">{cat.shortDescription}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(structuredClone(cat))}
                  className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 shrink-0"
                >
                  Configure Category &amp; Docs
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
