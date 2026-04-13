import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Update session and get user (this handles refreshing the session)
  const { supabaseResponse, user } = await updateSession(request);

  // 2. Identify and handle auth/protected routes
  const pathnameIsMissingLocale = routing.locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  const cleanPath = pathnameIsMissingLocale
    ? pathname
    : pathname.replace(/^\/(ar|en)/, "") || "/";

  // Check for login at both levels for safety
  const isAuthPage = cleanPath.startsWith("/login") || cleanPath.startsWith("/auth/login");
  const isPublicPage = cleanPath === "/" || cleanPath.startsWith("/signup") || cleanPath.startsWith("/auth/signup") || cleanPath.startsWith("/landing");
  const isProtectedPage = !isAuthPage && !isPublicPage && !pathname.includes(".");

  // 3. Manual Redirect Logic
  
  // Case A: User is NOT logged in and trying to access a protected page
  if (!user && isProtectedPage) {
    const locale = pathname.split("/")[1] || routing.defaultLocale;
    const loginUrl = new URL(`/${locale}/login`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Case B: User IS logged in and trying to access login page
  if (user && isAuthPage) {
    const locale = pathname.split("/")[1] || routing.defaultLocale;
    const dashboardUrl = new URL(`/${locale}/dashboard`, request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // 4. Handle internationalization
  // We apply the intlMiddleware and merge its response with supabaseResponse
  const response = intlMiddleware(request);
  
  // Important: Copy cookies from supabaseResponse to the final response
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, cookie);
  });

  return response;
}

export const config = {
  // Match all pathnames except for
  // - /api (API routes)
  // - /_next (Next.js internals)
  // - /_static (inside /public)
  // - /assets/ (public static assets like images, logos, etc.)
  // - /favicon.ico and other root public files
  // - all files with extensions (e.g. /file.png, /script.js)
  matcher: ["/((?!api|_next|_static|_vercel|assets|[\\w-]+\\.\\w+).*)"],
};