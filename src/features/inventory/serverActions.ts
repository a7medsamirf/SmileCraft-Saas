"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { InventoryItem, InventoryCategory } from "./types";

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
  return item;
}

export async function updateInventoryQuantityAction(id: string, newQuantity: number) {
  const { clinicId, branchId } = await getClinicAndBranchId();

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
  return item;
}

export async function deleteInventoryItemAction(id: string) {
  const { clinicId, branchId } = await getClinicAndBranchId();

  const where: any = { id, clinicId };
  // Verify branch ownership if user has a branch
  if (branchId) {
    where.branchId = branchId;
  }

  await prisma.inventory_items.delete({
    where
  });

  revalidatePath("/dashboard/inventory");
}
