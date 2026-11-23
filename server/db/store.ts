import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { Pool } from 'pg';
import type {
  Application,
  ApplicationCategory,
  ApplicationDocument,
  ApplicationHistory,
  ApplicationStatus,
  AuditLog,
  FaqItem,
  Guideline,
  NotificationItem,
  Office,
  Question,
  QuestionStatus,
  StaffPermissions,
  SystemSettings,
  User,
} from '../../src/types/sams.ts';
import { getPgPool, isPostgresConfigured } from './pool.ts';
import {
  SEED_CATEGORIES,
  SEED_FAQS,
  SEED_GUIDELINES,
  SEED_OFFICES,
  SEED_SETTINGS,
} from './seedData.ts';

export interface StoredUser extends User {
  passwordHash: string;
}

export interface SamsStore {
  hasAdmin(): Promise<boolean>;
  getUserById(id: string): Promise<StoredUser | null>;
  getUserByEmail(email: string): Promise<StoredUser | null>;
  getUserByBaustId(baustId: string): Promise<StoredUser | null>;
  listUsers(): Promise<User[]>;
  createUser(user: Omit<StoredUser, 'createdAt'>): Promise<User>;
  updateUser(id: string, patch: Partial<Omit<StoredUser, 'id' | 'createdAt'>>): Promise<User | null>;

  listOffices(): Promise<Office[]>;
  getOfficeById(id: string): Promise<Office | null>;
  upsertOffice(office: Office): Promise<Office>;
  deleteOffice(id: string): Promise<boolean>;

  listCategories(): Promise<ApplicationCategory[]>;
  getCategoryById(id: string): Promise<ApplicationCategory | null>;
  upsertCategory(category: ApplicationCategory): Promise<ApplicationCategory>;

  listGuidelines(): Promise<Guideline[]>;
  upsertGuideline(guideline: Guideline): Promise<Guideline>;

  listFaqs(onlyPublished?: boolean): Promise<FaqItem[]>;
  upsertFaq(faq: FaqItem): Promise<FaqItem>;
  deleteFaq(id: string): Promise<boolean>;

  getSettings(): Promise<SystemSettings>;
  updateSettings(patch: Partial<SystemSettings>): Promise<SystemSettings>;

  listApplications(filter?: { studentId?: string; officeId?: string; forwardedByOfficeId?: string }): Promise<Application[]>;
  getApplicationById(id: string): Promise<Application | null>;
  hasOfficeForwardedApplication(applicationId: string, officeId: string): Promise<boolean>;
  createApplication(app: {
    id: string;
    applicationCode: string;
    studentId: string;
    categoryId: string;
    assignedOfficeId: string;
    status: ApplicationStatus;
    subject: string;
    formData: Record<string, string>;
    remarks: string;
    submittedAt?: string;
    initialHistory: ApplicationHistory;
  }): Promise<Application>;
  updateApplication(
    id: string,
    patch: {
      status?: ApplicationStatus;
      assignedOfficeId?: string;
      subject?: string;
      formData?: Record<string, string>;
      remarks?: string;
      decisionSummary?: string;
      submittedAt?: string;
    },
    historyEntry?: ApplicationHistory
  ): Promise<Application | null>;
  deleteDraftApplication(id: string, studentId: string): Promise<boolean>;
  nextApplicationCode(year: number): Promise<string>;

  addDocument(doc: ApplicationDocument, fileData?: Buffer): Promise<ApplicationDocument>;
  getDocumentById(docId: string): Promise<ApplicationDocument | null>;
  getDocumentWithData(docId: string): Promise<{ document: ApplicationDocument; fileData: Buffer | null } | null>;
  deleteDocument(docId: string): Promise<boolean>;

  listQuestions(filter?: { studentId?: string; officeId?: string }): Promise<Question[]>;
  getQuestionById(id: string): Promise<Question | null>;
  createQuestion(q: {
    id: string;
    questionCode: string;
    studentId: string;
    categoryId?: string;
    applicationId?: string;
    assignedOfficeId: string;
    subject: string;
    questionText: string;
  }): Promise<Question>;
  updateQuestionAnswer(
    id: string,
    patch: {
      status: QuestionStatus;
      answerText?: string;
      answeredById?: string;
      answeredByName?: string;
      answeredAt?: string;
    }
  ): Promise<Question | null>;
  nextQuestionCode(year: number): Promise<string>;

  listNotifications(userId: string): Promise<NotificationItem[]>;
  createNotification(n: Omit<NotificationItem, 'id' | 'createdAt' | 'isRead'>): Promise<NotificationItem>;
  markNotificationRead(id: string, userId: string): Promise<boolean>;
  setNotificationRead(id: string, userId: string, isRead: boolean): Promise<boolean>;
  markAllNotificationsRead(userId: string): Promise<void>;

  listAuditLogs(limit?: number): Promise<AuditLog[]>;
  addAuditLog(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog>;
  listUsersByOffice(officeId: string): Promise<User[]>;
}

function stripHash(u: StoredUser): User {
  const { passwordHash: _omit, ...safe } = u;
  return safe;
}

const PG_REQUIRED_ERROR = 'PostgreSQL is required for database persistence and authenticated workflows.';

class CatalogFallbackStore implements SamsStore {
  private rejectWrite(): never {
    throw new Error(PG_REQUIRED_ERROR);
  }

  async hasAdmin(): Promise<boolean> {
    return false;
  }

  async getUserById(): Promise<StoredUser | null> {
    return null;
  }

  async getUserByEmail(): Promise<StoredUser | null> {
    return null;
  }

  async getUserByBaustId(): Promise<StoredUser | null> {
    return null;
  }

  async listUsers(): Promise<User[]> {
    return [];
  }

  async listUsersByOffice(): Promise<User[]> {
    return [];
  }

  async createUser(): Promise<User> {
    return this.rejectWrite();
  }

  async updateUser(): Promise<User | null> {
    return this.rejectWrite();
  }

  async listOffices(): Promise<Office[]> {
    return structuredClone(SEED_OFFICES);
  }

  async getOfficeById(id: string): Promise<Office | null> {
    return SEED_OFFICES.find((o) => o.id === id) ?? null;
  }

  async upsertOffice(): Promise<Office> {
    return this.rejectWrite();
  }

  async deleteOffice(): Promise<boolean> {
    return this.rejectWrite();
  }

  async listCategories(): Promise<ApplicationCategory[]> {
    return structuredClone(SEED_CATEGORIES);
  }

  async getCategoryById(id: string): Promise<ApplicationCategory | null> {
    return SEED_CATEGORIES.find((c) => c.id === id || c.slug === id) ?? null;
  }

  async upsertCategory(): Promise<ApplicationCategory> {
    return this.rejectWrite();
  }

  async listGuidelines(): Promise<Guideline[]> {
    return structuredClone(SEED_GUIDELINES);
  }

  async upsertGuideline(): Promise<Guideline> {
    return this.rejectWrite();
  }

  async listFaqs(onlyPublished = false): Promise<FaqItem[]> {
    const list = onlyPublished ? SEED_FAQS.filter((f) => f.isPublished) : SEED_FAQS;
    return structuredClone([...list].sort((a, b) => a.sortOrder - b.sortOrder));
  }

  async upsertFaq(): Promise<FaqItem> {
    return this.rejectWrite();
  }

  async deleteFaq(): Promise<boolean> {
    return this.rejectWrite();
  }

  async getSettings(): Promise<SystemSettings> {
    return structuredClone(SEED_SETTINGS);
  }

  async updateSettings(): Promise<SystemSettings> {
    return this.rejectWrite();
  }

  async listApplications(): Promise<Application[]> {
    return [];
  }

  async getApplicationById(): Promise<Application | null> {
    return null;
  }

  async hasOfficeForwardedApplication(): Promise<boolean> {
    return false;
  }

  async nextApplicationCode(): Promise<string> {
    return this.rejectWrite();
  }

  async createApplication(): Promise<Application> {
    return this.rejectWrite();
  }

  async updateApplication(): Promise<Application | null> {
    return this.rejectWrite();
  }

  async deleteDraftApplication(): Promise<boolean> {
    return this.rejectWrite();
  }

  async addDocument(): Promise<ApplicationDocument> {
    return this.rejectWrite();
  }

  async getDocumentById(): Promise<ApplicationDocument | null> {
    return null;
  }

  async getDocumentWithData(): Promise<{ document: ApplicationDocument; fileData: Buffer | null } | null> {
    return null;
  }

  async deleteDocument(): Promise<boolean> {
    return this.rejectWrite();
  }

  async listQuestions(): Promise<Question[]> {
    return [];
  }

  async getQuestionById(): Promise<Question | null> {
    return null;
  }

  async nextQuestionCode(): Promise<string> {
    return this.rejectWrite();
  }

  async createQuestion(): Promise<Question> {
    return this.rejectWrite();
  }

  async updateQuestionAnswer(): Promise<Question | null> {
    return this.rejectWrite();
  }

  async listNotifications(): Promise<NotificationItem[]> {
    return [];
  }

  async createNotification(): Promise<NotificationItem> {
    return this.rejectWrite();
  }

  async markNotificationRead(): Promise<boolean> {
    return this.rejectWrite();
  }

  async setNotificationRead(): Promise<boolean> {
    return this.rejectWrite();
  }

  async markAllNotificationsRead(): Promise<void> {
    return this.rejectWrite();
  }

  async listAuditLogs(): Promise<AuditLog[]> {
    return [];
  }

  async addAuditLog(): Promise<AuditLog> {
    return this.rejectWrite();
  }
}

class PostgresSamsStore implements SamsStore {
  private pool: Pool;

  constructor() {
    this.pool = getPgPool();
  }

  private mapUser(row: Record<string, unknown>): StoredUser {
    return {
      id: String(row.id),
      fullName: String(row.full_name),
      email: String(row.email),
      passwordHash: String(row.password_hash),
      role: row.role as User['role'],
      baustId: row.baust_id ? String(row.baust_id) : undefined,
      department: row.department ? String(row.department) : undefined,
      batchSemester: row.batch_semester ? String(row.batch_semester) : undefined,
      phone: row.phone ? String(row.phone) : undefined,
      officeId: row.office_id ? String(row.office_id) : undefined,
      officeName: row.office_name ? String(row.office_name) : undefined,
      designation: row.designation ? String(row.designation) : undefined,
      permissions: (row.permissions ?? {}) as StaffPermissions,
      isActive: Boolean(row.is_active),
      createdAt: new Date(String(row.created_at)).toISOString(),
    };
  }

  async hasAdmin(): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*)::int AS cnt FROM users WHERE role = 'admin' AND is_active = TRUE`
    );
    return Number(rows[0]?.cnt ?? 0) > 0;
  }

  async getUserById(id: string): Promise<StoredUser | null> {
    const { rows } = await this.pool.query(
      `SELECT u.*, o.name AS office_name FROM users u LEFT JOIN offices o ON u.office_id = o.id WHERE u.id = $1`,
      [id]
    );
    return rows[0] ? this.mapUser(rows[0]) : null;
  }

  async getUserByEmail(email: string): Promise<StoredUser | null> {
    const { rows } = await this.pool.query(
      `SELECT u.*, o.name AS office_name FROM users u LEFT JOIN offices o ON u.office_id = o.id WHERE LOWER(u.email) = LOWER($1)`,
      [email.trim()]
    );
    return rows[0] ? this.mapUser(rows[0]) : null;
  }

  async getUserByBaustId(baustId: string): Promise<StoredUser | null> {
    const { rows } = await this.pool.query(
      `SELECT u.*, o.name AS office_name FROM users u LEFT JOIN offices o ON u.office_id = o.id WHERE UPPER(u.baust_id) = UPPER($1)`,
      [baustId.trim()]
    );
    return rows[0] ? this.mapUser(rows[0]) : null;
  }

  async listUsers(): Promise<User[]> {
    const { rows } = await this.pool.query(
      `SELECT u.*, o.name AS office_name FROM users u LEFT JOIN offices o ON u.office_id = o.id ORDER BY u.created_at DESC`
    );
    return rows.map((r) => stripHash(this.mapUser(r)));
  }

  async listUsersByOffice(officeId: string): Promise<User[]> {
    const { rows } = await this.pool.query(
      `SELECT u.*, o.name AS office_name FROM users u LEFT JOIN offices o ON u.office_id = o.id WHERE u.is_active = TRUE AND (u.office_id = $1 OR u.role = 'admin')`,
      [officeId]
    );
    return rows.map((r) => stripHash(this.mapUser(r)));
  }

  async createUser(user: Omit<StoredUser, 'createdAt'>): Promise<User> {
    await this.pool.query(
      `INSERT INTO users (id, full_name, email, password_hash, role, baust_id, department, batch_semester, phone, office_id, designation, permissions, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13)`,
      [
        user.id,
        user.fullName,
        user.email.toLowerCase(),
        user.passwordHash,
        user.role,
        user.baustId ?? null,
        user.department ?? null,
        user.batchSemester ?? null,
        user.phone ?? null,
        user.officeId ?? null,
        user.designation ?? null,
        JSON.stringify(user.permissions),
        user.isActive,
      ]
    );
    const created = await this.getUserById(user.id);
    if (!created) throw new Error('Failed to load created user');
    return stripHash(created);
  }

  async updateUser(id: string, patch: Partial<Omit<StoredUser, 'id' | 'createdAt'>>): Promise<User | null> {
    const existing = await this.getUserById(id);
    if (!existing) return null;
    const merged = { ...existing, ...patch };
    await this.pool.query(
      `UPDATE users SET full_name = $2, role = $3, department = $4, batch_semester = $5, phone = $6, office_id = $7, designation = $8, permissions = $9::jsonb, is_active = $10
       WHERE id = $1`,
      [
        id,
        merged.fullName,
        merged.role,
        merged.department ?? null,
        merged.batchSemester ?? null,
        merged.phone ?? null,
        merged.officeId ?? null,
        merged.designation ?? null,
        JSON.stringify(merged.permissions),
        merged.isActive,
      ]
    );
    const updated = await this.getUserById(id);
    return updated ? stripHash(updated) : null;
  }

  async listOffices(): Promise<Office[]> {
    const { rows } = await this.pool.query(`SELECT * FROM offices ORDER BY name ASC`);
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      buildingLocation: r.building_location,
      email: r.email,
      phone: r.phone,
      headTitle: r.head_title,
      description: r.description,
      isActive: r.is_active,
    }));
  }

  async getOfficeById(id: string): Promise<Office | null> {
    const { rows } = await this.pool.query(`SELECT * FROM offices WHERE id = $1`, [id]);
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      buildingLocation: r.building_location,
      email: r.email,
      phone: r.phone,
      headTitle: r.head_title,
      description: r.description,
      isActive: r.is_active,
    };
  }

  async upsertOffice(office: Office): Promise<Office> {
    await this.pool.query(
      `INSERT INTO offices (id, code, name, building_location, email, phone, head_title, description, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         code = EXCLUDED.code, name = EXCLUDED.name, building_location = EXCLUDED.building_location,
         email = EXCLUDED.email, phone = EXCLUDED.phone, head_title = EXCLUDED.head_title,
         description = EXCLUDED.description, is_active = EXCLUDED.is_active`,
      [
        office.id,
        office.code,
        office.name,
        office.buildingLocation,
        office.email,
        office.phone,
        office.headTitle,
        office.description,
        office.isActive,
      ]
    );
    return office;
  }

  async deleteOffice(id: string): Promise<boolean> {
    const res = await this.pool.query(`DELETE FROM offices WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  async listCategories(): Promise<ApplicationCategory[]> {
    const { rows } = await this.pool.query(
      `SELECT c.*, o.name AS office_name FROM application_categories c JOIN offices o ON c.default_office_id = o.id ORDER BY c.name ASC`
    );
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      code: r.code,
      name: r.name,
      shortDescription: r.short_description,
      defaultOfficeId: r.default_office_id,
      defaultOfficeName: r.office_name,
      feeBdt: r.fee_bdt,
      processingDays: r.processing_days,
      deadlineText: r.deadline_text,
      eligibility: r.eligibility,
      submissionInstructions: r.submission_instructions,
      dynamicFields: r.dynamic_fields ?? [],
      requiredDocuments: r.required_documents ?? [],
      isActive: r.is_active,
    }));
  }

  async getCategoryById(id: string): Promise<ApplicationCategory | null> {
    const { rows } = await this.pool.query(
      `SELECT c.*, o.name AS office_name FROM application_categories c JOIN offices o ON c.default_office_id = o.id WHERE c.id = $1 OR c.slug = $1`,
      [id]
    );
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      slug: r.slug,
      code: r.code,
      name: r.name,
      shortDescription: r.short_description,
      defaultOfficeId: r.default_office_id,
      defaultOfficeName: r.office_name,
      feeBdt: r.fee_bdt,
      processingDays: r.processing_days,
      deadlineText: r.deadline_text,
      eligibility: r.eligibility,
      submissionInstructions: r.submission_instructions,
      dynamicFields: r.dynamic_fields ?? [],
      requiredDocuments: r.required_documents ?? [],
      isActive: r.is_active,
    };
  }

  async upsertCategory(category: ApplicationCategory): Promise<ApplicationCategory> {
    await this.pool.query(
      `INSERT INTO application_categories (id, slug, code, name, short_description, default_office_id, fee_bdt, processing_days, deadline_text, eligibility, submission_instructions, dynamic_fields, required_documents, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14)
       ON CONFLICT (id) DO UPDATE SET
         slug = EXCLUDED.slug, code = EXCLUDED.code, name = EXCLUDED.name,
         short_description = EXCLUDED.short_description, default_office_id = EXCLUDED.default_office_id,
         fee_bdt = EXCLUDED.fee_bdt, processing_days = EXCLUDED.processing_days,
         deadline_text = EXCLUDED.deadline_text, eligibility = EXCLUDED.eligibility,
         submission_instructions = EXCLUDED.submission_instructions,
         dynamic_fields = EXCLUDED.dynamic_fields, required_documents = EXCLUDED.required_documents,
         is_active = EXCLUDED.is_active`,
      [
        category.id,
        category.slug,
        category.code,
        category.name,
        category.shortDescription,
        category.defaultOfficeId,
        category.feeBdt,
        category.processingDays,
        category.deadlineText,
        category.eligibility,
        category.submissionInstructions,
        JSON.stringify(category.dynamicFields),
        JSON.stringify(category.requiredDocuments),
        category.isActive,
      ]
    );
    return (await this.getCategoryById(category.id)) ?? category;
  }

  async listGuidelines(): Promise<Guideline[]> {
    const { rows } = await this.pool.query(
      `SELECT g.*, c.name AS category_name, o.name AS contact_office_name
       FROM guidelines g
       JOIN application_categories c ON g.category_id = c.id
       JOIN offices o ON g.contact_office_id = o.id
       ORDER BY c.name ASC`
    );
    return rows.map((r) => ({
      id: r.id,
      categoryId: r.category_id,
      categoryName: r.category_name,
      title: r.title,
      summary: r.summary,
      eligibilityDetails: r.eligibility_details,
      submissionSteps: r.submission_steps ?? [],
      deadlineNote: r.deadline_note,
      feeNote: r.fee_note,
      contactOfficeId: r.contact_office_id,
      contactOfficeName: r.contact_office_name,
      contactEmail: r.contact_email,
      contactPhone: r.contact_phone,
      updatedAt: new Date(r.updated_at).toISOString(),
      updatedByName: r.updated_by_name,
    }));
  }

  async upsertGuideline(guideline: Guideline): Promise<Guideline> {
    await this.pool.query(
      `INSERT INTO guidelines (id, category_id, title, summary, eligibility_details, submission_steps, deadline_note, fee_note, contact_office_id, contact_email, contact_phone, updated_at, updated_by_name)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO UPDATE SET
         category_id = EXCLUDED.category_id, title = EXCLUDED.title, summary = EXCLUDED.summary,
         eligibility_details = EXCLUDED.eligibility_details, submission_steps = EXCLUDED.submission_steps,
         deadline_note = EXCLUDED.deadline_note, fee_note = EXCLUDED.fee_note,
         contact_office_id = EXCLUDED.contact_office_id, contact_email = EXCLUDED.contact_email,
         contact_phone = EXCLUDED.contact_phone, updated_at = EXCLUDED.updated_at, updated_by_name = EXCLUDED.updated_by_name`,
      [
        guideline.id,
        guideline.categoryId,
        guideline.title,
        guideline.summary,
        guideline.eligibilityDetails,
        JSON.stringify(guideline.submissionSteps),
        guideline.deadlineNote,
        guideline.feeNote,
        guideline.contactOfficeId,
        guideline.contactEmail,
        guideline.contactPhone,
        guideline.updatedAt,
        guideline.updatedByName,
      ]
    );
    return guideline;
  }

  async listFaqs(onlyPublished = false): Promise<FaqItem[]> {
    const { rows } = await this.pool.query(
      `SELECT f.*, c.name AS category_name FROM faqs f LEFT JOIN application_categories c ON f.category_id = c.id
       ${onlyPublished ? 'WHERE f.is_published = TRUE' : ''}
       ORDER BY f.sort_order ASC`
    );
    return rows.map((r) => ({
      id: r.id,
      categoryId: r.category_id ?? undefined,
      categoryName: r.category_name ?? 'General System',
      question: r.question,
      answer: r.answer,
      isPublished: r.is_published,
      sortOrder: r.sort_order,
    }));
  }

  async upsertFaq(faq: FaqItem): Promise<FaqItem> {
    await this.pool.query(
      `INSERT INTO faqs (id, category_id, question, answer, is_published, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         category_id = EXCLUDED.category_id, question = EXCLUDED.question, answer = EXCLUDED.answer,
         is_published = EXCLUDED.is_published, sort_order = EXCLUDED.sort_order`,
      [faq.id, faq.categoryId ?? null, faq.question, faq.answer, faq.isPublished, faq.sortOrder]
    );
    return faq;
  }

  async deleteFaq(id: string): Promise<boolean> {
    const res = await this.pool.query(`DELETE FROM faqs WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  async getSettings(): Promise<SystemSettings> {
    const { rows } = await this.pool.query(`SELECT * FROM system_settings WHERE id = 1`);
    const r = rows[0];
    if (!r) return SEED_SETTINGS;
    return {
      universityName: r.university_name,
      shortName: r.short_name,
      campusLocation: r.campus_location,
      academicSemester: r.academic_semester,
      supportEmail: r.support_email,
      supportPhone: r.support_phone,
      maxUploadSizeMb: r.max_upload_size_mb,
      allowNewRegistrations: r.allow_new_registrations,
    };
  }

  async updateSettings(patch: Partial<SystemSettings>): Promise<SystemSettings> {
    const current = await this.getSettings();
    const next = { ...current, ...patch };
    await this.pool.query(
      `INSERT INTO system_settings (id, university_name, short_name, campus_location, academic_semester, support_email, support_phone, max_upload_size_mb, allow_new_registrations)
       VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         university_name = EXCLUDED.university_name, short_name = EXCLUDED.short_name,
         campus_location = EXCLUDED.campus_location, academic_semester = EXCLUDED.academic_semester,
         support_email = EXCLUDED.support_email, support_phone = EXCLUDED.support_phone,
         max_upload_size_mb = EXCLUDED.max_upload_size_mb, allow_new_registrations = EXCLUDED.allow_new_registrations`,
      [
        next.universityName,
        next.shortName,
        next.campusLocation,
        next.academicSemester,
        next.supportEmail,
        next.supportPhone,
        next.maxUploadSizeMb,
        next.allowNewRegistrations,
      ]
    );
    return next;
  }

  private async hydrateApplications(rows: Record<string, unknown>[]): Promise<Application[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => String(r.id));
    const docRes = await this.pool.query(
      `SELECT id, application_id, doc_spec_id, doc_spec_name, original_filename, stored_filename, mime_type, size_bytes, is_medical_sensitive, uploaded_by_id, uploaded_at
       FROM application_documents
       WHERE application_id = ANY($1::text[])
       ORDER BY uploaded_at ASC`,
      [ids]
    );
    const histRes = await this.pool.query(
      `SELECT * FROM application_history WHERE application_id = ANY($1::text[]) ORDER BY created_at ASC`,
      [ids]
    );

    const docsByApp = new Map<string, ApplicationDocument[]>();
    for (const d of docRes.rows) {
      const list = docsByApp.get(d.application_id) ?? [];
      list.push({
        id: d.id,
        applicationId: d.application_id,
        docSpecId: d.doc_spec_id,
        docSpecName: d.doc_spec_name,
        originalFilename: d.original_filename,
        storedFilename: d.stored_filename,
        mimeType: d.mime_type,
        sizeBytes: d.size_bytes,
        isMedicalSensitive: d.is_medical_sensitive,
        uploadedById: d.uploaded_by_id,
        uploadedAt: new Date(d.uploaded_at).toISOString(),
      });
      docsByApp.set(d.application_id, list);
    }

    const histByApp = new Map<string, ApplicationHistory[]>();
    for (const h of histRes.rows) {
      const list = histByApp.get(h.application_id) ?? [];
      list.push({
        id: h.id,
        applicationId: h.application_id,
        previousStatus: h.previous_status,
        newStatus: h.new_status,
        actorId: h.actor_id,
        actorName: h.actor_name,
        actorRole: h.actor_role,
        actorOfficeName: h.actor_office_name ?? undefined,
        targetOfficeName: h.target_office_name ?? undefined,
        remarks: h.remarks,
        createdAt: new Date(h.created_at).toISOString(),
      });
      histByApp.set(h.application_id, list);
    }

    return rows.map((r) => ({
      id: String(r.id),
      applicationCode: String(r.application_code),
      studentId: String(r.student_id),
      studentName: String(r.student_name),
      studentBaustId: String(r.student_baust_id ?? 'N/A'),
      studentDepartment: String(r.student_department ?? 'N/A'),
      studentBatchSemester: String(r.student_batch_semester ?? 'N/A'),
      studentEmail: String(r.student_email),
      studentPhone: String(r.student_phone ?? ''),
      categoryId: String(r.category_id),
      categoryName: String(r.category_name),
      assignedOfficeId: String(r.assigned_office_id),
      assignedOfficeName: String(r.assigned_office_name),
      status: r.status as ApplicationStatus,
      subject: String(r.subject),
      formData: (r.form_data ?? {}) as Record<string, string>,
      remarks: String(r.remarks ?? ''),
      decisionSummary: r.decision_summary ? String(r.decision_summary) : undefined,
      createdAt: new Date(String(r.created_at)).toISOString(),
      updatedAt: new Date(String(r.updated_at)).toISOString(),
      submittedAt: r.submitted_at ? new Date(String(r.submitted_at)).toISOString() : undefined,
      documents: docsByApp.get(String(r.id)) ?? [],
      history: histByApp.get(String(r.id)) ?? [],
    }));
  }

  async listApplications(filter?: {
    studentId?: string;
    officeId?: string;
    forwardedByOfficeId?: string;
  }): Promise<Application[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (filter?.studentId) {
      params.push(filter.studentId);
      conditions.push(`a.student_id = $${params.length}`);
    }
    if (filter?.officeId) {
      params.push(filter.officeId);
      conditions.push(`a.assigned_office_id = $${params.length} AND a.status <> 'Draft'`);
    }
    if (filter?.forwardedByOfficeId) {
      params.push(filter.forwardedByOfficeId);
      const pIdx = params.length;
      conditions.push(
        `a.status <> 'Draft' AND a.assigned_office_id <> $${pIdx} AND EXISTS (
          SELECT 1
          FROM application_history h
          LEFT JOIN users hu ON h.actor_id = hu.id
          LEFT JOIN offices ho ON ho.id = $${pIdx}
          WHERE h.application_id = a.id
            AND h.new_status = 'Forwarded'
            AND (hu.office_id = $${pIdx} OR h.actor_office_name = ho.name)
        )`
      );
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await this.pool.query(
      `SELECT a.*, u.full_name AS student_name, u.baust_id AS student_baust_id, u.department AS student_department,
              u.batch_semester AS student_batch_semester, u.email AS student_email, u.phone AS student_phone,
              c.name AS category_name, o.name AS assigned_office_name
       FROM applications a
       JOIN users u ON a.student_id = u.id
       JOIN application_categories c ON a.category_id = c.id
       JOIN offices o ON a.assigned_office_id = o.id
       ${whereClause}
       ORDER BY a.updated_at DESC`,
      params
    );
    return this.hydrateApplications(rows);
  }

  async getApplicationById(id: string): Promise<Application | null> {
    const { rows } = await this.pool.query(
      `SELECT a.*, u.full_name AS student_name, u.baust_id AS student_baust_id, u.department AS student_department,
              u.batch_semester AS student_batch_semester, u.email AS student_email, u.phone AS student_phone,
              c.name AS category_name, o.name AS assigned_office_name
       FROM applications a
       JOIN users u ON a.student_id = u.id
       JOIN application_categories c ON a.category_id = c.id
       JOIN offices o ON a.assigned_office_id = o.id
       WHERE a.id = $1 OR a.application_code = $1`,
      [id]
    );
    const hydrated = await this.hydrateApplications(rows);
    return hydrated[0] ?? null;
  }

  async hasOfficeForwardedApplication(applicationId: string, officeId: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT 1
       FROM application_history h
       JOIN applications a ON h.application_id = a.id
       LEFT JOIN users hu ON h.actor_id = hu.id
       LEFT JOIN offices ho ON ho.id = $2
       WHERE a.id = $1
         AND a.status <> 'Draft'
         AND h.new_status = 'Forwarded'
         AND (hu.office_id = $2 OR h.actor_office_name = ho.name)
       LIMIT 1`,
      [applicationId, officeId]
    );
    return rows.length > 0;
  }

  async nextApplicationCode(year: number): Promise<string> {
    const { rows } = await this.pool.query(
      `SELECT COALESCE(MAX(NULLIF(regexp_replace(application_code, '^.*-', ''), '')::int), 100) + 1 AS next_num FROM applications`
    );
    const num = Number(rows[0]?.next_num ?? 101);
    return `BAUST-${year}-${String(num).padStart(4, '0')}`;
  }

  async createApplication(input: {
    id: string;
    applicationCode: string;
    studentId: string;
    categoryId: string;
    assignedOfficeId: string;
    status: ApplicationStatus;
    subject: string;
    formData: Record<string, string>;
    remarks: string;
    submittedAt?: string;
    initialHistory: ApplicationHistory;
  }): Promise<Application> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO applications (id, application_code, student_id, category_id, assigned_office_id, status, subject, form_data, remarks, submitted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)`,
        [
          input.id,
          input.applicationCode,
          input.studentId,
          input.categoryId,
          input.assignedOfficeId,
          input.status,
          input.subject,
          JSON.stringify(input.formData),
          input.remarks,
          input.submittedAt ?? null,
        ]
      );
      await client.query(
        `INSERT INTO application_history (id, application_id, previous_status, new_status, actor_id, actor_name, actor_role, actor_office_name, target_office_name, remarks)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          input.initialHistory.id,
          input.id,
          input.initialHistory.previousStatus,
          input.initialHistory.newStatus,
          input.initialHistory.actorId,
          input.initialHistory.actorName,
          input.initialHistory.actorRole,
          input.initialHistory.actorOfficeName ?? null,
          input.initialHistory.targetOfficeName ?? null,
          input.initialHistory.remarks,
        ]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    const created = await this.getApplicationById(input.id);
    if (!created) throw new Error('Failed to load created application');
    return created;
  }

  async updateApplication(
    id: string,
    patch: {
      status?: ApplicationStatus;
      assignedOfficeId?: string;
      subject?: string;
      formData?: Record<string, string>;
      remarks?: string;
      decisionSummary?: string;
      submittedAt?: string;
    },
    historyEntry?: ApplicationHistory
  ): Promise<Application | null> {
    const existing = await this.getApplicationById(id);
    if (!existing) return null;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE applications SET
           status = $2,
           assigned_office_id = $3,
           subject = $4,
           form_data = $5::jsonb,
           remarks = $6,
           decision_summary = $7,
           submitted_at = $8,
           updated_at = NOW()
         WHERE id = $1`,
        [
          id,
          patch.status ?? existing.status,
          patch.assignedOfficeId ?? existing.assignedOfficeId,
          patch.subject ?? existing.subject,
          JSON.stringify(patch.formData ?? existing.formData),
          patch.remarks ?? existing.remarks,
          patch.decisionSummary ?? existing.decisionSummary ?? null,
          patch.submittedAt ?? existing.submittedAt ?? null,
        ]
      );

      if (historyEntry) {
        await client.query(
          `INSERT INTO application_history (id, application_id, previous_status, new_status, actor_id, actor_name, actor_role, actor_office_name, target_office_name, remarks)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            historyEntry.id,
            id,
            historyEntry.previousStatus,
            historyEntry.newStatus,
            historyEntry.actorId,
            historyEntry.actorName,
            historyEntry.actorRole,
            historyEntry.actorOfficeName ?? null,
            historyEntry.targetOfficeName ?? null,
            historyEntry.remarks,
          ]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return this.getApplicationById(id);
  }

  async deleteDraftApplication(id: string, studentId: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `DELETE FROM applications WHERE id = $1 AND student_id = $2 AND status = 'Draft'`,
        [id, studentId]
      );
      await client.query('COMMIT');
      return (res.rowCount ?? 0) > 0;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async addDocument(doc: ApplicationDocument, fileData?: Buffer): Promise<ApplicationDocument> {
    await this.pool.query(
      `INSERT INTO application_documents (id, application_id, doc_spec_id, doc_spec_name, original_filename, stored_filename, mime_type, size_bytes, is_medical_sensitive, uploaded_by_id, file_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        doc.id,
        doc.applicationId,
        doc.docSpecId,
        doc.docSpecName,
        doc.originalFilename,
        doc.storedFilename,
        doc.mimeType,
        doc.sizeBytes,
        doc.isMedicalSensitive,
        doc.uploadedById,
        fileData ?? null,
      ]
    );
    return doc;
  }

  async getDocumentById(docId: string): Promise<ApplicationDocument | null> {
    const { rows } = await this.pool.query(
      `SELECT id, application_id, doc_spec_id, doc_spec_name, original_filename, stored_filename, mime_type, size_bytes, is_medical_sensitive, uploaded_by_id, uploaded_at
       FROM application_documents WHERE id = $1`,
      [docId]
    );
    const d = rows[0];
    if (!d) return null;
    return {
      id: d.id,
      applicationId: d.application_id,
      docSpecId: d.doc_spec_id,
      docSpecName: d.doc_spec_name,
      originalFilename: d.original_filename,
      storedFilename: d.stored_filename,
      mimeType: d.mime_type,
      sizeBytes: d.size_bytes,
      isMedicalSensitive: d.is_medical_sensitive,
      uploadedById: d.uploaded_by_id,
      uploadedAt: new Date(d.uploaded_at).toISOString(),
    };
  }

  async getDocumentWithData(docId: string): Promise<{ document: ApplicationDocument; fileData: Buffer | null } | null> {
    const { rows } = await this.pool.query(
      `SELECT id, application_id, doc_spec_id, doc_spec_name, original_filename, stored_filename, mime_type, size_bytes, is_medical_sensitive, uploaded_by_id, uploaded_at, file_data
       FROM application_documents WHERE id = $1`,
      [docId]
    );
    const d = rows[0];
    if (!d) return null;
    return {
      document: {
        id: d.id,
        applicationId: d.application_id,
        docSpecId: d.doc_spec_id,
        docSpecName: d.doc_spec_name,
        originalFilename: d.original_filename,
        storedFilename: d.stored_filename,
        mimeType: d.mime_type,
        sizeBytes: d.size_bytes,
        isMedicalSensitive: d.is_medical_sensitive,
        uploadedById: d.uploaded_by_id,
        uploadedAt: new Date(d.uploaded_at).toISOString(),
      },
      fileData: d.file_data ? Buffer.from(d.file_data) : null,
    };
  }

  async deleteDocument(docId: string): Promise<boolean> {
    const res = await this.pool.query(`DELETE FROM application_documents WHERE id = $1`, [docId]);
    return (res.rowCount ?? 0) > 0;
  }

  async listQuestions(filter?: { studentId?: string; officeId?: string }): Promise<Question[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (filter?.studentId) {
      params.push(filter.studentId);
      conditions.push(`q.student_id = $${params.length}`);
    }
    if (filter?.officeId) {
      params.push(filter.officeId);
      conditions.push(`q.assigned_office_id = $${params.length}`);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await this.pool.query(
      `SELECT q.*, u.full_name AS student_name, u.baust_id AS student_baust_id,
              c.name AS category_name, a.application_code, o.name AS assigned_office_name
       FROM questions q
       JOIN users u ON q.student_id = u.id
       LEFT JOIN application_categories c ON q.category_id = c.id
       LEFT JOIN applications a ON q.application_id = a.id
       JOIN offices o ON q.assigned_office_id = o.id
       ${whereClause}
       ORDER BY q.updated_at DESC`,
      params
    );
    return rows.map((r) => ({
      id: r.id,
      questionCode: r.question_code,
      studentId: r.student_id,
      studentName: r.student_name,
      studentBaustId: r.student_baust_id ?? 'N/A',
      categoryId: r.category_id ?? undefined,
      categoryName: r.category_name ?? undefined,
      applicationId: r.application_id ?? undefined,
      applicationCode: r.application_code ?? undefined,
      assignedOfficeId: r.assigned_office_id,
      assignedOfficeName: r.assigned_office_name,
      subject: r.subject,
      questionText: r.question_text,
      status: r.status as QuestionStatus,
      answerText: r.answer_text ?? undefined,
      answeredById: r.answered_by_id ?? undefined,
      answeredByName: r.answered_by_name ?? undefined,
      answeredAt: r.answered_at ? new Date(r.answered_at).toISOString() : undefined,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    }));
  }

  async getQuestionById(id: string): Promise<Question | null> {
    const all = await this.listQuestions();
    return all.find((q) => q.id === id) ?? null;
  }

  async nextQuestionCode(year: number): Promise<string> {
    const { rows } = await this.pool.query(
      `SELECT COALESCE(MAX(NULLIF(regexp_replace(question_code, '^.*-', ''), '')::int), 100) + 1 AS next_num FROM questions`
    );
    const num = Number(rows[0]?.next_num ?? 101);
    return `QST-${year}-${String(num).padStart(4, '0')}`;
  }

  async createQuestion(input: {
    id: string;
    questionCode: string;
    studentId: string;
    categoryId?: string;
    applicationId?: string;
    assignedOfficeId: string;
    subject: string;
    questionText: string;
  }): Promise<Question> {
    await this.pool.query(
      `INSERT INTO questions (id, question_code, student_id, category_id, application_id, assigned_office_id, subject, question_text, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Unanswered')`,
      [
        input.id,
        input.questionCode,
        input.studentId,
        input.categoryId ?? null,
        input.applicationId ?? null,
        input.assignedOfficeId,
        input.subject,
        input.questionText,
      ]
    );
    const created = await this.getQuestionById(input.id);
    if (!created) throw new Error('Failed to load created question');
    return created;
  }

  async updateQuestionAnswer(
    id: string,
    patch: {
      status: QuestionStatus;
      answerText?: string;
      answeredById?: string;
      answeredByName?: string;
      answeredAt?: string;
    }
  ): Promise<Question | null> {
    await this.pool.query(
      `UPDATE questions SET status = $2, answer_text = COALESCE($3, answer_text), answered_by_id = COALESCE($4, answered_by_id),
       answered_by_name = COALESCE($5, answered_by_name), answered_at = COALESCE($6, answered_at), updated_at = NOW()
       WHERE id = $1`,
      [
        id,
        patch.status,
        patch.answerText ?? null,
        patch.answeredById ?? null,
        patch.answeredByName ?? null,
        patch.answeredAt ?? null,
      ]
    );
    return this.getQuestionById(id);
  }

  async listNotifications(userId: string): Promise<NotificationItem[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [userId]
    );
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      title: r.title,
      message: r.message,
      linkPath: r.link_path,
      isRead: r.is_read,
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }

  async createNotification(n: Omit<NotificationItem, 'id' | 'createdAt' | 'isRead'>): Promise<NotificationItem> {
    const id = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO notifications (id, user_id, title, message, link_path, is_read) VALUES ($1, $2, $3, $4, $5, FALSE)`,
      [id, n.userId, n.title, n.message, n.linkPath]
    );
    return { ...n, id, isRead: false, createdAt: new Date().toISOString() };
  }

  async markNotificationRead(id: string, userId: string): Promise<boolean> {
    return this.setNotificationRead(id, userId, true);
  }

  async setNotificationRead(id: string, userId: string, isRead: boolean): Promise<boolean> {
    const res = await this.pool.query(
      `UPDATE notifications SET is_read = $3 WHERE id = $1 AND user_id = $2`,
      [id, userId, isRead]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await this.pool.query(`UPDATE notifications SET is_read = TRUE WHERE user_id = $1`, [userId]);
  }

  async listAuditLogs(limit = 200): Promise<AuditLog[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return rows.map((r) => ({
      id: r.id,
      actorId: r.actor_id,
      actorName: r.actor_name,
      actorRole: r.actor_role,
      action: r.action,
      targetType: r.target_type,
      targetId: r.target_id,
      details: r.details,
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }

  async addAuditLog(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog> {
    const id = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, entry.actorId, entry.actorName, entry.actorRole, entry.action, entry.targetType, entry.targetId, entry.details]
    );
    return { ...entry, id, createdAt: new Date().toISOString() };
  }
}

let cachedStore: SamsStore | null = null;
let cachedModePg: boolean | null = null;

export function getStore(): SamsStore {
  const usePg = isPostgresConfigured();
  if (!cachedStore || cachedModePg !== usePg) {
    cachedModePg = usePg;
    cachedStore = usePg ? new PostgresSamsStore() : new CatalogFallbackStore();
  }
  return cachedStore;
}
