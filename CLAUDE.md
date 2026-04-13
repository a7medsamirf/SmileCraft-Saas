<!-- BEGIN:nextjs-agent-rules -->
@AGENTS.md

# 🦷 SmileCraft CMS — Context Snapshot
**Date:** April 6, 2026
**Status:** ✅ Prisma + Supabase Initialized - Ready for Migration

---

## 🏗️ Technical Stack
- **Framework**: Next.js 16 (App Router) + React 19.
- **Styling**: Tailwind CSS 4.2 (Glassmorphism, CSS Variables).
- **Localization**: `next-intl` (Arabic/English, RTL/LTR support).
- **Theming**: `next-themes` (Dark/Light mode via Sidebar).
- **Animations**: `framer-motion` (Spring indicators, Page transitions).
- **Type Safety**: Strict TypeScript (Branded primitives and defineRouting).
- **React Hook Form**: Utilized for form state management and validation.
- **Zod**: Data validation and parsing.
- **Database & BaaS**: ✅ Supabase (PostgreSQL) - Configured & Connected.
- **ORM**: ✅ Prisma Client v5.11 - Schema defined with 12 models.
- **Authentication**: Supabase Auth (pending integration with Next.js Middleware).
- **Backend Architecture**: Next.js Server Actions (`useActionState`) communicating directly with Supabase via Prisma Client. No external Node/Laravel API needed.
- **State Management**: `useClient` for local state, React 19 Actions for mutations.
- **Error Handling**: Comprehensive error logging and user feedback via Zod & Prisma Error Codes.

---

## ⚠️ Critical Gaps & Known Issues

> هذا القسم يُحدَّث باستمرار. يجب مراجعته قبل البدء في أي task.

### 🔴 Critical — Must Fix Before Production

1. **Auth Middleware غير مفعّل**: الـ RBAC موجود في الـ UI فقط. لا توجد حماية حقيقية على الـ routes — أي مستخدم يقدر يفتح `/dashboard/*` مباشرة بدون login. يجب تفعيل `middleware.ts` مع Supabase Auth session check.

2. **Database Migration لم تُنفَّذ بعد**: الـ Prisma schema معرَّف بالكامل لكن `npx prisma migrate dev` لم يُشغَّل — الـ DB فارغ حتى الآن.

3. **Server Actions ناقصة في 7 modules**: Finance, Settings, Staff, Inventory, Dashboard, Billing, Calendar — كلها تعمل على mock data فقط.

4. **لا يوجد `clinicId` على الـ models**: إذا كان الـ SaaS مستقبلاً سيخدم أكثر من عيادة، يجب إضافة `clinicId` على كل entity الآن قبل أول migration — إضافته لاحقاً تعني migration معقدة جداً.

### 🟡 Important — Fix in Phase 2-3

5. **لا يوجد Rate Limiting أو API Protection**: الـ Server Actions مكشوفة لـ abuse. يُنصح بـ Upstash Redis أو Vercel Edge Middleware.

6. **لا يوجد Error Boundary / Global Error UI**: Zod موجود للـ validation لكن مفيش fallback UI لما الـ Server Action يفشل في production.

7. **File Upload غير مدعوم**: لا توجد integration مع Supabase Storage لصور المرضى، X-rays، أو ملفات PDF. الـ schema لا يحتوي على media fields.

8. **لا يوجد Audit Log / Activity Trail**: متطلب شبه قانوني في أنظمة إدارة العيادات — يجب تسجيل مَن عدَّل ماذا ومتى.

### 🟠 Schema Issues — راجع قبل Migration

9. **`MedicalHistory` كـ embedded JSON في `Patient`**: سيصعّب أي query من نوع "كل المرضى عندهم ضغط" أو filtering متقدم. يُفضَّل جدول منفصل بـ `type` و `value`.

10. **`MouthMap` / Odontogram في JSONB**: مناسب للقراءة والكتابة الكاملة، لكن غير قابل للـ analytics. قرار واعٍ، لكن يجب توثيقه.

11. **العلاقة بين `Staff` و `User` غير واضحة**: هل الدكتور هو `User` ذو role أم `Staff` record منفصل؟ يجب توحيد القرار قبل بناء الـ Server Actions.

### 🔵 Missing Modules — للخطة المستقبلية

12. **لا يوجد Prescription / وصفة طبية**: Basic جداً لأي نظام عيادات — طباعة وصفة مرتبطة بالـ Treatment.

13. **لا يوجد Waiting Room / Queue Management**: شاشة الـ Receptionist لمعرفة دور المرضى الحاليين.

14. **لا يوجد Patient Portal**: المريض لا يستطيع رؤية appointments أو invoices الخاصة به.

15. **Backup & Data Recovery strategy غير موجودة**: الـ Data Export في الـ Settings هو manual فقط — لا توجد automated backup policy.

---

## 📦 Modules Progress

### 👥 Patients Module (100% UI - Pending DB)
- ✅ Full Desktop/Mobile Profile Layout.
- ✅ Medical History with Severity Alerts & In-place Editing.
- ✅ Treatment Timeline (Visual history of visits).
- ✅ **New Patient Intake Form**: Localized 3-step wizard with medical questionnaire.
- 🔄 **Persistence**: Migrating from `localStorage` (`patientService`) to Prisma/Supabase.

### 💸 Finance & Billing (100% UI - Pending DB)
- ✅ Universal Currency Formatting (EGP/ج.م).
- ✅ **Optimistic Payments**: Adding payments updates balance instantly.
- ✅ **Daily Revenue Widget**: Grouped by payment method (Cash/Card/Wallet).
- ✅ **Monthly Analytical Dashboard**: High-end charts for revenue and procedure tracking.
- ✅ **Print Support**: Semantic `@media print` layout for reports.

### 📅 Calendar & Appointments (100% UI - Pending DB)
- ✅ Full Interactive Monthly Grid with RTL Support.
- ✅ Client-side State Management (Date selection & Agenda sync).
- ✅ **Dynamic Agenda**: Polished "Glass-card" UI with localized date formatting.
- ✅ **Stable Re-fetching**: Optimized `useEffect` with stringified date dependencies.
- ✅ **Booking Form Modal**: Full appointment booking form with server action integration.

### 🦷 Clinical Module (100% UI - Pending DB)
- ✅ **Anatomical Odontogram**: Interactive teeth map with distinct SVG shapes.
- ✅ **Plan Builder**: Automated procedure generation and cost estimation.
- ✅ **Session Progress Tracking**: 3-state smart checkboxes per treatment item.
- ✅ **Optimistic Odontogram Sync**: `useOptimistic` changes tooth color instantly.
- 🔄 **Clinical Persistence**: Moving Odontogram state to JSONB columns in Supabase via Prisma.
- ✅ **Invoice Mode Dialog**: "Full plan" vs. "Completed items only" selection when converting to invoice.
- ✅ **Progress Bar**: Visual treatment completion percentage on the Plan Builder.
- ✅ **Completion History Timeline**: Mini timeline showing recent status changes with timestamps.
- ✅ **Patient Search Component**: Real-time filter by name/phone from mock data with animated dropdown (Framer Motion).
- ✅ **Patient Mini-Profile Card**: Compact card above Odontogram showing name, age, phone, city, blood group, allergies, and medical alerts.
- ✅ **Per-Patient Teeth Data**: Each mock patient has unique MouthMap data loaded on selection (`patientTeeth.mock.ts`).
- ✅ **Empty State UX**: Welcome message with search prompt when no patient is selected; Odontogram hidden.
- ✅ **Color Override System**: `ToothVisual` accepts `colorOverride` prop with glow ring SVG effect for completed treatments.

### 📊 Dashboard (100% UI - Pending DB)
- ✅ **Stats Grid**: 4 KPI cards.
- ✅ **Weekly Revenue Chart**: CSS bar chart.
- ✅ **Procedures Breakdown**: CSS donut chart.
- ✅ **Recent Activity Feed**: Timeline of last 5 clinic events.

### 🌐 Landing Page (100%)
- ✅ **Design**: Dark Mode Only (Slate-950) + Glassmorphism + Framer Motion animations.
- ✅ **Components**: Fully styled and responsive.

### 🔐 Auth Pages (100% UI - Pending DB Integration)
- ✅ **Login Page**: Split-screen dark design.
- 🔄 **Auth Integration**: Wiring up `loginAction.ts` to use Supabase Auth instead of mock credentials.



### ⚙️ Settings & Optimization (✅ 100% UI - Pending DB)
- ✅ **Glass-card UI**: Standardized premium aesthetics across Permissions and Service lists.
- ✅ **Permissions Matrix**: Role-based access control UI (localized).
- ✅ **Services Management**: Filterable service list with pricing and categorization.
- ✅ **Clinic Hours**: Working hours configuration.
- ✅ **Notification Settings**: Alert preferences.
- ✅ **Data Export**: Export functionality.

### 👨‍⚕️ Staff Management (✅ 100% UI - Pending DB)
- ✅ **Staff Profiles**: Name, specialty, certifications.
- ✅ **Staff Scheduling**: Interactive calendar.
- ✅ **Leave Management**: Leave tracking.
- ✅ **Payroll Management**: Salary tracking.

### 📦 Inventory (✅ 100% UI - Pending DB)
- ✅ **Inventory List**: Track consumables.
- ✅ **Inventory Form**: Add/edit items.
- ✅ **Stock Alerts**: Low-stock notifications.
- ✅ **Expiry Tracking**: Expiration date management.

---

## 🛠️ Key Architectural Patterns
1. **Full-Stack Next.js**: Eradicating external APIs. Next.js App Router handles both UI and Backend Logic using Prisma + Supabase.
2. **React 19 Actions**: Heavy use of `useActionState` and `useOptimistic`.
3. **Database Communication**: Strictly using Prisma Client inside Server Actions. Never expose direct database calls to the Client Components.
4. **Data Persistence**: Moving entirely away from `localStorage`.
5. **Premium Visuals**: Glassmorphism and Tailwind 4 variables for a modern high-end feel.
6. **Route Groups**: `(dashboard)` for app, `(front-end)` for landing, `(auth)` for login.

---

## 🚀 Recommended Next Steps (Ordered by Priority)

1. **🔴 Auth Middleware**: فعّل `middleware.ts` — protect all `/dashboard/*` routes using Supabase Auth session. هذا الأهم على الإطلاق.
2. **🔴 Schema Review**: حدد العلاقة بين `Staff` و `User`، وقرر إضافة `clinicId` للـ multi-tenant support، وافصل `MedicalHistory` لجدول مستقل — كل هذا قبل `migrate dev`.
3. **🔴 Run Migration**: بعد مراجعة الـ schema، شغّل `npx prisma migrate dev --name init`.
4. **🟡 Replace LocalStorage**: Refactor `patientService` و `clinicalService` to use Prisma queries.
5. **🟡 Build Server Actions**: ابدأ بـ Patients ثم Appointments ثم Finance.
6. **🟡 Rate Limiting**: أضف Upstash Redis أو Vercel Edge rate limiting على الـ Server Actions.
7. **🟢 File Upload**: Supabase Storage integration للصور والملفات الطبية.
8. **🟢 Audit Log**: جدول `AuditLog` يسجل كل mutation مع `userId`, `action`, `entityType`, `entityId`, `timestamp`.

---

💡 Assistant Memory (Added for Claude/Qwen/AI Agents)
- **Tech Stack Rule**: YOU MUST use Prisma for database operations. DO NOT write raw SQL. DO NOT use `@supabase/supabase-js` for database CRUD unless strictly necessary for Auth or Storage.
- **RTL Preference**: When generating CSS, strictly avoid `right-` or `left-`. Use `inset-inline-end` / `inset-inline-start` for floating elements.
- **Component Style**: Prefer functional components with TypeScript interfaces defined above the component.
- **Environment**: You are working with a Senior Developer. Keep explanations technical, concise, and skip basic Next.js tutorials.
- **Multi-tenant Warning**: Schema currently has NO `clinicId`. If multi-clinic support is planned, add it to ALL models before first migration.
- **MedicalHistory Warning**: Currently embedded JSON in Patient — do NOT run complex queries against it. Consider migrating to a separate table.
- **Auth Warning**: Middleware is NOT active. Dashboard routes are currently unprotected. Do NOT deploy to production before fixing this.

---

## ✅ Current Complete Modules

| Module | Status | Notes |
|--------|--------|---------|
| 👥 Patients | 100% UI | Full profile + Medical history + New intake wizard |
| 💸 Finance & Billing | 100% UI | Multi-currency (EGP) + Daily / Monthly reports |
| 📅 Calendar & Appointments | 100% UI | Interactive RTL calendar + Booking form modal |
| 🦷 Clinical | 100% UI | Interactive teeth map + Session tracking + Patient search + Optimistic UI |
| 📊 Dashboard | 100% UI | 8 widgets: Revenue chart, Procedures, Quick Actions, Inventory, Activity, Birthdays, Lab, Balances |
| 🌐 Landing Page | 100% | 9-component dark SaaS landing with Framer Motion |
| 🔐 Auth (Login) | 100% UI | Split-screen dark design + Server Action + Zod validation — **DB integration pending** |
| ⚙️ Settings | 100% UI | Permissions, Services, Clinic Hours, Notifications, Data Export |
| 👨‍⚕️ Staff | 100% UI | Profiles, Scheduling, Leave Management, Payroll |
| 📦 Inventory | 100% UI | Stock tracking, Alerts, Expiry management |
| 🗄️ Database | ✅ Schema ready | Prisma schema with 12 models, Supabase connected — **migration not yet run** |

---

## 🔥 Recommended Additions (Priority-Based)

### 1️⃣ **Technical Infrastructure Upgrade** - *🔄 In Progress*
```typescript
// Status: Prisma + Supabase Initialized — migration pending
- ✅ Prisma Schema with 12 models (Users, Patients, Appointments, Treatments, etc.)
- ✅ Supabase PostgreSQL connection configured
- ⚠️  Schema needs review (clinicId, MedicalHistory, Staff↔User relation) before migration
- 🔄 Next: Review schema → run migration → build Server Actions
```

### 2️⃣ **Settings Module** - *✅ 100% UI Complete*
```typescript
// Components ready:
- ✅ Permissions Matrix: Role-based access (Admin/Doctor/Reception)
- ✅ Services Management: Filterable list with pricing & categories
- ✅ Clinic Settings: Name, address, working hours, appointment slots
- ✅ Notification Settings
- ✅ Data Export functionality
```

### 3️⃣ **Staff Management** - *✅ 100% UI Complete*
```typescript
// Components ready:
- ✅ Staff Profiles (Name, Specialty, Certifications)
- ✅ Staff Scheduling with interactive calendar
- ✅ Leave Management & daily availability
- ✅ Payroll & salary tracking
```

### 4️⃣ **Inventory & Supplies Management** - *✅ 100% UI Complete*
```typescript
// Components ready:
- ✅ Track consumables (Anesthetics, Threads, Sterilization supplies)
- ✅ Low-stock alerts with notifications
- ✅ Expiration date tracking
- ✅ Stock reports by product
```

### 5️⃣ **Notifications & Reminders** - *Missing*
```typescript
// To Add:
- 🔔 Automated SMS/WhatsApp reminders 24h before appointments
- 📱 Push Notifications for schedule changes
- ✉️ Appointment confirmation from patients
```

### 6️⃣ **Advanced Analytics & Reporting** - *Marked as Next Steps*
```typescript
// Development:
- 📈 Reports by Specialty (Root Canal, Cosmetic...)
- 💰 ROI per Procedure (Cost vs. Revenue)
- ⏱️  Average procedure time + wait times
- 🔍 Doctor Performance Analysis (Cases/Reviews)
```

### 7️⃣ **External Integrations** - *Missing*
```typescript
// To Add:
- 🏥 Insurance Company Integration (Step-by-step setup)
- 📞 CRM System for customer management
- 🌐 Third-party booking portal integration
```

### 8️⃣ **User Experience Improvements** - *Ongoing Development*
```typescript
// Enhancements:
- ✅ Full Dark Mode Implementation (via next-themes)
- 📱 Mobile-responsive UI optimization
- ✅ Advanced Search for patients (Clinical Module patient search)
- 💾 Data Export/Import (Excel/PDF formats)
```

### 9️⃣ **Security & Compliance** - *Missing — High Priority*
```typescript
// To Add:
- 🔒 Auth Middleware protecting all /dashboard/* routes (CRITICAL)
- 🛡️  Rate Limiting on Server Actions (Upstash Redis / Vercel Edge)
- 📋 Audit Log table (userId, action, entityType, entityId, diff, timestamp)
- 🔑 Row-Level Security (RLS) policies on Supabase tables
```

### 🔟 **Missing Clinical Features** - *Medium Priority*
```typescript
// To Add:
- 📄 Prescription / وصفة طبية module (print-ready, linked to Treatment)
- ⏳ Waiting Room / Queue Management screen for Receptionist
- 🖼️  File Upload: X-rays, patient photos, PDF reports (Supabase Storage)
```

---

## 📋 Suggested Roadmap (Revised)

| Phase | Priority | Tasks |
|-------|----------|---------|
| **Phase 1** | ✅ Done | Prisma Schema Setup + Supabase DB Connection |
| **Phase 2** | 🔴 Critical | Auth Middleware → Schema Review → Run Migration → Core Server Actions (Patients, Appointments) |
| **Phase 3** | 🔴 Critical | Remaining Server Actions (Finance, Staff, Inventory, Settings) + Rate Limiting |
| **Phase 4** | 🟡 High | Audit Log + File Upload (Supabase Storage) + RLS Policies |
| **Phase 5** | 🟡 High | Notifications (SMS/WhatsApp) + Real-time Sync (Supabase Realtime) |
| **Phase 6** | 🟢 Medium | Prescription Module + Waiting Room + Advanced Analytics |
| **Phase 7** | 🟢 Medium | Patient Portal + External Integrations + Insurance |

---

## 💡 Important Technical Notes

```typescript
// ✅ Good Practices Currently Used:
- React 19 Actions (useOptimistic) for instant feedback.
- Unified Glassmorphism design system.
- Framer Motion AnimatePresence for smooth state transitions.

// ⚠️  Watch Out For:
- Never query MedicalHistory JSONB with complex filters — consider migrating to a separate table.
- Staff↔User relationship must be clarified before building any HR Server Actions.
- All Server Actions must validate the user's session and role before executing any DB operation.
- Use `revalidatePath()` or `revalidateTag()` after every mutation — never rely on stale cache.
```

---

## 📁 Key File Paths

```
src/
├── app/
│   └── [locale]/
│       ├── (auth)/
│       │   ├── layout.tsx
│       │   ├── logoutAction.ts
│       │   └── login/                 → Login page + loginAction.ts
│       ├── (dashboard)/
│       │   ├── layout.tsx
│       │   ├── template.tsx
│       │   ├── not-found.tsx
│       │   ├── appointments/          → Appointments page + BookingForm modal
│       │   ├── billing/               → Billing management
│       │   ├── calendar/              → Calendar view
│       │   ├── clinical/              → Clinical module (Odontogram)
│       │   ├── dashboard/             → Main dashboard with 8 widgets
│       │   ├── finance/               → Financial management
│       │   ├── inventory/             → Inventory management
│       │   ├── patients/              → Patient management
│       │   ├── settings/              → System settings
│       │   └── staff/                 → Staff management
│       ├── (front-end)/
│       │   └── landing/               → Landing page
│       ├── [...not_found]/            → Catch-all not found route
│       ├── globals.css
│       ├── layout.tsx
│       ├── template.tsx
│       └── not-found.tsx
├── components/
│   ├── Settings/
│   │   ├── LoadingOverlay.tsx
│   │   ├── LocaleSwitcher.tsx
│   │   ├── ThemeProviderWrapper.tsx
│   │   ├── ThemeSwitcher.tsx
│   │   └── TransitionEffect.tsx
│   ├── shared/
│   │   └── Sidebar.tsx            → Main navigation sidebar
│   ├── SharesComponent/
│   │   ├── Button.tsx
│   │   ├── DashboardCard.tsx
│   │   ├── Logo.tsx
│   │   ├── MotionWrapper.tsx
│   │   ├── Pagination.tsx
│   │   ├── SectionHrader.tsx
│   │   └── StarRating.tsx
│   └── ui/
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── CustomButton.tsx
│       └── Input.tsx
├── constant/
│   └── button-variants.ts         → Button variant configurations
├── features/
│   ├── appointments/
│   │   ├── index.ts
│   │   ├── actions/               → Server actions for appointments
│   │   ├── components/            → DailyAgenda, BookingForm, CalendarGrid
│   │   ├── services/              → Appointment service layer
│   │   └── types/                 → TypeScript types for appointments
│   ├── calendar/
│   │   ├── index.ts
│   │   └── components/            → Calendar components
│   ├── clinical/
│   │   ├── index.ts
│   │   ├── actions.ts             → Clinical server actions
│   │   ├── components/            → Odontogram, PatientSearch, PlanBuilder
│   │   ├── hooks/                 → Custom React hooks
│   │   ├── mock/                  → Mock data for development
│   │   ├── services/              → Clinical service layer
│   │   └── types/                 → TypeScript types for clinical
│   ├── dashboard/
│   │   └── components/            → 10 widgets (Stats, Revenue, Procedures, etc.)
│   ├── finance/
│   │   ├── index.ts
│   │   ├── components/            → Payments, DailyRevenue, MonthlyDashboard
│   │   ├── mock/                  → Mock financial data
│   │   └── types/                 → TypeScript types for finance
│   ├── inventory/
│   │   ├── components/            → Inventory management UI
│   │   ├── services/              → Inventory service layer
│   │   └── types/                 → TypeScript types for inventory
│   ├── landing/
│   │   ├── index.ts
│   │   ├── landing.css            → Landing page styles
│   │   └── components/            → 9 landing page sections
│   ├── patients/
│   │   ├── index.ts
│   │   ├── actions.ts             → Patient server actions
│   │   ├── components/            → Profile, MedicalHistory, IntakeWizard
│   │   ├── constants/             → Patient-related constants
│   │   ├── hooks/                 → Custom React hooks
│   │   ├── mock/                  → Mock patient data
│   │   ├── services/              → Patient service layer
│   │   └── types/                 → TypeScript types for patients
│   ├── settings/
│   │   ├── components/            → Permissions, Services management
│   │   ├── hooks/                 → Custom React hooks
│   │   └── types/                 → TypeScript types for settings
│   └── staff/
│       ├── components/            → Staff management UI
│       ├── services/              → Staff service layer
│       └── types/                 → TypeScript types for staff
├── i18n/
│   ├── request.ts                 → i18n request configuration
│   └── routing.ts                 → Routing configuration for locales
├── lib/
│   ├── prisma.ts                  → Prisma Client singleton
│   ├── utils.ts                   → Utility functions
│   └── utils/
│       └── id.ts                  → ID generation utilities
├── locales/
│   ├── ar.json                    → Arabic translations
│   └── en.json                    → English translations
└── middleware.ts                  → Next.js middleware for auth & routing ⚠️ NOT YET ACTIVE
```

---

## 🎯 Summary

SmileCraft CMS is a comprehensive dental clinic management SaaS with **10 complete modules**, a **professional dark-themed landing page**, and a **split-screen auth system**. The dashboard includes **10 intelligent widgets** covering revenue, procedures, inventory, lab tracking, patient CRM, and more. All UI is fully RTL Arabic with premium Glassmorphism aesthetics.

**Current State**: All UI is complete and functional with mock data. The system is NOT production-ready — Auth Middleware, DB Migration, and Server Actions are the three blocking items.

---

## 🗄️ Database Schema (Prisma)

**12 Models Implemented:**

1. **User** - System users with role-based access (Admin/Doctor/Receptionist/Assistant)
2. **Patient** - Patient profiles with medical history, mouth map, allergies
3. **Appointment** - Scheduling with status tracking and doctor assignment
4. **Treatment** - Clinical procedures with tooth mapping and status tracking
5. **Payment** - Financial transactions with multiple payment methods
6. **Invoice** - Billing with line items and payment tracking
7. **InvoiceItem** - Invoice line items linked to treatments
8. **Service** - Procedure catalog with pricing and categories
9. **InventoryItem** - Stock management with expiry tracking
10. **Staff** - Employee records with payroll ⚠️ *relationship with User model needs clarification*
11. **Notification** - System notifications and alerts
12. **MedicalHistory** - ⚠️ *Currently embedded JSON in Patient — consider separate table for queryability*

**Recommended additions before first migration:**
- `AuditLog` model — `(id, userId, action, entityType, entityId, diff: Json, createdAt)`
- `clinicId` field on all models — if multi-tenant support is planned
- `MediaFile` model — for Supabase Storage references (X-rays, photos, PDFs)

**Next Step:** Review schema → then run:
```bash
npx prisma migrate dev --name init
```