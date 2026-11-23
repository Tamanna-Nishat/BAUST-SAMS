import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { PortalLayout } from '../../components/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import { formatBdt } from '../../utils/api';

export function BrowseApplicationsPage() {
  const { catalog } = useAuth();
  const [query, setQuery] = useState('');
  const [officeId, setOfficeId] = useState('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.categories.filter((c) => {
      if (officeId !== 'all' && c.defaultOfficeId !== officeId) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.shortDescription.toLowerCase().includes(q)
      );
    });
  }, [catalog.categories, query, officeId]);

  return (
    <PortalLayout title="Browse Applications" breadcrumb="Student Portal / Browse Applications">
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search application categories..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <select
            value={officeId}
            onChange={(e) => setOfficeId(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Responsible Offices</option>
            {catalog.offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <p className="text-sm font-medium text-slate-800">No application categories match your current filter.</p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setOfficeId('all');
              }}
              className="mt-4 px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map((cat) => (
              <div key={cat.id} className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono font-semibold text-slate-700">{cat.code}</span>
                    <span aria-hidden="true">·</span>
                    <span>{cat.defaultOfficeName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{formatBdt(cat.feeBdt)}</span>
                  </div>
                  <h2 className="font-display text-lg font-bold text-[#0F2547] mt-2">{cat.name}</h2>
                  <p className="text-sm text-slate-600 mt-2">{cat.shortDescription}</p>
                  <p className="text-xs text-slate-500 mt-3">
                    <span className="font-semibold text-slate-700">Deadline:</span> {cat.deadlineText}
                  </p>
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <Link
                    to={`/student/apply/${cat.id}`}
                    className="px-4 py-2 text-xs font-medium rounded-lg bg-[#1D4ED8] hover:bg-blue-700 text-white whitespace-nowrap"
                  >
                    Apply Now
                  </Link>
                  <Link
                    to={`/student/categories/${cat.id}`}
                    className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                  >
                    View Guidelines &amp; Docs
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
