export type UserRole = 'student' | 'staff' | 'admin';

export const APPLICATION_STATUSES = [
  'Draft',
  'Submitted',
  'Under Review',
  'Awaiting Student Information',
  'Forwarded',
  'Pending Decision',
  'Approved',
  'Rejected',
  'Completed',
  'Withdrawn',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const QUESTION_STATUSES = ['Unanswered', 'In Progress', 'Answered'] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

export interface StaffPermissions {
  can_review: boolean;
  can_forward: boolean;
  can_request_info: boolean;
  can_approve: boolean;
  can_reject: boolean;
  can_answer_questions: boolean;
  can_manage_guidelines: boolean;
  can_access_medical: boolean;
}

export const DEFAULT_STUDENT_PERMISSIONS: StaffPermissions = {
  can_review: false,
  can_forward: false,
  can_request_info: false,
  can_approve: false,
  can_reject: false,
  can_answer_questions: false,
  can_manage_guidelines: false,
  can_access_medical: false,
};

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  baustId?: string;
  department?: string;
  batchSemester?: string;
  phone?: string;
  officeId?: string;
  officeName?: string;
  designation?: string;
  permissions: StaffPermissions;
  isActive: boolean;
  createdAt: string;
}

export interface Office {
  id: string;
  code: string;
  name: string;
  buildingLocation: string;
  email: string;
  phone: string;
  headTitle: string;
  description: string;
  isActive: boolean;
}

export interface DynamicFieldSpec {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'date' | 'number';
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface RequiredDocumentSpec {
  id: string;
  name: string;
  description: string;
  allowedTypes: ('PDF' | 'JPG' | 'PNG')[];
  maxSizeMb: number;
  isRequired: boolean;
  isMedicalSensitive: boolean;
}

export interface ApplicationCategory {
  id: string;
  slug: string;
  code: string;
  name: string;
  shortDescription: string;
  defaultOfficeId: string;
  defaultOfficeName: string;
  feeBdt: number;
  processingDays: number;
  deadlineText: string;
  eligibility: string;
  submissionInstructions: string;
  isActive: boolean;
  dynamicFields: DynamicFieldSpec[];
  requiredDocuments: RequiredDocumentSpec[];
}

export interface Guideline {
  id: string;
  categoryId: string;
  categoryName: string;
  title: string;
  summary: string;
  eligibilityDetails: string;
  submissionSteps: string[];
  deadlineNote: string;
  feeNote: string;
  contactOfficeId: string;
  contactOfficeName: string;
  contactEmail: string;
  contactPhone: string;
  updatedAt: string;
  updatedByName: string;
}

export interface ApplicationDocument {
  id: string;
  applicationId: string;
  docSpecId: string;
  docSpecName: string;
  originalFilename: string;
  storedFilename: string;
  mimeType: string;
  sizeBytes: number;
  isMedicalSensitive: boolean;
  uploadedById: string;
  uploadedAt: string;
}

export interface ApplicationHistory {
  id: string;
  applicationId: string;
  previousStatus: ApplicationStatus | null;
  newStatus: ApplicationStatus;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  actorOfficeName?: string;
  targetOfficeName?: string;
  remarks: string;
  createdAt: string;
}

export interface Application {
  id: string;
  applicationCode: string;
  studentId: string;
  studentName: string;
  studentBaustId: string;
  studentDepartment: string;
  studentBatchSemester: string;
  studentEmail: string;
  studentPhone: string;
  categoryId: string;
  categoryName: string;
  assignedOfficeId: string;
  assignedOfficeName: string;
  status: ApplicationStatus;
  subject: string;
  formData: Record<string, string>;
  remarks: string;
  decisionSummary?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  documents: ApplicationDocument[];
  history: ApplicationHistory[];
}

export interface Question {
  id: string;
  questionCode: string;
  studentId: string;
  studentName: string;
  studentBaustId: string;
  categoryId?: string;
  categoryName?: string;
  applicationId?: string;
  applicationCode?: string;
  assignedOfficeId: string;
  assignedOfficeName: string;
  subject: string;
  questionText: string;
  status: QuestionStatus;
  answerText?: string;
  answeredById?: string;
  answeredByName?: string;
  answeredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FaqItem {
  id: string;
  categoryId?: string;
  categoryName?: string;
  question: string;
  answer: string;
  isPublished: boolean;
  sortOrder: number;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  linkPath: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole | 'system';
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt: string;
}

export interface SystemSettings {
  universityName: string;
  shortName: string;
  campusLocation: string;
  academicSemester: string;
  supportEmail: string;
  supportPhone: string;
  maxUploadSizeMb: number;
  allowNewRegistrations: boolean;
}
