"use client";

import React from "react";
import { Search, Plus, Filter, Users, Loader2 } from "lucide-react";
import { PatientCard } from "./PatientCard";
import { usePatients } from "../hooks/usePatients";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { AddPatientModal } from "./AddPatientModal";
import type { Patient } from "../types";
import { deletePatientAction } from "../serverActions";
import { toast } from "react-hot-toast";

export function PatientList() {
  const t = useTranslations("Patients");
  const router = useRouter();
  const { patients, isLoading, total, setFilters, refresh } = usePatients();
  const [searchInput, setSearchInput] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [editingPatient, setEditingPatient] = React.useState<Patient | null>(
    null,
  );

  React.useEffect(() => {
    if (!searchInput) {
      setIsSearching(false);
      setFilters({ search: "" });
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(() => {
      setFilters({ search: searchInput });
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, setFilters]);

  const handleDelete = async (patient: Patient) => {
    if (confirm(t("deleteConfirm") || "هل أنت متأكد من حذف هذا المريض؟")) {
      try {
        await deletePatientAction(patient.id);
        toast.success(t("deleteSuccess") || "تم حذف المريض بنجاح");
        refresh();
      } catch (error) {
        console.error(error);
        toast.error(t("deleteError") || "حدث خطأ أثناء الحذف");
      }
    }
  };

  return (
    <div className="w-full mx-auto space-y-5 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
               <div className="p-3 rounded-2xl bg-emerald-600/10 dark:bg-emerald-500/10">
                <Users className="h-8 w-8 text-emerald-600 dark:text-emerald-500" />
              </div>
            {t("listTitle")}
          </h1>

          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {t("listSummary", { patientCount: t("patientCount", { total }) })}
          </p>
        </div>
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="shrink-0 rounded-2xl shadow-blue-500/20 shadow-lg px-6 relative"
        >
          <Plus className="me-2 h-5 w-5" />
          {t("addPatient")}
        </Button>
      </div>

      {/* Create modal */}
      <AddPatientModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          refresh();
        }}
      />

      {/* Edit modal — opens with the selected patient's data pre-filled */}
      <AddPatientModal
        isOpen={!!editingPatient}
        patient={editingPatient ?? undefined}
        onClose={() => {
          setEditingPatient(null);
          refresh();
        }}
      />

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between glass-card p-4 transition-all duration-300">
        <div className="relative w-full sm:max-w-md">
          <Input
            placeholder={t("searchPlaceholder")}
            icon={isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
            className="rounded-2xl border-slate-200/80 bg-white/80 dark:bg-slate-900/40 dark:border-slate-800"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <div className="flex w-full sm:w-auto items-center gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
          <Button variant="outline" className="rounded-2xl shrink-0">
            <Filter className="me-2 h-4 w-4" />
            {t("advancedFilter")}
          </Button>
        </div>
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="rounded-3xl border border-slate-100 bg-white p-4 shadow-none dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="space-y-5">
                {/* مكان الصورة */}
                <div className="h-35 rounded-2xl bg-slate-200 dark:bg-slate-800"></div>

                {/* الأسطر النصية */}
                <div className="space-y-3">
                  <div className="h-4 w-3/4 rounded-full bg-slate-200 dark:bg-slate-800"></div>
                  <div className="h-4 w-1/2 rounded-full bg-slate-200 dark:bg-slate-800"></div>
                </div>

                {/* الجزء السفلي */}
                <div className="flex items-center justify-between pt-2">
                  <div className="h-7 w-20 rounded-lg bg-slate-100 dark:bg-slate-800/50"></div>
                  <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800/50"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : patients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-24 w-24 rounded-full bg-slate-50 flex items-center justify-center mb-6">
            <Search className="h-10 w-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("noResults")}
          </h3>
          <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {t("noResultsSummary")}
          </p>
          <Button
            variant="outline"
            className="mt-6 rounded-2xl dark:border-slate-800"
            onClick={() => {
              setSearchInput("");
              setFilters({ search: "" });
            }}
          >
            {t("clearSearch")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {patients.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              onClick={(id) =>
                router.push({ pathname: "/patients/[id]", params: { id } })
              }
              onEdit={(p) => setEditingPatient(p)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
