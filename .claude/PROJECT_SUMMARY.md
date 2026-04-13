# SmileCraft CMS — Complete Project Summary

> **Last Updated**: April 7, 2026

---

## 📋 Project Overview

**SmileCraft CMS** is a **dental clinic management system** built with Next.js 16, React 19, and Supabase, designed for **multi-tenant architecture** (multiple clinics). It provides comprehensive clinic management including patient records, appointments, clinical treatments (odontogram), staff management, finance, inventory, and real-time queue monitoring.

---

## 🛠️ Technology Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js 16.2.2 (App Router only) |
| **UI Library** | React 19.2.4 |
| **Styling** | Tailwind CSS 4.1.17 + SASS (legacy) |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth with SSR (`@supabase/ssr`) |
| **Forms** | React Hook Form + Zod v4.3.6 |
| **Animations** | Framer Motion 12.23.24 |
| **i18n** | next-intl 4.5.5 (Arabic/English) |
| **Theme** | next-themes (Light/Dark mode) |
| **State** | React 19 `useActionState`, `useOptimistic` |
| **Real-time** | Supabase Realtime (`postgres_changes`) |

---

## 🗄️ Database Schema (`database.types.ts`)

The project defines **8 tables** with **7 enums** in Supabase PostgreSQL:

### Tables

#### 1. `Clinic` — Root multi-tenant entity
- **Fields**: `id`, `name`, `address`, `phone`, `email`, `logoUrl`, `subscription`
- **Relationships**: Parent to all other tables via `clinicId`

#### 2. `users` — Staff accounts linked to clinics
- **Fields**: `id`, `email`, `password`, `fullName`, `phone`, `role`, `avatar`, `isActive`, `clinicId`
- **Roles**: `ADMIN`, `DOCTOR`, `RECEPTIONIST`, `ASSISTANT`

#### 3. `patients` — Patient profiles with medical data
- **Fields**: `id`, `clinicId`, `fileNumber`, `fullName`, `nationalId`, `phone`, `altPhone`, `email`, `dateOfBirth`, `gender`, `bloodGroup`, `city`, `address`, `job`, `notes`, `allergies`, `mouthMap` (JSONB), `avatar`, `isActive`, `emergencyName`, `emergencyRelationship`, `emergencyPhone`
- **Special**: `mouthMap` stores odontogram state as JSONB

#### 4. `appointments` — Scheduled visits
- **Fields**: `id`, `clinicId`, `patientId`, `userId`, `staffId`, `date`, `startTime`, `endTime`, `status`, `type`, `notes`, `reason`
- **Status**: `SCHEDULED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`
- **Real-time enabled** for live queue updates

#### 5. `clinical_cases` — Treatment encounters per tooth
- **Fields**: `id`, `clinicId`, `patientId`, `appointmentId`, `toothNumber` (1-32), `toothStatus`, `diagnosis`, `procedure`, `procedureKey`, `estimatedCost`, `status`, `sessionDate`, `completedAt`
- **Links to**: appointments (nullable), patients, clinic
- **Uses Universal Numbering System** for teeth

#### 6. `payments` — Financial transactions
- **Fields**: `id`, `clinicId`, `patientId`, `clinicalCaseId`, `amount`, `paymentMethod`, `status`, `discountPercent`, `referenceNumber`, `notes`, `paidAt`
- **Methods**: `CASH`, `CARD`, `BANK_TRANSFER`, `INSURANCE`, `OTHER`
- **Status**: `PENDING`, `PAID`, `PARTIAL`, `REFUNDED`, `CANCELLED`

#### 7. `staff_schedules` — Weekly working hours
- **Fields**: `id`, `clinicId`, `userId`, `dayOfWeek` (0-6), `startTime`, `endTime`, `isActive`
- **Used for**: appointment scheduling validation

#### 8. `medical_alerts` — Patient warnings/allergies
- **Fields**: `id`, `clinicId`, `patientId`, `title`, `description`, `severity`, `isActive`
- **Severity**: `LOW`, `MEDIUM`, `HIGH`

### Enums

| Enum | Values |
|------|--------|
| `AppointmentStatus` | `SCHEDULED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW` |
| `UserRole` | `ADMIN`, `DOCTOR`, `RECEPTIONIST`, `ASSISTANT` |
| `Gender` | `MALE`, `FEMALE`, `OTHER` |
| `TreatmentStatus` | `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `Severity` | `LOW`, `MEDIUM`, `HIGH` |
| `PaymentMethod` | `CASH`, `CARD`, `BANK_TRANSFER`, `INSURANCE`, `OTHER` |
| `PaymentStatus` | `PENDING`, `PAID`, `PARTIAL`, `REFUNDED`, `CANCELLED` |

### Row Level Security (RLS)

- **Applied to**: `appointments` and `patients` tables
- **Multi-tenant isolation**: All queries scoped by `clinicId`
- **DELETE restricted** to ADMIN role only
- **Realtime enabled** for `appointments` table

---

## 📁 Project Structure

```
src/
├── app/[locale]/                    # Next.js App Router
│   ├── layout.tsx                   # Root layout with theme + i18n
│   ├── (auth)/                      # Unprotected auth routes
│   │   ├── login/                   # Login page + action
│   │   └── signup/                  # Signup page + action
│   ├── (dashboard)/                 # Protected dashboard routes
│   │   ├── dashboard/               # Main dashboard with widgets
│   │   ├── patients/                # Patient management
│   │   ├── clinical/                # Odontogram/treatment UI
│   │   ├── calendar/                # Calendar + booking wizard
│   │   ├── appointments/            # Daily agenda + queue
│   │   │   └── queue/               # Real-time queue dashboard
│   │   ├── staff/                   # Staff management
│   │   ├── billing/                 # Finance overview
│   │   ├── finance/                 # Detailed finance
│   │   ├── inventory/               # Inventory management
│   │   └── settings/                # Clinic settings
│   └── (front-end)/                 # Public landing page
│
├── features/                        # Domain-driven feature modules (105 files)
│   ├── patients/                    (19 files)
│   ├── appointments/                (15 files)
│   ├── clinical/                    (15 files)
│   ├── dashboard/                   (10 files)
│   ├── staff/                       (9 files)
│   ├── settings/                    (9 files)
│   ├── finance/                     (8 files)
│   ├── inventory/                   (7 files)
│   ├── landing/                     (11 files)
│   └── calendar/                    (2 files)
│
├── components/                      # Shared components
│   ├── shared/                      # Sidebar, ErrorBoundary
│   ├── ui/                          # Button, Badge, Input
│   └── SharesComponent/             # Reusable UI primitives
│
├── lib/                             # Core utilities
│   ├── supabase/                    # Auth + DB clients
│   │   ├── server.ts                # Server-side Supabase client
│   │   ├── middleware.ts            # Session refresh middleware
│   │   └── rls.sql                  # RLS policies
│   ├── supabase.ts                  # Browser client
│   ├── utils.ts                     # cn() utility
│   └── apiClient.ts                 # Axios instance
│
├── i18n/                            # Internationalization
│   ├── routing.ts                   # Locale definition (ar/en)
│   └── request.ts                   # Dynamic locale loading
│
├── locales/                         # Translation files
│   ├── en.json                      # English translations
│   └── ar.json                      # Arabic translations
│
└── types/
    └── database.types.ts            # Complete Supabase type definitions
```

---

## 🔐 Authentication & Security

- **Supabase Auth** with email/password
- **Middleware** (`src/middleware.ts`) handles:
  - Session refresh via `updateSession()`
  - Route protection (unauthenticated → `/login`)
  - Authenticated user redirects (login → `/dashboard`)
  - i18n routing integration
- **Server Actions** verify auth via `createClient()` on every mutation
- **Multi-tenant guards**: All queries scoped by `clinicId`
- **RLS policies** enforce isolation at database level

---

## 🌍 Internationalization (i18n)

- **Locales**: Arabic (`ar`) — default, English (`en`)
- **Library**: `next-intl` with path-based routing (`/ar/...`, `/en/...`)
- **RTL Support**: Uses `ms-`/`me-` instead of `ml-`/`mr-`
- **Zero hardcoded strings**: All text via `useTranslations()`
- **Fonts**: El Messiri (Arabic), DM Sans (Latin), Cairo + Playfair Display (landing)

---

## 🎨 UI/UX Design

- **Glassmorphism** design with `.glass` and `.glass-card` utilities
- **Dark/Light mode** via `next-themes` with Tailwind CSS variables
- **No hardcoded colors**: All semantic CSS variables
- **Animations**: Framer Motion for page transitions and micro-interactions
- **Components**: Lucide React icons, custom Button/Badge/Input components

---

## 📊 Feature Modules

### 1. Dashboard (10 components)
- Stats grid, quick actions, weekly revenue chart
- Procedures breakdown, daily revenue, inventory alerts
- Outstanding balances, recent activity, birthday reminders, lab tracker

### 2. Patients (19 files)
- Full CRUD with server actions
- Patient list, cards, add/edit forms
- Medical alerts, treatment timeline, X-ray viewer
- Media uploader and gallery
- **Current state**: Uses mock data fallback when DB unavailable

### 3. Appointments (15 files)
- Booking form with wizard
- Daily agenda table
- Real-time queue dashboard with live updates
- Status transition management
- Calendar grid view
- **Current state**: Supabase usage, some bugs documented

### 4. Clinical (15 files)
- Odontogram visualization (32 teeth)
- Tooth case panel for treatments
- Patient search, mini profile
- Plan builder, session progress tracking
- **Current state**: Uses mock data for teeth states

### 5. Staff (9 files)
- Staff list and form
- Leave management
- Payroll tracking
- Monthly payroll generation
- **Current state**: Mock data fallback

### 6. Finance (8 files)
- Finance dashboard
- Payment tracker
- Revenue chart
- Invoice management
- **Current state**: Uses Prisma directly

### 7. Inventory (7 files)
- Inventory list and form
- Stock alerts
- **Current state**: Basic implementation

### 8. Settings (9 files)
- General settings
- Clinic hours
- Service list
- Notification settings
- Data export
- Permissions table

### 9. Landing (11 files)
- Hero, stats, features, steps sections
- Testimonials, FAQ, bottom CTA
- Navbar and footer

### 10. Calendar (2 files)
- Appointment wizard
- Client wrapper

---

## ⚠️ Current Issues & Gaps

### Critical
1. **Missing Prisma Schema**: `prisma/schema.prisma` file not found — only `database.types.ts` exists
2. **Mock Data Dependency**: Patients, Clinical, and Staff modules fall back to mock data
3. **Enum Mismatch**: UI uses `IN_PROGRESS` but Prisma defines `CONFIRMED`
4. **Field Name Bug**: `procedure` field referenced in code but Prisma defines `type`

### Pending Tasks (from `task.md`)
- [ ] Convert Patients module to Prisma Server Actions
- [ ] Convert Clinical module to Prisma Server Actions
- [ ] Convert Appointments module to Prisma Server Actions
- [ ] Add Rate Limiting (Redis/Edge)
- [ ] Supabase Storage implementation

### Known Bugs (from `implementation_plan.md`)
- `procedure` → should be `type` in appointments
- Incorrect import path in serverActions.ts
- `AppointmentStatus` enum mismatch

---

## 🔧 Development Patterns

- **Server Actions over APIs**: All DB operations via Server Actions with `useActionState`
- **Zod validation**: Client + server validation on all forms
- **React 19 patterns**: Server Components default, client components only when necessary
- **Optimistic updates**: `useOptimistic` for instant UI feedback
- **Cache management**: `revalidatePath`/`revalidateTag` after mutations
- **Error handling**: Global ErrorBoundary + toast notifications
- **Type safety**: Strict TypeScript, no `any` types

---

## 📦 Dependencies (54 total)

**Core**: Next.js, React, Tailwind, Supabase, Prisma, Zod, React Hook Form  
**UI**: Framer Motion, Lucide React, next-themes, Swiper  
**Utilities**: Axios, bcryptjs, clsx, tailwind-merge, rtl-detect, server-only  
**Dev**: TypeScript, ESLint, SASS loader, baseline-browser-mapping

---

## 🎯 Project Maturity

| Aspect | Status | Notes |
|--------|--------|-------|
| **Architecture** | ✅ Production-ready | Multi-tenant, RLS, i18n |
| **Authentication** | ✅ Complete | Middleware protection |
| **Dashboard** | ✅ Fully implemented | 10 widgets |
| **Appointments** | ⚠️ Functional | Bugs + enum mismatch |
| **Patients** | ⚠️ UI complete | Server actions use mock data |
| **Clinical** | ⚠️ UI complete | Mock data fallback |
| **Staff** | ⚠️ UI complete | Mock data fallback |
| **Finance** | ✅ Using Prisma | Direct DB access |
| **Inventory** | ⚠️ Basic | Minimal implementation |
| **Settings** | ✅ Complete | All sections |
| **Landing Page** | ✅ Complete | Full marketing site |
| **Real-time** | ⚠️ Implemented | Requires Supabase setup |
| **Database** | ⚠️ Types defined | Prisma schema missing |

---

## 📝 Summary

SmileCraft CMS is a **well-architected, production-leaning dental clinic management system** with strong foundations in Next.js 16, React 19, multi-tenant Supabase, and comprehensive i18n. 

**Key strengths**:
- Clean domain-driven architecture
- Strong type safety throughout
- Multi-tenant design with RLS
- Real-time capabilities
- Comprehensive i18n with RTL support

**Main gaps to address before production**:
1. Restore/recreate `prisma/schema.prisma` file
2. Replace mock data with real Prisma queries in Patients, Clinical, and Staff modules
3. Fix enum/field name inconsistencies
4. Complete pending integrations (rate limiting, Supabase Storage)
