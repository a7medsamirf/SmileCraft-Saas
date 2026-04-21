"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Users,
  CheckCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import {
  getAllStaffPermissionsAction,
  getStaffPermissionsAction,
  updateStaffPermissionsAction,
} from "../serverActions";
import { PermissionKey } from "@/features/staff/types";

interface StaffPermission {
  id: string;
  fullName: string;
  role: string;
  permissions: Record<string, unknown>;
}

interface PermissionRow {
  id: PermissionKey;
  key: string;
}

const FUNCTIONAL_PERMISSIONS: PermissionRow[] = [
  { id: "view_patients", key: "viewPatients" },
  { id: "edit_records", key: "editRecords" },
  { id: "view_revenue", key: "viewRevenue" },
  { id: "delete_data", key: "deleteData" },
];

const PAGE_VISIBILITY_PERMISSIONS: PermissionRow[] = [
  { id: "view_dashboard", key: "view_dashboard" },
  { id: "view_patients", key: "view_patients" }, // Using both for now
  { id: "view_appointments", key: "view_appointments" },
  { id: "view_calendar", key: "view_calendar" },
  { id: "view_clinical", key: "view_clinical" },
  { id: "view_assistant", key: "view_assistant" },
  { id: "view_staff", key: "view_staff" },
  { id: "view_inventory", key: "view_inventory" },
  { id: "view_finance", key: "view_finance" },
  { id: "view_branches", key: "view_branches" },
  { id: "view_schedule", key: "view_schedule" },
  { id: "view_settings", key: "view_settings" },
];

const DEFAULT_PERMISSIONS: Partial<Record<PermissionKey, boolean>> = {
  view_patients: true,
  view_dashboard: true,
  view_appointments: true,
};

export function PermissionsTable() {
  const t = useTranslations("Settings.permissions");
  const [staffList, setStaffList] = useState<StaffPermission[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Partial<Record<PermissionKey, boolean>>>(
    DEFAULT_PERMISSIONS,
  );
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  // Load staff list on mount
  useEffect(() => {
    startTransition(async () => {
      try {
        const staff = await getAllStaffPermissionsAction();
        setStaffList(staff);
        if (staff.length > 0) {
          setSelectedStaffId(staff[0].id);
          setPermissions(
            (staff[0].permissions as Partial<Record<PermissionKey, boolean>>) ??
              DEFAULT_PERMISSIONS,
          );
        }
      } catch (error) {
        console.error("Failed to load staff permissions:", error);
      } finally {
        setIsLoading(false);
      }
    });
  }, []);

  // Update permissions when selected staff changes
  useEffect(() => {
    if (selectedStaffId) {
      const staff = staffList.find((s) => s.id === selectedStaffId);
      if (staff) {
        setPermissions(
          (staff.permissions as Partial<Record<PermissionKey, boolean>>) ??
            DEFAULT_PERMISSIONS,
        );
      }
    }
  }, [selectedStaffId, staffList]);

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId);

  const togglePermission = (permId: PermissionKey) => {
    setPermissions((prev) => ({
      ...prev,
      [permId]: !prev[permId],
    }));
  };

  const handleSave = () => {
    if (!selectedStaffId) return;

    startTransition(async () => {
      try {
        await updateStaffPermissionsAction(selectedStaffId, permissions);
        toast.success(t("saveSuccess"));
        
        // Refresh local list state
        setStaffList(prev => prev.map(s => 
          s.id === selectedStaffId ? { ...s, permissions: { ...permissions } } : s
        ));
      } catch (error) {
        console.error("Failed to save permissions:", error);
        toast.error(t("saveError"));
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">{t("loading")}</div>
      </div>
    );
  }

  if (staffList.length === 0) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("title")}
          </h2>
        </div>
        <div className="glass-card p-8 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t("noStaffTitle")}
          </h3>
          <p className="mt-2 text-sm text-slate-500">{t("noStaffDesc")}</p>
        </div>
      </div>
    );
  }

  const renderTable = (title: string, perms: PermissionRow[]) => (
    <div className="overflow-hidden glass-card transition-all duration-300">
      <div className="bg-slate-50/80 px-6 py-3 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">{title}</h3>
      </div>
      <table className="w-full text-left rtl:text-right">
        <thead className="bg-slate-50/30 text-[10px] font-bold uppercase text-slate-400 dark:bg-slate-800/30">
          <tr>
            <th className="px-6 py-3">{t("permission")}</th>
            <th className="px-6 py-3 text-center w-24">{t("access")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {perms.map((perm) => {
            const isChecked = permissions[perm.id] ?? false;

            return (
              <tr
                key={perm.id}
                className="transition-colors hover:bg-blue-50/30 dark:hover:bg-blue-900/10"
              >
                <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300 text-sm">
                  {t(perm.key as any)}
                </td>
                <td className="px-6 py-4 text-center">
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={isChecked}
                      onChange={() => togglePermission(perm.id)}
                    />
                    <div className="h-5 w-10 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-focus:outline-none dark:bg-slate-700 dark:border-slate-600"></div>
                  </label>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {t("title")}
          </h2>
          <p className="text-sm text-slate-500 mt-1">تخصيص الصلاحيات لكل موظف على حدة</p>
        </div>
        <div className="flex items-center gap-2 text-amber-600 glass px-3 py-1.5 shadow-sm transition-all duration-300 w-fit">
          <ShieldAlert className="h-4 w-4" />
          <span className="text-xs font-medium">{t("staffGuard")}</span>
        </div>
      </div>

      {/* Staff Selector */}
      <div className="glass-card p-5 space-y-4">
        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
          {t("selectStaff")}
        </label>
        <select
          value={selectedStaffId ?? ""}
          onChange={(e) => setSelectedStaffId(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-800 dark:text-white"
        >
          {staffList.map((staff) => (
            <option key={staff.id} value={staff.id}>
              {staff.fullName} — {t(staff.role.toLowerCase() as any)}
            </option>
          ))}
        </select>

        {selectedStaff && (
          <div className="flex items-center gap-3 rounded-xl bg-blue-50/50 px-4 py-3 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
            <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {selectedStaff.fullName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t(selectedStaff.role.toLowerCase() as any)} • ID:{" "}
                {selectedStaff.id.slice(0, 8)}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Functional Permissions */}
        {renderTable("صلاحيات الوظائف", FUNCTIONAL_PERMISSIONS)}

        {/* Page Visibility */}
        {renderTable("ظهور الصفحات في القائمة", PAGE_VISIBILITY_PERMISSIONS)}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isPending}
          className="rounded-2xl shadow-blue-500/20 shadow-lg"
        >
          {isPending ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {t("saving")}
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              {t("savePermissions")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

