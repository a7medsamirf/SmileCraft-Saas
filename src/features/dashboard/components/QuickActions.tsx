// =============================================================================
// Dashboard Widget — Quick Actions
// =============================================================================

import { UserPlus, CalendarPlus, FileText, Stethoscope } from "lucide-react";
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";

export async function QuickActions() {
  const t = await getTranslations("Dashboard.QuickActions");

  const ACTIONS = [
    {
      label: t("newPatient"),
      href: "/patients" as const,
      icon: UserPlus,
      color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      hoverColor: "hover:bg-blue-500/20",
    },
    {
      label: t("bookAppointment"),
      href: "/appointments" as const,
      icon: CalendarPlus,
      color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      hoverColor: "hover:bg-emerald-500/20",
    },
    {
      label: t("newInvoice"),
      href: "/finance" as const,
      icon: FileText,
      color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      hoverColor: "hover:bg-purple-500/20",
    },
    {
      label: t("quickDiagnosis"),
      href: "/clinical" as const,
      icon: Stethoscope,
      color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      hoverColor: "hover:bg-amber-500/20",
    },
  ];

  return (
    <div className="glass-card p-6 h-full">
      <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4">
        {t("title")}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map((action, i) => (
          <Link
            key={i}
            href={action.href}
            className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border transition-all duration-200 ${action.color} ${action.hoverColor} group`}
          >
            <action.icon className="w-6 h-6 transition-transform group-hover:scale-110" />
            <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300 text-center">
              {action.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
