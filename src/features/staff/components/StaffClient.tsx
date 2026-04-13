"use client";

import React, { useState, useTransition } from "react";

import { Users, CalendarOff, DollarSign, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { StaffList } from "@/features/staff/components/StaffList";
import { StaffForm } from "@/features/staff/components/StaffForm";
import { LeaveManagement } from "@/features/staff/components/LeaveManagement";
import { PayrollManagement } from "@/features/staff/components/PayrollManagement";
import { StaffMember } from "@/features/staff/types";
import { PageTransition } from "@/components/ui/PageTransition";
import {
  createStaffMemberAction,
  deleteStaffMemberAction,
  updateStaffMemberAction,
} from "@/features/staff/serverActions";

type StaffTab = "list" | "add" | "edit" | "leaves" | "payroll";

interface StaffClientProps {
  initialStaff: StaffMember[];
}

export function StaffClient({ initialStaff }: StaffClientProps) {
  const t = useTranslations("Staff");
  const [activeTab, setActiveTab] = useState<StaffTab>("list");
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [isMutating, startTransition] = useTransition();

  const handleAddStaff = async (data: Partial<StaffMember>) => {
    startTransition(async () => {
      const created = await createStaffMemberAction(
        data as Omit<StaffMember, "id">,
      );
      const normalized: StaffMember = {
        id: created.id,
        fullName: created.fullName,
        role: created.role,
        specialty: created.specialty,
        certifications: created.certifications,
        email: created.email,
        phone: created.phone,
        joinDate: created.joinDate,
        salary: created.salary,
        isActive: created.isActive,
      };
      setStaff((prev) => [...prev, normalized]);
      setActiveTab("list");
    });
  };

  const handleEditStaff = async (data: Partial<StaffMember>) => {
    if (!data.id) return;
    startTransition(async () => {
      const updated = await updateStaffMemberAction(data.id!, data);
      const normalized: StaffMember = {
        id: updated.id,
        fullName: updated.fullName,
        role: updated.role,
        specialty: updated.specialty,
        certifications: updated.certifications,
        email: updated.email,
        phone: updated.phone,
        joinDate: updated.joinDate,
        salary: updated.salary,
        isActive: updated.isActive,
      };
      setStaff((prev) =>
        prev.map((member) =>
          member.id === normalized.id ? normalized : member,
        ),
      );
      setEditingStaff(null);
      setActiveTab("list");
    });
  };
  const handleToggleStatus = (member: StaffMember) => {
    startTransition(async () => {
      const updated = await updateStaffMemberAction(member.id, {
        isActive: !member.isActive,
      });
      setStaff((prev) =>
        prev.map((item) =>
          item.id === member.id
            ? { ...item, isActive: updated.isActive }
            : item,
        ),
      );
    });
  };

  const handleDeleteStaff = (member: StaffMember) => {
    startTransition(async () => {
      await deleteStaffMemberAction(member.id);
      setStaff((prev) => prev.filter((item) => item.id !== member.id));
    });
  };

  const handleEditClick = (staff: StaffMember) => {
    setEditingStaff(staff);
    setActiveTab("edit");
  };

  const tabs = [
    { id: "list", label: t("tabs.list"), icon: Users },
    { id: "leaves", label: t("tabs.leaves"), icon: CalendarOff },
    { id: "payroll", label: t("tabs.payroll"), icon: DollarSign },
  ] as const;

  return (
    <PageTransition loadingText={t("title")}>
      <div className="w-full mx-auto pb-20">
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
               <div className="p-3 rounded-2xl bg-emerald-600/10 dark:bg-emerald-500/10">
                <Users className="h-8 w-8 text-emerald-600 dark:text-emerald-500" />
              </div>

            {t("title")}
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-2xl">
            {t("description")}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* Sidebar Tabs */}
          <aside className="w-full lg:w-64 shrink-0 space-y-2 glass-card p-2 transition-all duration-300">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${isActive ? "text-white" : "text-slate-400"}`}
                  />
                  {tab.label}
                </button>
              );
            })}
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 w-full p-1 transition-all duration-300">
            <div className="bg-white dark:bg-slate-900 glass-card p-6 sm:p-8 min-h-full">
              {activeTab === "list" && (
                <StaffList
                  staff={staff}
                  isMutating={isMutating}
                  onEdit={handleEditClick}
                  onAdd={() => setActiveTab("add")}
                  onToggleStatus={handleToggleStatus}
                  onDelete={handleDeleteStaff}
                />
              )}

              {activeTab === "add" && (
                <div className="">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <UserPlus className="h-5 w-5" />
                      {t("addStaff")}
                    </h2>
                  </div>
                  <StaffForm
                    onSubmit={handleAddStaff}
                    onCancel={() => setActiveTab("list")}
                  />
                </div>
              )}

              {activeTab === "edit" && editingStaff && (
                <div className="">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <UserPlus className="h-5 w-5" />
                      {t("editStaff")}
                    </h2>
                  </div>
                  <StaffForm
                    initialData={editingStaff}
                    onSubmit={handleEditStaff}
                    onCancel={() => {
                      setEditingStaff(null);
                      setActiveTab("list");
                    }}
                  />
                </div>
              )}

              {activeTab === "leaves" && <LeaveManagement staff={staff} />}

              {activeTab === "payroll" && <PayrollManagement staff={staff} />}
            </div>
          </main>
        </div>
      </div>
    </PageTransition>
  );
}
