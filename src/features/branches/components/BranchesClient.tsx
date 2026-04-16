"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Edit,
  Trash,
  X,
  GitBranch,
  Users,
  Calendar,
  UserCheck,
  Loader2,
  AlertTriangle,
  Search,
  Building2,
} from "lucide-react";
import { BranchForm } from "./BranchForm";
import {
  getBranchesFullAction,
  createBranchAction,
  updateBranchAction,
  deleteBranchAction,
} from "../serverActions";
import type { BranchFull } from "../types";
import type { BranchFormValues } from "../schema";
import { PageTransition } from "@/components/ui/PageTransition";

type BranchesClientProps = {
  initialBranches: BranchFull[];
};

export function BranchesClient({ initialBranches }: BranchesClientProps) {
  const t = useTranslations("Branches");
  const [branches, setBranches] = useState(initialBranches);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchFull | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<BranchFull | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter branches by search query
  const filteredBranches = branches.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.managerName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const handleCreate = async (data: BranchFormValues) => {
    setError(null);
    try {
      await createBranchAction(data.name);
      setShowCreateModal(false);
      startTransition(async () => {
        const updated = await getBranchesFullAction();
        setBranches(updated);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("createError"));
    }
  };

  const handleUpdate = async (data: BranchFormValues) => {
    if (!editingBranch) return;
    setError(null);

    startTransition(async () => {
      const result = await updateBranchAction({
        id: editingBranch.id,
        ...data,
      });

      if (result.success) {
        setEditingBranch(null);
        const updated = await getBranchesFullAction();
        setBranches(updated);
      } else {
        setError(result.error || t("updateError"));
      }
    });
  };

  const handleDelete = async () => {
    if (!deletingBranch) return;
    setError(null);

    startTransition(async () => {
      const result = await deleteBranchAction({ id: deletingBranch.id });

      if (result.success) {
        setDeletingBranch(null);
        const updated = await getBranchesFullAction();
        setBranches(updated);
      } else {
        setError(result.error || t("deleteError"));
      }
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <PageTransition loadingText={t("title")}>
      <div className="w-full mx-auto pb-20">
        {/* ── Page Header ── */}
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-600/10 dark:bg-blue-500/10">
              <GitBranch className="h-8 w-8 text-blue-600 dark:text-blue-500" />
            </div>
            {t("title")}
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-2xl">
            {t("description")}
          </p>
        </div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatCard
            label={t("totalBranches")}
            value={branches.length.toString()}
            icon={<GitBranch className="h-6 w-6" />}
            color="bg-blue-500"
          />
          <StatCard
            label={t("activeBranches")}
            value={branches.filter((b) => b.isActive).length.toString()}
            icon={<UserCheck className="h-6 w-6" />}
            color="bg-emerald-500"
          />
          <StatCard
            label={t("totalPatients")}
            value={branches.reduce((sum, b) => sum + (b._count?.patients || 0), 0).toString()}
            icon={<Users className="h-6 w-6" />}
            color="bg-purple-500"
          />
          <StatCard
            label={t("totalAppointments")}
            value={branches.reduce((sum, b) => sum + (b._count?.appointments || 0), 0).toString()}
            icon={<Calendar className="h-6 w-6" />}
            color="bg-amber-500"
          />
        </div>

        {/* ── Filter Bar ── */}
        <div className="flex flex-col sm:flex-row gap-4 glass-card p-4 transition-all duration-300 mb-6">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full ps-10 pe-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all font-semibold"
          >
            <Plus className="w-5 h-5" />
            <span>{t("addBranch")}</span>
          </button>
        </div>

        {/* ── Error Message ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
            >
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-xs text-red-500 hover:text-red-700"
              >
                {t("dismiss")}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main Content ── */}
        <div className="bg-white dark:bg-slate-900 glass-card p-6 sm:p-8 min-h-full">
          {filteredBranches.length === 0 ? (
            <div className="text-center py-12 glass-card">
              <GitBranch className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 dark:text-slate-400">
                {searchQuery ? t("noResultsFound") : t("noBranches")}
              </p>
              {!searchQuery && (
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
                  {t("noBranchesDescription")}
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto transition-all duration-300">
              <table className="w-full min-w-215">
                <thead className="bg-slate-50/50 text-xs font-semibold uppercase text-slate-500 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4">{t("name")}</th>
                    <th className="px-6 py-4">{t("code")}</th>
                    <th className="px-6 py-4">{t("manager")}</th>
                    <th className="px-6 py-4">{t("contact")}</th>
                    <th className="px-6 py-4 text-center">{t("statistics")}</th>
                    <th className="px-6 py-4 text-center">{t("status")}</th>
                    <th className="px-6 py-4 text-center">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredBranches.map((branch) => (
                    <tr
                      key={branch.id}
                      className="group hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {branch.name}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {formatDate(branch.createdAt)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 font-mono font-semibold">
                          {branch.code}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                        {branch.managerName || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                        {branch.phone || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          <div className="flex items-center gap-1.5" title={`${branch._count?.patients || 0} ${t("patients")}`}>
                            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                              <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="text-xs font-semibold">{branch._count?.patients || 0}</span>
                          </div>
                          <div className="flex items-center gap-1.5" title={`${branch._count?.appointments || 0} ${t("appointments")}`}>
                            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
                              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <span className="text-xs font-semibold">{branch._count?.appointments || 0}</span>
                          </div>
                          <div className="flex items-center gap-1.5" title={`${branch._count?.users || 0} ${t("users")}`}>
                            <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/30">
                              <UserCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <span className="text-xs font-semibold">{branch._count?.users || 0}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            branch.isActive
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {branch.isActive ? t("active") : t("inactive")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditingBranch(branch)}
                            className="p-2 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
                            title={t("edit")}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingBranch(branch)}
                            className="p-2 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                            title={t("delete")}
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Create Modal ── */}
        <AnimatePresence>
          {showCreateModal && (
            <Modal onClose={() => setShowCreateModal(false)}>
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t("addBranch")}</h2>
                    <p className="text-sm text-slate-500 mt-1">{t("addBranchDescription")}</p>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <BranchForm
                  onSubmit={handleCreate}
                  onCancel={() => setShowCreateModal(false)}
                  isSubmitting={isPending}
                />
              </div>
            </Modal>
          )}
        </AnimatePresence>

        {/* ── Edit Modal ── */}
        <AnimatePresence>
          {editingBranch && (
            <Modal onClose={() => setEditingBranch(null)}>
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 ">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                        <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </span>
                      {t("editBranch")}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t("editBranchDescription")}</p>
                  </div>
                  <button
                    onClick={() => setEditingBranch(null)}
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <BranchForm
                  branch={editingBranch}
                  onSubmit={handleUpdate}
                  onCancel={() => setEditingBranch(null)}
                  isSubmitting={isPending}
                />
              </div>
            </Modal>
          )}
        </AnimatePresence>

        {/* ── Delete Confirmation Modal ── */}
        <AnimatePresence>
          {deletingBranch && (
            <Modal onClose={() => setDeletingBranch(null)}>
              <div className="p-6 sm:p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 rounded-2xl bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 shrink-0">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t("deleteBranch")}</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {t("deleteBranchConfirm", { name: deletingBranch.name })}
                    </p>
                    {(deletingBranch._count?.patients || 0) > 0 ||
                    (deletingBranch._count?.appointments || 0) > 0 ||
                    (deletingBranch._count?.users || 0) > 0 ? (
                      <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/40">
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                          {t("deleteBranchWarning")}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700/60">
                  <button
                    onClick={() => setDeletingBranch(null)}
                    className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 
                               bg-white/50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 
                               transition-all font-semibold text-slate-700 dark:text-slate-300"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isPending}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 
                               text-white hover:from-red-700 hover:to-red-800 
                               disabled:opacity-50 disabled:cursor-not-allowed transition-all 
                               flex items-center justify-center gap-2 font-semibold shadow-lg shadow-red-500/25"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t("deleting")}
                      </>
                    ) : (
                      <>
                        <Trash className="w-4 h-4" />
                        {t("delete")}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}

// ── StatCard Component ──

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="glass-card relative overflow-hidden p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl dark:hover:shadow-blue-500/5 group">
      <div className={`absolute -top-6 h-24 w-24 rounded-full opacity-10 blur-2xl transition-all group-hover:scale-150 start-[-1.5rem] end-[-1.5rem] ${color}`} />
      <div className="flex items-center gap-4">
        <div className={`text-white flex h-12 w-12 items-center justify-center rounded-2xl bg-opacity-10 dark:bg-opacity-20 ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

// ── Modal Wrapper Component ──

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative  max-w-2xl w-full max-h-[90vh] overflow-hidden rounded-[2.5rem] border border-slate-200/50 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95"
      >
        {children}
      </motion.div>
    </div>
  );
}