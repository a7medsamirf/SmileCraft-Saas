"use client";

import React, { useState, useEffect } from "react";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { useFormStatus } from "react-dom";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Wallet,
  Settings,
  Menu,
  X,
  Dna,
  Sun,
  Moon,
  Languages,
  Stethoscope,
  LogOut,
  UserCheck,
  Loader2,
  CalendarCheck,
  User,
  Package,
  Sparkles,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/[locale]/(auth)/logoutAction";
import { Logo } from "@/components/SharesComponent/Logo";
import { BranchSwitcher } from "@/components/BranchSwitcher";
import { getBranchesAction, switchBranchAction, createBranchAction } from "@/features/branches/serverActions";
import { getSidebarProfileAction } from "@/features/profile/actions";

function LogoutButton() {
  const t = useTranslations("Sidebar");
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-600 transition hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      {pending ? t("loggingOut") : t("logout")}
    </button>
  );
}

export function Sidebar({
  userName,
  userSpecialty,
  userRole,
  clinicName,
  clinicLogo,
  logoUrlDark,
  currentBranchId,
}: {
  userName?: string | null;
  userSpecialty?: string | null;
  userRole?: string | null;
  clinicName?: string;
  clinicLogo?: string;
  logoUrlDark?: string;
  currentBranchId?: string | null;
}

) {
  const t = useTranslations("Sidebar");

  // Debug: Log role data from database
  console.log("[Sidebar] Props received:", { userRole, userSpecialty });

  const NAV_LINKS = [
    { name: t("dashboard"), href: "/dashboard", icon: LayoutDashboard },
    { name: t("patients"), href: "/patients", icon: Users },
    { name: t("appointments"), href: "/appointments", icon: CalendarCheck },
    { name: t("calendar"), href: "/calendar", icon: Calendar },
    { name: t("clinical"), href: "/clinical", icon: Stethoscope },
    { name: t("smartAssistant"), href: "/assistant", icon: Sparkles },
    { name: t("staff"), href: "/staff", icon: UserCheck },
    { name: t("inventory"), href: "/inventory", icon: Package },
    { name: t("finance"), href: "/billing", icon: Wallet },
    { name: t("branches"), href: "/branches", icon: GitBranch },
    { name: t("settings"), href: "/settings", icon: Settings },
  ] as const;

  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const { theme, setTheme } = useTheme();
  const params = useParams();
  const direction = locale === "ar" ? "rtl" : "ltr";

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [branches, setBranches] = useState<Array<{ id: string; name: string; code: string; isActive: boolean }>>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [sidebarUserName, setSidebarUserName] = useState<string | null>(userName || null);

  // Find current branch name
  const currentBranchName = branches.find((b) => b.id === currentBranchId)?.name ?? null;

  useEffect(() => {
    setMounted(true);
    // Load branches
    const loadBranches = async () => {
      try {
        setBranchesLoading(true);
        const data = await getBranchesAction();
        setBranches(data);
      } catch (err) {
        console.error("Failed to load branches:", err);
      } finally {
        setBranchesLoading(false);
      }
    };
    loadBranches();

    // Load fresh profile data from server (ensures updates from profile page are reflected)
    const loadProfile = async () => {
      try {
        const profileData = await getSidebarProfileAction();
        if (profileData?.fullName) {
          setSidebarUserName(profileData.fullName);
        }
      } catch (err) {
        console.error("Failed to load profile data:", err);
      }
    };
    loadProfile();
  }, [currentBranchId]);

  const handleSwitchBranch = async (branchId: string) => {
    await switchBranchAction(branchId);
    window.location.reload();
  };

  const handleCreateBranch = async (name: string) => {
    await createBranchAction(name);
    window.location.reload();
  };

  const toggleSidebar = () => setIsOpen(!isOpen);
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");
  const toggleLocale = () => {
    const nextLocale = locale === "ar" ? "en" : "ar";
    // @ts-expect-error -- Generic layout doesn't have page-specific params for next-intl strict typing
    router.replace({ pathname, params }, { locale: nextLocale });
  };

  return (
    <>
      {/* Mobile Top Header */}
      <div className="md:hidden sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200/50 bg-white/80 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
        <Link href="/" className="flex items-center gap-2">
          <Logo  className="w-40 sm:w-40 md:w-44 lg:w-60 h-auto object-contain"
            logoUrl={clinicLogo} 
            logoUrlDark={logoUrlDark} 

          />
      {/*     <span className="font-bold text-slate-900 dark:text-white">
            {clinicName || t("shortAppName")}
          </span> */}
        </Link>
        <button
          onClick={toggleSidebar}
          className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main Sidebar (Desktop fixed, Mobile animated) */}
      <motion.aside
        className={cn(
          "fixed overflow-x-scroll inset-y-0 z-50 flex w-72 flex-col justify-between border-slate-200 glass md:sticky md:top-0 md:h-screen transition-all duration-300 ease-in-out md:translate-x-0",
          direction === "rtl" ? "right-0 border-l" : "left-0 border-r",
          isOpen
            ? "translate-x-0"
            : direction === "rtl"
              ? "translate-x-full"
              : "-translate-x-full",
        )}
      >
        <div>
          {/* Logo Area */}
          <Link href="/" className="flex h-20 items-center gap-3 border-b border-slate-100 px-6 dark:border-slate-800/50">
            <div className="flex w-full items-center justify-center rounded-xl overflow-hidden">
              <Logo 
                logoUrl={clinicLogo} 
                logoUrlDark={logoUrlDark} 
                width={120} 
                height={40} 
                className="w-full h-full flex justify-center"
              />
            </div>
          </Link>

          <div className="flex w-full flex-col gap-2 px-3 py-4">
            {NAV_LINKS.map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all overflow-hidden",
                    isActive
                      ? "text-blue-700 dark:text-blue-400"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white",
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-indicator"
                      className="absolute inset-0 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border-s-4 border-blue-600"
                      initial={false}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                      }}
                    />
                  )}
                  <link.icon className="relative z-10 h-5 w-5" />
                  <span className="relative z-10">{link.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* User Profile / Logout Area snippet */}
        <div className="p-4 space-y-4">
          {/* Branch Switcher */}
          {branchesLoading ? (
            <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
              <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin" />
              <span className="text-xs text-slate-500">جاري تحميل الفروع...</span>
            </div>
          ) : (
            <BranchSwitcher
              branches={branches}
              currentBranchId={currentBranchId || null}
              onSwitch={handleSwitchBranch}
              onCreateBranch={handleCreateBranch}
            />
          )}

          {/* Quick Actions (Theme & Language) */}
          {mounted && (
            <div className="flex gap-2">
              <button
                onClick={toggleTheme}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl border bg-slate-50 p-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={toggleLocale}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border bg-slate-50 p-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Languages className="h-4 w-4" />
                <span className="uppercase font-bold">
                  {t("switchTo")}
                </span>
              </button>
            </div>
          )}

          {/* User Profile */}
          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-2xl border bg-slate-50 p-3 dark:bg-slate-900 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-blue-500/30 group"
          >
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                {t("drName", { name: sidebarUserName || "Doctor" })}
              </span>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                {(() => {
                  console.log("[Sidebar] Rendering role:", { userRole, userSpecialty });
                  
                  // If specialty exists, it's a doctor - show specialty directly
                  if (userSpecialty) {
                    return userSpecialty;
                  }
                  // If role exists, translate the role
                  if (userRole) {
                    const roleKey = userRole.toLowerCase();
                    console.log("[Sidebar] Translating role:", roleKey);
                    // Try to translate the role, fallback to drTitle
                    try {
                      const translatedRole = t(`roles.${roleKey}`);
                      console.log("[Sidebar] Translated role:", translatedRole);
                      return translatedRole || t("drTitle");
                    } catch (err) {
                      console.error("[Sidebar] Translation error:", err);
                      return t("drTitle");
                    }
                  }
                  // Fallback to generic title
                  return t("drTitle");
                })()}
              </span>
            </div>
          </Link>

          {/* Logout Button */}
          <form action={logoutAction} className="w-full">
            <input type="hidden" name="locale" value={locale} />
            <LogoutButton />
          </form>
        </div>
      </motion.aside>
    </>
  );
}
