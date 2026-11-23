import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CheckSquare,
  Compass,
  FileCheck2,
  FilePlus2,
  FileText,
  FolderCog,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  ShieldCheck,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { DemoPersonaKey } from '../data/demoData';
import type { NotificationItem } from '../types/sams';
import { apiFetch } from '../utils/api';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  hidden?: boolean;
}

export function PortalLayout({
  title,
  breadcrumb,
  children,
}: {
  title: string;
  breadcrumb: string;
  children: React.ReactNode;
}) {
  const { user, isDemoMode, demoPersona, enterDemoMode, logout, exitDemoMode, demoNotifications } =
    useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const [liveUnreadCount, setLiveUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || isDemoMode) {
      setLiveUnreadCount(0);
      return;
    }

    let cancelled = false;
    const loadUnread = () => {
      apiFetch<{ notifications: NotificationItem[] }>('/api/notifications')
        .then((res) => {
          if (!cancelled) {
            setLiveUnreadCount(res.notifications.filter((n) => !n.isRead).length);
          }
        })
        .catch(() => {});
    };

    loadUnread();
    const handler = () => loadUnread();
    window.addEventListener('baust-sams-notifications-updated', handler);
    return () => {
      cancelled = true;
      window.removeEventListener('baust-sams-notifications-updated', handler);
    };
  }, [user?.id, isDemoMode]);

  if (!user) return null;

  const studentNav: NavItem[] = [
    { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/student/browse', label: 'Browse Applications', icon: Compass },
    { to: '/student/apply', label: 'New Application', icon: FilePlus2 },
    { to: '/student/drafts', label: 'Draft Applications', icon: FileText },
    { to: '/student/applications', label: 'My Applications', icon: FileCheck2 },
    { to: '/student/ask', label: 'Ask a Question', icon: HelpCircle },
    { to: '/student/questions', label: 'My Questions', icon: MessageSquare },
    { to: '/student/notifications', label: 'Notifications', icon: Bell },
    { to: '/student/profile', label: 'My Profile', icon: UserCircle },
  ];

  const staffNav: NavItem[] = [
    { to: '/staff/dashboard', label: 'Staff Dashboard', icon: LayoutDashboard },
    { to: '/staff/applications', label: 'Assigned Applications', icon: CheckSquare },
    { to: '/staff/questions', label: 'Assigned Questions', icon: MessageSquare },
    { to: '/staff/notifications', label: 'Notifications', icon: Bell },
    {
      to: '/staff/guidelines',
      label: 'Guideline Management',
      icon: BookOpen,
      hidden: !user.permissions.can_manage_guidelines,
    },
  ];

  const adminNav: NavItem[] = [
    { to: '/admin/dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
    { to: '/admin/applications', label: 'Applications', icon: FileCheck2 },
    { to: '/admin/users', label: 'Users & Permissions', icon: Users },
    { to: '/admin/offices', label: 'Offices', icon: Building2 },
    { to: '/admin/categories', label: 'Categories & Docs', icon: FolderCog },
    { to: '/admin/guidelines', label: 'Guidelines', icon: BookOpen },
    { to: '/admin/faqs', label: 'FAQ Management', icon: HelpCircle },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: ShieldCheck },
    { to: '/admin/reports', label: 'Reports & Settings', icon: BarChart3 },
  ];

  const navItems = (
    user.role === 'admin' ? adminNav : user.role === 'staff' ? staffNav : studentNav
  ).filter((item) => !item.hidden);

  const unreadCount = isDemoMode
    ? demoNotifications.filter((n) => n.userId === user.id && !n.isRead).length
    : liveUnreadCount;

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const switchDemoRole = (persona: DemoPersonaKey, target: string) => {
    enterDemoMode(persona);
    navigate(target);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-[#0F2547] text-slate-200 shrink-0 border-r border-slate-800 no-print">
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80">
          <Link to="/" className="font-display text-base font-bold text-white tracking-tight whitespace-nowrap">
            BAUST SAMS
          </Link>
        </div>

        <div className="px-5 py-4 border-b border-slate-800/80">
          <p className="text-xs text-slate-400 capitalize">
            {isDemoMode ? `Demo Preview · ${user.role}` : `${user.role} Workspace`}
          </p>
          <p className="text-sm font-semibold text-white truncate mt-0.5">{user.fullName}</p>
          <p className="text-xs text-slate-300 truncate mt-0.5 font-mono">
            {user.role === 'student'
              ? user.baustId || 'Student'
              : user.officeName || user.designation || 'Administration'}
          </p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              location.pathname === item.to ||
              (item.to !== '/student/dashboard' &&
                item.to !== '/staff/dashboard' &&
                item.to !== '/admin/dashboard' &&
                location.pathname.startsWith(item.to + '/'));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#1D4ED8] text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {(item.to === '/student/notifications' || item.to === '/staff/notifications') &&
                  unreadCount > 0 && (
                    <span className="text-xs font-mono tabular-nums px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-200">
                      {unreadCount}
                    </span>
                  )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800/80 space-y-1">
          <Link
            to="/categories"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>Public Site &amp; Guidelines</span>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-rose-500/20 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>{isDemoMode ? 'Exit Demo Preview' : 'Sign Out'}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div className="fixed inset-0 bg-slate-900/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] bg-[#0F2547] text-slate-200 flex flex-col z-10">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800">
              <Link to="/" onClick={() => setSidebarOpen(false)} className="font-display font-bold text-white">
                BAUST SAMS
              </Link>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:bg-white/10"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-3.5 border-b border-slate-800/80">
              <p className="text-xs text-slate-400 capitalize">
                {isDemoMode ? `Demo Preview · ${user.role}` : `${user.role} Workspace`}
              </p>
              <p className="text-sm font-semibold text-white truncate mt-0.5">{user.fullName}</p>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active =
                  location.pathname === item.to ||
                  (item.to !== '/student/dashboard' &&
                    item.to !== '/staff/dashboard' &&
                    item.to !== '/admin/dashboard' &&
                    location.pathname.startsWith(item.to + '/'));
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium ${
                      active ? 'bg-[#1D4ED8] text-white' : 'text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {(item.to === '/student/notifications' || item.to === '/staff/notifications') &&
                      unreadCount > 0 && (
                        <span className="text-xs font-mono tabular-nums px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-200">
                          {unreadCount}
                        </span>
                      )}
                  </Link>
                );
              })}
            </nav>
            <div className="p-3 border-t border-slate-800 space-y-1">
              <Link
                to="/categories"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>Public Site &amp; Guidelines</span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-white/10"
              >
                <LogOut className="w-4 h-4" />
                <span>{isDemoMode ? 'Exit Demo Preview' : 'Sign Out'}</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {isDemoMode && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950 no-print">
            <div>
              <strong>DEMO PREVIEW MODE (Sample Data Only · Unauthenticated):</strong>{' '}
              Database writes and authentication are disabled until PostgreSQL is configured.
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-amber-900 mr-1">Switch View:</span>
              <button
                type="button"
                onClick={() => switchDemoRole('student', '/student/dashboard')}
                className={`px-2.5 py-1 rounded border font-medium whitespace-nowrap ${
                  demoPersona === 'student'
                    ? 'bg-[#0F2547] text-white border-[#0F2547]'
                    : 'bg-white text-amber-950 border-amber-300 hover:bg-amber-100'
                }`}
              >
                Student
              </button>
              <button
                type="button"
                onClick={() => switchDemoRole('staff_registrar', '/staff/dashboard')}
                className={`px-2.5 py-1 rounded border font-medium whitespace-nowrap ${
                  demoPersona === 'staff_registrar'
                    ? 'bg-[#0F2547] text-white border-[#0F2547]'
                    : 'bg-white text-amber-950 border-amber-300 hover:bg-amber-100'
                }`}
              >
                Registrar Staff
              </button>
              <button
                type="button"
                onClick={() => switchDemoRole('staff_medical', '/staff/dashboard')}
                className={`px-2.5 py-1 rounded border font-medium whitespace-nowrap ${
                  demoPersona === 'staff_medical'
                    ? 'bg-[#0F2547] text-white border-[#0F2547]'
                    : 'bg-white text-amber-950 border-amber-300 hover:bg-amber-100'
                }`}
              >
                Medical Officer
              </button>
              <button
                type="button"
                onClick={() => switchDemoRole('admin', '/admin/dashboard')}
                className={`px-2.5 py-1 rounded border font-medium whitespace-nowrap ${
                  demoPersona === 'admin'
                    ? 'bg-[#0F2547] text-white border-[#0F2547]'
                    : 'bg-white text-amber-950 border-amber-300 hover:bg-amber-100'
                }`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  exitDemoMode();
                  navigate('/login');
                }}
                className="px-2.5 py-1 rounded border border-amber-300 bg-white font-medium text-amber-900 hover:bg-amber-100 whitespace-nowrap"
              >
                Exit Preview
              </button>
            </div>
          </div>
        )}

        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 truncate">{breadcrumb}</p>
              <h1 className="font-display text-lg font-bold text-slate-900 truncate">{title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {user.role === 'student' && (
              <Link
                to="/student/apply"
                className="px-3.5 py-2 text-xs font-medium text-white bg-[#1D4ED8] hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap"
              >
                New Application
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
