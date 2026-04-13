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

const PERMISSIONS: PermissionRow[] = [
  { id: "view_patients", key: "viewPatients" },
  { id: "edit_records", key: "editRecords" },
  { id: "view_revenue", key: "viewRevenue" },
  { id: "delete_data", key: "deleteData" },
];

const DEFAULT_PERMISSIONS: Record<PermissionKey, boolean> = {
  view_patients: true,
  edit_records: false,
  view_revenue: false,
  delete_data: false,
};

export function PermissionsTable() {
  const t = useTranslations("Settings.permissions");
  const [staffList, setStaffList] = useState<StaffPermission[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<PermissionKey, boolean>>(
    DEFAULT_PERMISSIONS,
  );
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  // Load staff list on mount
  useEffect(() => {
    startTransition(async () => {
      try {
        const staff = await getStaffPermissionsAction();
        setStaffList(staff);
        if (staff.length > 0) {
          setSelectedStaffId(staff[0].id);
          setPermissions(
            (staff[0].permissions as Record<PermissionKey, boolean>) ??
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
          (staff.permissions as Record<PermissionKey, boolean>) ??
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {t("title")}
        </h2>
        <div className="flex items-center gap-2 text-amber-600 glass px-3 py-1.5 shadow-sm transition-all duration-300">
          <ShieldAlert className="h-4 w-4" />
          <span className="text-xs font-medium">{t("staffGuard")}</span>
        </div>
      </div>

      {/* Staff Selector */}
      <div className="glass-card p-4 space-y-4">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {t("selectStaff")}
        </label>
        <select
          value={selectedStaffId ?? ""}
          onChange={(e) => setSelectedStaffId(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-800 dark:text-white"
        >
          {staffList.map((staff) => (
            <option key={staff.id} value={staff.id}>
              {staff.fullName} — {t(staff.role.toLowerCase() as Parameters<typeof t>[0])}
            </option>
          ))}
        </select>

        {selectedStaff && (
          <div className="flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 dark:bg-blue-900/20">
            <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {selectedStaff.fullName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t(selectedStaff.role.toLowerCase() as Parameters<typeof t>[0])} • ID:{" "}
                {selectedStaff.id.slice(0, 8)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Permissions Table */}
      <div className="overflow-hidden glass-card transition-all duration-300">
        <table className="w-full text-left rtl:text-right">
          <thead className="bg-slate-50/50 text-xs font-semibold uppercase text-slate-500 dark:bg-slate-800/50">
            <tr>
              <th className="px-6 py-4">{t("permission")}</th>
              <th className="px-6 py-4 text-center">
                <div className="flex flex-col items-center">
                  <ShieldCheck className="mb-1 h-5 w-5 text-blue-600" />
                  {t("access")}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {PERMISSIONS.map((perm) => {
              const isChecked = permissions[perm.id] ?? false;

              return (
                <tr
                  key={perm.id}
                  className="transition-colors hover:bg-amber-50 dark:hover:bg-slate-800/50"
                >
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    {t(perm.key)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={isChecked}
                        onChange={() => togglePermission(perm.id)}
                      />
                      <div className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:bg-slate-700 dark:border-slate-600 dark:peer-focus:ring-blue-800"></div>
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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

