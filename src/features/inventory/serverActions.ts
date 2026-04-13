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

async function getClinicAndBranchId(): Promise<{ clinicId: string; branchId: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const dbUser = await prisma.users.findUnique({
    where: { id: user.id },
    select: { clinicId: true, branchId: true },
  });
  
  if (!dbUser) throw new Error("User record not found");
  return { clinicId: dbUser.clinicId, branchId: dbUser.branchId };
}

export async function getInventoryItemsAction() {
  const { clinicId, branchId } = await getClinicAndBranchId();

  const where: any = { clinicId };
  // Apply branch isolation
  if (branchId) {
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
  const { clinicId, branchId } = await getClinicAndBranchId();

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
  const { clinicId, branchId } = await getClinicAndBranchId();

  // Check rate limit (50 updates per minute)
  const rateLimit = await checkRateLimit("updateInventory", RATE_LIMITS.MUTATION_UPDATE);
  if (!rateLimit.success) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  const where: any = { id, clinicId };
  // Verify branch ownership if user has a branch
  if (branchId) {
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

  const { clinicId, branchId } = await getClinicAndBranchId();

  // Check rate limit (10 deletes per minute)
  const rateLimit = await checkRateLimit("deleteInventory", RATE_LIMITS.MUTATION_DELETE);
  if (!rateLimit.success) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  const where: any = { id: validated.data.id, clinicId };
  if (branchId) {
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

  const { clinicId, branchId } = await getClinicAndBranchId();
  const data = validated.data;

  const where: any = { id: data.id, clinicId };
  if (branchId) {
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
