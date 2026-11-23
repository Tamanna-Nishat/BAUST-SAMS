import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user, isDemoMode, postgresConfigured, exitDemoMode } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const portalPath = user
    ? user.role === 'admin'
      ? '/admin/dashboard'
      : user.role === 'staff'
      ? '/staff/dashboard'
      : '/student/dashboard'
    : '/login';

  const navLinks = [
    { to: '/categories', label: 'Categories' },
    { to: '/guidelines', label: 'Guidelines' },
    { to: '/faq', label: 'FAQ' },
    { to: '/about', label: 'About' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {isDemoMode ? (
        <div className="bg-amber-50 text-amber-950 text-xs py-2.5 px-4 border-b border-amber-200 flex flex-wrap items-center justify-center gap-3 text-center">
          <span>
            <strong>DEMO PREVIEW MODE (Sample Data Only · Unauthenticated):</strong>{' '}
            Authentication and database writes are disabled until PostgreSQL is configured.
          </span>
          <Link to={portalPath} className="font-semibold underline text-[#0F2547] whitespace-nowrap">
            Return to Portal Preview
          </Link>
          <button
            type="button"
            onClick={exitDemoMode}
            className="px-2 py-0.5 rounded border border-amber-300 bg-white text-amber-950 font-medium hover:bg-amber-100 whitespace-nowrap"
          >
            Exit Preview
          </button>
        </div>
      ) : !postgresConfigured && !user ? (
        <div className="bg-[#0F2547] text-slate-100 text-xs py-2 px-4 text-center border-b border-blue-900">
          <strong>FRONTEND PREVIEW MODE (PostgreSQL Not Connected):</strong>{' '}
          Displaying sample BAUST catalog data.{' '}
          <Link to="/login" className="underline font-semibold text-teal-300 hover:text-teal-200">
            Open Demo Preview Launcher
          </Link>{' '}
          to inspect all Student, Staff, and Admin layouts.
        </div>
      ) : null}

      {/* Strict 3-zone top bar contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <Link
            to="/"
            className="font-display text-lg font-bold tracking-tight text-[#0F2547] whitespace-nowrap shrink-0"
          >
            BAUST SAMS
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            {navLinks.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#0F2547] ${
                    active ? 'text-[#0F2547] underline underline-offset-8 decoration-2 decoration-[#1D4ED8]' : ''
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to={portalPath}
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-[#0F2547] hover:bg-[#173463] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {user ? 'Open Portal' : 'Sign In'}
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2">
            {navLinks.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`block py-2 px-2 rounded-md text-sm font-medium ${
                    active ? 'bg-blue-50 text-[#0F2547] font-semibold' : 'text-slate-700 hover:text-[#0F2547]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              to={portalPath}
              onClick={() => setMobileOpen(false)}
              className="block w-full text-center py-2.5 mt-2 text-sm font-medium text-white bg-[#0F2547] rounded-lg"
            >
              {user ? 'Open Portal' : 'Sign In'}
            </Link>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-[#0F2547] text-slate-300 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <p className="font-display text-base font-bold text-white">
              Bangladesh Army University of Science and Technology (BAUST)
            </p>
            <p className="mt-2 text-sm text-slate-300 max-w-md leading-relaxed">
              Student Application Management System (SAMS) · Saidpur Cantonment, Nilphamari-5311, Bangladesh.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-white mb-3">Portal Directory</p>
            <ul className="space-y-2 text-sm">
              <li><Link to="/categories" className="hover:text-white transition-colors">Application Categories</Link></li>
              <li><Link to="/guidelines" className="hover:text-white transition-colors">Submission Guidelines</Link></li>
              <li><Link to="/faq" className="hover:text-white transition-colors">Frequently Asked Questions</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">About SAMS</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-white mb-1">Helpdesk (Sample Directory)</p>
            <p className="text-[11px] text-amber-200/90 mb-2">DEMO DATA — Not official BAUST contact info</p>
            <ul className="space-y-2 text-sm">
              <li>registrar@baust.edu.bd</li>
              <li className="font-mono tabular-nums">+880-5526-73405</li>
              <li>Sun – Thu · 08:30 AM – 04:00 PM</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 py-4 px-4 sm:px-6 max-w-7xl mx-auto flex flex-col sm:flex-row justify-between gap-2 text-xs text-slate-400">
          <span>© {new Date().getFullYear()} BAUST Student Application Management System</span>
          <span>Academic &amp; Administrative Services Portal</span>
        </div>
      </footer>
    </div>
  );
}
