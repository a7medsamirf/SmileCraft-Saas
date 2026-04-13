// =============================================================================
// DENTAL CMS — Finance Module: Types & Schemas
// features/finance/types/index.ts
// =============================================================================

export enum InvoiceStatus {
  DRAFT = "DRAFT",
  SENT = "SENT",
  PAID = "PAID",       // خالص
  PARTIAL = "PARTIAL", // دفع جزئي
  OVERDUE = "OVERDUE",
  CANCELLED = "CANCELLED",
}

export enum PaymentMethod {
  CASH = "CASH",     // كاش
  CARD = "CARD",     // فيزا / بطاقة إئتمان
  WALLET = "WALLET", // محفظة إلكترونية (فودافون كاش، إلخ)
  BANK_TRANSFER = "BANK_TRANSFER",
  INSURANCE = "INSURANCE",
}

export enum PaymentType {
  PAYMENT = "PAYMENT",
  REFUND = "REFUND",
  ADJUSTMENT = "ADJUSTMENT",
}

export interface Invoice {
  id: string;
  patientId: string;
  patientName?: string;
  treatmentPlanId?: string;
  totalAmount: number;
  paidAmount: number;
  /** Calculated field: totalAmount - paidAmount */
  balance: number;
  status: InvoiceStatus;
  createdAt: string; // ISO Date String
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  date: string; // ISO Date String
  method: PaymentMethod;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Helpers and Formatters
// ---------------------------------------------------------------------------

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, { ar: string; color: string }> = {
  [InvoiceStatus.DRAFT]: { ar: "مسودة", color: "bg-gray-100 text-gray-700 dark:bg-gray-950/40 dark:text-gray-400 border-gray-200" },
  [InvoiceStatus.SENT]: { ar: "مرسل", color: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200" },
  [InvoiceStatus.PAID]: { ar: "خالص", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200" },
  [InvoiceStatus.PARTIAL]: { ar: "دفع جزئي", color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200" },
  [InvoiceStatus.OVERDUE]: { ar: "متأخر", color: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200" },
  [InvoiceStatus.CANCELLED]: { ar: "ملغي", color: "bg-gray-100 text-gray-700 dark:bg-gray-950/40 dark:text-gray-400 border-gray-200" },
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: "كاش (نقدي)",
  [PaymentMethod.CARD]: "بطاقة بنكية",
  [PaymentMethod.WALLET]: "محفظة إلكترونية",
  [PaymentMethod.BANK_TRANSFER]: "تحويل بنكي",
  [PaymentMethod.INSURANCE]: "تأمين",
};

/**
 * Standard format for Egyptian Pound (EGP) based on Senior Guidance.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
