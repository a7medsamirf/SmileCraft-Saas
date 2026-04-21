"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { InventoryItem, InventoryCategory } from "./types";
import {
  createInventoryItemSchema,
  updateInventoryItemSchema,
  updateQuantitySchema,
  deleteInventoryItemSchema
} from "./schema";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { auditCreate, auditUpdate, auditDelete } from "@/lib/audit";

/**
 * Auth helper — returns clinicId, branchId and role (never throws)
 */
async function getAuthContext(): Promise<{ 
  clinicId: string | null; 
  branchId: string | null; 
  role: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { clinicId: null, branchId: null, role: null };

    const dbUser = await prisma.users.findUnique({
      where: { id: user.id },
      select: { clinicId: true, branchId: true, role: true },
    });

    return {
      clinicId: dbUser?.clinicId ?? null,
      branchId: dbUser?.branchId ?? null,
      role: dbUser?.role ?? null,
    };
  } catch {
    return { clinicId: null, branchId: null, role: null };
  }
}

export async function getInventoryItemsAction() {
  const { clinicId, branchId, role } = await getAuthContext();
  if (!clinicId) return [];

  const where: any = { clinicId };
  
  // Apply branch isolation for non-admins
  if (role !== "ADMIN" && branchId) {
    where.branchId = branchId;
  }

  const items = await prisma.inventory_items.findMany({
    where,
    orderBy: { name: "asc" }
  });

  return items.map(item => ({
    id: item.id,
    name: item.name,
    category: item.category as InventoryCategory,
    quantity: item.quantity,
    minQuantity: item.minStock,
    unit: item.unit,
    unitPrice: Number(item.price),
    supplier: item.supplier || undefined,
    expiryDate: item.expiryDate?.toISOString(),
    location: item.location || undefined,
    notes: item.notes || undefined
  })) as InventoryItem[];
}

export async function createInventoryItemAction(payload: Omit<InventoryItem, "id">) {
  const { clinicId, branchId } = await getAuthContext();
  if (!clinicId) throw new Error("Unauthorized");

  // Check rate limit (20 creates per minute)
  const rateLimit = await checkRateLimit("createInventory", RATE_LIMITS.MUTATION_CREATE);
  if (!rateLimit.success) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  const item = await prisma.inventory_items.create({
    data: {
      id: crypto.randomUUID(),
      clinicId,
      branchId: branchId || null,
      name: payload.name,
      category: payload.category,
      quantity: payload.quantity,
      minStock: payload.minQuantity,
      unit: payload.unit,
      price: payload.unitPrice,
      supplier: payload.supplier,
      expiryDate: payload.expiryDate ? new Date(payload.expiryDate) : null,
      location: payload.location,
      notes: payload.notes,
      isActive: true,
      nameAr: null,
      code: `INV-${Date.now().toString().slice(-6)}`,
      updatedAt: new Date(),
    }
  });

  revalidatePath("/dashboard/inventory");

  // Audit log
  await auditCreate("inventory", item.id, {
    name: item.name,
    category: item.category,
    quantity: item.quantity,
  });

  return item;
}

export async function updateInventoryQuantityAction(id: string, newQuantity: number) {
  const { clinicId, branchId, role } = await getAuthContext();
  if (!clinicId) throw new Error("Unauthorized");

  // Check rate limit (50 updates per minute)
  const rateLimit = await checkRateLimit("updateInventory", RATE_LIMITS.MUTATION_UPDATE);
  if (!rateLimit.success) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  const where: any = { id, clinicId };
  // Verify branch ownership if user has a branch AND is not ADMIN
  if (role !== "ADMIN" && branchId) {
    where.branchId = branchId;
  }

  const item = await prisma.inventory_items.update({
    where,
    data: { quantity: newQuantity }
  });

  revalidatePath("/dashboard/inventory");

  // Audit log
  await auditUpdate("inventory", id, {
    changedFields: ["quantity"],
    after: { quantity: newQuantity },
  });

  return item;
}

export async function deleteInventoryItemAction(id: string) {
  const validated = deleteInventoryItemSchema.safeParse({ id });
  if (!validated.success) {
    throw new Error(validated.error.message);
  }

  const { clinicId, branchId, role } = await getAuthContext();
  if (!clinicId) throw new Error("Unauthorized");

  // Check rate limit (10 deletes per minute)
  const rateLimit = await checkRateLimit("deleteInventory", RATE_LIMITS.MUTATION_DELETE);
  if (!rateLimit.success) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  const where: any = { id: validated.data.id, clinicId };
  if (role !== "ADMIN" && branchId) {
    where.branchId = branchId;
  }

  await prisma.inventory_items.delete({
    where
  });

  // Audit log
  await auditDelete("inventory", validated.data.id, {});

  revalidatePath("/dashboard/inventory");
}

export async function updateInventoryItemAction(payload: Omit<InventoryItem, "id"> & { id: string }) {
  const validated = updateInventoryItemSchema.safeParse(payload);
  if (!validated.success) {
    throw new Error(validated.error.message);
  }

  const { clinicId, branchId, role } = await getAuthContext();
  if (!clinicId) throw new Error("Unauthorized");

  const data = validated.data;
  const where: any = { id: data.id, clinicId };
  if (role !== "ADMIN" && branchId) {
    where.branchId = branchId;
  }

  const item = await prisma.inventory_items.update({
    where,
    data: {
      name: data.name,
      category: data.category,
      quantity: data.quantity,
      minStock: data.minQuantity,
      unit: data.unit,
      price: data.unitPrice,
      supplier: data.supplier,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      location: data.location,
      notes: data.notes,
      updatedAt: new Date(),
    }
  });

  revalidatePath("/dashboard/inventory");
  return item;
}

export async function getLowStockItemsAction() {
  const { clinicId, branchId, role } = await getAuthContext();
  if (!clinicId) return [];

  const where: any = { 
    clinicId,
    isActive: true,
  };
  
  // Apply branch isolation for non-admins
  if (role !== "ADMIN" && branchId) {
    where.branchId = branchId;
  }

  // Fetch items where quantity <= minStock (low stock threshold)
  const lowStockItems = await prisma.inventory_items.findMany({
    where: {
      ...where,
      OR: [
        { quantity: { lte: prisma.inventory_items.fields.minStock } },
        { quantity: 0 }, // Also include out-of-stock items
      ],
    },
    orderBy: [
      { quantity: "asc" }, // Lowest stock first
      { minStock: "desc" },
    ],
  });

  return lowStockItems.map(item => {
    // Calculate severity based on stock level relative to minimum
    const stockRatio = item.minStock > 0 ? item.quantity / item.minStock : 0;
    
    let severity: "critical" | "warning" | "ok";
    if (item.quantity === 0 || stockRatio < 0.25) {
      severity = "critical"; // Out of stock or very critical
    } else if (stockRatio < 0.5) {
      severity = "critical"; // Critical level
    } else if (stockRatio <= 1) {
      severity = "warning"; // Low but not critical
    } else {
      severity = "ok"; // Above minimum (shouldn't happen with our query)
    }

    return {
      id: item.id,
      name: item.name,
      category: item.category as InventoryCategory,
      quantity: item.quantity,
      minQuantity: item.minStock,
      unit: item.unit,
      unitPrice: Number(item.price),
      supplier: item.supplier || undefined,
      expiryDate: item.expiryDate?.toISOString(),
      location: item.location || undefined,
      notes: item.notes || undefined,
      severity,
    };
  }) as (InventoryItem & { severity: "critical" | "warning" | "ok" })[];
}
