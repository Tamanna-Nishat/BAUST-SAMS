# BAUST Student Application Management System (SAMS)

A full-stack university web portal built for **Bangladesh Army University of Science and Technology (BAUST), Saidpur** to digitize student application procedures, document verification, staff Q&A, office-based routing, and audit-logged status tracking.

## Features & Modules

- **F1: Student Discovery & Guidelines** — Searchable application categories, eligibility rules, fee notes (BDT), deadlines, required document specifications, and office contact directories.
- **F2: Online Application Submission** — Dynamic category forms, pre-filled student profile details, Multer PDF/JPG/PNG uploads (max 5 MB), required document validation, draft saving, application preview, and unique Tracking ID generation (`BAUST-YYYY-XXXX`).
- **F3: Student Question & Answer** — Questions linked to application categories or specific Tracking IDs, office-routed staff responses, question statuses (`Unanswered`, `In Progress`, `Answered`), notifications, and public FAQ management.
- **F4: Application Tracking & Staff Dashboard** — Office-scoped queues, 10 exact application statuses (`Draft`, `Submitted`, `Under Review`, `Awaiting Student Information`, `Forwarded`, `Pending Decision`, `Approved`, `Rejected`, `Completed`, `Withdrawn`), permanent timestamped history records, granular staff permission enforcement, confidential medical document access restriction, audit logs, and CSV/printable reports.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, React Router, Lucide React
- **Backend**: Node.js, Express.js, TypeScript, Multer, Zod, bcrypt, HMAC-SHA256 `HttpOnly` cookie sessions
- **Database**: PostgreSQL (`pg` parameterized queries, SQL migrations & seed scripts) with an automatic server-side JSON store fallback when PostgreSQL environment variables are omitted in local/preview sandboxes.

## Setup & Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Copy `.env.example` to `.env` and fill in your PostgreSQL credentials (leave `PGHOST` blank to run with the built-in server store fallback):
   ```env
   PORT=3000
   PGHOST=localhost
   PGPORT=5432
   PGDATABASE=baust_sams
   PGUSER=postgres
   PGPASSWORD=your_postgres_password
   PGSSL=false
   ```

3. **Run PostgreSQL migrations & seed data** (when using PostgreSQL):
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   The full-stack server runs on `http://localhost:3000`.

5. **Production build & start**:
   ```bash
   npm run build
   npm start
   ```

## First-Run Administrator & Demo Preview

- On first launch with an empty database, navigate to `/login` and click **Claim Admin Setup** to securely create the initial Administrator account (password hashed with `bcrypt`). Once claimed, the bootstrap endpoint automatically locks.
- Students can self-register at `/register`, and administrators can create Staff accounts with office assignments and granular permissions in `/admin/users`.
- An isolated **Demo Preview Mode** is also available from the Landing and Login pages to explore Student, Registrar Staff, Medical Officer, and Administrator workflows with sample BAUST records.
