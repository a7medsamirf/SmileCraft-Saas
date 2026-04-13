"use client";

import React, { useState } from "react";
import { Search, Plus, Edit2, Check, X, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useClinicSettings } from "../hooks/useClinicSettings";
import { ServiceCategory, DentalService } from "../types";
import { ServiceModal } from "./ServiceModal";
import { deleteServiceAction } from "../serverActions";

export function ServiceList() {
  const t = useTranslations("Settings.services");
  const { services, updateServicePrice } = useClinicSettings();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<ServiceCategory | "ALL">(
    "ALL",
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editService, setEditService] = useState<DentalService | null>(null);

  const filteredServices = services.filter((s) => {
    const matchesSearch = s.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      filterCategory === "ALL" || s.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleStartEdit = (service: DentalService) => {
    setEditingId(service.id);
    setEditPrice(service.price.toString());
  };

  const handleSavePrice = async (id: string) => {
    const priceNum = parseFloat(editPrice);
    if (!isNaN(priceNum)) {
      await updateServicePrice(id, priceNum);
    }
    setEditingId(null);
  };

  const handleOpenAddModal = () => {
    setEditService(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (service: DentalService) => {
    setEditService(service);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditService(null);
  };

  const handleModalSuccess = () => {
    window.location.reload();
  };

  const handleDelete = async (id: string) => {
    if (confirm(t("confirmDelete"))) {
      try {
        await deleteServiceAction(id);
        window.location.reload();
      } catch {
        console.error("Failed to delete service");
      }
    }
  };

  return (
    
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {t("title")}
        </h2>
        <Button
          onClick={handleOpenAddModal}
          className="rounded-2xl shadow-blue-500/20 shadow-lg"
        >
          <Plus className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
          {t("add")}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 glass-card p-4 transition-all duration-300">
        <div className="relative flex-1">
          <Input
            placeholder={t("name")}
            icon={<Search className="h-5 w-5" />}
            className="rounded-2xl border-slate-200/80 bg-white/80"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          {(
            ["ALL", "GENERAL", "SURGERY", "COSMETIC", "PEDIATRICS"] as const
          ).map((cat) => (
            <Button
              key={cat}
              variant={filterCategory === cat ? "primary" : "outline"}
              className="rounded-xl px-4 py-1 h-9 whitespace-nowrap"
              onClick={() => setFilterCategory(cat)}
            >
              {cat === "ALL"
                ? t("filterAll")
                : t(`filter${cat.charAt(0) + cat.slice(1).toLowerCase()}`)}
            </Button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden transition-all duration-300">
        <table className="w-full text-left rtl:text-right">
          <thead className="bg-slate-50/50 text-xs font-semibold uppercase text-slate-500 dark:bg-slate-800/50">
            <tr>
              <th className="px-6 py-4">{t("name")}</th>
              <th className="px-6 py-4">{t("category")}</th>
              <th className="px-6 py-4">{t("procedureType")}</th>
              <th className="px-6 py-4">{t("price")}</th>
              <th className="px-6 py-4">{t("duration")}</th>
              <th className="px-6 py-4 text-center">{t("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredServices.map((service) => (
              <tr
                key={service.id}
                className="group hover:bg-amber-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                  {service.name}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {t(
                      `filter${service.category.charAt(0) + service.category.slice(1).toLowerCase()}`,
                    )}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    {t(`procedureTypes.${service.procedureType}`)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {editingId === service.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        type="number"
                        className="w-24 rounded-lg border-slate-300 bg-white dark:bg-slate-800 px-2 py-1 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleSavePrice(service.id)
                        }
                      />
                      <span className="text-sm text-slate-500">
                        {t("currency")}
                      </span>
                    </div>
                  ) : (
                    <span className="font-bold text-slate-900 dark:text-white">
                      {service.price}{" "}
                      <span className="text-xs font-normal text-slate-500">
                        {t("currency")}
                      </span>
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                  {service.duration} {t("duration").split("(")[0].trim()}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {editingId === service.id ? (
                      <>
                        <button
                          onClick={() => handleSavePrice(service.id)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleOpenEditModal(service)}
                          className="p-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(service.id)}
                          className="p-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ServiceModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        editService={editService}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
