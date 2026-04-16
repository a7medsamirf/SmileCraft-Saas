"use client";

import React, { useState, useMemo } from "react";
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingDown,
  Calendar,
  Tag,
  DollarSign,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { InventoryItem, InventoryCategory, StockStatus } from "../types";
import { inventoryService } from "../services/inventoryService";

interface InventoryListProps {
  items: InventoryItem[];
  isLoading: boolean;
  onEdit: (item: InventoryItem) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}

export function InventoryList({ items, isLoading, onEdit, onAdd, onDelete }: InventoryListProps) {
  const t = useTranslations("Inventory");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<InventoryCategory | "ALL">("ALL");
  const [filterStatus, setFilterStatus] = useState<StockStatus | "ALL">("ALL");

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === "ALL" || item.category === filterCategory;
      const itemStatus = inventoryService.getStockStatus(item);
      const matchesStatus = filterStatus === "ALL" || itemStatus === filterStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, searchTerm, filterCategory, filterStatus]);

  const getStatusBadge = (item: InventoryItem) => {
    const status = inventoryService.getStockStatus(item);
    switch (status) {
      case "IN_STOCK":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle className="h-3 w-3" />
            {t("status.inStock")}
          </span>
        );
      case "LOW_STOCK":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            {t("status.lowStock")}
          </span>
        );
      case "OUT_OF_STOCK":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="h-3 w-3" />
            {t("status.outOfStock")}
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-900/30 dark:text-slate-400">
            <Clock className="h-3 w-3" />
            {t("status.expired")}
          </span>
        );
    }
  };

  const getCategoryBadge = (category: InventoryCategory) => {
    switch (category) {
      case "ANESTHETICS":
        return "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case "MATERIALS":
        return "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "STERILIZATION":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "INSTRUMENTS":
        return "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "OTHER":
        return "bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400";
    }
  };

  const handleDelete = (id: string) => {
    if (confirm(t("confirmDelete"))) {
      onDelete(id);
    }
  };

  const totalValue = inventoryService.getInventoryValue(items);
  const lowStockCount = inventoryService.getLowStockItems(items).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        <span className="ms-3 text-sm font-medium text-slate-500">
          {t("loading") || "Loading..."}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">{t("stats.totalItems")}</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{items.length}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">{t("stats.totalValue")}</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{totalValue.toLocaleString()} EGP</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/30">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">{t("stats.lowStock")}</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{lowStockCount}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-50 dark:bg-red-900/30">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">{t("stats.expiring")}</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{inventoryService.getExpiringItems(items).length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Package className="h-5 w-5" />
          {t("listTitle")}
        </h2>
        <Button onClick={onAdd} className="rounded-2xl shadow-emerald-500/20 shadow-lg">
          <Plus className="mr-2 h-4 w-4 rtl:ml-2 rtl:mr-0" />
          {t("addItem")}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 glass-card p-4 transition-all duration-300">
        <div className="relative flex-1">
          <Input
            placeholder={t("search")}
            icon={<Search className="h-5 w-5" />}
            className="rounded-2xl border-slate-200/80 bg-white/80"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as InventoryCategory | "ALL")}
            className="rounded-xl border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-800"
          >
            <option value="ALL">{t("filterAll")}</option>
            <option value="ANESTHETICS">{t("categories.anesthetics")}</option>
            <option value="MATERIALS">{t("categories.materials")}</option>
            <option value="STERILIZATION">{t("categories.sterilization")}</option>
            <option value="INSTRUMENTS">{t("categories.instruments")}</option>
            <option value="OTHER">{t("categories.other")}</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as StockStatus | "ALL")}
            className="rounded-xl border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-800"
          >
            <option value="ALL">{t("filterAllStatus")}</option>
            <option value="IN_STOCK">{t("status.inStock")}</option>
            <option value="LOW_STOCK">{t("status.lowStock")}</option>
            <option value="OUT_OF_STOCK">{t("status.outOfStock")}</option>
            <option value="EXPIRED">{t("status.expired")}</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto transition-all duration-300">
        <table className="w-full min-w-215">
          <thead className="bg-slate-50/50 text-xs font-semibold uppercase text-slate-500 dark:bg-slate-800/50">
            <tr>
              <th className="px-6 py-4">{t("name")}</th>
              <th className="px-6 py-4">{t("category")}</th>
              <th className="px-6 py-4 text-center">{t("quantity")}</th>
              <th className="px-6 py-4">{t("status.label")}</th>
              <th className="px-6 py-4">{t("expiry")}</th>
              <th className="px-6 py-4">{t("price")}</th>
              <th className="px-6 py-4 text-center">{t("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredItems.map((item) => (
              <tr
                key={item.id}
                className="group hover:bg-amber-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{item.name}</p>
                    {item.supplier && (
                      <p className="text-xs text-slate-500">{item.supplier}</p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getCategoryBadge(item.category)}`}>
                    <Tag className="h-3 w-3 mr-1" />
                    {t(`categories.${item.category.toLowerCase()}`)}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`font-bold ${item.quantity <= item.minQuantity ? "text-red-600" : "text-slate-900 dark:text-white"}`}>
                    {item.quantity} {item.unit}
                  </span>
                </td>
                <td className="px-6 py-4">{getStatusBadge(item)}</td>
                <td className="px-6 py-4">
                  {item.expiryDate ? (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className={new Date(item.expiryDate) < new Date() ? "text-red-600" : "text-slate-600 dark:text-slate-400"}>
                        {new Date(item.expiryDate).toLocaleDateString()}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-slate-900 dark:text-white">
                    {item.unitPrice.toLocaleString()} EGP
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(item)}
                      className="rounded-xl"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                      className="rounded-xl text-red-600 hover:bg-red-50 hover:border-red-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 glass-card">
          <Package className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 dark:text-slate-400">{t("noItemsFound")}</p>
        </div>
      )}
    </div>
  );
}

import { Loader2 } from "lucide-react";