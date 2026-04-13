ALTER TABLE IF EXISTS "Clinic" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-runnability)
DROP POLICY IF EXISTS "clinic_select_own_clinic" ON "Clinic";
DROP POLICY IF EXISTS "clinic_insert_admin" ON "Clinic";
DROP POLICY IF EXISTS "clinic_update_admin" ON "Clinic";
DROP POLICY IF EXISTS "clinic_delete_admin" ON "Clinic";

-- SELECT: Users can view their own clinic (via users table linkage)
CREATE POLICY "clinic_select_own_clinic"
  ON "Clinic"
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT "clinicId" FROM users WHERE id = auth.uid()::text
    )
  );

-- INSERT: Only ADMIN users can create clinics
CREATE POLICY "clinic_insert_admin"
  ON "Clinic"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
    OR
    -- Allow insert if user doesn't exist yet (bootstrap scenario during signup)
    NOT EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()::text
    )
  );

-- UPDATE: Only ADMIN users can update their own clinic
CREATE POLICY "clinic_update_admin"
  ON "Clinic"
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT "clinicId" FROM users WHERE id = auth.uid()::text
    )
    AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- DELETE: Only ADMIN users can delete their own clinic
CREATE POLICY "clinic_delete_admin"
  ON "Clinic"
  FOR DELETE
  TO authenticated
  USING (
    id IN (
      SELECT "clinicId" FROM users WHERE id = auth.uid()::text
    )
    AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
  );


-- ---------------------------------------------------------------------------
-- 2. users table RLS
--    Users can view their own record and other users in their clinic.
--    INSERT/UPDATE/DELETE restricted to ADMIN role.
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-runnability)
DROP POLICY IF EXISTS "users_select_own_clinic" ON users;
DROP POLICY IF EXISTS "users_insert_admin" ON users;
DROP POLICY IF EXISTS "users_update_own_or_admin" ON users;
DROP POLICY IF EXISTS "users_delete_admin" ON users;

-- SELECT: Users can view other users in their clinic
CREATE POLICY "users_select_own_clinic"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    "clinicId" = (
      SELECT "clinicId" FROM users WHERE id = auth.uid()::text LIMIT 1
    )
    OR
    id = auth.uid()::text
  );

-- INSERT: Only ADMIN users can create users (or during bootstrap)
CREATE POLICY "users_insert_admin"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text AND role = 'ADMIN'
    )
    OR
    -- Allow self-insert during bootstrap (user creating their own record)
    id = auth.uid()::text
  );

-- UPDATE: Users can update their own record, ADMIN can update others in clinic
CREATE POLICY "users_update_own_or_admin"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()::text
    OR
    EXISTS (
      SELECT 1 FROM users AS current_user
      WHERE current_user.id = auth.uid()::text
        AND current_user.role = 'ADMIN'
        AND current_user."clinicId" = users."clinicId"
    )
  );

-- DELETE: Only ADMIN users can delete users in their clinic
CREATE POLICY "users_delete_admin"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users AS current_user
      WHERE current_user.id = auth.uid()::text
        AND current_user.role = 'ADMIN'
        AND current_user."clinicId" = users."clinicId"
    )
  );
