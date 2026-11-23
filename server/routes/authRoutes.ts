import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { Router } from 'express';
import { z } from 'zod';
import { getStore } from '../db/store.ts';
import { getPostgresConfigStatus, isDatabaseConnectionError, isPostgresConfigured } from '../db/pool.ts';
import {
  clearSessionCookie,
  createSessionToken,
  requireAuth,
  setSessionCookie,
  type AuthRequest,
} from '../middleware/auth.ts';
import { DEFAULT_STUDENT_PERMISSIONS, type StaffPermissions } from '../../src/types/sams.ts';

const router = Router();

const ADMIN_PERMISSIONS: StaffPermissions = {
  can_review: true,
  can_forward: true,
  can_request_info: true,
  can_approve: true,
  can_reject: true,
  can_answer_questions: true,
  can_manage_guidelines: true,
  can_access_medical: true,
};

const setupAdminSchema = z.object({
  fullName: z.string().trim().min(3).max(100),
  email: z.string().trim().email().max(150),
  phone: z.string().trim().max(30).optional(),
  password: z.string().min(8).max(128),
});

const registerSchema = z.object({
  fullName: z.string().trim().min(3).max(100),
  email: z.string().trim().email().max(150),
  baustId: z.string().trim().min(4).max(30),
  department: z.string().trim().min(2).max(80),
  batchSemester: z.string().trim().min(2).max(50),
  phone: z.string().trim().min(6).max(30),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(3).max(100),
  phone: z.string().trim().max(30).optional(),
  department: z.string().trim().max(80).optional(),
  batchSemester: z.string().trim().max(50).optional(),
});

router.get('/me', async (req: AuthRequest, res) => {
  const pgStatus = getPostgresConfigStatus();
  if (!pgStatus.configured) {
    res.json({
      user: null,
      needsAdminSetup: false,
      allowNewRegistrations: true,
      postgresConfigured: false,
      databaseConnected: false,
      databaseError: pgStatus.errorMessage,
    });
    return;
  }

  try {
    const store = getStore();
    const needsAdminSetup = !(await store.hasAdmin());
    const settings = await store.getSettings();
    res.json({
      user: req.authUser ?? null,
      needsAdminSetup,
      allowNewRegistrations: settings.allowNewRegistrations,
      postgresConfigured: true,
      databaseConnected: true,
      databaseError: null,
    });
  } catch (err) {
    console.error('Auth /me error:', err);
    if (isDatabaseConnectionError(err)) {
      res.json({
        user: null,
        needsAdminSetup: false,
        allowNewRegistrations: false,
        postgresConfigured: true,
        databaseConnected: false,
        databaseError: 'PostgreSQL is configured but the database connection failed. Check server status and migrations.',
      });
      return;
    }
    res.status(500).json({ error: 'Unable to check authentication status.' });
  }
});

router.post('/setup-admin', async (req, res) => {
  try {
    if (!isPostgresConfigured()) {
      res.status(503).json({
        error: 'PostgreSQL is not configured on this server. Administrator setup requires a PostgreSQL database.',
      });
      return;
    }
    const store = getStore();
    if (await store.hasAdmin()) {
      res.status(409).json({ error: 'Initial administrator account has already been configured.' });
      return;
    }

    const parsed = setupAdminSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input.' });
      return;
    }

    const existing = await store.getUserByEmail(parsed.data.email);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const adminUser = await store.createUser({
      id: `usr-${crypto.randomUUID()}`,
      fullName: parsed.data.fullName,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      role: 'admin',
      phone: parsed.data.phone,
      designation: 'System Administrator',
      officeId: 'off-reg',
      permissions: ADMIN_PERMISSIONS,
      isActive: true,
    });

    await store.addAuditLog({
      actorId: adminUser.id,
      actorName: adminUser.fullName,
      actorRole: 'admin',
      action: 'ADMIN_BOOTSTRAP',
      targetType: 'user',
      targetId: adminUser.id,
      details: 'Initial system administrator account claimed and configured.',
    });

    const token = createSessionToken(adminUser.id);
    setSessionCookie(res, token);
    res.status(201).json({ user: adminUser });
  } catch (err) {
    console.error('Setup admin failed:', err);
    if (isDatabaseConnectionError(err)) {
      res.status(503).json({ error: 'PostgreSQL database connection unavailable.' });
      return;
    }
    res.status(500).json({ error: 'Failed to configure administrator account.' });
  }
});

router.post('/register', async (req, res) => {
  try {
    if (!isPostgresConfigured()) {
      res.status(503).json({
        error: 'PostgreSQL is not configured on this server. Live student registration is disabled without PostgreSQL.',
      });
      return;
    }
    const store = getStore();
    const settings = await store.getSettings();
    if (!settings.allowNewRegistrations) {
      res.status(403).json({ error: 'Student self-registration is currently disabled by the administrator.' });
      return;
    }

    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid registration data.' });
      return;
    }

    if (await store.getUserByEmail(parsed.data.email)) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    if (await store.getUserByBaustId(parsed.data.baustId)) {
      res.status(409).json({ error: 'This BAUST Student ID is already registered.' });
      return;
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const student = await store.createUser({
      id: `usr-${crypto.randomUUID()}`,
      fullName: parsed.data.fullName,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      role: 'student',
      baustId: parsed.data.baustId.toUpperCase(),
      department: parsed.data.department,
      batchSemester: parsed.data.batchSemester,
      phone: parsed.data.phone,
      permissions: DEFAULT_STUDENT_PERMISSIONS,
      isActive: true,
    });

    await store.addAuditLog({
      actorId: student.id,
      actorName: student.fullName,
      actorRole: 'student',
      action: 'STUDENT_REGISTERED',
      targetType: 'user',
      targetId: student.id,
      details: `Student registered with BAUST ID ${student.baustId}.`,
    });

    const token = createSessionToken(student.id);
    setSessionCookie(res, token);
    res.status(201).json({ user: student });
  } catch (err) {
    console.error('Register failed:', err);
    if (isDatabaseConnectionError(err)) {
      res.status(503).json({ error: 'PostgreSQL database connection unavailable.' });
      return;
    }
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    if (!isPostgresConfigured()) {
      res.status(503).json({
        error: 'PostgreSQL is not configured on this server. Live authentication is disabled; use Demo Preview Mode instead.',
      });
      return;
    }
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Valid email and password are required.' });
      return;
    }

    const store = getStore();
    const user = await store.getUserByEmail(parsed.data.email);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'This account has been deactivated. Contact BAUST Registrar Administration.' });
      return;
    }

    const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = createSessionToken(user.id);
    setSessionCookie(res, token);

    await store.addAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'USER_LOGIN',
      targetType: 'user',
      targetId: user.id,
      details: `Authenticated session initiated for ${user.role}.`,
    });

    const { passwordHash: _omit, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    console.error('Login failed:', err);
    if (isDatabaseConnectionError(err)) {
      res.status(503).json({ error: 'PostgreSQL database connection unavailable.' });
      return;
    }
    res.status(500).json({ error: 'Authentication failed.' });
  }
});

router.post('/logout', (req: AuthRequest, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.patch('/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const parsed = profileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid profile update.' });
      return;
    }

    const store = getStore();
    const updated = await store.updateUser(req.authUser!.id, {
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      department: parsed.data.department,
      batchSemester: parsed.data.batchSemester,
    });

    if (!updated) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }

    res.json({ user: updated });
  } catch (err) {
    console.error('Profile update failed:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

export default router;
