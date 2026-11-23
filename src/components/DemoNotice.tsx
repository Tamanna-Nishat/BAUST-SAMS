import { Info } from 'lucide-react';

export function DemoNotice({
  message,
  title = 'Demo Preview Mode (Read-Only Sample Data)',
}: {
  message: string;
  title?: string;
}) {
  return (
    <div
      role="status"
      className="p-4 rounded-lg border border-amber-300 bg-amber-50 text-amber-950 flex items-start gap-3"
    >
      <Info className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
      <div className="text-xs leading-relaxed">
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-amber-900">{message}</p>
      </div>
    </div>
  );
}
