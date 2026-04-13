-- =============================================================================
-- SmileCraft CMS — Treatments Table Setup
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New Query).
-- =============================================================================

-- Create treatments table if it doesn't exist
CREATE TABLE IF NOT EXISTS treatments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patientId UUID REFERENCES patients(id) ON DELETE CASCADE,
    toothNumber VARCHAR(10),
    procedureName TEXT,
    procedureType TEXT,
    cost DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'PLANNED',
    notes TEXT,
    completedAt TIMESTAMPTZ,
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    updatedAt TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_treatments_patientId ON treatments(patientId);
CREATE INDEX IF NOT EXISTS idx_treatments_status ON treatments(status);
CREATE INDEX IF NOT EXISTS idx_treatments_patient_status ON treatments(patientId, status);

-- Enable RLS
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;

-- RLS policies for treatments
CREATE POLICY IF NOT EXISTS "treatments_select_own_patient"
    ON treatments
    FOR SELECT
    TO authenticated
    USING (
        patientId IN (
            SELECT id FROM patients WHERE "clinicId" = (
                SELECT "clinicId" FROM users WHERE id = auth.uid()::text LIMIT 1
            )
        )
    );

CREATE POLICY IF NOT EXISTS "treatments_insert_own_patient"
    ON treatments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        patientId IN (
            SELECT id FROM patients WHERE "clinicId" = (
                SELECT "clinicId" FROM users WHERE id = auth.uid()::text LIMIT 1
            )
        )
    );

CREATE POLICY IF NOT EXISTS "treatments_update_own_patient"
    ON treatments
    FOR UPDATE
    TO authenticated
    USING (
        patientId IN (
            SELECT id FROM patients WHERE "clinicId" = (
                SELECT "clinicId" FROM users WHERE id = auth.uid()::text LIMIT 1
            )
        )
    );

CREATE POLICY IF NOT EXISTS "treatments_delete_own_patient"
    ON treatments
    FOR DELETE
    TO authenticated
    USING (
        patientId IN (
            SELECT id FROM patients WHERE "clinicId" = (
                SELECT "clinicId" FROM users WHERE id = auth.uid()::text LIMIT 1
            )
        )
    );

-- Invoices table (if not exists)
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patientId UUID REFERENCES patients(id) ON DELETE CASCADE,
    creatorId UUID REFERENCES auth.users(id),
    amount DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'PENDING',
    paymentMethod VARCHAR(50),
    issuedAt TIMESTAMPTZ DEFAULT NOW(),
    paidAt TIMESTAMPTZ
);

-- Enable RLS for invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoices
CREATE POLICY IF NOT EXISTS "invoices_select_own_patient"
    ON invoices
    FOR SELECT
    TO authenticated
    USING (
        patientId IN (
            SELECT id FROM patients WHERE "clinicId" = (
                SELECT "clinicId" FROM users WHERE id = auth.uid()::text LIMIT 1
            )
        )
    );

CREATE POLICY IF NOT EXISTS "invoices_insert_own_patient"
    ON invoices
    FOR INSERT
    TO authenticated
    WITH CHECK (
        patientId IN (
            SELECT id FROM patients WHERE "clinicId" = (
                SELECT "clinicId" FROM users WHERE id = auth.uid()::text LIMIT 1
            )
        )
    );

CREATE POLICY IF NOT EXISTS "invoices_update_own_patient"
    ON invoices
    FOR UPDATE
    TO authenticated
    USING (
        patientId IN (
            SELECT id FROM patients WHERE "clinicId" = (
                SELECT "clinicId" FROM users WHERE id = auth.uid()::text LIMIT 1
            )
        )
    );

-- Clinical cases table for odontogram
CREATE TABLE IF NOT EXISTS clinical_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinicId UUID,
    patientId UUID REFERENCES patients(id) ON DELETE CASCADE,
    toothNumber INTEGER,
    toothStatus VARCHAR(50),
    diagnosis TEXT,
    procedure TEXT,
    procedureKey TEXT,
    notes TEXT,
    estimatedCost DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'PLANNED',
    sessionDate DATE,
    completedAt TIMESTAMPTZ,
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    updatedAt TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for clinical_cases
ALTER TABLE clinical_cases ENABLE ROW LEVEL SECURITY;

-- RLS policies for clinical_cases
CREATE POLICY IF NOT EXISTS "clinical_cases_select_own_patient"
    ON clinical_cases
    FOR SELECT
    TO authenticated
    USING (
        patientId IN (
            SELECT id FROM patients WHERE "clinicId" = (
                SELECT "clinicId" FROM users WHERE id = auth.uid()::text LIMIT 1
            )
        )
    );

CREATE POLICY IF NOT EXISTS "clinical_cases_insert_own_clinic"
    ON clinical_cases
    FOR INSERT
    TO authenticated
    WITH CHECK (
        clinicId = (
            SELECT "clinicId" FROM users WHERE id = auth.uid()::text LIMIT 1
        )
    );

CREATE POLICY IF NOT EXISTS "clinical_cases_update_own_clinic"
    ON clinical_cases
    FOR UPDATE
    TO authenticated
    USING (
        clinicId = (
            SELECT "clinicId" FROM users WHERE id = auth.uid()::text LIMIT 1
        )
    );

CREATE POLICY IF NOT EXISTS "clinical_cases_delete_own_clinic"
    ON clinical_cases
    FOR DELETE
    TO authenticated
    USING (
        clinicId = (
            SELECT "clinicId" FROM users WHERE id = auth.uid()::text LIMIT 1
        )
    );

-- Add missing columns to patients table if needed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'treatmentHistory') THEN
        ALTER TABLE patients ADD COLUMN treatmentHistory JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'patients' AND column_name = 'mouthMap') THEN
        ALTER TABLE patients ADD COLUMN mouthMap JSONB;
    END IF;
END $$;
