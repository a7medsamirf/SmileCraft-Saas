// =============================================================================
// SmileCraft CMS — Audit Logging Utility
// Easy-to-use wrapper for creating audit log entries
// Import and use in Server Actions after mutations
// =============================================================================

import { createAuditLogEntry } from "@/features/audit/serverActions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT" | "EXPORT";

export type EntityType =
  | "patient"
  | "appointment"
  | "payment"
  | "invoice"
  | "staff"
  | "inventory"
  | "branch"
  | "clinical_case"
  | "treatment"
  | "user"
  | "service"
  | "clinic_settings";

// ---------------------------------------------------------------------------
// Convenience functions
// ---------------------------------------------------------------------------

/**
 * Log a CREATE action.
 * Call this after creating a new record.
 *
 * @example
 * await auditCreate("patient", patientId, { fullName: "John", phone: "123" });
 */
export async function auditCreate(
  entityType: EntityType,
  entityId: string,
  data?: Record<string, unknown>,
): Promise<void> {
  await createAuditLogEntry("CREATE", entityType, entityId, {
    action: "created",
    entityType,
    data,
  });
}

/**
 * Log an UPDATE action with before/after diff.
 * Call this after updating a record.
 *
 * @example
 * await auditUpdate("patient", patientId, {
 *   before: { fullName: "John", phone: "123" },
 *   after: { fullName: "Jane", phone: "456" }
 * });
 */
export async function auditUpdate(
  entityType: EntityType,
  entityId: string,
  changes: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    changedFields?: string[];
  },
): Promise<void> {
  await createAuditLogEntry("UPDATE", entityType, entityId, {
    action: "updated",
    entityType,
    ...changes,
  });
}

/**
 * Log a DELETE action.
 * Call this after deleting a record.
 *
 * @example
 * await auditDelete("patient", patientId, { fullName: "John" });
 */
export async function auditDelete(
  entityType: EntityType,
  entityId: string,
  deletedData?: Record<string, unknown>,
): Promise<void> {
  await createAuditLogEntry("DELETE", entityType, entityId, {
    action: "deleted",
    entityType,
    data: deletedData,
  });
}

/**
 * Log a generic action.
 * Use this for custom actions not covered by the above.
 *
 * @example
 * await auditLog("EXPORT", "patient", patientId, { format: "PDF" });
 */
export async function auditLog(
  action: AuditAction | string,
  entityType: EntityType | string,
  entityId: string,
  data?: Record<string, unknown>,
): Promise<void> {
  await createAuditLogEntry(action, entityType, entityId, data);
}
