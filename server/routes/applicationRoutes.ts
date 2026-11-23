import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import { z } from 'zod';
import { getStore } from '../db/store.ts';
import { hasStaffPermission, requireAuth, requireRole, type AuthRequest } from '../middleware/auth.ts';
import {
  ALLOWED_EXTENSIONS,
  documentUpload,
  resolveSafeUploadPath,
  validateUploadedFileMagicBytes,
} from '../middleware/upload.ts';
import type { Application, ApplicationStatus } from '../../src/types/sams.ts';

const router = Router();

const createAppSchema = z.object({
  categoryId: z.string().min(1),
  subject: z.string().trim().min(4).max(200),
  formData: z.record(z.string(), z.string()).default({}),
  remarks: z.string().trim().max(1000).default(''),
  submitNow: z.boolean().default(false),
});

const updateAppSchema = z.object({
  subject: z.string().trim().min(4).max(200).optional(),
  formData: z.record(z.string(), z.string()).optional(),
  remarks: z.string().trim().max(1000).optional(),
  action: z.enum(['save_draft', 'submit', 'resubmit_info']).default('save_draft'),
});

const staffTransitionSchema = z.object({
  newStatus: z.enum([
    'Under Review',
    'Awaiting Student Information',
    'Forwarded',
    'Pending Decision',
    'Approved',
    'Rejected',
    'Completed',
  ]),
  remarks: z.string().trim().min(3, 'Remarks are required for every status change.').max(1500),
  targetOfficeId: z.string().optional(),
  decisionSummary: z.string().trim().max(1000).optional(),
});

function sanitizeApplicationForViewer(app: Application, viewerRole: string, canAccessMedical: boolean): Application {
  if ((viewerRole === 'staff' || viewerRole === 'admin') && !canAccessMedical) {
    return {
      ...app,
      documents: app.documents.map((d) =>
        d.isMedicalSensitive
          ? {
              ...d,
              originalFilename: 'Confidential Medical Record (Restricted)',
              storedFilename: '',
            }
          : d
      ),
    };
  }
  return app;
}

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const store = getStore();
    const scope = String(req.query.scope ?? 'assigned');

    let apps: Application[] = [];
    if (user.role === 'student') {
      apps = await store.listApplications({ studentId: user.id });
    } else if (user.role === 'staff') {
      if (!user.officeId) {
        apps = [];
      } else if (scope === 'forwarded') {
        apps = await store.listApplications({ forwardedByOfficeId: user.officeId });
      } else {
        apps = await store.listApplications({ officeId: user.officeId });
      }
    } else {
      apps = await store.listApplications();
    }

    const canAccessMedical = user.role === 'student' || Boolean(user.permissions.can_access_medical);
    res.json({
      applications: apps.map((a) => sanitizeApplicationForViewer(a, user.role, canAccessMedical)),
    });
  } catch (err) {
    console.error('List applications failed:', err);
    res.status(500).json({ error: 'Failed to retrieve applications.' });
  }
});

router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const store = getStore();
    const app = await store.getApplicationById(String(req.params.id));

    if (!app) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }

    if (user.role === 'student' && app.studentId !== user.id) {
      res.status(403).json({ error: 'You are not authorized to view another student application.' });
      return;
    }

    if (user.role === 'staff') {
      const isAssignedOffice = Boolean(user.officeId && app.assignedOfficeId === user.officeId);
      const isForwardedByOffice = Boolean(
        user.officeId && (await store.hasOfficeForwardedApplication(app.id, user.officeId))
      );
      if (app.status === 'Draft' || (!isAssignedOffice && !isForwardedByOffice)) {
        res.status(403).json({ error: 'This application is not assigned to or forwarded by your office.' });
        return;
      }
    }

    const canAccessMedical = user.role === 'student' || Boolean(user.permissions.can_access_medical);
    res.json({ application: sanitizeApplicationForViewer(app, user.role, canAccessMedical) });
  } catch (err) {
    console.error('Get application detail failed:', err);
    res.status(500).json({ error: 'Failed to retrieve application details.' });
  }
});

router.post('/', requireAuth, requireRole('student'), async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const parsed = createAppSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid application payload.' });
      return;
    }

    const store = getStore();
    const category = await store.getCategoryById(parsed.data.categoryId);
    if (!category || !category.isActive) {
      res.status(404).json({ error: 'Selected application category is unavailable.' });
      return;
    }

    // Validate required dynamic fields when submitting immediately (note: if category requires documents, draft is created first so docs can be uploaded, then submitted via PATCH)
    if (parsed.data.submitNow) {
      for (const field of category.dynamicFields) {
        if (field.required && !parsed.data.formData[field.key]?.trim()) {
          res.status(400).json({ error: `Required field missing: ${field.label}` });
          return;
        }
      }
      const hasRequiredDocs = category.requiredDocuments.some((d) => d.isRequired);
      if (hasRequiredDocs) {
        res.status(400).json({
          error: 'Please save the application and upload all required supporting documents before final submission.',
        });
        return;
      }
    }

    const id = `app-${crypto.randomUUID()}`;
    const applicationCode = await store.nextApplicationCode(new Date().getFullYear());
    const initialStatus: ApplicationStatus = parsed.data.submitNow ? 'Submitted' : 'Draft';
    const now = new Date().toISOString();

    const created = await store.createApplication({
      id,
      applicationCode,
      studentId: user.id,
      categoryId: category.id,
      assignedOfficeId: category.defaultOfficeId,
      status: initialStatus,
      subject: parsed.data.subject,
      formData: parsed.data.formData,
      remarks: parsed.data.remarks,
      submittedAt: parsed.data.submitNow ? now : undefined,
      initialHistory: {
        id: `hist-${crypto.randomUUID()}`,
        applicationId: id,
        previousStatus: null,
        newStatus: initialStatus,
        actorId: user.id,
        actorName: user.fullName,
        actorRole: 'student',
        targetOfficeName: category.defaultOfficeName,
        remarks: parsed.data.submitNow
          ? 'Application submitted online by student.'
          : 'Application draft created by student.',
        createdAt: now,
      },
    });

    await store.addAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: 'student',
      action: parsed.data.submitNow ? 'APPLICATION_SUBMITTED' : 'APPLICATION_DRAFT_CREATED',
      targetType: 'application',
      targetId: created.applicationCode,
      details: `${category.name} (${initialStatus})`,
    });

    if (parsed.data.submitNow) {
      const officeStaff = await store.listUsersByOffice(category.defaultOfficeId);
      for (const staff of officeStaff) {
        await store.createNotification({
          userId: staff.id,
          title: `New Application ${created.applicationCode}`,
          message: `${user.fullName} (${user.baustId ?? 'Student'}) submitted ${category.name}.`,
          linkPath: `/staff/applications/${created.id}`,
        });
      }
    }

    res.status(201).json({ application: created });
  } catch (err) {
    console.error('Create application failed:', err);
    res.status(500).json({ error: 'Failed to create application.' });
  }
});

router.patch('/:id', requireAuth, requireRole('student'), async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const store = getStore();
    const app = await store.getApplicationById(String(req.params.id));

    if (!app) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }
    if (app.studentId !== user.id) {
      res.status(403).json({ error: 'You cannot modify another student application.' });
      return;
    }
    if (app.status !== 'Draft' && app.status !== 'Awaiting Student Information') {
      res.status(400).json({ error: `Cannot edit application while status is ${app.status}.` });
      return;
    }

    const parsed = updateAppSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid update payload.' });
      return;
    }

    const category = await store.getCategoryById(app.categoryId);
    const nextFormData = parsed.data.formData ?? app.formData;
    const nextSubject = parsed.data.subject ?? app.subject;
    const nextRemarks = parsed.data.remarks ?? app.remarks;

    let nextStatus: ApplicationStatus = app.status;
    let historyEntry = undefined;
    let submittedAt = app.submittedAt;

    if (parsed.data.action === 'submit' || parsed.data.action === 'resubmit_info') {
      if (category) {
        for (const field of category.dynamicFields) {
          if (field.required && !nextFormData[field.key]?.trim()) {
            res.status(400).json({ error: `Required field missing: ${field.label}` });
            return;
          }
        }
        for (const reqDoc of category.requiredDocuments) {
          if (reqDoc.isRequired) {
            const uploaded = app.documents.some((d) => d.docSpecId === reqDoc.id);
            if (!uploaded) {
              res.status(400).json({ error: `Required document missing: ${reqDoc.name}` });
              return;
            }
          }
        }
      }

      nextStatus = parsed.data.action === 'resubmit_info' ? 'Under Review' : 'Submitted';
      submittedAt = submittedAt ?? new Date().toISOString();
      historyEntry = {
        id: `hist-${crypto.randomUUID()}`,
        applicationId: app.id,
        previousStatus: app.status,
        newStatus: nextStatus,
        actorId: user.id,
        actorName: user.fullName,
        actorRole: 'student' as const,
        targetOfficeName: app.assignedOfficeName,
        remarks:
          parsed.data.action === 'resubmit_info'
            ? nextRemarks || 'Student provided requested additional information.'
            : 'Application finalized and submitted for review.',
        createdAt: new Date().toISOString(),
      };
    }

    const updated = await store.updateApplication(
      app.id,
      {
        subject: nextSubject,
        formData: nextFormData,
        remarks: nextRemarks,
        status: nextStatus,
        submittedAt,
      },
      historyEntry
    );

    if (historyEntry) {
      await store.addAuditLog({
        actorId: user.id,
        actorName: user.fullName,
        actorRole: 'student',
        action: parsed.data.action === 'resubmit_info' ? 'APPLICATION_INFO_PROVIDED' : 'APPLICATION_SUBMITTED',
        targetType: 'application',
        targetId: app.applicationCode,
        details: `Transitioned from ${app.status} to ${nextStatus}.`,
      });

      const officeStaff = await store.listUsersByOffice(app.assignedOfficeId);
      for (const staff of officeStaff) {
        await store.createNotification({
          userId: staff.id,
          title: `Application ${app.applicationCode} ${nextStatus}`,
          message: `${user.fullName} updated ${app.categoryName}.`,
          linkPath: `/staff/applications/${app.id}`,
        });
      }
    }

    res.json({ application: updated });
  } catch (err) {
    console.error('Update application failed:', err);
    res.status(500).json({ error: 'Failed to update application.' });
  }
});

router.delete('/:id', requireAuth, requireRole('student'), async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const store = getStore();
    const app = await store.getApplicationById(String(req.params.id));

    if (!app) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }
    if (app.studentId !== user.id) {
      res.status(403).json({ error: 'You are not authorized to discard another student application.' });
      return;
    }
    if (app.status !== 'Draft') {
      res.status(400).json({ error: 'Only Draft applications can be deleted. Use Withdraw for submitted applications.' });
      return;
    }

    for (const doc of app.documents) {
      const safePath = resolveSafeUploadPath(doc.storedFilename);
      if (safePath && fs.existsSync(safePath)) {
        fs.unlinkSync(safePath);
      }
    }

    const deleted = await store.deleteDraftApplication(app.id, user.id);
    if (!deleted) {
      res.status(404).json({ error: 'Draft application not found or already submitted.' });
      return;
    }

    await store.addAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: 'student',
      action: 'APPLICATION_DRAFT_DISCARDED',
      targetType: 'application',
      targetId: app.applicationCode,
      details: `Draft discarded (${app.subject}).`,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Delete draft failed:', err);
    res.status(500).json({ error: 'Failed to discard draft application.' });
  }
});

router.post(
  '/:id/documents',
  requireAuth,
  requireRole('student'),
  documentUpload.single('file'),
  async (req: AuthRequest, res) => {
    try {
      const user = req.authUser!;
      const store = getStore();
      const app = await store.getApplicationById(String(req.params.id));

      if (!app) {
        res.status(404).json({ error: 'Application not found.' });
        return;
      }
      if (app.studentId !== user.id) {
        res.status(403).json({ error: 'Not authorized to upload to this application.' });
        return;
      }
      if (app.status !== 'Draft' && app.status !== 'Awaiting Student Information') {
        res.status(400).json({ error: 'Documents can only be uploaded in Draft or Awaiting Student Information status.' });
        return;
      }
      if (!req.file || !req.file.buffer) {
        res.status(400).json({ error: 'Please attach a valid PDF, JPG, or PNG file.' });
        return;
      }
      if (!validateUploadedFileMagicBytes(req.file.buffer, req.file.mimetype)) {
        res.status(400).json({ error: 'Uploaded file contents do not match a valid PDF, JPG, or PNG document.' });
        return;
      }

      const ext = path.extname(req.file.originalname).toLowerCase();
      const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.bin';
      const storedFilename = `${crypto.randomUUID()}${safeExt}`;

      const docSpecId = String(req.body.docSpecId ?? 'supporting-doc');
      const category = await store.getCategoryById(app.categoryId);
      const spec = category?.requiredDocuments.find((d) => d.id === docSpecId);

      const doc = await store.addDocument(
        {
          id: `doc-${crypto.randomUUID()}`,
          applicationId: app.id,
          docSpecId,
          docSpecName: spec?.name ?? String(req.body.docSpecName ?? 'Supporting Document'),
          originalFilename: req.file.originalname,
          storedFilename,
          mimeType: req.file.mimetype,
          sizeBytes: req.file.size,
          isMedicalSensitive: Boolean(spec?.isMedicalSensitive),
          uploadedById: user.id,
          uploadedAt: new Date().toISOString(),
        },
        req.file.buffer
      );

      await store.addAuditLog({
        actorId: user.id,
        actorName: user.fullName,
        actorRole: 'student',
        action: 'DOCUMENT_UPLOADED',
        targetType: 'application',
        targetId: app.applicationCode,
        details: `Uploaded ${doc.docSpecName} (${doc.originalFilename})`,
      });

      res.status(201).json({ document: doc });
    } catch (err) {
      console.error('Upload document failed:', err);
      res.status(500).json({ error: 'Failed to upload document.' });
    }
  }
);

router.delete('/:id/documents/:docId', requireAuth, requireRole('student'), async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const store = getStore();
    const app = await store.getApplicationById(String(req.params.id));
    if (!app) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }
    if (app.studentId !== user.id) {
      res.status(403).json({ error: 'Not authorized.' });
      return;
    }
    if (app.status !== 'Draft' && app.status !== 'Awaiting Student Information') {
      res.status(400).json({ error: 'Cannot remove documents after final submission.' });
      return;
    }
    const doc = await store.getDocumentById(String(req.params.docId));
    if (!doc || doc.applicationId !== app.id) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    const safePath = resolveSafeUploadPath(doc.storedFilename);
    if (safePath && fs.existsSync(safePath)) {
      fs.unlinkSync(safePath);
    }

    await store.deleteDocument(doc.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete document failed:', err);
    res.status(500).json({ error: 'Failed to remove document.' });
  }
});

router.get('/documents/:docId/download', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const store = getStore();
    const result = await store.getDocumentWithData(String(req.params.docId));
    if (!result) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }
    const { document: doc, fileData } = result;

    const app = await store.getApplicationById(doc.applicationId);
    if (!app) {
      res.status(404).json({ error: 'Parent application not found.' });
      return;
    }

    if (user.role === 'student') {
      if (app.studentId !== user.id) {
        res.status(403).json({ error: 'Access denied.' });
        return;
      }
    } else if (user.role === 'staff') {
      const isAssignedOffice = Boolean(user.officeId && app.assignedOfficeId === user.officeId);
      const isForwardedByOffice = Boolean(
        user.officeId && (await store.hasOfficeForwardedApplication(app.id, user.officeId))
      );
      if (app.status === 'Draft' || (!isAssignedOffice && !isForwardedByOffice)) {
        res.status(403).json({ error: 'Application is not assigned to or forwarded by your office.' });
        return;
      }
      if (doc.isMedicalSensitive && !user.permissions.can_access_medical) {
        res.status(403).json({
          error: 'Medical document access denied. Only authorized medical personnel may download this file.',
        });
        return;
      }
    } else if (user.role === 'admin') {
      if (doc.isMedicalSensitive && !user.permissions.can_access_medical) {
        res.status(403).json({
          error: 'Medical document access requires explicit medical clearance.',
        });
        return;
      }
    }

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `inline; filename="${pathSafeFilename(doc.originalFilename)}"`);

    if (fileData && fileData.length > 0) {
      res.send(fileData);
      return;
    }

    const safePath = resolveSafeUploadPath(doc.storedFilename);
    if (!safePath || !fs.existsSync(safePath)) {
      res.status(404).json({ error: 'Stored document contents are unavailable.' });
      return;
    }

    fs.createReadStream(safePath).pipe(res);
  } catch (err) {
    console.error('Document download failed:', err);
    res.status(500).json({ error: 'Failed to download document.' });
  }
});

function pathSafeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

router.post('/:id/withdraw', requireAuth, requireRole('student'), async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const store = getStore();
    const app = await store.getApplicationById(String(req.params.id));
    if (!app) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }
    if (app.studentId !== user.id) {
      res.status(403).json({ error: 'Not authorized to withdraw this application.' });
      return;
    }
    if (['Approved', 'Rejected', 'Completed', 'Withdrawn'].includes(app.status)) {
      res.status(400).json({ error: `Cannot withdraw an application that is already ${app.status}.` });
      return;
    }

    const remarks = String(req.body?.remarks ?? 'Withdrawn by student.').trim() || 'Withdrawn by student.';
    const updated = await store.updateApplication(
      app.id,
      { status: 'Withdrawn' },
      {
        id: `hist-${crypto.randomUUID()}`,
        applicationId: app.id,
        previousStatus: app.status,
        newStatus: 'Withdrawn',
        actorId: user.id,
        actorName: user.fullName,
        actorRole: 'student',
        remarks,
        createdAt: new Date().toISOString(),
      }
    );

    await store.addAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: 'student',
      action: 'APPLICATION_WITHDRAWN',
      targetType: 'application',
      targetId: app.applicationCode,
      details: remarks,
    });

    res.json({ application: updated });
  } catch (err) {
    console.error('Withdraw application failed:', err);
    res.status(500).json({ error: 'Failed to withdraw application.' });
  }
});

router.post('/:id/transition', requireAuth, requireRole('staff', 'admin'), async (req: AuthRequest, res) => {
  try {
    const user = req.authUser!;
    const store = getStore();
    const app = await store.getApplicationById(String(req.params.id));

    if (!app) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }
    if (['Draft', 'Withdrawn', 'Rejected', 'Completed'].includes(app.status)) {
      res.status(400).json({
        error: `Application is finalized (${app.status}) and no further status changes are permitted.`,
      });
      return;
    }
    if (user.role === 'staff' && app.assignedOfficeId !== user.officeId) {
      res.status(403).json({ error: 'You may only process applications assigned to your office.' });
      return;
    }

    const parsed = staffTransitionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid transition request.' });
      return;
    }

    const { newStatus, remarks, targetOfficeId, decisionSummary } = parsed.data;

    if (app.status === 'Approved' && newStatus !== 'Completed') {
      res.status(400).json({
        error: 'An Approved application can only be transitioned to Completed.',
      });
      return;
    }

    // Enforce granular staff/admin permissions
    if (newStatus === 'Approved' && !hasStaffPermission(user, 'can_approve')) {
      res.status(403).json({ error: 'Your account does not have approval authority.' });
      return;
    }
    if (newStatus === 'Rejected' && !hasStaffPermission(user, 'can_reject')) {
      res.status(403).json({ error: 'Your account does not have rejection authority.' });
      return;
    }
    if (newStatus === 'Forwarded' && !hasStaffPermission(user, 'can_forward')) {
      res.status(403).json({ error: 'Your account does not have forwarding authority.' });
      return;
    }
    if (newStatus === 'Awaiting Student Information' && !hasStaffPermission(user, 'can_request_info')) {
      res.status(403).json({ error: 'Your account cannot request additional student information.' });
      return;
    }
    if (
      ['Under Review', 'Pending Decision', 'Completed'].includes(newStatus) &&
      !hasStaffPermission(user, 'can_review')
    ) {
      res.status(403).json({ error: 'Your account lacks review/processing authority.' });
      return;
    }

    let nextOfficeId = app.assignedOfficeId;
    let targetOfficeName: string | undefined;

    if (newStatus === 'Forwarded') {
      if (!targetOfficeId) {
        res.status(400).json({ error: 'Please select a destination office when forwarding an application.' });
        return;
      }
      const targetOffice = await store.getOfficeById(targetOfficeId);
      if (!targetOffice) {
        res.status(404).json({ error: 'Target office not found.' });
        return;
      }
      nextOfficeId = targetOffice.id;
      targetOfficeName = targetOffice.name;
    }

    const updated = await store.updateApplication(
      app.id,
      {
        status: newStatus,
        assignedOfficeId: nextOfficeId,
        decisionSummary:
          decisionSummary ||
          (newStatus === 'Approved' || newStatus === 'Rejected' ? remarks : app.decisionSummary),
      },
      {
        id: `hist-${crypto.randomUUID()}`,
        applicationId: app.id,
        previousStatus: app.status,
        newStatus,
        actorId: user.id,
        actorName: user.fullName,
        actorRole: user.role,
        actorOfficeName: user.officeName,
        targetOfficeName,
        remarks,
        createdAt: new Date().toISOString(),
      }
    );

    await store.addAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: `APPLICATION_${newStatus.toUpperCase().replace(/\s+/g, '_')}`,
      targetType: 'application',
      targetId: app.applicationCode,
      details: targetOfficeName ? `Forwarded to ${targetOfficeName}. ${remarks}` : remarks,
    });

    await store.createNotification({
      userId: app.studentId,
      title: `Application ${app.applicationCode}: ${newStatus}`,
      message: `${user.fullName}${user.officeName ? ` (${user.officeName})` : ''} updated your application: "${remarks}"`,
      linkPath: `/student/applications/${app.id}`,
    });

    if (newStatus === 'Forwarded' && nextOfficeId !== app.assignedOfficeId) {
      const targetStaff = await store.listUsersByOffice(nextOfficeId);
      for (const staff of targetStaff) {
        await store.createNotification({
          userId: staff.id,
          title: `Forwarded Application ${app.applicationCode}`,
          message: `${app.categoryName} was forwarded to your office by ${user.fullName}.`,
          linkPath: `/staff/applications/${app.id}`,
        });
      }
    }

    const canAccessMedical = Boolean(user.permissions.can_access_medical);
    res.json({
      application: updated ? sanitizeApplicationForViewer(updated, user.role, canAccessMedical) : null,
    });
  } catch (err) {
    console.error('Staff transition failed:', err);
    res.status(500).json({ error: 'Failed to update application status.' });
  }
});

export default router;
