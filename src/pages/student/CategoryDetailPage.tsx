import { Link, useParams } from 'react-router-dom';
import { PortalLayout } from '../../components/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import { formatBdt } from '../../utils/api';

export function CategoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { catalog } = useAuth();

  const category = catalog.categories.find((c) => c.id === id || c.slug === id);
  const guideline = catalog.guidelines.find((g) => g.categoryId === category?.id);
  const office = catalog.offices.find((o) => o.id === category?.defaultOfficeId);

  if (!category) {
    return (
      <PortalLayout title="Application Details" breadcrumb="Student Portal / Application Details">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-sm font-medium text-slate-800">Application category not found.</p>
          <Link to="/student/browse" className="inline-block mt-4 text-xs font-medium text-[#1D4ED8] hover:underline">
            Return to Browse Applications
          </Link>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout title={category.name} breadcrumb={`Student Portal / Browse / ${category.code}`}>
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-mono font-semibold text-slate-700">{category.code}</span>
              <span aria-hidden="true">·</span>
              <span>{category.defaultOfficeName}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{formatBdt(category.feeBdt)}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{category.processingDays} working days</span>
            </div>
            <h2 className="font-display text-xl font-bold text-[#0F2547] mt-2">{category.name}</h2>
            <p className="text-sm text-slate-600 mt-2 max-w-2xl">{category.shortDescription}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to={`/student/ask?categoryId=${category.id}`}
              className="px-4 py-2.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              Ask a Question
            </Link>
            <Link
              to={`/student/apply/${category.id}`}
              className="px-5 py-2.5 text-xs font-medium rounded-lg bg-[#1D4ED8] hover:bg-blue-700 text-white whitespace-nowrap"
            >
              Start Application
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div>
              <h3 className="font-display text-base font-bold text-[#0F2547]">Eligibility Criteria</h3>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{category.eligibility}</p>
            </div>
            <div className="border-t border-slate-100 pt-5">
              <h3 className="font-display text-base font-bold text-[#0F2547]">Submission Instructions</h3>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{category.submissionInstructions}</p>
              {guideline && (
                <ol className="list-decimal list-inside mt-3 space-y-1.5 text-sm text-slate-600">
                  {guideline.submissionSteps.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ol>
              )}
            </div>
            <div className="border-t border-slate-100 pt-5">
              <h3 className="font-display text-base font-bold text-[#0F2547]">Required Supporting Documents</h3>
              <div className="mt-3 divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {category.requiredDocuments.map((doc) => (
                  <div key={doc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {doc.name} {doc.isRequired ? '(Required)' : '(Optional)'}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">{doc.description}</p>
                    </div>
                    <div className="text-xs text-slate-500 font-mono shrink-0">
                      {doc.allowedTypes.join('/')} · Max {doc.maxSizeMb}MB
                      {doc.isMedicalSensitive ? ' · Confidential Medical' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 self-start">
            <h3 className="font-display text-base font-bold text-[#0F2547]">Key Information &amp; Contact</h3>
            <div className="text-sm space-y-3">
              <div>
                <p className="text-xs text-slate-500">Application Deadline</p>
                <p className="font-medium text-slate-900 mt-0.5">{category.deadlineText}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Prescribed Fee</p>
                <p className="font-mono font-medium text-slate-900 mt-0.5">{formatBdt(category.feeBdt)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Processing Office</p>
                <p className="font-medium text-slate-900 mt-0.5">{office?.name ?? category.defaultOfficeName}</p>
                <p className="text-xs text-slate-600 mt-0.5">{office?.buildingLocation}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Office Contact</p>
                <p className="text-xs text-slate-700 mt-0.5">{office?.email}</p>
                <p className="text-xs font-mono tabular-nums text-slate-700">{office?.phone}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
