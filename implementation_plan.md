# Objectives
The primary goal is to fully align the entire codebase with the existing `schema.prisma` architecture and the `AGENTS.md` rules.
This specifically focuses on two vital modifications:
1. **Prisma ORM Consolidation:** Migrating any feature (e.g., `patients`, `clinical`, `settings`, `staff`, `branches`) that currently uses direct Supabase client (`supabase.from(...)`) to use the single standardized `prisma` client.
2. **Branch Isolation (`branchId`):** Consistently incorporating `branchId` in all feature fetches and mutations. Since tables like `patients`, `clinical_cases`, `inventory_items`, `users`, and `appointments` natively support `branchId`, data fetched and managed through the features needs to respect this isolation boundary alongside `clinicId`.

## User Review Required
> [!IMPORTANT]
> **Schema Inconsistencies Detected in Settings:** The current `settings/serverActions.ts` relies on raw inserts into a non-existent table named `clinic_business_hours`. The DB schema uses `branch_business_hours` configured per-branch instead! This means "Clinic Hours" are actually "Branch Hours". Updating this will inherently modify how business hours are fetched for the appointment booking UI.
> 
> **Action Required:** Please review if you are comfortable transitioning the logic so each *branch* has its own business hours, rather than a global clinic setting.

## Proposed Changes

---

### Prisma Data Access Migration & Branch Isolation 

All server action files querying the database natively via Supabase client will be rewritten using the `prisma` client. Errors will be gracefully caught following Next.js 15 Server Action patterns without leaking internal DB faults. All `select` and `where` operations will be typed against the Prisma models.

#### [MODIFY] [clinical/serverActions.ts](file:///f:/react/SmileCraft/src/features/clinical/serverActions.ts)
- Change `getPatientClinicalDataAction`, `upsertClinicalCaseAction` to use `prisma.clinical_cases`.
- Update queries to use `branchId` extracted directly from the user's current session or parameters.
- Standardize the mapping between `clinical_cases` and the frontend state utilizing robust Prisma typings.

#### [MODIFY] [patients/serverActions.ts](file:///f:/react/SmileCraft/src/features/patients/serverActions.ts)
- Replace `supabase.from("patient")` calls with `prisma.patients.findMany`, `prisma.patients.findUnique`, etc.
- In queries, enforce `where: { clinicId, branchId }` (as a user only has access to patients within their active branch).
- Map the Prisma model results back to the required UI types natively.

#### [MODIFY] [settings/serverActions.ts](file:///f:/react/SmileCraft/src/features/settings/serverActions.ts)
- Migrate `clinic_notification_settings` to `prisma.clinic_notification_settings` (which is a 1-to-1 with `Clinic`).
- Rewrite `business_hours` fetching / saving to leverage the `branch_business_hours` table using the active active user's `branchId`.
- Migrate `services` management to `prisma.services`.
- Standardize the bootstrapper `getClinicId` to also assert and return the user's `branchId` using `prisma.users`.

#### [MODIFY] [staff/serverActions.ts](file:///f:/react/SmileCraft/src/features/staff/serverActions.ts)
- Convert all internal queries (`staff`, `users` table inserts) to `prisma.staff` and `prisma.users`.
- Bind new staff strictly to the requesting Admin's `branchId`, or optionally accept a param.

#### [MODIFY] [branches/serverActions.ts](file:///f:/react/SmileCraft/src/features/branches/serverActions.ts)
- Migrate branch fetching (`getBranchesAction`), switching (`switchBranchAction`), and creating (`createBranchAction`) to use `prisma.clinic_branches`.

#### [MODIFY] [inventory/serverActions.ts](file:///f:/react/SmileCraft/src/features/inventory/serverActions.ts)
- Since this is already conditionally using Prisma, we will patch it to enforce the `where: { branchId }` isolate, to prevent items bleeding over to other branches during queries.

## Open Questions
> [!WARNING]
> **Data Migration for Existing Records:**
> Applying `branchId` stringently moving forward means any existing rows in `patients`, `clinical_cases`, or `users` that have `branchId = null` might disappear from the lists. Do you want an auto-fix mechanism (similar to how `branches/serverActions` auto-fixes branch assignment) to auto-assign orphaned records to the default branch, or should we leave them alone and strictly query via `branchId`?

## Verification Plan

### Automated Tests
- Run `npx tsc --noEmit` locally to ensure there are no TypeScript discrepancies mapping between the Prisma generated client and the application types.

### Manual Verification
1. Login to the application and navigate between features (Patients, Clinical, Inventory).
2. Validate that data fetches appropriately and gracefully returns empty states where standard data doesn't exist.
3. Validate that switching branches isolates patients, appointments, and inventory.
