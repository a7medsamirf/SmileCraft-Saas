-- ============================================================================
-- SmileCraft CMS — Clinic Branches RLS Policies
-- Adds Row Level Security for clinic_branches table
-- ============================================================================

-- Enable RLS on clinic_branches
ALTER TABLE clinic_branches ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies for clinic_branches
-- ============================================================================

-- Users can view branches from their clinic only
CREATE POLICY "clinic_branches_select_own_clinic"
ON clinic_branches
FOR SELECT
USING (
  "clinicId" IN (
    SELECT "clinicId" FROM users WHERE id = auth.uid()::text LIMIT 1
  )
);

-- Users can only create branches for their clinic
CREATE POLICY "clinic_branches_insert_own_clinic"
ON clinic_branches
FOR INSERT
WITH CHECK (
  "clinicId" IN (
    SELECT "clinicId" FROM users WHERE id = auth.uid()::text LIMIT 1
  )
);

-- Users can only update branches from their clinic
CREATE POLICY "clinic_branches_update_own_clinic"
ON clinic_branches
FOR UPDATE
USING (
  "clinicId" IN (
    SELECT "clinicId" FROM users WHERE id = auth.uid()::text LIMIT 1
  )
)
WITH CHECK (
  "clinicId" IN (
    SELECT "clinicId" FROM users WHERE id = auth.uid()::text LIMIT 1
  )
);

-- Only ADMIN users can delete branches
CREATE POLICY "clinic_branches_delete_admin_only"
ON clinic_branches
FOR DELETE
USING (
  "clinicId" IN (
    SELECT "clinicId" FROM users 
    WHERE id = auth.uid()::text 
    AND role = 'ADMIN'
    LIMIT 1
  )
);

-- Enable Realtime for clinic_branches
ALTER PUBLICATION supabase_realtime ADD TABLE clinic_branches;

-- ============================================================================
-- Update existing table RLS policies to include branch filtering
-- ============================================================================

-- Patients: Users can only access patients in their branch (if branch is set)
DROP POLICY IF EXISTS "patients_select_own_clinic" ON patients;

CREATE POLICY "patients_select_own_branch"
ON patients
FOR SELECT
USING (
  "clinicId" IN (
    SELECT "clinicId" FROM users WHERE id = auth.uid()::text LIMIT 1
  )
  AND (
    -- If user has a branch, only see patients in that branch
    -- If user has no branch, see all patients in the clinic
    (
      SELECT "branchId" FROM users WHERE id = auth.uid()::text LIMIT 1
    ) IS NULL
    OR "branchId" = (
      SELECT "branchId" FROM users WHERE id = auth.uid()::text LIMIT 1
    )
  )
);

-- Appointments: Users can only access appointments in their branch
DROP POLICY IF EXISTS "appointments_select_own_clinic" ON appointments;

CREATE POLICY "appointments_select_own_branch"
ON appointments
FOR SELECT
USING (
  "clinicId" IN (
    SELECT "clinicId" FROM users WHERE id = auth.uid()::text LIMIT 1
  )
  AND (
    (
      SELECT "branchId" FROM users WHERE id = auth.uid()::text LIMIT 1
    ) IS NULL
    OR "branchId" = (
      SELECT "branchId" FROM users WHERE id = auth.uid()::text LIMIT 1
    )
  )
);

-- Clinical cases: Branch-level filtering
DROP POLICY IF EXISTS "clinical_cases_select" ON clinical_cases;

CREATE POLICY "clinical_cases_select_own_branch"
ON clinical_cases
FOR SELECT
USING (
  "clinicId" IN (
    SELECT "clinicId" FROM users WHERE id = auth.uid()::text LIMIT 1
  )
  AND (
    (
      SELECT "branchId" FROM users WHERE id = auth.uid()::text LIMIT 1
    ) IS NULL
    OR "branchId" = (
      SELECT "branchId" FROM users WHERE id = auth.uid()::text LIMIT 1
    )
  )
);

-- ============================================================================
-- Performance indexes for branch queries
-- ============================================================================

-- Add index on patients for branch filtering
CREATE INDEX IF NOT EXISTS idx_patients_branch ON patients("branchId");

-- Add index on appointments for branch filtering
CREATE INDEX IF NOT EXISTS idx_appointments_branch ON appointments("branchId");

-- Add index on clinical_cases for branch filtering
CREATE INDEX IF NOT EXISTS idx_clinical_cases_branch ON clinical_cases("branchId");
