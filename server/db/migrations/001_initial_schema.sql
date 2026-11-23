-- BAUST Student Application Management System (SAMS)
-- PostgreSQL Schema Migration 001

CREATE TABLE IF NOT EXISTS offices (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  building_location TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  head_title TEXT NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'staff', 'admin')),
  baust_id TEXT UNIQUE,
  department TEXT,
  batch_semester TEXT,
  phone TEXT,
  office_id TEXT REFERENCES offices(id) ON DELETE SET NULL,
  designation TEXT,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS application_categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short_description TEXT NOT NULL,
  default_office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE RESTRICT,
  fee_bdt INTEGER NOT NULL DEFAULT 0,
  processing_days INTEGER NOT NULL DEFAULT 7,
  deadline_text TEXT NOT NULL,
  eligibility TEXT NOT NULL,
  submission_instructions TEXT NOT NULL,
  dynamic_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_documents JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guidelines (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES application_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  eligibility_details TEXT NOT NULL,
  submission_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  deadline_note TEXT NOT NULL,
  fee_note TEXT NOT NULL,
  contact_office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE RESTRICT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  application_code TEXT NOT NULL UNIQUE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES application_categories(id) ON DELETE RESTRICT,
  assigned_office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN (
    'Draft',
    'Submitted',
    'Under Review',
    'Awaiting Student Information',
    'Forwarded',
    'Pending Decision',
    'Approved',
    'Rejected',
    'Completed',
    'Withdrawn'
  )),
  subject TEXT NOT NULL,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  remarks TEXT NOT NULL DEFAULT '',
  decision_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS application_documents (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  doc_spec_id TEXT NOT NULL,
  doc_spec_name TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  is_medical_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_by_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS application_history (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  actor_office_name TEXT,
  target_office_name TEXT,
  remarks TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  question_code TEXT NOT NULL UNIQUE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES application_categories(id) ON DELETE SET NULL,
  application_id TEXT REFERENCES applications(id) ON DELETE SET NULL,
  assigned_office_id TEXT NOT NULL REFERENCES offices(id) ON DELETE RESTRICT,
  subject TEXT NOT NULL,
  question_text TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Unanswered', 'In Progress', 'Answered')),
  answer_text TEXT,
  answered_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  answered_by_name TEXT,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faqs (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES application_categories(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_path TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  university_name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  campus_location TEXT NOT NULL,
  academic_semester TEXT NOT NULL,
  support_email TEXT NOT NULL,
  support_phone TEXT NOT NULL,
  max_upload_size_mb INTEGER NOT NULL DEFAULT 5,
  allow_new_registrations BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_applications_student ON applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_office ON applications(assigned_office_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_history_application ON application_history(application_id);
CREATE INDEX IF NOT EXISTS idx_questions_student ON questions(student_id);
CREATE INDEX IF NOT EXISTS idx_questions_office ON questions(assigned_office_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
