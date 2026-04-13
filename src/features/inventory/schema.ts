import { z } from "zod";

export const inventoryCategorySchema = z.enum([
  "ANESTHETICS",
  "MATERIALS",
  "STERILIZATION",
  "INSTRUMENTS",
  "OTHER",
]);

export const createInventoryItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: inventoryCategorySchema,
  quantity: z.number().int().min(0, "Quantity must be non-negative"),
  minQuantity: z.number().int().min(0, "Min quantity must be non-negative"),
  unit: z.string().min(1, "Unit is required"),
  unitPrice: z.number().min(0, "Price must be non-negative"),
  supplier: z.string().optional(),
  expiryDate: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export const updateInventoryItemSchema = createInventoryItemSchema.extend({
  id: z.string().min(1, "ID is required"),
});

export const updateQuantitySchema = z.object({
  id: z.string().min(1, "ID is required"),
  newQuantity: z.number().int().min(0, "Quantity must be non-negative"),
});

export const deleteInventoryItemSchema = z.object({
  id: z.string().min(1, "ID is required"),
});

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;
export type UpdateQuantityInput = z.infer<typeof updateQuantitySchema>;
export type DeleteInventoryItemInput = z.infer<typeof deleteInventoryItemSchema>;