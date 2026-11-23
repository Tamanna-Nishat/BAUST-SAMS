import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PortalLayout } from '../../components/PortalLayout';
import { QuestionStatusLabel } from '../../components/StatusIndicator';
import { useAuth } from '../../context/AuthContext';
import { QUESTION_STATUSES, type Question } from '../../types/sams';
import { apiFetch, formatDateTime } from '../../utils/api';

export function StudentQuestionsPage() {
  const { user, isDemoMode, demoQuestions } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      setQuestions(demoQuestions.filter((q) => q.studentId === user?.id));
      setLoading(false);
      return;
    }
    apiFetch<{ questions: Question[] }>('/api/questions')
      .then((res) => setQuestions(res.questions))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isDemoMode, demoQuestions, user?.id]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return questions;
    return questions.filter((q) => q.status === statusFilter);
  }, [questions, statusFilter]);

  return (
    <PortalLayout title="My Questions" breadcrumb="Student Portal / My Questions">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg max-w-full">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({questions.length})
            </button>
            {QUESTION_STATUSES.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === st ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <Link
            to="/student/ask"
            className="px-4 py-2 text-xs font-medium rounded-lg bg-[#1D4ED8] text-white hover:bg-blue-700"
          >
            Ask New Question
          </Link>
        </div>

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-sm text-slate-500">
            Loading question history...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
            <p className="text-sm font-medium text-slate-800">No questions found in this view.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((q) => (
              <article key={q.id} className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono font-semibold text-slate-800">{q.questionCode}</span>
                    <span aria-hidden="true">·</span>
                    <span>{q.assignedOfficeName}</span>
                    {q.applicationCode && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">Linked: {q.applicationCode}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{formatDateTime(q.createdAt)}</span>
                  </div>
                  <QuestionStatusLabel status={q.status} />
                </div>

                <h2 className="font-display text-base font-bold text-[#0F2547]">{q.subject}</h2>
                <p className="text-sm text-slate-700 leading-relaxed">{q.questionText}</p>

                {q.answerText && (
                  <div className="mt-3 pt-4 border-t border-slate-200 bg-slate-50/80 rounded-lg p-4">
                    <p className="text-xs font-semibold text-[#0D9488]">
                      Official Staff Response — {q.answeredByName} ({formatDateTime(q.answeredAt)})
                    </p>
                    <p className="text-sm text-slate-800 mt-1.5 leading-relaxed">{q.answerText}</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
