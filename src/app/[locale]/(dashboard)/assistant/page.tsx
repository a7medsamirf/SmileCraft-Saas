import { getTranslations } from "next-intl/server";
import { PageTransition } from "@/components/ui/PageTransition";
import { isGeminiConfiguredAction } from "@/lib/gemini/serverActions";
import { SmartAssistantChat } from "@/features/assistant/components/SmartAssistantChat";
import { Bot, Sparkles } from "lucide-react";

export const metadata = {
  title: "المساعد الذكي | SmileCraft CMS",
  description: "مساعد الذكاء الاصطناعي لطب الأسنان",
};

export default async function SmartAssistantPage() {
  const t = await getTranslations("SmartAssistant");
  const { configured } = await isGeminiConfiguredAction();

  return (
    <PageTransition loadingText={t("title")}>
      <div className="w-full space-y-6 pb-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-600/10 to-purple-600/10 dark:from-violet-500/10 dark:to-purple-500/10">
                <Bot className="h-8 w-8 text-violet-600 dark:text-violet-500" />
              </div>
              {t("title")}
            </h1>
            <p className="mt-3 text-slate-500 dark:text-slate-400 font-medium max-w-2xl">
              {t("pageDescription")}
            </p>
          </div>

          {configured && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                {t("aiActive")}
              </span>
            </div>
          )}
        </div>

        {/* Chat Interface */}
        <section className="animate-in slide-in-from-bottom-4 duration-1000">
          <SmartAssistantChat isConfigured={configured} />
        </section>
      </div>
    </PageTransition>
  );
}
