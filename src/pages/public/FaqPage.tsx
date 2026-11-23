import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { PublicLayout } from '../../components/PublicLayout';
import { useAuth } from '../../context/AuthContext';

export function FaqPage() {
  const { catalog } = useAuth();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog.faqs;
    return catalog.faqs.filter(
      (f) =>
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q) ||
        (f.categoryName ?? '').toLowerCase().includes(q)
    );
  }, [catalog.faqs, query]);

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F2547]">
            Frequently Asked Questions
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Official answers regarding BAUST application submission, document privacy, and processing timelines.
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-600">No FAQ entries match your search.</div>
          ) : (
            filtered.map((faq) => (
              <div key={faq.id} className="p-6">
                <p className="text-xs text-[#0D9488] font-medium mb-1">{faq.categoryName || 'General System'}</p>
                <h2 className="font-display text-base font-bold text-slate-900">{faq.question}</h2>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{faq.answer}</p>
              </div>
            ))
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-base font-bold text-[#0F2547]">Still have a question?</h3>
            <p className="text-sm text-slate-600 mt-0.5">
              Sign in as a student to send a direct inquiry to the relevant BAUST office.
            </p>
          </div>
          <Link
            to="/login"
            className="px-4 py-2 text-xs font-medium rounded-lg bg-[#1D4ED8] text-white hover:bg-blue-700 whitespace-nowrap"
          >
            Sign In to Ask Staff
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
