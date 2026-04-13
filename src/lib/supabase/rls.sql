-- =============================================================================
-- SmileCraft CMS — Row Level Security (RLS) for `appointments` table
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New Query).
--
-- Context:
--   • Prisma creates columns with camelCase names (no @map), so Supabase
--     PostgREST and RLS policies reference them as "clinicId", "patientId", etc.
--   • The `users` table stores each user's "clinicId".
--   • auth.uid() returns the UUID that matches users.id (Supabase Auth user id).
--   • All policies scope data to the user's own clinic — full multi-tenant isolation.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. ENABLE ROW LEVEL SECURITY
--    Must be the first step. Without this, all rows are visible to anyone.
-- ---------------------------------------------------------------------------
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. Deny-all by default
--    Best practice: start with no access, then grant explicitly via policies.
--    (Supabase's default when RLS is enabled is already deny-all, but being
--    explicit makes intent clear for code reviewers.)
-- ---------------------------------------------------------------------------
-- No explicit DENY policy needed; RLS blocks all access not covered by a policy.


-- ---------------------------------------------------------------------------
-- 3. Helper: reusable inline subquery
--    Returns the clinicId of the currently authenticated user.
--    Cast auth.uid() to text because our users.id is a text column (Prisma cuid).
-- ---------------------------------------------------------------------------
-- Usage inside policies:
--   (SELECT "clinicId" FROM users WHERE id = auth.uid()::text LIMIT 1)


-- ---------------------------------------------------------------------------
-- 4. SELECT policy — Clinic members can only read their own clinic's appointments
-- ---------------------------------------------------------------------------
CREATE POLICY "appointments_select_own_clinic"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (
    "clinicId" = (
      SELECT "clinicId"
      FROM   users
      WHERE  id = auth.uid()::text
      LIMIT  1
    )
  );


-- ---------------------------------------------------------------------------
-- 5. INSERT policy — Users can only create appointments for their own clinic
-- ---------------------------------------------------------------------------
CREATE POLICY "appointments_insert_own_clinic"
  ON appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "clinicId" = (
      SELECT "clinicId"
      FROM   users
      WHERE  id = auth.uid()::text
      LIMIT  1
    )
  );


-- ---------------------------------------------------------------------------
-- 6. UPDATE policy — Users can only update appointments in their clinic
--    USING = which rows they can target
--    WITH CHECK = what values are allowed after the update
-- ---------------------------------------------------------------------------
CREATE POLICY "appointments_update_own_clinic"
  ON appointments
  FOR UPDATE
  TO authenticated
  USING (
    "clinicId" = (
      SELECT "clinicId"
      FROM   users
      WHERE  id = auth.uid()::text
      LIMIT  1
    )
  )
  WITH CHECK (
    "clinicId" = (
      SELECT "clinicId"
      FROM   users
      WHERE  id = auth.uid()::text
      LIMIT  1
    )
  );


-- ---------------------------------------------------------------------------
-- 7. DELETE policy — Restricted to ADMIN role only
--    Regular doctors / receptionists cannot hard-delete appointments.
-- ---------------------------------------------------------------------------
CREATE POLICY "appointments_delete_admin_only"
  ON appointments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   users
      WHERE  id        = auth.uid()::text
        AND  "clinicId" = appointments."clinicId"
        AND  role      = 'ADMIN'
    )
  );


-- ---------------------------------------------------------------------------
-- 8. ENABLE REALTIME for the appointments table
--    Required for Supabase Realtime postgres_changes to fire.
--    Run this AFTER enabling RLS — Realtime respects RLS policies automatically.
-- ---------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;


-- ---------------------------------------------------------------------------
-- 9. (OPTIONAL BUT RECOMMENDED) — Index on clinicId for RLS performance
--    RLS policies run a subquery on every row; this index makes it fast.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_appointments_clinicId
  ON appointments ("clinicId");

CREATE INDEX IF NOT EXISTS idx_appointments_date_clinicId
  ON appointments ("clinicId", date);


-- ---------------------------------------------------------------------------
-- 10. Apply the same RLS pattern to the `patients` table
--     (shown here as a reference template)
-- ---------------------------------------------------------------------------
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patients_select_own_clinic"
  ON patients
  FOR SELECT
  TO authenticated
  USING (
    "clinicId" = (
      SELECT "clinicId" FROM users WHERE id = auth.uid()::text LIMIT 1
    )
  );

CREATE POLICY "patients_insert_own_clinic"
  ON patients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "clinicId" = (
      SELECT "clinicId" FROM users WHERE id = auth.uid()::text LIMIT 1
    )
  );

CREATE POLICY "patients_update_own_clinic"
  ON patients
  FOR UPDATE
  TO authenticated
  USING (
    "clinicId" = (
      SELECT "clinicId" FROM users WHERE id = auth.uid()::text LIMIT 1
    )
  )
  WITH CHECK (
    "clinicId" = (
      SELECT "clinicId" FROM users WHERE id = auth.uid()::text LIMIT 1
    )
  );
