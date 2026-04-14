"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Building2, Phone, MapPin, User, Hash, CheckCircle2 } from "lucide-react";
import { branchFormSchema, type BranchFormValues } from "@/features/branches/schema";
import type { BranchFull } from "@/features/branches/types";

type BranchFormProps = {
  branch?: BranchFull | null;
  onSubmit: (data: BranchFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
};

export function BranchForm({ branch, onSubmit, onCancel, isSubmitting }: BranchFormProps) {
  const t = useTranslations("Branches");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: {
      name: branch?.name || "",
      code: branch?.code || "",
      address: branch?.address || "",
      phone: branch?.phone || "",
      managerName: branch?.managerName || "",
      isActive: branch?.isActive ?? true,
    },
  });

  // Input style helper
  const inputCls = (hasError?: boolean) =>
    `w-full px-4 py-3 rounded-xl border bg-white/50 dark:bg-slate-800/50 
     backdrop-blur-sm outline-none transition-all duration-200
     text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500
     focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
     ${hasError 
       ? "border-red-400 dark:border-red-500/50" 
       : "border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600"
     }`;

  // Label style helper
  const labelCls = "flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Name */}
        <div>
          <label className={labelCls}>
            <Building2 className="w-4 h-4 text-blue-500" />
            {t("name")} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register("name")}
            className={inputCls(!!errors.name)}
            placeholder={t("namePlaceholder")}
          />
          {errors.name && (
            <p className="mt-2 text-xs text-red-500 dark:text-red-400 font-medium flex items-center gap-1">
              <span>⚠</span> {errors.name.message}
            </p>
          )}
        </div>

        {/* Code */}
        <div>
          <label className={labelCls}>
            <Hash className="w-4 h-4 text-purple-500" />
            {t("code")} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register("code")}
            className={`${inputCls(!!errors.code)} font-mono uppercase tracking-wide`}
            placeholder={t("codePlaceholder")}
          />
          {errors.code && (
            <p className="mt-2 text-xs text-red-500 dark:text-red-400 font-medium flex items-center gap-1">
              <span>⚠</span> {errors.code.message}
            </p>
          )}
        </div>

        {/* Manager Name */}
        <div>
          <label className={labelCls}>
            <User className="w-4 h-4 text-emerald-500" />
            {t("managerName")}
          </label>
          <input
            type="text"
            {...register("managerName")}
            className={inputCls(!!errors.managerName)}
            placeholder={t("managerNamePlaceholder")}
          />
          {errors.managerName && (
            <p className="mt-2 text-xs text-red-500 dark:text-red-400 font-medium flex items-center gap-1">
              <span>⚠</span> {errors.managerName.message}
            </p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className={labelCls}>
            <Phone className="w-4 h-4 text-amber-500" />
            {t("phone")}
          </label>
          <input
            type="tel"
            {...register("phone")}
            className={`${inputCls(!!errors.phone)} font-mono`}
            placeholder={t("phonePlaceholder")}
            dir="ltr"
          />
          {errors.phone && (
            <p className="mt-2 text-xs text-red-500 dark:text-red-400 font-medium flex items-center gap-1">
              <span>⚠</span> {errors.phone.message}
            </p>
          )}
        </div>
      </div>

      {/* Address */}
      <div>
        <label className={labelCls}>
          <MapPin className="w-4 h-4 text-rose-500" />
          {t("address")}
        </label>
        <textarea
          {...register("address")}
          rows={2}
          className={inputCls(!!errors.address)}
          placeholder={t("addressPlaceholder")}
        />
        {errors.address && (
          <p className="mt-2 text-xs text-red-500 dark:text-red-400 font-medium flex items-center gap-1">
            <span>⚠</span> {errors.address.message}
          </p>
        )}
      </div>

      {/* Active Status */}
      {branch && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10 border border-blue-200/50 dark:border-blue-700/30">
          <input
            type="checkbox"
            id="isActive"
            {...register("isActive")}
            className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer"
          />
          <label htmlFor="isActive" className="text-sm font-semibold text-slate-800 dark:text-slate-200 cursor-pointer flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
            {t("isActive")}
          </label>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-5 border-t border-slate-200/50 dark:border-slate-700/50">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 
                     bg-white/50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 
                     font-semibold text-slate-700 dark:text-slate-300"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 
                     hover:from-blue-700 hover:to-blue-800
                     disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 
                     font-semibold text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40
                     flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {branch ? t("updating") : t("creating")}
            </>
          ) : (
            <>
              {branch ? t("update") : t("create")}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
