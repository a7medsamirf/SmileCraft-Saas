# Sidebar User Title Enhancement Summary

## Overview
Updated the Sidebar to display dynamic user titles based on their staff role and specialty, supporting two scenarios:
1. **Doctor with specialty**: Shows actual specialty (e.g., "تقويم", "علاج جذور")
2. **Staff member with role**: Shows translated job title (e.g., "موظف استقبال", "محاسب")

---

## Changes Made

### 1. New Helper Function: `resolveUserStaffInfo()`

**File**: `src/lib/supabase-utils.ts`

```typescript
export async function resolveUserStaffInfo(): Promise<{ 
  specialty?: string | null; 
  role?: string | null; 
} | null>
```

**Purpose**: 
- Fetches both `specialty` and `role` from the staff table
- Links via `userId` field (auth user → staff record)
- Returns both values for flexible display logic

**Logic**:
```
Auth User (supabase.auth)
    ↓ (user.id)
users table (user.id, user.role)
    ↓ (users.id = staff.userId)
staff table (staff.specialty, staff.role)
    ↓
Return { specialty, role }
```

---

### 2. Updated Dashboard Layout

**File**: `src/app/[locale]/(dashboard)/layout.tsx`

**Changes**:
- Now fetches `userStaffInfo` using `resolveUserStaffInfo()`
- Passes both `userSpecialty` and `userRole` to Sidebar

```typescript
const [userName, userStaffInfo, clinicInfo] = await Promise.all([
  resolveUserFullName(),
  resolveUserStaffInfo(),
  getClinicInfoAction(),
]);

<Sidebar
  userName={userName}
  userSpecialty={userStaffInfo?.specialty}
  userRole={userStaffInfo?.role}
  // ... other props
/>
```

---

### 3. Enhanced Sidebar Component

**File**: `src/components/shared/Sidebar.tsx`

**New Props**:
```typescript
{
  userName?: string | null;
  userSpecialty?: string | null;  // NEW
  userRole?: string | null;       // NEW
  // ... other props
}
```

**Display Logic**:
```tsx
<span className="text-xs text-slate-500">
  {(() => {
    // Priority 1: If specialty exists → it's a doctor → show specialty
    if (userSpecialty) {
      return userSpecialty;
    }
    // Priority 2: If role exists → translate the role
    if (userRole) {
      const roleKey = userRole.toLowerCase();
      return t(`roles.${roleKey}`) || t("drTitle");
    }
    // Priority 3: Fallback to generic title
    return t("drTitle");
  })()}
</span>
```

---

### 4. Added Role Translations

#### Arabic (`src/locales/ar.json`):
```json
{
  "Sidebar": {
    "roles": {
      "doctor": "طبيب أسنان",
      "assistant": "مساعد طبيب",
      "receptionist": "موظف استقبال",
      "accountant": "محاسب"
    }
  }
}
```

#### English (`src/locales/en.json`):
```json
{
  "Sidebar": {
    "roles": {
      "doctor": "Dentist",
      "assistant": "Dental Assistant",
      "receptionist": "Receptionist",
      "accountant": "Accountant"
    }
  }
}
```

---

## Display Logic Flow

```
User has specialty?
    ↓ YES
  Show specialty directly (e.g., "تقويم", "علاج جذور")
    ↓ NO
User has role?
    ↓ YES
  Translate role (e.g., "receptionist" → "موظف استقبال")
    ↓ NO
  Show fallback title (e.g., "طبيب أسنان متخصص")
```

---

## Examples

### Scenario 1: Doctor with Specialty
**Database**:
```
users: { id: "abc123", fullName: "د. أحمد", role: "DOCTOR" }
staff: { userId: "abc123", specialty: "تقويم الأسنان", role: "DOCTOR" }
```

**Display**:
```
د. أحمد
تقويم الأسنان
```

---

### Scenario 2: Staff Member (Receptionist)
**Database**:
```
users: { id: "def456", fullName: "محمد علي", role: "RECEPTIONIST" }
staff: { userId: "def456", specialty: null, role: "RECEPTIONIST" }
```

**Display (Arabic)**:
```
محمد علي
موظف استقبال
```

**Display (English)**:
```
Mohamed Ali
Receptionist
```

---

### Scenario 3: Staff Member (Accountant)
**Database**:
```
users: { id: "ghi789", fullName: "فاطمة أحمد", role: "ACCOUNTANT" }
staff: { userId: "ghi789", specialty: null, role: "ACCOUNTANT" }
```

**Display (Arabic)**:
```
فاطمة أحمد
محاسب
```

**Display (English)**:
```
Fatima Ahmed
Accountant
```

---

### Scenario 4: Fallback (No specialty, no role)
**Database**:
```
users: { id: "jkl012", fullName: "مستخدم جديد", role: "ADMIN" }
staff: { userId: null }  // No staff record
```

**Display**:
```
مستخدم جديد
طبيب أسنان متخصص
```

---

## Files Modified

1. **`src/lib/supabase-utils.ts`** - Added `resolveUserStaffInfo()` function
2. **`src/app/[locale]/(dashboard)/layout.tsx`** - Fetch and pass staff info
3. **`src/components/shared/Sidebar.tsx`** - Enhanced display logic with role translations
4. **`src/locales/ar.json`** - Added role translations (doctor, assistant, receptionist, accountant)
5. **`src/locales/en.json`** - Added role translations

---

## Key Features

✅ **Dynamic Display**: Automatically shows specialty for doctors, role for staff  
✅ **Full Localization**: All roles translated in both Arabic and English  
✅ **Fallback Support**: Graceful fallback to generic title when data is missing  
✅ **Type-Safe**: Full TypeScript support with proper nullable types  
✅ **Performance**: Single query to fetch both specialty and role  
✅ **Maintainable**: Clear priority logic (specialty → role → fallback)  

---

## Testing Checklist

- [x] TypeScript compilation passes (0 errors)
- [x] Helper function returns both specialty and role
- [x] Layout fetches and passes staff info
- [x] Sidebar displays specialty when available
- [x] Sidebar translates role when no specialty
- [x] Sidebar shows fallback title when both missing
- [x] Arabic translations added for all roles
- [x] English translations added for all roles
- [x] RTL layout support maintained

---

**Date**: 2025-04-10  
**Status**: ✅ Complete  
**TypeScript**: ✅ No errors  
**Localization**: ✅ Arabic & English
