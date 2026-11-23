import dotenv from 'dotenv';
import { getPgPool } from './pool.ts';
import {
  SEED_CATEGORIES,
  SEED_FAQS,
  SEED_GUIDELINES,
  SEED_OFFICES,
  SEED_SETTINGS,
} from './seedData.ts';

dotenv.config();

async function seedDatabase() {
  const pool = getPgPool();

  await pool.query(
    `INSERT INTO system_settings (id, university_name, short_name, campus_location, academic_semester, support_email, support_phone, max_upload_size_mb, allow_new_registrations)
     VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET
       university_name = EXCLUDED.university_name,
       short_name = EXCLUDED.short_name,
       campus_location = EXCLUDED.campus_location,
       academic_semester = EXCLUDED.academic_semester,
       support_email = EXCLUDED.support_email,
       support_phone = EXCLUDED.support_phone,
       max_upload_size_mb = EXCLUDED.max_upload_size_mb,
       allow_new_registrations = EXCLUDED.allow_new_registrations`,
    [
      SEED_SETTINGS.universityName,
      SEED_SETTINGS.shortName,
      SEED_SETTINGS.campusLocation,
      SEED_SETTINGS.academicSemester,
      SEED_SETTINGS.supportEmail,
      SEED_SETTINGS.supportPhone,
      SEED_SETTINGS.maxUploadSizeMb,
      SEED_SETTINGS.allowNewRegistrations,
    ]
  );

  for (const office of SEED_OFFICES) {
    await pool.query(
      `INSERT INTO offices (id, code, name, building_location, email, phone, head_title, description, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
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
  }

  for (const cat of SEED_CATEGORIES) {
    await pool.query(
      `INSERT INTO application_categories (id, slug, code, name, short_description, default_office_id, fee_bdt, processing_days, deadline_text, eligibility, submission_instructions, dynamic_fields, required_documents, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14)
       ON CONFLICT (id) DO NOTHING`,
      [
        cat.id,
        cat.slug,
        cat.code,
        cat.name,
        cat.shortDescription,
        cat.defaultOfficeId,
        cat.feeBdt,
        cat.processingDays,
        cat.deadlineText,
        cat.eligibility,
        cat.submissionInstructions,
        JSON.stringify(cat.dynamicFields),
        JSON.stringify(cat.requiredDocuments),
        cat.isActive,
      ]
    );
  }

  for (const guide of SEED_GUIDELINES) {
    await pool.query(
      `INSERT INTO guidelines (id, category_id, title, summary, eligibility_details, submission_steps, deadline_note, fee_note, contact_office_id, contact_email, contact_phone, updated_at, updated_by_name)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO NOTHING`,
      [
        guide.id,
        guide.categoryId,
        guide.title,
        guide.summary,
        guide.eligibilityDetails,
        JSON.stringify(guide.submissionSteps),
        guide.deadlineNote,
        guide.feeNote,
        guide.contactOfficeId,
        guide.contactEmail,
        guide.contactPhone,
        guide.updatedAt,
        guide.updatedByName,
      ]
    );
  }

  for (const faq of SEED_FAQS) {
    await pool.query(
      `INSERT INTO faqs (id, category_id, question, answer, is_published, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [faq.id, faq.categoryId ?? null, faq.question, faq.answer, faq.isPublished, faq.sortOrder]
    );
  }

  console.log('BAUST SAMS PostgreSQL catalog seed completed.');
  await pool.end();
}

seedDatabase().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
