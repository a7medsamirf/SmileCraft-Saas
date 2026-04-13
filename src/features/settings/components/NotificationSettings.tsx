"use client";

import React from "react";
import {
  Bell,
  MessageSquare,
  Mail,
  PhoneCall,
  Clock,
  Save,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { useClinicSettings } from "../hooks/useClinicSettings";
import { Button } from "@/components/ui/Button";

type NotificationFormValues = {
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  emailEnabled: boolean;
  reminderTiming: number;
};

export function NotificationSettings() {
  const t = useTranslations("Settings.notifications");
  const { notifications, updateNotifications, isSaving } = useClinicSettings();

  const {
    register,
    handleSubmit,
    watch,
    formState: { isDirty },
  } = useForm<NotificationFormValues>({
    defaultValues: notifications,
  });

  const onSubmit = (data: NotificationFormValues) => {
    updateNotifications(data);
  };

  const channels = [
    {
      id: "smsEnabled",
      label: t("sms"),
      icon: MessageSquare,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      id: "whatsappEnabled",
      label: t("whatsapp"),
      icon: PhoneCall,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      id: "emailEnabled",
      label: t("email"),
      icon: Mail,
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-900/20",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {t("title")}
        </h2>
        {isDirty && (
          <Button
            onClick={handleSubmit(onSubmit)}
            loading={isSaving}
            className="rounded-2xl shadow-blue-500/20 shadow-lg"
          >
            <Save className="mr-2 h-4 w-4" />
            {t("save")}
          </Button>
        )}
      </div>

      <div className="grid gap-5">
        <div className="glass-card p-6 rounded-3xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {channels.map((channel) => {
              const Icon = channel.icon;
              const isEnabled = watch(
                channel.id as keyof NotificationFormValues,
              );

              return (
                <label
                  key={channel.id}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                    isEnabled
                      ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                      : "border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 grayscale opacity-60"
                  }`}
                >
                  <div
                    className={`p-3 rounded-xl ${channel.bg} ${channel.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {channel.label}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    {...register(channel.id as keyof NotificationFormValues)}
                    className="hidden"
                  />
                  <div
                    className={`w-10 h-6 rounded-full relative transition-colors ${isEnabled ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"}`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isEnabled ? "left-5" : "left-1"}`}
                    />
                  </div>
                </label>
              );
            })}
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              {t("reminderTiming")}
            </label>
            <div className="flex flex-wrap gap-3">
              {[1, 2, 6, 12, 24, 48].map((hours) => (
                <label
                  key={hours}
                  className={`px-6 py-3 rounded-2xl border text-sm font-bold transition-all cursor-pointer ${
                    watch("reminderTiming") === hours
                      ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <input
                    type="radio"
                    value={hours}
                    {...register("reminderTiming", { valueAsNumber: true })}
                    className="hidden"
                  />
                  {hours} {t("hours")}
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("reminderTimingDescription")}
            </p>
          </div>
        </div>

        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800 flex gap-3">
          <Bell className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
              {t("noteTitle")}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              {t("noteDescription")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
