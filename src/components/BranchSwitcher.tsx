"use client";

// =============================================================================
// SmileCraft CMS — Branch Switcher Component
// Allows users to switch between branches within their clinic.
// =============================================================================

import { useState, useTransition } from "react";
import { Link } from "@/i18n/routing";
import { GitBranch, Check, ChevronsUpDown, Loader2, Plus, X, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type Branch = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

type BranchSwitcherProps = {
  branches: Branch[];
  currentBranchId: string | null;
  onSwitch: (branchId: string) => Promise<void>;
  onCreateBranch: (name: string) => Promise<void>;
  isAdmin?: boolean;
};

export function BranchSwitcher({ branches, currentBranchId, onSwitch, onCreateBranch, isAdmin }: BranchSwitcherProps) {
  const t = useTranslations("Branches");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const currentBranch = branches.find((b) => b.id === currentBranchId);
  const isAllBranches = isAdmin && currentBranchId === null;

  const handleSwitch = (branchId: string) => {
    setError(null);
    startTransition(async () => {
      try {
        await onSwitch(branchId);
        setOpen(false);
        setShowCreateForm(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("updateError"));
      }
    });
  };

  // If no branches exist and not admin, don't show anything
  if (branches.length === 0 && !isAdmin) {
    return null;
  }

  // If currentBranchId is null but branches exist (and NOT all branches for admin), show a "select branch" prompt
  if (currentBranchId === null && branches.length > 0 && !isAllBranches) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          disabled={isPending}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
            "bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30",
            "transition-all duration-200 disabled:opacity-50"
          )}
        >
          <GitBranch className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="flex-1 text-right text-amber-300 truncate font-semibold">
            {t("selectBranch")}
          </span>
          <ChevronsUpDown className="w-3.5 h-3.5 text-amber-400" />
        </button>

        {/* Dropdown */}
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div
              className={cn(
                "absolute bottom-full left-0 right-0 mb-2 z-50",
                "bg-[#0B1525] border border-amber-500/30 rounded-lg shadow-xl",
                "overflow-hidden"
              )}
            >
              <div className="p-2">
                <p className="px-3 py-2 text-xs text-amber-300 font-semibold">
                  {t("selectBranchPrompt")}
                </p>
                <div className="border-t border-white/10 mt-1 pt-1">
                  {/* All Branches Option for Admin */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleSwitch("all")}
                      disabled={isPending}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                        "hover:bg-white/5 transition-colors",
                        "disabled:opacity-50",
                        isAllBranches && "bg-blue-500/10"
                      )}
                    >
                      <GitBranch className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="flex-1 text-right text-amber-300 font-bold truncate">
                        {t("allBranches")}
                      </span>
                      {isAllBranches && (
                        <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      )}
                    </button>
                  )}

                  {branches
                    .filter((b) => b.isActive)
                    .map((branch) => (
                      <button
                        key={branch.id}
                        type="button"
                        onClick={() => handleSwitch(branch.id)}
                        disabled={isPending}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                          "hover:bg-white/5 transition-colors",
                          "disabled:opacity-50"
                        )}
                      >
                        <GitBranch className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="flex-1 text-right text-slate-300 truncate">
                          {branch.name}
                        </span>
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  const handleCreateBranch = () => {
    if (!newBranchName.trim()) return;

    setIsCreating(true);
    setError(null);

    onCreateBranch(newBranchName.trim())
      .then(() => {
        setNewBranchName("");
        setShowCreateForm(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t("createError"));
      })
      .finally(() => {
        setIsCreating(false);
      });
  };

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => (branches.length > 1 || isAdmin) && setOpen(!open)}
        disabled={isPending}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
          "bg-white/5 hover:bg-white/10 border border-white/10",
          "transition-all duration-200 disabled:opacity-50",
          (branches.length <= 1 && !isAdmin) && "cursor-default"
        )}
      >
        <GitBranch className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="flex-1 text-right text-slate-300 truncate">
          {isAllBranches ? t("allBranches") : (currentBranch?.name || t("name"))}
        </span>
        {(branches.length > 1 || isAdmin) && (
          isPending ? (
            <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin" />
          ) : (
            <ChevronsUpDown className="w-3.5 h-3.5 text-slate-500" />
          )
        )}
      </button>

      {/* Dropdown */}
      {open && (branches.length > 1 || isAdmin) && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setShowCreateForm(false); }} />

          {/* Menu */}
          <div
            className={cn(
              "absolute bottom-full left-0 right-0 mb-2 z-50",
              "bg-[#0B1525] border border-white/10 rounded-lg shadow-xl",
              "overflow-hidden"
            )}
          >
            {showCreateForm ? (
              /* Create Branch Form */
              <div className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{t("addBranch")}</span>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder:text-slate-500 outline-none focus:border-blue-500/50"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleCreateBranch()}
                />
                <button
                  onClick={handleCreateBranch}
                  disabled={isCreating || !newBranchName.trim()}
                  className={cn(
                    "w-full py-2 rounded-lg text-sm font-bold transition-all",
                    "bg-blue-500 text-white hover:bg-blue-600",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    isCreating && "bg-blue-500/50"
                  )}
                >
                  {isCreating ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {t("creating")}
                    </span>
                  ) : (
                    t("create")
                  )}
                </button>
              </div>
            ) : (
              <div className="p-1">
                {/* All Branches Option for Admin */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleSwitch("all")}
                    disabled={isPending}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                      "hover:bg-white/5 transition-colors",
                      "disabled:opacity-50",
                      isAllBranches && "bg-blue-500/10"
                    )}
                  >
                    <GitBranch className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="flex-1 text-right text-amber-300 font-bold truncate">
                      {t("allBranches")}
                    </span>
                    {isAllBranches && (
                      <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    )}
                  </button>
                )}

                {branches
                  .filter((b) => b.isActive)
                  .map((branch) => (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => handleSwitch(branch.id)}
                      disabled={isPending}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                        "hover:bg-white/5 transition-colors",
                        "disabled:opacity-50",
                        branch.id === currentBranchId && "bg-blue-500/10"
                      )}
                    >
                      <GitBranch className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="flex-1 text-right text-slate-300 truncate">
                        {branch.name}
                      </span>
                      {branch.id === currentBranchId && (
                        <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      )}
                    </button>
                  ))}

                {/* Add Branch Button */}
                <div className="mt-1 pt-1 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-bold">{t("addBranch")}</span>
                  </button>
                  
                  {/* Manage Branches Link */}
                  <Link
                    href="/branches"
                    onClick={() => setOpen(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-blue-400 hover:bg-blue-500/10 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-bold">{t("title")}</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Error */}
      {error && (
        <p className="mt-2 text-[11px] text-red-400 text-center">{error}</p>
      )}
    </div>
  );
}
