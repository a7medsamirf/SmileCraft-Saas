export type InventoryCategory = "ANESTHETICS" | "MATERIALS" | "STERILIZATION" | "INSTRUMENTS" | "OTHER";

export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "EXPIRED";

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  minQuantity: number; // Threshold for low-stock alert
  unitPrice: number;
  unit: string; // e.g., "box", "ml", "piece"
  supplier?: string;
  expiryDate?: string;
  batchNumber?: string;
  location?: string; // Storage location
  notes?: string;
  lastRestocked?: string;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  type: "IN" | "OUT" | "ADJUSTMENT" | "EXPIRED";
  quantity: number;
  reason: string;
  date: string;
  performedBy: string;
}

export interface InventoryAlert {
  id: string;
  itemId: string;
  itemName: string;
  type: "LOW_STOCK" | "OUT_OF_STOCK" | "EXPIRING_SOON" | "EXPIRED";
  message: string;
  createdAt: string;
  acknowledged: boolean;
}
