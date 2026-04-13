# 🦷 Dental Management System (DMS) - Next.js 16 & React 19

نظام متكامل لإدارة عيادات الأسنان، مصمم لتقديم تجربة مستخدم سلسة للطبيب والطاقم الإداري، مع التركيز على الكفاءة الإكلينيكية والمالية.

## 🚀 Stack التقني (The Tech Stack)

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router & Server Components).
- **Library:** [React 19](https://react.dev/) (Actions & useOptimistic).
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/) (Modern CSS Variables).
- **Language:** [TypeScript](https://www.typescriptlang.org/) (Strict Mode).
- **Icons:** [Lucide React](https://lucide.dev/).
- **Architecture:** Feature-Based Architecture.

## 📂 هيكلية المشروع (Project Structure)

نعتمد نظام **Features** لضمان استقلالية الكود وسهولة التوسع:

```text
src/
├── app/                  # Routing & Layouts
├── features/             # Business Logic Modules
│   ├── dashboard/        # التقارير والمواعيد اليومية
│   ├── patients/         # سجلات المرضى والأشعة
│   ├── clinical/         # الـ Odontogram وخطط العلاج
│   ├── finance/          # الفواتير والمدفوعات
│   └── settings/         # الصلاحيات وإدارة العيادة
├── components/           # Shared UI Components (Design System)
├── hooks/                # Global Custom Hooks
├── lib/                  # Shared Utilities & Configs
└── types/                # Global Type Definitions