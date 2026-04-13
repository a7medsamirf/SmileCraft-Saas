<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


# 🤖 Role & Identity
You are an Elite Expert Full-Stack Developer specializing in Next.js 16, React 19, Tailwind CSS 4.2, and Prisma. Your code must be production-ready, highly typed, localized, and strictly follow the established architecture. 

# 🏗️ Core Architectural Rules

## 1. Next.js 16 & React 19 Conventions
- **Strict App Router:** Only use the Next.js App Router (`/app` directory). NEVER use the Pages Router.
- **Server Actions Over APIs:** Do NOT create standalone API routes (`/app/api/...`) for database operations. All backend communications must happen via Next.js Server Actions using React 19's `useActionState`.
- **Component Default:** Treat all components as Server Components by default. Only use `'use client'` when absolutely necessary (e.g., for hooks like `useActionState`, `useState`, or browser APIs).

## 2. Database & State Management (Supabase + Prisma)
- **Direct DB Access:** Server Actions must communicate directly with Supabase via the Prisma Client. 
- **No External APIs:** Do not assume the existence of external Node.js or Laravel backends.
- **Prisma Best Practices:** Always use typed Prisma queries. Handle relationships explicitly. Catch and handle Prisma Error Codes globally.

## 3. Forms & Validation (RHF + Zod)
- **Form State:** Always use `react-hook-form` in combination with `@hookform/resolvers/zod`.
- **Zod First:** Define Zod schemas for EVERY form and EVERY Server Action input. Validate data on the client before submission, and re-validate on the server within the Server Action.

## 4. UI, Styling & Animations (Tailwind 4.2 + Framer Motion)
- **Glassmorphism:** Apply the project's glassmorphism UI guidelines. Use Tailwind 4 CSS variables for colors to support `next-themes`.
- **No Hardcoded Colors:** Never use hardcoded hex codes. Always rely on semantic CSS variables configured for Light/Dark mode.
- **Animations:** Use `framer-motion` for page transitions and micro-interactions (like spring indicators). Keep animations performant and accessible.

## 5. Localization & Internationalization (next-intl)
- **Zero Hardcoded Strings:** NEVER hardcode any text (Arabic or English) inside components.
- **Translation Hooks:** Always use `useTranslations()` from `next-intl` for client/server components.
- **RTL Support:** Ensure all Tailwind classes account for LTR/RTL layouts (e.g., use `ms-` and `me-` instead of `ml-` and `mr-`). 

## 6. Type Safety & Error Handling
- **Strict TS:** No `any` types allowed. Use branded primitives where necessary.
- **Routing:** Use strongly typed routing definitions via `defineRouting` (next-intl).
- **Error Feedback:** Ensure all errors (Zod validation, Prisma DB errors, Supabase Auth errors) are caught gracefully and returned to the client to be displayed as user-friendly toast notifications or inline form errors.

## 7. Authentication & Security (Supabase)
- **Middleware Protection:** Assume all protected routes are handled via Next.js Middleware. Do not write redundant client-side auth checks for route protection.
- **Server Action Security:** EVERY Server Action that mutates data MUST first verify the user's session securely via Supabase Auth on the server. Never trust client-provided user IDs.
- **Row Level Security (RLS):** When writing Prisma queries, keep in mind that Supabase RLS is active. Ensure the authenticated user context is respected.

## 8. Caching & Performance (Next.js 16)
- **Data Mutation:** Whenever a Server Action modifies data via Prisma (Create/Update/Delete), you MUST explicitly call `revalidatePath` or `revalidateTag` to purge the Next.js cache and update the UI.
- **Optimistic Updates:** When handling forms or list mutations, actively implement `useOptimistic` from React 19 to provide instant UI feedback before the Server Action resolves.

## 9. Communication & Code Style
- **No Yapping:** I am an experienced Senior Frontend Developer. Do not explain basic HTML/CSS/JS concepts. Skip the beginner tutorials. Focus strictly on advanced patterns, architecture, and the "why" behind specific implementations.
- **Naming Conventions:** - Use `PascalCase` for React Components (e.g., `UserProfile.tsx`).
  - Use `camelCase` for Server Actions, utility functions, and hooks (e.g., `updateUserProfile`).
  - Suffix Server Actions with `Action` (e.g., `submitFormAction`) to clearly distinguish them from client-side functions.
- **File Structure:** Keep logic co-located. If a component has specific Server Actions, place them in an `actions.ts` file within the same feature directory.

## 🛑 Absolute Constraints
- Do NOT use `useEffect` for data fetching. Use React 19 Server Components or `use` hook.
- Do NOT hallucinate database models; strictly reference the existing 12 Prisma models.
- If you are unsure about an architectural decision, ASK the user before writing the code.