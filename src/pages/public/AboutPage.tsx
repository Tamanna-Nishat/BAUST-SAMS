import { PublicLayout } from '../../components/PublicLayout';
import { useAuth } from '../../context/AuthContext';

export function AboutPage() {
  const { catalog } = useAuth();

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-xs font-medium text-[#0D9488]">About the System</p>
            <h1 className="font-display text-3xl font-bold text-[#0F2547] mt-2 [text-wrap:balance]">
              Transparent Student Application Processing for BAUST
            </h1>
            <p className="text-sm text-slate-600 mt-4 leading-relaxed">
              The BAUST Student Application Management System (SAMS) replaces paper-based counter queues at Bangladesh Army University of Science and Technology with a unified, accountable digital workflow.
            </p>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">
              Every application receives a unique Tracking ID, preserves permanent timestamped processing history across every forwarding and review stage, and enforces strict access control—especially for confidential student medical documentation.
            </p>
          </div>
          <div className="lg:col-span-6">
            <div className="h-full min-h-[260px] rounded-xl overflow-hidden border border-slate-200 bg-slate-200">
              <img
                src="/src/assets/images/baust_admin_hall_1795325545200.jpg"
                alt="BAUST Student Services and Registrar Office Hall"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-4">
          <div>
            <h2 className="font-display text-xl font-bold text-[#0F2547]">
              Participating BAUST Administrative Offices
            </h2>
            <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
              <strong>DEMO DATA — NOT OFFICIAL BAUST INFORMATION:</strong> Default office room numbers, email addresses, and telephone extensions listed here are sample project data.
            </p>
          </div>

          <div className="md:hidden divide-y divide-slate-100 border border-slate-200 rounded-lg">
            {catalog.offices.map((o) => (
              <div key={o.id} className="p-4 space-y-1 text-sm">
                <p className="font-mono text-xs font-semibold text-[#0F2547]">{o.code}</p>
                <p className="font-semibold text-slate-900">{o.name}</p>
                <p className="text-xs text-slate-600">{o.buildingLocation}</p>
                <p className="text-xs text-slate-600">{o.email}</p>
                <p className="text-xs font-mono tabular-nums text-slate-700">{o.phone}</p>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-3 pr-4">Code</th>
                  <th className="py-3 pr-4">Office Name</th>
                  <th className="py-3 pr-4">Campus Location</th>
                  <th className="py-3 pr-4">Email</th>
                  <th className="py-3">Telephone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {catalog.offices.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70">
                    <td className="py-3 pr-4 font-mono text-xs text-slate-700">{o.code}</td>
                    <td className="py-3 pr-4 font-medium text-slate-900">{o.name}</td>
                    <td className="py-3 pr-4 text-slate-600">{o.buildingLocation}</td>
                    <td className="py-3 pr-4 text-slate-600">{o.email}</td>
                    <td className="py-3 font-mono text-xs tabular-nums text-slate-700">{o.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
