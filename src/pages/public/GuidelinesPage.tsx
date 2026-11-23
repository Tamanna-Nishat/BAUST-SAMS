import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { PublicLayout } from '../../components/PublicLayout';
import { useAuth } from '../../context/AuthContext';

export function GuidelinesPage() {
  const { catalog, user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialCat = searchParams.get('category') || 'all';
  const [selectedCat, setSelectedCat] = useState(initialCat);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.guidelines.filter((g) => {
      if (selectedCat !== 'all' && g.categoryId !== selectedCat) return false;
      if (!q) return true;
      return (
        g.title.toLowerCase().includes(q) ||
        g.summary.toLowerCase().includes(q) ||
        g.contactOfficeName.toLowerCase().includes(q)
      );
    });
  }, [catalog.guidelines, selectedCat, query]);

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F2547]">
            Official Application Guidelines
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Review eligibility requirements, fee notes, deadlines, required documents, and contact officers.
          </p>
        </div>

        <div className="px-4 py-2.5 rounded-lg border border-amber-200 bg-amber-50/70 text-xs text-amber-950">
          <strong>DEMO DATA — NOT OFFICIAL BAUST INFORMATION:</strong> Sample office phone numbers, fee notes, and submission windows shown by default are project demonstration entries.
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search guidelines..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">All Categories</option>
            {catalog.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-6">
          {filtered.map((guide) => {
            const cat = catalog.categories.find((c) => c.id === guide.categoryId);
            return (
              <section key={guide.id} className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{guide.contactOfficeName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{guide.feeNote}</span>
                    </div>
                    <h2 className="font-display text-xl font-bold text-[#0F2547] mt-1.5">{guide.title}</h2>
                    <p className="text-sm text-slate-600 mt-1.5">{guide.summary}</p>
                  </div>
                  <Link
                    to={
                      user?.role === 'student'
                        ? `/student/apply/${guide.categoryId}`
                        : `/login?redirect=${encodeURIComponent(`/student/apply/${guide.categoryId}`)}`
                    }
                    className="px-4 py-2 text-xs font-medium rounded-lg bg-[#0F2547] hover:bg-[#173463] text-white whitespace-nowrap self-start"
                  >
                    Apply Online
                  </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-5 text-sm">
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Eligibility &amp; Deadlines</h3>
                    <p className="text-slate-600 leading-relaxed">{guide.eligibilityDetails}</p>
                    <p className="text-xs text-slate-500 mt-3">
                      <span className="font-semibold text-slate-700">Window:</span> {guide.deadlineNote}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Submission Instructions</h3>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                      {guide.submissionSteps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Required Documents &amp; Contact</h3>
                    <ul className="space-y-1.5 text-slate-600">
                      {cat?.requiredDocuments.map((doc) => (
                        <li key={doc.id} className="text-xs">
                          <span className="font-medium text-slate-800">{doc.name}</span>{' '}
                          ({doc.allowedTypes.join('/')}, max {doc.maxSizeMb}MB)
                          {doc.isRequired ? ' — Required' : ' — Optional'}
                          {doc.isMedicalSensitive ? ' · Confidential Medical' : ''}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                      <p className="font-semibold text-slate-800">{guide.contactOfficeName}</p>
                      <p>{guide.contactEmail}</p>
                      <p className="font-mono tabular-nums">{guide.contactPhone}</p>
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
          {filtered.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
              <p className="text-sm font-medium text-slate-800">No application guidelines match your search filter.</p>
              <p className="text-xs text-slate-500 mt-1">Select All Categories or clear your search term.</p>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
