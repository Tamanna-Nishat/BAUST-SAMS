-- BAUST Student Application Management System (SAMS)
-- PostgreSQL Schema Migration 002: Persistent Document Storage (Cloud Run safe)

ALTER TABLE application_documents
  ADD COLUMN IF NOT EXISTS file_data BYTEA;
