import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import type { UserRole } from './types/sams';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { AboutPage } from './pages/public/AboutPage';
import { CategoriesPage } from './pages/public/CategoriesPage';
import { GuidelinesPage } from './pages/public/GuidelinesPage';
import { FaqPage } from './pages/public/FaqPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentProfilePage } from './pages/student/StudentProfilePage';
import { BrowseApplicationsPage } from './pages/student/BrowseApplicationsPage';
import { CategoryDetailPage } from './pages/student/CategoryDetailPage';
import { ApplicationFormPage } from './pages/student/ApplicationFormPage';
import { StudentApplicationsPage } from './pages/student/StudentApplicationsPage';
import { StudentApplicationDetailPage } from './pages/student/StudentApplicationDetailPage';
import { AskQuestionPage } from './pages/student/AskQuestionPage';
import { StudentQuestionsPage } from './pages/student/StudentQuestionsPage';
import { StudentNotificationsPage } from './pages/student/StudentNotificationsPage';

// Staff Pages
import { StaffDashboard } from './pages/staff/StaffDashboard';
import { StaffApplicationsPage } from './pages/staff/StaffApplicationsPage';
import { StaffApplicationDetailPage } from './pages/staff/StaffApplicationDetailPage';
import { StaffQuestionsPage } from './pages/staff/StaffQuestionsPage';
import { StaffNotificationsPage } from './pages/staff/StaffNotificationsPage';
import { StaffGuidelinesPage } from './pages/staff/StaffGuidelinesPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminApplicationsPage } from './pages/admin/AdminApplicationsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminOfficesPage } from './pages/admin/AdminOfficesPage';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage';
import { AdminGuidelinesPage } from './pages/admin/AdminGuidelinesPage';
import { AdminFaqsPage } from './pages/admin/AdminFaqsPage';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';

function RequireRole({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-600">
        Loading BAUST SAMS...
      </div>
    );
  }
  if (!user) {
    const target = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(target)}`} replace />;
  }
  if (!roles.includes(user.role)) {
    const home =
      user.role === 'admin'
        ? '/admin/dashboard'
        : user.role === 'staff'
        ? '/staff/dashboard'
        : '/student/dashboard';
    return <Navigate to={home} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/guidelines" element={<GuidelinesPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Student Portal Routes */}
          <Route
            path="/student/dashboard"
            element={
              <RequireRole roles={['student']}>
                <StudentDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/student/profile"
            element={
              <RequireRole roles={['student']}>
                <StudentProfilePage />
              </RequireRole>
            }
          />
          <Route
            path="/student/browse"
            element={
              <RequireRole roles={['student']}>
                <BrowseApplicationsPage />
              </RequireRole>
            }
          />
          <Route
            path="/student/categories/:id"
            element={
              <RequireRole roles={['student']}>
                <CategoryDetailPage />
              </RequireRole>
            }
          />
          <Route
            path="/student/apply"
            element={
              <RequireRole roles={['student']}>
                <ApplicationFormPage />
              </RequireRole>
            }
          />
          <Route
            path="/student/apply/:categoryId"
            element={
              <RequireRole roles={['student']}>
                <ApplicationFormPage />
              </RequireRole>
            }
          />
          <Route
            path="/student/drafts"
            element={
              <RequireRole roles={['student']}>
                <StudentApplicationsPage draftsOnly />
              </RequireRole>
            }
          />
          <Route
            path="/student/drafts/:draftId/edit"
            element={
              <RequireRole roles={['student']}>
                <ApplicationFormPage />
              </RequireRole>
            }
          />
          <Route
            path="/student/applications"
            element={
              <RequireRole roles={['student']}>
                <StudentApplicationsPage />
              </RequireRole>
            }
          />
          <Route
            path="/student/applications/:id"
            element={
              <RequireRole roles={['student']}>
                <StudentApplicationDetailPage />
              </RequireRole>
            }
          />
          <Route
            path="/student/ask"
            element={
              <RequireRole roles={['student']}>
                <AskQuestionPage />
              </RequireRole>
            }
          />
          <Route
            path="/student/questions"
            element={
              <RequireRole roles={['student']}>
                <StudentQuestionsPage />
              </RequireRole>
            }
          />
          <Route
            path="/student/notifications"
            element={
              <RequireRole roles={['student']}>
                <StudentNotificationsPage />
              </RequireRole>
            }
          />

          {/* Staff Portal Routes */}
          <Route
            path="/staff/dashboard"
            element={
              <RequireRole roles={['staff', 'admin']}>
                <StaffDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/staff/applications"
            element={
              <RequireRole roles={['staff', 'admin']}>
                <StaffApplicationsPage />
              </RequireRole>
            }
          />
          <Route
            path="/staff/applications/:id"
            element={
              <RequireRole roles={['staff', 'admin']}>
                <StaffApplicationDetailPage />
              </RequireRole>
            }
          />
          <Route
            path="/staff/questions"
            element={
              <RequireRole roles={['staff', 'admin']}>
                <StaffQuestionsPage />
              </RequireRole>
            }
          />
          <Route
            path="/staff/notifications"
            element={
              <RequireRole roles={['staff', 'admin']}>
                <StaffNotificationsPage />
              </RequireRole>
            }
          />
          <Route
            path="/staff/guidelines"
            element={
              <RequireRole roles={['staff', 'admin']}>
                <StaffGuidelinesPage />
              </RequireRole>
            }
          />

          {/* Administrator Portal Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <RequireRole roles={['admin']}>
                <AdminDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/admin/applications"
            element={
              <RequireRole roles={['admin']}>
                <AdminApplicationsPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/applications/:id"
            element={
              <RequireRole roles={['admin']}>
                <StaffApplicationDetailPage portalMode="admin" />
              </RequireRole>
            }
          />
          <Route
            path="/admin/users"
            element={
              <RequireRole roles={['admin']}>
                <AdminUsersPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/offices"
            element={
              <RequireRole roles={['admin']}>
                <AdminOfficesPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <RequireRole roles={['admin']}>
                <AdminCategoriesPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/guidelines"
            element={
              <RequireRole roles={['admin']}>
                <AdminGuidelinesPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/faqs"
            element={
              <RequireRole roles={['admin']}>
                <AdminFaqsPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <RequireRole roles={['admin']}>
                <AdminAuditLogsPage />
              </RequireRole>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <RequireRole roles={['admin']}>
                <AdminReportsPage />
              </RequireRole>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
