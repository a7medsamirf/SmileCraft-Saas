// =============================================================================
// DENTAL CMS — Inventory Module: Pure Compute Stub Service
// features/inventory/services/inventoryService.ts
//
// DEPRECATED: This file is now a NO-OP stub. All persistence is handled by
// server actions in inventory/serverActions.ts.
//
// These exports exist only for backward compatibility with components that
// import from "services/inventoryService". The functions below are pure
// compute helpers that operate on client-side state passed to them.
// =============================================================================

import { InventoryItem, StockStatus, InventoryCategory, InventoryAlert } from "../types";

// ============================================================================
// Compatibility export for old client-side pattern
// WARNING: This is a stub - use server actions for real data
// ============================================================================
export const inventoryService = {
  getAllItems: (): InventoryItem[] => [],
  getItemById: (_id: string): InventoryItem | undefined => undefined,
  getItemsByCategory: (_category: InventoryCategory | "ALL" = "ALL"): InventoryItem[] => [],
  saveItem: (_item: InventoryItem): void => {},
  deleteItem: (_id: string): void => {},
  updateQuantity: (_id: string, _quantityChange: number, _reason: string, _type: "IN" | "OUT"): void => {},
  getAlerts: (): InventoryAlert[] => [],
  acknowledgeAlert: (_alertId: string): void => {},
  clearAcknowledgedAlerts: (): void => {},
  getStockStatus,
  getInventoryValue,
  getLowStockItems,
  getExpiringItems,
};

/**
 * Compute the stock status for a single item.
 * @param item - The inventory item to evaluate
 * @returns Computed stock status (IN_STOCK, LOW_STOCK, OUT_OF_STOCK, EXPIRED)
 */
export function getStockStatus(item: InventoryItem): StockStatus {
  // Check expiry first
  if (item.expiryDate && new Date(item.expiryDate) < new Date()) {
    return "EXPIRED";
  }
  // Out of stock
  if (item.quantity === 0) {
    return "OUT_OF_STOCK";
  }
  // Low stock warning
  if (item.quantity <= item.minQuantity) {
    return "LOW_STOCK";
  }
  return "IN_STOCK";
}

/**
 * Compute total inventory value.
 * @param items - Array of inventory items to calculate value for
 * @returns Sum of (quantity × unitPrice) for all items
 */
export function getInventoryValue(items: InventoryItem[]): number {
  return items.reduce(
    (total, item) => total + item.quantity * item.unitPrice,
    0,
  );
}

/**
 * Get all low stock items from a list.
 * @param items - Array of inventory items to filter
 * @returns Items where quantity ≤ minQuantity
 */
export function getLowStockItems(items: InventoryItem[]): InventoryItem[] {
  return items.filter((item) => item.quantity <= item.minQuantity);
}

/**
 * Get all expiring items within the specified days (or 30 default).
 * @param items - Array of inventory items to filter
 * @param days - Number of days from now to check expiration (default: 30)
 * @returns Items expiring within the given timeframe
 */
export function getExpiringItems(
  items: InventoryItem[],
  days = 30,
): InventoryItem[] {
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  return items.filter((item) => {
    if (!item.expiryDate) return false;
    const expiryDate = new Date(item.expiryDate);
    return expiryDate <= futureDate && expiryDate > now;
  });
}

/**
 * Stub export for backward compatibility — always returns empty array.
 */
export function getAllItems(): InventoryItem[] {
  return [];
}

/**
 * Stub export — always returns undefined.
 */
export function getItemById(_id: string): InventoryItem | undefined {
  return undefined;
}

/**
 * Stub export — category filter is a no-op.
 */
export function getItemsByCategory(
  _category: InventoryCategory | "ALL" = "ALL",
): InventoryItem[] {
  return [];
}

/**
 * Stub export — do nothing.
 */
export function saveItem(_item: InventoryItem): void {}

/**
 * Stub export — do nothing.
 */
export function deleteItem(_id: string): void {}

/**
 * Stub export — do nothing.
 */
export function updateQuantity(
  _id: string,
  _quantityChange: number,
  _reason: string,
  _type: "IN" | "OUT",
): void {}

/**
 * Stub export — always returns empty array.
 */
export function getAlerts(): never[] {
  return [];
}

/**
 * Stub export — do nothing.
 */
export function acknowledgeAlert(_alertId: string): void {}

/**
 * Stub export — do nothing.
 */
export function clearAcknowledgedAlerts(): void {}

/**
 * Stub export — always returns zero.
 */
export function getInventoryValueStub(): number {
  return 0;
}

/**
 * Stub export — always returns empty array.
 */
export function getLowStockItemsStub(): InventoryItem[] {
  return [];
}

/**
 * Stub export — always returns empty array.
 */
export function getExpiringItemsStub(days = 30): InventoryItem[] {
  return [];
}
