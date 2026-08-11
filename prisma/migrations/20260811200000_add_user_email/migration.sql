-- ============================================================
-- Migration: 20260811200000_add_user_email
-- Adds email column to users table as a nullable unique field.
-- Nullable so existing production rows are not blocked.
-- After all user emails are back-filled, the column can be
-- tightened to NOT NULL in a subsequent migration.
-- ============================================================

ALTER TABLE "users" ADD COLUMN "email" TEXT;

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
