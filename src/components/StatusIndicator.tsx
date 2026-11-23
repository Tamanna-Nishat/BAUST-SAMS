import {
  AlertCircle,
  ArrowRightCircle,
  CheckCircle2,
  Clock,
  FileEdit,
  HelpCircle,
  Send,
  XCircle,
} from 'lucide-react';
import type { ApplicationStatus, QuestionStatus } from '../types/sams';

const APP_STATUS_STYLES: Record<ApplicationStatus, { text: string; bg: string; border: string; Icon: typeof Clock }> = {
  Draft: { text: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200', Icon: FileEdit },
  Submitted: { text: 'text-blue-800', bg: 'bg-blue-50', border: 'border-blue-200', Icon: Send },
  'Under Review': { text: 'text-indigo-800', bg: 'bg-indigo-50', border: 'border-indigo-200', Icon: Clock },
  'Awaiting Student Information': { text: 'text-amber-800', bg: 'bg-amber-50', border: 'border-amber-200', Icon: AlertCircle },
  Forwarded: { text: 'text-cyan-800', bg: 'bg-cyan-50', border: 'border-cyan-200', Icon: ArrowRightCircle },
  'Pending Decision': { text: 'text-sky-900', bg: 'bg-sky-50', border: 'border-sky-200', Icon: Clock },
  Approved: { text: 'text-emerald-800', bg: 'bg-emerald-50', border: 'border-emerald-200', Icon: CheckCircle2 },
  Rejected: { text: 'text-rose-800', bg: 'bg-rose-50', border: 'border-rose-200', Icon: XCircle },
  Completed: { text: 'text-teal-900', bg: 'bg-teal-50', border: 'border-teal-200', Icon: CheckCircle2 },
  Withdrawn: { text: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200', Icon: XCircle },
};

const QUESTION_STATUS_STYLES: Record<QuestionStatus, { text: string; bg: string; border: string; Icon: typeof Clock }> = {
  Unanswered: { text: 'text-amber-800', bg: 'bg-amber-50', border: 'border-amber-200', Icon: HelpCircle },
  'In Progress': { text: 'text-blue-800', bg: 'bg-blue-50', border: 'border-blue-200', Icon: Clock },
  Answered: { text: 'text-emerald-800', bg: 'bg-emerald-50', border: 'border-emerald-200', Icon: CheckCircle2 },
};

export function ApplicationStatusLabel({ status }: { status: ApplicationStatus }) {
  const cfg = APP_STATUS_STYLES[status] ?? APP_STATUS_STYLES.Draft;
  const Icon = cfg.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{status}</span>
    </span>
  );
}

export function QuestionStatusLabel({ status }: { status: QuestionStatus }) {
  const cfg = QUESTION_STATUS_STYLES[status] ?? QUESTION_STATUS_STYLES.Unanswered;
  const Icon = cfg.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{status}</span>
    </span>
  );
}
