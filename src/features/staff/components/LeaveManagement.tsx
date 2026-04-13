"use client";

import React, {
  useState,
  useEffect,
  useTransition,
  useMemo,
  useCallback,
} from "react";
import {
  CalendarOff,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  FileText,
  Loader2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { LeaveRequest, LeaveType, StaffMember } from "../types";
import {
  getLeaveRequestsAction,
  createLeaveRequestAction,
  updateLeaveStatusAction,
} from "../serverActions";

interface LeaveManagementProps {
  staffId?: string;
  staff: StaffMember[];
}

export function LeaveManagement({ staffId, staff }: LeaveManagementProps) {
  const t = useTranslations("Staff.leaves");

  // ── State ──────────────────────────────────────────────────────────────────
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedType, setSelectedType] = useState<LeaveType>("ANNUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");

  // ── Load leaves from DB on mount / staffId change ──────────────────────────
  const loadLeaves = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getLeaveRequestsAction(staffId);
      setLeaves(data);
    } catch {
      setLeaves([]);
    } finally {
      setIsLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  // ── Sorted leave list ──────────────────────────────────────────────────────
  const sortedLeaves = useMemo(
    () =>
      [...leaves].sort(
        (a, b) =>
          new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
      ),
    [leaves],
  );

  // ── Status badge ───────────────────────────────────────────────────────────
  const getStatusBadge = (status: LeaveRequest["status"]) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <AlertCircle className="h-3 w-3" />
            {t("status.pending")}
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle className="h-3 w-3" />
            {t("status.approved")}
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="h-3 w-3" />
            {t("status.rejected")}
          </span>
        );
    }
  };

  // ── Leave-type badge colour ────────────────────────────────────────────────
  const getTypeBadge = (type: LeaveType) => {
    switch (type) {
      case "ANNUAL":
        return "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "SICK":
        return "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "EMERGENCY":
        return "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case "UNPAID":
        return "bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400";
    }
  };

  // ── Submit new leave request ───────────────────────────────────────────────
  const handleSubmitRequest = () => {
    const targetStaffId = staffId ?? selectedStaffId;
    if (!startDate || !endDate || !reason || !targetStaffId) return;

    startTransition(async () => {
      const newLeave = await createLeaveRequestAction({
        staffId: targetStaffId,
        type: selectedType,
        startDate,
        endDate,
        reason,
      });
      setLeaves((prev) => [newLeave, ...prev]);
      setShowRequestForm(false);
      setSelectedStaffId("");
      setStartDate("");
      setEndDate("");
      setReason("");
    });
  };

  // ── Approve / Reject ───────────────────────────────────────────────────────
  const handleReview = (leaveId: string, approve: boolean) => {
    const nextStatus = approve ? "APPROVED" : "REJECTED";
    // Optimistic update
    setLeaves((prev) =>
      prev.map((l) =>
        l.id === leaveId
          ? {
              ...l,
              status: nextStatus,
              reviewedAt: new Date().toISOString(),
              reviewedBy: "admin",
            }
          : l,
      ),
    );
    startTransition(async () => {
      await updateLeaveStatusAction(leaveId, nextStatus, "admin");
    });
  };

  // ── Input class helper ─────────────────────────────────────────────────────
  const inputCls =
    "relative w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CalendarOff className="h-5 w-5" />
          {t("title")}
        </h2>
        {!staffId && (
          <Button
            onClick={() => setShowRequestForm(!showRequestForm)}
            className="rounded-2xl shadow-emerald-500/20 shadow-lg"
          >
            <CalendarOff className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
            {t("requestLeave")}
          </Button>
        )}
      </div>

      {/* Request Form */}
      {showRequestForm && (
        <div className="glass-card p-6 space-y-4 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-bold text-slate-900 dark:text-white">
            {t("newRequest")}
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Staff selector — admin view only */}
            {!staffId && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t("employee")}
                </label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">{t("selectEmployee")}</option>
                  {staff
                    .filter((s) => s.isActive)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName}
                      </option>
                    ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("type")}
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as LeaveType)}
                className={inputCls}
              >
                <option value="ANNUAL">{t("types.annual")}</option>
                <option value="SICK">{t("types.sick")}</option>
                <option value="EMERGENCY">{t("types.emergency")}</option>
                <option value="UNPAID">{t("types.unpaid")}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("startDate")}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("endDate")}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {t("reason")}
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("reasonPlaceholder")}
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowRequestForm(false)}
              className="rounded-xl"
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleSubmitRequest}
              disabled={
                isPending ||
                !startDate ||
                !endDate ||
                !reason ||
                (!staffId && !selectedStaffId)
              }
              className="rounded-2xl"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : null}
              {t("submitRequest")}
            </Button>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading ? (
         <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            <span className="text-sm font-medium">جارٍ التحميل...</span>
          </div>
      ) : sortedLeaves.length === 0 ? (
        <div className="text-center py-12 glass-card">
          <CalendarOff className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 dark:text-slate-400">{t("noLeaves")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedLeaves.map((leave) => {
            const member = staff.find((s) => s.id === leave.staffId);
            return (
              <div
                key={leave.id}
                className="glass-card p-4 transition-all duration-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800">
                      <User className="h-5 w-5 text-slate-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {member?.fullName ?? t("unknownStaff")}
                        </span>
                        {getStatusBadge(leave.status)}
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getTypeBadge(leave.type)}`}
                        >
                          {t(`types.${leave.type.toLowerCase()}`)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(
                            leave.startDate,
                          ).toLocaleDateString()} —{" "}
                          {new Date(leave.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-2 text-sm text-slate-500">
                        <FileText className="h-4 w-4" />
                        {leave.reason}
                      </div>
                    </div>
                  </div>

                  {leave.status === "PENDING" && !staffId && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleReview(leave.id, true)}
                        className="rounded-xl text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleReview(leave.id, false)}
                        className="rounded-xl text-red-600 hover:bg-red-50 hover:border-red-200"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
