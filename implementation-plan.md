هوضح الـ implementation plan كاملاً مع التعديلات:

Implementation Plan — Prisma Migration & Branch Isolation
Pre-Implementation Decisions (Resolved)
القرارالاختيار المحددBusiness HoursPer-Branch مستقلة عبر branch_business_hoursOrphaned RecordsAuto-Assign للـ Default Branch + LoggingBranch Switch AuthValidate إن اليوزر مربوط بالـ Branch قبل السويتش

Objectives
الهدف الأساسي هو محاذاة الـ codebase بالكامل مع schema.prisma وقواعد AGENTS.md، وده بيشمل:

Prisma ORM Consolidation: ترحيل أي feature لا تزال تستخدم Supabase client مباشرة (supabase.from(...)) للـ standardized Prisma client.
Branch Isolation (branchId): تطبيق branchId بشكل متسق في كل fetches وmutations.

Resolved Schema Issue

clinic_business_hours ❌ — جدول غير موجود في الـ schema
✅ القرار النهائي: كل branch ليها ساعات عمل مستقلة عبر branch_business_hours. الـ Settings UI هيتعدل ليعكس "Branch Hours" بدل "Clinic Hours". الـ Appointment Booking UI هياخد ساعات الـ branch الـ active للـ logged-in user.

Execution Order

1. settings/serverActions.ts ← يحسم business_hours أولاً
2. branches/serverActions.ts ← الباقي بيعتمد عليه
3. patients/serverActions.ts
4. clinical/serverActions.ts
5. staff/serverActions.ts
6. inventory/serverActions.ts ← partial Prisma أصلاً، الأسهل

Proposed Changes

1. settings/serverActions.ts
   التعديلات:

ترحيل clinic_notification_settings إلى prisma.clinic_notification_settings
حذف أي منطق يستخدم clinic_business_hours
إضافة fetch/save لـ branch_business_hours باستخدام branchId من session اليوزر الحالي
ترحيل services إلى prisma.services
تحديث getClinicId bootstrapper ليرجع clinicId و branchId معاً من prisma.users

typescript// قبل
const { data } = await supabase.from("clinic_business_hours")...

// بعد
const hours = await prisma.branch_business_hours.findMany({
where: { branchId, clinicId }
})

2. branches/serverActions.ts
   التعديلات:

ترحيل getBranchesAction إلى prisma.clinic_branches.findMany
ترحيل createBranchAction إلى prisma.clinic_branches.create
تعديل switchBranchAction:

typescript// إضافة validation جديدة
async function switchBranchAction(branchId: string) {
const user = await prisma.users.findUnique({
where: { id: userId },
include: { clinic_branches: true }
})

// ✅ التعديل الجديد — التحقق من صلاحية الـ branch
const hasAccess = user.clinic_branches.some(b => b.id === branchId)
if (!hasAccess) {
throw new Error("Unauthorized: User does not have access to this branch")
}

// إكمال السويتش بعد التحقق
}

3. patients/serverActions.ts
   التعديلات:

استبدال supabase.from("patient") بـ prisma.patients.findMany / findUnique
تطبيق where: { clinicId, branchId } في كل queries
إضافة Auto-Assign mechanism:

typescript// ✅ التعديل الجديد — معالجة الـ orphaned records
async function autoAssignOrphanedPatients(clinicId: string, defaultBranchId: string) {
const orphaned = await prisma.patients.findMany({
where: { clinicId, branchId: null }
})

if (orphaned.length > 0) {
await prisma.patients.updateMany({
where: { clinicId, branchId: null },
data: { branchId: defaultBranchId }
})

    // ✅ Logging
    console.log(`[AUTO-ASSIGN] ${orphaned.length} patients assigned to branch ${defaultBranchId}`)
    // أو اكتب في audit log table لو موجودة

}
}

4. clinical/serverActions.ts
   التعديلات:

ترحيل getPatientClinicalDataAction وupsertClinicalCaseAction إلى prisma.clinical_cases
استخراج branchId من session اليوزر وتطبيقه في كل queries
نفس Auto-Assign لـ orphaned clinical cases:

typescriptasync function autoAssignOrphanedClinicalCases(clinicId: string, defaultBranchId: string) {
const orphaned = await prisma.clinical_cases.findMany({
where: { clinicId, branchId: null }
})

if (orphaned.length > 0) {
await prisma.clinical_cases.updateMany({
where: { clinicId, branchId: null },
data: { branchId: defaultBranchId }
})
console.log(`[AUTO-ASSIGN] ${orphaned.length} clinical cases assigned to branch ${defaultBranchId}`)
}
}

5. staff/serverActions.ts
   التعديلات:

ترحيل كل queries إلى prisma.staff وprisma.users
ربط الـ staff الجديد بـ branchId الخاص بالـ Admin الطالب

typescriptasync function createStaffAction(data: CreateStaffInput) {
const admin = await prisma.users.findUnique({ where: { id: adminId } })

await prisma.staff.create({
data: {
...data,
branchId: admin.branchId, // ✅ ربط تلقائي بـ branch الـ admin
clinicId: admin.clinicId
}
})
}

6. inventory/serverActions.ts
   التعديلات (أبسط الملفات):

تطبيق where: { branchId } في كل queries الموجودة لمنع data bleeding

typescript// قبل
const items = await prisma.inventory_items.findMany({
where: { clinicId }
})

// بعد
const items = await prisma.inventory_items.findMany({
where: { clinicId, branchId } // ✅ إضافة branchId
})

Verification Plan

1. TypeScript Check
   bashnpx tsc --noEmit
2. Branch Isolation Tests (جديد)
   ✅ تأكد إن Branch A مش شايفة patients أو inventory الخاصة بـ Branch B
   ✅ تأكد إن switchBranch بيرفض لو اليوزر مش مربوط بالـ branch
   ✅ تأكد إن business hours بتتغير لما تسويتش branch
3. Orphaned Records Tests (جديد)
   ✅ تأكد إن auto-assign بيشتغل صح على patients و clinical_cases
   ✅ تأكد إن الـ log بيظهر عدد الـ records الـ assigned
   ✅ تأكد إن مفيش records بـ branchId = null بعد الـ migration
4. Manual Verification
   ✅ Login وتنقل بين Features (Patients, Clinical, Inventory)
   ✅ تأكد إن البيانات بتعرض صح وbranch isolation شغال
   ✅ تأكد إن Appointment Booking بياخد branch hours الصح
   ✅ تأكد إن Settings بتعرض "Branch Hours" مش "Clinic Hours"

Risk Notes
الخطرالتخفيفAppointment Booking UI ممكن يتأثر بتغيير Business Hoursاختبار manual شامل بعد settings migrationOrphaned records كتيرة تبطئ الـ auto-assignتشغيل الـ migration في one-time script مش في runtimeBranch switch بدون validation كان security holeتم إضافة الـ authorization check
