"use client";

// =============================================================================
// SmileCraft CMS — Audit Log Client Component
// Filterable, paginated audit log viewer with diff viewer
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  User,
  Activity,
  Database,
  Search,
} from "lucide-react";
import {
  getAuditLogsAction,
  getEntityTypesAction,
  getActionTypesAction,
  getAuditUsersAction,
  AuditLogEntry,
} from "@/features/audit/serverActions";
import DiffViewer from "@/features/audit/components/DiffViewer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Filters {
  action: string;
  entityType: string;
  userId: string;
  search: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AuditLogClient() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    action: "",
    entityType: "",
    userId: "",
    search: "",
  });
  const [showDiff, setShowDiff] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // Filter options
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getAuditLogsAction(page, 50, {
        action: filters.action || undefined,
        entityType: filters.entityType || undefined,
        userId: filters.userId || undefined,
        search: filters.search || undefined,
      });

      setLogs(result.logs);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error("[AuditLog] Fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, filters]);

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      const [entityTypes, actions, users] = await Promise.all([
        getEntityTypesAction(),
        getActionTypesAction(),
        getAuditUsersAction(),
      ]);
      setEntityTypes(entityTypes);
      setActions(actions);
      setUsers(users);
    };
    fetchFilterOptions();
  }, []);

  // Fetch logs when filters or page change
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Handle filter change
  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({ action: "", entityType: "", userId: "", search: "" });
    setPage(1);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Action badge color
  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case "CREATE":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "UPDATE":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "DELETE":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "LOGIN":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  // Entity type icon
  const getEntityIcon = (entityType: string) => {
    switch (entityType.toLowerCase()) {
      case "patient":
        return "👤";
      case "appointment":
        return "📅";
      case "payment":
      case "invoice":
        return "💰";
      case "staff":
        return "👨‍⚕️";
      case "inventory":
        return "📦";
      default:
        return "📋";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          سجل الأنشطة
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          تتبع جميع العمليات التي تمت في النظام
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            الفلاتر
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              placeholder="بحث..."
              className="w-full pr-10 pl-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Entity Type */}
          <select
            value={filters.entityType}
            onChange={(e) => handleFilterChange("entityType", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">كل الأنواع</option>
            {entityTypes.map((type) => (
              <option key={type} value={type}>
                {getEntityIcon(type)} {type}
              </option>
            ))}
          </select>

          {/* Action */}
          <select
            value={filters.action}
            onChange={(e) => handleFilterChange("action", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">كل العمليات</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>

          {/* User */}
          <select
            value={filters.userId}
            onChange={(e) => handleFilterChange("userId", e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">كل المستخدمين</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        {/* Clear filters button */}
        {(filters.action || filters.entityType || filters.userId || filters.search) && (
          <button
            onClick={clearFilters}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            مسح الفلاتر
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          إجمالي: <span className="font-semibold">{total}</span> عملية
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          صفحة {page} من {totalPages || 1}
        </p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="h-8 w-8 border-3 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"
          />
          <p className="text-sm text-gray-500">جاري التحميل...</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && logs.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Activity className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            لا توجد أنشطة بعد
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            ستظهر هنا عند القيام بعمليات مثل الإنشاء والتعديل والحذف
          </p>
        </div>
      )}

      {/* Logs list */}
      {!isLoading && logs.length > 0 && (
        <div className="space-y-3">
          <AnimatePresence>
            {logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {/* Action badge */}
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${getActionColor(log.action)}`}
                      >
                        {log.action}
                      </span>

                      {/* Entity type */}
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {getEntityIcon(log.entityType)} {log.entityType}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-300">
                          {log.userName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400 font-mono text-xs">
                          {log.entityId.slice(0, 8)}...
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400 text-xs">
                          {formatDate(log.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* View diff button */}
                  {log.diff && (
                    <button
                      onClick={() => {
                        setSelectedLog(log);
                        setShowDiff(log.id);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="عرض التغييرات"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Diff viewer modal */}
                {showDiff === log.id && selectedLog && (
                  <div
                    className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
                    onClick={() => setShowDiff(null)}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative max-w-4xl max-h-[80vh] w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Header */}
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          تفاصيل التغيير
                        </h3>
                        <button
                          onClick={() => setShowDiff(null)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Diff content */}
                      <div className="p-6 overflow-auto max-h-[60vh]">
                        <DiffViewer diff={selectedLog.diff ?? {}} />
                      </div>
                    </motion.div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                    page === pageNum
                      ? "bg-blue-600 text-white"
                      : "border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
