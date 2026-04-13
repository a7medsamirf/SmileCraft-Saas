"use client";

// =============================================================================
// SmileCraft CMS — Diff Viewer Component
// Displays before/after changes in a readable format
// =============================================================================

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DiffViewerProps {
  diff: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  return String(value);
}

/**
 * Check if a value is an object (not null, not array)
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Format field name for display (camelCase to readable)
 */
function formatFieldName(key: string): string {
  const labels: Record<string, string> = {
    fullName: "الاسم الكامل",
    phone: "الهاتف",
    email: "البريد الإلكتروني",
    dateOfBirth: "تاريخ الميلاد",
    gender: "الجنس",
    bloodGroup: "فصيلة الدم",
    address: "العنوان",
    city: "المدينة",
    notes: "ملاحظات",
    allergies: "الحساسية",
    status: "الحالة",
    isActive: "نشط",
    amount: "المبلغ",
    method: "طريقة الدفع",
    startTime: "وقت البدء",
    endTime: "وقت الانتهاء",
    type: "النوع",
    action: "العملية",
    entityType: "نوع الكيان",
    entityId: "معرف الكيان",
    createdAt: "تاريخ الإنشاء",
    updatedAt: "تاريخ التعديل",
  };

  return labels[key] || key;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DiffViewer({ diff }: DiffViewerProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  // Toggle expand/collapse
  const toggleKey = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // If diff is empty
  if (Object.keys(diff).length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        لا توجد تغييرات مسجلة
      </div>
    );
  }

  // Render diff entries
  return (
    <div className="space-y-3">
      {Object.entries(diff).map(([key, value]) => {
        const isExpanded = expandedKeys.has(key);
        const hasNestedValue = isObject(value);

        return (
          <motion.div
            key={key}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
          >
            {/* Header */}
            <button
              onClick={() => hasNestedValue && toggleKey(key)}
              className={`w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors ${
                hasNestedValue ? "cursor-pointer" : "cursor-default"
              }`}
            >
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {formatFieldName(key)}
              </span>
              {hasNestedValue && (
                isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )
              )}
            </button>

            {/* Value */}
            {(isExpanded || !hasNestedValue) && (
              <div className="px-3 pb-3 pt-0">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 font-mono text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                  {formatValue(value)}
                </div>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
