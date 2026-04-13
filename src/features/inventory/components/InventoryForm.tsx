"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { generateId } from "@/lib/utils/id";
import { InventoryItem, InventoryCategory } from "../types";
import { Calendar } from "lucide-react";

interface InventoryFormValues {
  name: string;
  category:
    | "ANESTHETICS"
    | "MATERIALS"
    | "STERILIZATION"
    | "INSTRUMENTS"
    | "OTHER";
  quantity: number;
  minQuantity: number;
  unitPrice: number;
  unit: string;
  supplier?: string;
  expiryDate?: string;
  batchNumber?: string;
  location?: string;
  notes?: string;
}

const inventorySchema = z.object({
  name: z.string().min(2, "nameRequired"),
  category: z.enum([
    "ANESTHETICS",
    "MATERIALS",
    "STERILIZATION",
    "INSTRUMENTS",
    "OTHER",
  ]),
  quantity: z.coerce.number().min(0, "invalidQuantity"),
  minQuantity: z.coerce.number().min(0, "minQuantityRequired"),
  unitPrice: z.coerce.number().min(0, "unitPriceRequired"),
  unit: z.string().min(1, "unitRequired"),
  supplier: z.string().optional().or(z.literal("")),
  expiryDate: z.string().optional().or(z.literal("")),
  batchNumber: z.string().optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

interface InventoryFormProps {
  initialData?: InventoryItem;
  onSubmit: (data: Partial<InventoryItem>) => void;
  onCancel: () => void;
}

export function InventoryForm({
  initialData,
  onSubmit,
  onCancel,
}: InventoryFormProps) {
  const t = useTranslations("Inventory");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InventoryFormValues>({
    resolver: zodResolver(inventorySchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      category: initialData?.category || "MATERIALS",
      quantity: initialData?.quantity || 0,
      minQuantity: initialData?.minQuantity || 5,
      unitPrice: initialData?.unitPrice || 0,
      unit: initialData?.unit || "piece",
      supplier: initialData?.supplier || "",
      expiryDate: initialData?.expiryDate || "",
      batchNumber: initialData?.batchNumber || "",
      location: initialData?.location || "",
      notes: initialData?.notes || "",
    },
  });

  const handleFormSubmit = (data: InventoryFormValues) => {
    const itemData: Partial<InventoryItem> = {
      ...data,
      lastRestocked: initialData?.lastRestocked || new Date().toISOString(),
    };

    if (initialData) {
      itemData.id = initialData.id;
    } else {
      itemData.id = generateId();
    }

    onSubmit(itemData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-white">
          {t("basicInfo")}
        </h3>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t("name")} *
            </label>
            <Input
              {...register("name")}
              placeholder={t("namePlaceholder")}
              className="rounded-xl"
            />
            {errors.name && (
              <p className="text-xs text-red-600 mt-1">
                {t(errors.name.message as string)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t("category")} *
            </label>
            <select
              {...register("category")}
              className="relative w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-slate-900"
            >
              <option value="ANESTHETICS">{t("categories.anesthetics")}</option>
              <option value="MATERIALS">{t("categories.materials")}</option>
              <option value="STERILIZATION">
                {t("categories.sterilization")}
              </option>
              <option value="INSTRUMENTS">{t("categories.instruments")}</option>
              <option value="OTHER">{t("categories.other")}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t("unit")} *
            </label>
            <Input
              {...register("unit")}
              placeholder={t("unitPlaceholder")}
              className="rounded-xl"
            />
            {errors.unit && (
              <p className="text-xs text-red-600 mt-1">
                {t(errors.unit.message as string)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t("quantity")} *
            </label>
            <Input
              {...register("quantity")}
              type="number"
              placeholder="0"
              className="rounded-xl"
            />
            {errors.quantity && (
              <p className="text-xs text-red-600 mt-1">
                {t(errors.quantity.message as string)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t("minQuantity")} *
            </label>
            <Input
              {...register("minQuantity")}
              type="number"
              placeholder="5"
              className="rounded-xl"
            />
            <p className="text-xs text-slate-500 mt-1">
              {t("minQuantityHelp")}
            </p>
            {errors.minQuantity && (
              <p className="text-xs text-red-600 mt-1">
                {t(errors.minQuantity.message as string)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t("price")} *
            </label>
            <Input
              {...register("unitPrice")}
              type="number"
              step="0.01"
              placeholder="0.00"
              className="rounded-xl"
            />
            {errors.unitPrice && (
              <p className="text-xs text-red-600 mt-1">
                {t(errors.unitPrice.message as string)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t("supplier")}
            </label>
            <Input
              {...register("supplier")}
              placeholder={t("supplierPlaceholder")}
              className="rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Storage & Tracking */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-white">
          {t("storageTracking")}
        </h3>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t("location")}
            </label>
            <Input
              {...register("location")}
              placeholder={t("locationPlaceholder")}
              className="rounded-xl"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t("batchNumber")}
            </label>
            <Input
              {...register("batchNumber")}
              placeholder={t("batchNumberPlaceholder")}
              className="rounded-xl"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t("expiryDate")}
            </label>
            <Input
              type="date"
              icon={<Calendar className="h-4 w-4" />}
              {...register("expiryDate")}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-slate-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t("notes")}
          </label>
          <textarea
            {...register("notes")}
            placeholder={t("notesPlaceholder")}
            rows={3}
            className="relative w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-slate-900"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="rounded-xl"
        >
          {t("cancel")}
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="rounded-2xl shadow-emerald-500/20 shadow-lg"
        >
          {isSubmitting ? t("saving") : initialData ? t("update") : t("create")}
        </Button>
      </div>
    </form>
  );
}
