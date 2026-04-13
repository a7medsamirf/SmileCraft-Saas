"use client";

import React, { useState } from "react";
import { Settings as SettingsIcon, Shield, Clock, Database, Briefcase } from "lucide-react";
import { useTranslations } from "next-intl";
import { ServiceList } from "@/features/settings/components/ServiceList";
import { PermissionsTable } from "@/features/settings/components/PermissionsTable";
import { ClinicHours } from "@/features/settings/components/ClinicHours";
import { DataExport } from "@/features/settings/components/DataExport";
import { GeneralSettings } from "@/features/settings/components/GeneralSettings";
import { NotificationSettings } from "@/features/settings/components/NotificationSettings";
import { PageTransition } from "@/components/ui/PageTransition";
import { SettingsProvider } from "../context/SettingsContext";
import { InitialSettingsData } from "../types";

type SettingsTab = "general" | "services" | "permissions" | "schedule" | "notifications" | "backup";

export function SettingsClient({ initialData }: { initialData: InitialSettingsData }) {
  const t = useTranslations("Settings");
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  const tabs = [
    { id: "general", label: t("tabs.general"), icon: Briefcase },
    { id: "services", label: t("tabs.services"), icon: SettingsIcon },
    { id: "permissions", label: t("tabs.permissions"), icon: Shield },
    { id: "schedule", label: t("tabs.schedule"), icon: Clock },
    { id: "notifications", label: t("tabs.notifications"), icon: SettingsIcon },
    { id: "backup", label: t("tabs.backup"), icon: Database },
  ] as const;

  const renderContent = () => {
    switch (activeTab) {
      case "general": return <GeneralSettings />;
      case "services": return <ServiceList />;
      case "permissions": return <PermissionsTable />;
      case "schedule": return <ClinicHours />;
      case "notifications": return <NotificationSettings />;
      case "backup": return <DataExport />;
      default: return null;
    }
  };

  return (
    <SettingsProvider initialData={initialData}>
      <PageTransition loadingText={t("title")}>
      <div className="w-full mx-auto pb-20">
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-blue-600/10 dark:bg-blue-500/10">
                      <SettingsIcon className="h-8 w-8 text-blue-600 dark:text-blue-500" />
                   </div>
     
            {t("title")}
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-2xl">
            {t("description")}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* Sidebar Tabs */}
          <aside className="w-full lg:w-64 shrink-0 space-y-2 glass-card p-2 transition-all duration-300">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                    isActive 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-slate-400"}`} />
                  {tab.label}
                </button>
              );
            })}
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 w-full p-1 transition-all duration-300">
             <div className="bg-white dark:bg-slate-900 glass-card p-6 sm:p-8 min-h-full">
                {renderContent()}
             </div>
          </main>
        </div>
      </div>
    </PageTransition>
    </SettingsProvider>
  );
}
