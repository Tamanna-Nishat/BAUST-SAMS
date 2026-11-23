import React, { useEffect, useMemo, useState } from 'react';
import { DemoNotice } from '../../components/DemoNotice';
import { PortalLayout } from '../../components/PortalLayout';
import { QuestionStatusLabel } from '../../components/StatusIndicator';
import { useAuth } from '../../context/AuthContext';
import { QUESTION_STATUSES, type Question, type QuestionStatus } from '../../types/sams';
import { apiFetch, formatDateTime } from '../../utils/api';

export function StaffQuestionsPage() {
  const { user, isDemoMode, demoQuestions } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [targetStatus, setTargetStatus] = useState<QuestionStatus>('Answered');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [demoNotice, setDemoNotice] = useState('');

  useEffect(() => {
    if (isDemoMode) {
      setQuestions(demoQuestions.filter((q) => q.assignedOfficeId === user?.officeId));
      setLoading(false);
      return;
    }

    apiFetch<{ questions: Question[] }>('/api/questions')
      .then((res) => setQuestions(res.questions))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isDemoMode, demoQuestions, user?.officeId]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return questions;
    return questions.filter((q) => q.status === statusFilter);
  }, [questions, statusFilter]);

  const canAnswer = Boolean(user?.permissions?.can_answer_questions);

  const handleReply = async (e: React.FormEvent, qId: string) => {
    e.preventDefault();
    setError('');
    setDemoNotice('');
    if (isDemoMode) {
      setDemoNotice(
        'Recording staff responses to student questions is disabled in Demo Preview Mode. Configure PostgreSQL and sign in as authorized office staff to reply.'
      );
      setActiveId(null);
      return;
    }

    try {
      const res = await apiFetch<{ question: Question }>(`/api/questions/${qId}/answer`, {
        method: 'POST',
        body: JSON.stringify({
          status: targetStatus,
          answerText: answerText.trim(),
        }),
      });
      setQuestions((prev) => prev.map((q) => (q.id === qId ? res.question : q)));
      setActiveId(null);
      setAnswerText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer.');
    }
  };

  return (
    <PortalLayout
      title="Assigned Questions & Response History"
      breadcrumb={`Staff Portal / ${user?.officeName ?? 'Office'} / Questions`}
    >
      <div className="space-y-6">
        {error && (
          <div className="p-4 rounded-lg border border-rose-200 bg-rose-50 text-sm text-rose-800">{error}</div>
        )}
        {demoNotice && <DemoNotice message={demoNotice} />}

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg max-w-full w-fit">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md ${
              statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            All ({questions.length})
          </button>
          {QUESTION_STATUSES.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                statusFilter === st ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-sm text-slate-500">
            Loading assigned questions...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
            No student questions in this queue.
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((q) => (
              <article key={q.id} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                    <span className="font-mono font-semibold text-slate-800">{q.questionCode}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {q.studentName} ({q.studentBaustId})
                    </span>
                    {q.applicationCode && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">App: {q.applicationCode}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{formatDateTime(q.createdAt)}</span>
                  </div>
                  <QuestionStatusLabel status={q.status} />
                </div>

                <div>
                  <h2 className="font-display text-base font-bold text-[#0F2547]">{q.subject}</h2>
                  <p className="text-sm text-slate-700 mt-1 leading-relaxed">{q.questionText}</p>
                </div>

                {q.answerText && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <p className="text-xs font-semibold text-[#0D9488]">
                      Response by {q.answeredByName} · {formatDateTime(q.answeredAt)}
                    </p>
                    <p className="text-sm text-slate-800 mt-1">{q.answerText}</p>
                  </div>
                )}

                {canAnswer && (
                  <div>
                    {activeId === q.id ? (
                      <form onSubmit={(e) => handleReply(e, q.id)} className="space-y-3 pt-2 border-t border-slate-100">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Question Status</label>
                            <select
                              value={targetStatus}
                              onChange={(e) => setTargetStatus(e.target.value as QuestionStatus)}
                              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                            >
                              <option value="In Progress">In Progress</option>
                              <option value="Answered">Answered</option>
                            </select>
                          </div>
                        </div>
                        <textarea
                          rows={3}
                          required={targetStatus === 'Answered'}
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          placeholder="Write an official staff response for the student..."
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="submit"
                            className="px-4 py-2 text-xs font-medium rounded-lg bg-[#0F2547] text-white hover:bg-[#173463]"
                          >
                            Save Response
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveId(null)}
                            className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 text-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveId(q.id);
                          setAnswerText(q.answerText ?? '');
                          setTargetStatus('Answered');
                        }}
                        className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                      >
                        {q.answerText ? 'Update Response' : 'Respond to Student'}
                      </button>
                    )}
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
