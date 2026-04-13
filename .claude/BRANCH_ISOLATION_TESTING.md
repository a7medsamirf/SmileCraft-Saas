# Branch Isolation Testing Guide

## Overview

This guide provides a systematic approach to testing branch isolation in SmileCraft CMS. Branch isolation ensures that users can only access data from their assigned branch, preventing data leakage between branches in multi-branch clinics.

---

## 🎯 What is Branch Isolation?

Branch isolation ensures:
- ✅ Users only see patients from their branch
- ✅ Users only see appointments from their branch
- ✅ Users only see inventory from their branch
- ✅ Users only see clinical cases from their branch
- ✅ Users cannot switch to branches they don't have access to
- ✅ Cross-branch data bleeding is prevented

---

## 🔍 Implementation Status

All Server Actions now include `branchId` filtering:

| Module | CREATE | READ | UPDATE | DELETE | Status |
|--------|--------|------|--------|--------|--------|
| **Patients** | ✅ | ✅ | ✅ | ✅ | Complete |
| **Appointments** | ✅ | ✅ | ✅ | ✅ | Complete |
| **Clinical** | ✅ | ✅ | ✅ | ✅ | Complete |
| **Staff** | ✅ | ✅ | ✅ | ✅ | Complete |
| **Inventory** | ✅ | ✅ | ✅ | ✅ | Complete |
| **Branches** | ✅ | ✅ | ✅ | ✅ | Complete |

---

## 🧪 Manual Testing Scenarios

### Prerequisites

1. **Create a Clinic with 2 Branches**:
   - Branch A: "الفرع الرئيسي" (Main Branch)
   - Branch B: "فرع التجمع" (New Branch)

2. **Create 2 Test Users**:
   - User A: Assigned to Branch A
   - User B: Assigned to Branch B

3. **Test Data Setup**:
   - Create patients in Branch A
   - Create patients in Branch B
   - Create inventory items in both branches
   - Create appointments in both branches

---

### Test 1: Branch Switching

**Objective**: Verify users can only switch to their assigned branches.

**Steps**:
1. Login as User A
2. Use BranchSwitcher to switch to Branch B
3. **Expected Result**: Should fail with "Unauthorized: User does not have access to this branch"

**Pass Criteria**: ✅ Cannot switch to unauthorized branches

---

### Test 2: Patient Data Isolation

**Objective**: Verify users only see patients from their branch.

**Steps**:
1. Login as User A (Branch A)
2. Navigate to `/dashboard/patients`
3. Note the patient list
4. Login as User B (Branch B)
5. Navigate to `/dashboard/patients`
6. Note the patient list

**Expected Result**: 
- User A sees only Branch A patients
- User B sees only Branch B patients
- No overlap between lists

**Pass Criteria**: ✅ Patient lists are completely separate

---

### Test 3: Appointment Data Isolation

**Objective**: Verify users only see appointments from their branch.

**Steps**:
1. Login as User A
2. Create appointment for Patient A1 (Branch A patient)
3. Navigate to `/dashboard/appointments`
4. Login as User B
5. Navigate to `/dashboard/appointments`

**Expected Result**:
- User A sees their appointment for Patient A1
- User B does NOT see User A's appointments

**Pass Criteria**: ✅ Appointments are branch-scoped

---

### Test 4: Inventory Data Isolation

**Objective**: Verify users only see inventory from their branch.

**Steps**:
1. Login as User A
2. Create inventory item "Item A" (should be scoped to Branch A)
3. Navigate to `/dashboard/inventory`
4. Login as User B
5. Navigate to `/dashboard/inventory`
6. Create inventory item "Item B" (should be scoped to Branch B)

**Expected Result**:
- User A sees only "Item A"
- User B sees only "Item B"
- No cross-branch visibility

**Pass Criteria**: ✅ Inventory items are branch-scoped

---

### Test 5: Clinical Cases Isolation

**Objective**: Verify clinical cases are isolated by branch.

**Steps**:
1. Login as User A
2. Navigate to `/dashboard/clinical`
3. Select Patient A1
4. Add clinical case
5. Login as User B
6. Try to access Patient A1's clinical data (if possible)

**Expected Result**:
- User B should NOT be able to access Patient A1
- Clinical cases are only visible to the creating branch

**Pass Criteria**: ✅ Clinical data is branch-scoped

---

### Test 6: Cross-Branch Operations Prevention

**Objective**: Verify Server Actions prevent cross-branch operations.

**Steps**:
1. Login as User A
2. Get Patient A1's ID from the URL
3. Logout, Login as User B
4. Try to manually access `/dashboard/patients/{Patient_A1_ID}`
5. Try to create appointment for Patient A1 via the booking form

**Expected Result**:
- System should show "Patient not found or access denied"
- No data from Branch A visible to Branch B user

**Pass Criteria**: ✅ Cross-branch operations blocked

---

### Test 7: Branch Switch Validation

**Objective**: Verify branch switching updates data view correctly.

**Steps**:
1. Login as Admin user with access to both branches
2. Switch to Branch A
3. Note patient count
4. Switch to Branch B
5. Note patient count

**Expected Result**:
- Patient counts should differ (if branches have different patients)
- Data should refresh after switch
- No cached data from previous branch

**Pass Criteria**: ✅ Branch switch updates all data correctly

---

### Test 8: Orphaned Records Auto-Assignment

**Objective**: Verify orphaned records (without branchId) are auto-assigned.

**Steps**:
1. Login as Admin
2. Access database directly (Supabase Dashboard or Prisma Studio)
3. Create a patient with `branchId = NULL`
4. Login as any user with a branch assigned
5. Navigate to `/dashboard/patients`
6. Check if the orphaned patient was auto-assigned

**Expected Result**:
- Orphaned patient should be auto-assigned to the user's branch
- Patient should now be visible to that branch's users

**Pass Criteria**: ✅ Orphaned records auto-assigned correctly

---

## 🔧 Automated Testing (Future)

### Integration Test Suite

```typescript
// Example test structure
describe("Branch Isolation", () => {
  let branchA: Branch;
  let branchB: Branch;
  let userA: User;
  let userB: User;

  beforeEach(async () => {
    // Setup test data
    branchA = await createBranch({ name: "Branch A" });
    branchB = await createBranch({ name: "Branch B" });
    userA = await createUser({ branchId: branchA.id });
    userB = await createUser({ branchId: branchB.id });
  });

  it("should prevent user B from seeing user A's patients", async () => {
    // Create patient in Branch A
    const patientA = await createPatient({ 
      clinicId: clinic.id,
      branchId: branchA.id 
    });

    // Query as user B
    const patients = await getPatientsAsUser(userB);
    
    // Should NOT include Branch A patient
    expect(patients).not.toContainEqual(
      expect.objectContaining({ id: patientA.id })
    );
  });

  it("should auto-assign orphaned patients to user's branch", async () => {
    // Create orphaned patient
    const orphanedPatient = await createPatient({ 
      clinicId: clinic.id,
      branchId: null 
    });

    // Login as user with branch
    const patients = await getPatientsAsUser(userA);
    
    // Should include the orphaned patient (now assigned to Branch A)
    const patient = await getPatientById(orphanedPatient.id);
    expect(patient.branchId).toBe(branchA.id);
  });

  it("should prevent branch switching to unauthorized branches", async () => {
    // Try to switch to unauthorized branch
    const result = await switchBranch(userA, branchB.id);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });
});
```

---

## 📊 Test Results Checklist

### Manual Testing Results

- [ ] **Test 1**: Branch Switching - PASS/FAIL
- [ ] **Test 2**: Patient Data Isolation - PASS/FAIL
- [ ] **Test 3**: Appointment Data Isolation - PASS/FAIL
- [ ] **Test 4**: Inventory Data Isolation - PASS/FAIL
- [ ] **Test 5**: Clinical Cases Isolation - PASS/FAIL
- [ ] **Test 6**: Cross-Branch Operations Prevention - PASS/FAIL
- [ ] **Test 7**: Branch Switch Validation - PASS/FAIL
- [ ] **Test 8**: Orphaned Records Auto-Assignment - PASS/FAIL

### Automated Testing (When Implemented)

- [ ] Unit tests for branch filtering
- [ ] Integration tests for cross-branch operations
- [ ] E2E tests for branch switching flow

---

## 🔍 Database Verification Queries

### Check Branch Assignment

```sql
-- Verify all patients have branchId set
SELECT COUNT(*) as orphaned_patients
FROM patients
WHERE branchId IS NULL AND deletedAt IS NULL;

-- Expected: 0 (all patients should have branchId)
```

### Check Cross-Branch Data

```sql
-- Verify appointments are properly scoped
SELECT 
  a.id,
  a.branchId,
  p.branchId as patientBranchId,
  a.branchId = p.branchId as isMatching
FROM appointments a
JOIN patients p ON a.patientId = p.id
WHERE a.branchId != p.branchId;

-- Expected: 0 rows (appointments should match patient branch)
```

### Check Inventory Isolation

```sql
-- Verify inventory items are scoped to branches
SELECT 
  branchId,
  COUNT(*) as itemCount
FROM inventory_items
GROUP BY branchId;

-- Should show separate counts per branch
```

---

## 🚨 Common Issues to Watch For

### Issue 1: Missing branchId Filter

**Symptom**: Users see data from all branches
**Fix**: Ensure all queries include `where: { branchId }`

### Issue 2: Cached Data After Branch Switch

**Symptom**: Old branch data visible after switching
**Fix**: Ensure `revalidatePath()` is called after branch switch

### Issue 3: Orphaned Records Not Auto-Assigned

**Symptom**: Some records have `branchId = NULL`
**Fix**: Verify auto-assign mechanism runs on data fetch

### Issue 4: Cross-Branch Operations

**Symptom**: Users can create records for other branches
**Fix**: Validate branch ownership before creating records

---

## ✅ Sign-Off Criteria

Branch isolation testing is considered **PASS** when:

- [ ] All 8 manual tests pass
- [ ] No cross-branch data leakage detected
- [ ] Branch switching works correctly
- [ ] Orphaned records are auto-assigned
- [ ] Database verification queries show 0 violations
- [ ] Error messages are user-friendly for unauthorized access

---

**Test Date**: _____________
**Tested By**: _____________
**Result**: PASS / FAIL
**Notes**: ___________________________________

---

**Last Updated**: April 13, 2026  
**Status**: Ready for manual testing  
**Next Step**: Execute tests and document results
