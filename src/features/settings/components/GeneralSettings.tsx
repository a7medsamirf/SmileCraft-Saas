"use client";

import React from "react";
import { Building2, MapPin, Phone, Mail, Timer, Save, Image as ImageIcon, Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useClinicSettings } from "../hooks/useClinicSettings";
import { Button } from "@/components/ui/Button";
import { toast } from "react-hot-toast";

const generalSchema = z.object({
  name: z.string().min(2, "Name too short"),
  address: z.string().min(5, "Address too short"),
  phone: z.string().min(5, "Invalid phone"),
  email: z.string().email("Invalid email"),
  slotDuration: z.number().min(5).max(120),
  logoUrl: z.string().optional(),
  logoUrlDark: z.string().optional(),
  faviconUrl: z.string().optional(),
});

type GeneralFormValues = z.infer<typeof generalSchema>;

export function GeneralSettings() {
  const t = useTranslations("Settings.general");
  const { clinicInfo, updateClinicInfo, isSaving } = useClinicSettings();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<GeneralFormValues>({
    resolver: zodResolver(generalSchema),
    values: clinicInfo || {
      name: "",
      address: "",
      phone: "",
      email: "",
      slotDuration: 30,
      logoUrl: "",
      logoUrlDark: "",
      faviconUrl: "",
    },
  });

  const logoUrl = watch("logoUrl");
  const logoUrlDark = watch("logoUrlDark");
  const faviconUrl = watch("faviconUrl");

  const onSubmit = async (data: GeneralFormValues) => {
    try {
      await updateClinicInfo(data);
      toast.success(t("saveSuccess"));
    } catch (err) {
      toast.error(t("saveError"));
      console.error("[GeneralSettings] Error saving:", err);
    }
  };

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
            {isSaving ? t("saving") : t("save")}
          </Button>
        )}
      </div>

      <div className="grid gap-5">
        <div className="glass-card p-6 rounded-3xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-400" />
                {t("clinicName")}
              </label>
              <input
                {...register("name")}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" />
                {t("phone")}
              </label>
              <input
                {...register("phone")}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              {errors.phone && (
                <p className="text-xs text-red-500">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                {t("email")}
              </label>
              <input
                {...register("email")}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Timer className="h-4 w-4 text-slate-400" />
                {t("slotDuration")}
              </label>
              <select
                {...register("slotDuration", { valueAsNumber: true })}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
              >
                <option value={15}>15 {t("minutes")}</option>
                <option value={30}>30 {t("minutes")}</option>
                <option value={45}>45 {t("minutes")}</option>
                <option value={60}>60 {t("minutes")}</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400" />
              {t("address")}
            </label>
            <textarea
              {...register("address")}
              rows={3}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            />
            {errors.address && (
              <p className="text-xs text-red-500">{errors.address.message}</p>
            )}
          </div>
        </div>

        {/* Branding Section */}
        <div className="glass-card p-6 rounded-3xl space-y-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-blue-500" />
            {t("uploadBranding")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Logo Upload (Light Mode) */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden group">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo Preview" className="h-full w-full object-contain p-2" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-slate-300" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {t("logo")}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Recommended: 200x200px PNG or SVG
                  </p>
                </div>
              </div>
              <input
                {...register("logoUrl")}
                placeholder="https://example.com/logo-light.png"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              />
            </div>

            {/* Logo Upload (Dark Mode) */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-2xl bg-slate-900 flex items-center justify-center border-2 border-dashed border-slate-700 overflow-hidden group">
                  {logoUrlDark ? (
                    <img src={logoUrlDark} alt="Dark Logo Preview" className="h-full w-full object-contain p-2" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-slate-600" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {t("darkLogo")}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {t("darkLogoDescription")}
                  </p>
                </div>
              </div>
              <input
                {...register("logoUrlDark")}
                placeholder="https://example.com/logo-dark.png"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              />
            </div>

            {/* Favicon Upload */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden">
                  {faviconUrl ? (
                    <img src={faviconUrl} alt="Favicon Preview" className="h-10 w-10 object-contain" />
                  ) : (
                    <Globe className="h-8 w-8 text-slate-300" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {t("favicon")}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Recommended: 32x32px .ico or .png
                  </p>
                </div>
              </div>
              <input
                {...register("faviconUrl")}
                placeholder="https://example.com/favicon.ico"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
