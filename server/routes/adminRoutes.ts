import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { Router } from 'express';
import { z } from 'zod';
import { getStore } from '../db/store.ts';
import { isDatabaseConnectionError } from '../db/pool.ts';
import { hasStaffPermission, requireAuth, requireRole, type AuthRequest } from '../middleware/auth.ts';
import type { StaffPermissions } from '../../src/types/sams.ts';

const router = Router();

const permissionsSchema = z.object({
  can_review: z.boolean(),
  can_forward: z.boolean(),
  can_request_info: z.boolean(),
  can_approve: z.boolean(),
  can_reject: z.boolean(),
  can_answer_questions: z.boolean(),
  can_manage_guidelines: z.boolean(),
  can_access_medical: z.boolean(),
});

const createUserSchema = z.object({
  fullName: z.string().trim().min(3).max(100),
  email: z.string().trim().email().max(150),
  password: z.string().min(8).max(128),
  role: z.enum(['student', 'staff', 'admin']),
  baustId: z.string().trim().optional(),
  department: z.string().trim().optional(),
  batchSemester: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  officeId: z.string().optional(),
  designation: z.string().trim().optional(),
  permissions: permissionsSchema,
});

const updateUserSchema = z.object({
  role: z.enum(['student', 'staff', 'admin']).optional(),
  officeId: z.string().nullable().optional(),
  designation: z.string().trim().optional(),
  permissions: permissionsSchema.optional(),
  isActive: z.boolean().optional(),
});

const officeSchema = z.object({
  id: z.string().optional(),
  code: z.string().trim().min(2).max(15),
  name: z.string().trim().min(3).max(120),
  buildingLocation: z.string().trim().min(3).max(160),
  email: z.string().trim().email(),
  phone: z.string().trim().min(5).max(40),
  headTitle: z.string().trim().min(2).max(100),
  description: z.string().trim().min(5).max(500),
  isActive: z.boolean().default(true),
});

const categorySchema = z.object({
  id: z.string().optional(),
  slug: z.string().trim().min(3).max(120),
  code: z.string().trim().min(2).max(20),
  name: z.string().trim().min(3).max(160),
  shortDescription: z.string().trim().min(5).max(400),
  defaultOfficeId: z.string().min(1),
  feeBdt: z.number().int().min(0).max(100000),
  processingDays: z.number().int().min(1).max(180),
  deadlineText: z.string().trim().min(3).max(200),
  eligibility: z.string().trim().min(3).max(600),
  submissionInstructions: z.string().trim().min(3).max(1000),
  isActive: z.boolean().default(true),
  dynamicFields: z.array(
    z.object({
      key: z.string().min(1),
      label: z.string().min(1),
      type: z.enum(['text', 'textarea', 'select', 'date', 'number']),
      required: z.boolean(),
      placeholder: z.string().optional(),
      options: z.array(z.string()).optional(),
    })
  ),
  requiredDocuments: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      description: z.string().min(1),
      allowedTypes: z.array(z.enum(['PDF', 'JPG', 'PNG'])).min(1),
      maxSizeMb: z.number().int().min(1).max(20),
      isRequired: z.boolean(),
      isMedicalSensitive: z.boolean(),
    })
  ),
});

const guidelineSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1),
  title: z.string().trim().min(3).max(200),
  summary: z.string().trim().min(5).max(500),
  eligibilityDetails: z.string().trim().min(5).max(1000),
  submissionSteps: z.array(z.string().trim().min(3)).min(1),
  deadlineNote: z.string().trim().min(2).max(200),
  feeNote: z.string().trim().min(2).max(200),
  contactOfficeId: z.string().min(1),
  contactEmail: z.string().trim().email(),
  contactPhone: z.string().trim().min(5).max(40),
});

const faqSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().optional(),
  question: z.string().trim().min(5).max(400),
  answer: z.string().trim().min(5).max(2000),
  isPublished: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(999).default(10),
});

const settingsSchema = z.object({
  universityName: z.string().trim().min(3).max(160),
  shortName: z.string().trim().min(2).max(40),
  campusLocation: z.string().trim().min(3).max(160),
  academicSemester: z.string().trim().min(3).max(60),
  supportEmail: z.string().trim().email(),
  supportPhone: z.string().trim().min(5).max(40),
  maxUploadSizeMb: z.number().int().min(1).max(20),
  allowNewRegistrations: z.boolean(),
});

// Staff with guideline permission OR Admins can manage guidelines
router.post('/guidelines', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    if (!hasStaffPermission(user, 'can_manage_guidelines')) {
      res.status(403).json({ error: 'Not authorized to manage guidelines.' });
      return;
    }

    const parsed = guidelineSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid guideline data.' });
      return;
    }

    const store = getStore();
    const cat = await store.getCategoryById(parsed.data.categoryId);
    const office = await store.getOfficeById(parsed.data.contactOfficeId);
    if (!cat || !office) {
      res.status(404).json({ error: 'Category or office not found.' });
      return;
    }

    const saved = await store.upsertGuideline({
      id: parsed.data.id || `guide-${crypto.randomUUID()}`,
      categoryId: cat.id,
      categoryName: cat.name,
      title: parsed.data.title,
      summary: parsed.data.summary,
      eligibilityDetails: parsed.data.eligibilityDetails,
      submissionSteps: parsed.data.submissionSteps,
      deadlineNote: parsed.data.deadlineNote,
      feeNote: parsed.data.feeNote,
      contactOfficeId: office.id,
      contactOfficeName: office.name,
      contactEmail: parsed.data.contactEmail,
      contactPhone: parsed.data.contactPhone,
      updatedAt: new Date().toISOString(),
      updatedByName: user.fullName,
    });

    await store.addAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'GUIDELINE_SAVED',
      targetType: 'guideline',
      targetId: saved.id,
      details: saved.title,
    });

    res.json({ guideline: saved });
  } catch (err) {
    console.error('Save guideline failed:', err);
    res.status(500).json({ error: 'Failed to save guideline.' });
  }
});

// Admin-only routes below
router.use(requireAuth, requireRole('admin'));

router.get('/overview', async (_req, res) => {
  try {
    const store = getStore();
    const [users, offices, categories, applications, questions, auditLogs, settings] = await Promise.all([
      store.listUsers(),
      store.listOffices(),
      store.listCategories(),
      store.listApplications(),
      store.listQuestions(),
      store.listAuditLogs(50),
      store.getSettings(),
    ]);

    res.json({
      users,
      offices,
      categories,
      applications,
      questions,
      auditLogs,
      settings,
    });
  } catch (err) {
    console.error('Admin overview failed:', err);
    res.status(500).json({ error: 'Failed to load admin overview.' });
  }
});

router.get('/users', async (_req, res) => {
  try {
    const users = await getStore().listUsers();
    res.json({ users });
  } catch (err) {
    console.error('List users failed:', err);
    res.status(isDatabaseConnectionError(err) ? 503 : 500).json({ error: 'Failed to list users.' });
  }
});

router.post('/users', async (req: AuthRequest, res) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid user payload.' });
      return;
    }
    const store = getStore();
    if (await store.getUserByEmail(parsed.data.email)) {
      res.status(409).json({ error: 'Email is already registered.' });
      return;
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const created = await store.createUser({
      id: `usr-${crypto.randomUUID()}`,
      fullName: parsed.data.fullName,
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      role: parsed.data.role,
      baustId: parsed.data.baustId,
      department: parsed.data.department,
      batchSemester: parsed.data.batchSemester,
      phone: parsed.data.phone,
      officeId: parsed.data.officeId,
      designation: parsed.data.designation,
      permissions: parsed.data.permissions as StaffPermissions,
      isActive: true,
    });

    await store.addAuditLog({
      actorId: req.authUser!.id,
      actorName: req.authUser!.fullName,
      actorRole: 'admin',
      action: 'USER_CREATED',
      targetType: 'user',
      targetId: created.id,
      details: `Created ${created.role} account for ${created.email}`,
    });

    res.status(201).json({ user: created });
  } catch (err) {
    console.error('Create user failed:', err);
    res.status(isDatabaseConnectionError(err) ? 503 : 500).json({ error: 'Failed to create user.' });
  }
});

router.patch('/users/:id', async (req: AuthRequest, res) => {
  try {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid update payload.' });
      return;
    }

    const targetId = String(req.params.id);
    if (targetId === req.authUser!.id && parsed.data.isActive === false) {
      res.status(400).json({ error: 'You cannot deactivate your own active administrator account.' });
      return;
    }

    const store = getStore();
    const updated = await store.updateUser(targetId, {
      role: parsed.data.role,
      officeId: parsed.data.officeId === null ? undefined : parsed.data.officeId,
      designation: parsed.data.designation,
      permissions: parsed.data.permissions,
      isActive: parsed.data.isActive,
    });

    if (!updated) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    await store.addAuditLog({
      actorId: req.authUser!.id,
      actorName: req.authUser!.fullName,
      actorRole: 'admin',
      action: 'USER_UPDATED',
      targetType: 'user',
      targetId: updated.id,
      details: `Updated role/permissions for ${updated.email} (${updated.role})`,
    });

    res.json({ user: updated });
  } catch (err) {
    console.error('Update user failed:', err);
    res.status(isDatabaseConnectionError(err) ? 503 : 500).json({ error: 'Failed to update user.' });
  }
});

router.get('/offices', async (_req, res) => {
  try {
    res.json({ offices: await getStore().listOffices() });
  } catch (err) {
    console.error('List offices failed:', err);
    res.status(isDatabaseConnectionError(err) ? 503 : 500).json({ error: 'Failed to list offices.' });
  }
});

router.post('/offices', async (req: AuthRequest, res) => {
  try {
    const parsed = officeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid office data.' });
      return;
    }
    const office = await getStore().upsertOffice({
      ...parsed.data,
      id: parsed.data.id || `off-${crypto.randomUUID()}`,
    });
    await getStore().addAuditLog({
      actorId: req.authUser!.id,
      actorName: req.authUser!.fullName,
      actorRole: 'admin',
      action: 'OFFICE_SAVED',
      targetType: 'office',
      targetId: office.id,
      details: `${office.code} - ${office.name}`,
    });
    res.json({ office });
  } catch (err) {
    console.error('Save office failed:', err);
    res.status(isDatabaseConnectionError(err) ? 503 : 500).json({ error: 'Failed to save office.' });
  }
});

router.delete('/offices/:id', async (req: AuthRequest, res) => {
  try {
    const ok = await getStore().deleteOffice(String(req.params.id));
    if (!ok) {
      res.status(404).json({ error: 'Office not found.' });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete office failed:', err);
    if ((err as { code?: string })?.code === '23503') {
      res.status(409).json({
        error:
          'Cannot delete this office because categories, staff accounts, or applications are currently linked to it. Edit and mark it inactive instead.',
      });
      return;
    }
    res.status(isDatabaseConnectionError(err) ? 503 : 500).json({ error: 'Failed to delete office.' });
  }
});

router.get('/categories', async (_req, res) => {
  try {
    res.json({ categories: await getStore().listCategories() });
  } catch (err) {
    console.error('List categories failed:', err);
    res.status(isDatabaseConnectionError(err) ? 503 : 500).json({ error: 'Failed to list categories.' });
  }
});

router.post('/categories', async (req: AuthRequest, res) => {
  try {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid category payload.' });
      return;
    }
    const office = await getStore().getOfficeById(parsed.data.defaultOfficeId);
    if (!office) {
      res.status(404).json({ error: 'Default office not found.' });
      return;
    }

    const saved = await getStore().upsertCategory({
      ...parsed.data,
      id: parsed.data.id || `cat-${crypto.randomUUID()}`,
      defaultOfficeName: office.name,
    });

    await getStore().addAuditLog({
      actorId: req.authUser!.id,
      actorName: req.authUser!.fullName,
      actorRole: 'admin',
      action: 'CATEGORY_SAVED',
      targetType: 'category',
      targetId: saved.id,
      details: saved.name,
    });

    res.json({ category: saved });
  } catch (err) {
    console.error('Save category failed:', err);
    res.status(isDatabaseConnectionError(err) ? 503 : 500).json({ error: 'Failed to save category.' });
  }
});

router.get('/faqs', async (_req, res) => {
  try {
    res.json({ faqs: await getStore().listFaqs(false) });
  } catch (err) {
    console.error('List FAQs failed:', err);
    res.status(isDatabaseConnectionError(err) ? 503 : 500).json({ error: 'Failed to list FAQs.' });
  }
});

router.post('/faqs', async (req: AuthRequest, res) => {
  try {
    const parsed = faqSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid FAQ payload.' });
      return;
    }
    const cat = parsed.data.categoryId ? await getStore().getCategoryById(parsed.data.categoryId) : null;
    const saved = await getStore().upsertFaq({
      id: parsed.data.id || `faq-${crypto.randomUUID()}`,
      categoryId: parsed.data.categoryId || undefined,
      categoryName: cat?.name ?? 'General System',
      question: parsed.data.question,
      answer: parsed.data.answer,
      isPublished: parsed.data.isPublished,
      sortOrder: parsed.data.sortOrder,
    });
    res.json({ faq: saved });
  } catch (err) {
    console.error('Save FAQ failed:', err);
    res.status(isDatabaseConnectionError(err) ? 503 : 500).json({ error: 'Failed to save FAQ.' });
  }
});

router.delete('/faqs/:id', async (req, res) => {
  try {
    const ok = await getStore().deleteFaq(String(req.params.id));
    if (!ok) {
      res.status(404).json({ error: 'FAQ not found.' });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete FAQ failed:', err);
    res.status(isDatabaseConnectionError(err) ? 503 : 500).json({ error: 'Failed to delete FAQ.' });
  }
});

router.get('/audit-logs', async (_req, res) => {
  try {
    res.json({ auditLogs: await getStore().listAuditLogs(250) });
  } catch (err) {
    console.error('List audit logs failed:', err);
    res.status(isDatabaseConnectionError(err) ? 503 : 500).json({ error: 'Failed to load audit logs.' });
  }
});

router.get('/settings', async (_req, res) => {
  try {
    res.json({ settings: await getStore().getSettings() });
  } catch (err) {
    console.error('Get settings failed:', err);
    res.status(isDatabaseConnectionError(err) ? 503 : 500).json({ error: 'Failed to load settings.' });
  }
});

router.patch('/settings', async (req: AuthRequest, res) => {
  try {
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid settings.' });
      return;
    }
    const updated = await getStore().updateSettings(parsed.data);
    await getStore().addAuditLog({
      actorId: req.authUser!.id,
      actorName: req.authUser!.fullName,
      actorRole: 'admin',
      action: 'SETTINGS_UPDATED',
      targetType: 'settings',
      targetId: '1',
      details: `Academic Semester: ${updated.academicSemester}`,
    });
    res.json({ settings: updated });
  } catch (err) {
    console.error('Update settings failed:', err);
    res.status(isDatabaseConnectionError(err) ? 503 : 500).json({ error: 'Failed to update settings.' });
  }
});

router.get('/reports/export', async (_req, res) => {
  try {
    const apps = await getStore().listApplications();
    const headers = [
      'Application ID',
      'Student Name',
      'BAUST ID',
      'Department',
      'Category',
      'Assigned Office',
      'Status',
      'Submitted At',
      'Updated At',
    ];
    const escapeCsv = (val: string) => {
      const safe = /^[=+\-@\t\r]/.test(val) ? `'${val}` : val;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const rows = apps.map((a) =>
      [
        a.applicationCode,
        a.studentName,
        a.studentBaustId,
        a.studentDepartment,
        a.categoryName,
        a.assignedOfficeName,
        a.status,
        a.submittedAt ?? '',
        a.updatedAt,
      ]
        .map(escapeCsv)
        .join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="baust-sams-applications-report.csv"');
    res.send(csv);
  } catch (err) {
    console.error('Export report failed:', err);
    res.status(isDatabaseConnectionError(err) ? 503 : 500).json({ error: 'Failed to generate CSV report.' });
  }
});

export default router;
