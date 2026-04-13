import { AppointmentWizard } from "@/features/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "حجز موعد | SmileCraft CMS",
};

export default async function AppointmentWizardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("Appointments");

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-600/10 dark:bg-emerald-500/10">
                      <CalendarIcon className="h-8 w-8 text-emerald-600 dark:text-emerald-500" />
                   </div>


          {t("wizardTitle")}
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          {t("wizardSubtitle")}
        </p>
      </div>

      <AppointmentWizard />
    </div>
  );
}
