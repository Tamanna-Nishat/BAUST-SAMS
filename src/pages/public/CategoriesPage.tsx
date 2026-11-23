import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { PublicLayout } from '../../components/PublicLayout';
import { useAuth } from '../../context/AuthContext';
import { formatBdt } from '../../utils/api';

export function CategoriesPage() {
  const { catalog, user } = useAuth();
  const [query, setQuery] = useState('');
  const [officeFilter, setOfficeFilter] = useState('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.categories.filter((c) => {
      if (officeFilter !== 'all' && c.defaultOfficeId !== officeFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.shortDescription.toLowerCase().includes(q) ||
        c.defaultOfficeName.toLowerCase().includes(q)
      );
    });
  }, [catalog.categories, query, officeFilter]);

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F2547]">Application Categories</h1>
          <p className="text-sm text-slate-600 mt-1">
            Browse all university application procedures, required documents, processing durations, and fees.
          </p>
        </div>

        <div className="px-4 py-2.5 rounded-lg border border-amber-200 bg-amber-50/70 text-xs text-amber-950">
          <strong>DEMO DATA — NOT OFFICIAL BAUST INFORMATION:</strong> Default fees, turnaround days, and deadlines are illustrative project sample data until updated by an authorized administrator.
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by application title, code, or office..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <select
            value={officeFilter}
            onChange={(e) => setOfficeFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">All Offices</option>
            {catalog.offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <p className="text-sm font-medium text-slate-800">No matching application categories found.</p>
            <p className="text-xs text-slate-500 mt-1">Try clearing your search filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((cat) => (
              <article key={cat.id} className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono font-medium text-slate-700">{cat.code}</span>
                    <span aria-hidden="true">·</span>
                    <span>{cat.defaultOfficeName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{formatBdt(cat.feeBdt)}</span>
                  </div>
                  <h2 className="font-display text-lg font-bold text-[#0F2547] mt-2">{cat.name}</h2>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{cat.shortDescription}</p>

                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <p><span className="font-semibold text-slate-800">Deadline:</span> {cat.deadlineText}</p>
                    <p><span className="font-semibold text-slate-800">Turnaround:</span> {cat.processingDays} working days</p>
                    <p>
                      <span className="font-semibold text-slate-800">Required Docs:</span>{' '}
                      {cat.requiredDocuments.filter((d) => d.isRequired).map((d) => d.name).join(', ') || 'None'}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <Link
                    to={
                      user?.role === 'student'
                        ? `/student/apply/${cat.id}`
                        : `/login?redirect=${encodeURIComponent(`/student/apply/${cat.id}`)}`
                    }
                    className="px-4 py-2 text-xs font-medium rounded-lg bg-[#1D4ED8] hover:bg-blue-700 text-white whitespace-nowrap"
                  >
                    Start Application
                  </Link>
                  <Link
                    to={`/guidelines?category=${cat.id}`}
                    className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                  >
                    Read Guidelines
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
