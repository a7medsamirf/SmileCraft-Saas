import { createNavigation } from "next-intl/navigation";
import { defineRouting } from "next-intl/routing";
 
export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'ar'],

  // Used when no locale matches
  defaultLocale: 'ar',

  pathnames: {
    "/": { en: '/', ar: '/', },
    // CMS Routes
    "/dashboard": { en: '/dashboard', ar: '/dashboard' },
    "/patients": { en: '/patients', ar: '/patients' },
    "/calendar": { en: '/calendar', ar: '/calendar' },
    "/billing": { en: '/billing', ar: '/billing' },
    "/settings": { en: '/settings', ar: '/settings' },
    "/clinical": { en: '/clinical', ar: '/clinical' },
    "/staff": { en: '/staff', ar: '/staff' },
    "/appointments": { en: '/appointments', ar: '/appointments' },
    "/appointments/queue": { en: "/appointments/queue", ar: "/appointments/queue" },
    "/finance": { en: '/finance', ar: '/finance' },
    "/inventory": { en: '/inventory', ar: '/inventory' },
    "/assistant": { en: '/assistant', ar: '/assistant' },
    "/patients/[id]": { en: '/patients/[id]', ar: '/patients/[id]' },
    "/login": { en: '/login', ar: '/login' },
    "/patients/add": { en: '/patients/add', ar: '/patients/add' },
    "/patients/edit/[id]": { en: '/patients/edit/[id]', ar: '/patients/edit/[id]' },
    "/patients/delete/[id]": { en: '/patients/delete/[id]', ar: '/patients/delete/[id]' },
    "/patients/view/[id]": { en: '/patients/view/[id]', ar: '/patients/view/[id]' },
    "/profile": { en: '/profile', ar: '/profile' },
    "/branches": { en: '/branches', ar: '/branches' },
    "/schedule": { en: '/schedule', ar: '/schedule' },
    "/logout": { en: '/logout', ar: '/logout' },
  },

});
 
// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
 
export type Locale = (typeof routing.locales)[number];
export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);