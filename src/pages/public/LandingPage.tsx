import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, FileCheck2, Lock, MessageSquare } from 'lucide-react';
import { PublicLayout } from '../../components/PublicLayout';
import { useAuth } from '../../context/AuthContext';
import { formatBdt } from '../../utils/api';
import type { DemoPersonaKey } from '../../data/demoData';

export function LandingPage() {
  const { catalog, enterDemoMode, user } = useAuth();
  const navigate = useNavigate();

  const handleDemoLaunch = (persona: DemoPersonaKey, target: string) => {
    enterDemoMode(persona);
    navigate(target);
  };

  return (
    <PublicLayout>
      {/* Hero Split */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-xs font-medium tracking-wide text-[#0D9488] mb-3">
              Bangladesh Army University of Science and Technology · Saidpur
            </p>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.85rem] font-bold tracking-tight text-[#0F2547] leading-[1.15] [text-wrap:balance]">
              Academic and Administrative Applications, Digitized.
            </h1>
            <p className="mt-5 text-base text-slate-600 leading-relaxed max-w-xl">
              Discover official application guidelines, submit forms with verified supporting documents, ask office staff directly, and track every processing step with a permanent audit trail.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to={
                  user?.role === 'admin'
                    ? '/admin/dashboard'
                    : user?.role === 'staff'
                    ? '/staff/applications'
                    : user?.role === 'student'
                    ? '/student/apply'
                    : '/register'
                }
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#0F2547] hover:bg-[#173463] text-white text-sm font-medium transition-colors whitespace-nowrap"
              >
                <span>
                  {user?.role === 'admin'
                    ? 'Open Admin Portal'
                    : user?.role === 'staff'
                    ? 'Open Staff Review Queue'
                    : user?.role === 'student'
                    ? 'Start New Application'
                    : 'Register as Student'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/categories"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-medium transition-colors whitespace-nowrap"
              >
                Browse Categories
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full min-h-[280px] lg:min-h-[380px] rounded-xl overflow-hidden border border-slate-200 bg-gradient-to-br from-[#0F2547] to-[#1D4ED8] relative">
              <img
                src="/src/assets/images/baust_campus_hero_1795325544266.jpg"
                alt="Bangladesh Army University of Science and Technology Campus Courtyard"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/35 to-transparent p-6 text-white">
                <p className="text-xs text-slate-200">BAUST Saidpur Campus · Official Student Portal</p>
                <p className="font-display text-base font-semibold mt-0.5">
                  Unified routing across Registrar, Examinations, DSW &amp; Academic Departments
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4-column institutional strip below hero */}
        <div className="border-t border-slate-200 bg-slate-50/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="font-mono text-xl font-semibold text-[#0F2547] tabular-nums">
                {catalog.categories.length || 6} Categories
              </p>
              <p className="text-xs text-slate-600 mt-1">Transcripts, Medical Leave, Waivers &amp; Clearances</p>
            </div>
            <div>
              <p className="font-mono text-xl font-semibold text-[#0F2547] tabular-nums">
                {catalog.offices.length || 6} Offices
              </p>
              <p className="text-xs text-slate-600 mt-1">Direct digital routing &amp; inter-office forwarding</p>
            </div>
            <div>
              <p className="font-mono text-xl font-semibold text-[#0F2547] tabular-nums">10 Statuses</p>
              <p className="text-xs text-slate-600 mt-1">Timestamped remarks &amp; permanent audit history</p>
            </div>
            <div>
              <p className="font-mono text-xl font-semibold text-[#0F2547] tabular-nums">PDF · JPG · PNG</p>
              <p className="text-xs text-slate-600 mt-1">Validated attachments with medical privacy control</p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Demo Role Launcher */}
      {!user && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12">
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold text-amber-900">
                  DEMO PREVIEW MODE · Unauthenticated Sample Data (Read-Only)
                </p>
                <h2 className="font-display text-xl font-bold text-[#0F2547] mt-1">
                  Inspect Student, Staff, and Administrator Layouts
                </h2>
                <p className="text-sm text-slate-700 mt-2 leading-relaxed">
                  Preview all portal layouts and navigation immediately using clearly labeled BAUST sample records—no PostgreSQL credentials required. Database writes, uploads, and authentication stay disabled in Demo Preview until PostgreSQL is configured locally.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDemoLaunch('student', '/student/dashboard')}
                  className="px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-blue-50 hover:border-blue-300 text-xs font-semibold text-slate-800 transition-colors whitespace-nowrap"
                >
                  Student Preview
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLaunch('staff_registrar', '/staff/dashboard')}
                  className="px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-blue-50 hover:border-blue-300 text-xs font-semibold text-slate-800 transition-colors whitespace-nowrap"
                >
                  Registrar Preview
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLaunch('staff_medical', '/staff/dashboard')}
                  className="px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-blue-50 hover:border-blue-300 text-xs font-semibold text-slate-800 transition-colors whitespace-nowrap"
                >
                  Medical Preview
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLaunch('admin', '/admin/dashboard')}
                  className="px-3.5 py-2.5 rounded-lg bg-[#0F2547] hover:bg-[#173463] text-xs font-semibold text-white transition-colors whitespace-nowrap"
                >
                  Admin Preview
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Four System Modules */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="max-w-2xl mb-10">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0F2547]">
            Four Integrated University Modules
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Designed around BAUST Saidpur administrative procedures with strict role-based authority.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-3 text-[#0F2547]">
              <Building2 className="w-5 h-5 text-[#1D4ED8]" />
              <h3 className="font-display text-base font-bold">01. Guidelines &amp; Eligibility Discovery</h3>
            </div>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">
              Search application categories, inspect required documents, verify BDT fee requirements, review deadlines, and contact the responsible office before starting.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-3 text-[#0F2547]">
              <FileCheck2 className="w-5 h-5 text-[#1D4ED8]" />
              <h3 className="font-display text-base font-bold">02. Online Submission &amp; Drafts</h3>
            </div>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">
              Dynamic category forms pre-filled with your BAUST profile, PDF/JPG/PNG document validation, draft saving, full preview, and unique Tracking ID generation.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-3 text-[#0F2547]">
              <MessageSquare className="w-5 h-5 text-[#1D4ED8]" />
              <h3 className="font-display text-base font-bold">03. Student Q&amp;A and FAQ Helpdesk</h3>
            </div>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">
              Link inquiries directly to an application type or Tracking ID. Authorized office staff reply with tracked statuses and instant student notifications.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-3 text-[#0F2547]">
              <Lock className="w-5 h-5 text-[#1D4ED8]" />
              <h3 className="font-display text-base font-bold">04. Office Routing &amp; Medical Privacy</h3>
            </div>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">
              Office-scoped queues, inter-office forwarding, granular staff approval/rejection controls, permanent status history, and restricted medical document access.
            </p>
          </div>
        </div>
      </section>

      {/* Active Categories Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#0F2547]">Available Application Categories</h2>
            <p className="text-sm text-slate-600 mt-1">
              Select a category to read full eligibility rules and required documents.
            </p>
          </div>
          <Link
            to="/categories"
            className="text-sm font-medium text-[#1D4ED8] hover:underline whitespace-nowrap"
          >
            View all categories →
          </Link>
        </div>

        <div className="mb-4 px-4 py-2.5 rounded-lg border border-amber-200 bg-amber-50/70 text-xs text-amber-950">
          <strong>DEMO DATA — NOT OFFICIAL BAUST INFORMATION:</strong> Sample application fees, processing days, and office contacts shown below are academic project placeholders unless customized by an administrator.
        </div>

        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
          {catalog.categories.slice(0, 6).map((cat) => (
            <div key={cat.id} className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono">
                  <span>{cat.code}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-sans">{cat.defaultOfficeName}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatBdt(cat.feeBdt)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{cat.processingDays} working days</span>
                </div>
                <h3 className="font-display text-base font-semibold text-slate-900 mt-1.5">{cat.name}</h3>
                <p className="text-sm text-slate-600 mt-1">{cat.shortDescription}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link
                  to={`/guidelines?category=${cat.id}`}
                  className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                >
                  Guidelines
                </Link>
                <Link
                  to={
                    user?.role === 'student'
                      ? `/student/apply/${cat.id}`
                      : `/login?redirect=${encodeURIComponent(`/student/apply/${cat.id}`)}`
                  }
                  className="px-3.5 py-2 text-xs font-medium rounded-lg bg-[#1D4ED8] text-white hover:bg-blue-700 whitespace-nowrap"
                >
                  Apply Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
