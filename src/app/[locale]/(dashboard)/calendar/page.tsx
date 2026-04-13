import { CalendarContainer } from "@/features/appointments";
import { Calendar as CalendarIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageTransition } from "@/components/ui/PageTransition";

export const metadata = {
  title: "المواعيد | SmileCraft CMS",
};

export default async function CalendarPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("Appointments");

  return (
    <PageTransition loadingText={t("title")}>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
               <div className="p-3 rounded-2xl bg-blue-600/10 dark:bg-blue-500/10">
                      <CalendarIcon className="h-8 w-8 text-blue-600 dark:text-blue-500" />
                   </div>
            {t("title")}
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            {t("agendaSummary")}
          </p>
        </div>
      </div>

      <div className="mt-6">
         <CalendarContainer locale={locale} />
      </div>
    </PageTransition>
  );
}
