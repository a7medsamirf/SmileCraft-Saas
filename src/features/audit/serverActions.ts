"use server";

// =============================================================================
// SmileCraft CMS — Audit Log Server Actions
// ✅ Fetch, filter, and paginate audit logs
// ✅ Create audit log entries for mutations
// =============================================================================

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  diff: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogFilters {
  action?: string;
  entityType?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface PaginatedAuditLogs {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function getUserClinicId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const dbUser = await prisma.users.findUnique({
      where: { id: user.id },
      select: { clinicId: true },
    });

    return dbUser?.clinicId ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Get Audit Logs Action
// ---------------------------------------------------------------------------

/**
 * Fetch paginated audit logs with filtering.
 *
 * @param page - Page number (1-indexed)
 * @param limit - Items per page
 * @param filters - Optional filters
 */
export async function getAuditLogsAction(
  page: number = 1,
  limit: number = 50,
  filters: AuditLogFilters = {},
): Promise<PaginatedAuditLogs> {
  const clinicId = await getUserClinicId();
  if (!clinicId) {
    return { logs: [], total: 0, page, totalPages: 0 };
  }

  try {
    // Build where clause
    const where: any = { clinicId };

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }

    if (filters.search) {
      where.OR = [
        { action: { contains: filters.search, mode: "insensitive" } },
        { entityType: { contains: filters.search, mode: "insensitive" } },
        { entityId: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;

    // Fetch logs with user info
    const [logs, total] = await Promise.all([
      prisma.audit_logs.findMany({
        where,
        include: {
          users: {
            select: { fullName: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.audit_logs.count({ where }),
    ]);

    // Map to UI type
    const mappedLogs: AuditLogEntry[] = logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userName: log.users?.fullName ?? "Unknown",
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      diff: log.diff as Record<string, unknown> | null,
      createdAt: log.createdAt.toISOString(),
    }));

    return {
      logs: mappedLogs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("[getAuditLogsAction] Error:", error);
    return { logs: [], total: 0, page, totalPages: 0 };
  }
}

// ---------------------------------------------------------------------------
// Create Audit Log Action (Internal)
// ---------------------------------------------------------------------------

/**
 * Create an audit log entry.
 * Call this from Server Actions after mutations.
 *
 * @param action - Action type (CREATE, UPDATE, DELETE, LOGIN, etc.)
 * @param entityType - Entity type (patient, appointment, etc.)
 * @param entityId - Entity ID
 * @param diff - Changes made (JSON object with before/after)
 */
export async function createAuditLogEntry(
  action: string,
  entityType: string,
  entityId: string,
  diff?: Record<string, unknown>,
): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return; // Don't throw - audit logging should not break the main action

    const dbUser = await prisma.users.findUnique({
      where: { id: user.id },
      select: { clinicId: true },
    });

    if (!dbUser?.clinicId) return;

    await prisma.audit_logs.create({
      data: {
        id: crypto.randomUUID(),
        clinicId: dbUser.clinicId,
        userId: user.id,
        action,
        entityType,
        entityId,
        diff: (diff as Prisma.InputJsonValue) || undefined,
      },
    });
  } catch (error) {
    // Log but don't throw - audit failures should not break the main action
    console.error("[createAuditLogEntry] Failed:", error);
  }
}

// ---------------------------------------------------------------------------
// Get Entity Types Action
// ---------------------------------------------------------------------------

/**
 * Get distinct entity types for filter dropdown.
 */
export async function getEntityTypesAction(): Promise<string[]> {
  const clinicId = await getUserClinicId();
  if (!clinicId) return [];

  try {
    const entityTypes = await prisma.audit_logs.findMany({
      where: { clinicId },
      select: { entityType: true },
      distinct: ["entityType"],
    });

    return entityTypes.map((e) => e.entityType).sort();
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Get Actions List Action
// ---------------------------------------------------------------------------

/**
 * Get distinct action types for filter dropdown.
 */
export async function getActionTypesAction(): Promise<string[]> {
  const clinicId = await getUserClinicId();
  if (!clinicId) return [];

  try {
    const actions = await prisma.audit_logs.findMany({
      where: { clinicId },
      select: { action: true },
      distinct: ["action"],
    });

    return actions.map((a) => a.action).sort();
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Get Users Action
// ---------------------------------------------------------------------------

/**
 * Get users who have performed actions for filter dropdown.
 */
export async function getAuditUsersAction(): Promise<
  Array<{ id: string; name: string }>
> {
  const clinicId = await getUserClinicId();
  if (!clinicId) return [];

  try {
    const logs = await prisma.audit_logs.findMany({
      where: { clinicId, userId: { not: null } },
      include: {
        users: {
          select: { id: true, fullName: true },
        },
      },
      distinct: ["userId"],
    });

    return logs
      .filter((log) => log.users)
      .map((log) => ({
        id: log.userId!,
        name: log.users!.fullName,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}
