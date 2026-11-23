import React, { useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { DemoNotice } from '../../components/DemoNotice';
import { PortalLayout } from '../../components/PortalLayout';
import { useAuth } from '../../context/AuthContext';
import { APPLICATION_STATUSES, type Application, type SystemSettings } from '../../types/sams';
import { apiFetch } from '../../utils/api';

export function AdminReportsPage() {
  const { catalog, isDemoMode, demoApplications, refreshCatalog } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(catalog.settings);
  const [message, setMessage] = useState('');
  const [demoNotice, setDemoNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isDemoMode) {
      setApplications(demoApplications);
      setSettings(catalog.settings);
      return;
    }

    apiFetch<{ applications: Application[]; settings: SystemSettings }>('/api/admin/overview')
      .then((res) => {
        setApplications(res.applications);
        setSettings(res.settings);
      })
      .catch(() => {});
  }, [isDemoMode, demoApplications, catalog.settings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setError('');
    setMessage('');
    setDemoNotice('');

    if (isDemoMode) {
      setDemoNotice(
        'Saving system settings is disabled in Demo Preview Mode. Configure PostgreSQL and sign in with an administrator account to persist university configuration.'
      );
      return;
    }

    try {
      await apiFetch('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify(settings),
      });
      await refreshCatalog();
      setMessage('System settings updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings.');
    }
  };

  const handleDemoCsvDownload = () => {
    const csvCell = (val: unknown): string => {
      const str = String(val ?? '');
      const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const headers = ['Application ID', 'Student', 'BAUST ID', 'Category', 'Office', 'Status'];
    const rows = applications.map((a) =>
      [a.applicationCode, a.studentName, a.studentBaustId, a.categoryName, a.assignedOfficeName, a.status]
        .map(csvCell)
        .join(',')
    );
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'baust-sams-demo-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PortalLayout title="Reports & System Settings" breadcrumb="Admin Portal / Reports & Settings">
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

        {/* Export Actions */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
          <div>
            <h2 className="font-display text-base font-bold text-[#0F2547]">Institutional Application Summary</h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Export university-wide application tracking statistics as CSV or print an official summary.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>
            {isDemoMode ? (
              <button
                type="button"
                onClick={handleDemoCsvDownload}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-[#0F2547] text-white"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Sample Demo CSV</span>
              </button>
            ) : (
              <a
                href="/api/admin/reports/export"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-[#0F2547] text-white"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV</span>
              </a>
            )}
          </div>
        </div>

        {/* Summary Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="font-display text-base font-bold text-[#0F2547] mb-4">Status Breakdown</h3>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {APPLICATION_STATUSES.map((st) => (
                  <tr key={st}>
                    <td className="py-2 text-slate-700">{st}</td>
                    <td className="py-2 text-right font-mono tabular-nums font-semibold">
                      {applications.filter((a) => a.status === st).length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="font-display text-base font-bold text-[#0F2547] mb-4">Category Distribution</h3>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2">Category</th>
                  <th className="py-2 text-right">Applications</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {catalog.categories.map((cat) => (
                  <tr key={cat.id}>
                    <td className="py-2 text-slate-700">{cat.name}</td>
                    <td className="py-2 text-right font-mono tabular-nums font-semibold">
                      {applications.filter((a) => a.categoryId === cat.id).length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Settings */}
        {settings && (
          <form onSubmit={handleSaveSettings} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 no-print">
            <h2 className="font-display text-base font-bold text-[#0F2547]">University System Settings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">University Name</label>
                <input
                  type="text"
                  required
                  value={settings.universityName}
                  onChange={(e) => setSettings({ ...settings, universityName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Active Academic Semester</label>
                <input
                  type="text"
                  required
                  value={settings.academicSemester}
                  onChange={(e) => setSettings({ ...settings, academicSemester: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Support Email</label>
                <input
                  type="email"
                  required
                  value={settings.supportEmail}
                  onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Support Phone</label>
                <input
                  type="text"
                  required
                  value={settings.supportPhone}
                  onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={settings.allowNewRegistrations}
                onChange={(e) => setSettings({ ...settings, allowNewRegistrations: e.target.checked })}
              />
              Allow New Student Self-Registrations
            </label>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium rounded-lg bg-[#1D4ED8] text-white"
            >
              Save System Settings
            </button>
          </form>
        )}
      </div>
    </PortalLayout>
  );
}
