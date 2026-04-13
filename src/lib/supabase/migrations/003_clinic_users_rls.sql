-- =============================================================================
-- SmileCraft CMS — Row Level Security for Clinic and users tables
-- Migration: 003_clinic_users_rls.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper function: returns clinicId for the current authenticated user
-- SECURITY DEFINER = bypasses RLS, prevents infinite recursion on users table
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth_clinic_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT "clinicId" FROM users WHERE id = auth.uid()::text LIMIT 1
$$;

-- ---------------------------------------------------------------------------
-- 1. Clinic table RLS
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS "Clinic" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinic_select_own_clinic" ON "Clinic";
DROP POLICY IF EXISTS "clinic_insert_admin" ON "Clinic";
DROP POLICY IF EXISTS "clinic_update_admin" ON "Clinic";
DROP POLICY IF EXISTS "clinic_delete_admin" ON "Clinic";

-- SELECT: Users can view their own clinic
CREATE POLICY "clinic_select_own_clinic"
  ON "Clinic"
  FOR SELECT
  TO authenticated
  USING (
    id = auth_clinic_id()
  );

-- INSERT: ADMIN or bootstrap (no user row yet)
CREATE POLICY "clinic_insert_admin"
  ON "Clinic"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
    OR NOT EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text
    )
  );

-- UPDATE: ADMIN only, own clinic
CREATE POLICY "clinic_update_admin"
  ON "Clinic"
  FOR UPDATE
  TO authenticated
  USING (
    id = auth_clinic_id()
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- DELETE: ADMIN only, own clinic
CREATE POLICY "clinic_delete_admin"
  ON "Clinic"
  FOR DELETE
  TO authenticated
  USING (
    id = auth_clinic_id()
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );


-- ---------------------------------------------------------------------------
-- 2. users table RLS
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_own_clinic" ON users;
DROP POLICY IF EXISTS "users_insert_admin" ON users;
DROP POLICY IF EXISTS "users_update_own_or_admin" ON users;
DROP POLICY IF EXISTS "users_delete_admin" ON users;

-- SELECT: Same clinic as current user
CREATE POLICY "users_select_own_clinic"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    "clinicId" = auth_clinic_id()
    OR id = auth.uid()::text
  );

-- INSERT: ADMIN or self-insert during bootstrap
CREATE POLICY "users_insert_admin"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
    OR id = auth.uid()::text
  );

-- UPDATE: Own record OR ADMIN in same clinic
CREATE POLICY "users_update_own_or_admin"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()::text
    OR (
      role = 'ADMIN'
      AND "clinicId" = auth_clinic_id()
    )
  );

-- DELETE: ADMIN in same clinic
CREATE POLICY "users_delete_admin"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users AS cu
      WHERE cu.id = auth.uid()::text
        AND cu.role = 'ADMIN'
        AND cu."clinicId" = users."clinicId"
    )
  );
