"use client";

import React, { useState, useEffect } from "react";
import { Package, FileText, Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { InventoryList } from "@/features/inventory/components/InventoryList";
import { InventoryForm } from "@/features/inventory/components/InventoryForm";
import { InventoryAlerts } from "@/features/inventory/components/InventoryAlerts";
import { InventoryItem } from "@/features/inventory/types";
import { PageTransition } from "@/components/ui/PageTransition";
import { 
  getInventoryItemsAction, 
  createInventoryItemAction, 
  updateInventoryItemAction,
  deleteInventoryItemAction 
} from "@/features/inventory/serverActions";

type InventoryTab = "list" | "add" | "edit" | "alerts" | "reports";

export function InventoryClient() {
  const t = useTranslations("Inventory");
  const [activeTab, setActiveTab] = useState<InventoryTab>("list");
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItems = async () => {
    try {
      setIsLoading(true);
      const data = await getInventoryItemsAction();
      setItems(data);
      setError(null);
    } catch (err) {
      console.error("Failed to load inventory:", err);
      setError(t("loadError") || "Failed to load inventory");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleAddItem = async (data: Partial<InventoryItem>) => {
    try {
      await createInventoryItemAction(data as Omit<InventoryItem, "id">);
      await loadItems();
      setActiveTab("list");
    } catch (err) {
      console.error("Failed to create item:", err);
      setError(t("createError") || "Failed to create item");
    }
  };

  const handleEditItem = async (data: Partial<InventoryItem>) => {
    try {
      if (data.id) {
        await updateInventoryItemAction(data as Omit<InventoryItem, "id"> & { id: string });
        await loadItems();
        setEditingItem(null);
        setActiveTab("list");
      }
    } catch (err) {
      console.error("Failed to update item:", err);
      setError(t("updateError") || "Failed to update item");
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteInventoryItemAction(id);
      await loadItems();
    } catch (err) {
      console.error("Failed to delete item:", err);
      setError(t("deleteError") || "Failed to delete item");
    }
  };

  const handleEditClick = (item: InventoryItem) => {
    setEditingItem(item);
    setActiveTab("edit");
  };

  const tabs = [
    { id: "list", label: t("tabs.list"), icon: Package },
    { id: "alerts", label: t("tabs.alerts"), icon: Bell },
    { id: "reports", label: t("tabs.reports"), icon: FileText },
  ] as const;

  return (
    <PageTransition loadingText={t("title")}>
      <div className="w-full mx-auto pb-20">
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-600/10 dark:bg-emerald-500/10">
                   <Package className="h-8 w-8 text-emerald-600 dark:text-emerald-500" />
               </div>
            {t("title")}
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-2xl">
            {t("description")}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-5 items-start">
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
                  <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-slate-400"}`} />
                  {tab.label}
                </button>
              );
            })}
          </aside>

          <main className="flex-1 w-full p-1 transition-all duration-300">
            <div className="bg-white dark:bg-slate-900 glass-card p-6 sm:p-8 min-h-full">
              {activeTab === "list" && (
                <InventoryList 
                  items={items}
                  isLoading={isLoading}
                  onEdit={handleEditClick} 
                  onAdd={() => setActiveTab("add")}
                  onDelete={handleDeleteItem}
                />
              )}

              {activeTab === "add" && (
                <div className="">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      {t("addItem")}
                    </h2>
                  </div>
                  <InventoryForm
                    onSubmit={handleAddItem}
                    onCancel={() => setActiveTab("list")}
                  />
                </div>
              )}

              {activeTab === "edit" && editingItem && (
                <div className="">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      {t("editItem")}
                    </h2>
                  </div>
                  <InventoryForm
                    initialData={editingItem}
                    onSubmit={handleEditItem}
                    onCancel={() => {
                      setEditingItem(null);
                      setActiveTab("list");
                    }}
                  />
                </div>
              )}

              {activeTab === "alerts" && <InventoryAlerts items={items} />}

              {activeTab === "reports" && (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    {t("reportsComingSoon")}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    {t("reportsDescription")}
                  </p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </PageTransition>
  );
}