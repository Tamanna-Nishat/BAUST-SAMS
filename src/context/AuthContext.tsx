import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type {
  Application,
  ApplicationCategory,
  AuditLog,
  FaqItem,
  Guideline,
  NotificationItem,
  Office,
  Question,
  SystemSettings,
  User,
} from '../types/sams';
import { apiFetch } from '../utils/api';
import {
  SEED_CATEGORIES,
  SEED_FAQS,
  SEED_GUIDELINES,
  SEED_OFFICES,
  SEED_SETTINGS,
} from '../data/catalogSeed';
import {
  DEMO_ALL_USERS,
  DEMO_APPLICATIONS,
  DEMO_AUDIT_LOGS,
  DEMO_NOTIFICATIONS,
  DEMO_QUESTIONS,
  DEMO_USERS,
  type DemoPersonaKey,
} from '../data/demoData';

interface CatalogState {
  categories: ApplicationCategory[];
  guidelines: Guideline[];
  offices: Office[];
  faqs: FaqItem[];
  settings: SystemSettings;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isDemoMode: boolean;
  demoPersona: DemoPersonaKey | null;
  postgresConfigured: boolean;
  databaseConnected: boolean;
  databaseError: string | null;
  needsAdminSetup: boolean;
  allowNewRegistrations: boolean;
  catalog: CatalogState;
  refreshAuth: () => Promise<void>;
  refreshCatalog: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: {
    fullName: string;
    email: string;
    baustId: string;
    department: string;
    batchSemester: string;
    phone: string;
    password: string;
  }) => Promise<User>;
  setupAdmin: (payload: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  enterDemoMode: (persona: DemoPersonaKey) => void;
  exitDemoMode: () => void;
  // Read-only sample datasets for Demo Preview mode (no fake writes)
  demoApplications: Application[];
  demoQuestions: Question[];
  demoNotifications: NotificationItem[];
  demoUsers: User[];
  demoAuditLogs: AuditLog[];
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [postgresConfigured, setPostgresConfigured] = useState(false);
  const [databaseConnected, setDatabaseConnected] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const [needsAdminSetup, setNeedsAdminSetup] = useState(false);
  const [allowNewRegistrations, setAllowNewRegistrations] = useState(true);
  const [demoPersona, setDemoPersona] = useState<DemoPersonaKey | null>(null);

  // Initialize immediately with browser-safe catalog seed so frontend never requires DB credentials to render
  const [catalog, setCatalog] = useState<CatalogState>({
    categories: SEED_CATEGORIES,
    guidelines: SEED_GUIDELINES,
    offices: SEED_OFFICES,
    faqs: SEED_FAQS,
    settings: SEED_SETTINGS,
  });

  const refreshCatalog = useCallback(async () => {
    try {
      const data = await apiFetch<{
        categories: ApplicationCategory[];
        guidelines: Guideline[];
        offices: Office[];
        faqs: FaqItem[];
        settings: SystemSettings;
      }>('/api/public/overview');
      if (data.categories?.length) {
        setCatalog(data);
      }
    } catch {
      // Keep local seed catalog cleanly in frontend preview mode
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const data = await apiFetch<{
        user: User | null;
        needsAdminSetup: boolean;
        allowNewRegistrations: boolean;
        postgresConfigured?: boolean;
        databaseConnected?: boolean;
        databaseError?: string | null;
      }>('/api/auth/me');
      setUser(data.user);
      setNeedsAdminSetup(Boolean(data.needsAdminSetup));
      setAllowNewRegistrations(Boolean(data.allowNewRegistrations));
      setPostgresConfigured(Boolean(data.postgresConfigured));
      setDatabaseConnected(Boolean(data.databaseConnected));
      setDatabaseError(data.databaseError ?? null);
      if (data.user) {
        setDemoPersona(null);
      }
    } catch {
      // Backend optional for frontend-only Demo Preview
      setPostgresConfigured(false);
      setDatabaseConnected(false);
      setDatabaseError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAuth();
    void refreshCatalog();
  }, [refreshAuth, refreshCatalog]);

  const login = async (email: string, password: string) => {
    const res = await apiFetch<{ user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setDemoPersona(null);
    setUser(res.user);
    return res.user;
  };

  const register = async (payload: {
    fullName: string;
    email: string;
    baustId: string;
    department: string;
    batchSemester: string;
    phone: string;
    password: string;
  }) => {
    const res = await apiFetch<{ user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setDemoPersona(null);
    setUser(res.user);
    return res.user;
  };

  const setupAdmin = async (payload: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
  }) => {
    const res = await apiFetch<{ user: User }>('/api/auth/setup-admin', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setDemoPersona(null);
    setUser(res.user);
    setNeedsAdminSetup(false);
    return res.user;
  };

  const logout = async () => {
    if (demoPersona) {
      setDemoPersona(null);
      return;
    }
    await apiFetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  const enterDemoMode = (persona: DemoPersonaKey) => {
    setDemoPersona(persona);
  };

  const exitDemoMode = () => {
    setDemoPersona(null);
  };

  const activeUser = user ?? (demoPersona ? DEMO_USERS[demoPersona] : null);
  const isDemoMode = !user && demoPersona !== null;

  return (
    <AuthContext.Provider
      value={{
        user: activeUser,
        loading,
        isDemoMode,
        demoPersona,
        postgresConfigured,
        databaseConnected,
        databaseError,
        needsAdminSetup,
        allowNewRegistrations,
        catalog,
        refreshAuth,
        refreshCatalog,
        login,
        register,
        setupAdmin,
        logout,
        enterDemoMode,
        exitDemoMode,
        demoApplications: DEMO_APPLICATIONS,
        demoQuestions: DEMO_QUESTIONS,
        demoNotifications: DEMO_NOTIFICATIONS,
        demoUsers: DEMO_ALL_USERS,
        demoAuditLogs: DEMO_AUDIT_LOGS,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
