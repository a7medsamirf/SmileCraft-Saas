"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Save,
  CheckCircle,
  Clock,
  Plus,
  Calendar,
  Loader2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { StaffMember, PayrollRecord, PayrollStatus } from "../types";
import { Button } from "@/components/ui/Button";
import {
  getPayrollByMonthAction,
  savePayrollRecordAction,
  generateMonthlyPayrollAction,
} from "../serverActions";

// ─── Props ────────────────────────────────────────────────────────────────────
interface PayrollManagementProps {
  /** Real staff list passed down from StaffClient — single source of truth */
  staff: StaffMember[];
}

export function PayrollManagement({ staff }: PayrollManagementProps) {
  const t = useTranslations("Staff.payroll");
  const commonT = useTranslations("Common");

  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().substring(0, 7),
  );
  const [editingRecord, setEditingRecord] = useState<PayrollRecord | null>(
    null,
  );
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  const loadRecords = useCallback(async () => {
    setIsLoadingRecords(true);
    try {
      const data = await getPayrollByMonthAction(selectedMonth);
      setRecords(data);
    } catch {
      setRecords([]);
    } finally {
      setIsLoadingRecords(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  /** Generate payroll records for all active staff using REAL salary data */
  const handleGenerate = async () => {
    setIsLoadingRecords(true);
    try {
      const generated = await generateMonthlyPayrollAction(
        selectedMonth,
        staff,
      );
      setRecords(generated);
    } catch {
      await loadRecords();
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const handleUpdateRecord = async (record: PayrollRecord) => {
    const net = record.baseSalary + record.bonuses - record.deductions;
    const updated = await savePayrollRecordAction({ ...record, net });
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setEditingRecord(null);
  };

  const handleStatusChange = async (
    record: PayrollRecord,
    status: PayrollStatus,
  ) => {
    const updated = await savePayrollRecordAction({
      ...record,
      status,
      paidAt: status === "PAID" ? new Date().toISOString() : record.paidAt,
    });
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  /** Look up a staff member's name from the REAL staff list */
  const getStaffName = (staffId: string) =>
    staff.find((s) => s.id === staffId)?.fullName ?? t("staff");

  // ── Empty state ──────────────────────────────────────────────────────────
  const emptyState = (
    <div className="text-center py-12 glass-card rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
      <Clock className="h-12 w-12 mx-auto text-slate-300 mb-3" />
      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
        {t("noRecords")}
      </h3>
      <p className="text-slate-500 dark:text-slate-400 mb-4">
        {t("noRecordsDescription")}
      </p>
      <Button onClick={handleGenerate}>{t("generateNow")}</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-emerald-600" />
            {t("title")}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("description")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-700 dark:text-slate-200"
            />
          </div>
          <Button
            onClick={handleGenerate}
            variant="outline"
            size="sm"
            className="rounded-xl"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("generate")}
          </Button>
        </div>
      </div>

      {/* ── Active staff badge ─────────────────────────────────────────────── */}
      {staff.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {staff.filter((s) => s.isActive).length} {t("staff")}
          </span>
        </div>
      )}

      {/* ── Table / Empty State ──────────────────────────────────────────────── */}
      <div className="grid gap-4">
        {isLoadingRecords ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            <span className="text-sm font-medium">جارٍ التحميل...</span>
          </div>
        ) : records.length === 0 ? (
          emptyState
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-left rtl:text-right">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">{t("staff")}</th>
                  <th className="px-6 py-4">{t("baseSalary")}</th>
                  <th className="px-6 py-4">{t("bonuses")}</th>
                  <th className="px-6 py-4">{t("deductions")}</th>
                  <th className="px-6 py-4">{t("net")}</th>
                  <th className="px-6 py-4">{commonT("status")}</th>
                  <th className="px-6 py-4 text-center">
                    {commonT("actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {records.map((record) => (
                  <tr
                    key={record.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Staff name + role badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {getStaffName(record.staffId)}
                      </div>
                      {(() => {
                        const member = staff.find(
                          (s) => s.id === record.staffId,
                        );
                        return member ? (
                          <div className="text-xs text-slate-400 mt-0.5">
                            {member.role}
                          </div>
                        ) : null;
                      })()}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 dark:text-slate-400 font-medium">
                      {record.baseSalary.toLocaleString()} EGP
                    </td>

                    {/* Bonuses — editable inline */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingRecord?.id === record.id ? (
                        <input
                          type="number"
                          value={editingRecord.bonuses}
                          onChange={(e) =>
                            setEditingRecord({
                              ...editingRecord,
                              bonuses: Number(e.target.value),
                            })
                          }
                          className="w-24 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                        />
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          +{record.bonuses.toLocaleString()}
                        </span>
                      )}
                    </td>

                    {/* Deductions — editable inline */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingRecord?.id === record.id ? (
                        <input
                          type="number"
                          value={editingRecord.deductions}
                          onChange={(e) =>
                            setEditingRecord({
                              ...editingRecord,
                              deductions: Number(e.target.value),
                            })
                          }
                          className="w-24 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                        />
                      ) : (
                        <span className="text-red-500 dark:text-red-400 font-bold">
                          -{record.deductions.toLocaleString()}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap font-extrabold text-slate-900 dark:text-white">
                      {record.net.toLocaleString()} EGP
                    </td>

                    {/* Status badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          record.status === "PAID"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : record.status === "PENDING"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {t(`status.${record.status}`)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        {editingRecord?.id === record.id ? (
                          <button
                            onClick={() => handleUpdateRecord(editingRecord)}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all"
                            title="Save changes"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingRecord(record)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                              title="Edit bonuses / deductions"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                            {record.status === "PENDING" && (
                              <button
                                onClick={() =>
                                  handleStatusChange(record, "PAID")
                                }
                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all"
                                title="Mark as paid"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Summary Cards ────────────────────────────────────────────────────── */}
      {records.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="glass-card p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <DollarSign className="h-6 w-6" />
              </div>
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                {t("totalBase")}
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {records
                .reduce((acc, r) => acc + r.baseSalary, 0)
                .toLocaleString()}{" "}
              <span className="text-sm font-bold">EGP</span>
            </div>
          </div>

          <div className="glass-card p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                <TrendingUp className="h-6 w-6" />
              </div>
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                {t("totalBonuses")}
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              +{records.reduce((acc, r) => acc + r.bonuses, 0).toLocaleString()}{" "}
              <span className="text-sm font-bold">EGP</span>
            </div>
          </div>

          <div className="glass-card p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 rounded-2xl bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <TrendingDown className="h-6 w-6" />
              </div>
              <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                {t("totalDeductions")}
              </span>
            </div>
            <div className="text-2xl font-black text-red-500 dark:text-red-400">
              -
              {records
                .reduce((acc, r) => acc + r.deductions, 0)
                .toLocaleString()}{" "}
              <span className="text-sm font-bold">EGP</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
