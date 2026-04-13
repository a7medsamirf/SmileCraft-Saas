"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
            {t("name")} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register("name")}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            placeholder={t("namePlaceholder")}
          />
          {errors.name && (
            <p className="mt-1.5 text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* Code */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
            {t("code")} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register("code")}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase"
            placeholder={t("codePlaceholder")}
          />
          {errors.code && (
            <p className="mt-1.5 text-xs text-red-500">{errors.code.message}</p>
          )}
        </div>

        {/* Manager Name */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
            {t("managerName")}
          </label>
          <input
            type="text"
            {...register("managerName")}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            placeholder={t("managerNamePlaceholder")}
          />
          {errors.managerName && (
            <p className="mt-1.5 text-xs text-red-500">{errors.managerName.message}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
            {t("phone")}
          </label>
          <input
            type="tel"
            {...register("phone")}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            placeholder={t("phonePlaceholder")}
          />
          {errors.phone && (
            <p className="mt-1.5 text-xs text-red-500">{errors.phone.message}</p>
          )}
        </div>
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
          {t("address")}
        </label>
        <textarea
          {...register("address")}
          rows={2}
          className="w-full px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
          placeholder={t("addressPlaceholder")}
        />
        {errors.address && (
          <p className="mt-1.5 text-xs text-red-500">{errors.address.message}</p>
        )}
      </div>

      {/* Active Status */}
      {branch && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-700/50">
          <input
            type="checkbox"
            id="isActive"
            {...register("isActive")}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="isActive" className="text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
            {t("isActive")}
          </label>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-5 border-t border-slate-200/50 dark:border-slate-700/50">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 px-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-semibold"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-3 px-4 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold shadow-lg shadow-blue-500/20"
        >
          {isSubmitting
            ? branch
              ? t("updating")
              : t("creating")
            : branch
            ? t("update")
            : t("create")}
        </button>
      </div>
    </form>
  );
}
