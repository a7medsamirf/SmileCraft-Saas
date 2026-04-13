"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Calendar,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { inventoryService } from "../services/inventoryService";
import { InventoryItem, InventoryAlert } from "../types";

interface InventoryAlertsProps {
  items: InventoryItem[];
}

export function InventoryAlerts({ items }: InventoryAlertsProps) {
  const t = useTranslations("Inventory");
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());

  const alerts = useMemo(() => {
    const generatedAlerts: InventoryAlert[] = [];
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    items.forEach((item) => {
      if (item.expiryDate) {
        const expiryDate = new Date(item.expiryDate);
        if (expiryDate < now) {
          generatedAlerts.push({
            id: `${item.id}-expired`,
            itemId: item.id,
            itemName: item.name,
            type: "EXPIRED",
            message: t("alerts.expiredMessage", { name: item.name }),
            createdAt: expiryDate.toISOString(),
            acknowledged: acknowledgedIds.has(`${item.id}-expired`),
          });
        } else if (expiryDate < thirtyDaysFromNow) {
          generatedAlerts.push({
            id: `${item.id}-expiring`,
            itemId: item.id,
            itemName: item.name,
            type: "EXPIRING_SOON",
            message: t("alerts.expiringMessage", { name: item.name, date: expiryDate.toLocaleDateString() }),
            createdAt: now.toISOString(),
            acknowledged: acknowledgedIds.has(`${item.id}-expiring`),
          });
        }
      }

      if (item.quantity === 0) {
        generatedAlerts.push({
          id: `${item.id}-out`,
          itemId: item.id,
          itemName: item.name,
          type: "OUT_OF_STOCK",
          message: t("alerts.outOfStockMessage", { name: item.name }),
          createdAt: now.toISOString(),
          acknowledged: acknowledgedIds.has(`${item.id}-out`),
        });
      } else if (item.quantity <= item.minQuantity) {
        generatedAlerts.push({
          id: `${item.id}-low`,
          itemId: item.id,
          itemName: item.name,
          type: "LOW_STOCK",
          message: t("alerts.lowStockMessage", { name: item.name, quantity: item.quantity }),
          createdAt: now.toISOString(),
          acknowledged: acknowledgedIds.has(`${item.id}-low`),
        });
      }
    });

    return generatedAlerts.sort((a, b) => {
      if (a.acknowledged !== b.acknowledged) return a.acknowledged ? 1 : -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [items, acknowledgedIds, t]);

  const handleAcknowledge = (alertId: string) => {
    setAcknowledgedIds((prev) => new Set([...prev, alertId]));
  };

  const handleClearAcknowledged = () => {
    setAcknowledgedIds(new Set());
  };

  const getTypeIcon = (type: InventoryAlert["type"]) => {
    switch (type) {
      case "LOW_STOCK":
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      case "OUT_OF_STOCK":
        return <Package className="h-5 w-5 text-red-600" />;
      case "EXPIRING_SOON":
        return <Clock className="h-5 w-5 text-orange-600" />;
      case "EXPIRED":
        return <XCircle className="h-5 w-5 text-slate-600" />;
    }
  };

  const getTypeColor = (type: InventoryAlert["type"]) => {
    switch (type) {
      case "LOW_STOCK":
        return "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800";
      case "OUT_OF_STOCK":
        return "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800";
      case "EXPIRING_SOON":
        return "bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800";
      case "EXPIRED":
        return "bg-slate-50 border-slate-200 dark:bg-slate-900/20 dark:border-slate-800";
    }
  };

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;
  const acknowledgedCount = alerts.filter((a) => a.acknowledged).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t("alerts.title")}
        </h2>
        {acknowledgedCount > 0 && (
          <Button
            variant="outline"
            onClick={handleClearAcknowledged}
            className="rounded-xl"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t("alerts.clearAcknowledged")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/30">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">{t("alerts.unacknowledged")}</p>
              <p className="text-lg font-bold text-amber-600">{unacknowledgedCount}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">{t("alerts.acknowledged")}</p>
              <p className="text-lg font-bold text-emerald-600">{acknowledgedCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`glass-card p-4 rounded-2xl border transition-all duration-300 ${getTypeColor(alert.type)} ${alert.acknowledged ? "opacity-60" : ""}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 rounded-xl bg-white/50 dark:bg-slate-800/50">
                  {getTypeIcon(alert.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {alert.itemName}
                    </span>
                    {alert.acknowledged && (
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    )}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{alert.message}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                    <Calendar className="h-3 w-3" />
                    {new Date(alert.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              {!alert.acknowledged && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAcknowledge(alert.id)}
                  className="rounded-xl"
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}

        {alerts.length === 0 && (
          <div className="text-center py-12 glass-card">
            <CheckCircle className="h-12 w-12 mx-auto text-emerald-300 mb-3" />
            <p className="text-slate-500 dark:text-slate-400">{t("alerts.noAlerts")}</p>
          </div>
        )}
      </div>
    </div>
  );
}